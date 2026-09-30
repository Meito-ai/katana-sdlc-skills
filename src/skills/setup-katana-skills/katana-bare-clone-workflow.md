# Seed: `docs/agents/katana-bare-clone-workflow.md`

Written by step 6 of [SKILL.md](SKILL.md). Fill every `{{...}}` (a `<...>` is literal text; keep it);
drop a line marked `[if ...]` when its condition is false, and strip the marker when it is true.

````markdown
# Worktrees (bare-clone-workflow)

The facts the `bare-clone-workflow` skill defers to this repo for. Written by `/setup-katana-skills`;
edit freely.

## Layout

```
{{container}}/
├── .bare/                              git database
├── .git                                "gitdir: ./.bare"
[if workspace file]├── {{container}}.code-workspace
├── {{default-branch}}/                     worktree for the default branch
└── <branch>/                           one sibling worktree per branch
```

The layout lives on each machine, not in git. A teammate gets it with the skill's
`scripts/bare-clone-init.sh <repo-url> <container-dir>`, or by converting an existing clone
(the skill's `reference.md`).

## Per-worktree bootstrap

A new worktree has only tracked files. Run these in it, in order:

1. Copy from a sibling worktree: {{copy-files}}
2. Install: `{{install-command}}`
3. Verify: `{{verify-command}}`

The worktree is ready when the verify command passes.
````
