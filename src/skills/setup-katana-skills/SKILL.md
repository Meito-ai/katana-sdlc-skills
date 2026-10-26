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

The skills this setup manages, all from `Meito-ai/katana-sdlc-skills` at `src/skills/<path>`:

| Skill | `<path>` | Wiring it needs | Available when |
|---|---|---|---|
| `bare-clone-workflow` | `sdlc/branch-management/bare-clone-workflow` | worktree rules, bootstrap commands, the layout itself | always |
| `branch-shutdown` | `sdlc/branch-management/branch-shutdown` | one rule naming the default branch | always |
| `review-visual` | `sdlc/code-review/review-visual` | the marker-skip rule | `origin` is on GitHub |
| `outcome-framing` | `sdlc/feature-management/outcome-framing` | none: invoked on demand or by `build-up-spec` | always |
| `wsjf` | `sdlc/feature-management/wsjf` | the default comparison scope | always |
| `build-up-spec` | `sdlc/feature-management/build-up-spec` | the knowledge base and backlog lines; needs `outcome-framing`, `wsjf`, `slice-spec`, and `grilling` from `mattpocock/skills` | always |
| `slice-spec` | `sdlc/feature-management/slice-spec` | the knowledge base line; needs `wsjf` | always |
| `paas-pulumi-infra-setup` | `paas/paas-pulumi-infra-setup` | none: a one-time, user-run scaffold that writes its own pointer line when run | always |

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
  clone, so there is nothing to convert. Otherwise classify `git status --porcelain`: untracked files
  (`??`) never block, since the conversion inventories and restores them. A tracked change blocks
  unless it is **install residue**: a change to `apm.yml`, `apm.lock.yaml` or `.gitignore`, which is
  what adding setup and running `apm install` leaves behind.
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
- **Tracker** (for `wsjf` and `build-up-spec`): where this repo's epics live and where new items are
  filed. A GitHub `origin` suggests its issues; a connected Linear MCP can list teams and projects.
  Existing `WSJF scope` and `Backlog` lines in the block win.
- **Knowledge base** (for `build-up-spec` and `slice-spec`): whether `AGENTS.md` / `CLAUDE.md` already
  says where the repo's docs live (glossary, decision records, a definition of done). If not, the
  directories that hold them. An existing `Knowledge base` line in the block wins.
- **Upstream pin** (for `build-up-spec`): an existing `mattpocock/skills` entry in `apm.yml`, and its
  `skills:` list. That entry's subset silently wins over the one `build-up-spec` declares, so it must
  include `productivity/grilling`.

Done when every bullet has an answer.

## 2. Present and choose

Summarise what exploration found. Then take the questions in order, one answer each, leading with the
recommended answer so the user can accept it in a word. Skip a question exploration already settled.

1. **Skills.** List the skills with their state (installed / not installed / unavailable, with the
   reason). Installed skills are pre-selected. The user picks any subset; unselecting an installed skill
   removes it. When `review-visual` is picked but `node` or `gh` failed its check, say which and ask
   whether to install it anyway. Picking `build-up-spec` also picks `outcome-framing`, `wsjf` and
   `slice-spec`; picking `slice-spec` also picks `wsjf`. A skill that a picked skill needs stays
   picked: when the user unselects one, name the skill that needs it.
2. **Conversion** (`bare-clone-workflow` picked, repo not yet bare). Recommend converting this clone to
   the bare-clone layout now: the wiring describes that layout. It moves every file in the repo, so get
   an explicit yes. A tracked change other than install residue blocks it: name the files, and the
   user commits or discards them first, then re-runs.
3. **Workspace file** (converting). Recommend yes when the user works in VS Code or Cursor, else no.
4. **Bootstrap** (`bare-clone-workflow` picked). Propose the install command, the files to copy from a
   sibling worktree, and a verify command (build or test), from the bootstrap signals.
5. **PR workflow line** (`review-visual` picked, a PR workflow doc found). Recommend adding one line to
   it: after opening a PR, optionally post a review visual.
6. **WSJF scope** (`wsjf` picked). Propose the default comparison scope from the tracker signals: a
   Linear team or project, or the GitHub repo. The user may leave it unset; the skill then asks on
   each run, and the `### WSJF` subsection is dropped.
7. **Knowledge base** (`build-up-spec` or `slice-spec` picked, and `AGENTS.md` / `CLAUDE.md` does not
   already say where it lives). Propose the paths exploration found. The user may leave it unset; the
   skills then look through `README` and `docs/` and say that they guessed.
8. **Backlog** (`build-up-spec` picked). Propose where new epics and issues are filed: a Linear team
   and project, or the GitHub repo. The user may leave it unset; `build-up-spec` then asks on its
   first run and writes the line itself.

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
`apm.yml` whose one dependency is `Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-management/bare-clone-workflow` at
setup's ref (targets: `agent-skills`), run `apm install`, and read
`.agents/skills/bare-clone-workflow/reference.md` there.

Its precondition asks for a clean tree; setup relaxes that to "no tracked change except install
residue" (step 1), and carries the residue across: the reference's step 5 checks out the default
branch from `HEAD`, so right after it, copy each residue file from the backup directory into the new
worktree. They stay uncommitted changes there, for the user to review with the rest of setup's output.

Run it to the end, including its bootstrap-and-verify step with the commands confirmed in step 2, the
`git remote set-head origin --auto` check, and the workspace file when the user wanted one. Keep the
backup directory until verification passes.

From here on, the working tree is `<container>/<default-branch>/`. The session's own directory is now
the container, so address every later file by absolute path inside the new worktree.

Done when `git worktree list` starts with a `(bare)` line, `git status` in the new worktree shows the
same residue changes as before the conversion, and the verify command passed there.

## 5. Install

1. Add each newly chosen skill to `apm.yml` under `dependencies.apm`, next to the setup entry:
   ```yaml
   - git: Meito-ai/katana-sdlc-skills/src/skills/<path>
     ref: <setup's ref, verbatim>
   ```
   Leave the ref of an already-installed skill as it is.
2. Remove each unselected skill with `apm uninstall Meito-ai/katana-sdlc-skills/src/skills/<path>`.
3. With `build-up-spec` chosen and an existing `mattpocock/skills` entry in `apm.yml`, add
   `productivity/grilling` to that entry's `skills:` list if it is missing.
4. Run `apm install`.

Done when every chosen skill has a `SKILL.md` under `.claude/skills/<name>/` or `.agents/skills/<name>/`
(`grilling` included when `build-up-spec` is chosen), and no unselected one does.

## 6. Wire

**Pick the file.** Edit `CLAUDE.md` if it exists, else `AGENTS.md`; a `CLAUDE.md` that only imports
`@AGENTS.md` counts as `AGENTS.md`. When neither exists, ask which to create. Edit the one that is
there; never create the other alongside it.

**Write the block** between the `<!-- katana-skills:start -->` and `<!-- katana-skills:end -->` markers:
replace an existing block in place, or append a new one at the end of the file. Everything outside the
markers is the user's; leave it byte-for-byte.

**Write the PR workflow line** if the user wanted it; remove it when `review-visual` was unselected.

Done when the block has a subsection for exactly the chosen skills that have one in
[agents-block.md](agents-block.md), and no `{{` is left in it.

## 7. Report

- The skills installed, removed and wired, and the files changed (`git status --short`).
- Nothing is committed; the user reviews and commits.
- `paas-pulumi-infra-setup` installed: run `/paas-pulumi-infra-setup` to scaffold the infrastructure.
- `build-up-spec` installed: run `/build-up-spec` to shape an epic or an issue.
- After a conversion: the new worktree path, and that the session must be restarted there, since the
  old directory is now the container. Undoing it is the Rollback section of `bare-clone-workflow`'s
  `reference.md`.
- Re-running `/setup-katana-skills` adds or removes skills and rewrites the block in place, so edits
  belong outside the markers.
