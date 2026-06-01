"""Simulation Engine — orchestrates the trading simulation."""

from __future__ import annotations

import random
from decimal import Decimal

from mini_jane_street.analytics import Analytics
from mini_jane_street.config import SimulationConfig, SimulationResult
from mini_jane_street.exchange import Exchange
from mini_jane_street.market_maker import MarketMaker
from mini_jane_street.traders import Trader


class Clock:
    """Virtual simulation clock."""

    def __init__(self, start: float = 0.0, interval: float = 1.0) -> None:
        self._time = start
        self._interval = interval

    @property
    def time(self) -> float:
        return self._time

    def advance(self) -> None:
        self._time += self._interval

    def reset(self, start: float = 0.0) -> None:
        self._time = start


class MarketDataGenerator:
    """Generates a latent mid price using arithmetic random walk."""

    def __init__(
        self,
        initial_price: Decimal,
        volatility: float,
        tick_interval: float = 1.0,
        seed: int | None = None,
    ) -> None:
        self._price = initial_price
        self._volatility = volatility
        self._tick_interval = tick_interval
        self._rng = random.Random(seed)
        self._initial_price = initial_price
        self._price_history: list[Decimal] = [initial_price]

    @property
    def price(self) -> Decimal:
        return self._price

    @property
    def price_history(self) -> list[Decimal]:
        return list(self._price_history)

    def step(self) -> Decimal:
        """Advance the price by one tick using arithmetic random walk."""
        drift = self._rng.gauss(0, self._volatility)
        # Floor at 5% of initial price — prevents price collapsing to near-zero
        # which would make MM quotes invalid and empty the order book.
        floor = self._initial_price * Decimal("0.05")
        self._price = max(floor, self._price + Decimal(str(drift)))
        self._price_history.append(self._price)
        return self._price


class SimulationEngine:
    """
    Orchestrates the full simulation.

    Manages the clock, market data generator, exchange, traders,
    and market maker. Runs the event loop.
    """

    def __init__(
        self,
        config: SimulationConfig,
        traders: list[Trader],
        market_maker: MarketMaker | None = None,
    ) -> None:
        self._config = config
        self._clock = Clock(
            start=config.start_time,
            interval=config.tick_interval,
        )
        self._market_gen = MarketDataGenerator(
            initial_price=config.initial_price,
            volatility=config.volatility,
            tick_interval=config.tick_interval,
            seed=config.seed,
        )
        self._exchange = Exchange(
            tick_size=config.tick_size,
            initial_mid=config.initial_price,
        )
        self._traders = traders
        self._market_maker = market_maker
        self._analytics = Analytics(trades=[], config=config)
        self._prev_trade_count = 0

    @property
    def exchange(self) -> Exchange:
        return self._exchange

    @property
    def clock(self) -> Clock:
        return self._clock

    @property
    def analytics(self) -> Analytics:
        return self._analytics

    def step(self) -> None:
        """Execute one simulation tick."""
        self._clock.advance()
        new_price = self._market_gen.step()
        self._exchange.update_mid_price(new_price)
        self._exchange.current_time = self._clock.time

        md = self._exchange.get_market_data()

        if self._market_maker is not None:
            self._market_maker.on_market_data(md, self._exchange)

        for trader in self._traders:
            trader.on_market_data(md, self._exchange)

        # Route fills to the appropriate trader
        new_trades = self._exchange.trades[self._prev_trade_count:]
        for fill in new_trades:
            self._analytics.add_trade(fill)

            # Route to market maker if counterparty is MM
            # counterparty_id is the order_id of the resting order; look up in
            # _trader_order_ids which persists even after the order is removed
            # from _open_orders (e.g. after a full fill).
            if self._market_maker is not None:
                trader_ids = self._exchange._trader_order_ids.get(self._market_maker.trader_id, set())
                if fill.counterparty_id in trader_ids:
                    self._market_maker.on_fill(fill)

            # Route to the trader who submitted the order
            for trader in self._traders:
                # Match by checking if the fill's order_id starts with trader_id
                if fill.order_id.startswith(trader.trader_id):
                    trader.on_fill(fill)

        self._prev_trade_count = len(self._exchange.trades)

    def run(self) -> SimulationResult:
        """Run the full simulation."""
        for _ in range(self._config.num_ticks):
            self.step()

        return SimulationResult(
            final_mid=self._market_gen.price,
            num_ticks=self._config.num_ticks,
            num_trades=len(self._exchange.trades),
            config=self._config,
        )
