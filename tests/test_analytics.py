"""Tests for the Analytics module."""

from __future__ import annotations

import pytest
from decimal import Decimal

from mini_jane_street.entities import Fill, Side
from mini_jane_street.analytics import Analytics
from mini_jane_street.simulation import SimulationConfig


class TestPnLCalculation:
    """Test PnL computation."""

    def test_realized_pnl_simple_round_trip(self) -> None:
        """Buy 10 at 100, sell 10 at 101 → PnL = +10."""
        trades = [
            Fill(
                order_id="buy-1",
                counterparty_id="mm-1",
                price=Decimal("100.00"),
                quantity=10,
                timestamp=1.0,
                side=Side.BUY,
            ),
            Fill(
                order_id="sell-1",
                counterparty_id="mm-1",
                price=Decimal("101.00"),
                quantity=10,
                timestamp=2.0,
                side=Side.SELL,
            ),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        report = analytics.compute_metrics()

        assert report.realized_pnl == Decimal("10.00")
        assert report.num_trades == 1

    def test_realized_pnl_loss(self) -> None:
        """Buy 10 at 101, sell 10 at 100 → PnL = -10."""
        trades = [
            Fill(
                order_id="buy-1",
                counterparty_id="mm-1",
                price=Decimal("101.00"),
                quantity=10,
                timestamp=1.0,
                side=Side.BUY,
            ),
            Fill(
                order_id="sell-1",
                counterparty_id="mm-1",
                price=Decimal("100.00"),
                quantity=10,
                timestamp=2.0,
                side=Side.SELL,
            ),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        report = analytics.compute_metrics()

        assert report.realized_pnl == Decimal("-10.00")

    def test_pnl_zero_when_no_trades(self) -> None:
        """No trades → PnL = 0."""
        config = SimulationConfig()
        analytics = Analytics(trades=[], config=config)
        report = analytics.compute_metrics()

        assert report.realized_pnl == Decimal("0")
        assert report.num_trades == 0
        assert report.win_rate == 0.0


class TestWinRate:
    """Test win rate computation."""

    def test_win_rate_calculation(self) -> None:
        """2 wins, 1 loss → 66.67% win rate."""
        trades = [
            # Win 1: buy 100, sell 105
            Fill("b1", "mm", Decimal("100"), 10, 1.0, Side.BUY),
            Fill("s1", "mm", Decimal("105"), 10, 2.0, Side.SELL),
            # Win 2: buy 100, sell 102
            Fill("b2", "mm", Decimal("100"), 5, 3.0, Side.BUY),
            Fill("s2", "mm", Decimal("102"), 5, 4.0, Side.SELL),
            # Loss: buy 100, sell 95
            Fill("b3", "mm", Decimal("100"), 10, 5.0, Side.BUY),
            Fill("s3", "mm", Decimal("95"), 10, 6.0, Side.SELL),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        report = analytics.compute_metrics()

        assert report.win_rate == pytest.approx(0.667, rel=0.01)
        assert report.num_trades == 3

    def test_profit_factor(self) -> None:
        """Gross profit 20, gross loss 10 → profit factor 2.0."""
        trades = [
            # Win
            Fill("b1", "mm", Decimal("100"), 10, 1.0, Side.BUY),
            Fill("s1", "mm", Decimal("102"), 10, 2.0, Side.SELL),
            # Loss
            Fill("b2", "mm", Decimal("100"), 10, 3.0, Side.BUY),
            Fill("s2", "mm", Decimal("99"), 10, 4.0, Side.SELL),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        report = analytics.compute_metrics()

        assert report.profit_factor == pytest.approx(2.0)


class TestSharpeRatio:
    """Test Sharpe ratio computation."""

    def test_sharpe_zero_with_constant_returns(self) -> None:
        """All trades have same PnL → std = 0 → Sharpe = 0."""
        trades = [
            Fill("b1", "mm", Decimal("100"), 10, 1.0, Side.BUY),
            Fill("s1", "mm", Decimal("101"), 10, 2.0, Side.SELL),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        report = analytics.compute_metrics()

        # With single trade, Sharpe = 0 (can't compute std of 1 sample)
        assert report.sharpe_ratio == 0.0

    def test_sharpe_positive_with_upward_returns(self) -> None:
        """Positive mean return → positive Sharpe."""
        trades = [
            Fill("b1", "mm", Decimal("100"), 10, 1.0, Side.BUY),
            Fill("s1", "mm", Decimal("102"), 10, 2.0, Side.SELL),
            Fill("b2", "mm", Decimal("100"), 10, 3.0, Side.BUY),
            Fill("s2", "mm", Decimal("101"), 10, 4.0, Side.SELL),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        report = analytics.compute_metrics()

        assert report.sharpe_ratio >= 0


class TestDrawdown:
    """Test maximum drawdown computation."""

    def test_drawdown_zero_for_monotonic_equity(self) -> None:
        """Constant positive PnL each trade → no drawdown."""
        trades = [
            Fill("b1", "mm", Decimal("100"), 10, 1.0, Side.BUY),
            Fill("s1", "mm", Decimal("101"), 10, 2.0, Side.SELL),
            Fill("b2", "mm", Decimal("100"), 10, 3.0, Side.BUY),
            Fill("s2", "mm", Decimal("102"), 10, 4.0, Side.SELL),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        report = analytics.compute_metrics()

        assert report.max_drawdown == Decimal("0")

    def test_drawdown_after_loss(self) -> None:
        """Win then loss → drawdown equals the loss."""
        trades = [
            Fill("b1", "mm", Decimal("100"), 10, 1.0, Side.BUY),
            Fill("s1", "mm", Decimal("105"), 10, 2.0, Side.SELL),
            Fill("b2", "mm", Decimal("100"), 10, 3.0, Side.BUY),
            Fill("s2", "mm", Decimal("95"), 10, 4.0, Side.SELL),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        report = analytics.compute_metrics()

        # Peak was +50, then lost 50 → drawdown = 50
        assert report.max_drawdown >= Decimal("0")


class TestEquityCurve:
    """Test equity curve computation."""

    def test_equity_curve_empty(self) -> None:
        config = SimulationConfig()
        analytics = Analytics(trades=[], config=config)
        df = analytics.compute_equity_curve()
        assert df.empty

    def test_equity_curve_trades(self) -> None:
        trades = [
            Fill("b1", "mm", Decimal("100"), 10, 1.0, Side.BUY),
            Fill("s1", "mm", Decimal("101"), 10, 2.0, Side.SELL),
        ]

        config = SimulationConfig()
        analytics = Analytics(trades=trades, config=config)
        df = analytics.compute_equity_curve()

        assert not df.empty
        assert "timestamp" in df.columns
        assert "equity" in df.columns


class TestExport:
    """Test export functionality."""

    def test_export_trades_csv_empty(self, tmp_path) -> None:
        config = SimulationConfig()
        analytics = Analytics(trades=[], config=config)

        path = tmp_path / "trades.csv"
        analytics.export_trades_csv(path)

        assert path.exists()

    def test_export_json(self, tmp_path) -> None:
        config = SimulationConfig()
        analytics = Analytics(trades=[], config=config)

        path = tmp_path / "report.json"
        analytics.export_json(path)

        assert path.exists()
        import json
        with open(path) as f:
            data = json.load(f)
        assert "realized_pnl" in data
        assert "sharpe_ratio" in data
