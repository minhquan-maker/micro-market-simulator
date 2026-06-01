#!/usr/bin/env python3
"""Entry point for the Mini Jane Street Simulator."""

from __future__ import annotations

import json
import argparse
from decimal import Decimal
from pathlib import Path

from mini_jane_street.market_maker import MarketMaker
from mini_jane_street.simulation import SimulationConfig, SimulationEngine
from mini_jane_street.traders import MomentumTrader, RandomTaker, MeanReversionTrader


def print_report(engine: SimulationEngine, result) -> None:
    """Print a summary of the simulation results."""
    print("\n" + "=" * 60)
    print(" MINI JANE STREET SIMULATOR — RESULTS")
    print("=" * 60)

    md = engine.exchange.get_market_data()
    print(f"\nMarket: STOCK")
    print(f"  Final Mid Price:  {md.mid_price:.2f}")
    print(f"  Best Bid:         {md.best_bid:.2f}")
    print(f"  Best Ask:         {md.best_ask:.2f}")
    print(f"  Spread:          {(md.best_ask - md.best_bid):.2f}")
    print(f"  Total Trades:     {len(engine.exchange.trades)}")

    print(f"\nConfig:")
    print(f"  Ticks:            {engine._config.num_ticks}")
    print(f"  Volatility:       {engine._config.volatility:.4f}")
    print(f"  Initial Price:    {engine._config.initial_price:.2f}")

    if engine._market_maker:
        mm_stats = engine._market_maker.stats
        print(f"\nMarket Maker ({engine._market_maker.trader_id}):")
        print(f"  Realized PnL:    {mm_stats.realized_pnl:.2f}")
        print(f"  Position:        {mm_stats.inventory}")
        print(f"  Buy Fills:       {mm_stats.num_buy_fills}")
        print(f"  Sell Fills:      {mm_stats.num_sell_fills}")
        print(f"  Gross Spread:    {mm_stats.gross_spread_earned:.2f}")

    print(f"\nTrader Performance:")
    for trader in engine._traders:
        realized, unrealized = trader.compute_pnl(md.mid_price)
        print(
            f"  {trader.trader_id}: realized={realized:.2f}, "
            f"unrealized={unrealized:.2f}, "
            f"position={trader.position}"
        )

    print(f"\nAll Trades ({len(engine.exchange.trades)} total):")
    print(f"  {'Time':>6} | {'Side':>4} | {'Price':>8} | {'Qty':>4}")
    print(f"  {'-'*6}   {'-'*4}   {'-'*8}   {'-'*4}")
    for fill in engine.exchange.trades[-20:]:
        print(
            f"  {fill.timestamp:6.0f} | {fill.side.value:>4} | "
            f"{fill.price:8.2f} | {fill.quantity:4d}"
        )
    if len(engine.exchange.trades) > 20:
        print(f"  ... and {len(engine.exchange.trades) - 20} more trades")


def export_results(engine: SimulationEngine, output_dir: Path) -> None:
    """Export results to output directory."""
    output_dir.mkdir(parents=True, exist_ok=True)

    trades_path = output_dir / "trades.csv"
    engine.analytics.export_trades_csv(trades_path)
    print(f"\nExported trades to: {trades_path}")

    report_path = output_dir / "report.json"
    engine.analytics.export_json(report_path)
    print(f"Exported report to: {report_path}")

    config_path = output_dir / "config.json"
    cfg = engine._config
    with open(config_path, "w") as f:
        json.dump({
            "initial_price": str(cfg.initial_price),
            "volatility": cfg.volatility,
            "tick_interval": cfg.tick_interval,
            "num_ticks": cfg.num_ticks,
            "seed": cfg.seed,
        }, f, indent=2)
    print(f"Exported config to: {config_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Mini Jane Street Simulator")
    parser.add_argument("--ticks", type=int, default=1000, help="Number of simulation ticks")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--volatility", type=float, default=0.5, help="Price volatility per tick")
    parser.add_argument("--no-mm", action="store_true", help="Disable market maker")
    parser.add_argument("--output", type=str, default=None, help="Output directory for results")
    args = parser.parse_args()

    config = SimulationConfig(
        initial_price=Decimal("100.00"),
        volatility=args.volatility,
        num_ticks=args.ticks,
        seed=args.seed,
    )

    traders = [
        RandomTaker(trader_id="rt-1", action_prob=0.08, min_qty=1, max_qty=15),
        RandomTaker(trader_id="rt-2", action_prob=0.06, min_qty=1, max_qty=10),
        MomentumTrader(trader_id="mom-1", momentum_threshold=0.001, window_size=10),
        MeanReversionTrader(trader_id="mr-1", reversion_threshold=0.002, window_size=20),
    ]

    mm: MarketMaker | None = None
    if not args.no_mm:
        mm = MarketMaker(
            trader_id="mm-main",
            base_spread=Decimal("0.02"),
            inventory_alpha=Decimal("0.0005"),
            quote_size=10,
        )

    engine = SimulationEngine(config=config, traders=traders, market_maker=mm)

    print("Starting simulation...")
    result = engine.run()

    print_report(engine, result)

    if args.output:
        export_results(engine, Path(args.output))

    print("\nSimulation complete!")


if __name__ == "__main__":
    main()
