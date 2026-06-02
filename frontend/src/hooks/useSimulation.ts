import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage, TickMsg, TraderPnL } from "../types";

interface UseSimulationOptions {
  onTick?: (tick: TickMsg) => void;
  onComplete?: (result: {
    mm_pnl: number;
    mm_position: number;
    trader_pnl: TraderPnL[];
    total_trades: number;
    final_price: number;
  }) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export function useSimulation({ onTick, onComplete }: UseSimulationOptions = {}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "running" | "complete" | "error">("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const start = useCallback(
    async (config: {
      num_ticks: number;
      volatility: number;
      seed: number | null;
      initial_price: number;
    }) => {
      setStatus("connecting");
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const data = await res.json();
        const id: string = data.run_id;
        setRunId(id);
        setStatus("running");

        const wsBase = API_BASE.replace(/^http/, "ws");
        const wsProto = wsBase.startsWith("wss") ? "wss:" : "ws:";
        const wsHost = wsBase.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
        const ws = new WebSocket(`${wsProto}//${wsHost}/ws/simulate/${id}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          const msg: WsMessage = JSON.parse(event.data);

          if (msg.type === "start") {
            // Initial snapshot received; simulation is about to begin
          } else if (msg.type === "tick") {
            onTick?.(msg);
          } else if (msg.type === "complete") {
            onComplete?.({
              mm_pnl: msg.mm_pnl,
              mm_position: msg.mm_position,
              trader_pnl: msg.trader_pnl,
              total_trades: msg.total_trades,
              final_price: msg.final_price,
            });
            setStatus("complete");
            ws.close();
          } else if (msg.type === "error") {
            setError(msg.message);
            setStatus("error");
            ws.close();
          }
        };

        ws.onerror = () => {
          setError("WebSocket connection failed");
          setStatus("error");
        };

        ws.onclose = () => {
          if (status === "connecting" || status === "running") {
            // closed unexpectedly
          }
        };
      } catch (e) {
        setError(String(e));
        setStatus("error");
      }
    },
    [onTick, onComplete] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const stop = useCallback(() => {
    wsRef.current?.close();
    setStatus("idle");
    setRunId(null);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { status, runId, error, start, stop };
}
