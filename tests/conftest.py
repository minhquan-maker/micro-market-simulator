"""Pytest fixtures for the Mini Jane Street Simulator tests."""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Resolve server/ directory for API tests
_SERVER_DIR = Path(__file__).parent.parent / "server"
if str(_SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(_SERVER_DIR))

import pytest
from decimal import Decimal

from mini_jane_street.entities import Order, OrderType, Side
from mini_jane_street.orderbook import OrderBook
from mini_jane_street.exchange import Exchange


@pytest.fixture
def empty_book() -> OrderBook:
    """An empty order book."""
    return OrderBook(tick_size=Decimal("0.01"))


@pytest.fixture
def exchange() -> Exchange:
    """A fresh exchange instance."""
    return Exchange(tick_size=Decimal("0.01"), initial_mid=Decimal("100.00"))


@pytest.fixture
def sample_limit_buy() -> Order:
    """A sample limit buy order."""
    return Order(
        order_id="order-1",
        trader_id="trader-1",
        side=Side.BUY,
        price=Decimal("100.00"),
        quantity=10,
        timestamp=1.0,
        order_type=OrderType.LIMIT,
    )


@pytest.fixture
def sample_limit_sell() -> Order:
    """A sample limit sell order."""
    return Order(
        order_id="order-2",
        trader_id="trader-2",
        side=Side.SELL,
        price=Decimal("100.00"),
        quantity=10,
        timestamp=2.0,
        order_type=OrderType.LIMIT,
    )
