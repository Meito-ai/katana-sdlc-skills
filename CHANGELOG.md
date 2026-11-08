# katana-sdlc-skills

## 0.2.4

### Patch Changes

- [#19](https://github.com/Meito-ai/katana-sdlc-skills/pull/19) - `build-up-spec`, `bug-intake` and `slice-spec` no longer ask you to accept the WSJF score separately before their own preview. `wsjf` hands the score back unverified to a skill that is still drafting the item, and that skill's preview (its draft confirmation, for `bug-intake`) shows each input with its reason and the rank, where you accept or edit it with the rest. Running `wsjf` yourself is unchanged: it still asks before writing to the tracker.

## 0.2.3

### Patch Changes

- [#15](https://github.com/Meito-ai/katana-sdlc-skills/pull/15) - `implement-issue` is a new skill that takes one issue to an open PR. Run `/implement-issue <issue>`, or
  ask the agent to pick an issue up. It reads the issues `build-up-spec`, `slice-spec` and `bug-intake`
  publish, from Linear, from GitHub, or pasted as text:
  
  - **Triages the design.** `Design: settled` goes straight to the build. `Design: needed` (a design
    placeholder, a testing seam that no longer reaches the behaviour, or a new decision) is drafted into
    the issue, and into architecture decision records (ADRs) where your repo keeps them, then waits for
    your approval before any code is written or anything is published. ADRs follow your repo's criteria,
    or Spotify's when it states none.
  - **Builds test-first** at the issue's testing seams with `tdd`, or `diagnosing-bugs` for a bug, then
    reviews the change against the issue with `code-review`.
  - **Brings your docs up to date** and opens the PR with `visual-pr` when it is installed, with a
    closing reference and the triage verdict.
  - **Builds a small epic directly.** An epic with no sub-issues that one session can finish is built as
    one issue, its PRD's requirements as the criteria; a larger one goes to `/slice-spec`.
  - **Routes the rest.** An epic with sub-issues offers its unblocked ones to pick from, highest WSJF
    first; an issue with an open blocker stops unless you stack it on the blocker's branch; one with
    incomplete criteria stops; a trivial change described in text (a typo, a dependency bump) takes a
    short path; any other text goes to `/build-up-spec` or `/bug-intake`.
  
  It needs `tdd`, `code-review`, `codebase-design` and `diagnosing-bugs` from `mattpocock/skills`
  >= v1.3.2. Install it with `/setup-katana-skills`, which adds them.

- [#15](https://github.com/Meito-ai/katana-sdlc-skills/pull/15) - `setup-katana-skills` offers `implement-issue`, and gives your `## Katana skills` block an
  `### Implementation` subsection with a `Checks:` line: the typecheck, single-test-file and full-suite
  commands it runs. It also writes one direct `mattpocock/skills` entry in your `apm.yml` that lists every
  upstream skill your chosen katana skills need; without it, apm keeps only one skill's subset and
  silently drops the others. Re-run `/setup-katana-skills` to pick this up.

## 0.2.2

### Patch Changes

- [#12](https://github.com/Meito-ai/katana-sdlc-skills/pull/12) - `wsjf`, `slice-spec` and `build-up-spec` now name backlog items as epics, issues and tasks throughout,
  instead of user and tech stories. An issue gets a WSJF score when it passes `wsjf`'s **value test**
  (formerly the story test): if it shipped alone, would someone gain measurable value? Product, tech and
  compliance issues and bug fixes are ranked in one set. Nothing changes in how items are scored; re-run
  `/setup-katana-skills` to pick up the same wording in your `## Katana skills` block.

- [#12](https://github.com/Meito-ai/katana-sdlc-skills/pull/12) - `bug-intake` is a new user-invoked skill (`/bug-intake <report>`) that turns a bug report (free text,
  a tracker item or a URL) into an issue one agent session can fix, in `slice-spec`'s issue template:
  
  - **Checks first.** It searches the tracker for duplicates and the code for behaviour that already
    works, and lets you refine, link, mark as duplicate, close or carry on.
  - **Reproduces.** It reports the bug as confirmed (with the code path), failed, or insufficient detail.
    A confirmed bug becomes a `ready-for-agent` issue: the reproduction, the fixed behaviour, the seam the
    failing test attaches at, and EARS criteria.
  - **Rates severity.** The issue opens with a `Severity:` line (Critical, High, Medium or Low, with the
    bug's reach), which `wsjf` scores from. A Critical bug is flagged to fix now.
  - **Asks the reporter.** Otherwise the issue is labelled `needs-info` and gets triage notes with
    specific questions; `/bug-intake <issue>` resumes from them once the reporter answers.
  
  It applies only `ready-for-agent`, `needs-info` and your team's `bug` label, and writes nothing to the
  repo but the `Knowledge base:` and `Backlog:` lines, when it has to ask for them. It needs
  `slice-spec` and `wsjf`; install it with `/setup-katana-skills`.

- [#12](https://github.com/Meito-ai/katana-sdlc-skills/pull/12) - `build-up-spec` now sends a bug report to `/bug-intake` instead of `diagnosing-bugs`, and
  `setup-katana-skills` offers `bug-intake`, picks `slice-spec` and `wsjf` with it, and adds a
  `/bug-intake` line to the `### Backlog items` subsection of the Katana skills block. Re-run
  `/setup-katana-skills` to add it.

- [#13](https://github.com/Meito-ai/katana-sdlc-skills/pull/13) - `build-up-spec` lets a product owner leave the design to the engineer who builds the item. Say that
  design is for the engineer (or answer the one question the skill asks a product owner), and the run:
  
  - **Skips the design.** Grilling leaves out the Interfaces branch, and the item keeps
    `[add testing seams]`, `[add implementation decisions]` (epic) and `[add key interfaces]` (issue) as
    placeholders.
  - **Holds the item back from agents.** It is published `needs-design` instead of `ready-for-agent`.
    When your team has no `needs-design` label, the skill offers once to create it.
  - **Hands over to the engineer.** The run ends with `/build-up-spec <item>`. The engineer refines the
    item in place, fills in the design, and `needs-design` comes off; an issue then gets
    `ready-for-agent`.
  
  A run where you don't defer the design labels items exactly as before.

- [#12](https://github.com/Meito-ai/katana-sdlc-skills/pull/12) - `build-up-spec` and `slice-spec` no longer guess where your knowledge base is from `README` and
  `docs/`. When neither `AGENTS.md` / `CLAUDE.md` nor the `Knowledge base:` line in your
  `## Katana skills` block says, they ask, and record the answer as that line. They also stop reading
  label renames from `docs/agents/triage-labels.md`: if you rename `ready-for-agent` or `needs-info`,
  say so in `AGENTS.md` / `CLAUDE.md` or your knowledge base.

- [#13](https://github.com/Meito-ai/katana-sdlc-skills/pull/13) - `slice-spec`, `visual-pr` and `build-up-spec` now credit `mattpocock/skills` in their frontmatter
  `metadata:`. `slice-spec` and `visual-pr` name the upstream skill each is adapted from (`to-tickets`
  and `pr`, at v1.3.1) and its MIT licence; `build-up-spec` names the `grilling` skill it requires.
  Nothing changes in how the skills run.

- [#13](https://github.com/Meito-ai/katana-sdlc-skills/pull/13) - `slice-spec` now stops on an epic labelled `needs-design`, before drafting any slice, and names
  `/build-up-spec <epic>` as the next step: the epic's design still needs an engineer.

- [#12](https://github.com/Meito-ai/katana-sdlc-skills/pull/12) - `wsjf` now scores a bug fix from its severity, rather than classifying it as product, tech or
  compliance. The `Severity:` line that `bug-intake` writes (Critical, High, Medium or Low) sets risk
  reduction, the bug's reach sets value, and whether users hit it today sets time criticality. For a bug
  without that line, `wsjf` asks you for the level and the reach.

## 0.2.1

### Patch Changes

- [#8](https://github.com/Meito-ai/katana-sdlc-skills/pull/8) - `setup-katana-skills` now always writes the `## Katana skills` block into `AGENTS.md`, creating the
  file when missing, so agents other than Claude Code see it as well. It also writes the block into
  `CLAUDE.md`, unless that file references `AGENTS.md` (an `@AGENTS.md` import or a plain mention), in
  which case `CLAUDE.md` is left alone. `build-up-spec` and `paas-pulumi-infra-setup` write their lines to the same files.
  `mattpocock/skills` is now pinned at `^1.3.2`, both for this repo and in `build-up-spec`'s `apm.yml`.

- [#8](https://github.com/Meito-ai/katana-sdlc-skills/pull/8) - `setup-katana-skills` handles more of what a real repo already has:
  
  - **Per-path upstream pins.** Entries like `mattpocock/skills/skills/<category>/<name>#<ref>` do not
    override the upstream a katana skill declares, so apm installed a second copy and deployed the same
    skill twice. Setup now detects them and offers to convert them into one `git:` entry with a
    `skills:` list, at a release tag that satisfies the declared range.
  - **Same-name local skills.** A local skill (e.g. `.apm/skills/branch-shutdown`) with the same name as a
    katana skill blocked the katana copy: apm kept the old deployed files as user-edited. Setup now offers
    to remove the local skill, its directory, and its deployed output before installing.
  - **Verified install.** Step 5 now ends with `apm install --frozen` exiting 0, one lock package per
    upstream, and no lock entry left for a removed skill. When a check fails, setup regenerates the lock
    and warns that its diff will be large. The report includes the result.
  - **Bootstrap line.** The `### Worktrees` bootstrap sentence can name files to symlink from a sibling
    worktree, and a condition on a copy.

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
