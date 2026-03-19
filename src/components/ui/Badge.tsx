interface BadgeProps {
  variant?: "default" | "primary" | "win" | "loss" | "warning" | "muted";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  const variants = {
    default: "bg-white/10 text-white/80",
    primary: "bg-[var(--primary-dim)] text-[var(--primary)]",
    win: "bg-green-500/10 text-green-400",
    loss: "bg-red-500/10 text-red-400",
    warning: "bg-amber-500/10 text-amber-400",
    muted: "bg-white/5 text-[var(--muted)]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]} ${className ?? ""}`}>
      {children}
    </span>
  );
}
