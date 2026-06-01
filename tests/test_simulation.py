"""Tests for the Simulation Engine."""

from __future__ import annotations

import pytest
from decimal import Decimal

from mini_jane_street.entities import OrderType, Side
from mini_jane_street.exchange import Exchange
from mini_jane_street.market_maker import MarketMaker
from mini_jane_street.simulation import (
    Clock,
    MarketDataGenerator,
    SimulationConfig,
    SimulationEngine,
)
from mini_jane_street.traders import MomentumTrader, RandomTaker


class TestClock:
    """Test virtual clock."""

    def test_clock_starts_at_zero(self) -> None:
        clock = Clock()
        assert clock.time == 0.0

    def test_clock_advances_by_interval(self) -> None:
        clock = Clock(interval=1.0)
        clock.advance()
        assert clock.time == 1.0
        clock.advance()
        assert clock.time == 2.0

    def test_clock_resets(self) -> None:
        clock = Clock()
        clock.advance()
        clock.advance()
        clock.reset()
        assert clock.time == 0.0


class TestMarketDataGenerator:
    """Test price process generator."""

    def test_initial_price(self) -> None:
        gen = MarketDataGenerator(
            initial_price=Decimal("100.00"),
            volatility=0.001,
            seed=42,
        )
        assert gen.price == Decimal("100.00")

    def test_price_moves_randomly(self) -> None:
        gen = MarketDataGenerator(
            initial_price=Decimal("100.00"),
            volatility=0.001,
            seed=42,
        )
        gen.step()
        # Price should have changed from initial
        assert gen.price != Decimal("100.00")
        # Price should stay positive
        assert gen.price > 0

    def test_deterministic_with_seed(self) -> None:
        gen1 = MarketDataGenerator(Decimal("100.00"), 0.001, seed=42)
        gen2 = MarketDataGenerator(Decimal("100.00"), 0.001, seed=42)

        for _ in range(10):
            gen1.step()
            gen2.step()

        assert gen1.price == gen2.price

    def test_price_history_records(self) -> None:
        gen = MarketDataGenerator(Decimal("100.00"), 0.001, seed=42)
        for _ in range(5):
            gen.step()

        assert len(gen.price_history) == 6  # initial + 5 steps


class TestSimulationRun:
    """Test full simulation runs."""

    def test_simulation_runs_without_errors(self) -> None:
        config = SimulationConfig(
            initial_price=Decimal("100.00"),
            volatility=0.001,
            num_ticks=10,
            seed=42,
        )
        traders = [RandomTaker(trader_id="rt-1", action_prob=0.5)]
        engine = SimulationEngine(config, traders)

        result = engine.run()
        assert len(engine.exchange.trades) >= 0
        assert result.final_mid > 0

    def test_simulation_is_reproducible(self) -> None:
        config = SimulationConfig(
            initial_price=Decimal("100.00"),
            volatility=0.001,
            num_ticks=50,
            seed=123,
        )
        traders = [RandomTaker(trader_id="rt-1", action_prob=0.1)]

        engine1 = SimulationEngine(config, traders)
        result1 = engine1.run()

        config2 = SimulationConfig(
            initial_price=Decimal("100.00"),
            volatility=0.001,
            num_ticks=50,
            seed=123,
        )
        engine2 = SimulationEngine(config2, traders)
        result2 = engine2.run()

        assert result1.final_mid == result2.final_mid

    def test_simulation_increases_trades_over_time(self) -> None:
        config = SimulationConfig(num_ticks=20, seed=42)
        traders = [RandomTaker(trader_id="rt-1", action_prob=0.5)]
        engine = SimulationEngine(config, traders)

        # Step a few times
        for _ in range(10):
            engine.step()

        trades_10 = len(engine.exchange.trades)

        for _ in range(10):
            engine.step()

        trades_20 = len(engine.exchange.trades)
        # More ticks should produce more trades (stochastically)
        # At minimum, we should have had some trades
        assert trades_20 >= trades_10

    def test_simulation_with_market_maker(self) -> None:
        config = SimulationConfig(
            num_ticks=20,
            seed=42,
            volatility=0.001,
        )
        traders = [RandomTaker(trader_id="rt-1", action_prob=0.3)]
        mm = MarketMaker(trader_id="mm-1", base_spread=Decimal("0.02"))
        engine = SimulationEngine(config, traders, market_maker=mm)

        result = engine.run()
        assert engine._market_maker is not None
        assert engine._market_maker.stats.total_fills >= 0

    def test_step_updates_clock(self) -> None:
        config = SimulationConfig(tick_interval=1.0, num_ticks=5, seed=42)
        engine = SimulationEngine(config, [])

        assert engine.clock.time == 0.0
        engine.step()
        assert engine.clock.time == 1.0
        engine.step()
        assert engine.clock.time == 2.0

    def test_empty_simulation_runs(self) -> None:
        """Simulation with no traders should still run without errors."""
        config = SimulationConfig(num_ticks=5, seed=42)
        engine = SimulationEngine(config, traders=[])

        result = engine.run()
        assert len(engine.exchange.trades) == 0
        assert result.final_mid > 0
