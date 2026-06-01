"""Configuration and result types for the simulation."""

from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class SimulationConfig:
    """Configuration for a simulation run."""

    initial_price: Decimal = Decimal("100.00")
    volatility: float = 0.001
    tick_size: Decimal = Decimal("0.01")
    tick_interval: float = 1.0
    num_ticks: int = 1000
    seed: int | None = 42
    start_time: float = 0.0

    def __post_init__(self) -> None:
        if self.seed is not None:
            random.seed(self.seed)


@dataclass
class SimulationResult:
    """Result of a completed simulation."""

    final_mid: Decimal
    num_ticks: int
    num_trades: int
    config: SimulationConfig
