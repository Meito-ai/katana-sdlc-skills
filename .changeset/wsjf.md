---
"katana-sdlc-skills": minor
---

Publish `wsjf`, which scores and ranks epics and vertical slices by Weighted Shortest Job First:
Cost of Delay = (User/Business Value + Risk Reduction/Opportunity Enablement) × Time Criticality,
divided by Size, every input a Fibonacci value judged against already-scored items. A cold start
calibrates 3–5 anchors with the user; a single-issue mode ranks one target, a backlog mode re-scores a
set. The arithmetic, validation, ranking and block edits live in a dependency-free
`scripts/wsjf.mjs`; scores are stored as a `<!-- katana:wsjf:v1 -->` block in each item's description
and written back after one round of verification. `outcome-framing` now carries that block through a
rewrite, and `setup-katana-skills` wires a default WSJF scope.
