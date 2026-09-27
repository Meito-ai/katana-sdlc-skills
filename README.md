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
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/bare-clone-workflow
      ref: v0.1.0        # or "^0.1.0" on apm >= 0.16.0
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

Each skill lives at [`src/skills/`](./src/skills). None are published yet — this repo currently
carries the distribution plumbing only.

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
