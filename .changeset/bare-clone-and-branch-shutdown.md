---
"katana-sdlc-skills": minor
---

Publish the first two skills: `bare-clone-workflow` and `branch-shutdown`.

`bare-clone-workflow` sets up and manages bare-clone worktree layouts — a container directory holding
`.bare` with one sibling worktree per branch. It ships `scripts/bare-clone-init.sh`, which now also
records `refs/remotes/origin/HEAD` and creates `<container>.code-workspace`, and it defaults the first
worktree to the remote's default branch instead of assuming `main`. In-place conversion of an existing
clone lives in `reference.md`.

`branch-shutdown` retires a merged or abandoned branch. It fetches from the remote before judging
anything, requires the local and remote tips to agree, asks GitHub for the PR state, and recognises
squash- and rebase-merges via `git cherry` so the common merge mode is not reported as unmerged. It
lists the untracked and ignored files a worktree removal would destroy before asking to proceed, and
it accepts several branches at once, gating all of them before deleting any.

Both skills are repo-agnostic: the default branch, the layout (bare-clone or plain clone) and the VS
Code workspace file are all detected, and per-worktree bootstrap defers to the host repo's own
`AGENTS.md`.

`AGENTS.md` now points at these skills instead of carrying its own copies of the two procedures.
