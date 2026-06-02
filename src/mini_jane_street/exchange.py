"""Exchange — central coordinator routing orders to the matching engine."""

from __future__ import annotations

import uuid
from decimal import Decimal

from mini_jane_street.entities import (
    Fill,
    MarketData,
    Order,
    OrderStatus,
    OrderType,
    Side,
    SubmitResult,
)
from mini_jane_street.orderbook import OrderBook


class Exchange:
    """
    Central exchange coordinator.

    Manages the order book, routes orders through the matching engine,
    tracks open orders, and provides market data.
    """

    def __init__(
        self,
        tick_size: Decimal = Decimal("0.01"),
        initial_mid: Decimal | None = None,
    ) -> None:
        self._tick_size = tick_size
        self._order_book = OrderBook(tick_size=tick_size)
        self._open_orders: dict[str, Order] = {}
        self._trades: list[Fill] = []
        self._current_time: float = 0.0
        self._mid_price = initial_mid if initial_mid is not None else Decimal("100.00")
        self._trader_order_ids: dict[str, set[str]] = {}  # trader_id -> set of their order_ids

    @property
    def current_time(self) -> float:
        return self._current_time

    @current_time.setter
    def current_time(self, value: float) -> None:
        self._current_time = value

    def _snap_price(self, price: Decimal) -> Decimal:
        return (price / self._tick_size).quantize(1) * self._tick_size

    def submit_order(
        self,
        trader_id: str,
        side: Side,
        price: Decimal | None,
        quantity: int,
        order_type: OrderType = OrderType.LIMIT,
    ) -> SubmitResult:
        # Prefix order ID with trader_id so SimulationEngine can route fills
        order_id = f"{trader_id}-{uuid.uuid4()}"
        timestamp = self._current_time
        snapped_price = self._snap_price(price) if price is not None else Decimal("0")

        # Reject non-positive prices as a safety guard
        if order_type == OrderType.LIMIT and snapped_price <= 0:
            return SubmitResult(
                fills=[],
                rest_order=None,
                status=OrderStatus.REJECTED,
                message=f"Price must be positive, got {snapped_price}",
            )

        order = Order(
            order_id=order_id,
            trader_id=trader_id,
            side=side,
            price=snapped_price,
            quantity=quantity,
            filled_qty=0,
            timestamp=timestamp,
            order_type=order_type,
            status=OrderStatus.NEW,
        )

        # Route to matching engine
        if order_type == OrderType.LIMIT:
            fills = self._order_book.add_order(order)
        elif order_type == OrderType.MARKET:
            fills = self._order_book.add_order(order)
        else:
            return SubmitResult(
                fills=[], rest_order=None,
                status=OrderStatus.REJECTED,
                message=f"Unsupported order type: {order_type}",
            )

        self._trades.extend(fills)

        # Sync _open_orders: any resting order that was fully matched is no longer
        # in the orderbook. Remove stale entries so fill routing works correctly.
        resting_ids = self._order_book._resting_order_ids()
        stale = [oid for oid in self._open_orders if oid not in resting_ids]
        for oid in stale:
            del self._open_orders[oid]
            # NOTE: do NOT remove from _trader_order_ids — those IDs are needed
            # for fill routing even after the resting order is fully consumed.

        # Track all order IDs by trader (persists even after full fill/removal)
        self._trader_order_ids.setdefault(trader_id, set()).add(order_id)

        # Determine remaining qty from fills
        total_filled = sum(f.quantity for f in fills)
        remaining = quantity - total_filled

        # Build the rest order (Exchange tracks its own version for reference)
        rest_order: Order | None = None
        if remaining > 0:
            rest_order = Order(
                order_id=order_id,
                trader_id=trader_id,
                side=side,
                price=snapped_price,
                quantity=quantity,
                filled_qty=total_filled,
                timestamp=timestamp,
                order_type=order_type,
                status=OrderStatus.PARTIALLY_FILLED if remaining < quantity else OrderStatus.NEW,
            )
            self._open_orders[order_id] = rest_order
            # NOTE: OrderBook.rest_order was already called by _match_limit_order
            # for unfilled limit orders. Do NOT call it again here.
        # Determine status
        if remaining == quantity:
            # No fills at all
            if order_type == OrderType.MARKET:
                status = OrderStatus.REJECTED
                msg = "No liquidity available"
            else:
                status = OrderStatus.NEW
                msg = "Order resting in book"
        elif remaining == 0:
            status = OrderStatus.FILLED
            msg = "Order fully filled"
        else:
            status = OrderStatus.PARTIALLY_FILLED
            msg = f"Partially filled: {total_filled}/{quantity}"

        return SubmitResult(
            fills=list(fills),
            rest_order=rest_order,
            status=status,
            message=msg,
        )

    def cancel_order(self, order_id: str) -> bool:
        """Cancel an open order. Returns True if cancelled."""
        if order_id not in self._open_orders:
            return False

        cancelled = self._order_book.cancel_order(order_id)
        if cancelled:
            order = self._open_orders[order_id]
            trader = order.trader_id
            del self._open_orders[order_id]
            self._trader_order_ids.get(trader, set()).discard(order_id)
            return True
        return False

    def cancel_all_for_trader(self, trader_id: str) -> int:
        """Cancel all open orders for a trader. Returns count of cancelled orders."""
        to_cancel = [
            oid for oid, order in self._open_orders.items()
            if order.trader_id == trader_id
        ]
        count = 0
        for oid in to_cancel:
            if self._order_book.cancel_order(oid):
                del self._open_orders[oid]
                count += 1
        return count

    def get_market_data(self) -> MarketData:
        """Return current market data snapshot."""
        return self._order_book.get_market_data(self._current_time)

    def update_mid_price(self, mid: Decimal) -> None:
        """Update the current mid price (called by simulation engine)."""
        self._mid_price = mid

    @property
    def mid_price(self) -> Decimal:
        return self._mid_price

    @property
    def trades(self) -> list[Fill]:
        """Return all historical fills."""
        return list(self._trades)

    @property
    def open_orders(self) -> dict[str, Order]:
        """Return all open orders by ID."""
        return dict(self._open_orders)

    @property
    def order_book(self) -> OrderBook:
        """Return the underlying order book (read-only access)."""
        return self._order_book

    def __repr__(self) -> str:
        md = self.get_market_data()
        return (
            f"Exchange(mid={md.mid_price}, best_bid={md.best_bid}, "
            f"best_ask={md.best_ask}, open_orders={len(self._open_orders)}, "
            f"total_trades={len(self._trades)})"
        )
