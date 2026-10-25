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
in the current directory. The procedure, including the mandatory workspace registration, is the
**`bare-clone-workflow`** skill (`.claude/skills/bare-clone-workflow/`) — this repo installs its own
copy, so follow it here rather than improvising.

## Branch Shutdown

Retiring a branch is the **`branch-shutdown`** skill (`.claude/skills/branch-shutdown/`). Run it from
the `main` worktree: it fetches from the remote, proves the work survives on `main` (including
squash-merges), and only then removes the worktree, the workspace entry, the local branch and the
remote branch.

**Deleting a branch without that gate orphans its commits** — it has already cost this project a
skill once. Do not hand-roll the sequence.

## Pull request review comments

**Skip any PR comment whose body contains `katana:review-visual`.** It is a generated behavioral-delta
visual for human reviewers, not review feedback — never action it or reply to it. It is posted with the
author's own token, so the marker is the only reliable signal. The **`review-visual`** skill posts and
refreshes it.

## Skills and dependencies (APM)

This repo is both an APM **producer** and an APM **consumer**:

- **Producer** — the skills under `src/skills/` are what this repo ships. Consumers (`meito`, and
  eventually the public) install them by pinning a git tag.
- **Consumer** — `devDependencies` in `apm.yml` are the upstream skills agents use *while working
  here*.

### Requires apm >= 0.32.0

`apm.yml` pins upstream by **semver range** (`ref: "^1.2.0"`). The range resolver does not exist
before apm **0.16.0**, so an older CLI fails outright. CI pins `v0.32.0`; keep them in step.

```bash
apm --version          # must report 0.32.x
apm self-update        # or: brew upgrade apm
```

> **Note on `meito`:** its CI currently pins apm **v0.14.2**. That version predates the semver
> resolver *and* silently strips newer lockfile fields on write (dropping the `deployments`
> ownership ledger, `declared_license`, `resolved_tag`, …). **`meito` must move to 0.32.x before it
> can consume this repo by version range**, and until it does, running `apm install` there will
> churn its lockfile.

### Layout

Authored skills live at **`src/skills/<name>/SKILL.md`**. Nesting under a category directory is
allowed (`src/skills/<category>/<name>/SKILL.md`). A skill needs no `apm.yml` of its own — apm
synthesises the metadata — unless it declares upstream dependencies (see below).

Consumers install each skill **by its subpath** at a tag, which is what allows the source to live in
an obvious place rather than in apm's own `.apm/skills/`. The tradeoff is that a consumer writes one
line per skill instead of one line for the whole repo: a repo-root reference only auto-discovers
`.apm/skills/<name>/` once `apm.yml` carries a dependencies key, and this repo's does.

**Every skill needs a self-reference** under `devDependencies` in the root `apm.yml`:

```yaml
devDependencies:
  apm:
    - ./src/skills/sdlc/branch-management/branch-shutdown
```

Without it the skill still publishes to consumers, but `apm install` does **not** deploy it into this
repo's `.claude/skills/` — so you cannot use or test your own skill while writing it, and nothing
tells you why.

The self-reference also puts a hash of **every file** of the skill into `apm.lock.yaml`. After editing
anything under `src/skills/`, run `apm install` and commit the lockfile change with it; otherwise CI's
`apm install --frozen` rewrites the lockfile and fails on the dirty tree.

`scripts/validate-skills.js` fails CI on a missing or stale self-reference, on a frontmatter `name:`
that does not match its directory, on non-ASCII frontmatter, and on a missing or oversized
`description:`. Run it locally with `npm run validate-skills`.

### Scripts shipped inside a skill

apm deploys a skill's whole directory, so its scripts run inside the **consumer's** tree (verified:
including repos with no `package.json` at all). Two rules follow:

- **Node scripts in a skill are `.mjs` and dependency-free.** A `.js` file's module type comes from the
  nearest `package.json` — the consumer's, not ours — so an ESM `.js` breaks in a CommonJS repo. The
  repo's own tooling under `scripts/` stays `.js`.
- **Specs live in `test/<skill>/`, never in the skill directory**, or they ship to every consumer.
  `npm test` runs them and CI runs `npm test`.

### Upstream dependencies — load-bearing

| Where | Reaches consumers? | Use for |
|---|---|---|
| `dependencies:` in the **skill's own** `apm.yml` | **Yes**, with that skill | upstream skills **that skill invokes** |
| `devDependencies:` in the root `apm.yml` | No | authoring-time helpers and self-references |

Consumers install a skill **by its subpath**, and a subpath install reads the `apm.yml` in that
directory, never the root one: the root `dependencies:` do not reach them (verified with apm 0.32.0
on a local-path subpath install; a per-skill `apm.yml` did carry its dependencies). So the moment a
published skill delegates to an upstream skill, give that skill its own `apm.yml` declaring it —
`src/skills/paas/paas-pulumi-infra-setup/apm.yml` is the example — or the consumer receives a skill
that cannot work. Its `version:` is kept equal to `package.json` by `scripts/sync-apm-version.js`,
which CI checks.

**Three traps:**

- **Never declare the same upstream repo twice with different subsets** in one install graph (the
  root `devDependencies:` and a skill's `apm.yml` included). apm dedupes by repo and silently drops
  one subset — no error, no warning. A direct entry beats a transitive one (verified with apm
  0.32.0), so it is a skill's declared subset that gets dropped. That is harmless here, where the
  root entry already lists `grilling`. A consumer whose own entry leaves the skill out silently goes
  without it, which is why `setup-katana-skills` adds the skill to that entry.
- **A consumer's own pin wins, silently.** If a consumer already depends on `mattpocock/skills` at
  an older ref, that ref is what gets installed; our `^1.2.0` is ignored with no diagnostic. So
  every published skill must **also state its upstream requirement in prose in its own `SKILL.md`**
  (e.g. "Requires the `grilling` skill from `mattpocock/skills` >= v1.2.0"). The declaration
  automates the happy path; the prose is what makes the degraded path legible.
- **A skill's `apm.yml` never declares another katana skill.** In this repo, a git copy pulled in
  transitively replaces the local self-reference (`1 skill replaced by a different package (last
  installed wins)`, in either entry order; verified with apm 0.32.0). `apm install` would then deploy
  the *published* version over the one you are editing. A skill that calls a sibling says so in its
  `SKILL.md`, `setup-katana-skills` installs both, and `scripts/validate-skills.js` rejects the
  declaration.

### Adding a skill

```bash
mkdir -p src/skills/<category>/<name>
$EDITOR src/skills/<category>/<name>/SKILL.md   # frontmatter `name:` MUST equal <name>, ASCII only
$EDITOR apm.yml                                 # add: - ./src/skills/<category>/<name>
npm run validate-skills
apm install                                     # deploys it locally so you can use it
npm run changeset                               # describe the change for the changelog
```

If the new skill delegates to an upstream skill, declare it under `dependencies:` in an `apm.yml`
in the skill's own directory (`name`, `version` equal to `package.json`, `description`, `license`)
**and** say so in the skill's own `SKILL.md`. (The self-reference above always stays in the root
`devDependencies:` — it exists only so the skill loads locally.) If it calls another katana skill,
say so in its `SKILL.md` and in `setup-katana-skills`, never in its `apm.yml` (see the traps above).

### Releasing

`package.json` holds the source-of-truth version (changesets owns it); `scripts/sync-apm-version.js`
copies it into `apm.yml`, and CI fails on drift. Nothing is published to npm — `package.json` exists
only because apm mandates a semver `version:` and consumers pin the matching tag.

```bash
npm run version        # consume changesets: bump package.json + apm.yml, write CHANGELOG.md
git commit -am "release v$(node -p "require('./package.json').version")"
git tag "v$(node -p "require('./package.json').version")"
git push --follow-tags
```

### How consumers install this repo

One entry per skill, referencing its subpath:

```yaml
# consumer apm.yml
dependencies:
  apm:
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-management/bare-clone-workflow
      ref: v0.1.0                    # or "^0.1.0" on apm >= 0.16
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-management/branch-shutdown
      ref: v0.1.0
```

A bare repo-root reference deploys **nothing**: apm only auto-discovers `.apm/skills/<name>/` for a
package whose `apm.yml` has dependencies, and this repo authors under `src/skills/` instead.

Installing is half the job: most skills also need **wiring** into the consumer's `AGENTS.md` /
`CLAUDE.md` (the always-on rules, the repo-specific commands a skill defers to). That is
**`setup-katana-skills`**, which detects the skills already installed, offers the rest, and writes one
marker-delimited `## Katana skills` block. **When a skill is added, removed, or changes what it needs
from its host repo, update `setup-katana-skills`** (its skill table and `agents-block.md`) —
otherwise consumers install a skill nothing tells their agents to use. Keep the block to what the skill
itself cannot say: always-on rules and facts about the host repo.

### Generated vs authored — do not confuse them

| Path | State | Why |
|---|---|---|
| `src/skills/` | **tracked** | authored source of what we publish |
| `apm.yml`, `apm.lock.yaml` | **tracked** | the manifest and its resolved pins |
| `.agents/`, `.claude/skills/` | **gitignored** | apm-generated; reproducible via `apm install --frozen` |
| `apm_modules/`, `node_modules/` | **gitignored** | caches |

`AGENTS.md` and `CLAUDE.md` stay **hand-authored**. `apm install` never writes them (only
`apm compile` does, and this repo does not run it) — confirmed for both configured targets.

`targets: [agent-skills, claude]`: `agent-skills` writes the canonical `.agents/skills/` tree, and
`claude` is what populates `.claude/skills/`, which is where Claude Code actually reads from.
`agent-skills` **alone** creates no `.claude/` directory at all, so dropping `claude` would leave
agents here with none of the installed skills.

### Note on duplicate skills

Several of these skills are probably already installed **user-globally** on your machine by a
different manager (the `skills` CLI, via `~/.agents/.skill-lock.json`, symlinked into
`~/.claude/skills/`). Project scope is deliberately the source of truth *here*: a repo whose product
is skills cannot have its toolchain depend on an unpinned global installer. Expect to see the same
skill name in both places.

## Re-creating this layout from scratch

```bash
.claude/skills/bare-clone-workflow/scripts/bare-clone-init.sh \
  git@github.com:Meito-ai/katana-sdlc-skills.git ~/projects/sdlc/katana-sdlc-skills
```

The `bare-clone-workflow` skill documents what the script does, the by-hand equivalent, and the
in-place conversion of an existing clone.
