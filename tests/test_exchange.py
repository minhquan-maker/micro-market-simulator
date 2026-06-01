"""Tests for the Exchange."""

from __future__ import annotations

import pytest
from decimal import Decimal

from mini_jane_street.entities import OrderStatus, OrderType, Side
from mini_jane_street.exchange import Exchange


class TestOrderSubmission:
    """Test order submission to exchange."""

    def test_submit_limit_buy(self, exchange: Exchange) -> None:
        result = exchange.submit_order(
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )
        assert result.status in (OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED)
        assert result.rest_order is not None or len(result.fills) > 0

    def test_submit_limit_sell(self, exchange: Exchange) -> None:
        result = exchange.submit_order(
            trader_id="t1",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )
        assert result.status in (OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED)

    def test_submit_market_order_on_empty_book_rejected(self, exchange: Exchange) -> None:
        result = exchange.submit_order(
            trader_id="t1",
            side=Side.BUY,
            price=None,
            quantity=10,
            order_type=OrderType.MARKET,
        )
        assert result.status == OrderStatus.REJECTED
        assert len(result.fills) == 0

    def test_order_ids_are_unique(self, exchange: Exchange) -> None:
        results = []
        for i in range(5):
            result = exchange.submit_order(
                trader_id="t1",
                side=Side.BUY,
                price=Decimal("99.00"),
                quantity=10,
                order_type=OrderType.LIMIT,
            )
            if result.rest_order:
                results.append(result.rest_order.order_id)
            for fill in result.fills:
                results.append(fill.order_id)

        assert len(results) == len(set(results)), "Order IDs should be unique"


class TestOrderLifecycle:
    """Test complete order lifecycle."""

    def test_limit_order_rests_and_matches(self, exchange: Exchange) -> None:
        # Place sell at 100
        exchange.submit_order(
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )

        # Buy at 100 — should match
        result = exchange.submit_order(
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )

        assert result.status == OrderStatus.FILLED
        assert len(result.fills) == 1

    def test_partial_fill_lifecycle(self, exchange: Exchange) -> None:
        # Sell only 5
        exchange.submit_order(
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=5,
            order_type=OrderType.LIMIT,
        )

        # Buy for 10 — should partially fill
        result = exchange.submit_order(
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )

        assert result.status == OrderStatus.PARTIALLY_FILLED
        assert len(result.fills) == 1
        assert result.fills[0].quantity == 5
        # Rest order should be in open orders
        assert result.rest_order is not None
        assert result.rest_order.remaining_qty == 5

    def test_cancel_resting_order(self, exchange: Exchange) -> None:
        # Place a resting order
        exchange.submit_order(
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("99.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )

        open_orders_before = len(exchange.open_orders)
        assert open_orders_before == 1

        # Cancel it
        order_id = next(iter(exchange.open_orders.keys()))
        cancelled = exchange.cancel_order(order_id)
        assert cancelled is True
        assert len(exchange.open_orders) == open_orders_before - 1


class TestMarketData:
    """Test market data snapshots."""

    def test_market_data_updates_after_trade(self, exchange: Exchange) -> None:
        exchange.submit_order(
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )

        md = exchange.get_market_data()
        assert md.best_ask == Decimal("100.00")
        assert md.best_bid == Decimal("0")  # No bids yet

    def test_mid_price_after_both_sides_quoted(self, exchange: Exchange) -> None:
        exchange.submit_order(
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("100.02"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )
        exchange.submit_order(
            trader_id="t3",
            side=Side.BUY,
            price=Decimal("99.98"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )

        md = exchange.get_market_data()
        assert md.mid_price == Decimal("100.00")
        assert md.best_bid == Decimal("99.98")
        assert md.best_ask == Decimal("100.02")
        assert md.mid_price == (md.best_bid + md.best_ask) / 2


class TestTrades:
    """Test trade recording."""

    def test_trades_recorded_after_match(self, exchange: Exchange) -> None:
        assert len(exchange.trades) == 0

        exchange.submit_order(
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )
        exchange.submit_order(
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            order_type=OrderType.LIMIT,
        )

        assert len(exchange.trades) == 1
        assert exchange.trades[0].price == Decimal("100.00")
        assert exchange.trades[0].quantity == 10


class TestPriceSnap:
    """Test price snapping to tick size."""

    def test_exchange_snaps_prices_to_tick_size(self, exchange: Exchange) -> None:
        exchange._tick_size = Decimal("0.05")

        result = exchange.submit_order(
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("99.03"),  # Should snap to 99.05
            quantity=10,
            order_type=OrderType.LIMIT,
        )

        if result.rest_order:
            assert result.rest_order.price == Decimal("99.05")

    def test_mid_price_updates_on_simulation_tick(self, exchange: Exchange) -> None:
        exchange.update_mid_price(Decimal("101.00"))
        exchange.current_time = 10.0

        md = exchange.get_market_data()
        assert md.timestamp == 10.0


class TestCancelAllForTrader:
    """Test cancel_all_for_trader method."""

    def test_cancel_all_for_trader_cancels_multiple_orders(self, exchange: Exchange) -> None:
        exchange.submit_order("trader-a", Side.BUY, Decimal("99.00"), 5, OrderType.LIMIT)
        exchange.submit_order("trader-a", Side.SELL, Decimal("101.00"), 5, OrderType.LIMIT)
        exchange.submit_order("trader-a", Side.BUY, Decimal("98.00"), 5, OrderType.LIMIT)

        assert len(exchange.open_orders) == 3
        assert len(exchange._trader_order_ids.get("trader-a", set())) == 3

        count = exchange.cancel_all_for_trader("trader-a")
        assert count == 3
        assert len(exchange.open_orders) == 0

    def test_cancel_all_for_trader_only_affects_target_trader(self, exchange: Exchange) -> None:
        exchange.submit_order("trader-a", Side.BUY, Decimal("99.00"), 5, OrderType.LIMIT)
        exchange.submit_order("trader-b", Side.SELL, Decimal("101.00"), 5, OrderType.LIMIT)

        exchange.cancel_all_for_trader("trader-a")

        assert len(exchange.open_orders) == 1
        assert "trader-b" in [o.trader_id for o in exchange.open_orders.values()]

    def test_trader_order_ids_tracked_across_full_fill(self, exchange: Exchange) -> None:
        # Place a resting order that will be fully matched
        exchange.submit_order("t2", Side.SELL, Decimal("100.00"), 5, OrderType.LIMIT)

        # Verify the order is tracked
        order_id = next(iter(exchange.open_orders.keys()))
        assert "t2" in exchange._trader_order_ids
        assert order_id in exchange._trader_order_ids["t2"]

        # Fully match it with a buy order
        result = exchange.submit_order("t1", Side.BUY, Decimal("100.00"), 5, OrderType.LIMIT)
        assert result.status == OrderStatus.FILLED

        # Order should be removed from open_orders but remain in _trader_order_ids
        # for fill routing purposes
        assert order_id not in exchange.open_orders
        assert order_id in exchange._trader_order_ids["t2"]

