from __future__ import annotations

import asyncio
import sys
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, Optional

# Add the quant project src to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from models import CompleteMessage, SimulationRequest, SimulationRun, TickMessage

from mini_jane_street.market_maker import MarketMaker
from mini_jane_street.simulation import SimulationConfig, SimulationEngine
from mini_jane_street.traders import MeanReversionTrader, MomentumTrader, RandomTaker


class SimulationManager:
    def __init__(self) -> None:
        self._runs: Dict[str, SimulationRun] = {}
        self._queues: Dict[str, asyncio.Queue] = {}

    def create_run(self, config: SimulationRequest) -> SimulationRun:
        run_id = str(uuid.uuid4())[:8]
        run = SimulationRun(
            run_id=run_id,
            config=config,
            step_event=asyncio.Event(),
            step_mode=config.step_mode,
        )
        self._runs[run_id] = run
        self._queues[run_id] = asyncio.Queue()
        return run

    def get_run(self, run_id: str) -> Optional[SimulationRun]:
        return self._runs.get(run_id)

    def trigger_step(self, run_id: str) -> bool:
        """Phase 3.4: Trigger one step in step mode. Returns True if triggered."""
        run = self._runs.get(run_id)
        if run and run.step_mode:
            run.step_event.set()
            return True
        return False

    def set_speed(self, run_id: str, delay_ms: int) -> bool:
        """Phase 3.4: Update tick delay. Returns True if updated."""
        run = self._runs.get(run_id)
        if run and run.status == "running":
            run.config.tick_delay_ms = max(1, min(delay_ms, 5000))
            return True
        return False

    async def start_simulation(self, run_id: str) -> None:
        run = self._runs.get(run_id)
        if run is None:
            return

        try:
            # Apply difficulty presets
            volatility = run.config.volatility
            tick_delay = run.config.tick_delay_ms

            if run.config.difficulty == "beginner":
                volatility = 0.2
                tick_delay = 200
            elif run.config.difficulty == "intermediate":
                volatility = 0.5
                tick_delay = 50
            elif run.config.difficulty == "advanced":
                volatility = 1.5
                tick_delay = 10

            cfg = SimulationConfig(
                initial_price=Decimal(str(run.config.initial_price)),
                volatility=volatility,
                tick_size=Decimal("0.01"),
                num_ticks=run.config.num_ticks,
                seed=run.config.seed,
            )

            enabled = set(run.config.enabled_agents)

            traders = []
            if "rt-1" in enabled:
                traders.append(RandomTaker(trader_id="rt-1", action_prob=0.08, min_qty=1, max_qty=15))
            if "rt-2" in enabled:
                traders.append(RandomTaker(trader_id="rt-2", action_prob=0.06, min_qty=1, max_qty=10))
            if "mom-1" in enabled:
                traders.append(MomentumTrader(trader_id="mom-1", momentum_threshold=0.001, window_size=10))
            if "mr-1" in enabled:
                traders.append(MeanReversionTrader(trader_id="mr-1", reversion_threshold=0.002, window_size=20))

            mm = None
            if "mm-1" in enabled:
                mm = MarketMaker(
                    trader_id="mm-1",
                    base_spread=Decimal("0.02"),
                    quote_size=10,
                )

            engine = SimulationEngine(config=cfg, traders=traders, market_maker=mm)
            run.status = "running"

            prev_trade_count = 0

            for tick in range(run.config.num_ticks):
                # Phase 3.4: wait for step trigger in step mode
                if run.step_mode:
                    run.step_event.clear()
                    await run.step_event.wait()

                engine.step()

                md = engine.exchange.get_market_data()
                all_trades = engine.exchange.trades
                new_trades = all_trades[prev_trade_count:]
                prev_trade_count = len(all_trades)

                tick_trades = [
                    {
                        "price": float(t.price),
                        "quantity": t.quantity,
                        "side": t.side.value,
                        "counterparty": t.counterparty_id[:8],
                        "timestamp": t.timestamp,
                    }
                    for t in new_trades
                ]

                # Phase 3.1: compute per-agent positions
                mid = engine.exchange.mid_price
                positions = []
                for t in traders:
                    realized, unrealized = t.compute_pnl(mid)
                    positions.append({
                        "id": t.trader_id,
                        "position": t.position,
                        "realized": float(realized),
                        "unrealized": float(unrealized),
                    })
                # MM position (if enabled)
                if mm is not None:
                    mm_stats = mm.stats
                    positions.append({
                        "id": "mm-1",
                        "position": mm_stats.inventory,
                        "realized": float(mm_stats.realized_pnl),
                        "unrealized": float(mm_stats.unrealized_pnl),
                    })

                msg = TickMessage(
                    tick=tick,
                    timestamp=engine.clock.time,
                    price=float(md.mid_price),
                    best_bid=float(md.best_bid),
                    best_bid_qty=md.best_bid_qty,
                    best_ask=float(md.best_ask),
                    best_ask_qty=md.best_ask_qty,
                    bid_depth=[[float(p), float(q)] for p, q in md.bid_depth],
                    ask_depth=[[float(p), float(q)] for p, q in md.ask_depth],
                    trades=tick_trades,
                    positions=positions,
                )

                await self._queues[run_id].put(msg.to_dict())

                # Phase 3.4: configurable tick delay (difficulty preset overrides user setting)
                delay = tick_delay / 1000.0
                await asyncio.sleep(delay)

            # Phase 3.2: compute analytics on completion
            analytics: Dict[str, Any] = {}
            for t in traders:
                report = engine.analytics.compute_metrics(trader_id=t.trader_id)
                analytics[t.trader_id] = {
                    "sharpe_ratio": float(report.sharpe_ratio),
                    "max_drawdown": float(report.max_drawdown),
                    "win_rate": float(report.win_rate),
                    "profit_factor": float(report.profit_factor),
                    "avg_trade_pnl": float(report.avg_trade_pnl),
                    "total_pnl": float(report.total_pnl),
                }
            # Overall
            overall = engine.analytics.compute_metrics()
            analytics["_overall"] = {
                "sharpe_ratio": float(overall.sharpe_ratio),
                "max_drawdown": float(overall.max_drawdown),
                "win_rate": float(overall.win_rate),
                "profit_factor": float(overall.profit_factor),
                "avg_trade_pnl": float(overall.avg_trade_pnl),
                "total_pnl": float(overall.total_pnl),
            }

            mm_stats = mm.stats if mm is not None else None
            trader_results = [
                {
                    "id": t.trader_id,
                    "realized": float(t.stats.realized_pnl),
                    "unrealized": float(t.compute_pnl(engine.exchange.mid_price)[1]),
                    "position": t.position,
                }
                for t in traders
            ]

            complete = CompleteMessage(
                final_price=float(engine.exchange.mid_price),
                total_trades=len(engine.exchange.trades),
                mm_pnl=float(mm_stats.realized_pnl) if mm_stats else 0.0,
                mm_position=mm_stats.inventory if mm_stats else 0,
                mm_unrealized=float(mm_stats.unrealized_pnl) if mm_stats else 0.0,
                trader_pnl=trader_results,
                analytics=analytics,
                run_id=run_id,
            )
            await self._queues[run_id].put(complete.to_dict())
            run.status = "complete"
            run.result = complete.to_dict()

        except Exception as e:
            run.status = "error"
            run.result = {"error": str(e)}

    def get_queue(self, run_id: str) -> Optional[asyncio.Queue]:
        return self._queues.get(run_id)


manager = SimulationManager()
