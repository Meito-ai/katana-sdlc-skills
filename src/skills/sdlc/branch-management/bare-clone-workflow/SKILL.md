---
name: bare-clone-workflow
description: "Git bare-clone worktree layout: a container directory holding .bare, with one sibling worktree directory per branch and no primary checkout. Use when cloning a repository into this layout, converting an existing clone to it, adding a worktree to an existing container, or when the user says bare clone or bare worktree. Retiring a branch is the branch-shutdown skill instead."
---

# Bare-Clone Worktree Workflow

A bare-clone layout separates the git database from the working trees, so every branch is an
equal-status worktree. There is no primary checkout: `main`, `feat-foo` and `fix-bar` are peers
inside a **container** directory.

```
<container>/
├── .bare/                        git object database (what .git/ normally holds)
├── .git                          file containing "gitdir: ./.bare"
├── <container>.code-workspace    VS Code multi-root file, one folder per worktree
├── main/                         worktree
└── feat-my-feature/              worktree
```

**The container root is not a working tree.** It holds no project files. Build tools, tests, editors
and agent sessions target a worktree directory, never the container.

## Locating the container

Every command below needs the container path. From inside any worktree:

```bash
CONTAINER="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
```

`git worktree list` confirms the layout: its first line ends in `(bare)`. A plain clone has no such
line, and its common dir is `<repo>/.git` rather than `<container>/.bare` — a plain clone is not this
layout, and the worktree steps below do not apply to it.

## Fresh clone

```bash
<skill-dir>/scripts/bare-clone-init.sh [--no-workspace] <repo-url> <container-dir> [initial-branch]
```

`<skill-dir>` is where this skill is deployed: `.claude/skills/bare-clone-workflow/` for Claude Code,
or `.agents/skills/bare-clone-workflow/`. The deployed path is the skill name alone — any source
nesting under `src/skills/` is stripped on install.

The script clones into `<container>/.bare`, writes the `.git` pointer, widens the fetch refspec,
fetches, records `refs/remotes/origin/HEAD`, creates the first worktree, and creates
`<container-basename>.code-workspace` unless one already exists. With no `initial-branch` it uses the
remote's default branch.

Run the equivalent by hand when the script is not on disk:

```bash
mkdir -p <container> && cd <container>
git clone --bare <repo-url> .bare
echo 'gitdir: ./.bare' > .git
git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
git fetch origin
git remote set-head origin --auto
git worktree add ./<branch> <branch>
```

Then bootstrap the worktree: see [Per-worktree bootstrap](#per-worktree-bootstrap).

## Adding a worktree

Pass the directory and the branch as separate arguments, so the branch name never constrains the
directory name.

```bash
cd "$CONTAINER"

git worktree add ./<dir> -b <branch> <start-point>   # new branch
git worktree add ./<dir> <branch>                    # existing local branch
git fetch origin && git worktree add ./<dir> origin/<branch>   # existing remote branch
```

Then register it in the workspace file and bootstrap it. Both steps below are part of adding a
worktree, not optional follow-ups.

### Workspace registration

Glob `"$CONTAINER"/*.code-workspace`:

- **One match** — add the folder entry, keeping the existing formatting:
  ```jsonc
  { "name": "<dir>", "path": "<dir>" }
  ```
- **No match** — this repo does not use the convention. Say so in one line and move on.
- **Several matches** — ask which file to edit.

### Per-worktree bootstrap

A new worktree has only tracked files. Whatever the repo keeps untracked is absent: `.env` files,
generated clients, `node_modules/`, local caches. The install command and the untracked files a
worktree needs are properties of the host repo, documented in its own `AGENTS.md` or `README.md`
(`setup-katana-skills` writes them into its `## Katana skills` block).
Read that, then run it — for example `pnpm install --frozen-lockfile` plus copying `.env` from a
sibling worktree. Finish by running the repo's build or test command once, so the worktree is known
good before work starts.

## Removing a worktree

This is the mechanic, not a branch retirement: the branch survives in the git database and can be
checked out again.

```bash
cd "$CONTAINER"
git worktree remove ./<dir>            # refuses if the worktree is dirty
git worktree remove --force ./<dir>    # discards uncommitted changes
git worktree prune                     # clears metadata for directories deleted by hand
```

`git worktree remove` deletes the directory, **including every untracked and ignored file in it**.
List them first and show the user:

```bash
git -C ./<dir> status --porcelain -uall
git -C ./<dir> ls-files --others --ignored --exclude-standard --directory
```

**Retiring a branch for good is a different job.** Use the `branch-shutdown` skill from this package,
which gates on whether the work survived somewhere else before anything is deleted. Without that
skill installed, the irreducible minimum is: `git fetch origin`, confirm the branch tip is reachable
from the default branch, and only then delete the worktree, the local branch and the remote branch.

```yaml
# apm.yml -- the two skills are designed as a pair
dependencies:
  apm:
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-management/bare-clone-workflow
      ref: "^0.2.0"
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-management/branch-shutdown
      ref: "^0.2.0"
```

## Converting an existing clone

Moving a normal clone to this layout in place is a once-per-repo operation that shuffles every
untracked file through a temporary directory. The procedure, with its rollback, is in
[`reference.md`](reference.md). Read it before starting; a fresh clone plus copying untracked files
across is the safer route when the repo is easy to re-clone.

## Quick reference

| Task                       | Command                                              |
| -------------------------- | ---------------------------------------------------- |
| Find the container         | `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"` |
| Confirm the layout         | `git worktree list` (first line ends in `(bare)`)    |
| List worktrees             | `git worktree list`                                  |
| Add worktree, new branch   | `git worktree add ./<dir> -b <branch> <start>`       |
| Add worktree, existing     | `git worktree add ./<dir> <branch>`                  |
| Remove worktree            | `git worktree remove ./<dir>`                        |
| Prune stale entries        | `git worktree prune`                                 |
| Find the default branch    | `git symbolic-ref --short refs/remotes/origin/HEAD`  |
| Verify the `.git` pointer  | `cat "$CONTAINER"/.git`                              |

## Where this goes wrong

1. **The `.git` pointer file is missing.** Without `echo 'gitdir: ./.bare' > .git`, the container root
   is not a git context and worktree commands fail with "not a git repository".

2. **`core.bare` is false after an in-place conversion.** Git then believes a primary working tree
   exists and refuses to create a worktree for the branch that was checked out. Set it:
   `git config --bool core.bare true`.

3. **The fetch refspec is narrow.** `git clone --bare` sets a refspec that does not update
   remote-tracking branches, so `git fetch` appears to do nothing. Widen it:
   `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`.

4. **`refs/remotes/origin/HEAD` is unset.** `git clone --bare` may not set it, and it is how the
   default branch is discovered later. Set it with `git remote set-head origin --auto`.

5. **Commands run from the container root.** It has no project files. `cd` into a worktree first.

6. **A new worktree is used before bootstrap.** Untracked files are per-worktree, so a fresh one has
   no `.env` and no generated code, and fails in ways that look like code bugs.
