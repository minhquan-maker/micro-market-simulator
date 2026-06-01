# Phase 2 — Specification: Mini Jane Street Simulator

## 1. Product Goals

| Goal | Description | Priority |
|------|-------------|----------|
| **Educational Fidelity** | Correctly model order books, matching, market making, and PnL | P0 |
| **Interview Readiness** | Code quality, architecture clarity, quant accuracy | P0 |
| **Reproducibility** | Deterministic simulation with seeded randomness | P1 |
| **Extensibility** | Clean module boundaries for future enhancements | P1 |
| **Testability** | >= 80% code coverage; every component independently testable | P0 |

**Non-goals**: Real-time execution, network APIs, production deployment, multi-asset support.

---

## 2. Functional Requirements

### FR-1: Limit Order Book

**FR-1.1** The system shall maintain a bid side (SortedDict of price -> deque of orders) and an ask side (SortedDict of price -> deque of orders).

**FR-1.2** Each order shall have: `order_id` (UUID), `side` (BUY/SELL), `price` (Decimal), `quantity` (int), `timestamp` (float), `filled_qty` (int), `status` (enum).

**FR-1.3** The system shall expose `add_order(order)` returning a list of `Fill` objects.

**FR-1.4** The system shall expose `cancel_order(order_id)` returning `True`/`False`.

**FR-1.5** The system shall expose `get_best_bid()` and `get_best_ask()` returning `(price, qty)` or `None`.

**FR-1.6** The system shall expose `get_depth(levels)` returning a list of price levels with aggregated quantity.

**FR-1.7** The system shall expose `get_mid_price()` returning `(best_bid + best_ask) / 2` or `None` if book is empty on one side.

**FR-1.8** Price-time priority shall be enforced: orders at the same price level are matched FIFO by submission timestamp.

**FR-1.9** Partial fills shall be supported: an order can be partially filled and remain in the book with remaining quantity.

### FR-2: Matching Engine

**FR-2.1** The matching engine shall process incoming BUY limit orders by matching against the ask side at prices <= order's limit price.

**FR-2.2** The matching engine shall process incoming SELL limit orders by matching against the bid side at prices >= order's limit price.

**FR-2.3** Market orders shall be processed by sweeping the opposite book until filled or book is empty.

**FR-2.4** Each fill shall generate a `Fill` event with: `order_id`, `counterparty_id`, `price`, `quantity`, `timestamp`, `side`.

**FR-2.5** If an order is not fully filled, the remaining quantity shall rest in the book as a new order.

**FR-2.6** The matching engine shall reject market orders that arrive on an empty book (0 fills returned).

**FR-2.7** All price comparisons shall use `Decimal` with configurable `tick_size` (default 0.01).

### FR-3: Exchange Layer

**FR-3.1** The exchange shall maintain a single order book for one instrument.

**FR-3.2** The exchange shall route incoming orders to the matching engine and return a list of fills.

**FR-3.3** The exchange shall maintain a `trades` log: all historical fills with full metadata.

**FR-3.4** The exchange shall emit `MarketData` events containing: `timestamp`, `mid_price`, `best_bid`, `best_ask`, `bid_depth`, `ask_depth`.

**FR-3.5** The exchange shall expose `submit_order(side, price, qty, order_type)` to traders.

**FR-3.6** The exchange shall expose `cancel_order(order_id)` to cancel resting orders.

**FR-3.7** The exchange shall track all open orders by `order_id` for cancellation.

### FR-4: Market Simulation Engine

**FR-4.1** The simulation shall use a virtual clock (not real-time), advancing in discrete ticks.

**FR-4.2** The simulation shall generate a latent "true price" using arithmetic random walk: `P(t+1) = P(t) + N(0, sigma)`.

**FR-4.3** The simulation shall allow configuration of: `initial_price`, `volatility`, `tick_interval`, `num_ticks`.

**FR-4.4** The simulation shall maintain an event queue ordered by timestamp.

**FR-4.5** The simulation shall step through events and call the exchange's matching engine for each tick.

**FR-4.6** The simulation shall provide a `run()` method that executes the full simulation and returns results.

**FR-4.7** The simulation shall provide a `step(n)` method that advances `n` ticks for fine-grained control.

**FR-4.8** Random seed shall be configurable for reproducibility.

### FR-5: Trader Bots

**FR-5.1** All traders shall inherit from a `Trader` base class with `submit_order()` and `on_fill()` callbacks.

**FR-5.2** **RandomTaker Bot**: every tick, with probability `p`, submits a market order of random size. Simulates uninformed order flow.

**FR-5.3** **Momentum Bot**: computes rolling 10-tick return. If return > threshold, submits buy limit near ask. If return < -threshold, submits sell limit near bid.

**FR-5.4** **MeanReversion Bot**: computes rolling VWAP. If price < VWAP - threshold, buys at bid. If price > VWAP + threshold, sells at ask.

**FR-5.5** Each bot shall have configurable parameters (probability, threshold, window size).

**FR-5.6** Each bot shall track its own positions and PnL independently.

### FR-6: Market Maker Agent

**FR-6.1** The market maker shall continuously post a bid and an ask quote around the current mid price.

**FR-6.2** The base spread shall be configurable (`base_spread`, default 0.02).

**FR-6.3** Inventory adjustment: as `|inventory|` increases, quotes shall move away from mid by `inventory_alpha * inventory`.

**FR-6.4** Time adjustment: as simulation approaches end, spread shall widen linearly.

**FR-6.5** The market maker shall cancel existing quotes before posting new ones each tick.

**FR-6.6** The market maker shall maintain and report its own: position, realized PnL, number of fills received, spread captured.

### FR-7: Analytics

**FR-7.1** The analytics module shall track `realized_pnl` and `unrealized_pnl` for each trader.

**FR-7.2** The analytics module shall compute **Sharpe Ratio** (annualized if applicable; realized otherwise).

**FR-7.3** The analytics module shall compute **Maximum Drawdown** from the equity curve.

**FR-7.4** The analytics module shall compute **Win Rate** and **Profit Factor**.

**FR-7.5** The analytics module shall compute **Spread Capture** for the market maker: `(ask_fills - bid_fills) / total_fills * spread`.

**FR-7.6** The analytics module shall compute **Adverse Selection Ratio** for the market maker: fraction of fills where price moved against MM within N ticks.

**FR-7.7** The analytics module shall export a **trade history** as a pandas DataFrame.

**FR-7.8** The analytics module shall generate **equity curve** and **PnL distribution** visualizations as matplotlib figures.

**FR-7.9** All metrics shall be exportable as a JSON report.

### FR-8: Configuration

**FR-8.1** All simulation parameters shall be configurable via a `Config` dataclass.

**FR-8.2** The configuration shall be serializable to/from JSON.

**FR-8.3** Default configuration shall be provided for quick start.

---

## 3. Non-Functional Requirements

| NFR | Requirement | Test Method |
|-----|-------------|-------------|
| **NFR-1** | All prices use `Decimal` type with configurable precision | Type checking |
| **NFR-2** | Order book operations complete in O(log n) or better | Benchmark test |
| **NFR-3** | Full simulation of 1000 ticks completes in < 5 seconds | Timing test |
| **NFR-4** | >= 80% code coverage via pytest | `pytest --cov` |
| **NFR-5** | All modules importable without errors | `python -c "import"` |
| **NFR-6** | No mutable global state | Code review |
| **NFR-7** | Ruff linting passes with no errors | `ruff check` |
| **NFR-8** | Deterministic output with fixed random seed | Regression test |

---

## 4. Assumptions

1. **Single instrument**: The system simulates one security (e.g., a fictional stock "STOCK").
2. **No network latency**: All order submission and execution happen in the same event loop.
3. **No regulatory constraints**: No short-selling restrictions, margin requirements, or circuit breakers.
4. **No dark pools or hidden orders**: All orders are visible in the lit order book.
5. **No dividends or corporate actions**: The simulation runs over a finite horizon with no fundamental events.
6. **No fees for MVP**: Commission is set to 0 for all trades. Document where fees would be applied.
7. **Ticks are discrete and uniform**: Simulation time advances in equal increments.
8. **True price is observable in simulation**: The latent mid price is known, enabling adverse selection measurement.

---

## 5. Constraints

1. **Python 3.12+** — Use modern Python features (dataclasses, pattern matching, type aliases).
2. **No external C dependencies** — All dependencies must be pure Python or well-established wheels (sortedcontainers).
3. **Single-threaded** — No threading or multiprocessing. Event-driven loop only.
4. **No database** — All state is in-memory. Export via JSON.
5. **No web framework** — CLI output only. No REST/WebSocket APIs.
6. **No real market data** — Fully synthetic simulation.

---

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| FIFO correctness | 100% of test cases | Unit tests verify price-time priority |
| Partial fill correctness | All edge cases handled | Integration tests with known fills |
| Market order on empty book | 0 fills returned | Unit test |
| MM spread capture | Positive gross spread | Simulation test |
| Sharpe ratio computation | Matches manual calculation | Analytical verification test |
| Drawdown computation | Matches manual calculation | Analytical verification test |
| Test coverage | >= 80% | `pytest --cov=src --cov-report=term` |
| Ruff violations | 0 | `ruff check src` |
| Import cycle | 0 | `importlib` cycle check |

---

## 7. User Stories

### US-1: Researcher Validates Market Making Logic
> "As a researcher, I want to run a simulation with a market maker against random liquidity, so I can observe how spread capture and adverse selection interact."

**Acceptance**: Run simulation with 1 MM + 5 RandomTaker bots for 1000 ticks. Verify MM earns positive gross PnL. Export metrics JSON.

### US-2: Developer Runs Order Book Tests
> "As a developer, I want to verify that FIFO matching is correct, so I can trust the matching engine."

**Acceptance**: Submit 3 orders at same price, 2 at different prices. Verify fill order matches submission order. `pytest tests/test_matching_engine.py`.

### US-3: Researcher Analyzes Trader Performance
> "As a researcher, I want to compare MeanReversion vs Momentum bot performance, so I can understand which strategy works in trending vs. reverting markets."

**Acceptance**: Run simulation with both bots. Export trade history CSV. Compute Sharpe for each. Verify values are reasonable (not NaN, within expected range).

### US-4: Developer Extends Trader Class
> "As a developer, I want to add a new arbitrage bot, so I can study cross-strategy interactions."

**Acceptance**: Subclass `Trader`. Implement `on_market_data()` callback. Plug into simulation. Verify no existing code breaks.

### US-5: Interviewer Reviews Architecture
> "As an interviewer, I want to review the code structure and design decisions, so I can assess engineering quality."

**Acceptance**: README shows clear module boundaries. Architecture.md shows clean diagram. Key files have docstrings explaining *why*, not just *what*.

---

## 8. Future Extensions (V2)

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Avellaneda-Stoikov MM | P1 | Medium | Replace heuristic MM with formula-based |
| Multi-instrument simulation | P2 | High | Multiple correlated assets |
| IOC/FOK order types | P1 | Low | Add flags to Order dataclass |
| Stop-loss orders | P2 | Low | Add trigger logic |
| Realistic order arrival (Poisson) | P1 | Medium | Replace fixed-rate with stochastic |
| Volume-weighted spread | P2 | Low | Use book depth to compute VWAP spread |
| Persistence layer (JSON) | P2 | Low | Export/import simulation state |
| Web dashboard (terminal-based) | P2 | Medium | Rich console output with `rich` library |
| VPIN adverse selection detection | P2 | Medium | Implement VPIN metric from literature |

---

## 9. Verification Plan

Each requirement maps to a specific test:

| Requirement | Test File | Test Name Pattern |
|-------------|-----------|-------------------|
| FR-1.1 to FR-1.9 | `test_orderbook.py` | `test_orderbook_*` |
| FR-2.1 to FR-2.7 | `test_matching_engine.py` | `test_matching_*` |
| FR-3.1 to FR-3.7 | `test_exchange.py` | `test_exchange_*` |
| FR-4.1 to FR-4.8 | `test_simulation.py` | `test_simulation_*` |
| FR-5.1 to FR-5.6 | `test_traders.py` | `test_bot_*` |
| FR-6.1 to FR-6.6 | `test_market_maker.py` | `test_mm_*` |
| FR-7.1 to FR-7.9 | `test_analytics.py` | `test_analytics_*` |
| NFR-4 coverage | `pytest --cov` | `coverage report` |
| NFR-7 ruff | `ruff check` | `ruff report` |
