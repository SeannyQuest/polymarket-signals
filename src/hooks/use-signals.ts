"use client";
import { useQuery } from "@tanstack/react-query";
import type { SignalWithMarket } from "@/types";
import type { SignalType } from "@prisma/client";

interface SignalsResponse {
  signals: SignalWithMarket[];
  total: number;
}

export function useSignals(params?: {
  type?: SignalType;
  minConfidence?: number;
  category?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.minConfidence) searchParams.set("minConfidence", String(params.minConfidence));
  if (params?.category) searchParams.set("category", params.category);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  return useQuery<SignalsResponse>({
    queryKey: ["signals", params],
    queryFn: () => fetch(`/api/signals?${searchParams}`).then((r) => r.json()),
    refetchInterval: 60_000,
  });
}
