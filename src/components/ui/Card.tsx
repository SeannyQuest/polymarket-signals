export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-4 ${className ?? ""}`}
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}
