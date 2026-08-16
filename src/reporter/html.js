"use strict";

var CSS = [
  ":root{",
  "--bg:#ffffff;--surface:#f8f9fa;--border:#e9ecef;--border-light:#f1f3f5;",
  "--text:#212529;--text-secondary:#6c757d;--text-muted:#94a3b8;",
  "--green:#28a745;--green-bg:#d4edda;--green-text:#155724;",
  "--red:#dc3545;--red-bg:#f8d7da;--red-text:#721c24;",
  "--yellow:#ffc107;--yellow-bg:#fff3cd;--yellow-text:#856404;",
  "--blue:#0d6efd;--blue-bg:#cce5ff;--blue-text:#004085;",
  "--purple:#6f42c1;--purple-bg:#e8d5f5;--purple-text:#553098;",
  "--teal:#20c997;--teal-bg:#d2f4ea;",
  "--orange:#fd7e14;--orange-bg:#ffe5d0;",
  "--shadow-sm:0 1px 2px rgba(0,0,0,0.05);",
  "--shadow:0 1px 3px rgba(0,0,0,0.08);",
  "--shadow-hover:0 4px 12px rgba(0,0,0,0.12);",
  "--radius:10px;--radius-sm:6px;",
  "--font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;",
  "--mono:'SF Mono',Monaco,'Cascadia Code',Consolas,monospace;",
  "}",
  "@media (prefers-color-scheme:dark){",
  ":root{",
  "--bg:#0d1117;--surface:#161b22;--border:#30363d;--border-light:#21262d;",
  "--text:#e6edf3;--text-secondary:#8b949e;--text-muted:#5c6570;",
  "--green:#3fb950;--green-bg:rgba(63,185,80,0.12);--green-text:#7ee787;",
  "--red:#f85149;--red-bg:rgba(248,81,73,0.12);--red-text:#ffa198;",
  "--yellow:#d29922;--yellow-bg:rgba(210,153,34,0.15);--yellow-text:#e3b341;",
  "--blue:#58a6ff;--blue-bg:rgba(88,166,255,0.12);--blue-text:#a5d6ff;",
  "--purple:#bc8cff;--purple-bg:rgba(188,140,255,0.12);--purple-text:#d4bfff;",
  "--teal:#7ee787;--teal-bg:rgba(126,231,135,0.12);",
  "--orange:#f0883e;--orange-bg:rgba(240,136,62,0.12);",
  "--shadow-sm:0 1px 2px rgba(0,0,0,0.2);",
  "--shadow:0 1px 3px rgba(0,0,0,0.3);",
  "--shadow-hover:0 4px 12px rgba(0,0,0,0.4);",
  "}",
  "}",
  "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
  "body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.5;min-height:100vh;-webkit-font-smoothing:antialiased}",
  "h2{font-family:'Segoe UI Semibold','Segoe UI',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:900;color:var(--text);letter-spacing:.04em;text-transform:uppercase}",
  ".header{background:linear-gradient(180deg,var(--surface) 0%,var(--bg) 100%);border-bottom:2px solid var(--blue);padding:16px 24px;box-shadow:var(--shadow-sm)}",
  ".header-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}",
  ".header-left h1{font-size:19px;font-weight:800;color:var(--text);letter-spacing:-.01em}",
  ".header-meta{font-size:11.5px;color:var(--text-secondary);font-weight:500}",
  ".header-chips{display:flex;gap:6px;flex-wrap:wrap}",
  ".chip{display:flex;align-items:center;gap:4px;padding:4px 12px;border-radius:14px;font-size:11px;font-weight:700;letter-spacing:.02em;box-shadow:var(--shadow-sm)}",
  ".chip-red{background:var(--red-bg);color:var(--red-text)}",
  ".chip-yellow{background:var(--yellow-bg);color:var(--yellow-text)}",
  ".chip-blue{background:var(--blue-bg);color:var(--blue-text)}",
  ".dashboard{max-width:1400px;margin:0 auto;padding:14px 24px 48px}",
  ".section{background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--blue);border-radius:var(--radius);margin-bottom:18px;overflow:hidden;box-shadow:var(--shadow)}",
  ".section.collapsed .section-body{display:none}",
  ".section-header{padding:12px 16px;border-bottom:2px solid var(--border);display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none}",
  ".section-header:hover{background:var(--border-light)}",
  ".section-toggle{font-size:13px;color:var(--text-secondary);transition:transform .2s}",
  ".section.collapsed .section-toggle{transform:rotate(-90deg)}",
  ".section-body{padding:14px 16px;background:var(--bg)}",
  ".cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}",
  ".card{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:13px 15px;box-shadow:var(--shadow-sm);transition:box-shadow .15s,transform .15s}",
  ".card:hover{box-shadow:var(--shadow-hover);transform:translateY(-1px)}",
  ".card .card-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary);margin-bottom:4px;font-weight:700}",
  ".card .card-value{font-size:26px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}",
  ".card .card-sub{font-size:11px;color:var(--text-secondary);margin-top:3px;font-weight:500}",
  ".card.accent-red{border-left:3px solid var(--red)}",
  ".card.accent-yellow{border-left:3px solid var(--yellow)}",
  ".card.accent-blue{border-left:3px solid var(--blue)}",
  ".card.accent-purple{border-left:3px solid var(--purple)}",
  ".card.accent-green{border-left:3px solid var(--green)}",
  ".card.accent-teal{border-left:3px solid var(--teal)}",
  ".card.accent-grey{border-left:3px solid var(--text-muted)}",
  ".bl-chart-wrap{width:100%;overflow-x:auto}",
  ".bl-bar-label{font-size:10px;font-weight:600;fill:var(--text-secondary)}",
  ".bl-value-label{font-size:10px;font-weight:700;fill:var(--text)}",
  ".badge{display:inline-block;padding:3px 9px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;letter-spacing:.03em}",
  ".badge-pass{background:var(--green-bg);color:var(--green-text)}",
  ".badge-fail{background:var(--red-bg);color:var(--red-text)}",
  ".badge-warn{background:var(--yellow-bg);color:var(--yellow-text)}",
  ".badge-info{background:var(--blue-bg);color:var(--blue-text)}",
  ".badge-muted{background:var(--border-light);color:var(--text-muted)}",
  ".empty-state{text-align:center;padding:20px 16px;color:var(--text-secondary);font-size:13px}",

  ".inv-toolbar{display:flex;gap:8px;align-items:center;padding:0 0 8px;flex-wrap:wrap}",
  ".inv-search{padding:7px 12px;border:1px solid var(--text-muted);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:12px;flex:1;min-width:200px;outline:none}",
  ".inv-search:focus{border-color:var(--purple);box-shadow:0 0 0 3px var(--purple-bg)}",
  ".inv-count{font-size:11px;color:var(--text-muted);white-space:nowrap}",
  ".inv-filter{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}",
  ".inv-filter .badge{cursor:pointer;transition:all .15s}",
  ".inv-filter .badge:hover{transform:translateY(-1px)}",

  ".inv-card{border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px;overflow:hidden;background:var(--bg);box-shadow:var(--shadow-sm);transition:box-shadow .15s}",
  ".inv-card.priority-critical{border-left:3px solid var(--red)}",
  ".inv-card.priority-medium{border-left:3px solid var(--purple)}",
  ".inv-card.priority-low{border-left:3px solid var(--text-muted)}",
  ".inv-card:hover{box-shadow:var(--shadow-hover)}",
  ".inv-card-header{padding:10px 14px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;transition:background .15s}",
  ".inv-card-header:hover{background:var(--border-light)}",
  ".inv-card-header:focus-visible{outline:2px solid var(--purple);outline-offset:-2px;border-radius:var(--radius-sm)}",
  ".inv-card-header::before{content:'\\25B8';font-size:12px;color:var(--text-muted);flex-shrink:0;transition:transform .15s;margin-right:2px}",
  ".inv-card.expanded>.inv-card-header::before{content:'\\25BE'}",
  ".inv-ev-ind{display:flex;gap:4px;flex-wrap:wrap;flex-shrink:0;margin-right:8px;align-items:center}",
  ".inv-ev-ind:empty{display:none}",
  ".inv-ev-badge{display:inline-flex;align-items:center;gap:2px;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:600;white-space:nowrap;background:var(--surface);color:var(--text-secondary);border:1px solid var(--border-light)}",
  ".inv-test-title{font-weight:700;font-size:13.5px;flex:1;min-width:160px;line-height:1.3}",
  ".inv-header-meta{display:flex;align-items:center;gap:5px;flex-shrink:0}",
  ".inv-history-strip{display:flex;gap:2px;flex-wrap:wrap;align-items:center;padding:8px 14px;border-bottom:1px solid var(--border-light)}",
  // Sized to fit a 2-digit run number (e.g. "20") as visible text, not just a
  // hover tooltip — with 20+ same-colored tiles in a row, which run is which
  // otherwise isn't clear without hovering each one individually.
  ".inv-run{width:18px;height:16px;border-radius:3px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:700;line-height:1;color:rgba(255,255,255,.92);font-variant-numeric:tabular-nums;cursor:default}",
  ".inv-run.run-pass{background:#2ea043}",
  ".inv-run.run-fail{background:#cf3b3b}",
  ".inv-run.run-other{background:#8b949e}",
  ".inv-history-label{font-size:10px;color:var(--text-secondary);margin-left:8px}",
  ".inv-short-error{padding:7px 14px;font-family:var(--mono);font-size:11.5px;font-weight:500;color:var(--red-text);background:var(--red-bg);border-bottom:1px solid var(--border-light);border-left:3px solid var(--red);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".inv-card-body{padding:0;display:none}",
  ".inv-card.expanded>.inv-card-body{display:block}",
  ".inv-field-group{background:var(--surface);padding:8px 14px;border-bottom:1px solid var(--border-light)}",
  ".inv-field-group:last-child{border-bottom:none}",
  ".inv-field{padding:0}",
  ".inv-field-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--blue);margin-bottom:4px}",
  ".inv-field-value{font-size:13.5px;font-weight:500;color:var(--text);line-height:1.5}",
  // pre-wrap (not the previous unset/normal default) so a multi-line
  // Playwright error — Locator/Expected/Received/Call log — actually reads
  // as multiple lines instead of collapsing into one run-on wall of text.
  ".inv-error-msg{font-family:var(--mono);font-size:11px;line-height:1.5;padding:7px 10px;margin:3px 0;background:var(--red-bg);border-left:3px solid var(--red);border-radius:0 3px 3px 0;color:var(--red-text);word-break:break-word;white-space:pre-wrap}",
  ".inv-full-error{font-family:var(--mono);font-size:11.5px;line-height:1.6;padding:10px 12px;margin:4px 0;background:#2d2d2d;color:#e0e0e0;border-radius:4px;white-space:pre;overflow-x:auto;max-height:420px;overflow-y:auto}",
  ".inv-full-error .line-current{background:rgba(248,81,73,0.25);display:inline-block;width:100%}",
  ".inv-full-error-summary{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--blue);cursor:pointer;padding:4px 0;list-style:none}",
  ".inv-full-error-summary::-webkit-details-marker{display:none}",
  ".inv-full-error-summary::before{content:'\\25B8';display:inline-block;margin-right:4px;transition:transform .15s}",
  "details[open]>.inv-full-error-summary::before{transform:rotate(90deg)}",
  // Locator/Expected/Received/Timeout mini-table on the Primary Error field —
  // only rows that were actually parsed out of the raw message are ever added.
  ".inv-error-fields{width:100%;border-collapse:collapse;margin:6px 0 8px;font-size:12px}",
  ".inv-error-fields th{text-align:left;padding:3px 10px 3px 0;font-weight:700;color:var(--text-secondary);white-space:nowrap;vertical-align:top;width:80px}",
  ".inv-error-fields td{padding:3px 0;font-family:var(--mono);color:var(--text);word-break:break-word}",
  "mark{background:var(--yellow-bg);color:var(--yellow-text);border-radius:2px;padding:0 1px}",

  ".inv-evidence-row{display:flex;gap:6px;flex-wrap:wrap;padding:5px 14px;border-bottom:1px solid var(--border-light);align-items:center}",
  ".inv-ev-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:4px;font-size:11px;text-decoration:none;cursor:pointer;border:1px solid var(--border);background:var(--surface);color:var(--text);transition:all .15s;min-width:120px;justify-content:center}",
  ".inv-ev-btn:hover{background:var(--purple-bg);color:var(--purple);border-color:var(--purple);transform:translateY(-1px)}",
  ".inv-ev-btn.disabled{opacity:0.3;cursor:default;pointer-events:none;transform:none}",
  ".inv-toggle-btn{background:var(--border-light);color:var(--blue-text);border-color:var(--text-muted)}",
  ".inv-toggle-btn:hover{background:var(--blue-bg);color:var(--blue-text);border-color:var(--blue)}",
  ".inv-ev-run-select{font-size:11px;font-weight:700;padding:3px 6px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;margin-left:8px;vertical-align:middle}",
  ".inv-screenshot-thumb{width:40px;height:30px;object-fit:cover;border-radius:3px;border:1px solid var(--border);cursor:pointer;transition:transform .15s}",
  ".inv-screenshot-thumb:hover{transform:scale(2.5);z-index:10;box-shadow:var(--shadow-hover)}",
  ".inv-checks{font-size:12px;background:var(--teal-bg);border-left:3px solid var(--teal);border-radius:0 4px 4px 0}",
  ".inv-checks summary{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text);cursor:pointer;padding:7px 14px;list-style:none;display:flex;align-items:center;justify-content:flex-start}",
  ".inv-checks summary::-webkit-details-marker{display:none}",
  ".inv-checks summary::before{content:'\\2713 ';color:var(--teal);font-weight:800}",
  ".inv-checks summary::after{content:'\\25B8';font-size:12px;color:var(--text-muted);transition:transform .15s;margin-left:auto}",
  ".inv-checks[open]>summary::after{transform:rotate(90deg)}",
  ".inv-checks ul{margin:0;list-style:none;padding:0 14px 10px 14px;font-size:12.5px;color:var(--text);line-height:1.7}",
  ".inv-checks li{position:relative;padding:3px 0 3px 20px}",
  ".inv-checks li::before{content:'\\2022';position:absolute;left:4px;color:var(--teal);font-weight:800;font-size:15px;line-height:1.5}",

  ".evidence-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer}",
  ".evidence-overlay img{max-width:95%;max-height:95%;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.6)}",

  ".advanced-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;align-items:stretch}",
  "#adv-root-cause{grid-column:1/-1}",
  ".advanced-block:empty{display:none}",
  ".advanced-block:not(:empty){background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;box-shadow:var(--shadow-sm);height:100%;box-sizing:border-box}",
  // Compact card header used by Browser Statistics / Failure Categories /
  // Failure Frequency / Slowest Tests — title only (no filled background, no
  // heavy accent border); a thin hairline separates it from the table below.
  // Root Cause Summary keeps its own distinct (self-contained) styling below.
  ".adv-card-header{padding-bottom:7px;margin-bottom:9px;border-bottom:1px solid var(--border-light)}",
  ".adv-card-title{display:block;margin:0;font-size:12px;font-weight:800;color:var(--text);letter-spacing:.03em;text-transform:uppercase;line-height:1.3;cursor:default}",
  ".adv-card-controls{display:flex;align-items:center;gap:6px;margin-top:6px}",
  ".adv-info-icon{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;background:var(--border-light);color:var(--text-secondary);font-size:9px;font-weight:700;font-style:normal;line-height:1;cursor:help;flex:0 0 auto}",
  ".scope-toggle{display:inline-flex;gap:1px;background:var(--border-light);border-radius:5px;padding:2px}",
  ".scope-btn{font-size:10px;font-weight:700;padding:2px 7px;border-radius:3px;cursor:pointer;color:var(--text-secondary);text-transform:none;letter-spacing:0;transition:background .15s,color .15s}",
  ".scope-btn:hover{color:var(--text)}",
  ".scope-btn.active{background:var(--bg);color:var(--text);box-shadow:var(--shadow-sm)}",
  ".scope-btn.active:hover{color:var(--text)}",
  // Root Cause Summary's header is intentionally distinct (a warning-flagged,
  // self-contained style) — every property below used to be inherited from
  // the old shared `.advanced-block h3` rule; inlined here so removing that
  // shared rule above doesn't change how this one card looks.
  "#adv-root-cause h3{font-size:13.5px;font-weight:800;margin-bottom:8px;padding:8px 12px;background:linear-gradient(90deg,var(--red-bg) 0%,var(--border-light) 55%);border-left:3px solid var(--red);border-radius:0 4px 4px 0;cursor:default;letter-spacing:.03em;text-transform:uppercase;color:var(--red-text)}",
  "#adv-root-cause h3::before{content:'\\26A0\\FE0F  ';}",

  "table{width:100%;border-collapse:collapse;font-size:11px}",
  "thead th{text-align:left;padding:6px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary);border-bottom:2px solid var(--border);background:var(--bg);position:sticky;top:0}",
  "tbody td{padding:5px 8px;font-size:11px;border-bottom:1px solid var(--border-light)}",
  "tbody tr:hover{background:var(--border-light)}",


  "@media (max-width:900px){",
  ".inv-test-title{min-width:120px;font-size:12px}",
  ".inv-header-meta{flex-wrap:wrap}",
  "}",

  "@media (max-width:768px){",
  ".header,.dashboard{padding-left:10px;padding-right:10px}",
  ".header-inner{flex-direction:column;align-items:flex-start}",
  ".cards{grid-template-columns:repeat(2,1fr)}",
  ".inv-toolbar{flex-direction:column}",
  ".inv-search{width:100%}",
  ".inv-card-header{flex-direction:column;align-items:flex-start;gap:6px}",
  ".inv-header-meta{align-self:flex-end}",
  ".inv-test-title{min-width:0;width:100%}",
  ".advanced-grid{grid-template-columns:1fr}",
  "}",
].join("");

// ── HTML builders ──

function buildHeader() {
  return [
    '<div class="header"><div class="header-inner">',
    '<div class="header-left"><h1 id="header-project"></h1><div class="header-meta" id="header-meta"></div></div>',
    '<div class="header-chips">',
    '<span class="chip chip-blue" id="chip-total" title="Passing + Flaky + Failed + Skipped — every distinct test tracked, one bucket each.">Total: 0</span>',
    '<span class="chip" style="background:var(--green-bg);color:var(--green-text)" id="chip-stable" title="Includes tests that needed a retry to pass in the latest run — see the count in parentheses.">Passing: 0</span>',
    '<span class="chip chip-yellow" id="chip-flaky">Flaky: 0</span>',
    '<span class="chip chip-red" id="chip-failed">Failed: 0</span>',
    '<span class="chip" style="background:var(--border-light);color:var(--text-secondary);border-left:2px solid var(--border)" id="chip-skipped" title="Skipped in the latest run — not a pass or a fail, but still counted in Total to its left as its own bucket.">Skipped: 0</span>',
    "</div></div></div>",
  ].join("");
}

function buildSuiteSummary() {
  return [
    '<div class="section"><div class="section-header"><h2>Suite Summary</h2><span class="section-toggle">&#9660;</span></div><div class="section-body"><div class="cards">',
    '<div class="card accent-blue" id="card-total" title="Distinct tests analyzed (one per browser), current state. Passing + Flaky + Newly Failing + Consistently Failing + Skipped all add up to this."><div class="card-label">Total Tests</div><div class="card-value">\u2014</div></div>',
    '<div class="card accent-green" id="card-stable" title="Green in the latest run \u2014 passed throughout, or previously failing and now recovered."><div class="card-label">Passing</div><div class="card-value">\u2014</div><div class="card-sub"></div></div>',
    '<div class="card accent-yellow" id="card-passing-retry" title="Currently passing, but only after 1+ retries in the latest run \u2014 counted within Passing above, shown separately because it\u2019s a softer flakiness signal classification alone hides."><div class="card-label">Passing on Retry</div><div class="card-value">\u2014</div><div class="card-sub"></div></div>',
    '<div class="card accent-yellow" id="card-flaky" title="Passes in some runs, fails in others (usually a timing/race issue)."><div class="card-label">Flaky</div><div class="card-value">\u2014</div><div class="card-sub"></div></div>',
    '<div class="card accent-red" id="card-newfail" title="Failing right now and wasn\u2019t a moment ago \u2014 either a first-time break, or a test that was previously fixed and has broken again (check recent changes near any prior fix first)."><div class="card-label">Newly Failing</div><div class="card-value">\u2014</div><div class="card-sub"></div></div>',
    '<div class="card accent-red" id="card-stablefail" title="Fails in every run (a real, reproducible break)."><div class="card-label">Consistently Failing</div><div class="card-value">\u2014</div><div class="card-sub"></div></div>',
    '<div class="card accent-grey" id="card-skipped" title="Skipped in the latest run (test.skip() or a conditional skip) \u2014 not a pass or a fail, and excluded from flaky/failing classification, but still counted in Total Tests above as its own bucket."><div class="card-label">Skipped</div><div class="card-value">\u2014</div><div class="card-sub"></div></div>',
    "</div></div></div>",
  ].join("");
}

function buildPassingOnRetryDetails() {
  return [
    '<div class="section" id="section-passing-on-retry">',
    '<div class="section-header"><h2>Passing on Retry — Details</h2><span class="section-toggle">&#9660;</span></div>',
    '<div class="section-body">',
    '<div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:10px">Tests currently passing (green in the latest run) that only got there after 1+ retries. These aren’t failures — classification correctly calls them stable — but the error below is what the first attempt hit before the retry recovered it.</div>',
    '<div id="passing-on-retry-content"></div></div></div>',
  ].join("");
}

function buildSkippedDetails() {
  return [
    '<div class="section collapsed" id="section-skipped">',
    '<div class="section-header"><h2>Skipped Tests — Details</h2><span class="section-toggle">&#9660;</span></div>',
    '<div class="section-body">',
    '<div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:10px">Tests skipped in the latest run (via test.skip() or a conditional skip). Not a pass or a fail — excluded from flaky/failing classification.</div>',
    '<div id="skipped-content"></div></div></div>',
  ].join("");
}

function buildInvestigation() {
  return [
    '<div class="section" id="section-investigation">',
    '<div class="section-header"><h2>Failed Tests</h2><span class="section-toggle">&#9660;</span></div>',
    '<div class="section-body">',
    '<div class="inv-toolbar"><input type="text" class="inv-search" id="global-search" placeholder="Search by test name, error, root cause..." oninput="debouncedSearch()"><span class="inv-count" id="inv-count"></span><span class="inv-ev-btn inv-toggle-btn" id="btn-expand-all" onclick="expandAllCards()" style="display:none">⬇ Expand All</span><span class="inv-ev-btn inv-toggle-btn" id="btn-collapse-all" onclick="collapseAllCards()" style="display:none">⬆ Collapse All</span></div>',
    '<div class="inv-filter" id="inv-filter-bar"></div>',
    '<div class="inv-filter" id="inv-category-bar"></div>',
    '<div id="investigation-empty" class="empty-state" style="display:none">&#x2705; No failing tests detected.</div>',
    '<div id="investigation-list"></div>',
    "</div></div>",
  ].join("");
}

function buildNarrativeSummary() {
  return [
    '<div class="section" id="section-runs-summary">',
    '<div class="section-header"><h2>Run Highlights</h2><span class="section-toggle">&#9660;</span></div>',
    '<div class="section-body"><div id="runs-summary-content"></div></div></div>',
  ].join("");
}

function buildAdvancedMetrics() {
  return [
    '<div class="section collapsed" id="section-advanced">',
    '<div class="section-header"><h2>Additional Metrics</h2><span class="section-toggle">&#9660;</span></div>',
    '<div class="section-body"><div class="advanced-grid">',
    '<div id="adv-root-cause" class="advanced-block"></div>',
    '<div id="adv-browsers" class="advanced-block"></div>',
    '<div id="adv-categories" class="advanced-block"></div>',
    '<div id="adv-frequency" class="advanced-block"></div>',
    '<div id="adv-slowest" class="advanced-block"></div>',
    "</div></div></div>",
  ].join("");
}

// High-level trend section — Flaky Tests Trend and Retries Per Run Trend are
// grouped together near the top of the report (right after Suite Summary) as
// two separate charts, both reading D.retryTimeline so they share the same
// Run 1...N ordering. Each keeps its own top-level section (not nested inside
// Additional Metrics) since they're the headline stability/retry picture.
function buildFlakyTrendSection() {
  return [
    '<div class="section" id="section-flaky-trend">',
    '<div class="section-header"><h2>Flaky Tests Trend</h2><span class="section-toggle">&#9660;</span></div>',
    '<div class="section-body"><div id="adv-flaky-trend" class="advanced-block"></div></div></div>',
  ].join("");
}

function buildRetriesTrendSection() {
  return [
    '<div class="section" id="section-retries-trend">',
    '<div class="section-header"><h2>Retries Per Run Trend</h2><span class="section-toggle">&#9660;</span></div>',
    '<div class="section-body"><div id="adv-retries" class="advanced-block"></div></div></div>',
  ].join("");
}

// ── Main generate ──

function generate(dashboard) {
  var dataJson = JSON.stringify(dashboard)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  var jsContent = [
    "var D=" + dataJson + ";",
    // Attach collapse/expand click handlers before any data rendering below —
    // rendering can take a noticeable moment on large reports, and section
    // headers are already in the static markup, so there's no reason a click
    // during that window should be silently dropped (which looked like the
    // arrow icon "lagging" until render finished and initCollapsible() ran).
    "initCollapsible();",
    "document.getElementById('header-project').textContent=D.project;",
    "document.getElementById('header-meta').textContent='v'+D.version+' \u00B7 '+D.generatedAt.replace('T',' ').substring(0,19)+' \u00B7 '+D.summary.runs+' runs';",
    // Header chips reuse the exact same rollups as the Suite Summary cards below,
    // so the two never show different numbers for what looks like the same word.
    // regression is folded into newlyFailed at the classifier level (see classifier.js) —
    // there's no separate regression bucket left to add here.
    "var _ss=D.suiteSummary||{};var _pass=(_ss.stable||0)+(_ss.fixed||0);var _failingTotal=(_ss.newlyFailed||0)+(_ss.stableFail||0);",
    "setChip('chip-total',D.summary.totalTests);",
    // chip-stable shows its own retry breakdown inline rather than via the
    // generic setChip() (which only swaps in one number) — "Passing on
    // Retry" is a subset of Passing, not an additional bucket, and burying
    // that relationship in a tooltip alone wasn't clear enough on its own.
    "(function(){var porCount=_ss.passingOnRetry||0;var el=document.getElementById('chip-stable');if(el)el.textContent='Passing: '+_pass+(porCount?' ('+porCount+' on retry)':'');})();",
    "setChip('chip-flaky',(D.suiteSummary||{}).flaky||0);",
    "setChip('chip-failed',_failingTotal);",
    "setChip('chip-skipped',(D.suiteSummary||{}).skipped||0);",
    "setCard('card-total',D.suiteSummary.total);",
    "setCardWithPct('card-stable',_pass,_ss.total?Math.round(_pass/_ss.total*100):0);",
    "setCardWithPct('card-passing-retry',_ss.passingOnRetry||0,_ss.passingOnRetryPct||0);",
    "setCardWithPct('card-flaky',(D.suiteSummary||{}).flaky||0,(D.suiteSummary||{}).flakyPct||0);",
    "setCardWithPct('card-newfail',(D.suiteSummary||{}).newlyFailed||0,(D.suiteSummary||{}).newlyFailedPct||0);",
    "setCardWithPct('card-stablefail',(D.suiteSummary||{}).stableFail||0,(D.suiteSummary||{}).stableFailPct||0);",
    "setCardWithPct('card-skipped',(D.suiteSummary||{}).skipped||0,(D.suiteSummary||{}).skippedPct||0);",
    // Each section renders independently — a data edge case or DOM surprise
    // in one section must never take down every section after it in this
    // list (they'd otherwise all share one unguarded synchronous call chain,
    // so one throw here previously meant everything below it silently never
    // rendered, with no error visible unless devtools happened to be open).
    "safeRender(renderFlakyTrend,'Flaky Tests Trend');",
    "safeRender(renderRetryTimeline,'Retries Per Run Trend');",
    "safeRender(renderPassingOnRetryDetails,'Passing on Retry — Details');",
    "safeRender(renderSkippedDetails,'Skipped Tests — Details');",
    "safeRender(renderInvestigation,'Failed Tests');",
    "safeRender(renderRunSummary,'Run Highlights');",
    "safeRender(renderAdvancedMetrics,'Additional Metrics');",

    "function safeRender(fn,label){try{fn();}catch(e){console.error('[playwright-flaky-analyzer] \\''+label+'\\' section failed to render:',e);}}",
    "function setCard(id,v){var e=document.getElementById(id);if(e)e.querySelector('.card-value').textContent=v;}",
    "function setCardWithPct(id,v,p){var e=document.getElementById(id);if(e){e.querySelector('.card-value').textContent=v;var s=e.querySelector('.card-sub');if(s)s.textContent=p+'%';}}",
    "function setChip(id,v){var e=document.getElementById(id);if(e)e.textContent=e.textContent.replace(/\\d+/,v);}",

    // Shared bar+line chart — one source of visual truth for both the
    // Flaky Tests Trend and Retries Per Run charts (both within this
    // analysis's runs) so the dashboard reads consistently. Pure SVG (no DOM
    // measurement needed), points: array of {label, value, tooltip, color}.
    "function buildBarLineChart(points,opts){",
    "opts=opts||{};",
    "var n=points.length;var vals=points.map(function(p){return p.value||0;});var max=Math.max.apply(null,vals)||1;",
    "var w=Math.max(n*60,240),h=150,pad=26,barW=Math.min(40,((w-2*pad)/n)*0.6);",
    "var innerW=w-2*pad,innerH=h-2*pad-16;",
    "var pts=points.map(function(p,i){var x=pad+(n===1?innerW/2:(i/(n-1))*innerW);var val=p.value||0;var barH=(val/max)*innerH;var y=pad+(innerH-barH);return{x:x,y:y,val:val,barH:barH,label:p.label,tooltip:p.tooltip,color:p.color};});",
    "var bars=pts.map(function(p){return '<rect x=\"'+(p.x-barW/2).toFixed(1)+'\" y=\"'+p.y.toFixed(1)+'\" width=\"'+barW.toFixed(1)+'\" height=\"'+Math.max(p.barH,1).toFixed(1)+'\" rx=\"2\" style=\"fill:'+(p.color||opts.barColor||'var(--yellow)')+'\"><title>'+escAttr(p.tooltip||'')+'</title></rect><text x=\"'+p.x.toFixed(1)+'\" y=\"'+(p.y-6).toFixed(1)+'\" text-anchor=\"middle\" class=\"bl-value-label\">'+p.val+'</text><text x=\"'+p.x.toFixed(1)+'\" y=\"'+(h-6).toFixed(1)+'\" text-anchor=\"middle\" class=\"bl-bar-label\">'+esc(p.label)+'</text>';}).join('');",
    "var line=n>=2?('<polyline points=\"'+pts.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ')+'\" fill=\"none\" style=\"stroke:'+(opts.lineColor||'var(--blue)')+';stroke-width:2\"></polyline>'+pts.map(function(p){return '<circle cx=\"'+p.x.toFixed(1)+'\" cy=\"'+p.y.toFixed(1)+'\" r=\"3\" style=\"fill:'+(opts.lineColor||'var(--blue)')+'\"></circle>';}).join('')):'';",
    "return '<div class=\"bl-chart-wrap\"><svg viewBox=\"0 0 '+w+' '+h+'\" width=\"100%\" height=\"'+h+'\" role=\"img\" aria-label=\"'+escAttr(opts.ariaLabel||'')+'\">'+bars+line+'</svg></div>';",
    "}",

    // Describes only what the recorded data shows — no invented causes.
    // First-vs-last analyzed run, matching the equivalent describeFlakyTrend()
    // in markdown.js. tl is D.retryTimeline — the SAME array Retries Per Run
    // reads, so the two charts always agree on which runs exist and their order.
    "function describeFlakyTrend(tl){",
    "var n=tl.length;var first=tl[0].flaky||0;var last=tl[n-1].flaky||0;var diff=last-first;",
    "if(Math.abs(diff)<1)return 'Flaky test count remained relatively stable across the '+n+' analyzed runs.';",
    "var verb=diff>0?'increased':'decreased';",
    "return 'Flaky tests '+verb+' from '+first+' to '+last+' across the '+n+' analyzed runs.';",
    "}",

    // Flaky Tests Trend — within THIS analysis (not a separate history file):
    // one bar per run already loaded by --lookback, sourced from the exact
    // same D.retryTimeline used by Retries Per Run Trend, so both charts
    // share the same Run 1...Run N x-axis and can be compared directly. Own
    // top-level section (see buildFlakyTrendSection) provides the <h2> title,
    // so no inner heading is repeated here.
    // Always rendered — no opt-in flag, no --history-file.
    "function renderFlakyTrend(){",
    "var tl=D.retryTimeline||[];var el=document.getElementById('adv-flaky-trend');",
    "if(!el)return;",
    "if(!tl.length){el.innerHTML='';return;}",
    "var points=tl.map(function(r){return{label:r.run,value:r.flaky||0,tooltip:r.run+': '+(r.flaky||0)+' flaky'};});",
    "var chartHtml=buildBarLineChart(points,{ariaLabel:'Flaky tests per run'});",
    "var interp=tl.length>=2?describeFlakyTrend(tl):'Trend requires multiple analyzed runs.';",
    "el.innerHTML='<div style=\"font-size:11.5px;color:var(--text-secondary);margin-bottom:10px\">How many tests were flagged flaky, run over run, across the same '+tl.length+' analyzed runs as Retries Per Run Trend below \\u2014 so the two can be compared directly.</div>'+chartHtml+'<div style=\"margin-top:10px;font-size:12px;font-weight:600;color:var(--text)\">'+esc(interp)+'</div>';",
    "}",

    "function renderRetryTimeline(){",
    "var tl=D.retryTimeline||[];var el=document.getElementById('adv-retries');",
    "if(!tl.length)return;", // leave the block empty — .advanced-block:empty hides it, same as the other blocks
    "var points=tl.map(function(r){return{label:r.run,value:r.retries||0,tooltip:r.run+': '+(r.retries||0)+' retries',color:(r.retries>0?'var(--yellow)':'var(--border)')};});",
    "var chartHtml=buildBarLineChart(points,{barColor:'var(--yellow)',lineColor:'var(--blue)',ariaLabel:'Retries per run'});",
    "var n=tl.length;var half=Math.floor(n/2);var takeaway='';",
    "if(n>=4){",
    "var firstHalf=tl.slice(0,half);var secondHalf=tl.slice(n-half);",
    "var avg=function(arr){return arr.reduce(function(s,r){return s+(r.retries||0);},0)/arr.length;};",
    "var a=avg(firstHalf),b=avg(secondHalf);var diff=b-a;",
    "if(Math.abs(diff)<0.4){takeaway='\\u2192 Retries have stayed roughly flat across the observed runs — no clear trend.';}",
    "else if(diff>0){takeaway='\\u25B2 Retries are trending up (avg '+a.toFixed(1)+' \\u2192 '+b.toFixed(1)+' per run) — the suite looks like it\\u2019s getting flakier over time.';}",
    "else{takeaway='\\u25BC Retries are trending down (avg '+a.toFixed(1)+' \\u2192 '+b.toFixed(1)+' per run) — the suite looks like it\\u2019s stabilizing.';}",
    "}else{takeaway='Need at least 4 runs to judge a trend reliably.';}",
    "el.innerHTML='<div style=\"font-size:11.5px;color:var(--text-secondary);margin-bottom:10px\">How many tests needed a retry to pass, run over run, with a trend line connecting each run\\u2019s value. A rising trend means the suite is getting flakier over time; a falling one means it\\u2019s stabilizing.</div>'+chartHtml+'<div style=\"margin-top:10px;font-size:12px;font-weight:600;color:var(--text)\">'+takeaway+'</div>';}",

    "function renderPassingOnRetryDetails(){",
    "var list=D.passingOnRetryTests||[];var section=document.getElementById('section-passing-on-retry');var el=document.getElementById('passing-on-retry-content');",
    "if(!list.length){if(section)section.style.display='none';return;}",
    "if(section)section.style.display='';",
    "var html='';list.forEach(function(i,idx){html+=renderPassingOnRetryCard(i,idx);});",
    "if(el)el.innerHTML=html;",
    "}",
    "function renderPassingOnRetryCard(i,idx){",
    "var clsLabel=i.classificationLabel||'Recovered on Retry';var clsBadge=i.classificationBadge||'badge-warn';var dataCls=i.classificationDataClass||'passing_on_retry';",
    "var ev=i.evidence;var cardId='por-card-'+idx;",
    // Collapsed by default, consistent with the Failed Tests cards: the header,
    // history strip and short error are visible; click to expand for the root
    // cause and evidence (buildCardHeader wires onclick=toggleCard).
    "var h='<div class=\"inv-card priority-low\" data-class=\"'+dataCls+'\">';",
    "h+=buildCardHeader(i,clsLabel,clsBadge,cardId,ev,'\\u2705');",
    "h+=buildCardCollapsed(i);",
    "h+=buildCardBody(i,ev,cardId);",
    "h+='</div>';return h;",
    "}",

    "function renderHistoryDots(history){",
    // Small dots, not full-size .inv-run squares from the failing-test cards —
    // this needs to stay compact and readable in a table cell even as the
    // number of runs grows, which a "PASS → FAIL → SKIPPED → ..." text
    // string does not.
    "var h='<span style=\"display:inline-flex;gap:2px;flex-wrap:wrap;vertical-align:middle\">';",
    "(history||[]).forEach(function(v,rx){var c=v==='passed'?'run-pass':v==='failed'?'run-fail':'run-other';h+='<span class=\"inv-run '+c+'\" style=\"width:9px;height:9px\" title=\"Run '+(rx+1)+': '+v.toUpperCase()+'\"></span>';});",
    "h+='</span>';return h;",
    "}",
    "function renderSkippedDetails(){",
    "var list=D.skippedTests||[];var section=document.getElementById('section-skipped');var el=document.getElementById('skipped-content');",
    "if(!list.length){if(section)section.style.display='none';return;}",
    "if(section)section.style.display='';",
    'var h=\'<div style="max-height:320px;overflow:auto"><table><thead><tr><th style="width:55%">Test</th><th>Browser</th><th>History (oldest \\u2192 newest)</th></tr></thead><tbody>\';',
    "list.forEach(function(t){h+='<tr><td style=\"white-space:normal;word-break:break-word\">'+esc(t.title)+'</td><td>'+esc(t.browser)+'</td><td>'+renderHistoryDots(t.history)+'</td></tr>';});",
    "h+='</tbody></table></div>';",
    "if(el)el.innerHTML=h;",
    "}",

    "function renderInvestigation(){",
    "var inv=D.investigations||[];",
    "renderInvestigationInit(inv);",
    "if(!inv.length)return;",
    "var html='';inv.forEach(function(i,idx){html+=renderCard(i,idx);});",
    "document.getElementById('investigation-list').innerHTML=html;",
    "}",
    "function renderInvestigationInit(inv){",
    "if(!inv.length){",
    "document.getElementById('investigation-empty').style.display='';",
    "document.getElementById('inv-count').textContent='';document.getElementById('inv-filter-bar').innerHTML='';document.getElementById('investigation-list').innerHTML='';return false;}",
    "document.getElementById('investigation-empty').style.display='none';",
    "document.getElementById('inv-count').textContent=inv.length+' failure'+(inv.length!==1?'s':'');",
    "document.getElementById('btn-expand-all').style.display='';",
    "document.getElementById('btn-collapse-all').style.display='';",
    "renderFilterToolbar(inv);return true;",
    "}",
    "function renderFilterToolbar(inv){",
    // classification==='regression' is dead (classifier.js folds it into
    // newly_failed) but a filter still matches on it defensively in case an
    // older cached JSON is ever fed through the report.
    "var flakyCount=inv.filter(function(i){return i.classification==='flaky';}).length;",
    "var newCount=inv.filter(function(i){return i.classification==='newly_failed'||i.classification==='regression';}).length;",
    "var stableFailCount=inv.filter(function(i){return i.classification==='stable_failure';}).length;",
    "var filters=[",
    "{l:'All ('+inv.length+')',c:''},",
    "{l:'Consistently Failing ('+stableFailCount+')',c:'stable_failure'},",
    "{l:'Newly Failing ('+newCount+')',c:'new'},",
    "{l:'Flaky ('+flakyCount+')',c:'flaky'}",
    "];",
    "var h='';filters.forEach(function(f){h+='<span class=\"badge badge-info\" onclick=\"filterCards(\\''+f.c+'\\',this)\" style=\"cursor:pointer;margin:2px\">'+f.l+'</span>';});",
    "document.getElementById('inv-filter-bar').innerHTML=h;",
    "renderCategoryToolbar(inv);}",
    // Category filter chips — separate from the classification filter above.
    // "category" here is the rule engine's per-test diagnosis (Locator,
    // Network, Timeout, ...), the same value shown in the Root Cause Summary
    // table's Category column, so the two stay consistent for a given test.
    "function renderCategoryToolbar(inv){",
    "var counts={};inv.forEach(function(i){var c=i.category||'Unknown';counts[c]=(counts[c]||0)+1;});",
    "var cats=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];});",
    "if(cats.length<2){document.getElementById('inv-category-bar').innerHTML='';return;}",
    "var h='<span style=\"font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);align-self:center;margin-right:2px\">Category:</span>';",
    "h+='<span class=\"badge badge-info\" onclick=\"filterByCategory(\\'\\',this)\" style=\"cursor:pointer;margin:2px\">All ('+inv.length+')</span>';",
    "cats.forEach(function(c){h+='<span class=\"badge badge-info\" onclick=\"filterByCategory(\\''+escJs(c)+'\\',this)\" style=\"cursor:pointer;margin:2px\">'+esc(c)+' ('+counts[c]+')</span>';});",
    "document.getElementById('inv-category-bar').innerHTML=h;}",
    "function renderCard(i,idx){",
    "var h='';var cls=i.classification;",
    "var clsLabel=i.classificationLabel||'Flaky';",
    "var clsBadge=i.classificationBadge||'badge-warn';",
    "var dataCls=i.classificationDataClass||'flaky';",
    "var sev=i.severity||'medium';var prioCls=sev==='critical'||sev==='high'?'priority-high':sev==='medium'?'priority-medium':'priority-low';",
    // cls is never 'regression' anymore — that classification was merged
    // into 'newly_failed' (see classifier.js), but a "fixed, then broke
    // again" test still deserves the same red critical flag it always got;
    // CLS-005 is the rule id for exactly that pattern and survived the merge
    // unchanged, so check that instead of the now-dead classification value.
    "if(cls==='stable_failure'||i.classificationRuleId==='CLS-005')prioCls='priority-critical';",
    "var ev=i.evidence;",
    "var cardId='card-'+idx;",
    "h+='<div class=\"inv-card '+prioCls+'\" data-class=\"'+dataCls+'\" data-category=\"'+escAttr(i.category||'Unknown')+'\">';",
    "h+=buildCardHeader(i,clsLabel,clsBadge,cardId,ev);",
    "h+=buildCardCollapsed(i);",
    "h+=buildCardBody(i,ev,cardId);",
    "h+='</div>';return h;}",
    "function buildEvidenceBadges(ev){",
    // Only screenshot/trace/video here — these are the 3 things that are
    // actually openable (see renderEvidence()'s 3 buttons below). Stack
    // trace and error messages are always shown inline once the card is
    // expanded regardless, so flagging them as a same-style pill up here
    // implied they were openable too, which they never were.
    "var h='';if(!ev)return'<span class=\"inv-ev-badge\" style=\"opacity:0.4\">No evidence</span>';",
    "if(ev.screenshots&&ev.screenshots.length)h+='<span class=\"inv-ev-badge\" title=\"Screenshot captured at the moment of failure.\">\\uD83D\\uDCF7 '+ev.screenshots.length+'</span>';",
    'if(ev.trace)h+=\'<span class="inv-ev-badge" title="Full recorded replay of this run (DOM snapshots, network, console) \\u2014 open in Playwright Trace Viewer. Only captured on some runs/retries.">\\uD83D\\uDD0D Trace</span>\';',
    "if(ev.video)h+='<span class=\"inv-ev-badge\">\\u25B6\\uFE0F Video</span>';",
    'return h||\'<span class="inv-ev-badge" style="opacity:0.4">No evidence</span>\';}',
    "function buildCardHeader(i,clsLabel,clsBadge,cardId,ev,icon){",
    'var h=\'<div class="inv-card-header" id="hdr-\'+cardId+\'" tabindex="0" role="button" aria-expanded="false" aria-controls="\'+cardId+\'" onclick="toggleCard(this)" onkeydown="if(event.key===\\\'Enter\\\'||event.key===\\\' \\\'){event.preventDefault();toggleCard(this);}">\';',
    "h+='<span class=\"inv-test-title\">'+(icon||'\\u274C')+' '+esc(i.testName)+'</span>';",
    "h+='<span class=\"inv-ev-ind\">'+buildEvidenceBadges(ev)+'</span>';",
    "h+='<span class=\"inv-header-meta\">';",
    // Fingerprint code removed from the card — it was an internal grouping id with no meaning to readers.
    // "Passed on retry N" badge removed — the same info is already on the
    // run-history strip's per-run tooltip (buildCardCollapsed), so this was
    // a second copy of the same fact rather than new information.
    "if(i.category)h+='<span class=\"badge badge-info\" title=\"Failure category (rule-engine diagnosis)\">'+esc(i.category)+'</span>';",
    "if(i.browser&&i.browser!=='\\u2014')h+='<span class=\"badge badge-muted\">'+esc(i.browser)+'</span>';",
    "h+='<span class=\"badge '+clsBadge+'\">'+clsLabel+'</span></span></div>';return h;}",
    "function buildCardCollapsed(i){",
    // Each tile now shows its run number as visible text (not just an
    // on-hover tooltip) — with 20+ same-colored tiles in a row, hovering one
    // at a time to figure out which is which doesn't scale.
    "var h='';if(i.history&&i.history.length){var _pd=i.history.filter(function(v){return v==='passed';}).length;var _rpr=i.retriesPerRun||[];h+='<div class=\"inv-history-strip\">';i.history.forEach(function(v,rx){var c=v==='passed'?'run-pass':v==='failed'?'run-fail':'run-other';var t='Run '+(rx+1)+': '+v.toUpperCase();if(v==='passed'){var rt=_rpr[rx];t+=rt?' (passed on retry '+rt+')':' (passed on 1st attempt)';}h+='<span class=\"inv-run '+c+'\" title=\"'+esc(t)+'\">'+(rx+1)+'</span>';});h+='<span class=\"inv-history-label\">'+_pd+'/'+i.history.length+' runs passed \\u00b7 oldest \\u2192 newest</span></div>';}",
    "var errs=i.classifiedErrors||i.errors||[];if(errs.length){var first=typeof errs[0]==='string'?errs[0]:errs[0].message||'';h+='<div class=\"inv-short-error\">'+esc(first)+'</div>';}",
    "return h;}",
    "function buildCardBody(i,ev,cardId){",
    "var h='<div id=\"'+cardId+'\" class=\"inv-card-body\">';",
    "var errs=i.classifiedErrors||i.errors||[];",
    // The most recent failing run's error (engine.js primaryError) — falls
    // back to errs[0] for shapes that predate this field (older cached
    // results, or the retry-failure pseudo-cards built from a single run,
    // which never set primaryError).
    "var primary=i.primaryError||null;",
    "var primaryMsg=primary?(primary.message||''):(errs.length?(typeof errs[0]==='string'?errs[0]:errs[0].message||''):'');",
    // Legacy fallback: no message anywhere, but a stack trace was captured —
    // show that rather than an empty error section (matches the pre-existing
    // "stack trace only" evidence shape).
    "if(!primaryMsg)primaryMsg=(ev&&ev.stackTrace)||'';",
    "var pe=ev&&ev.parsedError;",
    // 1) Primary Error — the original Playwright error, always shown in full.
    "h+='<div class=\"inv-field-group\">'+renderPrimaryError(primaryMsg,pe)+'</div>';",
    // 2) Call Log — its own scrollable block, never truncated.
    "if(pe&&pe.callLog){h+='<div class=\"inv-field-group\"><div class=\"inv-field\"><div class=\"inv-field-label\">Call Log</div><pre class=\"inv-full-error\">'+esc(pe.callLog)+'</pre></div></div>';}",
    // 3) Code Frame / Stack.
    "var _frame=renderCodeFrame(ev,primary);if(_frame)h+='<div class=\"inv-field-group\">'+_frame+'</div>';",
    // 4) Evidence.
    "h+='<div class=\"inv-field-group\">';",
    "h+=renderEvidence(ev,i.evidenceByRun,cardId);",
    "h+='</div>';",
    // 5-7) Root Cause / Why classified / Confidence — analyzer interpretation,
    // deliberately positioned AFTER the original error above.
    "h+='<div class=\"inv-field-group\">';",
    "h+='<div class=\"inv-field\"><div class=\"inv-field-label\">Root Cause</div><div class=\"inv-field-value\">'+esc(i.likelyCause||'Unknown')+'</div><div style=\"font-size:10.5px;color:var(--text-muted);margin-top:3px\">Analyzer inference from pattern-matching rules \\u2014 the Primary Error above is Playwright\\u2019s own, unmodified output.</div></div>';",
    "if(i.classificationReasons&&i.classificationReasons.length){var clsWhy=(i.classification==='regression'?'a ':'')+(i.classificationLabel||'this');h+='<div class=\"inv-field\"><details open><summary style=\"font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--blue);cursor:pointer\">Why is this '+esc(clsWhy)+'?</summary><div style=\"font-size:12.5px;line-height:1.7;padding:4px 0;color:var(--text)\">'+i.classificationReasons.map(function(r){return'<div style=\"color:var(--green-text)\">\\u2713 '+esc(r)+'</div>';}).join('')+'</div></details></div>';}",
    // Matched-rule code (RC-xxx) removed from the card — the plain-language Likely Cause and Suggested Checks convey it.
    // Quiet by default — only surfaced when there's an actual reason to doubt
    // the diagnosis (below the configured threshold). Showing a precise %
    // on every card added no decision-useful signal when nearly everything
    // clusters in the same high band (e.g. 90% for every confidently-matched
    // infrastructure error) — it read as noise, not insight.
    "var belowThresh=!!i.belowConfidenceThreshold;",
    "if(belowThresh){var conf=i.confidence||0;var confTip=buildConfidenceTooltip(i);h+='<div class=\"inv-field\"><div class=\"inv-field-label\" title=\"How strongly the evidence supports this diagnosis: based on how consistent the test\\u2019s pass/fail history is, whether other tests show the same failure fingerprint, and how many runs were analyzed. Higher = more reliable.\">Confidence</div><div style=\"display:flex;align-items:center;gap:8px\"><span style=\"width:160px;height:6px;background:var(--border-light);border-radius:3px;overflow:hidden\"><span style=\"display:block;height:100%;width:'+conf+'%;background:var(--blue);border-radius:3px\"></span></span><span style=\"font-size:12px;font-weight:600;'+(confTip?'cursor:help;border-bottom:1px dotted var(--text-secondary)':'')+'\"'+(confTip?' title=\"'+escAttr(confTip)+'\"':'')+'>'+conf+'%</span><span class=\"badge badge-warn\" title=\"'+escAttr('Below the confidence threshold ('+(i.confidenceThresholdPct||70)+'%) \\u2014 flagged for human review.')+'\">Needs Review</span></div></div>';}",
    "h+='</div>';",
    // 9) Suggested Checks.
    "var checks=i.suggestedChecks||[];if(checks.length)h+='<div class=\"inv-field-group\"><details class=\"inv-checks\" style=\"padding:0\"><summary>Suggested Checks ('+checks.length+')</summary><ul>'+checks.map(function(c){return'<li>'+esc(c)+'</li>';}).join('')+'</ul></details></div>';",
    // 10) Any OTHER distinct errors from other runs/attempts in the analyzed
    // window — still real signal for a test that failed differently across
    // runs, kept as its own labeled, still-readable (white-space:pre-wrap)
    // section rather than dropped.
    "var _seen={};var _others=[];errs.forEach(function(e){var m=typeof e==='string'?e:e.message||'';if(m&&m!==primaryMsg&&!_seen[m]){_seen[m]=1;_others.push(m);}});",
    "if(_others.length){h+='<div class=\"inv-field-group\"><div class=\"inv-field\"><div class=\"inv-field-label\">Other Errors Seen In Other Runs/Attempts ('+_others.length+')</div>';_others.slice(0,4).forEach(function(m){h+='<div class=\"inv-error-msg\">'+esc(m)+'</div>';});h+='</div></div>';}",
    "h+='</div>';return h;}",
    // Renders the Primary Error field: the Locator/Expected/Received/Timeout
    // mini-table (only rows the parser actually found — never fabricated),
    // then the complete original message verbatim underneath. The raw
    // message is ALWAYS shown in full regardless of what the parser
    // extracted, so a parser miss can never cause content loss.
    "function renderPrimaryError(msg,pe){",
    "if(!msg)return '<div class=\"inv-field\"><div class=\"inv-field-label\">Primary Error</div><div class=\"inv-field-value\" style=\"color:var(--text-muted)\">No error message captured.</div></div>';",
    "var h='<div class=\"inv-field\"><div class=\"inv-field-label\">Primary Error</div>';",
    "if(pe&&(pe.locator||pe.expected||pe.received||pe.timeout)){",
    "h+='<table class=\"inv-error-fields\">';",
    "if(pe.locator)h+='<tr><th>Locator</th><td>'+esc(pe.locator)+'</td></tr>';",
    "if(pe.expected)h+='<tr><th>Expected</th><td>'+esc(pe.expected)+'</td></tr>';",
    "if(pe.received)h+='<tr><th>Received</th><td>'+esc(pe.received)+'</td></tr>';",
    "if(pe.timeout)h+='<tr><th>Timeout</th><td>'+esc(pe.timeout)+'</td></tr>';",
    "h+='</table>';",
    "}",
    "var _lines=msg.split('\\n').length;",
    "h+='<details'+(_lines<=25?' open':'')+'><summary class=\"inv-full-error-summary\">Full Error ('+_lines+' line'+(_lines!==1?'s':'')+')</summary><pre class=\"inv-full-error\">'+esc(msg)+'</pre></details>';",
    "h+='</div>';return h;}",
    // Renders the Code Frame (Playwright's own source-excerpt snippet, with
    // its failing line highlighted) and/or the raw Stack — shown together
    // when both exist, since they're non-overlapping content (source excerpt
    // vs. call chain); each is independently omitted when absent, never
    // fabricated.
    "function renderCodeFrame(ev,primary){",
    "var snippet=ev&&ev.codeFrame;var loc=ev&&ev.codeFrameLocation;var stack=primary&&primary.stack;",
    "if(!snippet&&!stack)return'';",
    "var h='';",
    "if(snippet){",
    "var locLabel=(loc&&loc.file)?esc(loc.file)+(loc.line?':'+loc.line:'')+(loc.column?':'+loc.column:''):'';",
    "var body=String(snippet).split('\\n').map(function(l){var clean=l.replace(/\\x1b\\[[0-9;]*m/g,'');return /^>\\s*\\d+\\s*\\|/.test(clean)?'<span class=\"line-current\">'+esc(clean)+'</span>':esc(clean);}).join('\\n');",
    "h+='<div class=\"inv-field\"><div class=\"inv-field-label\">Code Frame'+(locLabel?' <span style=\"font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-secondary)\">('+locLabel+')</span>':'')+'</div><pre class=\"inv-full-error\">'+body+'</pre></div>';",
    "}",
    "if(stack){h+='<div class=\"inv-field\" style=\"margin-top:'+(snippet?'8px':'0')+'\"><div class=\"inv-field-label\">Stack</div><pre class=\"inv-full-error\">'+esc(stack)+'</pre></div>';}",
    "return h;}",
    "function buildConfidenceTooltip(i){",
    "var exp=i&&i.confidenceExplain;",
    "if(!exp||!exp.adjustments)return'';",
    "var lines=['Confidence '+exp.finalConfidence+'% \\u2014 how strongly the evidence backs this root cause.','','It starts at '+exp.baseConfidence+'% from the matching rule, then goes up or down based on the evidence:'];",
    "exp.adjustments.forEach(function(a){lines.push('  '+(a.delta>=0?'+':'\\u2212')+Math.abs(a.delta)+'%  '+a.reason);});",
    "if(i.belowConfidenceThreshold)lines.push('','\\u26A0 Under 70%, so it\\u2019s worth a quick human double-check.');",
    "return lines.join('\\n');",
    "}",
    // Evidence is shown for ONE run at a time — defaults to the most recent
    // run that captured any (matches `ev`, the default computed in
    // engine.js), with a picker to switch to any other run that also has
    // evidence (byRun). Split into an outer field+picker and an inner,
    // swappable body so switching runs only re-renders the body, not the
    // whole field (keeps the picker's own selection intact).
    "function renderEvidence(ev,byRun,cardId){",
    "var list=(byRun||[]).filter(function(r){return r&&r.evidence;});",
    "var initial=list.length?list[list.length-1].evidence:ev;",
    "if(!initial)return'';",
    "var h='<div class=\"inv-field\"><div class=\"inv-field-label\">Evidence';",
    "if(list.length>1){",
    "h+='<select class=\"inv-ev-run-select\" aria-label=\"View a different run\\'s evidence\" onclick=\"event.stopPropagation()\" onchange=\"event.stopPropagation();switchEvidenceRun(\\''+cardId+'\\',this.value)\">';",
    "list.forEach(function(r,pos){h+='<option value=\"'+pos+'\"'+(pos===list.length-1?' selected':'')+'>'+esc(r.runLabel)+'</option>';});",
    "h+='</select>';",
    "}",
    "h+='</div><div id=\"ev-body-'+cardId+'\">'+renderEvidenceBody(initial)+'</div></div>';",
    "return h;}",
    "function renderEvidenceBody(ev){",
    "if(!ev)return'';",
    'var h=\'<div class="inv-evidence-row">\';',
    "if(ev.screenshots&&ev.screenshots.length){ev.screenshots.forEach(function(s,si){h+='<img class=\"inv-screenshot-thumb\" src=\"'+escAttr(s)+'\" alt=\"Screenshot '+(si+1)+'\" loading=\"lazy\" onclick=\"event.stopPropagation();openPreview(\\''+escJs(s)+'\\')\">';});}",
    "var firstShot=(ev.screenshots&&ev.screenshots.length)?ev.screenshots[0]:null;",
    "if(firstShot){h+='<span class=\"inv-ev-btn\" role=\"button\" aria-label=\"Open screenshot\" onclick=\"event.stopPropagation();openPreview(\\''+escJs(firstShot)+'\\')\">\\uD83D\\uDCF7 Open Screenshot</span>';}else if(ev.screenshotsUnavailable){h+='<span class=\"inv-ev-btn disabled\" title=\"The screenshot file was not found next to the report.\" onclick=\"event.stopPropagation();\">\\uD83D\\uDCF7 Screenshot unavailable</span>';}else{h+='<span class=\"inv-ev-btn disabled\" role=\"button\" aria-label=\"Open screenshot\" onclick=\"event.stopPropagation();\">\\uD83D\\uDCF7 Open Screenshot</span>';}",
    // Trace: a Playwright .zip trace is NOT something a browser can open on its
    // own — it needs the Trace Viewer (trace.playwright.dev, or the offline
    // `npx playwright show-trace <file>`). We therefore ship the copied trace as
    // a downloadable asset with those open-instructions in the tooltip, rather
    // than a link that would 404 or render as gibberish. When the source file is
    // gone, we show a disabled "unavailable" control instead of a dead link.
    "if(ev.trace){h+='<a class=\"inv-ev-btn\" role=\"button\" aria-label=\"Download Playwright trace\" title=\"A Playwright trace opens in the Trace Viewer, not the browser. Download this file, then drag it onto trace.playwright.dev or run: npx playwright show-trace &lt;file&gt;\" href=\"'+safeUrl(ev.trace)+'\" download onclick=\"event.stopPropagation()\">\\uD83D\\uDD0D Download Trace</a>';}else if(ev.traceUnavailable){h+='<span class=\"inv-ev-btn disabled\" title=\"The trace file was not found next to the report.\">\\uD83D\\uDD0D Trace unavailable</span>';}",
    "if(!ev.video&&ev.videoUnavailable){h+='<span class=\"inv-ev-btn disabled\" title=\"The video file was not found next to the report.\">\\u25B6\\uFE0F Video unavailable</span>';}",
    // Close .inv-evidence-row (the button row).
    "h+='</div>';",
    // Video plays inline, directly from the report, via a relative <video> src —
    // no separate artifact, no click-through needed.
    "if(ev.video){h+='<video class=\"inv-video\" controls preload=\"metadata\" style=\"display:block;max-width:100%;max-height:260px;margin-top:10px;border-radius:6px;background:#000\" src=\"'+safeUrl(ev.video)+'\" onclick=\"event.stopPropagation()\">Your browser cannot play this video inline. <a href=\"'+safeUrl(ev.video)+'\" download>Download it</a>.</video>';}",
    "return h;}",
    "function resolveInvestigationByCardId(cardId){",
    "if(cardId.indexOf('por-card-')===0)return(D.passingOnRetryTests||[])[parseInt(cardId.slice(9),10)]||null;",
    "if(cardId.indexOf('card-')===0)return(D.investigations||[])[parseInt(cardId.slice(5),10)]||null;",
    "return null;}",
    "function switchEvidenceRun(cardId,pos){",
    "var inv=resolveInvestigationByCardId(cardId);if(!inv)return;",
    "var list=(inv.evidenceByRun||[]).filter(function(r){return r&&r.evidence;});",
    "var entry=list[parseInt(pos,10)];if(!entry)return;",
    "var el=document.getElementById('ev-body-'+cardId);if(el)el.innerHTML=renderEvidenceBody(entry.evidence);",
    "}",

    // ── Accordion ──
    "function showBody(c,on){var b=c.querySelector('.inv-card-body');if(b)b.style.display=on?'block':'none';}",
    "function toggleCard(hdr){",
    "var card=hdr.parentElement;var isExpanded=card.classList.contains('expanded');",
    "document.querySelectorAll('#investigation-list .inv-card.expanded').forEach(function(c){if(c!==card){c.classList.remove('expanded');showBody(c,false);c.querySelector('.inv-card-header').setAttribute('aria-expanded','false');}});",
    "if(isExpanded){card.classList.remove('expanded');showBody(card,false);hdr.setAttribute('aria-expanded','false');}",
    "else{card.classList.add('expanded');showBody(card,true);hdr.setAttribute('aria-expanded','true');}}",
    "function expandAllCards(){",
    "document.querySelectorAll('#investigation-list .inv-card').forEach(function(c){c.classList.add('expanded');showBody(c,true);c.querySelector('.inv-card-header').setAttribute('aria-expanded','true');c.querySelectorAll('.inv-checks').forEach(function(d){d.open=true;});});}",
    "function collapseAllCards(){",
    "document.querySelectorAll('#investigation-list .inv-card.expanded').forEach(function(c){c.classList.remove('expanded');showBody(c,false);c.querySelector('.inv-card-header').setAttribute('aria-expanded','false');c.querySelectorAll('.inv-checks').forEach(function(d){d.open=false;});});}",

    "var activeFilter='';var activeFilterLabel='';",
    "function filterCards(cls,el){",
    "if(activeFilter===cls){activeFilter='';activeFilterLabel='';if(el)el.classList.add('badge-info');el.classList.remove('badge-fail');}",
    "else{activeFilter=cls;activeFilterLabel=el?el.textContent.replace(/\\(\\d+\\)/,'').trim():'';document.querySelectorAll('#inv-filter-bar .badge').forEach(function(b){b.classList.remove('badge-fail');b.classList.add('badge-info')});if(el){el.classList.remove('badge-info');el.classList.add('badge-fail');}}",
    "runSearch();}",
    // Category filter is independent of (ANDed with) the classification
    // filter above — e.g. "Flaky" + "Network" narrows to flaky tests whose
    // rule-engine diagnosis is a network error.
    "var activeCategory='';var activeCategoryLabel='';",
    "function filterByCategory(cat,el){",
    "if(activeCategory===cat){activeCategory='';activeCategoryLabel='';if(el)el.classList.add('badge-info');el.classList.remove('badge-fail');}",
    "else{activeCategory=cat;activeCategoryLabel=el?el.textContent.replace(/\\(\\d+\\)/,'').trim():'';document.querySelectorAll('#inv-category-bar .badge').forEach(function(b){b.classList.remove('badge-fail');b.classList.add('badge-info')});if(el){el.classList.remove('badge-info');el.classList.add('badge-fail');}}",
    "runSearch();}",

    // ── Debounced search with cached card references ──
    "var searchTimer=null;var cachedCards=null;",
    "function debouncedSearch(){clearTimeout(searchTimer);searchTimer=setTimeout(runSearch,100);}",
    "function runSearch(){",
    "var q=(document.getElementById('global-search')||{}).value||'';q=q.toLowerCase();",
    "if(!cachedCards)cachedCards=document.querySelectorAll('.inv-card');",
    "var anyVisible=false;",
    "cachedCards.forEach(function(c){var s=true;clearHighlights(c);if(activeFilter&&(c.getAttribute('data-class')||'')!==activeFilter)s=false;if(s&&activeCategory&&(c.getAttribute('data-category')||'')!==activeCategory)s=false;if(s&&q&&!c.textContent.toLowerCase().includes(q))s=false;c.style.display=s?'':'none';if(s)anyVisible=true;",
    // A match can live inside the collapsed card body (e.g. the Root Cause sentence) where the
    // user can't see why it matched. Auto-expand those so the highlighted text is actually visible.
    "if(s&&q&&cardVisibleText(c).indexOf(q)<0){c.classList.add('expanded');showBody(c,true);var hh=c.querySelector('.inv-card-header');if(hh)hh.setAttribute('aria-expanded','true');}",
    "});",
    "if(q&&anyVisible){cachedCards.forEach(function(c){if(c.style.display!=='none')highlightMatches(c,q);});}",
    "var empty=document.getElementById('investigation-empty');",
    "if(!anyVisible){",
    "empty.style.display='';var msg='';",
    "var comboLabel=[activeFilterLabel,activeCategoryLabel].filter(Boolean).join(' + ');",
    "if(q&&comboLabel)msg='No tests match \"'+q+'\" under '+comboLabel+'. Try a different search or filter.';",
    "else if(q)msg='No tests match \"'+q+'\". Try a different search.';",
    "else if(comboLabel)msg='No tests match \"'+comboLabel+'\". Try a different filter.';",
    "else msg='\\u2705 No failing tests detected.';",
    "empty.textContent=msg;",
    "}else{empty.style.display='none';}}",
    "function cardVisibleText(c){var clone=c.cloneNode(true);var b=clone.querySelector('.inv-card-body');if(b&&b.parentNode)b.parentNode.removeChild(b);return (clone.textContent||'').toLowerCase();}",
    "function clearHighlights(el){var marks=el.querySelectorAll('mark');marks.forEach(function(m){var p=m.parentNode;p.replaceChild(document.createTextNode(m.textContent),m);});}",
    "function highlightMatches(el,q){if(!q)return;var walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);var nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);nodes.forEach(function(n){var t=n.textContent;var idx=t.toLowerCase().indexOf(q);if(idx>=0){var span=document.createElement('span');span.innerHTML=esc(t.substring(0,idx))+'<mark>'+esc(t.substring(idx,idx+q.length))+'</mark>'+esc(t.substring(idx+q.length));n.parentNode.replaceChild(span,n);n=span;}else{n.textContent=t;}});}",

    // evidence
    "function openPreview(u){var o=document.createElement('div');o.className='evidence-overlay';var i=document.createElement('img');i.src=u;o.appendChild(i);o.onclick=function(){document.body.removeChild(o)};document.body.appendChild(o);}",

    // rule-based run summary — single list, no scope toggle. D.runSummary
    // already folds a "latest run" data point in as its own bullet (see
    // Rule 1b in generateRunSummary), so there's one narrative to read
    // instead of two views to flip between.
    "function renderRunSummary(){",
    "var bullets=D.runSummary||[];var el=document.getElementById('runs-summary-content');",
    "if(!bullets.length){el.innerHTML='<div class=\"empty-state\">All tests passed. No summary to display.</div>';return;}",
    "var h='<ul style=\"font-size:13px;line-height:1.8;padding-left:18px;margin:0\">';",
    "bullets.forEach(function(b){h+='<li>'+esc(b)+'</li>';});",
    "h+='</ul>';el.innerHTML=h;}",

    // advanced metrics
    "function renderAdvancedMetrics(){",
    "var rcs=D.rootCauseSummary||[];",
    // Confidence is shown as its own column here (a plain % per row) so the
    // Root Cause Summary reads as a scannable triage list. Rows below the 70%
    // review threshold are flagged with a warning badge so the low-confidence
    // diagnoses stand out; every row carries a plain-language tooltip
    // explaining how its number was reached (see buildConfidenceTooltip).
    "if(rcs.length){",
    "var h='<h3>Root Cause Summary <span style=\\'font-weight:400;color:var(--text-secondary);font-size:11px\\'>('+rcs.length+' failing test'+(rcs.length!==1?'s':'')+')</span></h3><div style=\"max-height:260px;overflow:auto\"><table><thead><tr><th>Test</th><th>Status</th><th>Pattern</th><th>Category</th><th title=\"How strongly the evidence supports this root cause. Higher = more reliable; anything below 70% is flagged for a human to double-check.\">Confidence</th></tr></thead><tbody>';",
    "rcs.forEach(function(r){var s=r.status==='consistent_failure'?'badge-fail':'badge-warn';var sl=r.status==='consistent_failure'?'Fail':'Flaky';var ctip=buildConfidenceTooltip(r);var conf=r.confidence||0;var below=!!r.belowConfidenceThreshold;h+='<tr><td style=\"max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">'+esc(r.testName)+'</td><td><span class=\"badge '+s+'\">'+sl+'</span></td><td style=\"font-family:var(--mono);font-size:10px;color:var(--orange)\">'+(r.pattern?esc(r.pattern):'\\u2014')+'</td><td><span class=\"badge badge-info\">'+(r.category?esc(r.category):'\\u2014')+'</span></td>';",
    "h+='<td'+(ctip?' style=\"cursor:help\" title=\"'+escAttr(ctip)+'\"':'')+'>'+(below?'<span class=\"badge badge-warn\">\\u26A0 '+conf+'%</span>':'<span style=\"font-weight:600\">'+conf+'%</span>')+'</td>';",
    "h+='</tr>';});",
    "h+='</tbody></table></div>';document.getElementById('adv-root-cause').innerHTML=h;}",
    // Flaky Tests table removed — flaky tests already appear as filterable cards in the Failed
    // Tests section (with the Flaky filter chip), so a separate table was redundant.
    "renderBrowserStats('latest');",
    "renderFailureCategories('latest');",
    // The invisible toggle + sub-line below match the markup Browser Statistics/
    // Failure Categories use for their scope toggle and "counts are..." sub-text
    // (identical box model — same buttons, same font-size/margin), so all four
    // Compact single-line header — title only, no tabs/helper text needed, so
    // no wasted header space (unlike Browser Statistics/Failure Categories
    // below, which have a scope toggle and are a touch taller for it).
    "if(D.failureFrequency&&D.failureFrequency.length){var h='<div class=\"adv-card-header\"><h3 class=\"adv-card-title\">Failure Frequency</h3></div><div style=\"max-height:220px;overflow:auto\"><table><thead><tr><th style=\"width:70%\">Test</th><th>Failed</th></tr></thead><tbody>';D.failureFrequency.forEach(function(f){h+='<tr><td style=\"white-space:normal;word-break:break-word\">'+esc(f.testName)+'</td><td>'+f.failureCount+' / '+f.totalRuns+'</td></tr>';});h+='</tbody></table></div>';document.getElementById('adv-frequency').innerHTML=h;}",
    "if(D.slowestTests&&D.slowestTests.length){var h='<div class=\"adv-card-header\"><h3 class=\"adv-card-title\">Slowest Tests</h3></div><div style=\"max-height:220px;overflow:auto\"><table><thead><tr><th style=\"width:70%\">Test</th><th>Avg Duration</th></tr></thead><tbody>';D.slowestTests.slice(0,5).forEach(function(t){h+='<tr><td style=\"white-space:normal;word-break:break-word\">'+esc(t.title)+'</td><td>'+formatDuration(t.durationMs||0)+'</td></tr>';});h+='</tbody></table></div>';document.getElementById('adv-slowest').innerHTML=h;}",
    "}", // closes renderAdvancedMetrics() — without this, the whole inline script fails to parse

    "function scopeToggleHtml(scopeVar,active){",
    "return '<span class=\"scope-toggle\"><span class=\"scope-btn'+(active==='latest'?' active':'')+'\" onclick=\"event.stopPropagation();'+scopeVar+'(\\'latest\\')\">Latest Run</span><span class=\"scope-btn'+(active==='all'?' active':'')+'\" onclick=\"event.stopPropagation();'+scopeVar+'(\\'all\\')\">All Runs</span></span>';",
    "}",
    "function renderBrowserStats(scope){",
    "var list=scope==='all'?(D.browserStats||[]):(D.browserStatsLatest||[]);",
    "if(!list.length){document.getElementById('adv-browsers').innerHTML='';return;}",
    "var sub=scope==='all'?'test executions across all runs':'test executions in the latest run only';",
    "var h='<div class=\"adv-card-header\"><h3 class=\"adv-card-title\">Browser Statistics</h3><div class=\"adv-card-controls\">'+scopeToggleHtml('renderBrowserStats',scope)+'<span class=\"adv-info-icon\" title=\"'+escAttr('Counts are '+sub+'.')+'\">i</span></div></div><table><thead><tr><th>Browser</th><th title=\"Test executions, not distinct tests\">Executions</th><th>Failed</th><th>Fail %</th></tr></thead><tbody>';",
    "list.forEach(function(b){h+='<tr><td>'+esc(b.browser)+'</td><td>'+b.totalTests+'</td><td>'+b.totalFailures+'</td><td>'+b.failRate+'%</td></tr>';});",
    "h+='</tbody></table>';document.getElementById('adv-browsers').innerHTML=h;",
    "}",
    "function renderFailureCategories(scope){",
    "var fc=scope==='all'?D.failureCategories:D.failureCategoriesLatest;",
    "if(!fc||!fc.total){document.getElementById('adv-categories').innerHTML='';return;}",
    "var sub=scope==='all'?'error occurrences across all runs':'error occurrences in the latest run only';",
    "var h='<div class=\"adv-card-header\"><h3 class=\"adv-card-title\">Failure Categories</h3><div class=\"adv-card-controls\">'+scopeToggleHtml('renderFailureCategories',scope)+'<span class=\"adv-info-icon\" title=\"'+escAttr('Counts are '+sub+'.')+'\">i</span></div></div><div style=\"max-height:220px;overflow:auto\"><table><thead><tr><th>Category</th><th>Occurrences</th></tr></thead><tbody>';",
    "Object.keys(fc.counts||{}).forEach(function(k){if(fc.counts[k])h+='<tr><td>'+k.charAt(0).toUpperCase()+k.slice(1)+'</td><td>'+fc.counts[k]+'</td></tr>';});",
    "h+='</tbody></table></div>';document.getElementById('adv-categories').innerHTML=h;",
    "}",
    "function formatDuration(ms){",
    "if(ms>=60000)return (ms/60000).toFixed(ms>=600000?0:1)+'m';",
    "if(ms>=1000)return (ms/1000).toFixed(ms>=10000?0:1)+'s';",
    "return ms.toLocaleString()+'ms';",
    "}",

    // init
    "function initCollapsible(){document.querySelectorAll('.section-header').forEach(function(h){h.addEventListener('click',function(){this.closest('.section').classList.toggle('collapsed')})})}",
    "function esc(s){return String(s||'').replace(/\\x1b\\[[0-9;]*m/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}",
    "function escAttr(s){return String(s||'').replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}",
    // escJs: for values placed inside a single-quoted JS string that itself sits inside a double-quoted HTML attribute (inline onclick). Escapes for the JS-string layer first, then the HTML-attribute layer.
    "function escJs(s){return String(s||'').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,\"\\\\'\").replace(/\\r/g,'\\\\r').replace(/\\n/g,'\\\\n').replace(/\\u2028/g,'\\\\u2028').replace(/\\u2029/g,'\\\\u2029').replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}",
    // safeUrl: neutralizes javascript:/data:/vbscript: URLs (ignoring control/whitespace obfuscation) before they reach an href; leaves relative, Windows, absolute, http(s), and file: paths intact.
    "function safeUrl(u){var s=String(u||'');var t=s.replace(/[\\u0000-\\u0020]+/g,'').toLowerCase();return /^(javascript|data|vbscript):/.test(t)?'#':escAttr(s);}",
    // Inline on*="" attributes resolve names in the global scope, but these handlers are
    // declared inside this IIFE. Expose exactly the inline-referenced handlers on window so
    // the onclick/oninput/onkeydown attributes can find them.
    "window.openPreview=openPreview;window.toggleCard=toggleCard;window.filterCards=filterCards;window.filterByCategory=filterByCategory;window.debouncedSearch=debouncedSearch;window.expandAllCards=expandAllCards;window.collapseAllCards=collapseAllCards;window.renderBrowserStats=renderBrowserStats;window.renderFailureCategories=renderFailureCategories;window.switchEvidenceRun=switchEvidenceRun;",
  ].join("\n");

  return (
    "<!DOCTYPE html>\n" +
    [
      '<html lang="en">',
      "<head>",
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "<title>Playwright Flaky Test Analyzer \u2014 Dashboard</title>",
      "<style>" + CSS + "</style>",
      "</head>",
      "<body>",
      buildHeader(),
      '<main class="dashboard">',
      buildSuiteSummary(),
      buildFlakyTrendSection(),
      buildRetriesTrendSection(),
      buildNarrativeSummary(),
      buildInvestigation(),
      buildPassingOnRetryDetails(),
      buildSkippedDetails(),
      buildAdvancedMetrics(),
      "</main>",
      "<script>(function(){" + jsContent + "})();</script>",
      "</body>",
      "</html>",
    ].join("\n")
  );
}

module.exports = { generate };
