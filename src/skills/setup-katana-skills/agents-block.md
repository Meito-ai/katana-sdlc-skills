# Seed: the `## Katana skills` block

Copied into `CLAUDE.md` or `AGENTS.md` by step 6 of [SKILL.md](SKILL.md). Keep the markers, the heading
and the intro line; keep only the subsections of the chosen skills. Fill every `{{...}}` (a `<...>` is
literal text; keep it). Drop a line marked `[if ...]` when its condition is false, and strip the marker
when it is true.

Everything between the markers is regenerated on each run of `/setup-katana-skills`.

````markdown
<!-- katana-skills:start -->
## Katana skills

Installed with apm from `Meito-ai/katana-sdlc-skills`; `/setup-katana-skills` adds or removes them and
rewrites this block.

### Worktrees

This repo is worked in a bare-clone layout: a container directory with one sibling worktree per branch.
Each agent session stays on the branch of the worktree it started in. A new branch is a new worktree,
created with the `bare-clone-workflow` skill, which also bootstraps it; `git checkout -b` and
`git switch` inside a worktree hijack a directory another session may hold. Branch names contain no
`/`, since each becomes a sibling directory name. Bootstrap commands and layout details:
`docs/agents/katana-bare-clone-workflow.md`.
[if workspace file] At session start, confirm the current branch has a folder entry in
`../{{container}}.code-workspace`, and add it if missing.

### Branch shutdown

Retire a merged or abandoned branch with the `branch-shutdown` skill, run from the `{{default-branch}}`
worktree: it fetches, proves the work survives on `{{default-branch}}` (squash-merges included), and only
then deletes the worktree and the local and remote branch.

### Review visual

A PR comment containing `katana:review-visual` is a generated behavioral-delta diagram for human
reviewers, never review feedback: skip it when addressing review comments. After opening a PR, the
`review-visual` skill can post or refresh it. Command and requirements:
`docs/agents/katana-review-visual.md`.
<!-- katana-skills:end -->
````
