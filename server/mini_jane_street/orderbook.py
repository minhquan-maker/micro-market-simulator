"""Limit Order Book with price-time priority (FIFO)."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from decimal import Decimal

from sortedcontainers import SortedDict

from mini_jane_street.entities import (
    Fill,
    MarketData,
    Order,
    OrderStatus,
    OrderType,
    Side,
)


@dataclass
class PriceLevel:
    """A price level containing a queue of orders at a specific price."""

    price: Decimal
    orders: deque[Order] = field(default_factory=deque)

    def add_order(self, order: Order) -> None:
        self.orders.append(order)

    def peek_front(self) -> Order | None:
        return self.orders[0] if self.orders else None

    def pop_front(self) -> Order | None:
        try:
            return self.orders.popleft()
        except IndexError:
            return None

    def is_empty(self) -> bool:
        return len(self.orders) == 0

    @property
    def total_qty(self) -> int:
        return sum(o.remaining_qty for o in self.orders)

    def remove_order(self, order_id: str) -> Order | None:
        for i, order in enumerate(self.orders):
            if order.order_id == order_id:
                del self.orders[i]
                return order
        return None


class OrderBook:
    """
    A limit order book with price-time priority (FIFO) matching.

    Both bid and ask sides use SortedDict sorted ascending by price.
    Best bid = highest price in bid_book (use reversed iter)
    Best ask = lowest price in ask_book (use first key)
    """

    def __init__(self, tick_size: Decimal = Decimal("0.01")) -> None:
        self._tick_size = tick_size
        self._bid_book: SortedDict[Decimal, PriceLevel] = SortedDict()
        self._ask_book: SortedDict[Decimal, PriceLevel] = SortedDict()
        self._fills: list[Fill] = []

    def _snap_price(self, price: Decimal) -> Decimal:
        return (price / self._tick_size).quantize(1) * self._tick_size

    def add_order(self, order: Order) -> list[Fill]:
        """Add an order. Returns list of fills."""
        if order.order_type == OrderType.MARKET:
            return self._match_market_order(order)
        return self._match_limit_order(order)

    def _match_limit_order(self, order: Order) -> list[Fill]:
        fills: list[Fill] = []
        remaining = order.remaining_qty
        book_side = self._ask_book if order.side == Side.BUY else self._bid_book

        while remaining > 0 and len(book_side) > 0:
            best_price = next(iter(book_side))
            level = book_side[best_price]

            # Check if price crosses
            if order.side == Side.BUY and best_price > order.price:
                break
            if order.side == Side.SELL and best_price < order.price:
                break

            # Fill from this level
            while remaining > 0 and not level.is_empty():
                resting = level.peek_front()
                if resting is None:
                    break

                fill_qty = min(remaining, resting.remaining_qty)
                fill = Fill(
                    order_id=order.order_id,
                    counterparty_id=resting.order_id,
                    price=best_price,
                    quantity=fill_qty,
                    timestamp=order.timestamp,
                    side=order.side,
                )
                fills.append(fill)
                self._fills.append(fill)
                remaining -= fill_qty

                if fill_qty == resting.remaining_qty:
                    level.pop_front()
                else:
                    # Partial fill: update the resting order's filled_qty
                    level.pop_front()  # remove old order
                    updated = Order(
                        order_id=resting.order_id,
                        trader_id=resting.trader_id,
                        side=resting.side,
                        price=resting.price,
                        quantity=resting.quantity,
                        filled_qty=resting.filled_qty + fill_qty,
                        timestamp=resting.timestamp,
                        order_type=resting.order_type,
                        status=OrderStatus.PARTIALLY_FILLED,
                    )
                    level.orders.appendleft(updated)

            # Remove empty price level
            if level.is_empty():
                del book_side[best_price]

        # Remaining (unfilled) portion goes into the book
        if remaining > 0:
            self.rest_order(
                Order(
                    order_id=order.order_id,
                    trader_id=order.trader_id,
                    side=order.side,
                    price=order.price,
                    quantity=order.quantity,
                    filled_qty=order.quantity - remaining,
                    timestamp=order.timestamp,
                    order_type=order.order_type,
                    status=OrderStatus.PARTIALLY_FILLED
                    if remaining < order.quantity
                    else OrderStatus.NEW,
                )
            )

        return fills

    def _match_market_order(self, order: Order) -> list[Fill]:
        fills: list[Fill] = []
        remaining = order.remaining_qty
        book_side = self._ask_book if order.side == Side.BUY else self._bid_book

        while remaining > 0 and len(book_side) > 0:
            best_price = next(iter(book_side))
            level = book_side[best_price]

            while remaining > 0 and not level.is_empty():
                resting = level.peek_front()
                if resting is None:
                    break

                fill_qty = min(remaining, resting.remaining_qty)
                fill = Fill(
                    order_id=order.order_id,
                    counterparty_id=resting.order_id,
                    price=best_price,
                    quantity=fill_qty,
                    timestamp=order.timestamp,
                    side=order.side,
                )
                fills.append(fill)
                self._fills.append(fill)
                remaining -= fill_qty

                if fill_qty == resting.remaining_qty:
                    level.pop_front()
                    if level.is_empty():
                        del book_side[best_price]
                        # book_side was modified; re-fetch level for next iteration
                        if remaining > 0 and len(book_side) > 0:
                            best_price = next(iter(book_side))
                            level = book_side[best_price]
                        else:
                            break

        return fills

    def rest_order(self, order: Order) -> None:
        """Place an order into the book without matching. Replaces if order_id already exists."""
        snapped = self._snap_price(order.price)
        book = self._bid_book if order.side == Side.BUY else self._ask_book

        if snapped in book:
            level = book[snapped]
            # Replace existing order with same ID, or add new
            for i, existing in enumerate(level.orders):
                if existing.order_id == order.order_id:
                    level.orders[i] = order
                    break
            else:
                level.orders.append(order)
        else:
            level = PriceLevel(price=snapped)
            level.orders.append(order)
            book[snapped] = level

    def cancel_order(self, order_id: str) -> bool:
        """Cancel an order by ID. Checks both sides of the book."""
        for book in (self._bid_book, self._ask_book):
            for price, level in list(book.items()):
                removed = level.remove_order(order_id)
                if removed is not None:
                    if level.is_empty():
                        del book[price]
                    return True
        return False

    def get_best_bid(self) -> tuple[Decimal, int] | None:
        if not self._bid_book:
            return None
        price = next(reversed(self._bid_book))
        return (price, self._bid_book[price].total_qty)

    def get_best_ask(self) -> tuple[Decimal, int] | None:
        if not self._ask_book:
            return None
        price = next(iter(self._ask_book))
        return (price, self._ask_book[price].total_qty)

    def get_mid_price(self) -> Decimal | None:
        best_bid = self.get_best_bid()
        best_ask = self.get_best_ask()
        if best_bid is None or best_ask is None:
            return None
        return (best_bid[0] + best_ask[0]) / 2

    def get_spread(self) -> Decimal | None:
        best_bid = self.get_best_bid()
        best_ask = self.get_best_ask()
        if best_bid is None or best_ask is None:
            return None
        return best_ask[0] - best_bid[0]

    def get_depth(
        self, levels: int = 5
    ) -> tuple[list[tuple[Decimal, int]], list[tuple[Decimal, int]]]:
        bid_depth: list[tuple[Decimal, int]] = []
        ask_depth: list[tuple[Decimal, int]] = []

        bid_prices = list(reversed(list(self._bid_book.keys())))[:levels]
        for price in bid_prices:
            bid_depth.append((price, self._bid_book[price].total_qty))

        ask_prices = list(self._ask_book.keys())[:levels]
        for price in ask_prices:
            ask_depth.append((price, self._ask_book[price].total_qty))

        return (bid_depth, ask_depth)

    def get_market_data(self, timestamp: float) -> MarketData:
        best_bid = self.get_best_bid()
        best_ask = self.get_best_ask()
        mid = self.get_mid_price()
        bid_depth, ask_depth = self.get_depth(10)

        return MarketData(
            timestamp=timestamp,
            mid_price=mid if mid is not None else Decimal("0"),
            best_bid=best_bid[0] if best_bid else Decimal("0"),
            best_bid_qty=best_bid[1] if best_bid else 0,
            best_ask=best_ask[0] if best_ask else Decimal("0"),
            best_ask_qty=best_ask[1] if best_ask else 0,
            bid_depth=bid_depth,
            ask_depth=ask_depth,
        )

    @property
    def trades(self) -> list[Fill]:
        return list(self._fills)

    def _resting_order_ids(self) -> set[str]:
        """Return IDs of all orders currently resting in the book. Internal use only."""
        ids: set[str] = set()
        for level in list(self._bid_book.values()) + list(self._ask_book.values()):
            for o in level.orders:
                ids.add(o.order_id)
        return ids
