from __future__ import annotations

import asyncio
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
    tick_delay_ms: int = 10   # Phase 3.4: speed control
    step_mode: bool = False   # Phase 3.4: step-by-step mode
    enabled_agents: List[str] = field(default_factory=lambda: ["mm-1", "rt-1", "rt-2", "mom-1", "mr-1"])  # which agents to run
    difficulty: Optional[str] = None  # beginner | intermediate | advanced


@dataclass
class SimulationRun:
    run_id: str
    config: SimulationRequest
    status: str = "pending"  # pending | running | complete | error
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    result: Optional[Dict[str, Any]] = None
    # Phase 3.4: step control
    step_event: asyncio.Event = field(default_factory=asyncio.Event)
    step_mode: bool = False


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
    positions: List[Dict[str, Any]] = field(default_factory=list)  # Phase 3.1
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
            "positions": self.positions,
        }


@dataclass
class CompleteMessage:
    final_price: float
    total_trades: int
    mm_pnl: float
    mm_position: int
    mm_unrealized: float = 0.0  # Phase 3.2
    trader_pnl: List[Dict[str, Any]] = field(default_factory=list)
    analytics: Dict[str, Any] = field(default_factory=dict)  # Phase 3.2
    run_id: str = ""
    type: str = "complete"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "final_price": self.final_price,
            "total_trades": self.total_trades,
            "mm_pnl": self.mm_pnl,
            "mm_position": self.mm_position,
            "mm_unrealized": self.mm_unrealized,
            "trader_pnl": self.trader_pnl,
            "analytics": self.analytics,
            "run_id": self.run_id,
        }
