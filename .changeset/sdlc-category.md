---
"katana-sdlc-skills": minor
---

Group the SDLC skills under `src/skills/sdlc/<category>/`: `branch-management/` holds
`bare-clone-workflow` and `branch-shutdown`, `code-review/` holds `visual-pr`, and
`feature-management/` holds `outcome-framing`. Install subpaths change accordingly (e.g.
`src/skills/sdlc/branch-management/branch-shutdown`); update any `apm.yml` entry that references the old
`src/skills/<name>` path. Deployed paths (`.claude/skills/<name>/`, `.agents/skills/<name>/`) are
unchanged, and `setup-katana-skills` already uses the new paths.
