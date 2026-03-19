import { SignalCard } from "./SignalCard";
import type { SignalWithMarket } from "@/types";

export function SignalFeed({ signals }: { signals: SignalWithMarket[] }) {
  if (signals.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--muted)]">
        No active signals. Markets are being analyzed every 5 minutes.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  );
}
