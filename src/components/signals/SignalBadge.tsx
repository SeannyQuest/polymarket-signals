import { Badge } from "@/components/ui/Badge";
import type { SignalType, SignalDirection } from "@prisma/client";

const SIGNAL_LABELS: Record<SignalType, string> = {
  PRICE_DRIFT: "Drift",
  SHARP_MONEY: "Sharp $",
  RESOLUTION_BIAS: "Bias",
  LATE_FADE: "Fade",
};

export function SignalTypeBadge({ type }: { type: SignalType }) {
  const variants: Record<SignalType, "primary" | "warning" | "muted" | "default"> = {
    PRICE_DRIFT: "primary",
    SHARP_MONEY: "warning",
    RESOLUTION_BIAS: "muted",
    LATE_FADE: "default",
  };
  return <Badge variant={variants[type]}>{SIGNAL_LABELS[type]}</Badge>;
}

export function DirectionBadge({ direction }: { direction: SignalDirection }) {
  return (
    <Badge variant={direction === "BUY_YES" ? "win" : "loss"}>
      {direction === "BUY_YES" ? "BUY YES" : "BUY NO"}
    </Badge>
  );
}
