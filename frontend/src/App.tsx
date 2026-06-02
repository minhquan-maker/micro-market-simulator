import { useCallback, useState } from "react";
import { useSimulation } from "./hooks/useSimulation";
import OrderBook from "./components/OrderBook";
import PriceChart from "./components/PriceChart";
import TradeTape from "./components/TradeTape";
import PnLDashboard from "./components/PnLDashboard";
import ConfigPanel from "./components/ConfigPanel";
import type { TickMsg, PricePoint, TraderPnL, Trade } from "./types";

export default function App() {
  const [config, setConfig] = useState<{ num_ticks: number; volatility: number; seed: number | null; initial_price: number }>({
    num_ticks: 200,
    volatility: 0.5,
    seed: 42,
    initial_price: 100.0,
  });

  const [latestTick, setLatestTick] = useState<TickMsg | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [totalTrades, setTotalTrades] = useState(0);
  const [mmResult, setMmResult] = useState<{ pnl: number; position: number } | null>(null);
  const [traderPnL, setTraderPnL] = useState<TraderPnL[]>([]);

  const handleTick = useCallback((tick: TickMsg) => {
    setLatestTick(tick);
    setPriceHistory((prev) => [
      ...prev.slice(-499),
      { tick: tick.tick, price: tick.price, bid: tick.best_bid, ask: tick.best_ask },
    ]);
    if (tick.trades.length > 0) {
      setAllTrades((prev) => [...prev, ...tick.trades]);
    }
    setTotalTrades((n) => n + tick.trades.length);
  }, []);

  const handleComplete = useCallback(
    (result: {
      mm_pnl: number;
      mm_position: number;
      trader_pnl: TraderPnL[];
      total_trades: number;
      final_price: number;
    }) => {
      setFinalPrice(result.final_price);
      setMmResult({ pnl: result.mm_pnl, position: result.mm_position });
      setTraderPnL(result.trader_pnl);
    },
    []
  );

  const { status, error, start, stop } = useSimulation({
    onTick: handleTick,
    onComplete: handleComplete,
  });

  const handleStart = () => {
    setPriceHistory([]);
    setAllTrades([]);
    setTotalTrades(0);
    setFinalPrice(null);
    setMmResult(null);
    setTraderPnL([]);
    setLatestTick(null);
    start(config);
  };

  const spread =
    latestTick && latestTick.best_ask > 0 && latestTick.best_bid > 0
      ? Math.max(0, latestTick.best_ask - latestTick.best_bid)
      : null;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon">JS</div>
          <div>
            <div className="header-title">Mini Jane Street Simulator</div>
            <div className="header-subtitle">Market Microstructure Engine</div>
          </div>
        </div>
        <div className="header-controls">
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            <span className={`status-dot ${status}`} /> {status.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Price</div>
          <div className={`stat-value ${
            (finalPrice ?? latestTick?.price ?? config.initial_price) > config.initial_price ? "green" :
            (finalPrice ?? latestTick?.price ?? config.initial_price) < config.initial_price ? "red" : ""
          }`}>
            {(finalPrice ?? latestTick?.price ?? config.initial_price).toFixed(2)}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Spread</div>
          <div className="stat-value blue">
            {spread != null ? spread.toFixed(2) : "—"}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Trades</div>
          <div className="stat-value blue">{totalTrades}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Tick</div>
          <div className="stat-value">
            {latestTick ? `${latestTick.tick + 1} / ${config.num_ticks}` : `0 / ${config.num_ticks}`}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">MM PnL</div>
          <div className={`stat-value ${(mmResult?.pnl ?? 0) >= 0 ? "green" : "red"}`}>
            {mmResult ? (mmResult.pnl >= 0 ? "+" : "") + mmResult.pnl.toFixed(2) : "—"}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">MM Position</div>
          <div className="stat-value">
            {mmResult ? mmResult.position.toString() : "—"}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="main">
        {/* Order Book */}
        <div className="panel order-book">
          <div className="panel-header">
            <span className="panel-title">Order Book</span>
            <span className="panel-badge">
              {latestTick ? `${(latestTick.best_bid_qty + latestTick.best_ask_qty)} levels` : "—"}
            </span>
          </div>
          {latestTick ? (
            <OrderBook tick={latestTick} />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">
                Start a simulation to see<br />the order book
              </div>
            </div>
          )}
        </div>

        {/* Price Chart */}
        <div className="panel chart-panel">
          <div className="panel-header">
            <span className="panel-title">Price History</span>
            <span className="panel-badge">{priceHistory.length} pts</span>
          </div>
          <div className="chart-container">
            <PriceChart data={priceHistory} initialPrice={config.initial_price} />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="panel sidebar">
          <div className="panel-header">
            <span className="panel-title">Control</span>
          </div>
          <ConfigPanel
            config={config}
            setConfig={setConfig}
            status={status}
            onStart={handleStart}
            onStop={stop}
            error={error}
          />
        </div>

        {/* Ticker tape */}
        <div className="ticker">
          <div className="ticker-item">
            <span className="ticker-label">Init</span>
            <span className="ticker-value">{config.initial_price.toFixed(2)}</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">Bid</span>
            <span className="ticker-value">{latestTick ? latestTick.best_bid.toFixed(2) : "—"}</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">Ask</span>
            <span className="ticker-value">{latestTick ? latestTick.best_ask.toFixed(2) : "—"}</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">Mid</span>
            <span className="ticker-value">{latestTick ? latestTick.price.toFixed(2) : "—"}</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">Δ</span>
            <span className={`ticker-value ${latestTick && latestTick.price > config.initial_price ? "up" : latestTick && latestTick.price < config.initial_price ? "down" : ""}`}>
              {latestTick
                ? (latestTick.price - config.initial_price >= 0 ? "+" : "") + (latestTick.price - config.initial_price).toFixed(2)
                : "—"}
            </span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">Seed</span>
            <span className="ticker-value">{config.seed ?? "None"}</span>
          </div>
        </div>
      </div>

      {/* Trade Tape — separate row below */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 280px", gap: "1px", background: "var(--border)", borderTop: "1px solid var(--border)" }}>
        <div style={{ background: "var(--bg-primary)" }}>
          <PnLDashboard mmResult={mmResult} traderPnL={traderPnL} />
        </div>
        <div style={{ background: "var(--bg-secondary)" }}>
          <TradeTape trades={allTrades} />
        </div>
        <div style={{ background: "var(--bg-primary)" }}>
          {/* spacer */}
        </div>
      </div>
    </div>
  );
}
