---
name: implement-issue
description: "Take one issue to an open PR: triage whether its design is settled, settle it behind an approval gate when it is not, build test-first at the issue's testing seams, review, bring the docs up to date, and open the PR. Use when asked to implement or pick up an issue or an epic, or to make a trivial change described in text."
metadata:
  adapted-from: "https://github.com/mattpocock/skills/tree/v1.3.2/skills/engineering/implement"
  adapted-license: "MIT, Matt Pocock; see LICENSE-mattpocock-skills"
  requires: "https://github.com/mattpocock/skills/tree/v1.3.2/skills/engineering: tdd, code-review, codebase-design, diagnosing-bugs"
---

# Implement issue

Take one **issue** to an open PR. The issue is the contract, in the template `build-up-spec`,
`slice-spec` and `bug-intake` publish, from a tracker or pasted as text: its testing seams are the
agreed seams, and its criteria are what the build makes true.

Adapted from `implement` of `mattpocock/skills` v1.3.2 ([licence](LICENSE-mattpocock-skills)): the
issue fetch, `tdd` at agreed seams, the check cadence, `code-review` and the commit.

## Requirements

- **`tdd`, `code-review`, `codebase-design` and `diagnosing-bugs`** from `mattpocock/skills` >= v1.3.2.
  This skill's `apm.yml` declares them, but a repo that already pins `mattpocock/skills` keeps its own
  pin and subset, silently. So before step 1, check that each is deployed (`.claude/skills/<name>/` or
  `.agents/skills/<name>/`); when one is missing, stop and name the `engineering/<name>` path to add to
  the `mattpocock/skills` entry in `apm.yml`.
- **A tracker tool** (a Linear MCP, or `gh` >= 2.94) to read the issue and its relations, and write the
  approved design. Without one, the issue arrives and the design leaves as text.
- **When installed:** `bare-clone-workflow` for a bare-clone layout, `visual-pr` for the PR
  description, and `slice-spec` for its EARS rules (`ears.md`). `/setup-katana-skills` installs them.

## 1. Read the input

- **An issue** (an identifier or a URL): fetch it, state its title, and read its labels, comments,
  parent, blockers and, under an epic, the epic's **PRD**: the document a `Spec:` line links, or on
  GitHub the epic's body below `# Spec`. Pasted text with the issue's sections is an issue with no
  tracker to write to.
- **An epic with sub-issues**: list its **frontier**, the open sub-issues with no open blocker, highest
  WSJF first, and continue with the one the user picks as the issue.
- **An epic with no sub-issues**: fetch it and its PRD, and say whether one fresh session can finish it
  end to end and verify it, and why. When it can, the epic is the issue: the PRD's requirements are its
  criteria and the PRD's seams its testing seams, its PR closes the epic, and the card's success
  measures are judged after release rather than by the build. Otherwise stop and name
  `/slice-spec <epic id>`, or `/build-up-spec <epic id>` while it is labelled `needs-design`.
- **Free text**: a **trivial** change follows [Trivial changes](#trivial-changes). Other text stops:
  name `/build-up-spec <text>`, or `/bug-intake <text>` for a bug.

An issue is never trivial. Note whether it is a **bug**: a `Severity:` line or a `bug` label.

Done when the input is sorted and the issue, its relations and any PRD are in context.

## 2. Check it is ready

Stop, naming what is missing, when a blocking issue is still open (the user may override, to stack on
its branch for example), or when the criteria are incomplete: a placeholder under
`## Acceptance criteria` (an epic's `## Requirements`), the `needs-info` label, or a
`## Current behaviour` headed `Unconfirmed:`. Completing them is intake's work: name
`/bug-intake <id>` for a bug, `/build-up-spec <id>` otherwise. Design placeholders and `needs-design`
are step 6's work. This skill's labels are the katana names: use the ones `AGENTS.md` / `CLAUDE.md` or
the knowledge base maps them to.

Done when no blocker is open (or the user overrode it) and the criteria hold no placeholder.

## 3. Get onto the issue's branch

One issue, one branch, one PR. The branch starts from the **base**: the default branch, the blocker's
branch when stacking on it, or the shared integration branch a ticket names. The current branch
**belongs** to the issue when its name carries the issue's key, or the user says so; with commits ahead
of the base, see [Resuming](#resuming). Otherwise:

- **Bare-clone layout** (a `### Worktrees` subsection in the `## Katana skills` block, or a first
  `git worktree list` line ending in `(bare)`): add the issue's worktree from the base with
  `bare-clone-workflow`, report its path, and stop. The issue continues in a session started there.
- **Any other clone**: with a clean tree, `git switch -c <branch> <base>` from an up-to-date base.
  Otherwise stop, naming the changed files.

Lines the intake skills leave uncommitted in the `## Katana skills` block don't count as changes: they
come along to the issue's branch (copied into a new worktree), and step 4 commits them.

Name the branch by the convention `AGENTS.md` / `CLAUDE.md` states, or `<prefix>-<key>-<slug>`: `fix`
for a bug, `tech` for tech work, `doc` for a docs-only change, `feat` otherwise; the key in lower case.

Done when the working tree is on a branch that belongs to the issue.

## 4. Read the repo facts

- **Knowledge base**: where `AGENTS.md` / `CLAUDE.md`, or the `Knowledge base:` line in the
  `## Katana skills` block, says it lives. When neither says, ask the user where it is, or whether there
  is none, and record the answer as that line. Read what the issue touches: glossary, ADRs, docs,
  definition of done.
- **Checks**: the typecheck, single-test-file and full-suite commands, from `AGENTS.md` / `CLAUDE.md` or
  the block's `Checks:` line. Otherwise infer them from the manifests, confirm them with the user once,
  and record them as that line.

To **record** a line, write it into the block in `AGENTS.md`, and in `CLAUDE.md` when it exists and
never references `AGENTS.md`, creating the block where it is missing. `Knowledge base:` goes under
`### Backlog items` when the block has it, otherwise under `### Implementation` beside `Checks:`. Commit
it on its own: `chore: record <line> in the katana block`.

Done when the knowledge base is located or recorded as none, and the checks are known.

## 5. Triage the design

Read the code down to each testing seam, then state one verdict with its reason; it goes into the PR,
where a reviewer can challenge it.

- **`Design: settled`**: no design placeholder (`[add key interfaces]`, `[add testing seams]`,
  `[add implementation decisions]`) or `needs-design` is left; every seam reaches its criteria, and
  exists in today's code or is defined by `## Key interfaces` (an epic's `## Implementation decisions`);
  and the build needs no new decision of significant impact (see [ADRs](#adrs)). Go to step 7.
- **`Design: needed`**: anything else. Go to step 6.

## 6. Settle the design

Draft each part where it will live, in `codebase-design`'s vocabulary:

- **`## Key interfaces`**: the delta to types, signatures and config, by interface rather than by file.
- **`## Testing seams`**: each with its criteria. Prefer an existing seam, take the highest that reaches
  the behaviour, use as few as possible, and note prior art.
- **`## Rollout`**, before `## Out of scope`, for one-off rollout steps. A repeatable procedure is a
  knowledge-base doc instead.
- **Criteria** the design uncovers, in EARS (`slice-spec`'s `ears.md`), as the issue's next `AC`
  numbers. With a PRD, each also takes the PRD's next free `R` number, cited (`AC4 (R7)`) and added to
  the issue's `Covers:`; nothing is renumbered or deleted.
- **ADRs**, proposed, for each decision that needs one.

An epic built as the issue drafts all of it into its PRD, in place: `## Implementation decisions` stands
in for `## Key interfaces`, `## Further notes` for `## Rollout`, and its new criteria are `R` numbers.

Present each open choice with its options and a recommendation. Leave the knowledge-base docs for
step 9.

**The gate.** Present it all together and stop: nothing is written or committed until the user
approves. On approval, post the original description as a comment
(`Original before implement-issue, <date>`), write the new one, replace `needs-design` with
`ready-for-agent` as `build-up-spec` does (an epic only loses `needs-design`), patch an amended PRD, and
mark the ADRs accepted. With no tracker tool, hand the issue text back; step 10 carries the
design into the PR.

Done when the user has approved, and every write has succeeded or been handed back.

## 7. Record the ADRs

Where the repo keeps ADRs, commit before any code: the ADRs approved at the gate and, with a PRD, an
accepted ADR for each PRD implementation decision of significant impact that this issue implements and
no ADR records yet.

Done when every decision of significant impact this issue implements has a committed ADR, or the repo
keeps none.

## 8. Build

Pin each `(guard)` criterion first, with a test that passes today and must keep passing. Then invoke
`tdd` at the issue's testing seams: they are the seams `tdd` asks to agree, so start without asking. A
bug starts with `diagnosing-bugs` instead, its loop from the reproduction in `## Current behaviour` and
its regression test at the issue's seam; `tdd` then builds any criteria still failing. Run the
typecheck and single test files as you go, the full suite at the end, and commit in small steps.

**Back to the gate** when the build needs a seam the issue doesn't list, contradicts an approved
decision, or needs a new one: stop, present only that change as step 6 does, and write it on approval.

Then invoke `code-review` against the merge-base with the base, passing the issue (and any PRD) as the
spec, in a scratch file outside the repo. Fix or answer every finding.

Done when every criterion except `Repo DoD` passes a test at its seam, the repo's definition of done
holds, the checks pass (on a shared integration branch, apart from what the ticket leaves to the final
integrate-and-verify ticket), and every finding is fixed or answered.

## 9. Bring the docs up to date

Update each existing knowledge-base doc whose contract, concept or procedure the change altered, so that
it describes the built code, and commit it.

Done when no doc the change made stale is left.

## 10. Open the PR

Push. The description's author text fills the repo's PR template and carries the tracker's **closing
reference** (`Closes #<n>`, `Closes <ID>`), the **triage line** (`Design: settled in <issue>` or
`Design: approved at pickup in <issue>`) and, with no tracker tool, the approved design. On GitHub, open
the PR against the base and write its description with `visual-pr` when installed, else with
`gh pr create`; on another host, report the branch, its base and the description to paste. Refresh an
open PR rather than opening another.

Done when the PR is open (or the branch reported) and its description matches `HEAD`.

## Trivial changes

A **trivial** change is a typo, formatting, a comment, a dependency bump, or a docs-only edit that
touches no behaviour, contract, state, observability or architecture. Take steps 3 and 4 with a branch
that has no key, make the change, run the checks, invoke `code-review` with no spec (the Standards axis
only), and open the PR as in step 10 with `Trivial: <what changed, and why it touches no behaviour>` in
place of the closing reference and the triage line. When it turns out to touch behaviour, stop and name
`/build-up-spec` or `/bug-intake`.

## Resuming

A branch that belongs to the issue and has commits ahead of the base picks up where the last run
stopped. Triage again against the issue as it now stands: a design approved at the gate was written
back (with no tracker tool, into the open PR), so it reads `Design: settled`; the triage line still
says `approved at pickup` when an `Original before implement-issue` comment or the open PR shows the
gate ran. Committed ADRs count as approved, the full suite shows which criteria still fail, and an open
PR is refreshed.

## ADRs

Architecture decision records, only where the repo keeps them, as `AGENTS.md` / `CLAUDE.md` or the
knowledge base they name says: where they live, their format and statuses, and when one is written.
Where the repo keeps none, decisions stay in the issue.

Without criteria of the repo's own, follow
[Spotify's](https://engineering.atspotify.com/2020/04/when-should-i-write-an-architecture-decision-record):
an ADR for every decision of **significant impact**, big or small.

- **A new answer**: the change settles a problem the repo has no accepted answer to, such as a new
  pattern, library or module boundary, or a reversal of an accepted ADR.
- **A backfill**: the change follows an accepted answer that no ADR records yet.

An accepted ADR is never edited; a new one supersedes it.

## Stops

Stop only where this skill says so. Invoking this skill asks for the push and the PR.
