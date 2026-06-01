# Mini Jane Street Simulator

> An interactive market microstructure simulator — watch price form in real-time as 5 trading agents interact through a limit order book.

[Live Demo](https://your-demo-url.com) · [Architecture](#architecture) · [Quick Start](#quick-start) · [5 Agents](#5-trading-agents) · [Concepts](#concepts-to-learn)

---

## What is this?

**Mini Jane Street Simulator** mô phỏng **cấu trúc vi mô thị trường** (market microstructure) — cách giá hình thành khi các lệnh mua/bán tương tác với nhau theo quy tắc **ưu tiên giá-thời gian (FIFO)**.

Nói đơn giản: thay vì một "black box" giá, bạn thấy trực tiếp **order book**, **matching engine**, và **5 trading agents** đang chiến đấu với nhau tick-by-tick.

## What you'll see

```
┌──────────────────────────────────────────────────────────────┐
│  Price Chart (random walk)           │  Order Book          │
│                                     │  Bid      Ask         │
│         $100.45 ──────────────────── │  100.44   100.46     │
│       ╱                             │  100.43   100.47     │
│   ╱──                               │  100.42   100.48     │
│ ─                                   │                      │
├──────────────────────────────────────┴──────────────────────┤
│  Trade Tape  │  RT-1 bought  50 @ 100.44  │  MM PnL: +$12.50 │
│              │  MOM-1 sold   30 @ 100.46  │  Sharpe: 1.82     │
└─────────────────────────────────────────────────────────────┘
```

---

## 5 Trading Agents

| Agent | Strategy | Goal |
|-------|----------|------|
| `mm-1` | Market Maker — always posts bid + ask around mid price | Earn the spread |
| `rt-1` / `rt-2` | Random Taker — random buy/sell orders | Create random liquidity |
| `mom-1` | Momentum Trader — buys when price rises, sells when it falls | Follow the trend |
| `mr-1` | Mean Reversion — buys below average, sells above average | Revert to the mean |

---

## Concepts to Learn

By watching the simulation, you'll understand:

- **Bid/ask spread** — why it always exists (market maker needs compensation)
- **Market maker economics** — earning the spread while managing adverse selection
- **Momentum vs Mean Reversion** — momentum wins in trending markets, loses in sideways
- **Adverse selection** — market maker gets "picked off" when price moves against them
- **Partial fills** — large orders consume multiple price levels
- **Price-time priority (FIFO)** — first order at the best price gets filled first

---

## Quick Start

### Python API

```bash
pip install sortedcontainers numpy pandas matplotlib pytest pytest-cov ruff

PYTHONPATH=src python3 scripts/run_simulation.py --ticks 500 --seed 42 --output results/
```

```python
from decimal import Decimal
from mini_jane_street import (
    SimulationConfig, SimulationEngine, Exchange,
    RandomTaker, MomentumTrader, MeanReversionTrader,
    MarketMaker, Analytics,
)

config = SimulationConfig(
    initial_price=Decimal("100.00"),
    volatility=0.5,
    num_ticks=500,
    seed=42,
)

traders = [
    RandomTaker(trader_id="rt-1", action_prob=0.05),
    MomentumTrader(trader_id="mom-1", momentum_threshold=0.002),
    MeanReversionTrader(trader_id="mr-1", reversion_threshold=0.003),
]

mm = MarketMaker(trader_id="mm-1", base_spread=Decimal("0.02"))
engine = SimulationEngine(config, traders, market_maker=mm)
result = engine.run()

report = engine.analytics.compute_metrics()
print(f"Sharpe: {report.sharpe_ratio}, PnL: {report.realized_pnl}")
engine.analytics.export_json("report.json")
engine.analytics.export_trades_csv("trades.csv")
```

### Web Demo

```bash
# Terminal 1 — Backend (FastAPI)
cd server
pip install -r requirements.txt
PYTHONPATH=../src uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend (React + Vite)
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173` — configure ticks, volatility, seed, and watch the simulation stream live over WebSocket.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SimulationEngine                        │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Clock   │  │ MarketDataGenerator │  │    Exchange      │  │
│  │(tick gen)│  │ (random walk)    │  │ (central router) │  │
│  └──────────┘  └──────────────────┘  └────────┬─────────┘  │
│                                                │            │
│                      ┌─────────────────────────┴────┐       │
│                      │         OrderBook            │       │
│                      │  bid: SortedDict[PriceLevel] │       │
│                      │  ask: SortedDict[PriceLevel] │       │
│                      │       PriceLevel = deque     │       │
│                      └──────────────────────────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   MatchingEngine                      │  │
│  │  Pure function: add_order(order, book) → fills[]     │  │
│  │  FIFO price-time priority · partial fills            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                     Traders                            │  │
│  │  RandomTaker · MomentumTrader · MeanReversionTrader   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   MarketMaker                          │  │
│  │  Posts bid @ mid - spread/2 · ask @ mid + spread/2     │  │
│  │  Inventory skew adjusts quotes asymmetrically          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Analytics                           │  │
│  │  Sharpe ratio · max drawdown · win rate · profit factor│  │
│  │  CSV/JSON export                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### File Map

| File | Responsibility |
|------|---------------|
| `entities.py` | Frozen dataclasses: `Order`, `Fill`, `MarketData`, `Side`, `OrderType` |
| `orderbook.py` | Limit Order Book — SortedDict + deque per price level |
| `matching_engine.py` | Pure FIFO matching — returns fills without mutating state |
| `exchange.py` | Central coordinator — routes orders, records fills, exposes `mid_price` |
| `simulation.py` | `Clock`, `MarketDataGenerator` (arithmetic random walk), `SimulationEngine` |
| `traders.py` | `Trader` base + `RandomTaker`, `MomentumTrader`, `MeanReversionTrader` |
| `market_maker.py` | Inventory-adjusted MM quoting, fill routing, realized PnL tracking |
| `analytics.py` | Sharpe, max drawdown, win rate, profit factor — CSV/JSON export |
| `config.py` | `SimulationConfig`, `SimulationResult` (breaks circular imports) |

---

## WebSocket API

```
POST /api/simulate  { num_ticks, volatility, seed, initial_price }  → { run_id }
GET  /api/simulate/{run_id}  → { status, result }
WS   /ws/simulate/{run_id}   → streams tick messages
```

| Message | Direction | Content |
|---------|-----------|---------|
| `start` | server → client | Initial config snapshot on connect |
| `tick` | server → client | Every tick — order book depth, price, trades |
| `complete` | server → client | Final analytics results |
| `error` | server → client | Error during simulation |

---

## Design Decisions

- **`Decimal` everywhere** — no float rounding in financial calculations
- **Frozen dataclasses** — immutable `Order`, `Fill`, `MarketData` for thread safety
- **SortedDict ascending** — best bid = `next(reversed(bid_book))`, best ask = `next(iter(ask_book))`
- **MatchingEngine is pure** — same inputs → same fills; testable in isolation
- **OrderBook owns matching** — `add_order()` returns fills directly; no separate state path

---

## Testing

```bash
# All tests
python3 -m pytest tests/ -v

# Single file
python3 -m pytest tests/test_orderbook.py -v

# With coverage
python3 -m pytest tests/ --cov=mini_jane_street --cov-report=term-missing

# Lint
ruff check src/ tests/ scripts/
```

- **98 tests** across orderbook, matching engine, exchange, traders, market maker, simulation, analytics
- **86% code coverage**

---

## Lessons Learned

1. **Avoid duplicate mutable references** — storing orders in both `_open_orders` (dict) and `PriceLevel.orders` (deque) caused stale references on partial fills. Single source of truth: the deque.
2. **Circular imports are a design smell** — `analytics` and `simulation` both imported `SimulationConfig`. Fix: extract to `config.py`.
3. **`SortedDict` does not support `reverse=True`** — use ascending for both sides; best bid via `next(reversed())`.
4. **Test the bug, not just the happy path** — a specific test caught "order rests but status is FILLED" that happy-path tests missed.
5. **Partial fill requires explicit state reconstruction** — `popleft()` + reconstruct with updated `filled_qty` + `appendleft()` preserves FIFO priority.
6. **`Decimal / int` not `Decimal / Decimal`** — mixed-type division avoids context precision issues.
