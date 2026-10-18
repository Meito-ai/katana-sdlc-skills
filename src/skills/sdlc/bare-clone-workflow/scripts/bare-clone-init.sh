#!/usr/bin/env bash
set -euo pipefail

# bare-clone-init.sh -- clone a repository into a bare-clone worktree layout.
#
# Creates:
#   <container>/.bare/        the git object database
#   <container>/.git          a file containing "gitdir: ./.bare"
#   <container>/<branch>/     one worktree per branch
#   <container>/<name>.code-workspace   VS Code multi-root file (opt out below)

usage() {
  cat <<'USAGE'
Usage: bare-clone-init.sh [--no-workspace] <repo-url> <container-dir> [initial-branch]

  repo-url         Git remote URL (SSH or HTTPS)
  container-dir    Directory to create as the bare-clone container
  initial-branch   First worktree branch (default: the remote's default branch)

  --no-workspace   Do not create <container-basename>.code-workspace
USAGE
}

WRITE_WORKSPACE=1
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    --no-workspace) WRITE_WORKSPACE=0 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Error: unknown option: $arg" >&2; usage >&2; exit 1 ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done

REPO_URL="${POSITIONAL[0]:-}"
CONTAINER_DIR="${POSITIONAL[1]:-}"
INITIAL_BRANCH="${POSITIONAL[2]:-}"

if [[ -z "$REPO_URL" || -z "$CONTAINER_DIR" ]]; then
  usage >&2
  exit 1
fi

if [[ -e "$CONTAINER_DIR/.bare" ]]; then
  echo "Error: $CONTAINER_DIR/.bare already exists. Aborting." >&2
  exit 1
fi

echo "==> Creating container directory: $CONTAINER_DIR"
mkdir -p "$CONTAINER_DIR"

echo "==> Cloning bare repository into $CONTAINER_DIR/.bare"
git clone --bare "$REPO_URL" "$CONTAINER_DIR/.bare"

echo "==> Writing the .git pointer file"
echo "gitdir: ./.bare" > "$CONTAINER_DIR/.git"

echo "==> Configuring the fetch refspec for remote tracking"
git -C "$CONTAINER_DIR" config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"

echo "==> Fetching remote branches"
git -C "$CONTAINER_DIR" fetch origin

# refs/remotes/origin/HEAD records the remote's default branch. `git clone
# --bare` does not set it, and branch-shutdown reads it to find the branch it
# must be run from, so set it here.
echo "==> Recording the remote default branch (refs/remotes/origin/HEAD)"
git -C "$CONTAINER_DIR" remote set-head origin --auto

if [[ -z "$INITIAL_BRANCH" ]]; then
  INITIAL_BRANCH="$(
    git -C "$CONTAINER_DIR" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null \
      | sed 's#^origin/##'
  )"
fi

if [[ -z "$INITIAL_BRANCH" ]]; then
  echo "Error: could not determine the remote default branch. Pass it as the third argument." >&2
  exit 1
fi

echo "==> Creating the worktree for '$INITIAL_BRANCH'"
git -C "$CONTAINER_DIR" worktree add "./$INITIAL_BRANCH" "$INITIAL_BRANCH"

WORKSPACE_FILE=""
if [[ "$WRITE_WORKSPACE" -eq 1 ]]; then
  shopt -s nullglob
  EXISTING_WORKSPACES=("$CONTAINER_DIR"/*.code-workspace)
  shopt -u nullglob

  if [[ "${#EXISTING_WORKSPACES[@]}" -gt 0 ]]; then
    echo "==> Keeping the existing workspace file: ${EXISTING_WORKSPACES[0]}"
    WORKSPACE_FILE="${EXISTING_WORKSPACES[0]}"
  else
    WORKSPACE_FILE="$CONTAINER_DIR/$(basename "$CONTAINER_DIR").code-workspace"
    echo "==> Creating $WORKSPACE_FILE"
    cat > "$WORKSPACE_FILE" <<WORKSPACE
{
  "folders": [
    {
      "name": "$INITIAL_BRANCH",
      "path": "$INITIAL_BRANCH"
    }
  ],
  "settings": {}
}
WORKSPACE
  fi
fi

echo ""
echo "Done. Bare-clone layout created at: $CONTAINER_DIR"
echo ""
echo "  Container:  $CONTAINER_DIR/"
echo "  Git DB:     $CONTAINER_DIR/.bare/"
echo "  Worktree:   $CONTAINER_DIR/$INITIAL_BRANCH/"
[[ -n "$WORKSPACE_FILE" ]] && echo "  Workspace:  $WORKSPACE_FILE"
echo ""
echo "Next: cd $CONTAINER_DIR/$INITIAL_BRANCH"
echo "      then run this repo's install command and create any untracked files it needs."
