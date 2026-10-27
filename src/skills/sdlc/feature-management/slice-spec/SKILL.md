---
name: slice-spec
description: "Slice an epic into tracer-bullet issues sized for one fresh agent session, each covering requirements from the epic's PRD, with EARS acceptance criteria, blocking edges, and WSJF for the slices that are stories; published as sub-issues of the epic. Use when asked to break an epic, spec or plan into issues or tickets."
---

# Slice spec

Break an epic into **tickets**: tracer-bullet vertical slices. Each ticket declares the tickets that
**block** it, and lists the epic's requirements it **covers**. The epic itself is left untouched: its
card and PRD stay exactly as they are.

The slicing rules come from the `to-tickets` skill of `mattpocock/skills` v1.3.1 and are kept as they
were ([licence](LICENSE-mattpocock-skills)). The additions are requirement coverage, EARS criteria,
WSJF for stories, and native tracker publishing.

## Requirements

- **`wsjf`**, the katana skill that scores the slices that are stories. Step 6 needs it; when it is
  not deployed, stop and say that the user should install it alongside this skill.
- **A tracker tool**: a Linear MCP, or `gh` >= 2.94 for GitHub issues (it has `--parent` and
  `--blocked-by`). Without one, step 7 hands the tickets back as text to paste.

## 1. Gather the epic

Work from the epic reference the user gave, or from an epic published earlier in this conversation,
which is already in context. Fetch nothing twice.

- **The card**: the epic issue's description, comments and existing sub-issues.
- **The PRD**: on Linear, the document attached to the epic issue (`get_issue` with `documents`,
  then `get_document`); on GitHub, the PRD sections in the epic's body, below the card.
- **The requirements**: the PRD's `## Requirements`, `R1`, `R2`, … An epic without a PRD gets a
  numbered list drafted from its description, used only to check coverage in this run. Tell the user
  the list was drafted, and leave `Spec:` and `Covers:` off the tickets.
- **The testing seams**: the PRD's `## Testing seams`. An epic without a PRD has none listed, so
  every seam step 3 proposes is new.
- **Existing sub-issues**: read each one and note the requirements it already covers. They count
  towards coverage and are never proposed again.

Done when the requirement list, the seams, the existing sub-issues and what each of them covers are
all known.

## 2. Explore the codebase

Skip this when the same area was already explored in this conversation (by `build-up-spec`, for
example). Otherwise, find the knowledge base: what `AGENTS.md` / `CLAUDE.md` says about it, then the
`Knowledge base:` line in the `## Katana skills` block, then a shallow look through `README` and
`docs/`, telling the user that this last one was a guess. Read the code in the area. Ticket titles and
descriptions use the knowledge base's vocabulary and respect its recorded decisions.

Look for prefactoring opportunities: "Make the change easy, then make the easy change."

Done when the area the epic touches has been read and any prefactoring is named.

## 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests): vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

</vertical-slice-rules>

Give each ticket its **blocking edges**: the other tickets that must complete before it can start. A
ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change
(rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a
single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force
it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the
old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package,
per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch
because the old form still exists. Finally contract: delete the old form once no caller remains, in a
ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence
but let them share an integration branch that all block a final integrate-and-verify ticket; green is
promised only there.

Give each ticket the requirements it **covers**. A prefactoring or expand ticket covers none: it
blocks the tickets that do. Every requirement must be covered by at least one ticket, new or existing,
unless the user decides in step 4 to leave it uncovered.

Give each ticket the **seams** its tests attach at: the PRD's, taking the highest one that reaches the
ticket's behaviour. Propose a new seam only when no listed seam reaches it, and say why.

Done when every ticket has its blocking edges, its coverage and its seams, and every requirement is
either covered or marked as an open question for step 4.

## 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **Covers**: the requirements it implements, or `none (prefactoring)`
- **Seams**: where its tests attach, with each new seam marked `(new)`
- **What it delivers**: the end-to-end behaviour this ticket makes work, the thing to demo when it is
  done

Below the list, show the coverage table (each requirement, and the tickets that cover it), with any
uncovered requirement marked.

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct: does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?
- Is each new seam needed, or can a listed seam reach the behaviour?
- Is every requirement covered where it should be? An uncovered one needs either a ticket or the
  user's decision to leave it uncovered, with the reason.

Iterate until the user approves the breakdown.

Done when the user has approved the breakdown, and every requirement is covered or has been
explicitly left uncovered.

## 5. Write the tickets

Fill in the [issue template](issue-template.md) for each approved ticket. Each acceptance criterion is
an [EARS](ears.md) statement derived from a requirement the ticket covers, and cites it (`AC2 (R5)`).
Each one must be false at the commit the implementer starts from, and `## Current behaviour` says why.
A prefactoring ticket's criteria state, as guards, the behaviour that must stay the same, plus the
observable change that unblocks the next ticket. `## Testing seams` lists the seams approved in step 4,
each with the criteria verified there.

Done when every ticket has every section the template requires, each requirement it covers is cited
by at least one of its criteria, and each criterion sits under a seam.

## 6. Score the stories

Apply `wsjf`'s story test to each ticket: _if this shipped alone, would someone gain measurable
value?_

- **Stories**: invoke `wsjf` once with all of them as targets, so there is one verification round.
  The tickets are not in the tracker yet, so `wsjf` hands each block back to this skill.
- **Tasks** (prefactoring, expand and migrate batches, walking skeletons): write
  `Inherits <epic>'s priority.` in the `## WSJF` section.

Blocking edges still decide what can start: WSJF only orders the tickets that are not blocked.

Done when every story has an accepted WSJF block and every task has the inherits line.

## 7. Preview and publish

Show every ticket in full, in dependency order (blockers first), each with its labels:
`ready-for-agent`, or `needs-info` when a placeholder is still left in its criteria. When the repo has
`docs/agents/triage-labels.md`, use the label strings it maps to. Ask once: _publish all / edit N_.

Publish in dependency order, so that every blocker already has an identifier when the tickets it
blocks are created:

- **Linear**: `save_issue` with the epic's team and project, `parentId` set to the epic,
  `blockedBy` set to the blockers' identifiers, and the labels. Leave the state at the team's
  default.
- **GitHub**: `gh issue create --parent <epic> --blocked-by <n,n> --label <labels>`.
- **No tracker tool**: hand back every ticket as text, with its `Blocked by:` line.

Then report: each ticket's link in order; the **frontier**, meaning the tickets with no open blockers
that can start now; and every requirement left uncovered, with its reason.

Done when every ticket has been published or handed back, and the report has been shown.
