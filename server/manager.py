from __future__ import annotations

import asyncio
import uuid
from decimal import Decimal
from pathlib import Path
import sys
from typing import Dict, Optional, Any

# Add the quant project src to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from mini_jane_street.simulation import SimulationConfig, SimulationEngine
from mini_jane_street.traders import RandomTaker, MomentumTrader, MeanReversionTrader
from mini_jane_street.market_maker import MarketMaker

from models import SimulationRun, SimulationRequest, TickMessage, CompleteMessage


class SimulationManager:
    def __init__(self) -> None:
        self._runs: Dict[str, SimulationRun] = {}
        self._queues: Dict[str, asyncio.Queue] = {}

    def create_run(self, config: SimulationRequest) -> SimulationRun:
        run_id = str(uuid.uuid4())[:8]
        run = SimulationRun(run_id=run_id, config=config)
        self._runs[run_id] = run
        self._queues[run_id] = asyncio.Queue()
        return run

    def get_run(self, run_id: str) -> Optional[SimulationRun]:
        return self._runs.get(run_id)

    async def start_simulation(self, run_id: str) -> None:
        run = self._runs.get(run_id)
        if run is None:
            return

        try:
            cfg = SimulationConfig(
                initial_price=Decimal(str(run.config.initial_price)),
                volatility=run.config.volatility,
                tick_size=Decimal("0.01"),
                num_ticks=run.config.num_ticks,
                seed=run.config.seed,
            )

            traders = [
                RandomTaker(trader_id="rt-1", action_prob=0.08, min_qty=1, max_qty=15),
                RandomTaker(trader_id="rt-2", action_prob=0.06, min_qty=1, max_qty=10),
                MomentumTrader(trader_id="mom-1", momentum_threshold=0.001, window_size=10),
                MeanReversionTrader(trader_id="mr-1", reversion_threshold=0.002, window_size=20),
            ]

            mm = MarketMaker(
                trader_id="mm-1",
                base_spread=Decimal("0.02"),
                quote_size=10,
            )

            engine = SimulationEngine(config=cfg, traders=traders, market_maker=mm)
            run.status = "running"

            prev_trade_count = 0

            for tick in range(run.config.num_ticks):
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
                )

                await self._queues[run_id].put(msg.to_dict())
                await asyncio.sleep(0.01)

            # Send complete
            mm_stats = mm.stats
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
                mm_pnl=float(mm_stats.realized_pnl),
                mm_position=mm_stats.inventory,
                trader_pnl=trader_results,
                run_id=run_id,
            )
            await self._queues[run_id].put(complete.to_dict())
            run.status = "complete"

        except Exception as e:
            run.status = "error"
            run.result = {"error": str(e)}

    def get_queue(self, run_id: str) -> Optional[asyncio.Queue]:
        return self._queues.get(run_id)


manager = SimulationManager()
