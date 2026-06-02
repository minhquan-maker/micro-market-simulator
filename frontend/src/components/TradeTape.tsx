import { useRef, useEffect } from "react";
import type { Trade } from "../types";

interface Props {
  trades: Trade[];
}

export default function TradeTape({ trades }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    }
  });

  useEffect(() => {
    if (scrollRef.current && atBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [trades.length]);

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Trade Tape</span>
        <span className="panel-badge">{trades.length} total</span>
      </div>
      <div className="trade-tape-content" ref={scrollRef}>
        {trades.length > 0 ? (
          trades.slice(-100).map((trade, i) => (
            <div key={i} className="trade-row">
              <span className="trade-time">
                {trade.timestamp !== undefined ? Math.floor(trade.timestamp) : ""}
              </span>
              <span className={`trade-price ${trade.side === "BUY" ? "buy" : "sell"}`}>
                {trade.price.toFixed(2)}
              </span>
              <span className="trade-size">{trade.quantity}</span>
              <span className={`trade-side ${trade.side === "BUY" ? "buy" : "sell"}`}>
                {trade.side}
              </span>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: 16 }}>
            <div className="empty-state-text" style={{ fontSize: 12 }}>
              Waiting for trades...
            </div>
          </div>
        )}
      </div>
    </>
  );
}
