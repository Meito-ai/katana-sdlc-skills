---
"katana-sdlc-skills": patch
---

`implement-issue` is a new skill that takes one issue to an open PR. Run `/implement-issue <issue>`, or
ask the agent to pick an issue up. It reads the issues `build-up-spec`, `slice-spec` and `bug-intake`
publish, from Linear, from GitHub, or pasted as text:

- **Triages the design.** `Design: settled` goes straight to the build. `Design: needed` (a design
  placeholder, a testing seam that no longer reaches the behaviour, or a new decision) is drafted into
  the issue, and into decision records where your knowledge base keeps them, then waits for your
  approval before any code is written or anything is published.
- **Builds test-first** at the issue's testing seams with `tdd`, or `diagnosing-bugs` for a bug, then
  reviews the change against the issue with `code-review`.
- **Brings your docs up to date** and opens the PR with `visual-pr` when it is installed, with a
  closing reference and the triage verdict.
- **Routes the rest.** An epic offers its unblocked sub-issues to pick from; an issue with an open
  blocker or incomplete criteria stops; a trivial change described in text (a typo, a dependency bump)
  takes a short path; any other text goes to `/build-up-spec` or `/bug-intake`.

It needs `tdd`, `code-review`, `codebase-design` and `diagnosing-bugs` from `mattpocock/skills`
>= v1.3.2. Install it with `/setup-katana-skills`, which adds them.
