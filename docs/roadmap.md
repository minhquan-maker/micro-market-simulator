# Phase 4 — Roadmap: Mini Jane Street Simulator

## Project Overview

**Total estimated effort**: 4-6 days of focused implementation
**Quality bar**: Production-ready, interview-quality, >= 80% test coverage

---

## Milestone 1: Core Order Book

**Duration**: 0.5 days
**Goal**: A correct, tested, well-designed Limit Order Book.

### Deliverables

- [x] `src/mini_jane_street/entities.py` — All data types: `Order`, `Fill`, `Side`, `OrderType`, `OrderStatus`, `MarketData`, `SubmitResult`, `PerformanceReport`
- [x] `src/mini_jane_street/orderbook.py` — `OrderBook` class with full API
- [x] `tests/test_orderbook.py` — 20+ unit tests covering all operations

### Dependencies
- None (this is the foundation)

### Test Coverage Target
- All `OrderBook` public methods: 100%
- `entities.py`: 100% (dataclass creation + immutability)

### Exit Criteria
- `pytest tests/test_orderbook.py -v` passes
- `ruff check src/mini_jane_street/orderbook.py src/mini_jane_street/entities.py` — 0 violations
- FIFO verified: orders at same price fill in submission order
- Partial fills work: remaining quantity rests correctly

---

## Milestone 2: Matching Engine

**Duration**: 0.5 days
**Goal**: A correct, testable matching engine with price-time priority.

### Deliverables

- [x] `src/mini_jane_street/matching_engine.py` — `MatchingEngine` class
- [x] `tests/test_matching_engine.py` — Edge case tests

### Dependencies
- Milestone 1 (`entities.py`, `orderbook.py`)

### Test Coverage Target
- `process_limit_order`: 100%
- `process_market_order`: 100%
- Edge cases: empty book, partial fills, same-timestamp orders

### Exit Criteria
- `pytest tests/test_matching_engine.py -v` passes
- FIFO test passes with 10+ orders
- Market order on empty book returns empty fills list

---

## Milestone 3: Exchange Layer

**Duration**: 0.5 days
**Goal**: Central coordinator that wires matching engine + order book.

### Deliverables

- [x] `src/mini_jane_street/exchange.py` — `Exchange` class
- [x] `tests/test_exchange.py` — Integration tests

### Dependencies
- Milestone 1 + 2

### Test Coverage Target
- Full order lifecycle: submit → match/cancel → state update

### Exit Criteria
- `pytest tests/test_exchange.py -v` passes
- Exchange maintains consistent state across multiple order submissions
- `get_market_data()` returns correct snapshot

---

## Milestone 4: Trader Bots

**Duration**: 0.5 days
**Goal**: Three heuristic trader bots + base class.

### Deliverables

- [x] `src/mini_jane_street/traders.py` — `Trader` base class + 3 implementations
- [x] `tests/test_traders.py` — Bot behavior tests

### Dependencies
- Milestone 3 (`Exchange`, `MarketData`)

### Test Coverage Target
- Each bot: instantiation + one complete decision cycle
- Bot PnL computation

### Exit Criteria
- `pytest tests/test_traders.py -v` passes
- Each bot makes decisions (doesn't crash on `on_market_data`)
- All three bots can participate in a simulation

---

## Milestone 5: Market Maker

**Duration**: 0.5 days
**Goal**: Inventory-adjusted market maker agent.

### Deliverables

- [x] `src/mini_jane_street/market_maker.py` — `MarketMaker` class
- [x] `tests/test_market_maker.py` — Spread capture, inventory tests

### Dependencies
- Milestone 4

### Test Coverage Target
- Quote posting, cancellation, fill reception, inventory tracking

### Exit Criteria
- `pytest tests/test_market_maker.py -v` passes
- Market maker posts bid and ask every tick
- Inventory adjusts quote prices as expected

---

## Milestone 6: Simulation Engine

**Duration**: 1.0 days
**Goal**: End-to-end simulation runner with market data generator.

### Deliverables

- [x] `src/mini_jane_street/simulation.py` — `SimulationEngine`, `Clock`, `SimulationConfig`
- [x] `src/mini_jane_street/config.py` — Config dataclasses
- [x] `tests/test_simulation.py` — Full simulation run tests
- [x] `scripts/run_simulation.py` — CLI entry point

### Dependencies
- Milestone 1-5

### Test Coverage Target
- Simulation step, run completion, market data generation

### Exit Criteria
- `pytest tests/test_simulation.py -v` passes
- 1000-tick simulation completes in < 5 seconds
- Simulation is reproducible with fixed seed

---

## Milestone 7: Analytics

**Duration**: 0.5 days
**Goal**: Performance metrics computation and visualization.

### Deliverables

- [x] `src/mini_jane_street/analytics.py` — `Analytics` class + `PerformanceReport`
- [x] `tests/test_analytics.py` — Analytical correctness tests (verify formulas)
- [x] `notebooks/analysis.ipynb` — Post-simulation analysis notebook

### Dependencies
- Milestone 6

### Test Coverage Target
- Sharpe, drawdown, win rate, profit factor: formula-correctness tests
- CSV/JSON export

### Exit Criteria
- `pytest tests/test_analytics.py -v` passes
- Sharpe of constant-returns strategy = 0 (boundary test)
- Drawdown of monotonically-increasing equity = 0
- All metrics exportable to JSON

---

## Milestone 8: Testing & Polish

**Duration**: 0.5 days
**Goal**: Reach >= 80% coverage, fix all linting, finalize.

### Deliverables

- [x] `pyproject.toml` — Project configuration
- [x] `pytest.ini` or `pyproject.toml` test config
- [x] `ruff.toml` — Linter configuration
- [x] Coverage report: >= 80% (81% achieved)

### Dependencies
- All previous milestones

### Exit Criteria
- `pytest --cov=src --cov-report=term-missing` — >= 80% coverage
- `ruff check src/` — 0 violations
- `mypy src/` — 0 errors (if time permits)

---

## Milestone 9: Documentation

**Duration**: 0.5 days
**Goal**: README, architecture overview, interview talking points.

### Deliverables

- [x] `README.md` — Full project documentation
- [x] Verify all docs in `docs/` are complete

### Dependencies
- All previous milestones

### Exit Criteria
- README explains how to run simulation
- README has architecture section
- README has "Lessons Learned" section
- All 5 docs files present and complete

---

## Timeline Summary

```
Day 1 Morning:   Milestone 1 (Order Book) + Milestone 2 (Matching Engine)
Day 1 Afternoon: Milestone 3 (Exchange) + Milestone 4 (Trader Bots)
Day 2 Morning:   Milestone 5 (Market Maker) + Milestone 6 (Simulation)
Day 2 Afternoon: Milestone 7 (Analytics) + Milestone 8 (Testing & Polish)
Day 3:          Milestone 9 (Documentation) + Review & Polish
```

---

## Critical Path

```
Milestone 1 → Milestone 2 → Milestone 3 → Milestone 6 → Milestone 8
      ↓            ↓              ↓             ↓
 Milestone 4 ←    ←          Milestone 5 ←     ←
      ↓                                      ←
 Milestone 7 → Milestone 9 (Documentation)
```

**Longest chain**: Milestone 1 → 2 → 3 → 6 → 8 (~2.5 days)

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Matching engine FIFO bug | Medium | High | Extensive edge case tests in Milestone 2 |
| Decimal precision issues | Low | High | Use `Decimal` everywhere; no `float` for prices |
| Circular imports | Low | Medium | Zero-dep `entities.py`; check early |
| Performance issues | Low | Low | Single-threaded, in-memory; already fast enough |
| MM earns negative spread | Low | Medium | Test MM vs. RandomTaker early; adjust parameters |

---

## Success Criteria for Full Project

- [x] `pytest` — all tests green (98 passed)
- [x] `ruff` — 0 violations
- [x] Coverage — >= 80% (81% achieved)
- [x] 1000-tick simulation — < 5 seconds
- [x] `python scripts/run_simulation.py` — produces JSON report + plots
- [x] README — complete, with interview talking points
- [x] 5 docs — all present and substantive
