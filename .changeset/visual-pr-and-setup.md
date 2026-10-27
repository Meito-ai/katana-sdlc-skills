---
"katana-sdlc-skills": minor
---

Publish `visual-pr` and `setup-katana-skills`.

`visual-pr` writes the PR description a reviewer reads first: a visual of the change, before/after
evidence, and merge danger (one-way or two-way door, blast radius), inspired by the
[`pr` skill](https://github.com/mattpocock/skills/tree/v1.3.1/skills/engineering/pr) in
`mattpocock/skills` (MIT). It keeps them in one block between `katana:visual-pr` markers, stamped with
the PR head sha, and refreshes it in place after every push; text outside the block is left alone. Its
dependency-free `.mjs` CLI ships inside the skill and rejects content that breaks the contract: missing
sections, an undrawable Mermaid fence, or a block over its caps. A consumer needs `gh` and Node.js >= 20
on the machine but no `package.json`.

In Claude Code, its `scripts/hook.mjs` runs as a `PostToolUse` hook on `Bash`: after a `gh pr create` or
`git push`, it reminds the agent when the PR's stamp is not `HEAD`, since model invocation alone tends to
skip the refresh. `setup-katana-skills` offers to add it to `.claude/settings.json`.

`setup-katana-skills` (user-invoked) detects the katana skills a repo already has, offers the rest,
installs the picks with apm at its own `ref`, converts the clone to the bare-clone layout when
`bare-clone-workflow` is picked, and wires each skill into `CLAUDE.md` / `AGENTS.md` as one
marker-delimited `## Katana skills` block. It never commits.
