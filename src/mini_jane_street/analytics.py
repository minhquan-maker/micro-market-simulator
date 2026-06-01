"""Analytics module for performance metrics and reporting."""

from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from mini_jane_street.config import SimulationConfig
from mini_jane_street.entities import Fill, PerformanceReport, Side


@dataclass
class TradeRecord:
    """A decoded trade with PnL information."""

    trade_id: str
    timestamp: float
    side: Side
    price: Decimal
    quantity: int
    pnl: Decimal = Decimal("0")


class Analytics:
    """
    Computes performance metrics from trade history.

    All metrics are computed from the fill log. The Analytics class
    is a read-only consumer of trade events.
    """

    def __init__(self, trades: list[Fill], config: SimulationConfig) -> None:
        self._trades: list[Fill] = list(trades)
        self._config = config

    def add_trade(self, trade: Fill) -> None:
        """Add a new trade to the history."""
        self._trades.append(trade)

    def add_trades(self, new_trades: list[Fill]) -> None:
        """Add multiple trades."""
        self._trades.extend(new_trades)

    @property
    def trades(self) -> list[Fill]:
        return list(self._trades)

    def compute_metrics(
        self,
        trader_id: str | None = None,
    ) -> PerformanceReport:
        """
        Compute all performance metrics for a trader.

        If trader_id is None, computes for all trades.
        """
        trades = self._trades if trader_id is None else self._get_trades_for(trader_id)

        realized_pnl = Decimal("0")
        trades_pnl: list[Decimal] = []
        gross_profit = Decimal("0")
        gross_loss = Decimal("0")
        num_wins = 0
        num_losses = 0
        unrealized_pnl = Decimal("0")

        buy_costs: list[tuple[float, Decimal, int]] = []
        sell_proceeds: list[tuple[float, Decimal, int]] = []

        for fill in trades:
            if fill.side == Side.BUY:
                buy_costs.append((fill.timestamp, fill.price, fill.quantity))
            else:
                sell_proceeds.append((fill.timestamp, fill.price, fill.quantity))

        buy_costs.sort(key=lambda x: x[0])
        sell_proceeds.sort(key=lambda x: x[0])

        remaining_buys: dict[int, tuple[Decimal, int]] = {}
        for _ts, price, qty in buy_costs:
            remaining_buys[len(remaining_buys)] = (price, qty)

        for _ts, price, qty in sell_proceeds:
            for key in list(remaining_buys.keys()):
                bp, bq = remaining_buys[key]
                if bq == 0:
                    continue
                match_qty = min(bq, qty)
                pnl = (price - bp) * match_qty
                realized_pnl += pnl
                trades_pnl.append(pnl)

                if pnl > 0:
                    gross_profit += pnl
                    num_wins += 1
                elif pnl < 0:
                    gross_loss += abs(pnl)
                    num_losses += 1

                remaining_buys[key] = (bp, bq - match_qty)
                qty -= match_qty
                if qty == 0:
                    break

        total_trades = num_wins + num_losses
        win_rate = num_wins / total_trades if total_trades > 0 else 0.0
        profit_factor = (
            float(gross_profit / gross_loss) if gross_loss != 0 else float("inf")
        )
        avg_trade_pnl = (
            realized_pnl / total_trades if total_trades > 0 else Decimal("0")
        )

        returns = np.array([float(p) for p in trades_pnl]) if trades_pnl else np.array([0.0])
        if len(returns) > 1 and np.std(returns) > 0:
            sharpe = float(np.mean(returns) / np.std(returns)) * np.sqrt(len(returns))
        else:
            sharpe = 0.0

        equity_curve = np.cumsum(returns)
        peak = np.maximum.accumulate(equity_curve)
        drawdowns = peak - equity_curve
        max_dd = float(np.max(drawdowns)) if len(drawdowns) > 0 else 0.0
        max_dd_pct = (
            float(max_dd / np.max(peak)) * 100 if np.max(peak) > 0 else 0.0
        )

        return PerformanceReport(
            realized_pnl=realized_pnl,
            unrealized_pnl=unrealized_pnl,
            total_pnl=realized_pnl + unrealized_pnl,
            sharpe_ratio=round(sharpe, 4),
            max_drawdown=Decimal(str(max_dd)),
            max_drawdown_pct=round(max_dd_pct, 2),
            win_rate=round(win_rate, 4),
            profit_factor=round(profit_factor, 4) if profit_factor != float("inf") else float("inf"),
            num_trades=total_trades,
            avg_trade_pnl=avg_trade_pnl,
        )

    def compute_equity_curve(self, trader_id: str | None = None) -> pd.DataFrame:
        """Compute the equity curve over time."""
        trades = self._get_trades_for(trader_id) if trader_id else self._trades

        if not trades:
            return pd.DataFrame(columns=["timestamp", "pnl", "equity"])

        rows = []
        cumulative_pnl = 0.0

        for fill in trades:
            cumulative_pnl += float(fill.price) * (
                -1 if fill.side == Side.BUY else 1
            )
            rows.append(
                {"timestamp": fill.timestamp, "pnl": cumulative_pnl}
            )

        df = pd.DataFrame(rows)
        df["equity"] = df["pnl"].cumsum()
        return df

    def compute_spread_capture(self, trader_id: str) -> Decimal:
        """Compute spread capture for a market maker."""
        fills = self._get_trades_for(trader_id)
        if not fills:
            return Decimal("0")

        buy_fills = [f for f in fills if f.side == Side.BUY]
        sell_fills = [f for f in fills if f.side == Side.SELL]

        buy_volume = sum(f.price * f.quantity for f in buy_fills)
        sell_volume = sum(f.price * f.quantity for f in sell_fills)

        total_volume = buy_volume + sell_volume
        if total_volume == 0:
            return Decimal("0")

        return (sell_volume - buy_volume) / len(fills)

    def compute_adverse_selection_ratio(
        self, trader_id: str, window: int = 5
    ) -> float:
        """
        Compute fraction of fills where price moved against the MM within N ticks.
        """
        fills = self._get_trades_for(trader_id)
        if not fills:
            return 0.0

        adverse = 0
        for i, fill in enumerate(fills):
            future_fills = fills[i + 1 : i + 1 + window]
            if not future_fills:
                continue

            future_avg = sum(f.price for f in future_fills) / len(future_fills)
            if fill.side == Side.BUY and future_avg < fill.price:
                adverse += 1
            elif fill.side == Side.SELL and future_avg > fill.price:
                adverse += 1

        return adverse / len(fills) if fills else 0.0

    def _get_trades_for(self, trader_id: str) -> list[Fill]:
        """Filter fills for a specific trader."""
        return [f for f in self._trades if f.order_id.startswith(trader_id)]

    def export_json(self, path: Path) -> None:
        """Export metrics report as JSON."""
        report = self.compute_metrics()
        data = {
            "realized_pnl": str(report.realized_pnl),
            "unrealized_pnl": str(report.unrealized_pnl),
            "total_pnl": str(report.total_pnl),
            "sharpe_ratio": report.sharpe_ratio,
            "max_drawdown": str(report.max_drawdown),
            "max_drawdown_pct": report.max_drawdown_pct,
            "win_rate": report.win_rate,
            "profit_factor": report.profit_factor,
            "num_trades": report.num_trades,
            "avg_trade_pnl": str(report.avg_trade_pnl),
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def export_trades_csv(self, path: Path) -> None:
        """Export trade history as CSV."""
        rows = [
            {
                "order_id": f.order_id,
                "counterparty_id": f.counterparty_id,
                "side": f.side.value,
                "price": float(f.price),
                "quantity": f.quantity,
                "timestamp": f.timestamp,
            }
            for f in self._trades
        ]
        df = pd.DataFrame(rows)
        df.to_csv(path, index=False)

    def plot_pnl(self) -> Any:
        """Generate a PnL curve plot."""
        import matplotlib.pyplot as plt

        df = self.compute_equity_curve()
        if df.empty:
            fig, ax = plt.subplots()
            ax.set_title("No trades")
            return fig

        fig, ax = plt.subplots(figsize=(10, 5))
        ax.plot(df["timestamp"], df["equity"], linewidth=1.5)
        ax.set_xlabel("Time (ticks)")
        ax.set_ylabel("Cumulative PnL")
        ax.set_title("Equity Curve")
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        return fig
