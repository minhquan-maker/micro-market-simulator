# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# ALWAYS set PYTHONPATH — the package lives under src/
export PYTHONPATH=src

# Run all tests
python3 -m pytest tests/ -v

# Run a single test file
python3 -m pytest tests/test_orderbook.py -v

# Run with coverage
python3 -m pytest tests/ --cov=mini_jane_street --cov-report=term-missing

# Lint & type check
ruff check src/ tests/ scripts/
mypy src/

# Install dependencies (use editable install for dev)
pip install -e ".[dev]"

# Run simulation
python3 scripts/run_simulation.py --ticks 500 --seed 42 --output results/
```

## Architecture

```
SimulationEngine
  ├─ Clock (virtual time)
  ├─ MarketDataGenerator (arithmetic random walk → latent mid price)
  ├─ Exchange
  │    ├─ OrderBook → PriceLevel[deque] (SortedDict ascending)
  │    ├─ _open_orders (resting orders by ID)
  │    └─ _trader_order_ids (persistent per-trader order ID registry)
  ├─ traders[] (RandomTaker, MomentumTrader, MeanReversionTrader)
  └─ market_maker (MarketMaker — inventory-adjusted quotes)
       └─ Analytics (consumes Fill events)
```

## Package Imports

The package is `mini_jane_street`. All public types are re-exported from `src/mini_jane_street/__init__.py`:

```python
from mini_jane_street import (
    SimulationConfig, SimulationEngine, Exchange,
    RandomTaker, MomentumTrader, MeanReversionTrader,
    MarketMaker, Analytics,
)
```

## Key Design Decisions

- **`Decimal` everywhere** for prices — no floats in financial calculations
- **Frozen dataclasses** for all event objects (`Order`, `Fill`, `MarketData`)
- **`SortedDict` ascending** for both bid and ask books — best bid is `next(reversed(bid_book))`, best ask is `next(iter(ask_book))`. Do NOT use `reverse=True` — it is not supported in sortedcontainers 2.x
- **`SimulationConfig` lives in `config.py`** — extracted from `analytics.py` to break circular import between analytics and simulation
- **MatchingEngine is pure**: given same order + book state, produces same fills. The caller (Exchange) applies fills
- **OrderBook owns matching**: `add_order()` returns fills directly; no separate mutable state path

## Critical Gotchas (caused real bugs)

### Fill Routing
- Exchange generates order IDs as `f"{trader_id}-{uuid4()}"`. This prefix enables `fill.order_id.startswith(trader.trader_id)` routing in `SimulationEngine.step()`.
- `_trader_order_ids` in Exchange is the authoritative registry for all order IDs submitted by a trader. It persists even after an order is fully filled (unlike `_open_orders` which is synced to book state after each `add_order`).
- MM fill routing: checks `fill.counterparty_id in exchange._trader_order_ids[mm.trader_id]`, NOT `counterparty_id == mm.trader_id` (counterparty_id is an order UUID, not a trader name).

### `_open_orders` Sync
- After every `add_order()` call, Exchange runs `_sync_open_orders()` to prune fully-matched resting orders from `_open_orders`. This keeps `_open_orders` consistent with the actual book state.
- `_trader_order_ids` is NOT cleaned during sync — those IDs are needed for fill routing even after the resting order is consumed.

### MarketMaker Latent Price
- MM uses `exchange.mid_price` (the exchange's internal latent price, updated every tick) rather than `MarketData.mid_price` (which comes from the order book snapshot). On empty books, `MarketData.mid_price == 0` but `exchange.mid_price` is still set.

### Avg Cost Division
- `Trader._avg_cost` division must use `Decimal(self.position)` — `self.position` is `int`, and `Decimal / int` works fine, but `Decimal / Decimal` can trigger context precision issues. Check: `total_cost / Decimal(self.position)`.

### Partial Fills in OrderBook
- When a resting order is partially consumed, it is `popleft()` from the deque, reconstructed with incremented `filled_qty`, and `appendleft()` back. Priority is preserved because the updated order rejoins ahead of newer orders at that level.
- `rest_order()` replaces by `order_id` rather than appending — this prevents double-counting when the same order ID is used for both a fill and a rest.

### Cancel Order ID Tracking
- MM quotes get fully filled → removed from `_open_orders` → MM's stored `_open_bid_id` becomes stale. Solution: MM calls `exchange.cancel_all_for_trader(trader_id)` to cancel ALL its existing quotes before posting new ones, rather than trying to cancel by individual ID.

---

## Web Layer (server/ + frontend/)

### Running the web app

```bash
# Terminal 1 — backend (FastAPI)
cd server
pip install -r requirements.txt
PYTHONPATH=../src uvicorn main:app --reload --port 8000

# Terminal 2 — frontend (React/Vite)
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/ws` to `localhost:8000`.

### WebSocket message types

| Type | Direction | Description |
|------|-----------|-------------|
| `start` | server→client | Initial config snapshot when WS connects |
| `tick` | server→client | Every simulation tick — order book, price, trades |
| `complete` | server→client | Final results when simulation ends |
| `error` | server→client | Error during simulation |

### REST API

```
POST /api/simulate  { num_ticks, volatility, seed, initial_price }  → { run_id }
GET  /api/simulate/{run_id}  → { status, result }
WS   /ws/simulate/{run_id}   → streams tick messages
```

### WebSocket data flow

```
POST /api/simulate → returns run_id
         ↓
WS /ws/simulate/{run_id}
         ↓
manager.start_simulation(run_id) → asyncio.create_task
         ↓
SimulationManager runs engine.step() in a loop
         ↓
asyncio.Queue.put(msg.to_dict())
         ↓
WebSocket.send_json(msg)
         ↓
React hook (useSimulation) receives and calls onTick / onComplete
```

The simulation runs **fully in Python** (no Web Worker). Ticks are streamed one-by-one over WebSocket so the browser receives updates as they happen.

## Additional Docs

`docs/` contains supplementary documentation: `architecture.md` (component diagram), `spec.md` (feature spec), `roadmap.md` (planned work), and `research.md` (market microstructure references).
