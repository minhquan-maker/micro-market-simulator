import { useState } from "react";
import { Sparkles } from "lucide-react";
import { analyzeMarket } from "../services/groqService";
import type { TickMsg, PricePoint } from "../types";

interface Props {
  tick: TickMsg | null;
  priceHistory: PricePoint[];
  traderPnL: { id: string; realized: number }[];
  simType?: string;
}

const TYPE_CONTEXT: Record<string, string> = {
  microstructure: "Focus on overall market dynamics, price discovery, and the interaction between trading agents.",
  orderbook: "Focus on order book mechanics: queue position, depth, FIFO matching, and how orders queue at each price level.",
  marketmaking: "Focus on the market maker's perspective: spread capture, inventory management, and adverse selection risk.",
  volatility: "Focus on volatility dynamics: how uncertainty affects spreads, order flow, and agent behavior.",
};

function buildPrompt(tick: TickMsg | null, priceHistory: PricePoint[], traderPnL: { id: string; realized: number }[], simType: string): string {
  if (!tick) {
    const context = TYPE_CONTEXT[simType] ?? TYPE_CONTEXT.microstructure;
    return `The simulation has not started yet. Explain what a user should expect to see in this simulation. ${context}`;
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

  const context = TYPE_CONTEXT[simType] ?? TYPE_CONTEXT.microstructure;

  return `Analysis context: ${context}

Market snapshot at tick ${tick.tick}:

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

export default function AiAnalyst({ tick, priceHistory, traderPnL, simType = "microstructure" }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const prompt = buildPrompt(tick, priceHistory, traderPnL, simType);
      const result = await analyzeMarket({ prompt });
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-analyst-card">
      {/* Header */}
      <div className="ai-analyst-header">
        <div className="ai-analyst-header-left">
          <Sparkles size={14} strokeWidth={2} />
          <span className="ai-analyst-title">AI Market Analyst</span>
        </div>
        <button
          className="ai-ask-btn"
          onClick={handleAnalyze}
          disabled={loading}
          title="Get AI analysis of current market state"
        >
          {loading ? (
            <>
              <span className="ai-spinner" />
              Analyzing
            </>
          ) : (
            <>
              <Sparkles size={12} strokeWidth={2} />
              Ask AI
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="ai-analyst-body">
        {error && (
          <div className="ai-error">
            {error}
          </div>
        )}

        {analysis && (
          <div className="ai-analysis">
            {analysis.split("\n").map((line, i) => (
              <p key={i}>{line || " "}</p>
            ))}
          </div>
        )}

        {!analysis && !error && !loading && (
          <div className="ai-empty">
            <div className="ai-empty-icon">
              <Sparkles size={16} strokeWidth={1.5} />
            </div>
            <p>Get a plain-English explanation of the current market state — spread dynamics, agent behavior, and price drivers.</p>
          </div>
        )}

        {loading && !analysis && (
          <div className="ai-loading">
            <div className="ai-loading-bar" />
            <div className="ai-loading-bar" style={{ width: "60%" }} />
            <div className="ai-loading-bar" style={{ width: "80%" }} />
            <span>Analyzing market data...</span>
          </div>
        )}
      </div>
    </div>
  );
}
