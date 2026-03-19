"use client";
import { useQuery } from "@tanstack/react-query";
import type { MarketWithSignals } from "@/types";

interface MarketsResponse {
  markets: MarketWithSignals[];
  total: number;
  page: number;
  pageSize: number;
}

export function useMarkets(params?: {
  category?: string;
  resolved?: boolean;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.resolved !== undefined) searchParams.set("resolved", String(params.resolved));
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  return useQuery<MarketsResponse>({
    queryKey: ["markets", params],
    queryFn: () => fetch(`/api/markets?${searchParams}`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
}
