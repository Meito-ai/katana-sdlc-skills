# katana-sdlc-skills

## 0.2.0

### Minor Changes

- [#2](https://github.com/Meito-ai/katana-sdlc-skills/pull/2) [`e3c1ed9`](https://github.com/Meito-ai/katana-sdlc-skills/commit/e3c1ed9afcdd11366a6b4630d54ae7365a38e2b4) Thanks [@nasushkov](https://github.com/nasushkov)! - Publish the first two skills: `bare-clone-workflow` and `branch-shutdown`.

  `bare-clone-workflow` sets up and manages bare-clone worktree layouts — a container directory holding
  `.bare` with one sibling worktree per branch. It ships `scripts/bare-clone-init.sh`, which now also
  records `refs/remotes/origin/HEAD` and creates `<container>.code-workspace`, and it defaults the first
  worktree to the remote's default branch instead of assuming `main`. In-place conversion of an existing
  clone lives in `reference.md`.

  `branch-shutdown` retires a merged or abandoned branch. It fetches from the remote before judging
  anything, requires the local and remote tips to agree, asks GitHub for the PR state, and recognises
  squash- and rebase-merges via `git cherry` so the common merge mode is not reported as unmerged. It
  lists the untracked and ignored files a worktree removal would destroy before asking to proceed, and
  it accepts several branches at once, gating all of them before deleting any.

  Both skills are repo-agnostic: the default branch, the layout (bare-clone or plain clone) and the VS
  Code workspace file are all detected, and per-worktree bootstrap defers to the host repo's own
  `AGENTS.md`.

  `AGENTS.md` now points at these skills instead of carrying its own copies of the two procedures.

- [#6](https://github.com/Meito-ai/katana-sdlc-skills/pull/6) [`c71aedb`](https://github.com/Meito-ai/katana-sdlc-skills/commit/c71aedba9259fae9ce5f523ca1f183a4efe30bca) Thanks [@nasushkov](https://github.com/nasushkov)! - Publish `build-up-spec` and `slice-spec`, which together replace `to-spec` and `to-tickets` from
  `mattpocock/skills`.

  `build-up-spec` (user-invoked) shapes an idea, a raw backlog item or nothing at all into an epic or an
  issue:

  - It explores the repo and its knowledge base, and searches the tracker for duplicates.
  - It enriches the input with sourced facts only; every gap becomes a placeholder.
  - It grills you on the scope, then writes requirements in EARS, each one false today.
  - It calls `outcome-framing` for epics, and `wsjf`.
  - It publishes after one preview. An epic is a parent issue labelled `Epic`, with an attached PRD
    document on Linear (on GitHub the PRD goes in the issue body). An issue gets `ready-for-agent`.
  - Existing items are refined in place.

  `slice-spec` adapts `to-tickets`' tracer-bullet slicing (MIT): every slice lists the PRD
  requirements it covers, and an uncovered requirement stops publishing. It writes EARS acceptance
  criteria, each under the testing seam that verifies it, scores the slices that are stories with `wsjf` (tasks inherit), and publishes sub-issues
  with native blocking links.

  Also in this release:

  - `wsjf` recognises issues labelled `Epic` as epics, and scores several targets in one round.
  - `setup-katana-skills` installs the dependencies and asks for `Knowledge base` and `Backlog` lines.
  - `validate-skills` rejects a skill `apm.yml` that declares this repo, because the transitive copy
    overwrites the local one.

- [#5](https://github.com/Meito-ai/katana-sdlc-skills/pull/5) [`ed616a5`](https://github.com/Meito-ai/katana-sdlc-skills/commit/ed616a59cbb3f6d12505d55a7939ecfd4416abae) Thanks [@nasushkov](https://github.com/nasushkov)! - Publish `outcome-framing`, a refinement skill for epics. It classifies an epic as product, tech or
  compliance and on the Input → Activity → Output → Outcome → Impact ladder, flags prescriptive language
  in the title, and rewrites the title and description around a success measure: a KPI for product
  epics, a fitness function or DORA metric for tech epics, and obligation + deadline + evidence for
  compliance epics. Unknowns become placeholders, never invented numbers. One round of user verification
  per input; other skills can call it and read its fixed output block.

- [#4](https://github.com/Meito-ai/katana-sdlc-skills/pull/4) [`4839393`](https://github.com/Meito-ai/katana-sdlc-skills/commit/4839393a9bf8b929bc52f5498bcdb783f1c81950) Thanks [@nasushkov](https://github.com/nasushkov)! - Publish `paas-pulumi-infra-setup`, the first `paas-*` skill (user-invoked).

  It interviews the user and scaffolds the infrastructure layer of a home-grown PaaS as a Pulumi
  TypeScript program: server groups (count and size per stack), a private network, firewalls and static
  IPs on one of ten providers (AWS, Azure, Google Cloud, Alibaba Cloud, DigitalOcean, Hetzner, Linode /
  Akamai, OVHcloud, UpCloud, Hostinger through Pulumi's Terraform bridge), as a dedicated workspace
  package or a folder. It writes the stacks, unit tests, an optional GitHub Actions workflow (PR preview
  gate, deploy on merge, manual production) and a runbook, wires the optional Pulumi MCP server and extra
  Pulumi skills with apm, and never deploys or commits. A dependency-free `detect.mjs` reads the repo's
  shape. It depends on `pulumi-overview`, `pulumi-best-practices` and `pulumi-component` from
  `pulumi/agent-skills` >= v2.0.0, declared in the skill's own `apm.yml`.

  A skill that invokes upstream skills now declares them in its own `apm.yml`: a subpath install reads
  that file, not the root one. `scripts/sync-apm-version.js` keeps these per-skill manifests at the
  package version.

- [#5](https://github.com/Meito-ai/katana-sdlc-skills/pull/5) [`0fdc537`](https://github.com/Meito-ai/katana-sdlc-skills/commit/0fdc5375da9e680799c013e1d8723f5da54ddcb3) Thanks [@nasushkov](https://github.com/nasushkov)! - Group the SDLC skills under `src/skills/sdlc/<category>/`: `branch-management/` holds
  `bare-clone-workflow` and `branch-shutdown`, `code-review/` holds `visual-pr`, and
  `feature-management/` holds `outcome-framing`. Install subpaths change accordingly (e.g.
  `src/skills/sdlc/branch-management/branch-shutdown`); update any `apm.yml` entry that references the old
  `src/skills/<name>` path. Deployed paths (`.claude/skills/<name>/`, `.agents/skills/<name>/`) are
  unchanged, and `setup-katana-skills` already uses the new paths.

- [#6](https://github.com/Meito-ai/katana-sdlc-skills/pull/6) [`3889944`](https://github.com/Meito-ai/katana-sdlc-skills/commit/38899441e8242741584a6f88c6a4d57e76ce9d15) Thanks [@nasushkov](https://github.com/nasushkov)! - Publish `visual-pr` and `setup-katana-skills`.

  `visual-pr` writes the PR description a reviewer reads first: a visual of the change, before/after
  evidence, and merge danger (one-way or two-way door, blast radius), inspired by the
  [`pr` skill](https://github.com/mattpocock/skills/tree/v1.3.1/skills/engineering/pr) in
  `mattpocock/skills` (MIT). It keeps them in one block between `katana:visual-pr` markers, stamped with
  the PR head sha, and refreshes it in place after every push; text outside the block is left alone. Its
  dependency-free `.mjs` CLI ships inside the skill and rejects content that breaks the contract: missing
  sections, an undrawable Mermaid fence, or a block over its caps. A consumer needs `gh` and Node.js >= 20
  on the machine but no `package.json`.

  In Claude Code, its `scripts/hook.mjs` runs as a `PostToolUse` hook on `Bash`: after a `gh pr create` or
  `git push`, it reminds the agent when the PR's stamp is not `HEAD`, since model invocation alone tends to
  skip the refresh. `setup-katana-skills` offers to add it to `.claude/settings.json`.

  `setup-katana-skills` (user-invoked) detects the katana skills a repo already has, offers the rest,
  installs the picks with apm at its own `ref`, converts the clone to the bare-clone layout when
  `bare-clone-workflow` is picked, and wires each skill into `CLAUDE.md` / `AGENTS.md` as one
  marker-delimited `## Katana skills` block. It never commits.

- [#5](https://github.com/Meito-ai/katana-sdlc-skills/pull/5) [`1843ebc`](https://github.com/Meito-ai/katana-sdlc-skills/commit/1843ebc8435d44e0010559044cccab17dba01585) Thanks [@nasushkov](https://github.com/nasushkov)! - Publish `wsjf`, which scores and ranks epics and stories (user stories and tech stories) by Weighted Shortest Job First:
  Cost of Delay = (User/Business Value + Risk Reduction/Opportunity Enablement) × Time Criticality,
  divided by Size, every input a Fibonacci value judged against already-scored items. A cold start
  calibrates 3–5 anchors with the user; a single-issue mode ranks one target, a backlog mode re-scores a
  set. The arithmetic, validation, ranking and block edits live in a dependency-free
  `scripts/wsjf.mjs`; scores are stored as a `<!-- katana:wsjf:v1 -->` block in each item's description
  and written back after one round of verification. `outcome-framing` now carries that block through a
  rewrite, and `setup-katana-skills` wires a default WSJF scope.
