// Minimal bug + pulse-line mark: a plain line-art bug silhouette (flaky
// tests) with a short ECG-style pulse running beneath it (signal/detection).
// No container, no fill shapes beyond the head dot — reads clean at 16-20px.
export default function BrandIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="9.5" rx="4.2" ry="5.2" />
      <circle cx="12" cy="3" r="1.05" fill="currentColor" stroke="none" />
      <path d="M12 4.1v1.1" />
      <path d="M8.2 7.2 5.6 6" />
      <path d="M7.8 9.5H5" />
      <path d="M8.2 11.8 5.6 13" />
      <path d="M15.8 7.2 18.4 6" />
      <path d="M16.2 9.5H19" />
      <path d="M15.8 11.8 18.4 13" />
      <path d="M1.5 19.2H8l1.6-3.4 1.8 5 1.6-3.6h9.5" />
    </svg>
  );
}
