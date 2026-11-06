---
name: implement-issue
description: "Take one issue to an open PR: triage whether its design is settled, settle it behind an approval gate when it is not, build test-first at the issue's testing seams, review, bring the docs up to date, and open the PR. Use when asked to implement or pick up an issue, or to make a trivial change described in text."
metadata:
  adapted-from: "https://github.com/mattpocock/skills/tree/v1.3.2/skills/engineering/implement"
  adapted-license: "MIT, Matt Pocock; see LICENSE-mattpocock-skills"
  requires: "https://github.com/mattpocock/skills/tree/v1.3.2/skills/engineering: tdd, code-review, codebase-design, diagnosing-bugs"
---

# Implement issue

Take one **issue** to an open PR. The issue is the contract, in the template `build-up-spec`,
`slice-spec` and `bug-intake` publish, from a tracker or pasted as text: its testing seams are the
agreed seams, and its criteria are what the build makes true.

Before building, **triage** the design. `Design: settled` goes straight to the build. `Design: needed`
is settled where it will live and passes a **gate**, the user's approval, before any code or write.
Design belongs to the engineer who builds it, so a product owner's design placeholders are filled here.

Adapted from `implement` of `mattpocock/skills` v1.3.2 ([licence](LICENSE-mattpocock-skills)): the
issue fetch, `tdd` at agreed seams, the check cadence, `code-review` and the commit.

## Requirements

- **`tdd`, `code-review`, `codebase-design` and `diagnosing-bugs`** from `mattpocock/skills` >= v1.3.2.
  This skill's `apm.yml` declares them, but a repo that already pins `mattpocock/skills` keeps its own
  pin and subset, silently.
- **A tracker tool** (a Linear MCP, or `gh`) to read the issue and write the approved design. Without
  one, the issue arrives and the design leaves as text.
- **When installed:** `bare-clone-workflow` for a bare-clone layout, and `visual-pr` for the PR
  description. `/setup-katana-skills` installs both.

## 1. Read the input

Check that the four required skills are deployed (`.claude/skills/<name>/` or `.agents/skills/<name>/`).
If any is missing, stop and name the `engineering/<name>` path to add to the `mattpocock/skills` entry
in `apm.yml`.

- **An issue** (an identifier or a URL): fetch it, state its title, and read its labels, comments,
  parent, blockers and, under an epic, the epic's PRD. Pasted text with the issue's sections is an
  issue with no tracker to write to.
- **An epic**: list its **frontier**, the open sub-issues with no open blocker, and continue with the
  one the user picks. With no sub-issues, stop and name `/slice-spec <epic id>`.
- **Free text**: a **trivial** change follows [Trivial changes](#trivial-changes). Other text stops:
  name `/build-up-spec <text>`, or `/bug-intake <text>` for a bug.

An issue is never trivial. Note whether it is a **bug**: a `Severity:` line or a `bug` label.

Done when the input is sorted and the issue, its relations and any parent PRD are in context.

## 2. Check it is ready

Stop, naming what is missing, when a blocking issue is still open (the user may override, to stack on
its branch for example), or when the criteria are incomplete: a placeholder under
`## Acceptance criteria`, the `needs-info` label, or a `## Current behaviour` headed `Unconfirmed:`.
Completing them is intake's work: name `/bug-intake <id>` for a bug, `/build-up-spec <id>` otherwise.
Design placeholders and `needs-design` are step 6's work. `AGENTS.md` / `CLAUDE.md` may rename labels.

Done when no blocker is open (or the user overrode it) and the criteria hold no placeholder.

## 3. Get onto the issue's branch

One issue, one branch, one PR. The current branch **belongs** to the issue when its name carries the
issue's key, or the user says so; with commits ahead of the default branch, see [Resuming](#resuming).
Otherwise:

- **Bare-clone layout** (a `### Worktrees` subsection in the `## Katana skills` block, or a first
  `git worktree list` line ending in `(bare)`): add the issue's worktree with `bare-clone-workflow`,
  report its path, and stop. The issue continues in a session started there.
- **Any other clone**: from the default branch with a clean tree, `git switch -c <branch>`. Otherwise
  stop, naming the branch or the changed files.

Name the branch by the convention `AGENTS.md` / `CLAUDE.md` states, or `<prefix>-<key>-<slug>`: `fix`
for a bug, `tech` for tech work, `doc` for a docs-only change, `feat` otherwise; the key in lower case.

Done when the working tree is on a branch that belongs to the issue.

## 4. Read the repo facts

- **Knowledge base**: where `AGENTS.md` / `CLAUDE.md`, or the `Knowledge base:` line in the
  `## Katana skills` block, says it lives. When neither says, ask the user where it is, or whether there
  is none, and record the answer as that line. Read what the issue touches: glossary, decision records,
  docs, definition of done.
- **Checks**: the typecheck, single-test-file and full-suite commands, from `AGENTS.md` / `CLAUDE.md` or
  the block's `Checks:` line. Otherwise infer them from the manifests, confirm them with the user once,
  and record them as that line.

To **record** a line, write it into the block in `AGENTS.md`, and in `CLAUDE.md` when it exists and
never references `AGENTS.md`, creating the block where it is missing. `Knowledge base:` goes under
`### Backlog items` when the block has it, otherwise under `### Implementation` beside `Checks:`. Commit
it on its own: `chore: record <line> in the katana block`.

Done when the knowledge base is located or recorded as none, and the checks are known.

## 5. Triage the design

Read the issue, its parent PRD's implementation decisions and testing seams, the decision records in the
area, and the code down to each testing seam. State one verdict with its reason; it goes into the PR,
where a reviewer can challenge it.

- **`Design: settled`**: no design placeholder or `needs-design` is left, every seam exists in today's
  code and reaches its criteria, and no new decision is needed (see
  [Decision records](#decision-records)). Go to step 7.
- **`Design: needed`**: anything else. Go to step 6.

## 6. Settle the design

Draft each part where it will live, in `codebase-design`'s vocabulary:

- **`## Key interfaces`**: the delta to types, signatures and config, by interface rather than by file.
- **`## Testing seams`**: each with its criteria. Prefer an existing seam, take the highest that reaches
  the behaviour, use as few as possible, and note prior art.
- **`## Rollout`**, for one-off rollout steps. A repeatable procedure is a knowledge-base doc instead.
- **Criteria** the design uncovers, in EARS. Under an epic they also amend the PRD's `## Requirements`
  with the next free `R` number; nothing is renumbered or deleted.
- **Decision records**, proposed, for each decision that needs one.

Present each open choice with its options and a recommendation. Leave the knowledge-base docs for
step 9.

**The gate.** Present it all together and stop: nothing is written or committed until the user
approves. On approval, post the original description as a comment
(`Original before implement-issue, <date>`), write the new one, remove `needs-design`, patch an amended
PRD, and mark the records accepted. With no tracker tool, hand the issue text back; step 10 carries the
design into the PR.

Done when the user has approved, and every write has succeeded or been handed back.

## 7. Record the decisions

Where the repo keeps decision records, commit before any code: the records approved at the gate and,
under an epic, an accepted record for each PRD implementation decision that has none yet.

Done when every decision this issue implements has a committed record, or the repo keeps none.

## 8. Build

Invoke `tdd` at the issue's testing seams: they are the seams `tdd` asks to agree, so start without
asking. A bug starts with `diagnosing-bugs` instead, its loop from the reproduction in
`## Current behaviour` and its regression test at the issue's seam; `tdd` then builds any `(guard)`
criteria. Run the typecheck and single test files as you go, the full suite at the end, and commit in
small steps.

**Back to the gate** when the build needs a seam the issue doesn't list, contradicts an approved
decision, or needs a new one: stop, present only that change as step 6 does, and write it on approval.

Then invoke `code-review` against the merge-base with the default branch, passing the issue (and any
PRD) as the spec, in a scratch file outside the repo. Fix or answer every finding.

Done when every criterion except `Repo DoD` passes a test at its seam, the definition of done the issue
links holds, the checks pass, and every finding is fixed or answered.

## 9. Bring the docs up to date

Update each existing knowledge-base doc whose contract, concept or procedure the change altered, so that
it describes the built code, and commit it.

Done when no doc the change made stale is left.

## 10. Open the PR

Push. The description's author text fills the repo's PR template and carries the tracker's **closing
reference** (`Closes #<n>`, `Closes <ID>`), the **triage line** (`Design: settled in <issue>` or
`Design: approved at pickup in <issue>`) and, with no tracker tool, the approved design. On GitHub, open
the PR and write its description with `visual-pr` when installed, else with `gh pr create`; on another
host, report the branch and the description to paste. Refresh an open PR rather than opening another.

Done when the PR is open (or the branch reported) and its description matches `HEAD`.

## Trivial changes

A **trivial** change is a typo, formatting, a comment, a dependency bump, or a docs-only edit that
touches no behaviour, contract, state, observability or architecture. Take steps 3 and 4 with a branch
that has no key, make the change, run the checks, invoke `code-review` with no spec (the Standards axis
only), and open the PR as in step 10 with `Trivial: <what changed, and why it touches no behaviour>` in
place of the closing reference and the triage line. When it turns out to touch behaviour, stop and name
`/build-up-spec` or `/bug-intake`.

## Resuming

A branch that belongs to the issue and has commits ahead picks up where the last run stopped. Triage
again against the issue as it now stands: a design approved at the gate was written back, so it reads
`Design: settled`. Committed records count as approved, the full suite shows which criteria still fail,
and an open PR is refreshed.

## Decision records

Only where the knowledge base keeps them: it says where, in what format and statuses, and when one is
written. Without a rule of its own, write one for a decision that introduces a new pattern, chooses
between viable approaches (and why the others lost), affects several modules, constrains future work, or
reverses an earlier decision. An interface change gets one only when the change is itself the decision.
An accepted record is never edited; a new one supersedes it. Where the repo keeps none, decisions stay in
the issue.

## Stops

Stop only where a step says so. Invoking this skill asks for the push and the PR.
