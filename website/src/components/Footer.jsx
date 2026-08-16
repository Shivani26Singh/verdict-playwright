import { AUTHOR_LINKEDIN_URL, AUTHOR_NAME } from "../config";

export default function Footer() {
  return (
    <footer className="border-t border-line/60 bg-ink-950">
      <div className="container-page flex flex-col items-start justify-between gap-2 py-6 text-xs text-paper-dim/70 sm:flex-row sm:items-center">
        <span>MIT Licensed. Not affiliated with Microsoft or the Playwright project.</span>
        <a
          href={AUTHOR_LINKEDIN_URL}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-signal underline underline-offset-2 transition hover:opacity-80"
        >
          By {AUTHOR_NAME}
        </a>
      </div>
    </footer>
  );
}
