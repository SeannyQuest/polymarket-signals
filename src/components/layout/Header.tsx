import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Signals" },
  { href: "/markets", label: "Markets" },
  { href: "/categories", label: "Categories" },
  { href: "/backtest", label: "Backtest" },
];

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(15,15,31,0.85)",
        backdropFilter: "blur(12px)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          <span style={{ color: "var(--primary)" }}>Poly</span>
          <span className="text-white/90">Signal</span>
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--muted)] hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
