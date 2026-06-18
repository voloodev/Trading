export interface UserProfile {
  uid: string;
  email: string;
  balance: number;
  initialBalance: number;
  isSetup: boolean;
  createdAt: any; // Firestore Timestamp or date ISO string
}

export interface TradeHistory {
  id: string;
  uid: string;
  coinName: string;
  tradeType: "LONG" | "SHORT";
  result: "TP Hit" | "SL Hit" | "RUNNING";
  gainLossPct: number;
  entryPrice: number;
  exitPrice: number;
  strategy: string;
  timestamp: any; // Firestore Timestamp or date ISO string
  riskUSD?: number;
  riskRate?: number;
  tpPrice?: number;
  slPrice?: number;
  currentPnlUSD?: number;
}

export interface TradingSetup {
  coinName: string;
  winRate: number;
  tradeType: "LONG" | "SHORT";
  entryPrice: number;
  tpPrice: number;
  slPrice: number;
  smcBreakdown: string;
  ictBreakdown: string;
  elliottBreakdown: string;
  retailBreakdown: string;
  sessionKiller: string;
  summaryText: string;
  timeframe: string;
  timestamp: string;
}

export type TimeframeSelection = "5m" | "15m" | "30m" | "1h";
