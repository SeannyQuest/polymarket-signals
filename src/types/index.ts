import type { Market, MarketPriceSnapshot, Signal, CategoryBias, SignalType, SignalDirection } from "@prisma/client";

export type { Market, MarketPriceSnapshot, Signal, CategoryBias, SignalType, SignalDirection };

export interface SignalWithMarket extends Signal {
  market: Market;
}

export interface MarketWithSignals extends Market {
  signals: Signal[];
  _count?: { signals: number };
}

export interface MarketWithSnapshots extends Market {
  snapshots: MarketPriceSnapshot[];
  signals: Signal[];
  categoryBias?: CategoryBias | null;
}

export interface SignalDetectionResult {
  signalType: SignalType;
  direction: SignalDirection;
  confidence: number;
  details: Record<string, unknown>;
  expiresAt?: Date;
}
