---
"katana-sdlc-skills": patch
---

`setup-katana-skills` offers `implement-issue`, and gives your `## Katana skills` block an
`### Implementation` subsection with a `Checks:` line: the typecheck, single-test-file and full-suite
commands it runs. It also writes one direct `mattpocock/skills` entry in your `apm.yml` that lists every
upstream skill your chosen katana skills need; without it, apm keeps only one skill's subset and
silently drops the others. Re-run `/setup-katana-skills` to pick this up.
