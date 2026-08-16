import { useNpmVersion } from "../hooks/useNpmVersion";
import { NPM_URL } from "../config";

export default function NpmVersionBadge({ className = "" }) {
  const { status, version } = useNpmVersion();

  return (
    <a
      href={NPM_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-ink-800/70 px-3 py-1 font-mono text-xs text-paper-dim transition hover:border-signal/40 hover:text-signal ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-signal" />
      {status === "ready" && version ? (
        <span>
          latest version <span className="text-paper">{version}</span>
        </span>
      ) : status === "loading" ? (
        <span>checking latest release…</span>
      ) : (
        <span>latest release on npm</span>
      )}
    </a>
  );
}
