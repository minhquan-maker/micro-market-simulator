# Architecture: Mini Jane Street Simulator

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Simulation Runner                            │
│                    (scripts/run_simulation.py)                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ creates + wires
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Simulation Engine                             │
│  ┌────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │
│  │  Clock     │  │ MarketDataGenerator│  │     Exchange         │ │
│  │  (virtual) │  │ (random walk)    │  │ (central coordinator)│ │
│  └────────────┘  └──────────────────┘  └──────────┬───────────┘ │
│                                                      │             │
│                     ┌────────────────────────────────┴──────┐    │
│                     │           OrderBook                   │    │
│                     │  bid: SortedDict[Decimal, PriceLevel]│    │
│                     │  ask: SortedDict[Decimal, PriceLevel]│    │
│                     │  (ascending, best bid via reversed)   │    │
│                     └──────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Trader Bots  │  │ Market Maker │  │  Analytics   │
    │              │  │   Agent      │  │              │
    │ - RandomTaker│  │              │  │ - PnL tracker│
    │ - Momentum   │  │              │  │ - Metrics    │
    │ - MeanRev    │  │              │  │ - Reporter   │
    └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Module Design

### `src/mini_jane_street/orderbook.py`

**Responsibility**: Maintain the limit order book state — price levels and their order queues.

**Public Interface**:
```python
class OrderBook:
    def __init__(self, tick_size: Decimal = Decimal("0.01")) -> None
    def add_order(self, order: Order) -> list[Fill]
    def cancel_order(self, order_id: str) -> bool
    def get_best_bid(self) -> tuple[Decimal, int] | None
    def get_best_ask(self) -> tuple[Decimal, int] | None
    def get_mid_price(self) -> Decimal | None
    def get_depth(self, levels: int = 5) -> tuple[list, list]  # (bid_levels, ask_levels)
    def get_spread(self) -> Decimal | None
    @property
    def trades(self) -> list[Fill]
```

**Key Design Decisions**:
- Both `bid_book` and `ask_book` use `SortedDict` sorted ascending by price.
  Best bid = `next(reversed(bid_book))`; Best ask = `next(iter(ask_book))`
- `deque` for O(1) append/pop-left within a price level
- No locks — single-threaded event loop
- Immutable fills: `Fill` objects are created and never mutated
- OrderBook owns matching: `add_order()` returns fills directly

**Dependencies**: `sortedcontainers`, `decimal`, `dataclasses`

---

### `src/mini_jane_street/matching_engine.py`

**Responsibility**: Process incoming orders against the order book and return fills.

**Public Interface**:
```python
class MatchingEngine:
    @staticmethod
    def process_limit_order(order: Order, book: OrderBook) -> tuple[list[Fill], Order | None]:
    @staticmethod
    def process_market_order(order: Order, book: OrderBook) -> tuple[list[Fill], Order | None]:
```

**Key Design Decisions**:
- The matching engine is a **pure function** of the order book state + incoming order.
- It does NOT modify the order book directly — it returns fills and the caller (`Exchange`) applies them.
- This makes the matching logic **trivially testable** without mocking the book.
- Matching is handled directly inside `OrderBook.add_order()` at runtime; this module is a reference/test implementation.
- Both bid and ask sides use ascending SortedDict; best bid via `next(reversed(bid_book))`.

**Dependencies**: `orderbook`, `decimal`, `dataclasses`

---

### `src/mini_jane_street/exchange.py`

**Responsibility**: Central coordinator. Routes orders to the OrderBook, maintains open orders, emits market data.

**Public Interface**:
```python
class Exchange:
    def __init__(self, tick_size: Decimal = Decimal("0.01")) -> None
    def submit_order(self, side: Side, price: Decimal | None, qty: int, order_type: OrderType) -> SubmitResult
    def cancel_order(self, order_id: str) -> bool
    def get_market_data(self) -> MarketData
    @property
    def trades(self) -> list[Fill]
    @property
    def open_orders(self) -> dict[str, Order]
```

**Key Design Decisions**:
- `SubmitResult` dataclass: `{ fills: list[Fill], rest_order: Order | None, status: Status }`
- If order is partially filled, remaining quantity rests as a new `Order` in the book
- Market data is published after every matching round (not on every tick of the market generator)
- Exchange owns the `OrderBook` instance; traders never touch it directly
- All state mutations happen in `Exchange.submit_order`

**Dependencies**: `orderbook`, `matching_engine`, `decimal`, `dataclasses`

---

### `src/mini_jane_street/entities.py`

**Responsibility**: All shared data types. Single source of truth for `Order`, `Fill`, `Trade`, `Side`, `OrderType`, `OrderStatus`.

**Types**:
```python
class Side(Enum): BUY | SELL
class OrderType(Enum): LIMIT | MARKET
class OrderStatus(Enum): NEW | PARTIALLY_FILLED | FILLED | CANCELLED | REJECTED

@dataclass(frozen=True)
class Order:
    order_id: str
    trader_id: str
    side: Side
    price: Decimal
    quantity: int
    filled_qty: int
    timestamp: float
    order_type: OrderType
    status: OrderStatus

@dataclass(frozen=True)
class Fill:
    order_id: str
    counterparty_id: str
    price: Decimal
    quantity: int
    timestamp: float
    side: Side

@dataclass(frozen=True)
class MarketData:
    timestamp: float
    mid_price: Decimal
    best_bid: Decimal
    best_bid_qty: int
    best_ask: Decimal
    best_ask_qty: int
    bid_depth: list[tuple[Decimal, int]]   # top N levels
    ask_depth: list[tuple[Decimal, int]]
```

**Key Design Decisions**:
- `frozen=True` dataclasses — immutable after creation. Prevents accidental mutation bugs.
- `order_id` generated by caller (Trader or Exchange), not by the entity itself.
- `timestamp` is simulation time (float), set by the `Clock`.

---

### `src/mini_jane_street/simulation.py`

**Responsibility**: Orchestrate the simulation. Manage clock, event loop, market data generation, and trader agents.

**Public Interface**:
```python
@dataclass
class SimulationConfig:
    initial_price: Decimal
    volatility: float          # sigma per tick
    tick_size: Decimal
    tick_interval: float        # seconds (simulation time)
    num_ticks: int
    seed: int | None

class SimulationEngine:
    def __init__(self, config: SimulationConfig, traders: list[Trader]) -> None
    def run(self) -> SimulationResult
    def step(self) -> None
    @property
    def exchange(self) -> Exchange
    @property
    def clock(self) -> Clock
    @property
    def analytics(self) -> Analytics
```

**Key Design Decisions**:
- `Clock` is a simple counter: `time += tick_interval` per step
- `MarketDataGenerator` maintains the latent mid price as a random walk
- Trader `on_tick()` callbacks called every step — each trader decides whether to act
- Simulation stops when `clock.time >= config.end_time`
- `SimulationResult` contains: `trades`, `final_prices`, `analytics_report`, `config_used`

**Dependencies**: `exchange`, `entities`, `analytics`, `traders`, `market_maker`

---

### `src/mini_jane_street/traders.py`

**Responsibility**: Trader bot implementations.

**Base Class**:
```python
class Trader(ABC):
    trader_id: str
    position: int = 0
    cash: Decimal = Decimal("0")

    @abstractmethod
    def on_market_data(self, data: MarketData, exchange: Exchange) -> None: ...
    @abstractmethod
    def on_fill(self, fill: Fill) -> None: ...
    def compute_pnl(self, current_mid: Decimal) -> Decimal: ...
```

**Implementations**:
- `RandomTaker`: random market orders
- `MomentumTrader`: trend-following limits
- `MeanReversionTrader`: VWAP-reversion limits

**Dependencies**: `entities`, `exchange`

---

### `src/mini_jane_street/market_maker.py`

**Responsibility**: Market maker agent with inventory-adjusted spread.

**Public Interface**:
```python
class MarketMaker:
    def __init__(
        self,
        trader_id: str,
        base_spread: Decimal,
        inventory_alpha: Decimal,
        time_warp: Decimal,  # spread widens near end of day
    ) -> None
    def on_market_data(self, data: MarketData, exchange: Exchange) -> None
    def on_fill(self, fill: Fill) -> None
    @property
    def position(self) -> int
    @property
    def realized_pnl(self) -> Decimal
    @property
    def stats(self) -> MMStats
```

**Dependencies**: `entities`, `exchange`, `decimal`

---

### `src/mini_jane_street/analytics.py`

**Responsibility**: Compute and report performance metrics.

**Public Interface**:
```python
class Analytics:
    def __init__(self, trades: list[Fill], config: SimulationConfig) -> None
    def add_trades(self, new_trades: list[Fill]) -> None
    def compute_metrics(self) -> PerformanceReport
    def compute_equity_curve(self) -> pd.DataFrame
    def plot_pnl(self) -> Figure
    def plot_depth(self, tick: int) -> Figure
    def export_json(self, path: Path) -> None
    def export_trades_csv(self, path: Path) -> None
```

**PerformanceReport**:
```python
@dataclass
class PerformanceReport:
    realized_pnl: Decimal
    unrealized_pnl: Decimal
    total_pnl: Decimal
    sharpe_ratio: float
    max_drawdown: Decimal
    max_drawdown_pct: float
    win_rate: float
    profit_factor: float
    num_trades: int
    avg_trade_pnl: Decimal
    spread_capture: Decimal | None  # MM only
    adverse_selection_ratio: float | None  # MM only
```

**Dependencies**: `pandas`, `numpy`, `matplotlib`, `entities`

---

## Project Structure

```
mini_jane_street_simulator/
├── pyproject.toml
├── README.md
├── docs/
│   ├── idea_review.md
│   ├── research.md
│   ├── spec.md
│   └── architecture.md
├── src/
│   └── mini_jane_street/
│       ├── __init__.py
│       ├── entities.py          # All data types
│       ├── orderbook.py         # LOB data structure
│       ├── matching_engine.py   # Order matching logic
│       ├── exchange.py         # Central coordinator
│       ├── simulation.py       # Simulation engine
│       ├── traders.py          # Trader bots
│       ├── market_maker.py     # MM agent
│       ├── analytics.py        # Performance metrics
│       └── config.py           # Configuration dataclasses
├── scripts/
│   └── run_simulation.py       # Entry point
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # pytest fixtures
│   ├── test_orderbook.py
│   ├── test_matching_engine.py
│   ├── test_exchange.py
│   ├── test_simulation.py
│   ├── test_traders.py
│   ├── test_market_maker.py
│   └── test_analytics.py
└── notebooks/
    └── analysis.ipynb          # Post-simulation analysis
```

---

## Coupling Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Analytics depends on specific Fill structure** | Medium | `PerformanceReport` dataclass is stable; extends if needed |
| **Trader bots reach into Exchange internals** | Medium | Traders only call `submit_order` / `cancel_order`; no direct book access |
| **Matching engine returns fills but Exchange applies them** | Low | Clear separation; both are independently testable |
| **Simulation couples everything together** | Low | All deps injected via constructor; swap implementations easily |
| **Decimal precision scattered across modules** | Low | Single `PRICE_PRECISION = Decimal("0.01")` constant in `entities` |

---

## Performance Bottlenecks

| Component | Bottleneck | Mitigation |
|-----------|-----------|------------|
| `OrderBook.get_depth(n)` | O(n) iteration over price levels | Only called for visualization; acceptable |
| `Analytics.compute_equity_curve` | O(n) pandas operations | Called once per simulation; acceptable |
| `SimulationEngine.run()` | 1000 ticks × N traders | Each trader O(1) decision; ~5ms total expected |
| `SortedDict` insertions | O(log n) per order | n <= 1000 orders typical; negligible |

**No premature optimization needed.** The system is single-threaded, in-memory, and target runs in < 5 seconds.

---

## Testing Strategy

### Unit Tests (isolated)

| Module | What to Test |
|--------|-------------|
| `orderbook.py` | Add, cancel, depth, best bid/ask, mid price, spread |
| `matching_engine.py` | FIFO, partial fills, market orders, edge cases |
| `entities.py` | Frozen dataclass immutability |
| `analytics.py` | Sharpe, drawdown, win rate against known inputs |

### Integration Tests

| Test | What to Test |
|------|-------------|
| `test_exchange.py` | Order lifecycle: submit → fill/cancel → track |
| `test_simulation.py` | Full run with known bots; verify metrics non-NaN |
| `test_market_maker.py` | MM earns spread against RandomTaker bots |
| `test_traders.py` | Each bot type makes rational decisions |

### Analytical Tests

| Test | How |
|------|-----|
| FIFO correctness | Submit N orders at same price; verify fills match submission order |
| Partial fill | Order for 100, only 40 available; verify 40 filled, 60 resting |
| Market on empty | Submit market order to empty book; verify 0 fills |
| PnL arithmetic | BUY 100 at 100, SELL 100 at 101 → verify +100 realized PnL |
| Sharpe boundary | Constant PnL per trade → verify Sharpe = 0 |
| Drawdown | Single losing trade after peak → verify drawdown = loss amount |

---

## Design Principles

1. **No circular imports**: `entities.py` has zero deps; everything imports it.
2. **Value objects are frozen**: All data classes are `frozen=True`.
3. **Services are mutable**: `Exchange`, `OrderBook`, `SimulationEngine` hold state.
4. **Single source of truth**: `Exchange.trades` is the canonical event log; analytics is read-only.
5. **Explicit over implicit**: No magic; every function's behavior is obvious from its signature.
6. **Composition over inheritance**: Traders are composed into the simulation; they don't inherit from a "simulation" base.
