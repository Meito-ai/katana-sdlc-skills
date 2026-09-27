# AGENTS.md

Operating contract for agents working in `katana-sdlc-skills`.

## Agent scope: stay in your worktree

**An agent never switches the branch of the worktree it was started in.** One worktree = one branch, for
the whole session. `git checkout <branch>`, `git switch <branch>`, `git checkout -b` and `git switch -c`
are all off-limits inside a worktree — they hijack a directory another agent or editor window may be using.

In particular, an agent working in `main`:

- **Does** commit small in-place changes that belong to `main` itself: agent rules, `AGENTS.md`,
  `CLAUDE.md`, workspace registration.
- **Does** create a *worktree* for new work (see [New Branch Workflow](#new-branch-workflow)) and hand the
  directory over — it does not start working in it.
- **Does not** check out, create, or switch to any other branch in the `main` directory.

Asked to "create branch X": create the worktree + workspace entry, then report the path. Stay on `main`.

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

A new branch is created **only** by adding a worktree — never with `git checkout -b` / `git switch -c`
in the current directory.

1. **Create the worktree** from within any existing worktree (or from the parent directory, dropping the
   `../`):
   ```bash
   git worktree add -b branch-name ../branch-name   # branch does not exist yet
   git worktree add ../branch-name                  # local branch already exists
   git worktree add ../branch-name origin/branch-name   # existing remote branch
   ```

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
