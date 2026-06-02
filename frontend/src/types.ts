export interface TickMsg {
  type: "tick";
  tick: number;
  timestamp: number;
  price: number;
  best_bid: number;
  best_bid_qty: number;
  best_ask: number;
  best_ask_qty: number;
  bid_depth: [number, number][];
  ask_depth: [number, number][];
  trades: Trade[];
  positions: AgentPosition[];  // Phase 3.1
}

export interface StartMsg {
  type: "start";
  run_id: string;
  config: SimConfig;
}

export interface CompleteMsg {
  type: "complete";
  final_price: number;
  total_trades: number;
  mm_pnl: number;
  mm_position: number;
  mm_unrealized: number;  // Phase 3.2
  trader_pnl: TraderPnL[];
  analytics: Record<string, AnalyticsMetrics>;  // Phase 3.2
  run_id: string;
}

export interface AgentPosition {  // Phase 3.1
  id: string;
  position: number;
  realized: number;
  unrealized: number;
}

export interface AnalyticsMetrics {  // Phase 3.2
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  avg_trade_pnl: number;
  total_pnl: number;
}

export interface ErrorMsg {
  type: "error";
  message: string;
}

export type WsMessage = TickMsg | StartMsg | CompleteMsg | ErrorMsg;

export interface SimConfig {
  num_ticks: number;
  volatility: number;
  seed: number | null;
  initial_price: number;
}

export interface Trade {
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  counterparty: string;
  timestamp?: number;
}

export interface TraderPnL {
  id: string;
  realized: number;
  unrealized: number;
  position: number;
}

export interface PricePoint {
  tick: number;
  price: number;
  bid: number;
  ask: number;
}
