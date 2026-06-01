"""Additional integration tests to boost coverage."""

from __future__ import annotations

from decimal import Decimal

from mini_jane_street.entities import Order, OrderType, Side
from mini_jane_street.orderbook import OrderBook
from mini_jane_street.matching_engine import MatchingEngine


class TestMatchingEngineDirect:
    """Test MatchingEngine as a standalone module."""

    def test_process_limit_order_direct(self) -> None:
        book = OrderBook()
        book.add_order(
            Order("ask1", "t2", Side.SELL, Decimal("100.00"), 5, 0, 1.0, OrderType.LIMIT)
        )

        incoming = Order(
            "buy1", "t1", Side.BUY, Decimal("100.00"), 3, 0, 2.0, OrderType.LIMIT
        )
        fills, rest = MatchingEngine.process_limit_order(incoming, book)

        assert len(fills) == 1
        assert fills[0].quantity == 3
        assert rest is None  # fully filled

    def test_process_limit_order_rests(self) -> None:
        book = OrderBook()

        incoming = Order(
            "buy1", "t1", Side.BUY, Decimal("99.00"), 10, 0, 1.0, OrderType.LIMIT
        )
        fills, rest = MatchingEngine.process_limit_order(incoming, book)

        assert len(fills) == 0
        assert rest is not None
        assert rest.status.value == "NEW"

    def test_process_market_order_empty_book(self) -> None:
        book = OrderBook()
        incoming = Order(
            "mkt1", "t1", Side.BUY, Decimal("0"), 10, 0, 1.0, OrderType.MARKET
        )
        fills, rest = MatchingEngine.process_market_order(incoming, book)
        assert len(fills) == 0
        assert rest is not None
        assert rest.status.value == "REJECTED"

    def test_process_market_order_sweeps_book(self) -> None:
        book = OrderBook()
        book.add_order(
            Order("ask1", "t2", Side.SELL, Decimal("100.00"), 5, 0, 1.0, OrderType.LIMIT)
        )
        book.add_order(
            Order("ask2", "t2", Side.SELL, Decimal("101.00"), 5, 0, 2.0, OrderType.LIMIT)
        )

        incoming = Order(
            "mkt1", "t1", Side.BUY, Decimal("0"), 8, 0, 3.0, OrderType.MARKET
        )
        fills, rest = MatchingEngine.process_market_order(incoming, book)

        assert len(fills) == 2
        assert sum(f.quantity for f in fills) == 8

    def test_process_limit_order_sell_hits_bid(self) -> None:
        book = OrderBook()
        book.add_order(
            Order("bid1", "t2", Side.BUY, Decimal("100.00"), 10, 0, 1.0, OrderType.LIMIT)
        )

        incoming = Order(
            "sell1", "t1", Side.SELL, Decimal("100.00"), 5, 0, 2.0, OrderType.LIMIT
        )
        fills, rest = MatchingEngine.process_limit_order(incoming, book)

        assert len(fills) == 1
        assert fills[0].price == Decimal("100.00")
