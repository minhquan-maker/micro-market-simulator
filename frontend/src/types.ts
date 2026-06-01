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
  trader_pnl: TraderPnL[];
  run_id: string;
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
