# DEMO_AI_APPENDIX.md — optional AI talking points 🎤

> Private, just for me. Gitignored, not in the npm package, not linked from the README.
>
> This is the AI-related material that used to live inside `DEMO.md`'s main flow. The core demo
> script is now AI-free end to end — deterministic classification, rules, evidence, the Flaky
> Tests Trend, and the CI gate never require AI, and I'd rather the live demo prove that by never
> touching the topic unless someone asks. Keep this appendix in your back pocket for exactly that:
> if AI comes up in Q&A, or if a specific audience wants the AI story, use this. Otherwise skip it.

---

## If you want to show the `--format ai-assistant` output

*(This is a different feature from "AI Investigation" — it doesn't call any AI itself. It just
writes context + prompts for whatever assistant you already use.)*

```bash
node ../playwright-flaky-analyzer/src/cli/run-analysis.js analyze ./ci-runs --format ai-assistant
```

"Same command, one more `--format`. This one writes two files: some context, and a set of
ready-to-paste prompts. So you open whatever assistant you use — Copilot, Claude, Gemini — you
feed it that context and a prompt, and it can go fix the flaky test with the full history already
in hand. The tool does the diagnosis; your assistant does the actual fix."

*(This leads straight into the AI question — take it head-on, calm.)*

"And you'll notice I did *not* put an AI inside the tool itself. That's on purpose, and it's a
fair thing to ask about — the diagnosis I want to be identical every single time, and I don't want
our test data leaving the machine. Fixed rules give me that: same input, same answer, and I can
show you exactly why. AI is great for the open-ended part — writing the fix — and that's where I
lean on it. Diagnosis stays boring and reproducible; the fix is where the AI helps."

---

## AI-specific Q&A

**"Why the AI Assistant output / why not AI everywhere?"**
"Tool does the diagnosis, your assistant does the fix, with our context handed to it. Keeping the
AI outside is what keeps the analysis reproducible and the data local."

**"Does it have any other AI features?"**
"There's a separate, fully optional 'AI Investigation' layer if a team wants an LLM's narrative
summary layered on top of the deterministic report — offline paste-based, or an opt-in network
call to Claude with redaction on by default. It's clearly labeled optional/experimental in the
docs, and it never changes the classification, rules, or confidence underneath it. I don't
usually demo it live, because the point of today was showing what the tool does *without* AI."

**"Is the root cause AI?"** *(if it comes up again after the main demo)*
"No — it's a set of fixed rules. Same error, same answer, every time, and I can point at the rule
that fired."

---

## Related

Main script: [DEMO.md](./DEMO.md) · Design reasoning: [DESIGN_DECISIONS.md § AI Investigation as Enrichment](./DESIGN_DECISIONS.md#ai-investigation-as-enrichment-additive-offline-first)
