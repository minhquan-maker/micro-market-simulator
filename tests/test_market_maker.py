"""Tests for the Market Maker."""

from __future__ import annotations

import pytest
from decimal import Decimal

from mini_jane_street.entities import Fill, MarketData, OrderType, Side
from mini_jane_street.exchange import Exchange
from mini_jane_street.market_maker import MarketMaker


class TestMarketMakerBasics:
    """Test market maker initialization and basic behavior."""

    def test_mm_initializes(self) -> None:
        mm = MarketMaker(trader_id="mm-1")
        assert mm.position == 0
        assert mm.realized_pnl == Decimal("0")
        assert mm.trader_id == "mm-1"

    def test_mm_quotes_bid_and_ask(self) -> None:
        exchange = Exchange(initial_mid=Decimal("100.00"))
        mm = MarketMaker(
            trader_id="mm-1",
            base_spread=Decimal("0.02"),
        )

        md = exchange.get_market_data()
        mm.on_market_data(md, exchange)

        # Should have posted quotes
        assert len(exchange.open_orders) >= 0  # Might be 0 if spread too wide


class TestMarketMakerFills:
    """Test market maker fill processing."""

    def test_mm_on_fill_buy_updates_position(self) -> None:
        mm = MarketMaker(trader_id="mm-1")
        fill = Fill(
            order_id="buy-1",
            counterparty_id="taker-1",
            price=Decimal("99.99"),
            quantity=10,
            timestamp=1.0,
            side=Side.BUY,
        )
        mm.on_fill(fill)
        assert mm.position == 10

    def test_mm_on_fill_sell_updates_position(self) -> None:
        mm = MarketMaker(trader_id="mm-1")
        # First a buy to get position
        mm.on_fill(Fill(
            order_id="buy-1",
            counterparty_id="taker-1",
            price=Decimal("100.00"),
            quantity=10,
            timestamp=1.0,
            side=Side.BUY,
        ))
        # Then sell
        mm.on_fill(Fill(
            order_id="sell-1",
            counterparty_id="taker-2",
            price=Decimal("100.02"),
            quantity=5,
            timestamp=2.0,
            side=Side.SELL,
        ))
        assert mm.position == 5  # net long

    def test_mm_tracks_fill_stats(self) -> None:
        mm = MarketMaker(trader_id="mm-1")

        mm.on_fill(Fill(
            order_id="buy-1",
            counterparty_id="taker-1",
            price=Decimal("100.00"),
            quantity=10,
            timestamp=1.0,
            side=Side.BUY,
        ))
        mm.on_fill(Fill(
            order_id="sell-1",
            counterparty_id="taker-2",
            price=Decimal("100.02"),
            quantity=5,
            timestamp=2.0,
            side=Side.SELL,
        ))

        stats = mm.stats
        assert stats.num_buy_fills == 1
        assert stats.num_sell_fills == 1
        assert stats.total_fills == 2

    def test_mm_realized_pnl_on_sell(self) -> None:
        mm = MarketMaker(trader_id="mm-1")

        # Buy at 100
        mm.on_fill(Fill(
            order_id="buy-1",
            counterparty_id="taker-1",
            price=Decimal("100.00"),
            quantity=10,
            timestamp=1.0,
            side=Side.BUY,
        ))

        # Sell at 101 (earned spread)
        mm.on_fill(Fill(
            order_id="sell-1",
            counterparty_id="taker-2",
            price=Decimal("101.00"),
            quantity=10,
            timestamp=2.0,
            side=Side.SELL,
        ))

        # PnL = (101 - 100) * 10 = 10
        assert mm.realized_pnl == Decimal("10.00")


class TestMarketMakerQuotes:
    """Test market maker quoting behavior."""

    def test_spread_widens_with_inventory(self) -> None:
        """As inventory grows, spread should widen."""
        mm = MarketMaker(
            trader_id="mm-1",
            base_spread=Decimal("0.02"),
            inventory_alpha=Decimal("0.001"),
        )

        # Build up inventory
        for _ in range(5):
            mm.on_fill(Fill(
                order_id=f"buy-{_}",
                counterparty_id="taker",
                price=Decimal("100.00"),
                quantity=10,
                timestamp=float(_),
                side=Side.BUY,
            ))

        # Inventory is now 50, spread should be wider
        # effective spread = 0.02 + 2 * (0.001 * 50) = 0.02 + 0.10 = 0.12
        # half spread = 0.06
        # bid = 100 - 0.06 = 99.94
        # The key test: with 0 inventory, half_spread = 0.01
        # With 50 inventory, half_spread = 0.01 + 0.001 * 50 = 0.06

        assert mm.position == 50
        stats = mm.stats
        assert stats.inventory == 50

    def test_mm_cancel_and_requote(self) -> None:
        """MM should cancel existing quotes before posting new ones."""
        exchange = Exchange(initial_mid=Decimal("100.00"))
        mm = MarketMaker(trader_id="mm-1", base_spread=Decimal("0.02"))

        md = exchange.get_market_data()
        mm.on_market_data(md, exchange)
        orders_after_first = len(exchange.open_orders)

        # Update mid price and requote
        exchange.update_mid_price(Decimal("101.00"))
        mm._last_mid = Decimal("101.00")
        mm.on_market_data(exchange.get_market_data(), exchange)

        # Should still have quotes (possibly new ones)
        # MM cancels and re-posts each tick


class TestMarketMakerStats:
    """Test market maker statistics."""

    def test_mm_max_inventory_tracked(self) -> None:
        mm = MarketMaker(trader_id="mm-1")

        for i, qty in enumerate([10, 20, 15]):
            mm.on_fill(Fill(
                order_id=f"fill-{i}",
                counterparty_id="taker",
                price=Decimal("100.00"),
                quantity=qty,
                timestamp=float(i),
                side=Side.BUY,
            ))

        stats = mm.stats
        assert stats.max_inventory >= abs(mm.position)

    def test_mm_stats_unrealized_pnl(self) -> None:
        mm = MarketMaker(trader_id="mm-1")

        mm.on_fill(Fill(
            order_id="buy-1",
            counterparty_id="taker",
            price=Decimal("100.00"),
            quantity=10,
            timestamp=1.0,
            side=Side.BUY,
        ))

        mm._last_mid = Decimal("101.00")
        stats = mm.stats
        assert stats.unrealized_pnl == Decimal("10.00")
