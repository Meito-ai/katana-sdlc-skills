# katana-sdlc-skills

Skills to power up your repo with AI-driven SDLC.

Agent skills, distributed with [APM](https://github.com/microsoft/apm) so consuming repos get
**pinned, reproducible, reviewable** versions instead of copy-pasted markdown.

## Install

Each skill is installed on its own by its subpath, so you cherry-pick what you want. Most skills also
need **wiring** into your repo's `AGENTS.md` / `CLAUDE.md` before agents use them; `setup-katana-skills`
does both.

### Recommended: let setup pick, install and wire

Add the setup skill to your `apm.yml`, install, then run it:

```yaml
dependencies:
  apm:
    - git: Meito-ai/katana-sdlc-skills/src/skills/setup-katana-skills
      ref: v0.2.0        # or "^0.2.0" on apm >= 0.16.0
```

```bash
apm install
# then, in Claude Code:  /setup-katana-skills
```

It detects the katana skills you already have, offers the rest, installs your picks at the same `ref`,
and writes one `## Katana skills` block into `AGENTS.md` / `CLAUDE.md` — nothing else. Picking
`bare-clone-workflow` also converts your clone to the bare-clone layout (after asking). Nothing is
committed. Re-run it to add or remove skills.

### By hand

Reference each skill you want by its subpath:

```yaml
dependencies:
  apm:
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-management/bare-clone-workflow
      ref: v0.2.0
    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-management/branch-shutdown
      ref: v0.2.0
```

```bash
apm install
```

Then run `/setup-katana-skills` to wire them, or write the wiring yourself.

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
| [`bare-clone-workflow`](./src/skills/sdlc/branch-management/bare-clone-workflow) | Git bare-clone worktree layouts: a container directory holding `.bare`, one sibling worktree per branch, no primary checkout. Clones into the layout, converts an existing clone, adds worktrees. |
| [`branch-shutdown`](./src/skills/sdlc/branch-management/branch-shutdown) | Retires a merged or abandoned branch. Fetches from the remote and proves the work survives on the default branch — including squash-merges — before deleting the worktree, the local branch or the remote branch. |
| [`visual-pr`](./src/skills/sdlc/code-review/visual-pr) | Writes the PR description a reviewer reads first: a visual of the change (a Mermaid diagram, a control-flow or file-tree diff), before/after evidence, and merge danger. Kept in one marked block stamped with the PR head sha and refreshed after every push; text outside the block is left alone. Adapted from `pr` in `mattpocock/skills`. GitHub only; needs `gh` and Node.js >= 20 on the machine, but not a Node repo. |
| [`outcome-framing`](./src/skills/sdlc/feature-management/outcome-framing) | Refines an epic into outcome framing: classifies it as product, tech or compliance and on the Input-to-Impact ladder, flags prescriptive language, and rewrites its title and description around a measurable result (a KPI, a DORA metric, a fitness function, or a met obligation), confirmed with you in one round. |
| [`wsjf`](./src/skills/sdlc/feature-management/wsjf) | Scores and ranks epics and stories (user stories and tech stories) by WSJF: cost of delay ((value + risk reduction/opportunity enablement) × time criticality) over job size, each a Fibonacci score relative to already-scored items. Calibrates a reference set on a cold start, ranks with a bundled dependency-free script, and writes a `## WSJF` block back to the tracker after one round of verification. |
| [`build-up-spec`](./src/skills/sdlc/feature-management/build-up-spec) | User-invoked (`/build-up-spec`). Turns an idea, a raw backlog item or nothing at all into an **epic** (an issue card plus an attached PRD) or an **issue** one agent session can finish. Explores the repo, searches the tracker for duplicates, grills you on the scope, writes EARS requirements, then hands off to `outcome-framing` and `wsjf` before publishing. Every fact is sourced or left as a placeholder. Installs `grilling` from `mattpocock/skills` with it, and needs `outcome-framing`, `wsjf` and `slice-spec`. |
| [`slice-spec`](./src/skills/sdlc/feature-management/slice-spec) | Slices an epic into tracer-bullet issues sized for one fresh agent session, each covering requirements from the epic's PRD, with EARS acceptance criteria, native blocking links, and WSJF for the slices that are stories. Adapted from `to-tickets` in `mattpocock/skills`. Needs `wsjf`. |
| [`paas-pulumi-infra-setup`](./src/skills/paas/paas-pulumi-infra-setup) | User-invoked (`/paas-pulumi-infra-setup`). Interviews you and scaffolds the infra layer of a home-grown PaaS with Pulumi in TypeScript: server groups, private network, firewalls and static IPs on one of ten providers, with stacks, unit tests, an optional CI workflow and a runbook. Node.js repos; never deploys. Installs `pulumi-overview`, `pulumi-best-practices` and `pulumi-component` from `pulumi/agent-skills` with it. |
| [`setup-katana-skills`](./src/skills/setup-katana-skills) | User-invoked (`/setup-katana-skills`). Picks which of the above this repo uses, installs them with apm, and wires each into `AGENTS.md` / `CLAUDE.md`. |

`bare-clone-workflow` and `branch-shutdown` are designed as a pair but each works installed alone.
Both are repo-agnostic: they detect the default branch, detect the VS Code workspace file if the repo
uses one, and defer to the host repo's own `AGENTS.md` for its install command and untracked files.

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
