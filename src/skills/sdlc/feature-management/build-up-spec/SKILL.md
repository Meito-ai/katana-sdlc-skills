---
name: build-up-spec
description: "Shape an idea, a raw backlog item or nothing at all into an epic with a PRD or an agent-sized issue: explore, grill, write EARS requirements, frame the outcome, score WSJF, and publish it to the tracker."
disable-model-invocation: true
---

# Build up spec

Turn an idea into a backlog item that agents can build from. The item has one of two **levels**:

- An **epic** is more work than one agent session can hold. It is published as a **card** and a
  **PRD** ([templates](templates.md)), then sliced into issues by `slice-spec`.
- An **issue** is work one fresh agent session can finish end to end and verify. It is published using
  `slice-spec`'s [issue template](../slice-spec/issue-template.md).

Every statement in the item is **sourced**: it comes from the codebase, the knowledge base, a source
the user provided, or the user's own answer. A gap becomes a **placeholder** (`[add baseline]`,
`[add bound]`, …) for the team to fill in.

One run shapes one feature: product, tech or compliance work. A bug (something broken) is out of
scope. Say so, and point the user to the repo's bug workflow (`diagnosing-bugs`, when it is
installed).

## Requirements

- **`grilling`** from `mattpocock/skills` >= v1.2.0. This skill's `apm.yml` declares it, but a repo
  that already pins `mattpocock/skills` keeps its own pin and subset, silently.
- **`outcome-framing`, `wsjf` and `slice-spec`**, the katana skills this one calls.
  `setup-katana-skills` installs them along with this one; when installing by hand, add all three.
- **A tracker tool**: a Linear MCP, or `gh` >= 2.94 for GitHub issues. Without one, step 8 hands the
  item back as text to paste.

## 1. Read the input

Check that `grilling`, `outcome-framing`, `wsjf` and `slice-spec` are each deployed (under
`.claude/skills/<name>/` or `.agents/skills/<name>/`). If any are missing, stop and name them,
with the line that installs each one.

Sort what the user gave:

- **Free text**: the idea to enrich.
- **Nothing**: skip step 3; grilling opens on the problem itself.
- **A tracker item** (an identifier or a URL): this run **refines it in place** (see
  [Refining in place](#refining-in-place)). Fetch its title, description, comments, labels, parent,
  sub-issues and attached documents.
- **A URL or a file**: a source. Read it; its facts count as sourced and are cited under
  `## Sources`.
- **A bug**: stop, as described above.

If the user indicated a level ("an epic", "a small issue"), keep it as a starting assumption for step 4.

Done when every part of the input has been sorted and every source has been read.

## 2. Explore

- **Knowledge base**: what `AGENTS.md` / `CLAUDE.md` says about it, then the `Knowledge base:` line
  in the `## Katana skills` block, then a shallow look through `README` and `docs/`, telling the user
  that this last one was a guess. Read the parts the item touches: glossary terms, recorded decisions,
  and the repo's definition of done if it has one.
- **Code**: the area the item touches. Explore it in this session rather than in a sub-agent:
  `slice-spec` runs next in the same window and builds on what is read here.
- **Tracker**: search for **duplicates** using the item's key terms (in the team named on the
  `Backlog:` line, or across the whole workspace), and list the open epics that could be its parent
  (issues labelled `Epic`). Show the matches. For each overlapping item the user picks one of:
  refine it instead (it becomes the item refined in place), link it as related, mark the new item as
  its duplicate (which ends the run), or carry on.

Done when the knowledge base has been located (or the guess reported), the code in the area has been
read, and the user has decided on every duplicate match.

## 3. Enrich

Skip this step when there is no input.

Restate the input as a problem: who has it, what happens today, and why it matters. Classify its type
as product, tech or compliance, using step 1 (Type) of `outcome-framing`'s decision tree. Before
grilling starts, show every fact you derived with its source, and every gap as a placeholder, so the
user can strike anything wrong.

Done when every statement in the restatement is sourced or is a placeholder, the type has a one-line
rationale, and the user has seen the list.

## 4. Grill

Invoke `grilling` on the restated problem, or on nothing when there was no input. Besides whatever the
problem itself raises, its design tree must reach these branches:

- **Beneficiary and measure**: who gains, which KPI, DORA metric, fitness function or obligation
  moves, and from what baseline. This gives step 6 facts to frame instead of placeholders to leave.
- **Scope boundary**: what is in scope, and what the user turns down. Everything turned down goes
  into `Out of scope`.
- **Interfaces**: the modules, types and contracts the change touches.
- **Level**, asked last: propose epic or issue, with the reason. The test is: _can one fresh agent
  session finish it end to end and verify it?_
  - It's an epic if it has more than one slice that can be demoed on its own, needs decisions across
    several seams, or is more work than one session can hold.
  - An issue that delivers no value on its own (it fails `wsjf`'s story test) is a **task**, and
    needs a parent epic.

Every answer the user gives counts as sourced.

Done when grilling's frontier is empty and the user has confirmed the level.

## 5. Requirements, DoD and seams

Draft all of the following, then confirm it with the user in a single round:

- **Requirements**, following `slice-spec`'s [EARS rules](../slice-spec/ears.md): `R1`, `R2`, … for
  an epic's PRD; `AC1`, `AC2`, … for an issue.
  - An issue under an epic that has a PRD cites the requirements it implements (`AC2 (R5)`).
  - Behaviour the PRD doesn't yet describe becomes the PRD's next `R` number. That amendment is shown
    in step 8.
- **DoD**: an epic's DoD is its success measures, which step 6 writes. An issue's DoD is its
  acceptance criteria, plus a link to the repo's definition of done when the knowledge base has one.
- **Testing seams**: where the change will be tested. Prefer existing seams to new ones, take the
  highest seam available, and use as few as possible (ideally one). Note prior art.
- **Implementation decisions** (epics only): the modules, interfaces, schema and contracts decided
  while grilling.

Done when the user has accepted every requirement, the seams and (for an epic) the implementation
decisions, and each requirement fails against today's behaviour.

## 6. Frame the outcome

- **Epic**: invoke `outcome-framing` with the draft card (see [templates](templates.md)). It runs
  its own verification round. Take the title and description it returns. If the user rejects the
  rewrite, keep the draft, placeholders included.
- **Issue**: `outcome-framing` only frames epics, so settle the parent instead: the epic chosen in
  step 2 or step 4, or none. A task always has a parent.

Done when the epic has an accepted title and card, or the issue's parent is settled.

## 7. Score WSJF

- **An epic, or an issue that passes `wsjf`'s story test**: invoke `wsjf` on the draft, and tell it
  the item is still being drafted so that it returns the block instead of writing it. This also
  applies to an item refined in place, because step 8 rewrites its description.
- **A task**: no score. Its `## WSJF` section reads `Inherits <epic>'s priority.`

Done when the item has an accepted WSJF block, or the inherits line.

## 8. Preview and publish

1. **Target.** Read the `Backlog:` line in the `## Katana skills` block: a team and a project, or a
   GitHub repo. Propose it, and let the user change it for this item.
   - When there is no such line, ask, listing the teams and projects through the tracker tool. Write
     the answer as the `Backlog:` line under `### Backlog items` in that block.
   - When the user changes the default, update the line.
   - If the block doesn't exist, create it (markers, heading and subsection) in the file that
     `setup-katana-skills` writes to: `CLAUDE.md`, or `AGENTS.md` when there is no `CLAUDE.md` or it
     only imports `@AGENTS.md`.
   - Leave the change uncommitted.
2. **Labels.**
   - An issue gets `ready-for-agent`, or `needs-info` while a placeholder is left in its criteria.
   - An epic gets `Epic`, and never `ready-for-agent`: an agent polling for that label would try to
     build the whole epic in one run.
   - The type label is the team's label named `product`, `tech` or `compliance` (any case), when the
     team has one.
   - When the `Epic` label or a type label is missing, offer once to create it. Labels are only
     created with the user's yes.
   - When the repo has `docs/agents/triage-labels.md`, use the label strings it maps to.
   - Leave the tracker's own priority field unchanged: the WSJF block is the ranking.
3. **Preview** exactly what will be written: the title; the card and PRD, or the issue body; the
   labels, parent, related and duplicate links; the target; any PRD amendment; and, for an item
   refined in place, what changes and what stays. Ask once: _publish / edit_.
4. **Write.**
   - On **Linear**:
     - for an item refined in place, first post its original title and description as a comment
       (`Original before build-up-spec, <date>`);
     - create or update the issue with `save_issue`: title, description, team, project, labels,
       `parentId` and `relatedTo`, leaving the state at the team's default;
     - for an epic, create the PRD with `save_document`, with `issue` set to the epic, then point the
       card's `Spec:` line at it;
     - for an amendment, patch the parent PRD's `## Requirements` with `save_document` and `patch`.
   - On **GitHub**: `gh issue create` or `gh issue edit`, with `--parent` and `--label`. Post the
     original with `gh issue comment`. The PRD goes in the body.
   - With **no tracker tool**: hand back the card and PRD, or the issue, as text.
5. **Hand off** an epic: ask _"slice it now?"_. A yes invokes `slice-spec` on it in this
   conversation. A no ends the run with the command to run later: `/slice-spec <epic id>`.

Done when every write has succeeded and its link has been reported, or the text has been handed back.

## Refining in place

An existing tracker item given as input keeps its identity: the run rewrites it rather than creating a
copy.

- Comments, assignee, state, cycle and existing relations stay as they are. Labels are only ever
  added.
- The original title and description are posted as a comment before the rewrite (step 8).
- **Issue → epic**, when grilling finds more work than one session can hold: add the `Epic` label,
  attach a PRD, and rewrite the description as a card. Existing sub-issues stay, and `slice-spec`
  counts them towards coverage before it proposes new slices.
- **Epic → issue**, only when it has no sub-issues: its PRD stays attached, with its first line
  changed to `Superseded: folded into <issue link> on <date>`. Nothing is deleted.
- An existing epic without a PRD gets one. An existing `## WSJF` block is re-scored in step 7.
