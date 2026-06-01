"""Core data types for the Mini Jane Street Simulator."""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum

# Tick size for price precision
PRICE_PRECISION = Decimal("0.01")


class Side(Enum):
    """Side of a trade or order."""

    BUY = "BUY"
    SELL = "SELL"

    def opposite(self) -> Side:
        """Return the opposite side."""
        return Side.SELL if self is Side.BUY else Side.BUY


class OrderType(Enum):
    """Type of order."""

    LIMIT = "LIMIT"
    MARKET = "MARKET"


class OrderStatus(Enum):
    """Status of an order."""

    NEW = "NEW"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


@dataclass(frozen=True)
class Order:
    """An order in the book. Frozen for immutability."""

    order_id: str
    trader_id: str
    side: Side
    price: Decimal
    quantity: int
    filled_qty: int = 0
    timestamp: float = 0.0
    order_type: OrderType = OrderType.LIMIT
    status: OrderStatus = OrderStatus.NEW

    @property
    def remaining_qty(self) -> int:
        """Quantity not yet filled."""
        return self.quantity - self.filled_qty

    @property
    def is_active(self) -> bool:
        """Whether the order is still in the book."""
        return self.status in (OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED)


@dataclass(frozen=True)
class Fill:
    """A fill (trade) event. Immutable."""
    order_id: str
    counterparty_id: str
    price: Decimal
    quantity: int
    timestamp: float
    side: Side


@dataclass
class MarketData:
    """Current state of the market."""
    timestamp: float
    mid_price: Decimal
    best_bid: Decimal
    best_bid_qty: int
    best_ask: Decimal
    best_ask_qty: int
    bid_depth: list[tuple[Decimal, int]] = field(default_factory=list)
    ask_depth: list[tuple[Decimal, int]] = field(default_factory=list)


@dataclass
class SubmitResult:
    """Result of an order submission."""
    fills: list[Fill]
    rest_order: Order | None
    status: OrderStatus
    message: str = ""


@dataclass(frozen=True)
class PerformanceReport:
    """Performance metrics for a strategy."""
    realized_pnl: Decimal
    unrealized_pnl: Decimal
    total_pnl: Decimal
    sharpe_ratio: float
    max_drawdown: Decimal
    max_drawdown_pct: float
    win_rate: float
    profit_factor: float
    num_trades: int
    avg_trade_pnl: Decimal
    spread_capture: Decimal | None = None
    adverse_selection_ratio: float | None = None
