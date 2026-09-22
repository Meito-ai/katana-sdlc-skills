# AGENTS.md

Operating contract for agents working in `katana-sdlc-skills`.

## Repository layout (bare-clone worktrees)

This repo uses a bare-clone worktree layout. The parent directory holds the git metadata; every branch
lives as a sibling worktree directory beside it. No worktree is "special" — `main` is simply the
long-lived one.

```
katana-sdlc-skills/                  ← parent directory (git root, .git → ./.bare)
├── .bare/                           ← bare repository (all git metadata)
├── .git                             ← file containing "gitdir: ./.bare"
├── katana-sdlc-skills.code-workspace
├── main/                            ← worktree for the main branch
└── <branch-name>/                   ← one worktree per active branch
```

Git commands work from the parent directory and from inside any worktree.

## Branch naming

Use a flat prefix with `-` (not `/`) so branch names work as worktree directory names:

- `feat-*` — feature branch (e.g. `feat-review-skill`)
- `fix-*` — bug fix / quick fix branch (e.g. `fix-skill-frontmatter`)
- `tech-*` — technical branch (e.g. `tech-bump-deps`)
- `doc-*` — documentation branch (e.g. `doc-worktree-workflow`)

**Why no `/`?** Each branch becomes a sibling directory via `git worktree add ../branch-name`. A `/` in
the name creates nested directories instead of flat siblings.

## Existing Worktree Session Setup

When starting work in an existing worktree, verify it is fully registered before making changes:

1. **Check the branch/worktree name:**
   ```bash
   git branch --show-current
   ```

2. **Verify VS Code workspace registration** — `../katana-sdlc-skills.code-workspace` must contain the
   current branch:
   ```jsonc
   { "name": "branch-name", "path": "branch-name" }
   ```

If workspace registration is missing, fix it before continuing.

## New Branch Workflow

1. **Create the worktree** from within any existing worktree (or from the parent directory, dropping the
   `../`):
   ```bash
   git worktree add ../branch-name
   ```
   Use `git worktree add -b branch-name ../branch-name` when the branch does not exist yet, or
   `git worktree add ../branch-name origin/branch-name` to check out an existing remote branch.

2. **Register in the VS Code workspace** — edit `../katana-sdlc-skills.code-workspace` and add the folder:
   ```jsonc
   { "name": "branch-name", "path": "branch-name" }
   ```

Both steps are **mandatory** — never skip the workspace registration.

## Branch Shutdown

When a branch is merged or no longer needed, clean it up in this order:

1. **Remove the worktree** — from any *other* worktree (you cannot remove the one you're in):
   ```bash
   git worktree remove ../branch-name
   ```
   This unregisters the worktree from git and deletes the directory, including any untracked files in it.
   Confirm anything durable was committed before the PR merged; after this step it is gone.

2. **Remove from the VS Code workspace** — edit `../katana-sdlc-skills.code-workspace` and delete the
   folder entry:
   ```jsonc
   { "name": "branch-name", "path": "branch-name" }  // ← remove this line
   ```

3. **Delete the directory** (if still present) — `git worktree remove` should handle this, but if the
   directory lingers:
   ```bash
   rm -rf ../branch-name
   ```

4. **Delete the local branch:**
   ```bash
   git branch -d branch-name
   ```
   Use `-D` instead of `-d` if the branch was not fully merged.

5. **Delete the remote branch:**
   ```bash
   git push origin --delete branch-name
   ```

All steps are **mandatory** — incomplete cleanup leaves stale worktrees, branches, or workspace entries.

## Re-creating this layout from scratch

```bash
mkdir -p katana-sdlc-skills && cd katana-sdlc-skills
git clone --bare git@github.com:Meito-ai/katana-sdlc-skills.git .bare
git --git-dir=.bare config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
echo 'gitdir: ./.bare' > .git
git worktree add main
```
