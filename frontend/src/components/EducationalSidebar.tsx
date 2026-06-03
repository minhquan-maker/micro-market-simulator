import { Info } from "lucide-react";
import type { TickMsg } from "../types";

interface Props {
  tick: TickMsg | null;
  priceHistory: { price: number }[];
  simType?: string;
}

function generateExplanation(tick: TickMsg | null, history: { price: number }[], simType: string): string[] {
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

  const mmPos = tick.positions.find((p) => p.id === "mm-1");
  if (mmPos && mmPos.position !== 0) {
    if (mmPos.position > 0) {
      msgs.push("Market maker holding long inventory — bought more than sold. Watching for adverse selection.");
    } else {
      msgs.push("Market maker holding short inventory — sold more than bought. Managing inventory risk.");
    }
  }

  // Type-specific messages
  if (simType === "orderbook" && tick.bid_depth.length > 0 && tick.ask_depth.length > 0) {
    const bestBidQty = tick.bid_depth[0]?.[1] ?? 0;
    const bestAskQty = tick.ask_depth[0]?.[1] ?? 0;
    const queueRatio = bestAskQty > 0 ? bestBidQty / bestAskQty : 1;
    if (queueRatio > 2) {
      msgs.push("Thick bid queue: many orders waiting at the best bid — strong support level. Ask side is thin.");
    } else if (queueRatio < 0.5) {
      msgs.push("Thick ask queue: many orders waiting at the best ask — strong resistance level. Bid side is thin.");
    }
    if (tick.bid_depth.length > 3 && tick.ask_depth.length > 3) {
      msgs.push(`Deep book: ${tick.bid_depth.length} bid levels and ${tick.ask_depth.length} ask levels visible — significant liquidity on both sides.`);
    }
  }

  if (simType === "marketmaking" && mmPos) {
    const absPos = Math.abs(mmPos.position);
    if (absPos > 50) {
      msgs.push(mmPos.position > 0
        ? "MM holding large long inventory — high inventory risk. May need to narrow bid to buy less."
        : "MM holding large short inventory — high inventory risk. May need to narrow ask to sell less."
      );
    }
    if (spread) {
      const spreadNum = parseFloat(spread);
      if (spreadNum > 0.05 && mmPos.position !== 0) {
        msgs.push("Wide spread + non-zero MM inventory — compensating for adverse selection risk.");
      }
    }
  }

  if (simType === "volatility") {
    if (history.length >= 10) {
      const recentPrices = history.slice(-10).map((h) => h.price);
      const returns = recentPrices.slice(1).map((p, i) => Math.abs((p - recentPrices[i]) / recentPrices[i]));
      const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
      const realizedVol = avgReturn * 100;
      if (realizedVol > 0.5) {
        msgs.push(`High realized volatility: ~${realizedVol.toFixed(2)}% avg tick move. Wide spreads expected — market makers charging more for uncertainty.`);
      } else if (realizedVol < 0.1) {
        msgs.push(`Low realized volatility: ~${realizedVol.toFixed(3)}% avg tick move. Quiet market — spreads should be tight.`);
      }
    }
    if (spread) {
      const spreadNum = parseFloat(spread);
      if (spreadNum > 0.08) {
        msgs.push("Volatility spike detected: spreads widening significantly as market makers price in uncertainty.");
      }
    }
  }

  if (msgs.length === 0) {
    msgs.push("Market is quiet this tick. No significant price or volume signals.");
  }

  return msgs;
}

export default function EducationalSidebar({ tick, priceHistory, simType = "microstructure" }: Props) {
  const messages = generateExplanation(tick, priceHistory, simType);

  return (
    <div className="edu-sidebar-card">
      <div className="edu-header">
        <Info size={12} strokeWidth={2} />
        <span>Live Insight</span>
      </div>
      <div className="edu-body">
        {messages.map((msg, i) => (
          <div key={i} className="edu-message">
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
