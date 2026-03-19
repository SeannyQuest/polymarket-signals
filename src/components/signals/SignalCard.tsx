import { Card } from "@/components/ui/Card";
import { SignalTypeBadge, DirectionBadge } from "./SignalBadge";
import { formatProbability, formatHoursUntil } from "@/lib/utils";
import type { SignalWithMarket } from "@/types";
import Link from "next/link";

export function SignalCard({ signal }: { signal: SignalWithMarket }) {
  const { market } = signal;
  return (
    <Card className="hover:border-[var(--primary)]/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/market/${market.slug}`}
            className="text-sm font-medium text-white/90 hover:text-[var(--primary)] transition-colors line-clamp-2"
          >
            {market.question}
          </Link>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <SignalTypeBadge type={signal.signalType} />
            <DirectionBadge direction={signal.direction} />
            {market.category && (
              <span className="text-xs text-[var(--muted)]">{market.category}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-mono font-bold" style={{ color: "var(--primary)" }}>
            {signal.confidence}
          </div>
          <div className="text-xs text-[var(--muted)]">conf</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted)]">
        <span>
          Price:{" "}
          <span className="text-white/80 font-mono">
            {market.lastTradePrice != null ? formatProbability(market.lastTradePrice) : "—"}
          </span>
        </span>
        {market.endDate && (
          <span>
            Ends:{" "}
            <span className="text-white/80">{formatHoursUntil(new Date(market.endDate))}</span>
          </span>
        )}
      </div>
      {/* Confidence bar */}
      <div className="mt-2 h-0.5 rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${signal.confidence}%`,
            background: "var(--primary)",
            opacity: 0.6,
          }}
        />
      </div>
    </Card>
  );
}
