import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-mono font-bold mb-4" style={{ color: "var(--primary)" }}>404</div>
        <p className="text-[var(--muted)] mb-6">Market not found</p>
        <Link href="/" className="text-sm hover:text-white transition-colors" style={{ color: "var(--primary)" }}>
          ← Back to signals
        </Link>
      </div>
    </div>
  );
}
