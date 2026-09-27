# katana-sdlc-skills

Skills to power up your repo with AI-driven SDLC.

Agent skills, distributed with [APM](https://github.com/microsoft/apm) so consuming repos get
**pinned, reproducible, reviewable** versions instead of copy-pasted markdown.

## Install

Add to your `apm.yml`:

Reference each skill you want by its subpath:

```yaml
dependencies:
  apm:
    - git: Meito-ai/katana-sdlc-skills/src/skills/bare-clone-workflow
      ref: v0.2.0        # or "^0.2.0" on apm >= 0.16.0
    - git: Meito-ai/katana-sdlc-skills/src/skills/branch-shutdown
      ref: v0.2.0
```

```bash
apm install
```

Skills deploy to `.agents/skills/` and, if you target `claude`, `.claude/skills/`.

A bare repo-root reference (`- git: Meito-ai/katana-sdlc-skills`) installs **nothing** — pick the
skills you want explicitly.

### Requirements

- **apm >= 0.16.0** to use a semver `ref:` range; **0.32.x** recommended and what CI verifies.
- Commit your `apm.lock.yaml` and run `apm install --frozen` in CI, so a new upstream tag can never
  enter a build without a visible lockfile diff.

## Skills

Each skill lives at [`src/skills/`](./src/skills).

| Skill | What it does |
|---|---|
| [`bare-clone-workflow`](./src/skills/bare-clone-workflow) | Git bare-clone worktree layouts: a container directory holding `.bare`, one sibling worktree per branch, no primary checkout. Clones into the layout, converts an existing clone, adds worktrees. |
| [`branch-shutdown`](./src/skills/branch-shutdown) | Retires a merged or abandoned branch. Fetches from the remote and proves the work survives on the default branch — including squash-merges — before deleting the worktree, the local branch or the remote branch. |

The two are designed as a pair but each works installed alone. Both are repo-agnostic: they detect
the default branch, detect the VS Code workspace file if the repo uses one, and defer to the host
repo's own `AGENTS.md` for its install command and untracked files.

> Some skills declare upstream dependencies (e.g. on
> [`mattpocock/skills`](https://github.com/mattpocock/skills)). APM installs those transitively, but
> **a pin you already have for the same upstream repo wins silently** — so each skill also states
> its requirement in prose at the top of its own `SKILL.md`. Read it if a skill misbehaves.

## Contributing

See [AGENTS.md](./AGENTS.md) — it documents the repo layout, the two non-obvious ways a skill can
silently fail to publish, and the release flow. In short:

```bash
mkdir -p src/skills/<category>/<name>
$EDITOR src/skills/<category>/<name>/SKILL.md
$EDITOR apm.yml             # add: - ./src/skills/<category>/<name>   (so it loads locally)
npm run validate-skills     # catches frontmatter + wiring mistakes CI would reject
apm install                 # deploy locally and try it
npm run changeset           # describe the change
```

## License

[MIT](./LICENSE)
