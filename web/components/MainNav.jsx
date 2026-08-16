"use client";

import { usePathname } from "next/navigation";

/**
 * Three destinations, in the order a QA engineer works:
 *   Overview        — what is happening?
 *   Flaky Analysis  — which failures need attention?
 *   Detection Rules — why did the analyzer flag this?
 *
 * AI is deliberately absent: it is an action available from a failure, not a
 * separate product area.
 */
const LINKS = [
  { href: "/", label: "Overview", match: (p) => p === "/" },
  {
    href: "/flaky",
    label: "Flaky Analysis",
    match: (p) => p.startsWith("/flaky") || p.startsWith("/investigate") || p.startsWith("/report"),
  },
  { href: "/rules", label: "Detection Rules", match: (p) => p.startsWith("/rules") },
];

export default function MainNav() {
  const pathname = usePathname() || "/";

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-white text-slate-900"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
