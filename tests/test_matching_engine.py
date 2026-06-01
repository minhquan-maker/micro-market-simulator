"""Tests for the Matching Engine (via OrderBook integration)."""

from __future__ import annotations

import pytest
from decimal import Decimal

from mini_jane_street.entities import Order, OrderType, Side
from mini_jane_street.orderbook import OrderBook


def make_limit(
    order_id: str,
    trader_id: str,
    side: Side,
    price: Decimal,
    quantity: int,
    timestamp: float = 1.0,
) -> Order:
    return Order(
        order_id=order_id,
        trader_id=trader_id,
        side=side,
        price=price,
        quantity=quantity,
        filled_qty=0,
        timestamp=timestamp,
        order_type=OrderType.LIMIT,
    )


def make_market(
    order_id: str,
    trader_id: str,
    side: Side,
    quantity: int,
    timestamp: float = 1.0,
) -> Order:
    return Order(
        order_id=order_id,
        trader_id=trader_id,
        side=side,
        price=Decimal("0"),
        quantity=quantity,
        filled_qty=0,
        timestamp=timestamp,
        order_type=OrderType.MARKET,
    )


def add_sell(book: OrderBook, order_id: str, price: Decimal, qty: int, ts: float = 1.0) -> None:
    book.add_order(make_limit(order_id, "t_seller", Side.SELL, price, qty, ts))


def add_buy(book: OrderBook, order_id: str, price: Decimal, qty: int, ts: float = 1.0) -> None:
    book.add_order(make_limit(order_id, "t_buyer", Side.BUY, price, qty, ts))


class TestLimitOrderMatching:
    """Test limit order processing through the order book."""

    def test_buy_hits_best_ask(self) -> None:
        book = OrderBook()
        add_sell(book, "ask1", Decimal("100.00"), 10)

        fills = book.add_order(make_limit("buy1", "t2", Side.BUY, Decimal("100.00"), 5, 2.0))

        assert len(fills) == 1
        assert fills[0].price == Decimal("100.00")
        assert fills[0].quantity == 5
        assert fills[0].counterparty_id == "ask1"

    def test_buy_at_higher_price_hits_multiple_levels(self) -> None:
        book = OrderBook()
        add_sell(book, "ask1", Decimal("100.00"), 5)
        add_sell(book, "ask2", Decimal("101.00"), 5)
        add_sell(book, "ask3", Decimal("102.00"), 5)

        fills = book.add_order(make_limit("buy1", "t2", Side.BUY, Decimal("102.00"), 10, 10.0))

        assert len(fills) == 2
        assert fills[0].quantity == 5
        assert fills[1].quantity == 5

    def test_partial_fill_rests(self) -> None:
        book = OrderBook()
        add_sell(book, "ask1", Decimal("100.00"), 5)

        fills = book.add_order(make_limit("buy1", "t2", Side.BUY, Decimal("100.00"), 10, 2.0))

        assert len(fills) == 1
        assert fills[0].quantity == 5
        # Remaining 5 units of buy should rest in book
        bid = book.get_best_bid()
        assert bid is not None
        assert bid[1] == 5

    def test_buy_below_best_ask_does_not_cross(self) -> None:
        book = OrderBook()
        add_sell(book, "ask1", Decimal("100.00"), 5)

        fills = book.add_order(make_limit("buy1", "t2", Side.BUY, Decimal("99.00"), 5, 2.0))

        assert len(fills) == 0
        bid = book.get_best_bid()
        assert bid is not None
        assert bid[0] == Decimal("99.00")

    def test_sell_rests_when_price_too_high(self) -> None:
        book = OrderBook()
        book.add_order(make_limit("bid1", "t2", Side.BUY, Decimal("99.00"), 10, 1.0))

        fills = book.add_order(make_limit("sell1", "t1", Side.SELL, Decimal("100.00"), 10, 2.0))

        assert len(fills) == 0
        assert book.get_best_ask() is not None


class TestMarketOrderMatching:
    """Test market order processing."""

    def test_market_buy_sweeps_book(self) -> None:
        book = OrderBook()
        add_sell(book, "ask1", Decimal("100.00"), 5)
        add_sell(book, "ask2", Decimal("101.00"), 5)

        fills = book.add_order(make_market("m1", "t2", Side.BUY, 10, 10.0))

        assert len(fills) == 2
        assert fills[0].quantity == 5
        assert fills[1].quantity == 5

    def test_market_order_on_empty_book_rejected(self) -> None:
        book = OrderBook()
        fills = book.add_order(make_market("m1", "t1", Side.BUY, 10))
        assert len(fills) == 0

    def test_market_buy_partial_on_empty_book(self) -> None:
        book = OrderBook()
        fills = book.add_order(make_market("m1", "t1", Side.BUY, 10))
        assert len(fills) == 0


class TestFIFOMatching:
    """Test FIFO within price levels."""

    def test_fifo_within_price_level(self) -> None:
        book = OrderBook()
        # Three sellers at same price, FIFO order
        add_sell(book, "sell-0", Decimal("100.00"), 5, 1.0)
        add_sell(book, "sell-1", Decimal("100.00"), 5, 2.0)
        add_sell(book, "sell-2", Decimal("100.00"), 5, 3.0)

        # Buy 12 — should get 5 from each of first two sellers
        fills = book.add_order(make_limit("buy1", "t2", Side.BUY, Decimal("100.00"), 12, 4.0))

        assert len(fills) == 3
        assert fills[0].counterparty_id == "sell-0"
        assert fills[1].counterparty_id == "sell-1"
        assert fills[2].counterparty_id == "sell-2"
        assert fills[0].quantity == 5
        assert fills[1].quantity == 5
        assert fills[2].quantity == 2


class TestPartialFills:
    """Test partial fill scenarios."""

    def test_order_partially_filled_rests_preserving_priority(self) -> None:
        book = OrderBook()
        add_sell(book, "sell-1", Decimal("100.00"), 5)

        fills = book.add_order(make_limit("buy1", "t1", Side.BUY, Decimal("100.00"), 3, 2.0))

        # Fully filled
        assert len(fills) == 1
        assert fills[0].quantity == 3
        # sell-1 now has 2 remaining
        assert book.get_best_ask() is not None
        assert book.get_best_ask()[1] == 2

    def test_large_order_sweeps_multiple_levels(self) -> None:
        book = OrderBook()
        add_sell(book, "ask0", Decimal("100.00"), 5)
        add_sell(book, "ask1", Decimal("101.00"), 5)
        add_sell(book, "ask2", Decimal("102.00"), 5)
        add_sell(book, "ask3", Decimal("103.00"), 5)

        fills = book.add_order(make_limit("buy1", "t2", Side.BUY, Decimal("105.00"), 15, 10.0))

        assert len(fills) == 3
        assert sum(f.quantity for f in fills) == 15
        assert book.get_best_ask() is not None
        assert book.get_best_ask()[0] == Decimal("103.00")


class TestEdgeCases:
    """Edge case tests."""

    def test_same_price_opposite_sides_both_match(self) -> None:
        book = OrderBook()
        book.add_order(make_limit("sell-1", "t2", Side.SELL, Decimal("100.00"), 5, 1.0))
        fills = book.add_order(make_limit("buy-1", "t1", Side.BUY, Decimal("100.00"), 5, 2.0))
        assert len(fills) == 1

    def test_buy_at_limit_does_not_cross_spread(self) -> None:
        book = OrderBook()
        book.add_order(make_limit("bid-1", "t2", Side.BUY, Decimal("100.00"), 10, 1.0))

        fills = book.add_order(make_limit("bid-2", "t1", Side.BUY, Decimal("100.00"), 5, 2.0))
        # Same-side orders don't cross
        assert len(fills) == 0
        assert book.get_best_bid() is not None

    def test_tick_size_rounds_prices(self) -> None:
        book = OrderBook(tick_size=Decimal("0.05"))
        book.add_order(make_limit("bid-1", "t1", Side.BUY, Decimal("100.03"), 10, 1.0))
        # 100.03 snapped to 100.05
        assert book.get_best_bid() is not None
        assert book.get_best_bid()[0] == Decimal("100.05")
