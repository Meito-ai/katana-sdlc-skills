# Template: the `## Katana skills` block

Copied into `CLAUDE.md` or `AGENTS.md` by step 6 of [SKILL.md](SKILL.md). It is the only file setup
writes besides `apm.yml`, so it carries the always-on rules and the few repo facts the skills defer to
the host repo for, and nothing the skills already say.

Keep the markers, the heading and the intro line; keep only the subsections of the chosen skills. Fill
every `{{...}}` (a `<...>` is literal text; keep it). Drop a line marked `[if ...]` when its condition
is false, and strip the marker when it is true.

````markdown
<!-- katana-skills:start -->
## Katana skills

Installed with apm from `Meito-ai/katana-sdlc-skills`; `/setup-katana-skills` adds or removes them and
rewrites this block.

### Worktrees

This repo is worked in a bare-clone layout: one sibling worktree per branch. Each agent session stays
on the branch of the worktree it started in; a new branch is a new worktree, created with the
`bare-clone-workflow` skill. `git checkout -b` and `git switch` inside a worktree hijack a directory
another session may hold. Branch names contain no `/`, since each becomes a directory name.
Bootstrap a new worktree: copy {{copy-files}} from a sibling worktree, run `{{install-command}}`, then
`{{verify-command}}`.
[if workspace file] At session start, confirm the current branch has a folder entry in
`../{{container}}.code-workspace`, and add it if missing.

### Branch shutdown

Retire a merged or abandoned branch with the `branch-shutdown` skill, run from the `{{default-branch}}`
worktree: it proves the work survives on `{{default-branch}}` before deleting anything.

### WSJF

Score and rank epics and stories (user and tech) with the `wsjf` skill. WSJF scope: {{wsjf-scope}}.

### Review visual

A PR comment containing `katana:review-visual` is a generated diagram for human reviewers, never
review feedback: skip it when addressing review comments. The `review-visual` skill posts and
refreshes it after a PR is opened.
<!-- katana-skills:end -->
````
