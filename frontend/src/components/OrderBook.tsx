import type { TickMsg } from "../types";

interface Props {
  tick: TickMsg;
}

export default function OrderBook({ tick }: Props) {
  const { bid_depth, ask_depth, best_bid, best_ask } = tick;

  const maxBidQty = Math.max(...bid_depth.map(([, q]) => q), 1);
  const maxAskQty = Math.max(...ask_depth.map(([, q]) => q), 1);

  const spread = best_ask > 0 && best_bid > 0 ? best_ask - best_bid : null;

  return (
    <div className="order-book-content">
      {/* Asks — reversed so lowest ask is at bottom */}
      <div className="book-side ask">
        <div className="book-header">
          <span>Price</span>
          <span className="book-header-right">Size</span>
          <span className="book-header-right">Total</span>
        </div>
        {[...ask_depth].reverse().map(([price, qty], i) => {
          const total = ask_depth
            .slice(0, ask_depth.length - i)
            .reverse()
            .reduce((sum, [, q]) => sum + q, 0);
          return (
            <div key={`ask-${i}`} className="book-row ask">
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
          const total = bid_depth.slice(0, i + 1).reduce((sum, [, q]) => sum + q, 0);
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
      </div>
    </div>
  );
}
