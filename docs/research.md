# Phase 1 — Research: Mini Jane Street Simulator

## Table of Contents

1. [Order Books](#1-order-books)
2. [Matching Engines](#2-matching-engines)
3. [Market Making](#3-market-making)
4. [Quantitative Metrics](#4-quantitative-metrics)
5. [Simulation Design](#5-simulation-design)
6. [Academic References](#6-academic-references)
7. [Open Source References](#7-open-source-references)

---

## 1. Order Books

### Core Data Structure

A Limit Order Book (LOB) is a **sorted list of price levels**, each containing a **queue of orders** at that price. Orders within a price level are matched FIFO (price-time priority).

```
Bid Side (Descending by Price)     Ask Side (Ascending by Price)
─────────────────────────────      ─────────────────────────────
Price  | Qty | Orders              Price | Qty | Orders
100.05 |  50 | [O1, O3]            100.08 |  30 | [O2]
100.04 | 100 | [O4]                100.09 |  20 | [O7]
100.02 |  25 | [O5]                100.10 |  40 | [O6]
```

### Key Operations

| Operation | Complexity | Description |
|-----------|-----------|-------------|
| Add Limit Order | O(log n) | Insert into price tree, then O(1) queue append |
| Cancel Order | O(1) | Remove from queue by order ID |
| Modify Order | O(1) + re-insert | Cancel + re-add |
| Best Bid/Ask | O(1) | Maintain head of each side |
| Market Order | O(k) | Sweep k price levels |
| Get Depth | O(n) | Aggregate across price levels |

### Implementation Approaches

**Approach A — SortedDict (recommended)**
```python
# Python's sortedcontainers SortedDict maintains sorted keys
# Each value is a deque of orders at that price level
from sortedcontainers import SortedDict

bid_book = SortedDict(goog=call)  # descending
ask_book = SortedDict()            # ascending
```
- Keys = prices, Values = `deque` of `Order` objects
- `SortedDict` uses a skip-list internally — O(log n) insertions
- `bid_book.keys()[-1]` gives best bid (largest key in descending tree)
- Memory: O(n) where n = number of price levels

**Approach B — Heap**
- `heapq` for bid side (max-heap via negation)
- `heapq` for ask side (min-heap)
- Good for best-price extraction, harder for depth queries
- Not recommended for full LOB

**Approach C — Dict of Deques + Separate Price Index**
- `dict[price] -> deque` for fast price-level access
- Maintain `SortedDict` for price ordering
- Most explicit and controllable

### FIFO Queue Behavior

Within a price level, orders are matched FIFO:
- Each order has: `order_id`, `timestamp`, `price`, `quantity`, `side`
- Orders at same price sorted by `timestamp` ascending
- **Critical**: If an order is partially filled, its timestamp does NOT reset. Remaining quantity retains original priority.

### Order States

```
NEW → PARTIALLY_FILLED → FILLED
  │         │              │
  │         ↓              │
  │    CANCELLED           │
  │         │              │
  └─────────┴──→ REJECTED ─┘
```

---

## 2. Matching Engines

### Price-Time Priority Matching

**Algorithm for incoming BUY order:**
```
1. If market order: match against ask side starting at best ask
2. If limit order: match against ask side starting at limit price
3. At each price level:
   a. Peek at front of queue (oldest order)
   b. Fill = min(remaining_qty, book_qty)
   c. Record trade at crossing price
   d. Deduct from both sides
   e. If book side depleted, move to next price level
4. If remaining quantity > 0: add to bid side as new resting order
```

**Algorithm for incoming SELL order:** Symmetric, matching against bid side.

### Order Types

| Type | Behavior |
|------|----------|
| **Limit** | Rest at price if no immediate match; partial fills OK |
| **Market** | Execute immediately at best available prices; may sweep multiple levels |
| **IOC (Immediate-Or-Cancel)** | Fill what possible, cancel rest; no resting |
| **FOK (Fill-Or-Kill)** | All-or-nothing fill; reject if insufficient liquidity |
| **Stop-Loss** | Becomes market order when triggered; for MVP deferred |

### Partial Fills

Every fill is a `Trade` object:
```python
@dataclass
class Trade:
    order_id: str
    counter_order_id: str
    price: Decimal
    quantity: int
    timestamp: float
    side: Side  # BUY or SELL
```

For MVP: support **Limit** and **Market** orders only.

### Market Order Edge Cases

1. **Empty book**: Market order expires with 0 fills. Log as such.
2. **Partially filled**: Some quantity remains — typically also expires (no resting for market orders in simple implementation).
3. **Slippage**: In simulation, we can model slippage as a small adverse price move when a market order is large relative to book depth.

### Trading Fees

Real exchanges charge fees. For simulation:
- **Maker fee**: charged to limit order (providing liquidity) — typically 0.0% to 0.02%
- **Taker fee**: charged to market order (taking liquidity) — typically 0.02% to 0.1%
- **Spread cost**: implicit cost of crossing the spread

For MVP: 0 commission (focus on spread economics), but document where fees would go.

---

## 3. Market Making

### The Core Problem

A market maker (MM) posts **bid** and **ask** quotes simultaneously. Profit comes from:
- **Spread capture**: earn the bid-ask spread on round-trip trades
- **Inventory arbitrage**: profit from price moves

Risk comes from:
- **Adverse selection**: informed traders who know the true price direction hit your quotes
- **Inventory risk**: accumulating a position that moves against you

### Basic Spread-Quoting Strategy

**Static spread**: Post bid at `mid - half_spread`, ask at `mid + half_spread`.
- Simple but ignores inventory and adverse selection
- Break-even: need to earn spread faster than inventory drifts

**Inventory-adjusted spread**: Widen spread when holding large inventory.
```
bid = mid - half_spread - inventory_alpha * position
ask = mid + half_spread + inventory_alpha * position
```

### Avellaneda-Stoikov Model (2008)

The gold standard for academic market making. Derives optimal quotes in a high-frequency setting.

**Key Formula — Optimal Reservation Price:**
```
r(s, q, t) = s - q * gamma * sigma^2 * (T - t)

Where:
  r  = reservation price (internal fair value)
  s  = current mid price
  q  = inventory (positive = long, negative = short)
  gamma = risk aversion parameter
  sigma = volatility of the asset
  T  = end of trading horizon
  t  = current time
```

**Optimal Spread:**
```
delta_bid = (gamma * sigma^2 * (T - t) - ln(1 + gamma/k)) / 2
delta_ask = (gamma * sigma^2 * (T - t) - ln(1 + gamma/k)) / 2

Where k = order arrival rate parameter
```

**Quote prices:**
```
bid = r - delta_bid
ask = r + delta_ask
```

**Key Insights:**
1. As `T - t` shrinks (approaching end of day), spread widens (less time to unwind)
2. As `|q|` increases, reservation price moves away from current price (discourages accumulation)
3. Higher volatility → wider spread (more inventory risk)
4. Higher risk aversion `gamma` → wider spread (less willing to hold inventory)

**For MVP**: Implement a simplified version:
- Reservation price adjusted linearly with inventory
- Spread widens with inventory magnitude and time pressure
- No closed-form `k` parameter; use heuristic calibration

### Adverse Selection

In simulation, we know the "true price" (latent mid price). Adverse selection occurs when:
- Informed trader arrives → true price moves → MM gets filled at stale price
- MM can measure adverse selection by tracking how often fills move against them

**Metric**: `adverse_selection_ratio = trades_against_me / total_trades`

### Order Arrival Modeling

Real markets have Poisson-distributed order arrivals:
- `lambda_bid` = rate of buy orders hitting the ask
- `lambda_ask` = rate of sell orders hitting the bid

For simulation:
```python
import numpy as np

# Generate inter-arrival times
inter_arrival = np.random.exponential(1 / lambda_rate)
```

---

## 4. Quantitative Metrics

### PnL (Profit and Loss)

**Realized PnL:**
```
For each SELL: realized_pnl += sell_qty * (sell_price - avg_cost_basis)
For each BUY:  avg_cost_basis = (prev_cost + buy_qty * buy_price) / (prev_qty + buy_qty)
```

**Mark-to-Market PnL (unrealized):**
```
mtm_pnl = position * (current_mid - entry_price)
total_pnl = realized_pnl + mtm_pnl
```

**For a Market Maker**, realized PnL = spread earned minus adverse selection cost.

### Sharpe Ratio

**Realized Sharpe (annualized):**
```
sharpe = (mean_hourly_return / std_hourly_return) * sqrt(252 * hours_per_day)

For simulation without annualization:
sharpe = mean(returns) / std(returns) * sqrt(n_periods)
```

- Sharpe > 1 is acceptable, > 2 is good, > 3 is excellent
- Negative Sharpe means the strategy loses money

### Maximum Drawdown

```
equity_curve = cumulative_pnl over time
peak = running_max(equity_curve)
drawdown = peak - equity_curve
max_drawdown = max(drawdown)
```

Drawdown matters for risk management — a strategy with high Sharpe but 50% drawdown may be unacceptable.

### Win Rate & Profit Factor

```
win_rate = winning_trades / total_trades
profit_factor = gross_profit / gross_loss
avg_win = mean(winning_trade_pnl)
avg_loss = mean(losing_trade_pnl)
```

### Spread Capture

For a market maker:
```
spread_capture = sum(fills_at_bid - fills_at_ask) / total_trades
gross_pnl = sum(spread_earned)
net_pnl = gross_pnl - adverse_selection_cost - fees
```

### Slippage

For order evaluation:
```
slippage = execution_price - arrival_price
negative_slippage = worst_execution - arrival_price  # for buys
positive_slippage = arrival_price - best_execution   # for sells
```

### Order Book Imbalance (OBI)

```
OBI = (bid_volume - ask_volume) / (bid_volume + ask_volume)
```

Predictive of short-term price direction. MM can use this to adjust quotes:
- OBI > 0 (more bids): price likely to go up, adjust quotes accordingly
- OBI < 0 (more asks): price likely to go down

---

## 5. Simulation Design

### Event-Driven Architecture

```
┌─────────────────────────────────────────────┐
│              Simulation Engine               │
│                                              │
│  EventQueue ──► EventLoop ──► Clock          │
│       │                                    │
│       ▼                                    │
│  Market Generator ──► True Price Process    │
│       │                                    │
│       ▼                                    │
│  Exchange ──► Order Book ──► Matching Engine │
│       │                          │          │
│       │                          ▼          │
│       │                   Trade Events      │
│       │                          │          │
│       ▼                          ▼          │
│  Analytics Engine ◄────── Market Data Feed │
│                                              │
│  Trader Bots (submit orders) ───────────────►│
└─────────────────────────────────────────────┘
```

### Event Types

| Event | Fields | Source |
|-------|--------|--------|
| `OrderSubmitted` | order_id, side, price, qty, timestamp | Trader |
| `OrderFilled` | order_id, fill_qty, price, counterparty | Matching Engine |
| `OrderCancelled` | order_id, timestamp | Trader or Exchange |
| `PriceUpdate` | mid_price, best_bid, best_ask | Market Generator |
| `SimulationTick` | timestamp | Clock |

### Price Process (True Price)

For simulation, we model a latent "true price" that drifts:

**Random Walk (Geometric Brownian Motion):**
```
S(t+1) = S(t) * exp((mu - 0.5 * sigma^2) * dt + sigma * sqrt(dt) * Z)
where Z ~ N(0, 1)
```

For MVP: simpler arithmetic random walk:
```
price[t+1] = price[t] + sigma * N(0, 1)
```

### Trader Bot Strategies

**Bot 1 — Random Liquidity Taker**
- Every `dt`, submits market order with probability `p`
- Simulates retail/informed traders
- Tests matching engine under load

**Bot 2 — Momentum Trader**
- Tracks recent price returns
- If price rising (momentum), submit buy limit order near best ask
- If price falling, submit sell limit near best bid
- Rationale: trend-following in simulation

**Bot 3 — Mean Reversion Trader**
- Tracks VWAP (volume-weighted average price) over rolling window
- If current price < VWAP - threshold, buy at bid
- If current price > VWAP + threshold, sell at ask

**Bot 4 — Market Maker (MVP heuristic)**
- Posts bid at `mid - half_spread - inventory_adj`
- Posts ask at `mid + half_spread + inventory_adj`
- Cancels and requotes each tick
- Inventory resets end of day

### Simulation Parameters

```python
@dataclass
class SimulationConfig:
    initial_price: Decimal = Decimal("100.00")
    volatility: float = 0.001        # per tick
    tick_size: Decimal = Decimal("0.01")
    lot_size: int = 1
    start_time: float = 0.0
    end_time: float = 8.0           # 8 hours of simulation
    tick_interval: float = 0.1     # 100ms ticks
    maker_spread: Decimal = Decimal("0.02")
    num_ticks_per_step: int = 100
```

---

## 6. Academic References

### Core Literature

1. **Avellaneda & Stoikov (2008)** — "High-frequency trading in a limit order book"
   - Optimal market making in a limit order book
   - Closed-form reservation price and spread formulas
   - Key: trades arrive at rate `k * exp(-k * |delta|)` where delta is distance from mid

2. **Bouchaud, Farmer & Lillo (2009)** — "How markets slowly digest changes in supply and demand"
   - Market impact and order book dynamics
   - Relevant for understanding price impact

3. **Easley, Lopez de Prado & O'Hara (2012)** — "The Volume Clock"
   - VPIN (Volume-synchronized Probability of Informed Trading)
   - Useful for detecting adverse selection in simulation

4. **Cont, Kukanov & S. (2017)** — "Optimal order placement in a limit order book"
   - Optimal placement of large orders
   - Relevant for understanding market impact

### Key Concepts to Reference in Interviews

- **Price-time priority**: standard on all major exchanges (NYSE, NASDAQ, CME)
- **Maker vs. Taker**: liquidity provision vs. consumption
- **Adverse selection**: informed vs. uninformed flow
- **Spread as compensation**: for inventory risk and adverse selection risk
- **Queue position**: FIFO gives incentive to submit early; position at top of queue has option value

---

## 7. Open Source References

### Reference Implementations

1. **LOB-Examples** (various GitHub repos) — Simple LOB implementations in Python
   - Useful for verifying algorithm correctness
   - Many have bugs; cross-reference carefully

2. **freqtrade** — Production crypto trading bot (https://github.com/freqtrade/freqtrade)
   - Clean architecture for trading systems
   - Overkill for our purposes but good architectural patterns

3. **backtrader** — Python backtesting framework
   - Good reference for analytics and performance tracking

4. **ccxt** — Crypto exchange library
   - Shows how real exchange APIs work
   - Order types, rate limiting, etc.

### Key Libraries for Implementation

| Library | Purpose | Why |
|---------|---------|-----|
| `sortedcontainers` | SortedDict for price levels | Fast, pure-Python, no C deps |
| `numpy` | Statistical computations | Sharpe, drawdown, random walks |
| `pandas` | Time series analysis | Trade history, equity curve |
| `matplotlib` | Visualization | PnL curves, order book depth |
| `pytest` | Testing framework | pytest fixtures for order book state |
| `ruff` | Linting | Fast, comprehensive |
| `dataclasses` | Data structures | Trade, Order, Event objects |
| `Decimal` | Price precision | Avoid float rounding errors |

---

## 8. Synthesis: Key Design Decisions

### From Research to Implementation

| Decision | Chosen Approach | Rationale |
|----------|---------------|-----------|
| Price levels storage | `SortedDict[Decimal, Deque[Order]]` | O(log n) insertion, clear FIFO within levels |
| Matching algorithm | Iterate and fill per level | Most explicit, easiest to verify |
| Event model | Dataclass-based events in queue | Structured, testable, serializable |
| Simulation time | Virtual clock (not real-time) | Deterministic, reproducible |
| Price process | Arithmetic random walk | Sufficient for concept demonstration |
| MM model | Inventory-adjusted heuristic | Simpler than A-S for MVP; A-S for V2 |
| Analytics | pandas + matplotlib | Standard stack, clean output |
| State management | Immutable event sourcing | Log of events → replayable state |

### Common Pitfalls to Avoid (Per Research)

1. **Float precision**: Use `Decimal` for prices, not `float`
2. **Timestamp collision**: Generate unique timestamps per simulation tick
3. **Order ID collision**: UUID or incrementing counter
4. **State mutation**: Don't mutate order objects; create new events
5. **Race conditions**: Single-threaded event loop avoids these
6. **Off-by-one in fill loops**: Verify `remaining_qty` tracking carefully
