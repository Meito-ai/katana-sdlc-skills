---
"katana-sdlc-skills": minor
---

`setup-katana-skills` now rewrites old paths: every SDLC skill moved into `src/skills/sdlc/flows/` and the area folders are gone. The paas skills
and `setup-katana-skills` keep their paths. The old paths do not exist at this release, so an `apm.yml`
entry that pins one fails to install.

**Rerun `/setup-katana-skills`.** It lists each entry at an old path with its new one, then rewrites
it and sets its `ref:` to the release you pinned for setup. Or edit the paths by hand:

| Old path | New path |
|---|---|
| `sdlc/branch-management/bare-clone-workflow` | `sdlc/flows/bare-clone-workflow` |
| `sdlc/branch-management/branch-shutdown` | `sdlc/flows/branch-shutdown` |
| `sdlc/code-review/visual-pr` | `sdlc/flows/visual-pr` |
| `sdlc/feature-management/outcome-framing` | `sdlc/flows/outcome-framing` |
| `sdlc/feature-management/issue-tracker` | `sdlc/flows/issue-tracker` |
| `sdlc/feature-management/wsjf` | `sdlc/flows/wsjf` |
| `sdlc/feature-management/build-up-spec` | `sdlc/flows/build-up-spec` |
| `sdlc/feature-management/slice-spec` | `sdlc/flows/slice-spec` |
| `sdlc/feature-management/bug-intake` | `sdlc/flows/bug-intake` |
| `sdlc/implementation/implement-issue` | `sdlc/flows/implement-issue` |
