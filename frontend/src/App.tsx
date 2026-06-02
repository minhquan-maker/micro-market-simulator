import { useCallback, useRef, useState } from "react";
import { useSimulation } from "./hooks/useSimulation";
import { useTheme } from "./contexts/ThemeContext";
import OrderBook from "./components/OrderBook";
import PriceChart from "./components/PriceChart";
import TradeTape from "./components/TradeTape";
import PnLDashboard from "./components/PnLDashboard";
import ConfigPanel from "./components/ConfigPanel";
import type { TickMsg, PricePoint, TraderPnL, Trade, AgentPosition, AnalyticsMetrics } from "./types";

// Phase 1.0c: Agent dot config
const AGENTS = [
  { id: "mm-1", label: "MM", color: "var(--blue)" },
  { id: "rt-1", label: "RT1", color: "var(--yellow)" },
  { id: "rt-2", label: "RT2", color: "var(--yellow)" },
  { id: "mom-1", label: "MOM", color: "var(--green)" },
  { id: "mr-1", label: "MR", color: "var(--green)" },
];

function getAgentPrefix(counterparty: string): string {
  const dashIdx = counterparty.indexOf("-");
  return dashIdx >= 0 ? counterparty.slice(0, dashIdx) : counterparty;
}

type SimConfig = {
  num_ticks: number;
  volatility: number;
  seed: number | null;
  initial_price: number;
  tick_delay_ms?: number;
  step_mode?: boolean;
};

type CompleteResult = {
  mm_pnl: number;
  mm_position: number;
  mm_unrealized: number;
  trader_pnl: TraderPnL[];
  total_trades: number;
  final_price: number;
  analytics: Record<string, AnalyticsMetrics>;
};

// Phase 3.3: Build CSV from trades
function buildCSV(trades: Trade[]): string {
  const header = "timestamp,side,price,quantity,counterparty\n";
  const rows = trades.map((t) =>
    `${t.timestamp ?? 0},${t.side},${t.price},${t.quantity},${t.counterparty}`
  ).join("\n");
  return header + rows;
}

// Phase 3.3: Download helper
function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const { theme, toggleTheme } = useTheme();

  const [config, setConfig] = useState<SimConfig>({
    num_ticks: 200,
    volatility: 0.5,
    seed: 42,
    initial_price: 100.0,
    tick_delay_ms: 10,
    step_mode: false,
  });

  const [latestTick, setLatestTick] = useState<TickMsg | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [totalTrades, setTotalTrades] = useState(0);
  const [mmResult, setMmResult] = useState<{ pnl: number; position: number; unrealized: number } | null>(null);
  const [traderPnL, setTraderPnL] = useState<TraderPnL[]>([]);
  const [livePositions, setLivePositions] = useState<Record<string, AgentPosition>>({});
  const [analytics, setAnalytics] = useState<Record<string, AnalyticsMetrics>>({});

  // Phase 1.0: Price flash
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // Phase 1.0b: Spread history
  const [spreadHistory, setSpreadHistory] = useState<number[]>([]);

  // Phase 1.0c: Agent activity
  const [agentActive, setAgentActive] = useState<Record<string, boolean>>(
    Object.fromEntries(AGENTS.map((a) => [a.id, false]))
  );

  // Phase 1.5: Session high/low
  const [sessionHigh, setSessionHigh] = useState<number | null>(null);
  const [sessionLow, setSessionLow] = useState<number | null>(null);

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

    // Phase 1.0: Price flash
    const curPrice = tick.price;
    if (prevPriceRef.current !== null) {
      if (curPrice > prevPriceRef.current) {
        setPriceFlash("up");
      } else if (curPrice < prevPriceRef.current) {
        setPriceFlash("down");
      }
      setTimeout(() => setPriceFlash(null), 420);
    }
    prevPriceRef.current = curPrice;

    // Phase 1.0b: Spread history (rolling 50)
    const spread =
      tick.best_ask > 0 && tick.best_bid > 0
        ? Math.max(0, tick.best_ask - tick.best_bid)
        : 0;
    setSpreadHistory((prev) => [...prev.slice(-49), spread]);

    // Phase 1.0c: Agent activity
    const activeAgents = new Set<string>();
    for (const t of tick.trades) {
      activeAgents.add(getAgentPrefix(t.counterparty));
    }
    const newActive: Record<string, boolean> = {};
    for (const a of AGENTS) {
      newActive[a.id] = activeAgents.has(a.id);
    }
    setAgentActive(newActive);
    setTimeout(() => {
      setAgentActive(Object.fromEntries(AGENTS.map((a) => [a.id, false])));
    }, 300);

    // Phase 1.5: Session high/low
    setSessionHigh((h) => (h === null || curPrice > h ? curPrice : h));
    setSessionLow((l) => (l === null || curPrice < l ? curPrice : l));

    // Phase 3.1: Live positions
    if (tick.positions && tick.positions.length > 0) {
      const posMap: Record<string, AgentPosition> = {};
      for (const p of tick.positions) {
        posMap[p.id] = p;
      }
      setLivePositions(posMap);
    }
  }, []);

  const handleComplete = useCallback((result: CompleteResult) => {
    setFinalPrice(result.final_price);
    setMmResult({
      pnl: result.mm_pnl,
      position: result.mm_position,
      unrealized: result.mm_unrealized,
    });
    setTraderPnL(result.trader_pnl);
    setAnalytics(result.analytics);
  }, []);

  const { status, error, start, stop, step, runId } = useSimulation({
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
    setPriceFlash(null);
    prevPriceRef.current = null;
    setSpreadHistory([]);
    setAgentActive(Object.fromEntries(AGENTS.map((a) => [a.id, false])));
    setSessionHigh(null);
    setSessionLow(null);
    setLivePositions({});
    setAnalytics({});
    start(config);
  };

  // Phase 3.3: Export handlers
  const exportCSV = () => {
    if (!allTrades.length) return;
    downloadBlob(buildCSV(allTrades), `sim-${runId ?? "run"}-trades.csv`, "text/csv");
  };

  const exportJSON = () => {
    const report = {
      run_id: runId,
      config,
      final_price: finalPrice,
      total_trades: totalTrades,
      mm: mmResult,
      traders: traderPnL,
      analytics,
    };
    downloadBlob(JSON.stringify(report, null, 2), `sim-${runId ?? "run"}-report.json`, "application/json");
  };

  const currentPrice = finalPrice ?? latestTick?.price ?? config.initial_price;
  const progress = latestTick ? ((latestTick.tick + 1) / config.num_ticks) * 100 : 0;
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
          <span className="header-status">
            <span className={`status-dot ${status}`} /> {status.toUpperCase()}
          </span>
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Price</div>
          <div className={`stat-value ${
            currentPrice > config.initial_price ? "green" :
            currentPrice < config.initial_price ? "red" : ""
          } ${priceFlash === "up" ? "price-flash-up" : priceFlash === "down" ? "price-flash-down" : ""}`}>
            {currentPrice.toFixed(2)}
          </div>
          <div className="agent-dots">
            {AGENTS.map((a) => (
              <span
                key={a.id}
                className={`agent-dot ${agentActive[a.id] ? "active" : ""}`}
                style={{ background: a.color }}
                title={a.label}
              />
            ))}
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
            {latestTick ? `${latestTick.tick + 1}` : "0"} / {config.num_ticks}
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

      {/* Progress bar */}
      {status !== "idle" && (
        <div className="progress-row">
          <div className="progress-track">
            <div className="progress-thumb" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-label">
            {latestTick ? `${latestTick.tick + 1} / ${config.num_ticks}` : `0 / ${config.num_ticks}`}
          </span>
        </div>
      )}

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
            <OrderBook tick={latestTick} spreadHistory={spreadHistory} />
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
            onStep={step}
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
          {sessionHigh !== null && (
            <div className="ticker-item">
              <span className="ticker-label">High</span>
              <span className="ticker-value" style={{ color: "var(--green)" }}>{sessionHigh.toFixed(2)}</span>
            </div>
          )}
          {sessionLow !== null && (
            <div className="ticker-item">
              <span className="ticker-label">Low</span>
              <span className="ticker-value" style={{ color: "var(--red)" }}>{sessionLow.toFixed(2)}</span>
            </div>
          )}
          <div className="ticker-item">
            <span className="ticker-label">Seed</span>
            <span className="ticker-value">{config.seed ?? "None"}</span>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="bottom-row">
        <div className="bottom-pnl-panel">
          <PnLDashboard
            mmResult={mmResult}
            traderPnL={traderPnL}
            livePositions={livePositions}
            analytics={status === "complete" ? analytics : undefined}
          />
        </div>
        <div className="bottom-tape-panel">
          <TradeTape trades={allTrades} />
        </div>
        <div className="bottom-spacer-panel">
          {/* Phase 3.3: Export buttons */}
          {status === "complete" && (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="panel-title" style={{ marginBottom: 4 }}>Export</div>
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={exportCSV}>
                Export CSV
              </button>
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={exportJSON}>
                Export JSON
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
