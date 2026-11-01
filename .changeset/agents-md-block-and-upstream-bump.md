---
"katana-sdlc-skills": patch
---

`setup-katana-skills` now always writes the `## Katana skills` block into `AGENTS.md`, creating the
file when missing, so agents other than Claude Code see it as well. It also writes the block into
`CLAUDE.md`, unless that file references `AGENTS.md` (an `@AGENTS.md` import or a plain mention), in
which case `CLAUDE.md` is left alone. `build-up-spec` and `paas-pulumi-infra-setup` write their lines to the same files.
`mattpocock/skills` is now pinned at `^1.3.2`, both for this repo and in `build-up-spec`'s `apm.yml`.
