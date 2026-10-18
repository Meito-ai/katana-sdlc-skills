---
"katana-sdlc-skills": minor
---

Move `bare-clone-workflow`, `branch-shutdown` and `review-visual` under the `sdlc` category. Their
install subpaths are now `src/skills/sdlc/<name>`; update any `apm.yml` entry that references the old
`src/skills/<name>` path. Deployed paths (`.claude/skills/<name>/`, `.agents/skills/<name>/`) are
unchanged, and `setup-katana-skills` already uses the new paths.
