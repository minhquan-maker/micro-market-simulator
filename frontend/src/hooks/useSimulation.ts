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
  enabled_agents?: string[];
  difficulty?: string;
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

  // Store callbacks in refs so the async start() always sees the latest version
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onTickRef.current = onTick;
    onCompleteRef.current = onComplete;
  });

  const start = useCallback(async (config: SimConfig) => {
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
          enabled_agents: config.enabled_agents ?? ["mm-1", "rt-1", "rt-2", "mom-1", "mr-1"],
          difficulty: config.difficulty ?? null,
        }),
      });
      const data = await res.json();
      const id: string = data.run_id;
      setRunId(id);
      setIsStepMode(config.step_mode ?? false);
      setStatus("running");

      const wsProto = API_BASE.startsWith("https") ? "wss:" : "ws:";
      const wsHost = API_BASE.replace(/^https?:\/\//, "");
      const ws = new WebSocket(`${wsProto}//${wsHost}/ws/simulate/${id}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg: WsMessage = JSON.parse(event.data);

        if (msg.type === "tick") {
          onTickRef.current?.(msg);
        } else if (msg.type === "complete") {
          onCompleteRef.current?.({
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
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.close();
    setStatus("idle");
    setRunId(null);
    setIsStepMode(false);
  }, []);

  const step = useCallback(async () => {
    if (!runId) return;
    try {
      await fetch(`${API_BASE}/api/simulate/${runId}/step`, { method: "POST" });
    } catch {}
  }, [runId]);

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
