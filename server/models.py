from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union
import uuid


@dataclass
class SimulationRequest:
    num_ticks: int = 200
    volatility: float = 0.5
    seed: Optional[int] = 42
    initial_price: float = 100.0


@dataclass
class SimulationRun:
    run_id: str
    config: SimulationRequest
    status: str = "pending"  # pending | running | complete | error
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    result: Optional[Dict[str, Any]] = None


@dataclass
class TickMessage:
    tick: int
    timestamp: float
    price: float
    best_bid: float
    best_bid_qty: int
    best_ask: float
    best_ask_qty: int
    bid_depth: List[Tuple[float, int]]
    ask_depth: List[Tuple[float, int]]
    trades: List[Dict[str, Any]] = field(default_factory=list)
    type: str = "tick"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "tick": self.tick,
            "timestamp": self.timestamp,
            "price": self.price,
            "best_bid": self.best_bid,
            "best_bid_qty": self.best_bid_qty,
            "best_ask": self.best_ask,
            "best_ask_qty": self.best_ask_qty,
            "bid_depth": [[float(p), int(q)] for p, q in self.bid_depth],
            "ask_depth": [[float(p), int(q)] for p, q in self.ask_depth],
            "trades": self.trades,
        }


@dataclass
class CompleteMessage:
    final_price: float
    total_trades: int
    mm_pnl: float
    mm_position: int
    trader_pnl: List[Dict[str, Any]]
    run_id: str
    type: str = "complete"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "final_price": self.final_price,
            "total_trades": self.total_trades,
            "mm_pnl": self.mm_pnl,
            "mm_position": self.mm_position,
            "trader_pnl": self.trader_pnl,
            "run_id": self.run_id,
        }
