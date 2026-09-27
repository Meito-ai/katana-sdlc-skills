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
allowed (`src/skills/sdlc/<name>/SKILL.md`), and no per-skill `apm.yml` is needed — apm synthesises
the metadata.

Consumers install each skill **by its subpath** at a tag, which is what allows the source to live in
an obvious place rather than in apm's own `.apm/skills/`. The tradeoff is that a consumer writes one
line per skill instead of one line for the whole repo: a repo-root reference only auto-discovers
`.apm/skills/<name>/` once `apm.yml` carries a dependencies key, and this repo's does.

**Every skill needs a self-reference** under `devDependencies` in the root `apm.yml`:

```yaml
devDependencies:
  apm:
    - ./src/skills/sdlc/branch-shutdown
```

Without it the skill still publishes to consumers, but `apm install` does **not** deploy it into this
repo's `.claude/skills/` — so you cannot use or test your own skill while writing it, and nothing
tells you why.

`scripts/validate-skills.js` fails CI on a missing or stale self-reference, on a frontmatter `name:`
that does not match its directory, on non-ASCII frontmatter, and on a missing or oversized
`description:`. Run it locally with `npm run validate-skills`.

### `dependencies` vs `devDependencies` — load-bearing

| Key | Reaches consumers? | Use for |
|---|---|---|
| `dependencies:` | **Yes**, transitively | upstream skills that **our published skills invoke** |
| `devDependencies:` | No | authoring-time helpers only |

A consumer that installs only `katana-sdlc-skills` gets everything under `dependencies:`
automatically — verified. Put an upstream skill there the moment one of ours delegates to it, or
the consumer receives a skill that cannot work.

**Two traps:**

- **Never list the same upstream repo under both keys.** apm dedupes by repo and silently drops one
  subset — no error, no warning.
- **A consumer's own pin wins, silently.** If a consumer already depends on `mattpocock/skills` at
  an older ref, that ref is what gets installed; our `^1.2.0` is ignored with no diagnostic. So
  every published skill must **also state its upstream requirement in prose in its own `SKILL.md`**
  (e.g. "Requires the `grilling` skill from `mattpocock/skills` >= v1.2.0"). The declaration
  automates the happy path; the prose is what makes the degraded path legible.

### Adding a skill

```bash
mkdir -p src/skills/<category>/<name>
$EDITOR src/skills/<category>/<name>/SKILL.md   # frontmatter `name:` MUST equal <name>, ASCII only
$EDITOR apm.yml                                 # add: - ./src/skills/<category>/<name>
npm run validate-skills
apm install                                     # deploys it locally so you can use it
npm run changeset                               # describe the change for the changelog
```

If the new skill delegates to an upstream skill, move that upstream entry from `devDependencies:`
to `dependencies:` **and** say so in the skill's own `SKILL.md`. (The self-reference above always
stays in `devDependencies:` — it exists only so the skill loads locally.)

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
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/bare-clone-workflow
      ref: v0.1.0                    # or "^0.1.0" on apm >= 0.16
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-shutdown
      ref: v0.1.0
```

A bare repo-root reference deploys **nothing**: apm only auto-discovers `.apm/skills/<name>/` for a
package whose `apm.yml` has dependencies, and this repo authors under `src/skills/` instead.

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
mkdir -p katana-sdlc-skills && cd katana-sdlc-skills
git clone --bare git@github.com:Meito-ai/katana-sdlc-skills.git .bare
git --git-dir=.bare config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
echo 'gitdir: ./.bare' > .git
git worktree add main
```
