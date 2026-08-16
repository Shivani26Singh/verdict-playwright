"use strict";

/**
 * Single source of truth for the Meridian demo suite.
 *
 * Everything else in this project is derived from this catalog:
 *   - scripts/generate-ci-history.js turns it into RUNS runs of analyzer-format JSON
 *   - the tests/*.spec.js files mirror these titles
 *   - docs/FEATURE_MAP.md and docs/RULE_MAP.md are generated from it
 *
 * Meridian is a fictional B2B analytics & delivery platform (app.meridian.io).
 * Roles: owner, admin, manager, analyst, billing-admin, viewer.
 *
 * Each FAILING/FLAKY test carries a real Playwright-style error whose wording is
 * chosen so the analyzer's rule engine reaches exactly one investigation rule
 * (verified by scripts/verify-catalog.js) — no forced or fake failures.
 */

const BROWSERS = ["chromium", "firefox", "webkit"];
const RUNS = 20; // captured CI history (results-run1.json … results-run20.json)

// Playwright-style call log block appended to messages for realism.
const callLog = (lines) => "\nCall log:\n" + lines.map((l) => "  - " + l).join("\n");
const st = (frames) => "Error: \n" + frames.map((f) => "    at " + f).join("\n");

/**
 * FAILING = every non-stable-pass test.
 * fields: file, suite, title, cls, rule (expected RC code), projects (default all),
 *   pattern (explicit P/F string over RUNS, optional), perProject (map project->{cls|pattern}),
 *   retries ({attempts, recovered}), evidence ({shot,video,trace}), error {message, stack}
 */
const FAILING = [
  // ── RC-009 click-timeout · flaky · retry recovers · full evidence ──
  {
    file: "billing.spec.js", suite: "Billing", title: "confirms a declined card after the customer re-enters CVC",
    cls: "flaky", rule: "RC-009", retries: { attempts: 1, recovered: true }, evidence: { shot: "checkout-decline", trace: "checkout-decline", video: "checkout-decline" },
    error: {
      message: "locator.click: Timeout 15000ms exceeded." + callLog([
        "waiting for getByTestId('confirm-payment')",
        "locator resolved to <button data-testid=\"confirm-payment\" disabled>…</button>",
        "element is not enabled - waiting…",
      ]),
      stack: st(["Object.confirmPayment (tests/billing.spec.js:74:32)", "tests/billing.spec.js:69:5"]),
    },
  },
  // ── RC-001 timeout-error · flaky · retry recovers · trace+video ──
  {
    file: "reports.spec.js", suite: "Reports", title: "delivers the PDF export within the 30s SLA",
    cls: "flaky", rule: "RC-001", retries: { attempts: 1, recovered: true }, evidence: { shot: "export-crash", trace: "export-crash" },
    error: {
      message: "Timeout 30000ms exceeded." + callLog([
        "waiting for getByText('Your export is ready')",
        "waiting for the export worker to finish generating report_q3.pdf",
      ]),
      stack: st(["tests/reports.spec.js:118:20"]),
    },
  },
  // ── RC-008 element-not-visible · flaky · screenshot (no timeout wording) ──
  {
    file: "projects.spec.js", suite: "Projects", title: "shows the archived banner after archiving a project",
    cls: "flaky", rule: "RC-008", retries: { attempts: 1, recovered: false }, evidence: { shot: "archive-hidden" },
    error: {
      message: "expect(locator).toBeVisible() failed: element is not visible" + callLog([
        "locator getByRole('status', { name: 'Project archived' })",
        "element is present in the DOM but has 'opacity: 0' from an unfinished transition",
      ]),
      stack: st(["tests/projects.spec.js:201:44"]),
    },
  },
  // ── RC-010 element-detached · flaky · webkit-only · screenshot+trace ──
  {
    file: "tasks.spec.js", suite: "Tasks", title: "reorders a task via drag and drop",
    cls: "stable_pass", rule: "RC-010", retries: { attempts: 1, recovered: false }, evidence: { shot: "drag-detached", trace: "drag-detached" },
    perProject: { webkit: { cls: "flaky", pattern: "PFPFPFPFPFPFPFPFPFPF" } },
    error: {
      message: "elementHandle.dispatchEvent: Element is detached from the DOM" + callLog([
        "the drag source was re-rendered by a list virtualization pass mid-gesture",
      ]),
      stack: st(["Object.dragCard (tests/tasks.spec.js:88:26)", "tests/tasks.spec.js:83:5"]),
    },
  },
  // ── RC-011 strict-mode-violation · stable_failure · screenshot+trace ──
  {
    file: "projects.spec.js", suite: "Projects", title: "opens the editor for a single selected row",
    cls: "stable_failure", rule: "RC-011", retries: { attempts: 2, recovered: false }, evidence: { shot: "duplicate-strict", trace: "duplicate-strict" },
    error: {
      message: "locator.click: Error: strict mode violation: getByRole('row', { name: /Acme/ }) resolved to 3 elements:" + callLog([
        "1) <tr class=\"project-row\">Acme — Prod</tr>",
        "2) <tr class=\"project-row\">Acme — Staging</tr>",
        "3) <tr class=\"project-row\">Acme — Sandbox</tr>",
      ]),
      stack: st(["tests/projects.spec.js:142:38"]),
    },
  },
  // ── RC-002 locator-not-found · newly_failed · screenshot ──
  {
    file: "users.spec.js", suite: "User Management", title: "opens the invite dialog from the members toolbar",
    cls: "newly_failed", rule: "RC-002", retries: { attempts: 0, recovered: false }, evidence: { shot: "invite-missing", trace: "invite-missing" },
    error: {
      message: "locator.fill: Error: no such element: could not find getByTestId('invite-email')" + callLog([
        "the invite dialog markup changed to lazy-mount its form on open",
      ]),
      stack: st(["tests/users.spec.js:57:41"]),
    },
  },
  // ── RC-012 to-have-text · fixed · firefox-only failing history · screenshot ──
  {
    file: "dashboard.spec.js", suite: "Dashboard", title: "formats the revenue tile as localized currency",
    cls: "newly_failed", rule: "RC-012", retries: { attempts: 0, recovered: false }, evidence: { shot: "kpi-mismatch" },
    perProject: { firefox: { cls: "newly_failed", pattern: "PPPPPPPPPPPPPPPPPPPF" }, chromium: { cls: "stable_pass" }, webkit: { cls: "stable_pass" } },
    error: {
      message: "expect(received).toHaveText(expected) failed\n\nExpected string: \"$1,284,300\"\nReceived string: \"$1 284 300\"" + callLog([
        "getByTestId('kpi-revenue') on the dashboard header",
        "Intl.NumberFormat grouped with a narrow no-break space under the fr-CA locale",
      ]),
      stack: st(["tests/dashboard.spec.js:96:39"]),
    },
  },
  // ── RC-013 to-have-title · newly_failed ──
  {
    file: "authentication.spec.js", suite: "Authentication", title: "lands on the workspace after the SSO callback",
    cls: "newly_failed", rule: "RC-013", retries: { attempts: 0, recovered: false }, evidence: { shot: "sso-title" },
    error: {
      message: "expect(page).toHaveTitle(expected) failed\n\nExpected pattern: /Meridian · Workspace/\nReceived string:  \"Meridian · Sign in\"" + callLog([
        "the SSO callback bounced back to /login because the state nonce had rotated",
      ]),
      stack: st(["tests/authentication.spec.js:132:34"]),
    },
  },
  // ── RC-003 assertion-failure · fixed · screenshot ──
  {
    file: "analytics.spec.js", suite: "Analytics", title: "reconciles funnel totals against the source dataset",
    cls: "fixed", rule: "RC-003", retries: { attempts: 0, recovered: false }, evidence: { shot: "kpi-mismatch", trace: "kpi-mismatch" },
    error: {
      message: "expect(received).toEqual(expected)\n\n- Expected  - 1\n+ Received  + 1\n\n  Object {\n-   \"funnelTotal\": 40321,\n+   \"funnelTotal\": 40318,\n  }",
      stack: st(["tests/analytics.spec.js:73:47"]),
    },
  },
  // ── RC-004 network-error · flaky · (ECONNREFUSED / fetch failed) ──
  {
    file: "notifications.spec.js", suite: "Notifications", title: "reconnects the live feed after a socket drop",
    cls: "flaky", rule: "RC-004", retries: { attempts: 1, recovered: true }, evidence: { shot: "stream-reset" },
    error: {
      message: "WebSocket handshake failed: fetch failed (connect ECONNREFUSED 10.4.12.8:443)" + callLog([
        "the notifications gateway was mid-rolling-restart when the client reconnected",
      ]),
      stack: st(["Object.openFeed (tests/notifications.spec.js:44:19)", "tests/notifications.spec.js:39:5"]),
    },
  },
  // ── RC-014 net-err · stable_failure · trace (net::ERR_) ──
  {
    file: "reports.spec.js", suite: "Reports", title: "streams the CSV export from the CDN edge",
    cls: "stable_failure", rule: "RC-014", retries: { attempts: 2, recovered: false }, evidence: { shot: "export-crash", trace: "export-crash" },
    error: {
      message: "page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://cdn.meridian.io/exports/stream" + callLog([
        "navigating to the signed CDN URL returned by POST /api/v2/reports/export",
      ]),
      stack: st(["tests/reports.spec.js:164:16"]),
    },
  },
  // ── RC-019 econnreset · flaky · screenshot+video ──
  {
    file: "analytics.spec.js", suite: "Analytics", title: "keeps the realtime metrics stream connected",
    cls: "flaky", rule: "RC-019", retries: { attempts: 1, recovered: true }, evidence: { shot: "stream-reset" },
    error: {
      message: "request to https://stream.meridian.io/v2/metrics failed, reason: read ECONNRESET" + callLog([
        "the edge terminated the keep-alive connection after 60s idle",
      ]),
      stack: st(["TLSSocket.onConnectEnd (node:_tls_wrap:1704:8)", "tests/analytics.spec.js:145:22"]),
    },
  },
  // ── RC-015 http-401 · flaky (session expiry) ──
  {
    file: "authentication.spec.js", suite: "Authentication", title: "keeps the session valid across two open tabs",
    cls: "flaky", rule: "RC-015", retries: { attempts: 1, recovered: true }, evidence: { shot: "session-expired" },
    error: {
      message: "APIRequestContext.get: 401 Unauthorized (GET /api/v2/session) — access token expired mid-test" + callLog([
        "the 15-minute access token lapsed before the silent refresh completed",
      ]),
      stack: st(["tests/authentication.spec.js:188:40"]),
    },
  },
  // ── RC-016 http-403 · stable_failure (permission) ──
  {
    file: "users.spec.js", suite: "User Management", title: "blocks a non-admin from opening the admin console",
    cls: "stable_failure", rule: "RC-016", retries: { attempts: 0, recovered: false }, evidence: { shot: "session-expired" },
    error: {
      message: "GET /api/v2/admin/console responded 403 Forbidden — permission denied: scope 'admin:read' required" + callLog([
        "the analyst service account lost the 'admin:read' scope after a role migration",
      ]),
      stack: st(["tests/users.spec.js:114:33"]),
    },
  },
  // ── RC-017 http-404 · stable_failure (deleted deep link) ──
  {
    file: "projects.spec.js", suite: "Projects", title: "shows a friendly page for a deleted project deep link",
    cls: "stable_failure", rule: "RC-017", retries: { attempts: 0, recovered: false }, evidence: {},
    error: {
      message: "GET /api/v2/projects/prj_9f2a41 responded 404 Not Found — the seeded project was pruned by the nightly cleanup",
      stack: st(["tests/projects.spec.js:233:29"]),
    },
  },
  // ── RC-018 http-500 · stable_failure (backend 500) · screenshot+trace ──
  {
    file: "billing.spec.js", suite: "Billing", title: "generates the monthly invoice for an enterprise plan",
    cls: "stable_failure", rule: "RC-018", retries: { attempts: 2, recovered: false }, evidence: { shot: "invoice-500", trace: "invoice-500" },
    error: {
      message: "POST /api/v2/billing/invoices responded 500 Internal Server Error — proration ledger returned a negative line item" + callLog([
        "the invoice engine failed to reconcile a mid-cycle plan downgrade",
      ]),
      stack: st(["tests/billing.spec.js:151:35"]),
    },
  },
  // ── RC-020 target-closed · stable_failure (tab crash on huge export) · screenshot+trace ──
  {
    file: "reports.spec.js", suite: "Reports", title: "renders a 50k-row report without crashing the tab",
    cls: "stable_failure", rule: "RC-020", retries: { attempts: 1, recovered: false }, evidence: { shot: "export-crash", trace: "export-crash" },
    error: {
      message: "page.screenshot: Target page, context or browser has been closed" + callLog([
        "the render tab grew past 2GB and was terminated by the OS out-of-memory killer",
      ]),
      stack: st(["tests/reports.spec.js:279:24"]),
    },
  },
  // ── RC-005 always-fails · stable_failure (backend 503 upstream, consistently broken) ──
  {
    file: "billing.spec.js", suite: "Billing", title: "loads the subscription summary card",
    cls: "stable_failure", rule: "RC-005", retries: { attempts: 0, recovered: false }, evidence: { shot: "invoice-500" },
    error: {
      message: "GET /api/v2/billing/subscription responded 503 Service Unavailable — upstream dependency 'ledger-svc' is unavailable" + callLog([
        "the ledger service has been down since the sprint-14 deploy",
      ]),
      stack: st(["tests/billing.spec.js:38:28"]),
    },
  },
  // ── RC-006 rapid-alternation · flaky (race condition, strict alternation, unknown category) ──
  {
    file: "dashboard.spec.js", suite: "Dashboard", title: "updates the live metrics widget on each tick",
    cls: "flaky", rule: "RC-006", pattern: "PFPFPFPFPFPFPFPFPFPF", retries: { attempts: 0, recovered: false }, evidence: { shot: "toast-race" },
    error: {
      message: "metrics socket delivered frame 7 before frame 6; the widget reconciled stale state and the sparkline diverged from the store",
      stack: st(["Object.onFrame (tests/dashboard.spec.js:158:17)", "tests/dashboard.spec.js:150:5"]),
    },
  },
  // ── RC-007 generic-failure · newly_failed (unknown one-off) ──
  {
    file: "settings.spec.js", suite: "Settings", title: "persists the selected theme across a reload",
    cls: "newly_failed", rule: "RC-007", retries: { attempts: 0, recovered: false }, evidence: { shot: "toast-race" },
    error: {
      message: "prefers-color-scheme resolved to 'light' after the user applied 'dark'; the --mode custom property was never committed to :root",
      stack: st(["tests/settings.spec.js:64:22"]),
    },
  },
  // ── EXTRA realism / category coverage (reuse rules, distinct failures) ──
  // SSL failure -> net-err (network category) · stable_failure
  {
    file: "reports.spec.js", suite: "Reports", title: "downloads the signed audit report over TLS",
    cls: "stable_failure", rule: "RC-014", retries: { attempts: 0, recovered: false }, evidence: {},
    error: {
      message: "page.goto: net::ERR_CERT_AUTHORITY_INVALID at https://files.meridian.io/audit/2026-q1.pdf" + callLog([
        "the file-service certificate was reissued by an intermediate CA not yet trusted by the runner image",
      ]),
      stack: st(["tests/reports.spec.js:312:16"]),
    },
  },
  // DNS failure -> network-error (ENOTFOUND) · stable_failure
  {
    file: "analytics.spec.js", suite: "Analytics", title: "loads the third-party benchmark feed",
    cls: "stable_failure", rule: "RC-004", retries: { attempts: 0, recovered: false }, evidence: {},
    error: {
      message: "page.goto: getaddrinfo ENOTFOUND benchmarks.partner-cdn.io" + callLog([
        "the partner CDN hostname stopped resolving after their DNS migration",
      ]),
      stack: st(["tests/analytics.spec.js:206:16"]),
    },
  },
  // DATA category -> generic (partial payload) · newly_failed
  {
    file: "dashboard.spec.js", suite: "Dashboard", title: "renders the header when the profile payload is partial",
    cls: "newly_failed", rule: "RC-007", retries: { attempts: 0, recovered: false }, evidence: {},
    error: {
      message: "TypeError: Cannot read properties of undefined (reading 'displayName')" + callLog([
        "GET /api/v2/me returned a profile without 'displayName' for SCIM-provisioned users",
      ]),
      stack: st(["renderHeader (tests/dashboard.spec.js:41:58)", "tests/dashboard.spec.js:36:5"]),
    },
  },
  // ENVIRONMENT category -> always-fails (missing env var) · stable_failure
  {
    file: "settings.spec.js", suite: "Settings", title: "loads feature flags from the environment config",
    cls: "stable_failure", rule: "RC-005", retries: { attempts: 0, recovered: false }, evidence: {},
    error: {
      message: "Error: required environment variable MERIDIAN_FLAGS_URL is not set; the feature-flag client fell back to about:blank" + callLog([
        "the staging runner was provisioned without the flags secret after the vault rotation",
      ]),
      stack: st(["loadFlags (tests/settings.spec.js:29:11)", "tests/settings.spec.js:24:5"]),
    },
  },
  // Rate limiting -> generic (429) · flaky, retry partial
  {
    file: "notifications.spec.js", suite: "Notifications", title: "bulk-marks 500 notifications as read",
    cls: "flaky", rule: "RC-007", pattern: "PPPPPPPPPPPPPPPPPFPP", retries: { attempts: 2, recovered: false }, evidence: { shot: "stream-reset" },
    error: {
      message: "POST /api/v2/notifications/bulk-read responded 429 Too Many Requests — rate limited by the gateway (retry-after: 30)" + callLog([
        "the bulk endpoint throttles above 200 ids per second",
      ]),
      stack: st(["tests/notifications.spec.js:98:37"]),
    },
  },
  // Auth expired mid-run -> http-401 (reuse) · flaky, admin audit
  {
    file: "admin.spec.js", suite: "Administration", title: "exports the audit log as the workspace owner",
    cls: "flaky", rule: "RC-015", retries: { attempts: 1, recovered: true }, evidence: { shot: "session-expired", trace: "session-expired" },
    error: {
      message: "APIRequestContext.post: 401 Unauthorized (POST /api/v2/audit/export) — the owner's step-up MFA session expired after 5 minutes",
      stack: st(["tests/admin.spec.js:77:31"]),
    },
  },
  // Regression -> was fixed, failing again · assertion category (RC-003 reuse)
  {
    file: "analytics.spec.js", suite: "Analytics", title: "keeps cohort retention stable after a data backfill",
    cls: "regression", rule: "RC-003", pattern: "FPPPPPPPPPPPPPPPPPPF", retries: { attempts: 0, recovered: false }, evidence: { shot: "kpi-mismatch" },
    error: {
      message: "expect(received).toBeCloseTo(expected, 2)\n\nExpected: 0.74\nReceived: 0.71" + callLog([
        "the sprint-16 backfill re-bucketed week-0 cohorts and retention drifted again",
      ]),
      stack: st(["tests/analytics.spec.js:98:52"]),
    },
  },
  // ── Passing on Retry · green everywhere, but the latest run only passed on a retry ──
  // Overall history is all-passed (the retry recovers), so it classifies stable_pass —
  // yet the analyzer flags that the latest run needed a retry. Demonstrates the
  // "flake hiding inside a green" case.
  {
    file: "billing.spec.js", suite: "Billing", title: "completes checkout with a saved card",
    cls: "stable_pass", rule: "RC-009", pattern: "PPPPPPPPPPPPPPPPPPPP", retries: { attempts: 1, recovered: true }, evidence: { shot: "checkout-decline", trace: "checkout-decline" },
    error: {
      message: "locator.click: Timeout 15000ms exceeded." + callLog([
        "waiting for getByTestId('pay-now')",
        "the Stripe payment iframe had not finished mounting on the first attempt",
      ]),
      stack: st(["Object.pay (tests/billing.spec.js:52:29)", "tests/billing.spec.js:47:5"]),
    },
  },
  // ── WebKit-only failures · concentrate breakage on one browser so Browser Statistics ──
  // ── clearly shows WebKit as the weakest project (real Safari/WebKit quirks). ──
  // RC-002 locator · WebKit renders the native date control, so the custom trigger is absent
  {
    file: "admin.spec.js", suite: "Administration", title: "opens the date-range picker in the audit log",
    cls: "stable_failure", rule: "RC-002", retries: { attempts: 1, recovered: false }, evidence: { shot: "session-expired" },
    perProject: { chromium: { cls: "stable_pass" }, firefox: { cls: "stable_pass" } },
    error: {
      message: "locator.click: Error: no such element: could not find getByRole('button', { name: 'Choose date' })" + callLog([
        "WebKit rendered the native date input instead of the custom picker, so the trigger button is absent",
      ]),
      stack: st(["tests/admin.spec.js:151:37"]),
    },
  },
  // RC-008 element-not-visible · WebKit position:sticky repaint leaves the toolbar behind the scroller
  {
    file: "reports.spec.js", suite: "Reports", title: "keeps the export toolbar pinned while scrolling",
    cls: "stable_failure", rule: "RC-008", retries: { attempts: 1, recovered: false }, evidence: { shot: "export-crash", trace: "export-crash" },
    perProject: { chromium: { cls: "stable_pass" }, firefox: { cls: "stable_pass" } },
    error: {
      message: "expect(locator).toBeVisible() failed: element is not visible" + callLog([
        "locator getByTestId('export-toolbar')",
        "WebKit's position:sticky repaint left the toolbar behind the scroll container",
      ]),
      stack: st(["tests/reports.spec.js:341:44"]),
    },
  },
  // RC-001 timeout · WebKit never fires animationend, so the counter never settles
  {
    file: "dashboard.spec.js", suite: "Dashboard", title: "animates the KPI counters on first paint",
    cls: "stable_failure", rule: "RC-001", retries: { attempts: 1, recovered: false }, evidence: { shot: "kpi-mismatch" },
    perProject: { chromium: { cls: "stable_pass" }, firefox: { cls: "stable_pass" } },
    error: {
      message: "Timeout 30000ms exceeded." + callLog([
        "waiting for getByTestId('kpi-counter') to reach its final value",
        "WebKit did not fire the animationend event, so the counter never settled",
      ]),
      stack: st(["tests/dashboard.spec.js:212:20"]),
    },
  },
  // RC-010 element-detached · WebKit re-renders the virtualized list mid-expand
  {
    file: "tasks.spec.js", suite: "Tasks", title: "expands a nested subtask row",
    cls: "stable_failure", rule: "RC-010", retries: { attempts: 1, recovered: false }, evidence: { shot: "drag-detached", trace: "drag-detached" },
    perProject: { chromium: { cls: "stable_pass" }, firefox: { cls: "stable_pass" } },
    error: {
      message: "elementHandle.dispatchEvent: Element is detached from the DOM" + callLog([
        "WebKit re-rendered the virtualized task list mid-expand, detaching the subtask row",
      ]),
      stack: st(["tests/tasks.spec.js:126:26"]),
    },
  },
];

/**
 * SKIPPED = tests that were skipped in the captured history (test.skip / conditional skip /
 * quarantine). Not failures — surfaced separately so a skip introduced by a flag or an
 * env change doesn't go unnoticed. `pattern` uses "P" (passed) and "S" (skipped) over RUNS.
 */
const SKIPPED = [
  // Skipped only in the latest run — the EU-VAT feature flag is off in the current staging env.
  { file: "billing.spec.js", suite: "Billing", title: "charges VAT for EU customers", pattern: "PPPPPPPPPPPPPPPPPPPS" },
  // Quarantined for the whole window (test.fixme) pending a fix for the external mail sandbox.
  { file: "reports.spec.js", suite: "Reports", title: "emails a scheduled report to an external address", pattern: "SSSSSSSSSSSSSSSSSSSS" },
];

/**
 * PASSING = stable-pass tests (realistic names). `slow` seeds the Slowest Tests widget.
 * Each runs on all three browsers unless projects is given.
 */
const PASSING = [
  { file: "authentication.spec.js", suite: "Authentication", title: "signs in with email and password" },
  { file: "authentication.spec.js", suite: "Authentication", title: "rejects an invalid password with an inline error" },
  { file: "authentication.spec.js", suite: "Authentication", title: "sends a password-reset email" },
  { file: "authentication.spec.js", suite: "Authentication", title: "signs the user out and clears the session" },
  { file: "authentication.spec.js", suite: "Authentication", title: "enforces MFA for owner accounts" },
  { file: "dashboard.spec.js", suite: "Dashboard", title: "loads the default workspace dashboard" },
  { file: "dashboard.spec.js", suite: "Dashboard", title: "switches the active workspace from the picker" },
  { file: "dashboard.spec.js", suite: "Dashboard", title: "filters KPI tiles by the last 7 days" },
  { file: "dashboard.spec.js", suite: "Dashboard", title: "pins a saved view to the sidebar" },
  { file: "projects.spec.js", suite: "Projects", title: "creates a project from a template" },
  { file: "projects.spec.js", suite: "Projects", title: "renames a project inline" },
  { file: "projects.spec.js", suite: "Projects", title: "filters the project list by status" },
  { file: "projects.spec.js", suite: "Projects", title: "moves a project into a folder", slow: true },
  { file: "projects.spec.js", suite: "Projects", title: "restores an archived project" },
  { file: "tasks.spec.js", suite: "Tasks", title: "creates a task with an assignee and due date" },
  { file: "tasks.spec.js", suite: "Tasks", title: "moves a task across board columns" },
  { file: "tasks.spec.js", suite: "Tasks", title: "adds a comment and @mentions a teammate" },
  { file: "tasks.spec.js", suite: "Tasks", title: "bulk-closes completed tasks" },
  { file: "tasks.spec.js", suite: "Tasks", title: "filters tasks by label and assignee" },
  { file: "reports.spec.js", suite: "Reports", title: "builds a report from the query editor", slow: true },
  { file: "reports.spec.js", suite: "Reports", title: "saves a report to the shared library" },
  { file: "reports.spec.js", suite: "Reports", title: "schedules a weekly email report" },
  { file: "analytics.spec.js", suite: "Analytics", title: "renders the acquisition funnel" },
  { file: "analytics.spec.js", suite: "Analytics", title: "drills into a cohort from the retention grid", slow: true },
  { file: "analytics.spec.js", suite: "Analytics", title: "compares two date ranges side by side" },
  { file: "analytics.spec.js", suite: "Analytics", title: "exports a chart as PNG" },
  { file: "billing.spec.js", suite: "Billing", title: "adds a payment method" },
  { file: "billing.spec.js", suite: "Billing", title: "upgrades from Team to Business" },
  { file: "billing.spec.js", suite: "Billing", title: "applies a coupon at checkout" },
  { file: "billing.spec.js", suite: "Billing", title: "downloads a past invoice as PDF" },
  { file: "notifications.spec.js", suite: "Notifications", title: "shows an unread badge for new mentions" },
  { file: "notifications.spec.js", suite: "Notifications", title: "opens a notification and marks it read" },
  { file: "notifications.spec.js", suite: "Notifications", title: "updates email digest preferences" },
  { file: "users.spec.js", suite: "User Management", title: "lists members with their roles" },
  { file: "users.spec.js", suite: "User Management", title: "changes a member's role to manager" },
  { file: "users.spec.js", suite: "User Management", title: "removes a member from the workspace" },
  { file: "users.spec.js", suite: "User Management", title: "resends a pending invitation" },
  { file: "admin.spec.js", suite: "Administration", title: "configures SSO with a SAML metadata URL", slow: true },
  { file: "admin.spec.js", suite: "Administration", title: "sets the workspace data-retention window" },
  { file: "admin.spec.js", suite: "Administration", title: "filters the audit log by actor and action" },
  { file: "settings.spec.js", suite: "Settings", title: "updates the workspace display name" },
  { file: "settings.spec.js", suite: "Settings", title: "connects a Slack integration" },
  { file: "settings.spec.js", suite: "Settings", title: "regenerates a personal API token" },
];

module.exports = { BROWSERS, RUNS, FAILING, PASSING, SKIPPED };
