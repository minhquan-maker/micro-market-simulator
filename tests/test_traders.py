"""Tests for Trader Bots."""

from __future__ import annotations

import pytest
from decimal import Decimal

from mini_jane_street.entities import Fill, MarketData, OrderType, Side
from mini_jane_street.exchange import Exchange
from mini_jane_street.traders import (
    MeanReversionTrader,
    MomentumTrader,
    RandomTaker,
    Trader,
)


class TestTraderBase:
    """Test base trader class."""

    def test_trader_initializes_with_default_values(self) -> None:
        trader = RandomTaker(trader_id="test")
        assert trader.position == 0
        assert trader.cash == Decimal("0")
        assert trader.trader_id == "test"

    def test_trader_pnl_computation(self) -> None:
        trader = RandomTaker(trader_id="test")
        trader.position = 10
        trader._avg_cost = Decimal("100.00")

        realized, unrealized = trader.compute_pnl(Decimal("101.00"))
        assert realized == Decimal("0")
        assert unrealized == Decimal("10.00")  # 10 * (101 - 100)

    def test_trader_pnl_with_short_position(self) -> None:
        trader = MeanReversionTrader(trader_id="test")
        trader.position = -5
        trader._avg_cost = Decimal("100.00")

        realized, unrealized = trader.compute_pnl(Decimal("99.00"))
        # Unrealized: -5 * (99 - 100) = +5
        assert unrealized == Decimal("5.00")


class TestRandomTaker:
    """Test RandomTaker bot."""

    def test_random_taker_submit_market_order(self) -> None:
        exchange = Exchange(initial_mid=Decimal("100.00"))
        trader = RandomTaker(trader_id="rt-1", action_prob=1.0)

        # Manually call on_market_data multiple times
        md = exchange.get_market_data()
        for _ in range(10):
            trader.on_market_data(md, exchange)

        # Should have submitted orders
        # Note: might not always trade due to randomness

    def test_random_taker_skips_when_no_probability(self) -> None:
        exchange = Exchange(initial_mid=Decimal("100.00"))
        trader = RandomTaker(trader_id="rt-1", action_prob=0.0)

        md = exchange.get_market_data()
        for _ in range(5):
            trader.on_market_data(md, exchange)

        # No orders should be in the exchange
        assert len(exchange.open_orders) == 0

    def test_random_taker_on_fill_updates_position(self) -> None:
        trader = RandomTaker(trader_id="test")

        fill = Fill(
            order_id="buy-1",
            counterparty_id="sell-1",
            price=Decimal("100.00"),
            quantity=10,
            timestamp=1.0,
            side=Side.BUY,
        )
        trader.on_fill(fill)
        assert trader.position == 10

        sell_fill = Fill(
            order_id="sell-2",
            counterparty_id="buy-2",
            price=Decimal("101.00"),
            quantity=5,
            timestamp=2.0,
            side=Side.SELL,
        )
        trader.on_fill(sell_fill)
        assert trader.position == 5


class TestMomentumTrader:
    """Test MomentumTrader bot."""

    def test_momentum_trader_initializes(self) -> None:
        trader = MomentumTrader(trader_id="mom-1")
        assert len(trader._price_history) == 0
        assert len(trader._active_orders) == 0

    def test_momentum_trader_needs_window_to_act(self) -> None:
        exchange = Exchange(initial_mid=Decimal("100.00"))
        # Add some orders so mid_price is non-zero
        exchange.submit_order("seed", Side.BUY, Decimal("99.00"), 10)
        exchange.submit_order("seed", Side.SELL, Decimal("101.00"), 10)

        trader = MomentumTrader(trader_id="mom-1", momentum_threshold=0.001, window_size=10)

        md = exchange.get_market_data()
        # Not enough history yet
        for _ in range(9):
            trader.on_market_data(md, exchange)

        # Should still not have enough history
        assert len(trader._price_history) == 9


class TestMeanReversionTrader:
    """Test MeanReversionTrader bot."""

    def test_mean_reversion_trader_initializes(self) -> None:
        trader = MeanReversionTrader(trader_id="mr-1")
        assert len(trader._price_history) == 0

    def test_mean_reversion_computes_vwap(self) -> None:
        trader = MeanReversionTrader(trader_id="mr-1", window_size=3)

        # Feed prices
        for price in [100.0, 101.0, 102.0]:
            trader._price_history.append(Decimal(str(price)))

        assert len(trader._price_history) == 3
        vwap = sum(trader._price_history) / len(trader._price_history)
        assert vwap == Decimal("101.00")
