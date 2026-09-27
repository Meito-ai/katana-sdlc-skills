# Converting an existing clone in place

Reached from [`SKILL.md`](SKILL.md). This turns a normal clone at `<repo-root>` into a bare-clone
container without re-cloning. Every untracked and ignored file passes through a temporary directory,
so the risk is concentrated in steps 4 and 6.

Prefer a fresh clone (`scripts/bare-clone-init.sh`) plus copying untracked files across whenever
re-cloning is cheap. Convert in place when the clone holds expensive local state: large caches, big
generated artefacts, a slow install.

## Before starting

- The working tree must be clean: `git status --porcelain` prints nothing. Commit or discard first.
- Inventory what is untracked and ignored, and keep the list:
  ```bash
  git status --porcelain -uall
  git ls-files --others --ignored --exclude-standard --directory
  ```
  These are the files no git operation will restore. `.env` files, generated clients and local
  databases live here.
- Note the default branch: `git symbolic-ref --short refs/remotes/origin/HEAD`.

## Steps

```bash
cd <repo-root>

# 1. The current directory becomes the container. Move the git database.
mv .git .bare

# 2. Write the pointer file that makes the container a git context.
echo 'gitdir: ./.bare' > .git

# 3. Mark the repository bare, so git stops expecting a primary working tree.
git config --bool core.bare true

# 4. Move every working-tree file out, keeping .bare and .git in place.
BACKUP="$(mktemp -d)"            # unique per run: a fixed path collides between sessions
echo "backup: $BACKUP"           # record this, it is the only copy of untracked files
for item in * .*; do
  case "$item" in
    .|..|.bare|.git) continue ;;
    *) mv "$item" "$BACKUP"/ ;;
  esac
done

# 5. Re-create the default branch as a worktree.
git worktree add ./<default-branch> <default-branch>

# 6. Restore the untracked and ignored files from the inventory, into the worktree.
#    Tracked files came back with step 5; only the inventory needs copying.
cp "$BACKUP"/path/to/.env ./<default-branch>/path/to/.env

# 7. Bootstrap and verify, using this repo's own install and test commands.
cd ./<default-branch> && <install-command> && <test-command>

# 8. Only after verification, discard the backup.
rm -rf "$BACKUP"
```

The fetch refspec is inherited from the original clone and already correct, so the `git config
remote.origin.fetch` step from a fresh setup is not needed here. Confirm `origin/HEAD` is set, since
the shutdown flow reads it:

```bash
git remote set-head origin --auto
```

## Rollback

Reversible up to the end of step 4. After step 5 the worktree exists and rollback means removing it
first with `git worktree remove ./<default-branch>`.

```bash
cd <container>
rm .git
mv .bare .git
git config --bool core.bare false
mv "$BACKUP"/* "$BACKUP"/.* . 2>/dev/null
```

## Afterwards

The container now holds one worktree. Add the rest with the [Adding a
worktree](SKILL.md#adding-a-worktree) steps, and create the workspace file if the repo uses one:

```jsonc
// <container>/<container-basename>.code-workspace
{
  "folders": [{ "name": "<default-branch>", "path": "<default-branch>" }],
  "settings": {}
}
```
