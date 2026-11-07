---
"katana-sdlc-skills": patch
---

`implement-issue` is a new skill that takes one issue to an open PR. Run `/implement-issue <issue>`, or
ask the agent to pick an issue up. It reads the issues `build-up-spec`, `slice-spec` and `bug-intake`
publish, from Linear, from GitHub, or pasted as text:

- **Triages the design.** `Design: settled` goes straight to the build. `Design: needed` (a design
  placeholder, a testing seam that no longer reaches the behaviour, or a new decision) is drafted into
  the issue, and into architecture decision records (ADRs) where your repo keeps them, then waits for
  your approval before any code is written or anything is published. ADRs follow your repo's criteria,
  or Spotify's when it states none.
- **Builds test-first** at the issue's testing seams with `tdd`, or `diagnosing-bugs` for a bug, then
  reviews the change against the issue with `code-review`.
- **Brings your docs up to date** and opens the PR with `visual-pr` when it is installed, with a
  closing reference and the triage verdict.
- **Builds a small epic directly.** An epic with no sub-issues that one session can finish is built as
  one issue, its PRD's requirements as the criteria; a larger one goes to `/slice-spec`.
- **Routes the rest.** An epic with sub-issues offers its unblocked ones to pick from, highest WSJF
  first; an issue with an open blocker stops unless you stack it on the blocker's branch; one with
  incomplete criteria stops; a trivial change described in text (a typo, a dependency bump) takes a
  short path; any other text goes to `/build-up-spec` or `/bug-intake`.

It needs `tdd`, `code-review`, `codebase-design` and `diagnosing-bugs` from `mattpocock/skills`
>= v1.3.2. Install it with `/setup-katana-skills`, which adds them.
