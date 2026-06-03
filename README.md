# Mini Market — Financial Market Education Platform

> An interactive market microstructure simulator — learn how prices form in real-time through simulation, not speculation.

[Live Demo](https://mini-market.vercel.app) · [Documentation](#quick-start) · [Architecture](#architecture) · [4 Simulation Modules](#simulation-modules)

---

## What is this?

**Mini Market** is an educational platform for understanding **how financial markets work**. Rather than treating price as a black box, you explore market microstructure through interactive simulations — watching the order book, the matching engine, and five trading agents compete tick-by-tick.

The platform opens with a hero section and four simulation modules. Each module is a complete learning experience: read about the concept, see visual illustrations, then enter the live simulation.

## 4 Simulation Modules

| Module | Route | Focus |
|--------|-------|-------|
| **Market Microstructure** | `/simulations/microstructure` | How orders become trades and trades become prices |
| **Order Book Dynamics** | `/simulations/orderbook` | FIFO matching, queue priority, depth visualization |
| **Market Making** | `/simulations/marketmaking` | Spread capture vs inventory risk and adverse selection |
| **Volatility Explorer** | `/simulations/volatility` | How volatility regimes change market behavior |

Each module page includes: concept explanation, key terms, visual illustrations, learning outcomes, and an "Enter Simulation" CTA.

---

## What you'll see in the simulation

```
┌──────────────────────────────────────────────────────────────┐
│  Price Chart (random walk)           │  Order Book            │
│                                     │  Bid        Ask        │
│         $100.45 ──────────────────── │  100.44     100.46     │
│       ╱                             │  100.43     100.47     │
│   ╱──                               │  100.42     100.48     │
│ ─                                   │                       │
├──────────────────────────────────────┴──────────────────────┤
│  Trade Tape  │  RT-1 bought  50 @ 100.44  │  MM PnL: +$12.50 │
│              │  MOM-1 sold   30 @ 100.46   │  Sharpe: 1.82     │
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
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend (React + Vite)
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173` — land on the homepage, choose a simulation module. Click **"Learn More"** to read about the concept, then **"Enter Simulation"** to run the live market.

### Run Tests

```bash
PYTHONPATH=src python3 -m pytest tests/ -v      # All tests
PYTHONPATH=src python3 -m pytest tests/ -q      # Quick run
```

---

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

### Key Design Decisions

- **`Decimal` everywhere** for prices. `PRICE_PRECISION = Decimal("0.01")` in `entities.py` is the single tick-size constant.
- **Frozen dataclasses** for `Order`, `Fill`, `MarketData`; mutable for `Exchange`, `OrderBook`, `SimulationEngine`.
- **`SortedDict` ascending** for both bid and ask. Best bid = `next(reversed(bid_book))`, best ask = `next(iter(ask_book))`.
- **OrderBook owns matching** — `add_order()` returns fills directly.
- **`SimulationConfig` extracted to `config.py`** — breaks circular imports between `analytics` and `simulation`.

### Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | WebGL shader hero + 4 simulation cards |
| `/simulations` | `SimulationsIndex` | Redirects to `/simulations/microstructure` |
| `/simulations/:type` | `ModulePage` | Learning module info page (microstructure/orderbook/marketmaking/volatility) |
| `/simulate/:type` | `SimulationApp` | Full simulation dashboard (resizable panels, WebSocket) |

### Package Layout

`mini_jane_street` lives in two places:
- `src/mini_jane_street/` — local dev (via `PYTHONPATH=src`)
- `server/mini_jane_street/` — Render deployment

Sync after editing:
```bash
cp -r src/mini_jane_street/ server/mini_jane_street/
```

### API & WebSocket

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

---

## Deploy (Vercel + Render)

**Render (backend):**
1. Create account at [render.com](https://render.com) — sign up with GitHub
2. New → Web Service → connect `micro-market-simulator`
3. Settings:
   - **Root Directory**: `server`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
4. Add environment variable: `GROQ_API_KEY` (get from [console.groq.com](https://console.groq.com))
5. Click **Create Web Service** → wait ~2 min → copy the URL

**Vercel (frontend):**
1. Create account at [vercel.com](https://vercel.com) — sign up with GitHub
2. Add New Project → select `micro-market-simulator`
3. Root Directory: `frontend` | Build Command: `npm run build` | Output: `dist`
4. Deploy → Settings → Environment Variables → add `VITE_API_URL = https://YOUR-RENDER-URL.onrender.com`
5. Redeploy → live at `https://mini-market.vercel.app`

Pushes to `main` auto-trigger both deployments.

---

## Concepts to Learn

By watching the simulation, you'll understand:

- **Bid/ask spread** — why it always exists (market maker needs compensation)
- **FIFO matching** — first order at the best price gets filled first
- **Market maker economics** — earning the spread while managing inventory risk
- **Momentum vs Mean Reversion** — momentum wins in trending markets, loses in sideways
- **Adverse selection** — market maker gets picked off when informed traders arrive
- **Volatility regimes** — spreads widen when uncertainty increases
- **Partial fills** — large orders consume multiple price levels
- **Order book imbalance** — bid/ask depth ratio predicts short-term price direction