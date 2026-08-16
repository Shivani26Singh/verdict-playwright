# VERDICT — AI-Powered QA Failure Investigator

VERDICT is a standalone Next.js web app layered over the existing, unchanged
[`playwright-flaky-analyzer`](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/CLI.md) package. It turns Playwright
CI history into grounded, human-readable failure attribution: for a failing test,
VERDICT separates **product defects** from **flaky/timing issues**, **test defects**,
and **environment problems** — and proves the answer with cited evidence.

The demo is built from the committed synthetic CI runs in
[`demo-project/ci-runs`](https://github.com/shivani26singh/playwright-flaky-analyzer/tree/main/demo-project/ci-runs). All screenshots, traces, and
videos are fictional data from a fictional product called Meridian.

## What problem does it solve

A raw Playwright error tells you *what* failed. It does not tell you *whose*
problem it is. VERDICT answers the attribution question a QA engineer actually
needs:

- Is this a bug in the application?
- Is the test itself wrong or brittle?
- Is it just flaky timing?
- Or is the environment broken?

The key difference from a plain "paste the error into ChatGPT" workflow is
**evidence grounding**. Every conclusion cites specific evidence, and a
deterministic Verdict Guard rejects hallucinations before they reach the UI.

## Why AI

The existing analyzer already does deterministic classification, rule matching,
and confidence scoring. AI is used for the part that is genuinely hard to
hard-code: **attribution across categories**. The model reads a curated evidence
pack and must cite the evidence IDs that support each claim.

AI is never the source of truth for what happened. It is the interpreter of what
the deterministic analyzer already measured.

## Architecture

```
demo-project/ci-runs/*.json
        │  build time (scripts/build-scenarios.js)
        ▼
  deterministic analyzer (src/analyzer — UNCHANGED)
        │
        ▼
  trimmed investigation → redact → evidence pack (E1–E11)
        │
        ▼
  committed scenario JSON in web/public/scenarios/
        │
        │  runtime
        ▼
  "What we observed" (static, always works)
        │
        │  POST /api/investigate
        ▼
  Claude (claude-opus-5) → Verdict Guard → "AI assessment"
```

The analyzer runs **at build time only**. The `web/` app is standalone and has
no dependency on the analyzer package, so there is no CommonJS/ESM interop risk
on Vercel.

## Evidence grounding

The same evidence exists in three layers:

1. **Internal Evidence Pack** — `E1`..`E11`, consumed by the model and the Guard.
2. **User-facing Evidence View** — human labels and plain-English sentences.
3. **Technical Details** — collapsed drawer showing internal IDs, rule codes,
   fingerprints, adjustment codes, and percentages.

The primary UI never renders `E1`..`E11`, `RC-xxx`, `FP-xxxxxx`, `A1`..`A9`, or a
confidence percentage. Those are confined to the Technical Details drawer.

Every "Why we think this" claim and "What argues against this" point has a
**View evidence** control that scrolls to and highlights the cited facts.

## Verdict Guard

The Guard is deterministic, pure JavaScript, and makes **no LLM or network calls**.
It runs on every model response:

- `G1` — schema validation (invalid output becomes `INSUFFICIENT_EVIDENCE`)
- `G2` — hallucinated citations are stripped
- `G3` — citations of absent evidence are stripped
- `G4` — an unsupported root cause forces `INSUFFICIENT_EVIDENCE`
- `G5` — unsupported reasoning steps are dropped
- `G6` — category/evidence coherence is checked
- `G7` — deterministic vs. AI confidence disagreement is flagged
- `G8` — insufficient-evidence output is made consistent
- `G9` — action owner/urgency sanity
- `G10` — prose leakage of internal identifiers is stripped

Example: if the model returns a `headline` of
`"E4 shows RC-018 so FP-A31C09 is a bug"`, the Guard strips `E4`, `RC-018`, and
`FP-A31C09` before that headline ever reaches the UI.

## Demo scenarios

| Scenario | Expected verdict |
| --- | --- |
| **Checkout — declined card retry** | Flaky / timing issue |
| **Billing — monthly invoice generation** | Product defect |
| **Settings — theme preference** | Not enough evidence |

The third scenario demonstrates the honest-decline path: the model should say it
cannot determine ownership, and the Guard keeps that answer consistent.

## Tech stack

- **Next.js** (App Router, JavaScript only — no TypeScript)
- **React** + **Tailwind CSS**
- **Zod** for runtime validation
- **`@anthropic-ai/sdk`** for live AI investigation
- **Node's built-in `node --test`** for tests
- **The unchanged analyzer package** for build-time deterministic analysis

## Local setup

```bash
git clone <repo-url>
cd playwright-flaky-analyzer

# 1. Build the committed scenario data (optional; committed output is included)
node scripts/build-scenarios.js

# 2. Install and run the web app
cd web
npm install
cp .env.example .env.local
# add ANTHROPIC_API_KEY to .env.local

npm run dev
```

Open `http://localhost:3000`.

## Environment variables

| Name | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes (live mode) | — | Server-side only; never `NEXT_PUBLIC_*` |
| `VERDICT_MODEL` | No | `claude-opus-5` | Model override |
| `VERDICT_EFFORT` | No | `low` | `low` / `medium` / `high` |
| `VERDICT_DEMO_ONLY` | No | `false` | Serve cached verdicts, no API calls |

If `ANTHROPIC_API_KEY` is unset, the app still renders every scenario — it falls
back to the committed cached verdict with a
**"Cached result — live AI unavailable"** badge.

## Testing

```bash
cd web
npm test              # evidence pack, schema, and Verdict Guard tests
npm run build         # production Next.js build
```

## Synthetic-data disclosure

All demo CI runs, test names, error messages, screenshots, traces, and videos are
synthetic data for a fictional product. No real application, customer, or test
run is represented. Live AI investigation is real; the underlying facts it
reasons over are not.

## AI trust & safety

- The prompt treats evidence as untrusted data, never instructions.
- The API key is server-side only.
- AI failures never produce a 5xx — the route returns the cached verdict.
- The Guard strips hallucinated citations and internal-ID leakage.

## Limitations

- P0 covers three precomputed scenarios. JSON upload is a planned P1 item.
- Cross-failure correlation, human validation, and CI integration are not yet
  implemented (see the roadmap below).
- The deterministic analyzer is intentionally not moved into the Next.js
  runtime; scenarios are generated at build time.

## Future CI integration

The `/api/investigate` seam is designed to be called from a pipeline step once
JSON upload lands in P1:

```yaml
- name: Investigate failures with VERDICT
  run: |
    curl -X POST https://<your-deployment>/api/investigate \
      -H "Content-Type: application/json" \
      -d @verdict-investigation.json
```

## Documentation

- [docs/CLI.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/CLI.md) — the original analyzer CLI reference, moved.
- [Blueprint.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/Blueprint.md) — the implementation blueprint this app follows.

## License

MIT
