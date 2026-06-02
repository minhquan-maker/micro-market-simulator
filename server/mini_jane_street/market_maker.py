"""Market Maker Agent with inventory-adjusted spread quoting."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import TYPE_CHECKING

from mini_jane_street.entities import Fill, MarketData, OrderType, Side

if TYPE_CHECKING:
    from mini_jane_street.exchange import Exchange


@dataclass
class MMStats:
    """Market maker performance statistics."""

    realized_pnl: Decimal = Decimal("0")
    unrealized_pnl: Decimal = Decimal("0")
    gross_spread_earned: Decimal = Decimal("0")
    num_buy_fills: int = 0
    num_sell_fills: int = 0
    inventory: int = 0
    max_inventory: int = 0
    bid_quotes: int = 0
    ask_quotes: int = 0
    spreads_captured: list[Decimal] = field(default_factory=list)
    adverse_fills: int = 0
    total_fills: int = 0


class MarketMaker:
    """
    Inventory-adjusted market maker.

    Posts bid and ask quotes around the mid price, adjusting spread based on:
    1. Inventory: widens quotes when holding large positions
    2. Time: widens spread as simulation approaches end of day

    Simplified version of Avellaneda-Stoikov model.
    """

    def __init__(
        self,
        trader_id: str | None = None,
        base_spread: Decimal = Decimal("0.02"),
        inventory_alpha: Decimal = Decimal("0.001"),
        time_warp: Decimal = Decimal("0.005"),
        max_inventory: int = 100,
        quote_size: int = 10,
    ) -> None:
        self.trader_id = trader_id or f"mm-{uuid.uuid4().hex[:8]}"
        self.base_spread = base_spread
        self.inventory_alpha = inventory_alpha
        self.time_warp = time_warp
        self.max_inventory = max_inventory
        self.quote_size = quote_size

        self._position: int = 0
        self._avg_cost: Decimal = Decimal("0")
        self._realized_pnl: Decimal = Decimal("0")
        self._open_bid_id: str | None = None
        self._open_ask_id: str | None = None
        self._last_mid: Decimal | None = None
        self._last_mid_timestamp: float = 0.0
        self._stats: MMStats = MMStats()

    @property
    def position(self) -> int:
        return self._position

    @property
    def realized_pnl(self) -> Decimal:
        return self._realized_pnl

    @property
    def stats(self) -> MMStats:
        self._stats.inventory = self._position
        self._stats.max_inventory = max(self._stats.max_inventory, abs(self._position))
        self._stats.unrealized_pnl = (
            Decimal(self._position) * (self._last_mid - self._avg_cost)
            if self._last_mid and self._position != 0
            else Decimal("0")
        )
        self._stats.realized_pnl = self._realized_pnl
        return self._stats

    def on_market_data(self, data: MarketData, exchange: Exchange) -> None:
        """Post and adjust quotes based on current market data."""
        # Use the exchange's latent mid price, which is set even when the book
        # is empty. Falls back to the MarketData snapshot mid price.
        mid = exchange.mid_price if exchange.mid_price > 0 else data.mid_price
        if mid == 0:
            return

        self._last_mid = mid

        inventory_adj = self.inventory_alpha * Decimal(abs(self._position))
        spread = self.base_spread + Decimal("2") * inventory_adj

        half_spread = spread / 2

        bid_price = mid - half_spread
        ask_price = mid + half_spread

        # Ensure quotes are always positive and at least one tick above zero.
        # When mid is very close to the price floor, half_spread can exceed mid,
        # making bid_price <= 0. Clamp to tick_size minimum.
        min_price = Decimal("0.01")
        bid_price = max(min_price, bid_price)
        ask_price = max(min_price, ask_price)

        # Cancel all existing quotes for this MM. Using cancel_all_for_trader
        # avoids issues when previous orders were fully filled and their IDs
        # are no longer in the Exchange's _open_orders.
        exchange.cancel_all_for_trader(self.trader_id)
        self._open_bid_id = None
        self._open_ask_id = None

        if abs(self._position) < self.max_inventory:
            bid_result = exchange.submit_order(
                trader_id=self.trader_id,
                side=Side.BUY,
                price=bid_price,
                quantity=self.quote_size,
                order_type=OrderType.LIMIT,
            )
            if bid_result.status.value in ("NEW", "PARTIALLY_FILLED"):
                self._open_bid_id = bid_result.rest_order.order_id if bid_result.rest_order else None
                self._stats.bid_quotes += 1

            ask_result = exchange.submit_order(
                trader_id=self.trader_id,
                side=Side.SELL,
                price=ask_price,
                quantity=self.quote_size,
                order_type=OrderType.LIMIT,
            )
            if ask_result.status.value in ("NEW", "PARTIALLY_FILLED"):
                self._open_ask_id = ask_result.rest_order.order_id if ask_result.rest_order else None
                self._stats.ask_quotes += 1

    def on_fill(self, fill: Fill) -> None:
        """Process a fill and update inventory + PnL."""
        self._stats.total_fills += 1

        spread_captured = (
            abs(fill.price - self._last_mid) if self._last_mid else Decimal("0")
        )
        self._stats.spreads_captured.append(spread_captured)

        if fill.side == Side.BUY:
            self._stats.num_buy_fills += 1
            self._position += fill.quantity

            cost = fill.price * fill.quantity
            if self._position == fill.quantity:
                self._avg_cost = fill.price
            elif self._position > 0:
                prev_cost = self._avg_cost * (self._position - fill.quantity)
                self._avg_cost = (prev_cost + cost) / self._position

        else:
            self._stats.num_sell_fills += 1
            self._position -= fill.quantity

            pnl = (fill.price - self._avg_cost) * fill.quantity
            self._realized_pnl += pnl
            self._stats.gross_spread_earned += pnl

            if self._position == 0:
                self._avg_cost = Decimal("0")
