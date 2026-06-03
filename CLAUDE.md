# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive market microstructure simulator — watch price form in real-time as 5 trading agents (MarketMaker, RandomTaker×2, MomentumTrader, MeanReversionTrader) interact through a limit order book. Landing page at `/`, simulation dashboard at `/simulate`.

## Commands

```bash
# ─── Python (simulation engine) ───────────────────────────
# Always set PYTHONPATH=src when running locally
export PYTHONPATH=src

python3 -m pytest tests/ -v              # All tests (108)
python3 -m pytest tests/test_orderbook.py -v  # Single file
python3 -m pytest tests/ --cov=mini_jane_street --cov-report=term-missing
python3 -m ruff check src/ tests/ scripts/       # Lint (39 errors, 31 fixable with --fix)
python3 -m mypy src/mini_jane_street/ --python-version 3.12  # Type check
python3 scripts/run_simulation.py --ticks 500 --seed 42 --output results/  # CLI

# ─── Frontend ─────────────────────────────────────────────
cd frontend
npm run dev    # :5173, Vite proxies /api and /ws → localhost:8000
npm run build  # tsc -b && vite build → dist/

# ─── Backend ──────────────────────────────────────────────
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Architecture

```
SimulationEngine
  ├─ Clock (virtual tick counter)
  ├─ MarketDataGenerator (arithmetic random walk → latent mid price)
  ├─ Exchange
  │    ├─ OrderBook → PriceLevel[deque] (SortedDict ascending)
  │    ├─ _open_orders (pruned after each add_order)
  │    └─ _trader_order_ids (persistent — accumulates all submitted IDs)
  ├─ traders[] (RandomTaker×2, MomentumTrader, MeanReversionTrader)
  ├─ market_maker (MarketMaker — inventory-adjusted quotes)
  └─ analytics (read-only consumer of fill log)
```

### Per-Tick Step Order

1. `Clock.advance()` — tick increments
2. `MarketDataGenerator.step()` — random walk price update
3. `Exchange.update_mid_price()` — sync latent price
4. `MarketMaker.on_market_data()` — MM posts quotes
5. `Trader.on_market_data()` — each bot decides
6. Fill routing — Exchange emits trades → routed to agents

## Key Design Decisions

- **`Decimal` everywhere** for prices. `PRICE_PRECISION = Decimal("0.01")` in `entities.py` is the single tick-size constant.
- **Frozen dataclasses** for `Order`, `Fill`, `MarketData`; mutable for `Exchange`, `OrderBook`, `SimulationEngine`.
- **SortedDict ascending** for both bid and ask. Best bid = `next(reversed(bid_book))`, best ask = `next(iter(ask_book))`. No `reverse=True`.
- **OrderBook owns matching** — `add_order()` returns fills directly.
- **`MatchingEngine`** in `matching_engine.py` is a reference/pure-test implementation; runtime matching lives in `OrderBook.add_order()`.
- **`SimulationConfig` extracted to `config.py`** — breaks circular imports between `analytics` and `simulation`.

## Critical Gotchas

### Fill Routing
- Order IDs: `f"{trader_id}-{uuid4()}"` — prefix routing: `fill.order_id.startswith(trader.trader_id)`
- `_trader_order_ids` persists even after full fill (needed for passive MM fill routing)
- MM fill routing: `fill.counterparty_id in exchange._trader_order_ids[mm.trader_id]` — NOT `== mm.trader_id`

### `_open_orders` vs `_trader_order_ids`
- `_open_orders` — synced to book state after every `add_order()`, fully-matched orders pruned
- `_trader_order_ids` — NOT pruned, accumulates all submitted order IDs permanently
- MM uses `cancel_all_for_trader()` for stale quotes, not individual ID tracking

### Other
- MM uses `exchange.mid_price` (latent, set every tick) not `MarketData.mid_price` (book snapshot)
- Use `Decimal(self.position)` for avg cost division — avoids context precision issues
- Partial fills: `popleft()` → reconstruct with `filled_qty += consumed` → `appendleft()` preserves FIFO; `rest_order()` replaces by `order_id` to prevent double-counting

## Package Layout

`mini_jane_street` lives in two places:
- `src/mini_jane_street/` — local dev (via `PYTHONPATH=src`)
- `server/mini_jane_street/` — Render deployment (Render targets `server/` only)

**Sync after editing (always before committing):**
```bash
cp -r src/mini_jane_street/ server/mini_jane_street/
```

## API & WebSocket

```bash
POST /api/simulate         { config }              → { run_id }
GET  /api/simulate/{run_id}                        → { status, result }
DELETE /api/simulate/{run_id}                      → cancels simulation
POST /api/simulate/{run_id}/step                   → one tick (step mode)
POST /api/simulate/{run_id}/speed  { delay_ms }   → update tick delay
POST /api/ai/analyze  { prompt }                  → Groq LLM analysis (server-side key)
WS   /ws/simulate/{run_id}                        → streams ticks
```

| WS Type | Direction | Description |
|---------|-----------|-------------|
| `start` | server→client | Config snapshot on connect |
| `tick` | server→client | Order book depth, price, trades, per-agent positions |
| `complete` | server→client | Final analytics (TraderPnL[], AnalyticsMetrics) |
| `error` | server→client | Simulation error |

`tick_delay_ms` controls `asyncio.sleep()` between ticks (overridable via `/speed`). `POST /api/ai/analyze` proxies to Groq `llama-3.3-70b-versatile` with a market microstructure tutor system prompt.

## Frontend

### Routing & Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `LandingPage.tsx` | Landing page with hero, agents, CTA |
| `/simulate` | `SimulationApp.tsx` | Full simulation dashboard |

### Simulation Components (`frontend/src/components/`)

| Component | Purpose |
|-----------|---------|
| `ConfigPanel` | Tick/volatility/seed/difficulty controls |
| `OrderBook` | Live bid/ask depth display |
| `PriceChart` | Price chart with Recharts |
| `TradeTape` | Rolling trade log |
| `PnLDashboard` | Per-agent realized/unrealized PnL |
| `EducationalSidebar` | Market microstructure context panel |
| `AiAnalyst` | Calls `POST /api/ai/analyze` → Groq LLM commentary |
| `ErrorBoundary` | React error boundary wrapping the dashboard |
| `LondonClock` | Virtual simulation clock display |

### Landing Sub-components (`frontend/src/components/landing/`)

`HeroSection`, `AgentsSection`, `SimulatorSelector`, `HowItWorksSection`, `CtaSection`, `AboutSection`, `ContactSection`, `Nav`, `TextRollButton`

### Styling

- Landing page: Tailwind CSS v3.4, responsive, dark/light via CSS vars
- Simulation app: **vanilla CSS + CSS custom properties only** — do NOT use Tailwind classes in simulation components
- React 18 + TypeScript + Vite + Recharts + react-router-dom v7

### `useSimulation.ts` Hook

Handles WebSocket + REST orchestration. Key patterns:
- **Ref pattern** for callbacks: `onTickRef = useRef(onTick)` updated via `useEffect` — prevents stale closures in async WS message handlers
- WS auto-reconnects on close; `status` state: `idle | connecting | running | complete | error`
- Step mode: client calls `POST /api/simulate/{run_id}/step` to advance one tick
- Speed control: `POST /api/simulate/{run_id}/speed { delay_ms }` overrides tick delay

### TypeScript Types (`frontend/src/types.ts`)

Core WebSocket message types: `TickMsg`, `StartMsg`, `CompleteMsg`, `ErrorMsg`, `WsMessage`. `AgentPosition`, `Trade`, `TraderPnL`, `AnalyticsMetrics`, `SimConfig`.

In dev: Vite proxy maps `/api` and `/ws` to `localhost:8000`. In production: `VITE_API_URL` env var points to Render.

## Server Files

- `server/main.py` — FastAPI app (REST + WebSocket + AI proxy + root HTML serving)
- `server/manager.py` — `SimulationManager` orchestrates async runs
  - `_runs: Dict[str, SimulationRun]` — keyed by `run_id` (UUID prefix, e.g. `a1b2c3d4`)
  - `_queues: Dict[str, asyncio.Queue]` — per-run tick message queues
  - Step mode: `trigger_step(run_id)` sets `run.step_event` (`asyncio.Event`); worker loop does `await event.wait()` then clears
  - Speed control: `set_speed()` updates `tick_delay_ms` on the live `SimulationRun`
- `server/models.py` — Pydantic-free dataclasses: `SimulationRequest`, `SimulationRun`, `TickMessage`, `CompleteMessage`
- `server/Dockerfile` — container image for Render deployment

## SimulationRequest

```python
SimulationRequest(
    num_ticks=200,
    volatility=0.5,
    seed=42,
    initial_price=100.0,
    tick_delay_ms=10,
    step_mode=False,
    enabled_agents=["mm-1", "rt-1", "rt-2", "mom-1", "mr-1"],
    difficulty=None,  # "beginner" | "intermediate" | "advanced"
)
```

| Preset | Volatility | Delay |
|--------|-----------|-------|
| beginner | 0.2 | 200ms |
| intermediate | 0.5 | 50ms |
| advanced | 1.5 | 10ms |

## Deployment

**Frontend → Vercel**: Root `frontend`, build `npm run build`, output `dist`, env `VITE_API_URL`. `vercel.json` rewrites `/simulate` for SPA routing.

**Backend → Render**: Root `server`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. `GROQ_API_KEY` lives in `server/.env` — never exposed to frontend.

Pushes to `main` auto-trigger both deployments.

## Additional Docs & Outputs

`docs/` — supplementary documentation: `architecture.md`, `spec.md`, `roadmap.md`, `research.md`, `idea_review.md`

`notebooks/` — `analysis.ipynb` for Jupyter-based simulation analysis

`outputs/` — CLI simulation outputs: `report.json`, `trades.csv`, `config.json` (written by `scripts/run_simulation.py`)

## Test File Map

| File | What it tests |
|------|---------------|
| `test_orderbook.py` | `OrderBook.add_order`, `cancel_order`, `get_depth`, `get_spread` |
| `test_matching_engine.py` | `MatchingEngine` pure FIFO matching, price-time priority |
| `test_matching_engine_integration.py` | end-to-end matching with partial fills |
| `test_exchange.py` | `Exchange` routing, fill logging, `update_mid_price` |
| `test_traders.py` | `RandomTaker`, `MomentumTrader`, `MeanReversionTrader` |
| `test_market_maker.py` | MM quoting, inventory skew, fill routing |
| `test_simulation.py` | `SimulationEngine` full runs, tick sequencing |
| `test_analytics.py` | Sharpe ratio, max drawdown, win rate, profit factor |
| `test_api.py` | FastAPI REST + WebSocket endpoints |
| `conftest.py` | Shared fixtures: `sample_order`, `empty_book`, `exchange`, `mm` |
