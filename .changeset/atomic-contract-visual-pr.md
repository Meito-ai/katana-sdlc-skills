---
"katana-sdlc-skills": minor
---

`visual-pr` is now an **atomic skill**, and the atomic contract is written down in `AGENTS.md`: an atomic
skill never asks you anything, never touches the tracker and never calls a flow, takes every input
explicitly, and ends with one result: `done`, `decision needed` or `blocked`. CI fails when a skill in
`src/skills/sdlc/atomic/` breaks it.

- **New path:** `sdlc/atomic/visual-pr` (was `sdlc/flows/visual-pr`, and `sdlc/code-review/visual-pr`
  before that). **Rerun `/setup-katana-skills`**, or edit the path in your `apm.yml` by hand.
- **New invocation:** `node <skill-dir>/scripts/cli.mjs write --run-dir <dir> [--pr <number>]` reads the
  content from `<dir>/visual-pr/content.md`. The `--body <file>` option is gone.
- **The PR must already exist.** `visual-pr` no longer opens one; open it, then write its description.
- **Results:** the CLI prints `done: <PR url>`, or `blocked: <reason>` for a missing run directory or PR,
  a head that is not pushed, or a broken marker. Repair what it names and run it again.
