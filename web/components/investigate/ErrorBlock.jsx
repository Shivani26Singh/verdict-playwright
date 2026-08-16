/**
 * The captured error, split into the parts a QA engineer reads separately:
 * the message, the call log, and where in the test it happened.
 * Never a raw JSON dump.
 */
function Mono({ children }) {
  return (
    <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
      {children}
    </pre>
  );
}

export default function ErrorBlock({ error, code }) {
  if (!error && !code) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Error detail</h3>
        <p className="mt-2 text-sm text-slate-500">
          No structured error was captured for this failure.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700">Error detail</h3>

      {error ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Error message
          </div>
          <Mono>{error.header}</Mono>
        </div>
      ) : null}

      {error && (error.expected || error.received) ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {error.expected ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Expected
              </div>
              <Mono>{error.expected}</Mono>
            </div>
          ) : null}
          {error.received ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Received
              </div>
              <Mono>{error.received}</Mono>
            </div>
          ) : null}
        </div>
      ) : null}

      {error && error.locator ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Locator
          </div>
          <Mono>{error.locator}</Mono>
        </div>
      ) : null}

      {error && error.callLog ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Call log
          </div>
          <Mono>{error.callLog}</Mono>
        </div>
      ) : null}

      {code && code.location ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Code location
          </div>
          <p className="mt-1 font-mono text-sm text-sky-700">{code.location}</p>
        </div>
      ) : null}

      {code && (code.codeFrame || code.stackTrace) ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            {code.codeFrame ? "Code frame & stack trace" : "Stack trace"}
          </summary>
          {code.codeFrame ? <Mono>{code.codeFrame}</Mono> : null}
          {code.stackTrace ? <Mono>{code.stackTrace}</Mono> : null}
        </details>
      ) : null}
    </div>
  );
}
