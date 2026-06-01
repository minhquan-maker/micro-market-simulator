"""Trader bots with heuristic strategies."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import TYPE_CHECKING

from mini_jane_street.entities import Fill, MarketData, OrderType, Side

if TYPE_CHECKING:
    from mini_jane_street.exchange import Exchange


@dataclass
class TraderStats:
    """Per-trader performance statistics."""

    realized_pnl: Decimal = Decimal("0")
    num_buys: int = 0
    num_sells: int = 0
    gross_volume: Decimal = Decimal("0")
    realized_trades: list[Fill] = field(default_factory=list)


class Trader(ABC):
    """Abstract base class for all trader bots."""

    def __init__(self, trader_id: str | None = None) -> None:
        self.trader_id = trader_id or str(uuid.uuid4())[:8]
        self.position: int = 0
        self.cash: Decimal = Decimal("0")
        self._avg_cost: Decimal = Decimal("0")
        self._stats: TraderStats = TraderStats()
        self._order_history: list[str] = []

    def on_fill(self, fill: Fill) -> None:
        """Process a fill event and update position/PnL."""
        self._stats.realized_trades.append(fill)

        if fill.side == Side.BUY:
            self._stats.num_buys += 1
            self.position += fill.quantity
            cost = fill.price * fill.quantity
            self.cash -= cost
            self._stats.gross_volume += cost

            if self.position == 0:
                self._avg_cost = fill.price
            else:
                total_cost = self._avg_cost * self.position + cost
                self._avg_cost = total_cost / Decimal(self.position)

        else:
            self._stats.num_sells += 1
            self.position -= fill.quantity
            proceeds = fill.price * fill.quantity
            self.cash += proceeds
            self._stats.gross_volume += proceeds

            pnl = (fill.price - self._avg_cost) * Decimal(fill.quantity)
            self._stats.realized_pnl += pnl

    def compute_pnl(self, current_mid: Decimal) -> tuple[Decimal, Decimal]:
        """Return (realized_pnl, unrealized_pnl) given current mid price."""
        unrealized = Decimal(self.position) * (current_mid - self._avg_cost)
        return (self._stats.realized_pnl, unrealized)

    @abstractmethod
    def on_market_data(self, data: MarketData, exchange: Exchange) -> None:
        """React to market data. Called every simulation tick."""
        raise NotImplementedError

    def submit_limit(
        self,
        exchange: Exchange,
        side: Side,
        price: Decimal,
        quantity: int,
    ) -> str:
        """Submit a limit order via the exchange."""
        exchange.submit_order(
            trader_id=self.trader_id,
            side=side,
            price=price,
            quantity=quantity,
            order_type=OrderType.LIMIT,
        )
        return self.trader_id

    def submit_market(
        self,
        exchange: Exchange,
        side: Side,
        quantity: int,
    ) -> str:
        """Submit a market order via the exchange."""
        exchange.submit_order(
            trader_id=self.trader_id,
            side=side,
            price=None,
            quantity=quantity,
            order_type=OrderType.MARKET,
        )
        return self.trader_id

    @property
    def stats(self) -> TraderStats:
        return self._stats


class RandomTaker(Trader):
    """Random liquidity taker — submits market orders with some probability."""

    def __init__(
        self,
        trader_id: str | None = None,
        action_prob: float = 0.05,
        min_qty: int = 1,
        max_qty: int = 20,
    ) -> None:
        super().__init__(trader_id)
        self.action_prob = action_prob
        self.min_qty = min_qty
        self.max_qty = max_qty

    def on_market_data(self, data: MarketData, exchange: Exchange) -> None:
        import random

        if random.random() > self.action_prob:
            return
        if data.best_bid == 0 and data.best_ask == 0:
            return

        side = Side.BUY if random.random() > 0.5 else Side.SELL
        qty = random.randint(self.min_qty, self.max_qty)

        self.submit_market(exchange, side, qty)


class MomentumTrader(Trader):
    """Trend-following trader — buys on up moves, sells on down moves."""

    def __init__(
        self,
        trader_id: str | None = None,
        momentum_threshold: float = 0.001,
        window_size: int = 10,
        position_size: int = 5,
    ) -> None:
        super().__init__(trader_id)
        self.momentum_threshold = momentum_threshold
        self.window_size = window_size
        self.position_size = position_size
        self._price_history: list[Decimal] = []
        self._active_orders: set[str] = set()

    def on_market_data(self, data: MarketData, exchange: Exchange) -> None:
        if data.mid_price == 0:
            return

        self._price_history.append(data.mid_price)
        if len(self._price_history) > self.window_size:
            self._price_history.pop(0)

        if len(self._price_history) < self.window_size:
            return

        returns = (self._price_history[-1] - self._price_history[0]) / self._price_history[0]

        if returns > self.momentum_threshold:
            self.submit_limit(
                exchange, Side.BUY,
                data.best_ask + Decimal("0.01"),
                self.position_size,
            )
        elif returns < -self.momentum_threshold:
            self.submit_limit(
                exchange, Side.SELL,
                data.best_bid - Decimal("0.01"),
                self.position_size,
            )


class MeanReversionTrader(Trader):
    """Mean-reversion trader — buys when price is below VWAP, sells when above."""

    def __init__(
        self,
        trader_id: str | None = None,
        reversion_threshold: float = 0.002,
        window_size: int = 20,
        position_size: int = 5,
    ) -> None:
        super().__init__(trader_id)
        self.reversion_threshold = reversion_threshold
        self.window_size = window_size
        self.position_size = position_size
        self._price_history: list[Decimal] = []

    def on_market_data(self, data: MarketData, exchange: Exchange) -> None:
        if data.mid_price == 0:
            return

        self._price_history.append(data.mid_price)
        if len(self._price_history) > self.window_size:
            self._price_history.pop(0)

        if len(self._price_history) < self.window_size:
            return

        vwap = sum(self._price_history) / len(self._price_history)
        deviation = (data.mid_price - vwap) / vwap

        if deviation < -self.reversion_threshold:
            self.submit_limit(
                exchange, Side.BUY,
                data.best_bid,
                self.position_size,
            )
        elif deviation > self.reversion_threshold:
            self.submit_limit(
                exchange, Side.SELL,
                data.best_ask,
                self.position_size,
            )
