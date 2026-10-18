---
name: branch-shutdown
description: "Retire a merged or abandoned git branch: remove its worktree, then delete the branch locally and on the remote. Use when the user says a branch is merged, or asks to clean up, remove, delete or shut down a branch. Fetches from the remote first and deletes nothing until it has proven the work survives on the default branch, so squash-merged branches pass and branches carrying unique commits stop the run."
---

# Branch Shutdown

Two phases, in order. **Gate** reads: it fetches from the remote and gives each named branch a
verdict. **Teardown** writes: it deletes only what the gate passed. No deletion happens while any
named branch is still unjudged.

The gate exists because deleting an unmerged branch orphans its commits. The files introduced on it
survive only as dangling objects until `gc.reflogExpire` (90 days by default) and look, to everyone
reading history, as if they were never written. A stale local view of the default branch causes this:
a merge that happened an hour ago is invisible until you fetch.

## Input

The user names the branches. Accept one or several; **discovery is out of scope** — never scan for
branches that look merged and retire them. Ask for the names when they are absent rather than
inferring them from the current directory.

## Step 1: Preconditions

**Find the layout.** `git worktree list` whose first line ends in `(bare)` is a bare-clone container,
and the container is the parent of the common dir:

```bash
CONTAINER="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
git worktree list
```

A single-line `git worktree list` with a `<repo>/.git` common dir is a plain clone. Follow
[Plain clones](#plain-clones) for the teardown phase; the gate below is identical.

**Find the default branch**, in this order, stopping at the first that answers:

```bash
git symbolic-ref --short refs/remotes/origin/HEAD          # -> origin/main
gh repo view --json defaultBranchRef --jq .defaultBranchRef.name
```

Ask the user when both are silent.

**Run the teardown from the default branch's worktree.** Git refuses to remove the worktree you are
standing in, and switching a worktree to another branch hijacks a directory another session may hold.

When the current worktree is one being retired, or is any worktree other than the default branch's:
run **all of Step 2** here, since it only reads. Report the verdicts. Then stop and hand off:

> Verdict for `<branch>`: SQUASHED (PR #12, merged). Teardown must run from
> `<container>/<default-branch>`. End this session — its directory is about to be deleted — then in
> the default branch's worktree, run: shut down branch `<branch>`.

## Step 2: Gate

Run every check for every named branch, then report. Nothing is deleted in this step.

### 2a. Refresh the remote view

```bash
git fetch origin --prune
```

### 2b. Tip agreement

The local branch and `origin/<branch>` must point at the same commit. A difference means unpushed or
unpulled work, and a gate that silently picks one tip judges the wrong commit.

```bash
git rev-parse <branch> origin/<branch>
git log --oneline <branch>..origin/<branch>    # on the remote only
git log --oneline origin/<branch>..<branch>    # local only
```

- **Same commit** — continue to 2c.
- **Local is behind** — fast-forward it, then continue. From the branch's own worktree:
  `git -C "$CONTAINER"/<dir> pull --ff-only`. With no worktree for it:
  `git fetch origin <branch>:<branch>`.
- **Local is ahead, or the two diverged** — verdict **DIVERGED**. Show both logs. The branch keeps
  commits the remote has never seen; push them or discard them deliberately before any shutdown.

### 2c. The remote branch is absent

`origin/<branch>` may be missing for opposite reasons, and they carry opposite risk. Tell them apart:

```bash
gh pr list --head <branch> --state all --json number,state,mergedAt,mergeCommit,url
```

- **A merged PR exists** — the remote branch was reaped after the merge. Safest possible state.
  Skip the remote-deletion step in teardown.
- **No PR ever existed** — the branch was never pushed, so the local branch is the *only* copy of the
  work. The reachability check in 2d is the sole protection; treat its verdict as final.

### 2d. Verdict

Take the first answer:

1. **`gh` reports the PR merged** → **MERGED**.
2. **The tip is an ancestor of the default branch** → **MERGED**.
   ```bash
   git merge-base --is-ancestor <branch> origin/<default-branch> && echo MERGED
   ```
3. **The branch's content is already on the default branch** → **SQUASHED**. Squash- and
   rebase-merges land the work under new SHAs, so check 2 reports a false negative for the most
   common merge mode. Compare content, file by file: every file the branch touched must be identical
   on the default branch.
   ```bash
   git diff --name-only origin/<default-branch>...<branch> | while read -r f; do
     git diff --quiet origin/<default-branch> <branch> -- "$f" || echo "STILL DIFFERS: $f"
   done
   ```
   **Empty output** is the verdict: the content survives on the default branch. Any `STILL DIFFERS`
   line names a file whose branch version exists nowhere else — that is case 5, not this one.

   `git cherry origin/<default-branch> <branch>` is a useful commit-level cross-check (`-` means the
   commit has an equivalent upstream) but it is **not** sufficient: it compares patch-ids, so a
   squash of several commits into one matches nothing and every line comes back `+`. Measured, not
   assumed. Trust the per-file comparison.
4. **An open PR exists** → **OPEN**. Shutdown is premature. Offer to close the PR
   (`gh pr close <number>`), which converts this to case 5 on a re-run.
5. **Otherwise** → **ORPHANS**. The branch carries commits and files that exist nowhere else.

### 2e. Report

Print one line per branch: name, verdict, and for MERGED or SQUASHED the PR number or merge commit.
**MERGED** and **SQUASHED** proceed to teardown. **DIVERGED** and **OPEN** stop, with the resolution
from their step. **ORPHANS** stops until Step 2f completes.

### 2f. ORPHANS: what is being discarded

Show exactly what disappears:

```bash
git log --oneline origin/<default-branch>..<branch>
git diff --name-only origin/<default-branch>...<branch>
git rev-parse <branch>        # record this SHA in the conversation: it is the recovery handle
```

Then offer three resolutions and let the user pick one:

1. **Merge it, or open a PR** — preferred. Re-run the gate afterwards.
2. **Move the valuable commits elsewhere** (cherry-pick onto another branch), then re-run the gate.
3. **Discard deliberately** — the user names each listed file and confirms it is meant to go. Name
   the files individually; a general go-ahead does not authorize this. Only this resolution
   authorizes `git branch -D` in Step 3e.

## Step 3: Teardown

Per branch that passed, in this order. `<dir>` is the worktree directory, which may differ from the
branch name.

### 3a. Show what the worktree removal destroys

`git worktree remove` deletes the directory with every untracked and ignored file in it. Those files
are in no commit and no remote.

```bash
git -C "$CONTAINER"/<dir> status --porcelain -uall
git -C "$CONTAINER"/<dir> ls-files --others --ignored --exclude-standard --directory
```

Show both lists and ask the user to confirm. Add one line: copy anything that still matters out of
the directory now. Then proceed.

### 3b. Remove the worktree

```bash
git -C "$CONTAINER" worktree remove ./<dir>
```

A dirty worktree stops this command. Confirm with the user before `--force`.

### 3c. Remove the workspace entry

Glob `"$CONTAINER"/*.code-workspace`:

- **One match** — delete the branch's folder entry, and leave the remaining JSON valid (watch the
  comma on the preceding entry):
  ```jsonc
  { "name": "<dir>", "path": "<dir>" }
  ```
- **No match** — this repo does not use the convention. Say so in one line and move on.
- **Several matches** — ask which file to edit.

### 3d. Delete a lingering directory

`git worktree remove` normally handles this. When the directory survives:

```bash
rm -rf "$CONTAINER"/<dir>
git -C "$CONTAINER" worktree prune
```

### 3e. Delete the local branch

```bash
git -C "$CONTAINER" branch -d <branch>
```

`-d` refuses an unmerged branch, which is a second line of defence behind the gate. **A refusal here
means the gate's verdict and git's view disagree** — re-run Step 2d rather than reaching for `-D`.

`-D` is authorized by exactly one thing: resolution 3 of Step 2f, with the discarded files named.
Record `git rev-parse <branch>` before deleting, so the work is recoverable from the dangling pool.

### 3f. Delete the remote branch and its tracking ref

A merged PR does not always reap the remote branch.

```bash
git push origin --delete <branch>
git branch -dr origin/<branch>
```

Skip the push when 2c found the remote branch already reaped. `remote ref does not exist` means the
same thing and is harmless; run the `-dr` either way.

### 3g. Update the default branch

Once, after the last branch is torn down:

```bash
git pull --ff-only
```

## Step 4: Verify

```bash
git worktree list          # no entry for any retired branch
git branch -a              # no local branch and no origin/<branch> for any retired branch
```

Check the workspace file holds no entry for the retired branches. Report what was deleted, and
restate any verdict that stopped short, so a DIVERGED or OPEN branch is not mistaken for done.

## Plain clones

A plain clone has one working tree and no container. Steps 3a to 3d do not apply, and neither does
the default-branch-worktree precondition. The gate is unchanged and carries the value.

`git branch -d` refuses to delete the branch that is checked out, so switch first. **This is the one
place switching branches is correct** — a plain clone has no sibling worktrees for another session to
hold. Require a clean working tree before switching, since a switch with local changes carries them
onto the default branch:

```bash
git status --porcelain              # must be empty
git switch <default-branch>
```

Then run 3e, 3f, 3g and Step 4.

## Pairing

This skill and `bare-clone-workflow` are designed as a pair: that one creates and adds worktrees,
this one retires them. Each works installed alone.

```yaml
# apm.yml
dependencies:
  apm:
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/bare-clone-workflow
      ref: "^0.2.0"
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-shutdown
      ref: "^0.2.0"
```

Without `gh` installed and authenticated, step 2c and case 1 of step 2d are unavailable. Verdicts then
rest on `merge-base` and the per-file content comparison, which still separate MERGED and SQUASHED
from ORPHANS. What is lost is the PR state: an open PR becomes indistinguishable from ORPHANS, and a
branch whose remote was reaped cannot be told from one that was never pushed. Say so when reporting
the verdict, and treat the absent remote branch as never-pushed, which is the careful reading.
