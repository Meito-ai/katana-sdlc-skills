---
"katana-sdlc-skills": patch
---

`wsjf`, `slice-spec` and `build-up-spec` now name backlog items as epics, issues and tasks throughout,
instead of user and tech stories. An issue gets a WSJF score when it passes `wsjf`'s **value test**
(formerly the story test): if it shipped alone, would someone gain measurable value? Product, tech and
compliance issues and bug fixes are ranked in one set. Nothing changes in how items are scored; re-run
`/setup-katana-skills` to pick up the same wording in your `## Katana skills` block.
