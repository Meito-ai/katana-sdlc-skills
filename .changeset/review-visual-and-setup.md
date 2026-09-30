---
"katana-sdlc-skills": minor
---

Publish `review-visual` and `setup-katana-skills`.

`review-visual` posts a sticky PR comment showing a change's behavioral delta — a Mermaid diagram or
control-flow diff for the human reviewer — stamped with the PR head sha and found again by the
`<!-- katana:review-visual:v1 -->` marker on every refresh. Its dependency-free `.mjs` CLI ships inside
the skill, so a consumer needs `gh` and Node.js >= 20 on the machine but no `package.json`. Extracted
from meito, whose `meito:review-visual:v1` marker it replaces.

`setup-katana-skills` (user-invoked) detects the katana skills a repo already has, offers the rest,
installs the picks with apm at its own `ref`, converts the clone to the bare-clone layout when
`bare-clone-workflow` is picked, and wires each skill into `CLAUDE.md` / `AGENTS.md` as one
marker-delimited `## Katana skills` block plus `docs/agents/katana-*.md`. It never commits.
