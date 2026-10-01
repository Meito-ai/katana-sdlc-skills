---
name: setup-katana-skills
description: "Pick which katana skills this repo uses, install them with apm, and wire each one into the repo's agent instructions so it works in this repo's SDLC. Converts the clone to the bare-clone layout when bare-clone-workflow is picked."
disable-model-invocation: true
---

# Setup katana skills

Install the katana skills the user picks and **wire** each one into this repo: the always-on rules an
agent must see every session, plus the repo-specific facts a skill defers to the host repo for. A skill
that is installed but not wired is dead weight; wiring is the point.

Keep the footprint minimal: setup writes `apm.yml` and one marker-delimited block in `CLAUDE.md` or
`AGENTS.md`, plus one optional line in a PR workflow doc. Whatever a skill's own `SKILL.md` already
says stays out of the block.

The skills this setup manages, all from `Meito-ai/katana-sdlc-skills` at `src/skills/<name>`:

| Skill | Wiring it needs | Available when |
|---|---|---|
| `bare-clone-workflow` | worktree rules, bootstrap commands, the layout itself | always |
| `branch-shutdown` | one rule naming the default branch | always |
| `review-visual` | the marker-skip rule | `origin` is on GitHub |

This is a prompt-driven skill. Explore, present, confirm, then write. Nothing is committed: the user
reviews and commits the result.

## 1. Explore

Read the repo's actual state; assume nothing.

- **Remote and default branch**: `git remote -v`, `git symbolic-ref --short refs/remotes/origin/HEAD`.
  A non-GitHub `origin` makes `review-visual` unavailable.
- **apm**: `apm.yml` must exist; without it, stop and say this setup supports apm-managed repos only.
  `apm --version` must be >= 0.16 for a semver `ref:` range.
- **Setup's own pin**: the `apm.yml` entry for `Meito-ai/katana-sdlc-skills/src/skills/setup-katana-skills`
  and its `ref:` string. Every skill this run adds gets that exact string. No such entry: ask for the ref.
- **Installed katana skills**: `apm.yml` entries under `Meito-ai/katana-sdlc-skills/src/skills/`, and
  deployed copies in `.claude/skills/<name>/` or `.agents/skills/<name>/`. These arrive pre-selected.
- **Layout**: `git worktree list`. A first line ending in `(bare)` means the repo is already a bare
  clone, so there is nothing to convert. Otherwise note `git status --porcelain`.
- **Agent instructions**: `CLAUDE.md`, `AGENTS.md`, and an existing `<!-- katana-skills:start -->`
  block from an earlier run.
- **Bootstrap signals** (for `bare-clone-workflow`): lockfiles and manifests (`pnpm-lock.yaml`,
  `package-lock.json`, `uv.lock`, `poetry.lock`, `go.mod`, `Cargo.toml`, `Gemfile.lock`, `Makefile`),
  setup sections of `README.md` / `CONTRIBUTING.md`, and ignored files a fresh worktree would lack
  (`git ls-files --others --ignored --exclude-standard --directory`: `.env`, local config).
- **Editor**: `.vscode/`, `.cursor/`, or an existing `*.code-workspace`.
- **Tooling** (for `review-visual`): `node --version` (>= 20) and `gh auth status`.
- **PR workflow doc** (for `review-visual`): a doc describing how PRs are opened here, e.g.
  `CONTRIBUTING.md` or `docs/**/development*.md`.

Done when every bullet has an answer.

## 2. Present and choose

Summarise what exploration found. Then take the questions in order, one answer each, leading with the
recommended answer so the user can accept it in a word. Skip a question exploration already settled.

1. **Skills.** List the three skills with their state (installed / not installed / unavailable, with the
   reason). Installed skills are pre-selected. The user picks any subset; unselecting an installed skill
   removes it. When `review-visual` is picked but `node` or `gh` failed its check, say which and ask
   whether to install it anyway.
2. **Conversion** (`bare-clone-workflow` picked, repo not yet bare). Recommend converting this clone to
   the bare-clone layout now: the wiring describes that layout. It moves every file in the repo, so get
   an explicit yes. A dirty tree blocks it: the user commits or discards first, then re-runs.
3. **Workspace file** (converting). Recommend yes when the user works in VS Code or Cursor, else no.
4. **Bootstrap** (`bare-clone-workflow` picked). Propose the install command, the files to copy from a
   sibling worktree, and a verify command (build or test), from the bootstrap signals.
5. **PR workflow line** (`review-visual` picked, a PR workflow doc found). Recommend adding one line to
   it: after opening a PR, optionally post a review visual.

## 3. Draft

Show the user, and let them edit before anything is written:

- the `apm.yml` entries to add and remove;
- the `## Katana skills` block, from [agents-block.md](agents-block.md), keeping only the subsections
  of the chosen skills, placeholders filled (with no files to copy, drop the "copy ... from a sibling
  worktree" clause);
- the PR workflow line, if any.

Read every file in this skill folder before step 4: conversion moves this folder along with the rest of
the repo.

## 4. Convert

Only when the user said yes to the conversion.

Follow the in-place procedure in `bare-clone-workflow`'s `reference.md`. When that skill is not
deployed yet, fetch the procedure without touching the repo: in a scratch directory outside it, write an
`apm.yml` whose one dependency is `Meito-ai/katana-sdlc-skills/src/skills/bare-clone-workflow` at
setup's ref (targets: `agent-skills`), run `apm install`, and read
`.agents/skills/bare-clone-workflow/reference.md` there.

Run it to the end, including its bootstrap-and-verify step with the commands confirmed in step 2, the
`git remote set-head origin --auto` check, and the workspace file when the user wanted one. Keep the
backup directory until verification passes.

From here on, the working tree is `<container>/<default-branch>/`. The session's own directory is now
the container, so address every later file by absolute path inside the new worktree.

Done when `git worktree list` starts with a `(bare)` line and the verify command passed in the new
worktree.

## 5. Install

1. Add each newly chosen skill to `apm.yml` under `dependencies.apm`, next to the setup entry:
   ```yaml
   - git: Meito-ai/katana-sdlc-skills/src/skills/<name>
     ref: <setup's ref, verbatim>
   ```
   Leave the ref of an already-installed skill as it is.
2. Remove each unselected skill with `apm uninstall Meito-ai/katana-sdlc-skills/src/skills/<name>`.
3. Run `apm install`.

Done when every chosen skill has a `SKILL.md` under `.claude/skills/<name>/` or `.agents/skills/<name>/`
and no unselected one does.

## 6. Wire

**Pick the file.** Edit `CLAUDE.md` if it exists, else `AGENTS.md`; a `CLAUDE.md` that only imports
`@AGENTS.md` counts as `AGENTS.md`. When neither exists, ask which to create. Edit the one that is
there; never create the other alongside it.

**Write the block** between the `<!-- katana-skills:start -->` and `<!-- katana-skills:end -->` markers:
replace an existing block in place, or append a new one at the end of the file. Everything outside the
markers is the user's; leave it byte-for-byte.

**Write the PR workflow line** if the user wanted it; remove it when `review-visual` was unselected.

Done when the block lists exactly the chosen skills and no `{{` is left in it.

## 7. Report

- The skills installed, removed and wired, and the files changed (`git status --short`).
- Nothing is committed; the user reviews and commits.
- After a conversion: the new worktree path, and that the session must be restarted there, since the
  old directory is now the container. Undoing it is the Rollback section of `bare-clone-workflow`'s
  `reference.md`.
- Re-running `/setup-katana-skills` adds or removes skills and rewrites the block in place, so edits
  belong outside the markers.
