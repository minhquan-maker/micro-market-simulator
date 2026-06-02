import type { TickMsg } from "../types";

interface Props {
  tick: TickMsg | null;
  priceHistory: { price: number }[];
}

function generateExplanation(tick: TickMsg | null, history: { price: number }[]): string[] {
  const msgs: string[] = [];

  if (!tick) {
    return ["Start the simulation to see live market explanations."];
  }

  const spread = tick.best_ask > 0 && tick.best_bid > 0
    ? (tick.best_ask - tick.best_bid).toFixed(2)
    : null;

  if (spread) {
    const spreadNum = parseFloat(spread);
    if (spreadNum <= 0.02) {
      msgs.push("The spread is tight — market is liquid with low transaction costs.");
    } else if (spreadNum <= 0.05) {
      msgs.push("Moderate spread indicates balanced supply and demand. Trading activity is steady.");
    } else {
      msgs.push("Wide spread signals reduced liquidity — either uncertainty or low market activity.");
    }
  }

  if (tick.trades.length > 0) {
    const buyTrades = tick.trades.filter((t) => t.side === "BUY").length;
    const sellTrades = tick.trades.filter((t) => t.side === "SELL").length;
    if (buyTrades > sellTrades) {
      msgs.push(`Buy pressure dominated this tick (${buyTrades} buys vs ${sellTrades} sells) — upward price pressure.`);
    } else if (sellTrades > buyTrades) {
      msgs.push(`Sell pressure dominated this tick (${sellTrades} sells vs ${buyTrades} buys) — downward price pressure.`);
    } else {
      msgs.push("Balanced trading this tick — equal buy and sell activity.");
    }
  }

  // Momentum detection
  if (history.length >= 5) {
    const recent = history.slice(-5);
    const first = recent[0].price;
    const last = recent[recent.length - 1].price;
    const change = ((last - first) / first) * 100;
    if (change > 0.5) {
      msgs.push(`Upward momentum building: price rose ${change.toFixed(2)}% over the last 5 ticks. Momentum traders likely buying.`);
    } else if (change < -0.5) {
      msgs.push(`Downward momentum detected: price fell ${Math.abs(change).toFixed(2)}% over the last 5 ticks. Sellers active.`);
    }
  }

  // Order book imbalance
  const bidTotal = tick.bid_depth.reduce((s, [, q]) => s + q, 0);
  const askTotal = tick.ask_depth.reduce((s, [, q]) => s + q, 0);
  if (bidTotal + askTotal > 0) {
    const obi = (bidTotal - askTotal) / (bidTotal + askTotal);
    if (obi > 0.3) {
      msgs.push("Order book imbalance: significantly more bids than asks — bullish signal.");
    } else if (obi < -0.3) {
      msgs.push("Order book imbalance: significantly more asks than bids — bearish signal.");
    }
  }

  // MM activity
  const mmPos = tick.positions.find((p) => p.id === "mm-1");
  if (mmPos && mmPos.position !== 0) {
    if (mmPos.position > 0) {
      msgs.push("Market maker holding long inventory — bought more than sold. Watching for adverse selection.");
    } else {
      msgs.push("Market maker holding short inventory — sold more than bought. Managing inventory risk.");
    }
  }

  if (msgs.length === 0) {
    msgs.push("Market is quiet this tick. No significant price or volume signals.");
  }

  return msgs;
}

export default function EducationalSidebar({ tick, priceHistory }: Props) {
  const messages = generateExplanation(tick, priceHistory);

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="panel-title" style={{ marginBottom: 4 }}>What&apos;s Happening</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: "8px 10px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--text-secondary)",
            }}
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
