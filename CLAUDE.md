# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# ─── Python (simulation engine) ───────────────────────────
# Always set PYTHONPATH=src when running locally
export PYTHONPATH=src

# Run all tests
python3 -m pytest tests/ -v

# Run a single test file
python3 -m pytest tests/test_orderbook.py -v

# With coverage
python3 -m pytest tests/ --cov=mini_jane_street --cov-report=term-missing

# Lint
python3 -m ruff check src/ tests/ scripts/

# CLI simulation
python3 scripts/run_simulation.py --ticks 500 --seed 42 --output results/

# ─── Frontend (React/Vite) ───────────────────────────────
cd frontend
npm install
npm run dev          # dev server on :5173; Vite proxies /api and /ws → localhost:8000
npm run build        # production build → dist/
npm run preview      # preview the built dist/

# ─── Backend (FastAPI) ────────────────────────────────────
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Architecture

```
SimulationEngine
  ├─ Clock (virtual time)
  ├─ MarketDataGenerator (arithmetic random walk → latent mid price)
  ├─ Exchange
  │    ├─ OrderBook → PriceLevel[deque] (SortedDict ascending)
  │    ├─ _open_orders (resting orders by ID, pruned after each step)
  │    └─ _trader_order_ids (persistent per-trader order ID registry)
  ├─ traders[] (RandomTaker, MomentumTrader, MeanReversionTrader)
  └─ market_maker (MarketMaker — inventory-adjusted quotes)
       └─ Analytics (consumes Fill events)

Other dirs:
  scripts/         — CLI entry point (run_simulation.py)
  notebooks/       — Jupyter notebook for post-simulation analysis
  outputs/         — Sample simulation output (config, report, trades)
  tests/           — 98 tests: conftest.py + test_*.py for each module
```

### Simulation Step Order (per tick)

1. `Clock.advance()` — tick increments
2. `MarketDataGenerator.step()` — random walk price update
3. `Exchange.update_mid_price()` — sync latent price
4. `MarketMaker.on_market_data()` — MM posts quotes
5. `Trader.on_market_data()` — each bot decides
6. Fill routing — Exchange emits trades → routed to the appropriate agent

## Package Layout

The `mini_jane_street` package lives in **two places**:
- `src/mini_jane_street/` — for local dev and tests (resolved via `PYTHONPATH=src`)
- `server/mini_jane_street/` — embedded copy for deployment (Render targets `server/` only)

**Sync after editing the Python package (always do this before committing):**
```bash
cp -r src/mini_jane_street/ server/mini_jane_street/
```
The `server/` copy is what Render serves. The `src/` copy is what `PYTHONPATH=src` resolves. **Always sync after editing.**

## Server Files

- `server/main.py` — FastAPI app (REST + WebSocket endpoints)
- `server/manager.py` — `SimulationManager` orchestrates async simulation runs; routes ticks over `asyncio.Queue` → WebSocket
- `server/models.py` — Pydantic-free dataclasses: `SimulationRequest`, `SimulationRun`, `TickMessage`, `CompleteMessage`

## Package Imports

```python
from mini_jane_street import (
    SimulationConfig, SimulationEngine, Exchange,
    RandomTaker, MomentumTrader, MeanReversionTrader,
    MarketMaker, Analytics,
)
```

All public types are re-exported from `src/mini_jane_street/__init__.py`.

## Key Design Decisions

- **`Decimal` everywhere** for prices — no floats in financial calculations
- **`PRICE_PRECISION = Decimal("0.01")`** in `entities.py` — single constant for tick size and rounding
- **Frozen dataclasses** for `Order`, `Fill`, `MarketData`; mutable for `Exchange`, `OrderBook`, `SimulationEngine`
- **`SortedDict` ascending** for both bid and ask books — best bid is `next(reversed(bid_book))`, best ask is `next(iter(ask_book))`. Do NOT use `reverse=True`
- **OrderBook owns matching** — `add_order()` returns fills directly; no separate mutable state path
- **`MatchingEngine`** in `matching_engine.py` is a reference/test implementation, not used at runtime
- **`SimulationConfig` in `config.py`** — extracted from analytics to break circular imports
- **100-tick rolling window** for MomentumTrader and MeanReversionTrader indicators

## Critical Gotchas

### Fill Routing
- Order IDs are `f"{trader_id}-{uuid4()}"` — this prefix is used for routing: `fill.order_id.startswith(trader.trader_id)`
- `_trader_order_ids` persists even after full fill (IDs needed for passive fill routing to MM)
- MM fill routing checks `fill.counterparty_id in exchange._trader_order_ids[mm.trader_id]` — NOT `== mm.trader_id`

### `_open_orders` vs `_trader_order_ids`
- `_open_orders` is synced to book state after every `add_order()` — fully-matched resting orders are pruned
- `_trader_order_ids` is NOT pruned — it accumulates all submitted order IDs permanently
- MM uses `cancel_all_for_trader()` to clear stale quotes rather than tracking individual IDs

### MarketMaker Latent Price
- MM uses `exchange.mid_price` (latent, set every tick) not `MarketData.mid_price` (book snapshot, 0 on empty book)

### Avg Cost Division
- Use `Decimal(self.position)` not `Decimal / Decimal` — avoids context precision issues

### Lessons Learned
- **Avoid duplicate mutable references** — storing orders in both `_open_orders` and `PriceLevel.orders` caused stale references on partial fills. Single source of truth: the deque.
- **Circular imports are a design smell** — `analytics` and `simulation` both imported `SimulationConfig`. Fix: extract to `config.py`.
- **Test the bug, not just the happy path** — a specific test caught "order rests but status is FILLED" that happy-path tests missed.

### Type Checking
```bash
python3 -m mypy src/mini_jane_street/ --python-version 3.12
```

### Partial Fills in OrderBook
- `popleft()` → reconstruct with `filled_qty += consumed` → `appendleft()` preserves FIFO (rejoins ahead of newer orders at same level)
- `rest_order()` replaces by `order_id` — prevents double-counting when same ID is used for fill + rest

## Web Layer (server/ + frontend/)

### Running locally
```bash
# Terminal 1
cd server && uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev   # proxies /api and /ws to :8000
```

### API
```
POST /api/simulate  { num_ticks, volatility, seed, initial_price, step_mode }  → { run_id }
GET  /api/simulate/{run_id}  → { status, result }
POST /api/simulate/{run_id}/step  → triggers one tick in step mode
POST /api/simulate/{run_id}/speed  { delay_ms }  → updates tick delay
WS   /ws/simulate/{run_id}   → streams tick messages
```

### WebSocket messages
| Type | Direction | Description |
|------|-----------|-------------|
| `start` | server→client | Initial config snapshot on WS connect |
| `tick` | server→client | Order book depth, price, trades for this tick |
| `complete` | server→client | Final analytics results |
| `error` | server→client | Error during simulation |

### Data flow
```
POST /api/simulate → run_id
WS /ws/simulate/{run_id}
  SimulationManager.start_simulation(run_id) → asyncio.create_task
    engine.step() loop with `asyncio.sleep(delay)` per tick (configurable via `/speed`)
    asyncio.Queue.put(msg.to_dict())
    WebSocket.send_json(msg)
      useSimulation hook → onTick(msg) / onComplete(msg)
```

Simulation runs fully in Python. Ticks are streamed one-by-one over WebSocket.
`tick_delay_ms` controls the sleep between ticks (default from `SimulationRequest`, overridable via `/speed`).

### Frontend types
Frontend types are in `frontend/src/types.ts`. Key types:
- `TickMsg` — every tick payload with order book + trades + per-agent positions
- `CompleteMsg` — final analytics with `TraderPnL[]` and `AnalyticsMetrics`
- `Trade` — `{ price, quantity, side, counterparty, timestamp }`
- `AgentPosition` — `{ id, position, realized, unrealized }` (sent each tick)

### Frontend Structure
```
frontend/src/
├── App.tsx            # Main component orchestrating all panels
├── types.ts          # TypeScript types for WebSocket messages
├── main.tsx          # Entry: StrictMode > ErrorBoundary > ThemeProvider > App
├── index.css         # Global styles — dark/light CSS variable themes
├── hooks/
│   └── useSimulation.ts   # WS + REST hook: start, stop, step, setSpeed
├── contexts/
│   └── ThemeContext.tsx   # Dark/light theme with localStorage persistence
└── components/
    ├── ConfigPanel.tsx    # Simulation config form
    ├── OrderBook.tsx     # Live bid/ask depth display
    ├── PriceChart.tsx   # Line chart of mid price (recharts)
    ├── TradeTape.tsx    # Scrolling recent trades list
    ├── PnLDashboard.tsx  # Per-agent realized/unrealized PnL + positions
    └── ErrorBoundary.tsx
```

Tech stack: React 18 + TypeScript + Vite + Recharts. Single-page app (no router). Dark/light theme via CSS custom properties.

## Deployment

**Frontend → Vercel**
- Root Directory: `frontend`
- Build: `npm run build`
- Output: `dist`
- Env var: `VITE_API_URL = https://micro-market-backend.onrender.com`

**Backend → Render**
- Root Directory: `server`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

Pushes to `main` auto-trigger both deployments.

## Additional Docs

`docs/` has supplementary documentation: `architecture.md`, `spec.md`, `roadmap.md`, `research.md`, `idea_review.md`.
