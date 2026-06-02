import { useState } from "react";
import { analyzeMarket } from "../services/groqService";
import type { TickMsg, PricePoint } from "../types";

interface Props {
  tick: TickMsg | null;
  priceHistory: PricePoint[];
  traderPnL: { id: string; realized: number }[];
}

function buildPrompt(tick: TickMsg | null, priceHistory: PricePoint[], traderPnL: { id: string; realized: number }[]): string {
  if (!tick) {
    return "The simulation has not started yet. Explain what a user should expect to see in a market microstructure simulation.";
  }

  const spread = tick.best_ask > 0 && tick.best_bid > 0
    ? (tick.best_ask - tick.best_bid).toFixed(3)
    : "N/A";

  const priceChange = priceHistory.length >= 2
    ? ((tick.price - priceHistory[0].price) / priceHistory[0].price * 100).toFixed(2)
    : "0.00";

  const tradesSummary = tick.trades.length > 0
    ? tick.trades.map((t) => `${t.side} ${t.quantity} @ ${t.price.toFixed(2)} by ${t.counterparty}`).join("; ")
    : "No trades this tick";

  const pnlSummary = traderPnL.map((t) => `${t.id}: realized PnL ${t.realized >= 0 ? "+" : ""}${t.realized.toFixed(3)}`).join("; ");

  return `Market snapshot at tick ${tick.tick}:

Price: ${tick.price.toFixed(2)} (${priceChange}% from start)
Spread: ${spread}
Best Bid: ${tick.best_bid.toFixed(2)} (qty: ${tick.best_bid_qty})
Best Ask: ${tick.best_ask.toFixed(2)} (qty: ${tick.best_ask_qty})
Bid Depth: ${tick.bid_depth.map(([p, q]) => `${p.toFixed(2)}×${q}`).join(", ")}
Ask Depth: ${tick.ask_depth.map(([p, q]) => `${p.toFixed(2)}×${q}`).join(", ")}

Trades this tick: ${tradesSummary}

Agent P&L: ${pnlSummary || "No data yet"}

Please provide a brief analysis of the current market state and what is driving price behavior.`;
}

export default function AiAnalyst({ tick, priceHistory, traderPnL }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const prompt = buildPrompt(tick, priceHistory, traderPnL);
      const result = await analyzeMarket({ prompt });
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="panel-title">AI Market Analyst</div>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 11, padding: "4px 10px" }}
          onClick={handleAnalyze}
          disabled={loading}
          title="Get AI analysis of current market state"
        >
          {loading ? "Analyzing..." : "Ask AI"}
        </button>
      </div>

      {error && (
        <div style={{
          fontSize: 11,
          color: "var(--red)",
          padding: "6px 8px",
          background: "var(--red-bg)",
          borderRadius: 6,
          border: "1px solid var(--red-dim)",
        }}>
          {error}
        </div>
      )}

      {analysis && (
        <div style={{
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
          padding: "8px 10px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          maxHeight: 200,
          overflowY: "auto",
        }}>
          {analysis}
        </div>
      )}

      {!analysis && !error && !loading && (
        <div style={{
          fontSize: 11,
          color: "var(--text-muted)",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}>
          Click &quot;Ask AI&quot; to get a plain-English explanation of the current market state,
          price dynamics, and agent behavior.
        </div>
      )}
    </div>
  );
}
