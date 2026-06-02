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

# ─── Frontend (React/Vite + Tailwind) ─────────────────
cd frontend
npm install
npm run dev          # dev server on :5173; Vite proxies /api and /ws → localhost:8000
npm run build        # tsc -b && vite build → dist/ (includes TypeScript check)
npm run preview      # preview the built dist/

# Tailwind is scoped to landing page only. Simulation app keeps vanilla CSS.
# Do NOT use Tailwind classes in simulation components (App.tsx, ConfigPanel, etc.)

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
  ├─ market_maker (MarketMaker — inventory-adjusted quotes)
  └─ analytics (Analytics — read-only consumer of fill log)

Other dirs:
  scripts/         — CLI entry point (run_simulation.py)
  notebooks/       — Jupyter notebook for post-simulation analysis
  outputs/         — Sample simulation output (config, report, trades)
  tests/           — 108 tests: conftest.py + test_*.py for each module
```

### Simulation Step Order (per tick)

1. `Clock.advance()` — tick increments
2. `MarketDataGenerator.step()` — random walk price update
3. `Exchange.update_mid_price()` — sync latent price
4. `MarketMaker.on_market_data()` — MM posts quotes
5. `Trader.on_market_data()` — each bot decides
6. Fill routing — Exchange emits trades → routed to the appropriate agent

## API Request/Response

```python
# SimulationRequest fields (server/models.py)
SimulationRequest(
    num_ticks=200,
    volatility=0.5,
    seed=42,
    initial_price=100.0,
    tick_delay_ms=10,
    step_mode=False,
    enabled_agents=["mm-1", "rt-1", "rt-2", "mom-1", "mr-1"],  # which agents run
    difficulty=None,  # "beginner" | "intermediate" | "advanced"
)
```

**Difficulty presets** (override volatility + tick_delay when set):

| Preset | Volatility | Delay |
|--------|-----------|-------|
| beginner | 0.2 | 200ms |
| intermediate | 0.5 | 50ms |
| advanced | 1.5 | 10ms |

## Package Layout

The `mini_jane_street` package lives in **two places**:
- `src/mini_jane_street/` — for local dev and tests (resolved via `PYTHONPATH=src`)
- `server/mini_jane_street/` — embedded copy for deployment (Render targets `server/` only)

**Sync after editing the Python package (always do this before committing):**
```bash
cp -r src/mini_jane_street/ server/mini_jane_street/
```
The `server/` copy is what Render serves. The `src/` copy is what `PYTHONPATH=src` resolves. **Always sync after editing.**

**Frontend styles:**
- Landing page: Tailwind CSS v3.4 (`tailwind.config.js`, `postcss.config.js`) — **do not use Tailwind classes in simulation components**
- Simulation app: vanilla CSS in `index.css` + CSS custom properties (dark/light themes)

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
POST /api/simulate            { config }        → { run_id }
GET  /api/simulate/{run_id}                       → { status, result }
DELETE /api/simulate/{run_id}                     → cancels simulation
POST /api/simulate/{run_id}/step                  → triggers one tick in step mode
POST /api/simulate/{run_id}/speed  { delay_ms }  → updates tick delay
GET  /api/health                                   → health check
POST /api/ai/analyze  { prompt }                  → Groq LLM analysis (server-side key)
WS   /ws/simulate/{run_id}                        → streams tick messages
```
Landing page at `/`. Simulation at `/simulate`. `vercel.json` rewrites all paths to `index.html` for SPA routing.

**`POST /api/ai/analyze`** proxies to Groq `llama-3.3-70b-versatile`. The API key lives in `server/.env` as `GROQ_API_KEY` — never exposed to the frontend.

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
├── App.tsx                    # Router shell: BrowserRouter → / (LandingPage) | /simulate (SimulationApp)
├── main.tsx                   # Entry: StrictMode > ErrorBoundary > ThemeProvider > LondonClockProvider > App
├── types.ts                   # TypeScript types for WebSocket messages (TickMsg, CompleteMsg, Trade, etc.)
├── index.css                  # @tailwind directives + ALL simulation vanilla CSS (~870 lines, dark/light vars)
├── hooks/
│   └── useSimulation.ts       # WS + REST hook: start, stop, step, setSpeed, with ref-pattern for stale closures
├── contexts/
│   ├── ThemeContext.tsx       # Dark/light theme via CSS custom properties + localStorage
│   └── LondonClockContext.tsx # Single live London time instance shared between Nav desktop/mobile menus
├── services/
│   └── groqService.ts         # POST /api/ai/analyze — throws on non-2xx
├── pages/
│   ├── LandingPage.tsx        # Route / — Tailwind-styled: Nav + Hero + About + HowItWorks + Agents + CTA + Contact
│   └── SimulationApp.tsx      # Route /simulate — full dashboard: stats bar, order book, chart, config, PnL
└── components/
    ├── ConfigPanel.tsx        # Difficulty presets, agent toggles, speed, step mode
    ├── OrderBook.tsx          # Live bid/ask depth with cumulative bars + spread histogram
    ├── PriceChart.tsx         # Recharts LineChart with initial price reference line
    ├── TradeTape.tsx          # Auto-scrolling trade list (last 100)
    ├── PnLDashboard.tsx       # Per-agent P&L cards + live positions + analytics metrics
    ├── EducationalSidebar.tsx # Live explanations: spread, momentum, OBI, MM inventory (visible during run)
    ├── AiAnalyst.tsx          # "Ask AI" button → /api/ai/analyze → Groq analysis (orange accent card)
    ├── ErrorBoundary.tsx      # Class-based React error boundary
    └── landing/               # Tailwind-styled components: Nav, Hero, About, HowItWorks, Agents, CTA, Contact
```

**Entry hierarchy:** `main.tsx` wraps `LondonClockProvider` around `App`. The `LondonClockContext` shares a single timer between the desktop nav and mobile hamburger menu — prevents duplicate timers.

**Vite proxy** (`vite.config.ts`): `/api` and `/ws` proxied to `localhost:8000` in dev only. In production, `VITE_API_URL` (set in Vercel env) points to Render.

Tech stack: React 18 + TypeScript + Vite + Recharts + react-router-dom v7 + Tailwind CSS v3.4 (landing only). Simulation app uses vanilla CSS + CSS custom properties.

## Deployment

**Frontend → Vercel**
- Root Directory: `frontend`
- Build: `npm run build`
- Output: `dist`
- Env var: `VITE_API_URL = https://micro-market-backend.onrender.com`
- `vercel.json` has `rewrites` — required for `/simulate` SPA route to work

**Backend → Render**
- Root Directory: `server`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

Pushes to `main` auto-trigger both deployments.

## Additional Docs

`docs/` has supplementary documentation: `architecture.md`, `spec.md`, `roadmap.md`, `research.md`, `idea_review.md`.
