import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage, TickMsg, TraderPnL, CompleteMsg } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface SimConfig {
  num_ticks: number;
  volatility: number;
  seed: number | null;
  initial_price: number;
  tick_delay_ms?: number;
  step_mode?: boolean;
}

interface UseSimulationOptions {
  onTick?: (tick: TickMsg) => void;
  onComplete?: (result: {
    mm_pnl: number;
    mm_position: number;
    mm_unrealized: number;
    trader_pnl: TraderPnL[];
    total_trades: number;
    final_price: number;
    analytics: CompleteMsg["analytics"];
  }) => void;
}

export function useSimulation({ onTick, onComplete }: UseSimulationOptions = {}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "running" | "complete" | "error">("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStepMode, setIsStepMode] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const start = useCallback(
    async (config: SimConfig) => {
      setStatus("connecting");
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            num_ticks: config.num_ticks,
            volatility: config.volatility,
            seed: config.seed,
            initial_price: config.initial_price,
            tick_delay_ms: config.tick_delay_ms ?? 10,
            step_mode: config.step_mode ?? false,
          }),
        });
        const data = await res.json();
        const id: string = data.run_id;
        setRunId(id);
        setIsStepMode(config.step_mode ?? false);
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
              mm_unrealized: msg.mm_unrealized,
              trader_pnl: msg.trader_pnl,
              total_trades: msg.total_trades,
              final_price: msg.final_price,
              analytics: msg.analytics,
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
    setIsStepMode(false);
  }, []);

  // Phase 3.4: trigger one step in step mode
  const step = useCallback(async () => {
    if (!runId) return;
    try {
      await fetch(`${API_BASE}/api/simulate/${runId}/step`, { method: "POST" });
    } catch {}
  }, [runId]);

  // Phase 3.4: update tick speed
  const setSpeed = useCallback(async (delayMs: number) => {
    if (!runId) return;
    try {
      await fetch(`${API_BASE}/api/simulate/${runId}/speed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delay_ms: delayMs }),
      });
    } catch {}
  }, [runId]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { status, runId, error, start, stop, step, setSpeed, isStepMode };
}
