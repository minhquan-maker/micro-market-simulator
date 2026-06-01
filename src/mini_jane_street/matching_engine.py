"""Matching Engine with price-time priority (FIFO) order matching."""

from __future__ import annotations

from sortedcontainers import SortedDict

from mini_jane_street.entities import Fill, Order, OrderStatus, OrderType, Side
from mini_jane_street.orderbook import OrderBook


class MatchingEngine:
    """
    Pure matching engine that processes orders against an order book.

    Takes the current book state and an incoming order, returns fills.
    The caller (Exchange) is responsible for applying the fills to the book.
    """

    @staticmethod
    def process_limit_order(order: Order, book: OrderBook) -> tuple[list[Fill], Order | None]:
        fills: list[Fill] = []
        remaining = order.remaining_qty

        if order.side == Side.BUY:
            fills, remaining = MatchingEngine._match_against_book(
                order, book._ask_book, remaining,
            )
        else:
            fills, remaining = MatchingEngine._match_against_book(
                order, book._bid_book, remaining,
            )

        rest_order = None
        if remaining > 0:
            rest_order = Order(
                order_id=order.order_id,
                trader_id=order.trader_id,
                side=order.side,
                price=order.price,
                quantity=order.quantity,
                filled_qty=order.quantity - remaining,
                timestamp=order.timestamp,
                order_type=order.order_type,
                status=(
                    OrderStatus.NEW
                    if remaining == order.quantity
                    else OrderStatus.PARTIALLY_FILLED
                    if remaining < order.quantity
                    else OrderStatus.FILLED
                ),
            )

        return fills, rest_order

    @staticmethod
    def process_market_order(order: Order, book: OrderBook) -> tuple[list[Fill], Order | None]:
        fills: list[Fill] = []
        remaining = order.remaining_qty

        if order.side == Side.BUY:
            fills, remaining = MatchingEngine._match_against_book(
                order, book._ask_book, remaining,
            )
        else:
            fills, remaining = MatchingEngine._match_against_book(
                order, book._bid_book, remaining,
            )

        rest_order = None
        if remaining > 0:
            rest_order = Order(
                order_id=order.order_id,
                trader_id=order.trader_id,
                side=order.side,
                price=order.price,
                quantity=order.quantity,
                filled_qty=order.quantity - remaining,
                timestamp=order.timestamp,
                order_type=order.order_type,
                status=OrderStatus.REJECTED,
            )

        return fills, rest_order

    @staticmethod
    def _match_against_book(
        order: Order,
        book_side: SortedDict,
        remaining: int,
    ) -> tuple[list[Fill], int]:
        fills: list[Fill] = []
        remaining_to_fill = remaining

        while remaining_to_fill > 0 and len(book_side) > 0:
            best_price = next(iter(book_side))
            level = book_side[best_price]

            if not level.is_empty():
                front = level.peek_front()
                if front is None:
                    break

                should_match = (
                    (order.side == Side.BUY and best_price <= order.price)
                    or (order.side == Side.SELL and best_price >= order.price)
                    or order.order_type == OrderType.MARKET
                )
                if not should_match:
                    break

                fill_qty = min(remaining_to_fill, front.remaining_qty)
                fill = Fill(
                    order_id=order.order_id,
                    counterparty_id=front.order_id,
                    price=best_price,
                    quantity=fill_qty,
                    timestamp=order.timestamp,
                    side=order.side,
                )
                fills.append(fill)
                remaining_to_fill -= fill_qty

                if fill_qty == front.remaining_qty:
                    level.pop_front()
                else:
                    break
            else:
                del book_side[best_price]

        return fills, remaining_to_fill
