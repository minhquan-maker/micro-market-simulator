import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { TickMsg } from "../types";

interface Props {
  tick: TickMsg;
  spreadHistory?: number[];
}

export default function OrderBook({ tick, spreadHistory = [] }: Props) {
  const { bid_depth, ask_depth, best_bid, best_ask } = tick;

  const maxBidQty = Math.max(...bid_depth.map(([, q]) => q), 1);
  const maxAskQty = Math.max(...ask_depth.map(([, q]) => q), 1);

  const spread = best_ask > 0 && best_bid > 0 ? Math.max(0, best_ask - best_bid) : null;

  const spreadData = spreadHistory.map((value, index) => ({ index, value }));

  // O(n) cumulative totals
  const bidCumulative: number[] = [];
  let bidRun = 0;
  for (const [, q] of bid_depth) {
    bidRun += q;
    bidCumulative.push(bidRun);
  }

  // ask_cumulative[i] = sum of ask_depth[i..end] quantities
  const askCumulative: number[] = [];
  let askRun = 0;
  for (let i = ask_depth.length - 1; i >= 0; i--) {
    askRun += ask_depth[i][1];
    askCumulative[i] = askRun;
  }

  return (
    <div className="order-book-content">
      {/* Asks — reversed so lowest ask is at bottom */}
      <div className="book-side ask">
        <div className="book-header">
          <span>Price</span>
          <span className="book-header-right">Size</span>
          <span className="book-header-right">Total</span>
        </div>
        {[...ask_depth].reverse().map(([price, qty], displayIdx) => {
          // displayIdx goes 0..n-1 from reversed array; original index = ask_depth.length - 1 - displayIdx
          const origIdx = ask_depth.length - 1 - displayIdx;
          const total = askCumulative[origIdx] ?? 0;
          return (
            <div key={`ask-${origIdx}`} className="book-row ask">
              <div
                className="depth-bar"
                style={{ width: `${(qty / maxAskQty) * 100}%` }}
              />
              <span className="book-row-price">{(price as number).toFixed(2)}</span>
              <span className="book-row-size">{qty}</span>
              <span className="book-row-total">{total}</span>
            </div>
          );
        })}
      </div>

      {/* Spread */}
      <div className="spread-row">
        <span className="spread-label">Spread</span>
        <span className="spread-value">
          {spread != null ? spread.toFixed(2) : "—"}
        </span>
      </div>

      {/* Bids */}
      <div className="book-side bid">
        {[...bid_depth].map(([price, qty], i) => {
          const total = bidCumulative[i] ?? 0;
          return (
            <div key={`bid-${i}`} className="book-row bid">
              <div
                className="depth-bar"
                style={{ width: `${(qty / maxBidQty) * 100}%` }}
              />
              <span className="book-row-price">{(price as number).toFixed(2)}</span>
              <span className="book-row-size">{qty}</span>
              <span className="book-row-total">{total}</span>
            </div>
          );
        })}

        {/* Phase 1.0b: Spread histogram */}
        {spreadHistory.length > 1 && (
          <div className="spread-histogram">
            <div className="spread-histogram-title">Spread History</div>
            <div className="spread-histogram-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spreadData} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--yellow)"
                    fill="rgba(234, 179, 8, 0.15)"
                    strokeWidth={1}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
