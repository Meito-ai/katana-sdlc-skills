---
name: implement-issue
description: "Take one issue to an open PR: triage whether its design is settled, settle it behind an approval gate when it is not, build test-first at the issue's testing seams, review, bring the docs up to date, and open the PR. Use when asked to implement or pick up an issue, or to make a trivial change described in text."
metadata:
  adapted-from: "https://github.com/mattpocock/skills/tree/v1.3.2/skills/engineering/implement"
  adapted-license: "MIT, Matt Pocock; see LICENSE-mattpocock-skills"
  requires: "https://github.com/mattpocock/skills/tree/v1.3.2/skills/engineering: tdd, code-review, codebase-design, diagnosing-bugs"
---

# Implement issue

Take one **issue** from pickup to an open PR. The issue is the contract, in the shape `build-up-spec`,
`slice-spec` and `bug-intake` publish (`## What to build`, `## Current behaviour`, `## Key interfaces`,
`## Testing seams`, `## Acceptance criteria`, `## Out of scope`), whether it comes from a tracker or
as pasted text. Its testing seams are the agreed seams, and its criteria are what the build makes true.

Before building, **triage** the design. `Design: settled` goes straight to the build. `Design: needed`
settles the design where it will live, and passes a **gate**, the user's approval, before any code is
written or anything is published. Design belongs to the engineer who builds it, so this is where a
product owner's design placeholders get filled.

Adapted from the `implement` skill of `mattpocock/skills` v1.3.2 ([licence](LICENSE-mattpocock-skills)):
fetching the issue, `tdd` at agreed seams, the check cadence, `code-review` and the commit come from it.
Triage, the gate, the docs, the PR and the trivial path are additions.

## Requirements

- **`tdd`, `code-review`, `codebase-design` and `diagnosing-bugs`** from `mattpocock/skills` >= v1.3.2.
  This skill's `apm.yml` declares them, but a repo that already pins `mattpocock/skills` keeps its own
  pin and subset, silently.
- **A tracker tool** to read the issue and write the approved design: a Linear MCP, or `gh` for GitHub
  issues. Without one, the issue comes in as pasted text and the design goes back as text.
- **Used when installed:** `bare-clone-workflow` adds the issue's worktree in a bare-clone layout, and
  `visual-pr` writes the PR description on GitHub. `/setup-katana-skills` installs both.

## 1. Read the input

Check that `tdd`, `code-review`, `codebase-design` and `diagnosing-bugs` are each deployed (under
`.claude/skills/<name>/` or `.agents/skills/<name>/`). If any are missing, stop and name them, with the
`engineering/<name>` path to add to the `mattpocock/skills` entry in `apm.yml`.

Sort the input:

- **An issue**: an identifier or a URL. Fetch its title, description, labels, comments, parent and
  blocking issues. Under an epic, also read the epic's PRD: on Linear, the document attached to the
  epic; on GitHub, the sections below the card in the epic's body.
- **Issue text**: pasted text with the issue's sections, handed back by an intake skill that had no
  tracker tool. It is an issue with no tracker to write to.
- **An epic** (labelled `Epic`, or a parent of sub-issues): more work than one session can hold. List
  its **frontier**, the sub-issues that are open and have no open blocker, and continue with the one the
  user picks. When it has no sub-issues, stop and name `/slice-spec <epic id>`.
- **Free text**: a **trivial** change follows [Trivial changes](#trivial-changes). Any other text stops
  here: name `/build-up-spec <text>` for a feature or an improvement, or `/bug-intake <text>` for a bug.
  Either one shapes it into an issue.

An issue is never trivial: every issue takes the steps below. State its title, and whether it is a
**bug** (a `Severity:` line, or the team's `bug` label).

Done when the input is sorted and, for an issue, its text, labels, relations and any parent PRD are in
context.

## 2. Check it is ready

Stop, naming what is missing, when:

- **A blocking issue is still open.** The user may override this, to build on the blocker's branch for
  example.
- **The acceptance criteria are incomplete**: a placeholder (`[add …]`) under `## Acceptance criteria`,
  the `needs-info` label, or a `## Current behaviour` headed `Unconfirmed:`. Completing the contract is
  intake's work: name `/bug-intake <id>` for a bug, and `/build-up-spec <id>` otherwise.

Design placeholders (`[add key interfaces]`, `[add testing seams]`) and the `needs-design` label are no
reason to stop: step 6 settles the design. When `AGENTS.md` / `CLAUDE.md` maps these labels to other
names, read those.

Done when no blocker is open (or the user overrode it) and the criteria hold no placeholder.

## 3. Get onto the issue's branch

One issue, one branch, one PR. The current branch **belongs** to the issue when its name carries the
issue's key, or the user says it does. A branch that belongs and has commits ahead of the default branch
is work in progress: see [Resuming](#resuming). When the current branch does not belong:

- **Bare-clone layout** (the `### Worktrees` subsection of the `## Katana skills` block, or a first
  `git worktree list` line ending in `(bare)`): a session stays in the worktree it started in. Add the
  issue's worktree with `bare-clone-workflow`, registered and bootstrapped, then stop and report its
  path: the issue continues in a session started there.
- **Any other clone**: on the default branch with a clean tree, create the issue's branch
  (`git switch -c <branch>`). On another branch, or with uncommitted changes, stop and name the branch
  or the changed files.

Name the branch by the convention `AGENTS.md` / `CLAUDE.md` states, or else `<prefix>-<key>-<slug>`:
the prefix `fix` for a bug, `tech` for tech work, `doc` for a docs-only change, and `feat` otherwise;
the issue's key in lower case (`abc-123`, or the GitHub issue number); a few words of the title.

Done when the session's working tree is on a branch that belongs to the issue.

## 4. Read the repo facts

- **Knowledge base**: where `AGENTS.md` / `CLAUDE.md`, or the `Knowledge base:` line in the
  `## Katana skills` block, says it lives. When neither says, ask the user where it is, or whether there
  is none, and record the answer as that line. Read what the issue touches: glossary terms, decision
  records, the docs on the area, and the definition of done.
- **Checks**: the commands for the typecheck, a single test file and the full suite, from `AGENTS.md` /
  `CLAUDE.md` or the `Checks:` line in the block. When neither says, infer them from the manifests and
  tool configs (package scripts, `Makefile` targets), confirm them with the user once, and record them
  as that line. A language without a typecheck has none.
- **Decision records**: whether the knowledge base keeps them and, when it does, where, in what format,
  and when one is written (see [Decision records](#decision-records)).

To **record** a line, write it in every file `setup-katana-skills` writes the block to: `AGENTS.md`, and
`CLAUDE.md` when it exists and never references `AGENTS.md`. `Knowledge base:` goes under
`### Backlog items` when the block has that subsection; `Checks:`, and otherwise `Knowledge base:`, go
under `### Implementation`. Create the block, the heading or the subsection where it is missing. Commit
the recorded lines on their own: `chore: record <line> in the katana block`.

Done when the knowledge base is located or recorded as none, the checks are known, and every recorded
line is committed.

## 5. Triage the design

Read the issue, its parent PRD's `## Implementation decisions` and `## Testing seams`, the decision
records in the area, and the code the issue touches, down to each testing seam. Then state one verdict,
with its reason:

- **`Design: settled`**: no design placeholder or `needs-design` label is left, every testing seam
  exists in today's code and reaches the criteria listed under it, and the change needs no new decision
  (see [Decision records](#decision-records)). Go to step 7.
- **`Design: needed`**: anything else. Go to step 6.

The verdict goes into the PR, where a reviewer can challenge it.

Done when the verdict and its reason are stated.

## 6. Settle the design

Only on `Design: needed`. Draft each part of the design where it will live, in `codebase-design`'s
vocabulary of modules, interfaces and seams:

- **`## Key interfaces`**: the delta this change makes to types, signatures and config, described by
  interface rather than by file.
- **`## Testing seams`**: each seam with the criteria verified there. Prefer an existing seam to a new
  one, take the highest one that reaches the behaviour, and use as few as possible. Note prior art.
- **`## Rollout`**, when the change has one-off rollout steps. A procedure worth repeating is a doc in
  the knowledge base instead.
- **Criteria**: a business requirement the design uncovers becomes a new EARS criterion. Under an epic,
  it also amends the PRD's `## Requirements` with the next free `R` number, which the criterion cites.
  Nothing is renumbered or deleted.
- **Decision records**: a proposed record for each decision that needs one. An interface change gets
  one only when the change is itself the decision.

Present each open choice with its options and a recommendation. Leave the knowledge base's docs as they
are: they describe the built system, and step 9 brings them up to date.

**The gate.** Present the issue changes, the criteria and any PRD amendment, and the drafted records
together, then stop. Nothing is written or committed until the user approves; revise on every edit and
present again. On approval:

- **Linear**: post the original title and description as a comment
  (`Original before implement-issue, <date>`), then `save_issue` with the new description, removing
  `needs-design`. Patch an amended PRD with `save_document`.
- **GitHub**: post the original with `gh issue comment`, then `gh issue edit` with the new body and
  `--remove-label needs-design`. An amended PRD is edited in the epic's body.
- **No tracker tool**: hand the updated issue text back. Step 10 carries the approved design into the
  PR description.

Mark each drafted record accepted, in the repo's status vocabulary; step 7 commits it.

Done when the user has approved the design and every write has succeeded, or the text has been handed
back.

## 7. Record the decisions

Skip this step when the repo keeps no decision records. Otherwise commit, before any code:

- the records approved at the gate;
- under an epic, a record for each decision in the PRD's `## Implementation decisions` that this issue
  is the first to implement, meaning no record for it exists yet. It was approved with the PRD, so it is
  written accepted.

Done when every decision this issue implements has a committed record.

## 8. Build

- **A bug**: invoke `diagnosing-bugs`. The reproduction in `## Current behaviour` starts its loop, and
  the issue's testing seam is where its regression test goes. Then build any `(guard)` criteria with
  `tdd`.
- **Anything else**: invoke `tdd` at the issue's testing seams. They are the agreed seams `tdd` asks
  about, so start the loop without asking again.

Run the typecheck and single test files as you go, and the full suite once at the end. Commit in small,
reviewable steps, in the repo's commit style.

**Back to the gate** when the build needs a seam the issue doesn't list, contradicts an approved
decision, or needs a new one: stop, present only that change as step 6 does, and on approval write it
to the issue (and to a record, when it needs one) before building on.

Then invoke `code-review` with the merge-base against the default branch as the fixed point, and the
issue as the spec: write the issue (and, under an epic, the PRD) to a scratch file outside the repo and
pass its path. Fix or answer every finding.

Done when every criterion except `Repo DoD` passes a test at its seam, the repo's definition of done
holds when the issue links one, the typecheck and the full suite pass, and every review finding is
fixed or answered.

## 9. Bring the docs up to date

Update every knowledge-base doc whose contract, concept or procedure the change altered, so that it
describes the built code, and commit it on this branch. Edit only docs that exist. Skip this step when
the repo has no knowledge base.

Done when every doc the change made stale describes the built code.

## 10. Open the PR

Push the branch. The description's author text (what the repo's PR template asks for, outside any
`visual-pr` block) carries:

- the **closing reference** the tracker reads: `Closes #<n>` for a GitHub issue, `Closes <ID>` for
  Linear;
- the **triage line**: `Design: settled in <issue link>`, or `Design: approved at pickup in <issue link>`;
- with no tracker tool, the approved design sections from step 6.

Then:

- **GitHub, with `visual-pr`**: open the PR and write its description with `visual-pr`.
- **GitHub, without it**: `gh pr create` with the author text, a summary of the change and its test
  evidence.
- **Another host**: report the branch and the description to paste.

When the branch already has an open PR, refresh its description instead of opening another.

Done when the PR is open, or the branch is pushed and reported, and the description matches `HEAD`.

## Trivial changes

A **trivial** change is a typo, formatting, a comment, a dependency bump, or a docs-only edit that
touches no behaviour, contract, state, observability or architecture. It has no issue, so it skips the
readiness check, triage, the gate and the decision records:

1. Get onto a branch as in step 3, named `<prefix>-<slug>` with no key.
2. Read the checks as in step 4.
3. Make the change, and run the typecheck and the full suite.
4. Invoke `code-review` and tell it there is no spec, so it reviews on the Standards axis only. Fix or
   answer every finding.
5. Open the PR as in step 10, with `Trivial: <what changed, and why it touches no behaviour>` in place
   of the closing reference and the triage line.

When the change turns out to touch behaviour, stop and name `/build-up-spec <text>` or
`/bug-intake <text>`.

## Resuming

A run that finds the issue's branch with commits ahead of the default branch picks up where the last
one stopped, whether the session restarted or its context ran out:

- Triage again (step 5) against the issue as the tracker holds it now. A design approved at the gate
  was written back, so it reads `Design: settled`. With no tracker tool, triage the issue text handed
  back at the gate.
- Committed decision records count as approved.
- Run the full suite to see which criteria still fail, and build on from the tests already committed.
- Refresh an open PR rather than opening a second one.

## Decision records

Only where the repo keeps them: the knowledge base says where, in what format, with which statuses, and
when one is written. When it keeps them but states no rule, write a record for a decision that:

- introduces a new pattern or architectural style;
- chooses between several viable approaches (record why the others lost);
- affects several modules;
- sets a constraint future work must follow;
- reverses or supersedes an earlier decision.

Implementation details, easily reversed choices and routine additions that follow existing patterns get
none. A record lands before the code it decides: drafted as proposed at the gate (step 6), committed as
accepted (step 7). An accepted record is never edited; a changed decision is a new record that
supersedes it. In a repo that keeps no records, a decision stays in the issue.

## Stops

The run stops for the user at these points, and only these:

- a required skill is missing (step 1);
- routing: an epic's frontier pick, free text that is not trivial, or a trivial change that turns out
  to touch behaviour;
- readiness: an open blocker, or incomplete criteria (step 2);
- the wrong worktree (step 3);
- a repo fact that nothing records (step 4);
- the design gate (step 6), and every return to it (step 8).

Invoking this skill asks for the push and the PR, so they need no further confirmation.
