/**
 * The VERDICT mark.
 *
 * A judge's seal: a rounded badge with a scored bar-chart notch and a check
 * struck through it — deterministic measurement, then a decision. Inline SVG
 * so it scales, needs no network, and inherits the header's colour.
 */
export default function Logo({ size = 30 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="VERDICT"
      className="flex-none"
    >
      <rect width="32" height="32" rx="8" fill="#0f172a" />
      {/* Three measured signals, shortest to tallest. */}
      <rect x="7" y="18" width="3" height="7" rx="1.5" fill="#64748b" />
      <rect x="12.5" y="14" width="3" height="11" rx="1.5" fill="#94a3b8" />
      <rect x="18" y="9" width="3" height="16" rx="1.5" fill="#cbd5e1" />
      {/* The verdict struck across them. */}
      <path
        d="M9 13.5L14 18.5L25.5 7"
        stroke="#12866b"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
