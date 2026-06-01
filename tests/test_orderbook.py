"""Tests for the Limit Order Book."""

from __future__ import annotations

import pytest
from decimal import Decimal

from mini_jane_street.entities import Order, OrderType, Side
from mini_jane_street.orderbook import OrderBook


class TestOrderBookBasics:
    """Basic order book operations."""

    def test_empty_book_has_no_best_bid(self, empty_book: OrderBook) -> None:
        assert empty_book.get_best_bid() is None

    def test_empty_book_has_no_best_ask(self, empty_book: OrderBook) -> None:
        assert empty_book.get_best_ask() is None

    def test_empty_book_has_no_mid_price(self, empty_book: OrderBook) -> None:
        assert empty_book.get_mid_price() is None

    def test_empty_book_has_no_spread(self, empty_book: OrderBook) -> None:
        assert empty_book.get_spread() is None


class TestLimitOrderPlacement:
    """Test limit order addition."""

    def test_add_buy_limit_order_creates_bid_level(self, empty_book: OrderBook) -> None:
        order = Order(
            order_id="o1",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(order)
        bid = empty_book.get_best_bid()
        assert bid is not None
        assert bid[0] == Decimal("100.00")
        assert bid[1] == 10

    def test_add_sell_limit_order_creates_ask_level(self, empty_book: OrderBook) -> None:
        order = Order(
            order_id="o2",
            trader_id="t1",
            side=Side.SELL,
            price=Decimal("101.00"),
            quantity=5,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(order)
        ask = empty_book.get_best_ask()
        assert ask is not None
        assert ask[0] == Decimal("101.00")
        assert ask[1] == 5

    def test_multiple_orders_at_same_price_aggregate(self, empty_book: OrderBook) -> None:
        for i in range(3):
            order = Order(
                order_id=f"o{i}",
                trader_id="t1",
                side=Side.BUY,
                price=Decimal("100.00"),
                quantity=10,
                timestamp=float(i),
                order_type=OrderType.LIMIT,
            )
            empty_book.add_order(order)
        bid = empty_book.get_best_bid()
        assert bid is not None
        assert bid[1] == 30  # 3 x 10


class TestOrderMatching:
    """Test limit order matching."""

    def test_buy_order_matches_sell_at_same_price(self, empty_book: OrderBook) -> None:
        # Sell at 100 first
        sell = Order(
            order_id="sell-1",
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=10,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(sell)

        # Buy at 100 — should match immediately
        buy = Order(
            order_id="buy-1",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            timestamp=2.0,
            order_type=OrderType.LIMIT,
        )
        fills = empty_book.add_order(buy)

        assert len(fills) == 1
        assert fills[0].price == Decimal("100.00")
        assert fills[0].quantity == 10
        assert fills[0].counterparty_id == "sell-1"

    def test_buy_order_partial_fill(self, empty_book: OrderBook) -> None:
        # Only 5 available on sell side
        sell = Order(
            order_id="sell-1",
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=5,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(sell)

        # Buy for 10
        buy = Order(
            order_id="buy-1",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            timestamp=2.0,
            order_type=OrderType.LIMIT,
        )
        fills = empty_book.add_order(buy)

        assert len(fills) == 1
        assert fills[0].quantity == 5
        # Remaining 5 should rest
        assert empty_book.get_best_bid() is not None
        assert empty_book.get_best_bid()[1] == 5

    def test_market_order_on_empty_book_returns_zero_fills(self, empty_book: OrderBook) -> None:
        market = Order(
            order_id="mkt-1",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("0"),
            quantity=10,
            timestamp=1.0,
            order_type=OrderType.MARKET,
        )
        fills = empty_book.add_order(market)
        assert len(fills) == 0

    def test_buy_order_only_matches_prices_at_or_below_limit(self, empty_book: OrderBook) -> None:
        # Best ask is 101
        sell = Order(
            order_id="sell-1",
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("101.00"),
            quantity=10,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(sell)

        # Buy at 100 (limit) — should NOT match (101 > 100)
        buy = Order(
            order_id="buy-1",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            timestamp=2.0,
            order_type=OrderType.LIMIT,
        )
        fills = empty_book.add_order(buy)
        assert len(fills) == 0
        # Buy order should rest at bid
        assert empty_book.get_best_bid() is not None

    def test_sell_order_only_matches_prices_at_or_above_limit(self, empty_book: OrderBook) -> None:
        # Best bid is 99
        buy_order = Order(
            order_id="bid-1",
            trader_id="t2",
            side=Side.BUY,
            price=Decimal("99.00"),
            quantity=10,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(buy_order)

        # Sell at 100 (limit) — should NOT match (99 < 100)
        sell = Order(
            order_id="sell-1",
            trader_id="t1",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=10,
            timestamp=2.0,
            order_type=OrderType.LIMIT,
        )
        fills = empty_book.add_order(sell)
        assert len(fills) == 0
        # Sell order should rest at ask
        assert empty_book.get_best_ask() is not None


class TestFIFO:
    """Test price-time priority (FIFO) matching."""

    def test_fifo_same_price_same_side(self, empty_book: OrderBook) -> None:
        """Orders at same price should fill in submission order (FIFO)."""
        # Two sell orders at same price, order-1 arrives first
        for i, ts in enumerate([1.0, 2.0]):
            order = Order(
                order_id=f"sell-{i}",
                trader_id="t2",
                side=Side.SELL,
                price=Decimal("100.00"),
                quantity=5,
                timestamp=ts,
                order_type=OrderType.LIMIT,
            )
            empty_book.add_order(order)

        # Buy order for 8 — should get 5 from sell-0, 3 from sell-1
        buy = Order(
            order_id="buy-1",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=8,
            timestamp=3.0,
            order_type=OrderType.LIMIT,
        )
        fills = empty_book.add_order(buy)

        assert len(fills) == 2
        assert fills[0].counterparty_id == "sell-0"
        assert fills[0].quantity == 5
        assert fills[1].counterparty_id == "sell-1"
        assert fills[1].quantity == 3

    def test_fifo_multiple_levels(self, empty_book: OrderBook) -> None:
        """Matching should sweep price levels correctly."""
        # Three levels of sells
        for i, price in enumerate([100.00, 100.01, 100.02]):
            order = Order(
                order_id=f"sell-{i}",
                trader_id="t2",
                side=Side.SELL,
                price=Decimal(str(price)),
                quantity=5,
                timestamp=float(i + 1),
                order_type=OrderType.LIMIT,
            )
            empty_book.add_order(order)

        # Buy for 12 — should get 5 @ 100.00, 5 @ 100.01, 2 @ 100.02
        buy = Order(
            order_id="buy-1",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.05"),
            quantity=12,
            timestamp=10.0,
            order_type=OrderType.LIMIT,
        )
        fills = empty_book.add_order(buy)

        assert len(fills) == 3
        assert fills[0].price == Decimal("100.00")
        assert fills[0].quantity == 5
        assert fills[1].price == Decimal("100.01")
        assert fills[1].quantity == 5
        assert fills[2].price == Decimal("100.02")
        assert fills[2].quantity == 2


class TestCancellation:
    """Test order cancellation."""

    def test_cancel_existing_order(self, empty_book: OrderBook) -> None:
        order = Order(
            order_id="cancel-me",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=10,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(order)
        assert empty_book.get_best_bid() is not None

        cancelled = empty_book.cancel_order("cancel-me")
        assert cancelled is True
        assert empty_book.get_best_bid() is None

    def test_cancel_nonexistent_order_returns_false(self, empty_book: OrderBook) -> None:
        assert empty_book.cancel_order("nonexistent") is False

    def test_cancel_partially_filled_order(self, empty_book: OrderBook) -> None:
        sell = Order(
            order_id="sell-1",
            trader_id="t2",
            side=Side.SELL,
            price=Decimal("100.00"),
            quantity=5,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(sell)

        # Partially fill
        buy = Order(
            order_id="buy-1",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("100.00"),
            quantity=3,
            timestamp=2.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(buy)

        # Cancel remaining
        cancelled = empty_book.cancel_order("sell-1")
        assert cancelled is True


class TestDepth:
    """Test order book depth queries."""

    def test_get_depth_multiple_levels(self, empty_book: OrderBook) -> None:
        # Add 4 bid levels: qty decreases as price increases
        for i, price in enumerate([100.03, 100.02, 100.01, 100.00]):
            order = Order(
                order_id=f"bid-{i}",
                trader_id="t1",
                side=Side.BUY,
                price=Decimal(str(price)),
                quantity=(4 - i) * 5,
                timestamp=float(i),
                order_type=OrderType.LIMIT,
            )
            empty_book.add_order(order)

        bid_depth, ask_depth = empty_book.get_depth(levels=3)
        assert len(bid_depth) == 3
        # get_depth returns descending by price, so highest price first
        assert bid_depth[0] == (Decimal("100.03"), 20)
        assert bid_depth[1] == (Decimal("100.02"), 15)
        assert bid_depth[2] == (Decimal("100.01"), 10)

    def test_spread_calculation(self, empty_book: OrderBook) -> None:
        Order(
            order_id="bid",
            trader_id="t1",
            side=Side.BUY,
            price=Decimal("99.98"),
            quantity=10,
            timestamp=1.0,
            order_type=OrderType.LIMIT,
        )
        empty_book.add_order(
            Order(
                order_id="bid",
                trader_id="t1",
                side=Side.BUY,
                price=Decimal("99.98"),
                quantity=10,
                timestamp=1.0,
                order_type=OrderType.LIMIT,
            )
        )
        empty_book.add_order(
            Order(
                order_id="ask",
                trader_id="t1",
                side=Side.SELL,
                price=Decimal("100.02"),
                quantity=10,
                timestamp=2.0,
                order_type=OrderType.LIMIT,
            )
        )

        spread = empty_book.get_spread()
        assert spread is not None
        assert spread == Decimal("0.04")

        mid = empty_book.get_mid_price()
        assert mid is not None
        assert mid == Decimal("100.00")


class TestMarketData:
    """Test market data snapshots."""

    def test_market_data_snapshot(self, empty_book: OrderBook) -> None:
        empty_book.add_order(
            Order(
                order_id="bid",
                trader_id="t1",
                side=Side.BUY,
                price=Decimal("99.98"),
                quantity=10,
                timestamp=1.0,
                order_type=OrderType.LIMIT,
            )
        )
        empty_book.add_order(
            Order(
                order_id="ask",
                trader_id="t1",
                side=Side.SELL,
                price=Decimal("100.02"),
                quantity=5,
                timestamp=2.0,
                order_type=OrderType.LIMIT,
            )
        )

        md = empty_book.get_market_data(timestamp=10.0)
        assert md.timestamp == 10.0
        assert md.mid_price == Decimal("100.00")
        assert md.best_bid == Decimal("99.98")
        assert md.best_ask == Decimal("100.02")


class TestTrades:
    """Test trade history."""

    def test_trades_recorded(self, empty_book: OrderBook) -> None:
        empty_book.add_order(
            Order(
                order_id="sell-1",
                trader_id="t2",
                side=Side.SELL,
                price=Decimal("100.00"),
                quantity=10,
                timestamp=1.0,
                order_type=OrderType.LIMIT,
            )
        )
        empty_book.add_order(
            Order(
                order_id="buy-1",
                trader_id="t1",
                side=Side.BUY,
                price=Decimal("100.00"),
                quantity=10,
                timestamp=2.0,
                order_type=OrderType.LIMIT,
            )
        )

        trades = empty_book.trades
        assert len(trades) == 1
        assert trades[0].order_id == "buy-1"
        assert trades[0].counterparty_id == "sell-1"
