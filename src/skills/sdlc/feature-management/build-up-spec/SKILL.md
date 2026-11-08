---
name: build-up-spec
description: "Shape an idea, a raw backlog item or nothing at all into an epic with a PRD or an agent-sized issue: explore, grill, write EARS requirements, frame the outcome, score WSJF, and publish it to the tracker. A product owner can defer the design to the engineer who refines it later."
disable-model-invocation: true
metadata:
  requires: "https://github.com/mattpocock/skills/tree/v1.3.2/skills/productivity/grilling"
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

The user is asked in two places: grilling's rounds (step 4), where every decision is a numbered
question with a recommended answer, and the preview (step 8), where the finished item is checked once.
Every other step works through to its end and hands what needs deciding to one of those two. Only a
stop (a missing skill, a bug) and the hand-off after publishing speak to the user elsewhere.

One run shapes one feature: product, tech or compliance work. A bug (something broken) is out of
scope. Say so, and point the user to `bug-intake` (`/bug-intake <report>`), which turns a bug report
into an issue; when it is not installed, `/setup-katana-skills` adds it.

## Requirements

- **`grilling`** from `mattpocock/skills` >= v1.3.2. This skill's `apm.yml` declares it, but a repo
  that already pins `mattpocock/skills` keeps its own pin and subset, silently.
- **`outcome-framing`, `wsjf`, `slice-spec` and `issue-tracker`**, the katana skills this one calls.
  `setup-katana-skills` installs them along with this one; when installing by hand, add all four.
  Every tracker read and write is an operation of `issue-tracker`'s
  [contract](../issue-tracker/SKILL.md), named below in bold (**Fetch an item**, **Search**, …).
  While no tracker tool is reachable, step 8 hands the item back as text to paste.

## 1. Read the input

Check that `grilling`, `outcome-framing`, `wsjf`, `slice-spec` and `issue-tracker` are each deployed
(under `.claude/skills/<name>/` or `.agents/skills/<name>/`). If any are missing, stop and name them,
with the line that installs each one. Then resolve the tracker's adapter, as `issue-tracker` says.

Sort what the user gave:

- **Free text**: the idea to enrich.
- **Nothing**: skip step 3; grilling opens on the problem itself.
- **A tracker item** (an identifier or a URL): this run **refines it in place** (see
  [Refining in place](#refining-in-place)). Fetch it (**Fetch an item**): its title, description,
  comments, labels, parent, children and PRD.
- **A URL or a file**: a source. Read it; its facts count as sourced and are cited under
  `## Sources`.
- **A bug**: stop, as described above.

If the user indicated a level ("an epic", "a small issue"), keep it as a starting assumption for step 4.

Decide whether this is a **design-deferred run**, where a product owner leaves the design (modules,
interfaces, contracts and testing seams) to the engineer who will refine the item later:

- **Deferred** when the user says so in their own words ("design is for the engineer").
- **Asked in grilling's first round** when the user says they are the product owner but not who
  designs: _shape the design now, or defer it to the engineer?_ Until it is answered, step 4 holds
  the Interfaces branch back.
- **Not deferred** otherwise. Every step then runs exactly as written, and the deferral notes in steps
  4, 5 and 8 do not apply.

A tracker item labelled `needs-design` is the engineer's turn, so its run is not deferred unless the
user defers again (see [Refining in place](#refining-in-place)).

Done when every part of the input has been sorted, every source has been read, and the run is known to
be design-deferred, not deferred, or waiting on that question in grilling's first round.

## 2. Explore

- **Knowledge base**: the `Knowledge base:` line in the `## Katana skills` block, else where
  `AGENTS.md` / `CLAUDE.md` says it lives, else a `docs/` directory. With none of them, carry on
  without one and say so in the preview. Read the parts the item touches: glossary terms, recorded
  decisions, and the definition of done.
- **Code**: the area the item touches. Explore it in this session rather than in a sub-agent:
  `slice-spec` runs next in the same window and builds on what is read here.
- **Tracker**: search for **duplicates** using the item's key terms (**Search**, in the `Backlog:`
  line's target, or across every target), and list the open epics that could be its parent
  (**Search**, for epics). Each overlapping item becomes a question for grilling's first round, with a
  recommended pick among: refine it instead (it becomes the item refined in place), link it as
  related, mark the new item as its duplicate (which ends the run), or carry on. With no `Backlog:`
  line, where to file the item is a question for that round too, listing the targets
  (**List targets**).

Done when the knowledge base has been located (or its absence noted), the code in the area has been
read, and every duplicate match has its question queued.

## 3. Enrich

Skip this step when there is no input.

Restate the input as a problem: who has it, what happens today, and why it matters. Classify its type
as product, tech or compliance, using step 1 (Type) of `outcome-framing`'s decision tree. List every
fact you derived with its source, and every gap as a placeholder: grilling's first round opens with
this list, so the user can strike anything wrong.

Done when every statement in the restatement is sourced or is a placeholder, and the type has a
one-line rationale.

## 4. Grill

Invoke `grilling` on the restated problem, or on nothing when there was no input.

Its **first round** opens with step 3's list of facts and placeholders, and asks, beside grilling's
own frontier, every question steps 1 to 3 queued: striking a wrong fact, each duplicate match, where
to file the item, and whether design is deferred. Each is numbered and carries a recommended answer,
like the rest of the round.

Besides whatever the problem itself raises, its design tree must reach these branches:

- **Beneficiary and measure**: who gains, which KPI, DORA metric, fitness function or obligation
  moves, and from what baseline. This gives step 6 facts to frame instead of placeholders to leave.
- **Scope boundary**: what is in scope, and what the user turns down. Everything turned down goes
  into `Out of scope`.
- **Rollout**: what existing users or consumers must change, install, migrate or rerun once this
  ships, and what breaks for them until they do. Settle the release impact here, against the release
  or compatibility rules the knowledge base states (a versioning policy, a bump table). An epic
  records it in `Implementation decisions`, an issue in `## What to build`.
- **Interfaces**: the modules, types and contracts the change touches. When design is deferred, skip
  this branch: the engineer grills it when refining the item.
- **Level**, asked last: propose epic or issue, with the reason. The test is: _can one fresh agent
  session finish it end to end and verify it?_
  - It's an epic if it has more than one slice that can be demoed on its own, needs decisions across
    several seams, or is more work than one session can hold.
  - An issue that delivers no value on its own (it fails `wsjf`'s value test) is a **task**, and
    needs a parent epic.

Every answer the user gives counts as sourced.

Done when grilling's frontier is empty and the user has confirmed the level.

## 5. Requirements, DoD and seams

Draft all of the following from what grilling settled. The user checks it in step 8's preview:

- **Requirements**, following `slice-spec`'s [EARS rules](../slice-spec/ears.md): `R1`, `R2`, … for
  an epic's PRD; `AC1`, `AC2`, … for an issue.
  - An issue under an epic that has a PRD cites the requirements it implements (`AC2 (R5)`).
  - Behaviour the PRD doesn't yet describe becomes the PRD's next `R` number. That amendment is shown
    in step 8.
- **DoD**: an epic's DoD is its success measures, which step 6 writes. An issue's DoD is its
  acceptance criteria, plus a link to the repo's definition of done when the knowledge base has one.
- **Testing seams**: where the change will be tested. Prefer existing seams to new ones, take the
  highest seam available, and use as few as possible (ideally one). Note prior art. An epic records
  them in the PRD. An issue records them in its own `## Testing seams`, each with the criteria verified
  there, reusing its parent PRD's seams when it has one.
- **Implementation decisions** (epics only): the modules, interfaces, schema and contracts decided
  while grilling.
- **Design deferred**: draft no seams, implementation decisions or key interfaces. Write
  `[add testing seams]` under `## Testing seams`, `[add implementation decisions]` under an epic PRD's
  `## Implementation decisions`, and `[add key interfaces]` under an issue's `## Key interfaces`.
  These are the **design placeholders**: they mark the sections an engineer fills, so use them for
  nothing else.
- **A parent PRD whose seams are still `[add testing seams]`** has none to reuse: an issue that is not
  design-deferred drafts its own.

Done when every requirement, the seams and (for an epic) the implementation decisions are drafted,
each requirement fails against today's behaviour, and each traces to a grilling answer or a sourced
fact. In a design-deferred run, the design placeholders stand in for the seams, implementation
decisions and key interfaces.

## 6. Frame the outcome

- **Epic**: invoke `outcome-framing` with the draft card (see [templates](templates.md)), and tell
  it the epic is still being drafted, so that it returns its output block without a verification
  round of its own: step 8's preview is where the framing is checked. Take the title and description
  it returns. If the user rejects the rewrite in the preview, keep the draft, placeholders included.
- **Issue**: `outcome-framing` only frames epics, so settle the parent instead: the epic chosen while
  grilling, or none. A task always has a parent.

Done when the epic has a framed title and card, or the issue's parent is settled.

## 7. Score WSJF

- **An epic, or an issue that passes `wsjf`'s value test**: invoke `wsjf` on the draft, and tell it
  the item is still being drafted so that it returns the block instead of writing it, without asking
  the user: step 8's preview is where the score is checked. This also applies to an item refined in
  place, because step 8 rewrites its description.
- **A task**: no score. Its `## WSJF` section reads `Inherits <epic>'s priority.`

Done when the item has a WSJF block, with each input's rationale and the rank, or the inherits line.

## 8. Preview and publish

1. **Ground.** Re-read each statement of the draft against its source: the file, doc, tracker item or
   user answer behind every line of the problem (an issue's current behaviour), the implementation
   decisions and the testing seams. Check the decisions against the knowledge base's rules as well,
   its release and compatibility rules above all. Correct a statement that misquotes its source. A
   correction that changes a decision the user accepted goes to them in the preview, as a question.
   Grounding is done when every statement has been re-read against its source.
2. **Target.** Read the `Backlog:` line: a target in the tracker. Propose it, and let the user change
   it for this item.
   - When there is no such line, take the target answered in grilling's first round, and record it as
     the `Backlog:` line.
   - When the user changes the default, update the line.
   - Record it as `issue-tracker`'s [Tracker lines](../issue-tracker/SKILL.md#tracker-lines) says.
3. **Labels.** Write the text about to be published to a file (an issue's body, or an epic's card
   followed by its PRD), list the target's labels (**Labels**), and run:

   ```bash
   node <skill-dir>/scripts/labels.mjs plan --level <epic|issue> --deferred <yes|no> \
     --epic-label <yes|no> --type <product|tech|compliance> --text <file> \
     --current <the item's labels> --available <the target's labels>
   ```

   `--deferred` is step 1's decision, and `--epic-label` the adapter's `Epic label:`. It prints the
   labels to `add`, the labels to `remove`, and the added labels the team is `missing`. `--current` is empty for a new item. The script applies these
   rules:
   - An issue gets `ready-for-agent`, or `needs-info` while a placeholder is left in its criteria.
   - A design-deferred item gets `needs-design`, and never `ready-for-agent`: no agent picks it up
     before an engineer has agreed its seams. A run that is not deferred removes a `needs-design`
     already on the item.
   - An epic gets `Epic` (unless the adapter marks epics by type), and never `ready-for-agent`: an
     agent polling for that label would try to build the whole epic in one run.
   - The type label is the team's label named `product`, `tech` or `compliance` (any case), when the
     team has one.

   Then:
   - Each `missing` label (only ever `Epic`, `needs-design` or a type label) is offered in the preview,
     which says that publishing creates it (**Labels**). Publishing creates the offered labels the user
     did not strike; a struck label is left off the item.
   - When `AGENTS.md` / `CLAUDE.md` or the knowledge base maps these labels to other names, pass those
     names as `--map ready-for-agent=<label>,needs-design=<label>,…`.
   - Leave the tracker's own priority field unchanged: the WSJF block is the ranking.
4. **Preview.** This is the one check of the finished item. Open with what needs the user's judgement:
   the corrections grounding made, `outcome-framing`'s `Changed` list, the open placeholders, and the
   labels offered for creation. Then show exactly what will be written: the title; the card and PRD,
   or the issue body; the labels, parent, related and duplicate links, and every text fallback the
   adapter applies to them; the target; any PRD amendment; and, for an item refined in place, what
   changes and what stays. Where the adapter declares a body limit, warn when a body exceeds it. Last,
   the WSJF score in the compact form `wsjf`'s [For calling skills](../wsjf/SKILL.md#for-calling-skills)
   gives. Ask once: _publish / edit_. An edit goes back to the step that owns it, without a round of
   its own: the framing to `outcome-framing`, a requirement or seam to step 5, a WSJF input to `wsjf`.
   Then show what changed, and ask again.
5. **Write.**
   - For an item refined in place, first post its original title and description as a comment
     (**Comment**: `Original before build-up-spec, <date>`).
   - **Create an item** or **Update an item**: title, body, target, labels (`add` added, `remove`
     removed), parent and related items, leaving the state at the tracker's default.
   - For an epic, attach the PRD (**Epic PRD**), and point the card's `Spec:` line at it.
   - For an amendment, patch the parent PRD's `## Requirements` (**Epic PRD**).
   - For each cold-start anchor, write its WSJF block as `wsjf`'s For calling skills says.
   - While no tracker tool is reachable: hand back the card and PRD, or the issue, as text.
6. **Hand off.** An item labelled `needs-design` is not ready to slice or build: end the run with the
   command the engineer runs next, `/build-up-spec <item id>`. Otherwise, for an epic, ask
   _"slice it now?"_. A yes invokes `slice-spec` on it in this conversation. A no ends the run with
   the command to run later: `/slice-spec <epic id>`.

Done when every write has succeeded and its link has been reported, or the text has been handed back.

## Refining in place

An existing tracker item given as input keeps its identity: the run rewrites it rather than creating a
copy.

- Comments, assignee, state, cycle and existing relations stay as they are. Labels are only ever
  added, except that `needs-design` and `ready-for-agent` replace each other (step 8).
- **A `needs-design` item** is the engineer filling in the design. Step 4 grills the Interfaces branch,
  and step 5 drafts the seams, the implementation decisions (epic) and the key interfaces (issue) in
  place of their design placeholders. The accepted requirements stay unless grilling changes them, and
  an epic's PRD is updated in place. When the user has accepted every design section, step 8 removes
  `needs-design` and gives an issue `ready-for-agent` (or `needs-info`, while its criteria still hold
  a placeholder).
- The original title and description are posted as a comment before the rewrite (step 8).
- **Issue → epic**, when grilling finds more work than one session can hold: mark it an epic the way
  the adapter's `## Epics` says, attach a PRD, and rewrite the description as a card. Existing
  children stay, and `slice-spec` counts them towards coverage before it proposes new slices.
- **Epic → issue**, only when it has no sub-issues: its PRD stays attached, with its first line
  changed to `Superseded: folded into <issue link> on <date>`. Nothing is deleted.
- An existing epic without a PRD gets one. An existing `## WSJF` block is re-scored in step 7.
