---
name: wsjf
description: "Score and rank work by WSJF (Weighted Shortest Job First): cost of delay, (user/business value + risk reduction/opportunity enablement) x time criticality, divided by job size, each scored on a Fibonacci scale relative to already-scored items. Use when asked for the WSJF or cost of delay of an epic or an issue (product, tech, compliance or bug fix), to prioritise or rank a backlog, or what to work on next."
---

# WSJF

**WSJF = Cost of Delay / Size**, with **Cost of Delay = (BV + RR/OE) × TC**:

| Input | Question | Higher means |
|---|---|---|
| **BV**: User or Business Value | how much value does it deliver? | more value |
| **RR/OE**: Risk Reduction / Opportunity Enablement | what risk does it remove, what does it unlock? | more risk removed or more unlocked |
| **TC**: Time Criticality | how fast does the value decay with delay? | must happen sooner |
| **Size** | how much effort? | bigger job |

Cost of Delay is the value lost while the job waits: a feature that would earn 10K a month, shipped
six months late, cost 60K. This skill estimates that loss **relatively**: every input is a Fibonacci
value `1 · 2 · 3 · 5 · 8 · 13 · 20` judged against the other items in a **reference set**, never in
isolation. Value and urgency multiply, so a job with no value has no cost of delay however urgent it
looks.

The agent judges the four inputs; [`scripts/wsjf.mjs`](scripts/wsjf.mjs) does every calculation,
validation, ranking and block edit. Never compute a CoD, a WSJF or a rank in prose.

Needs `issue-tracker`, the katana skill every tracker read and write goes through: its
[contract](../issue-tracker/SKILL.md)'s operations are named below in bold, and the tracker's adapter is
resolved as it says before the first one. While no tracker tool is reachable, the skill hands back text
to paste.

## What gets scored

Anything that delivers value on its own:

- **Epics and projects.** On a tracker an epic is a project, or an item the tracker's adapter marks as
  one (its `## Epics` section).
- **Issues** that pass the **value test**: _"if this shipped alone, would someone gain measurable
  value?"_ Any type passes: product, tech or compliance work (see [Type hints](#type-hints)), or a
  **bug fix**, which makes behaviour that is broken today work again (see [Bug](#bug)).
- **Tasks** fail the value test: they deliver value only as part of their epic, so they get no score
  and inherit its priority. Say so and stop.

A ranking compares like with like: **epics with epics**, **issues with issues** across the team's
backlog, every type in one set. One set never mixes the two levels.

## Modes

- **Single-issue** (default): score one target against the reference set, report its WSJF and rank.
  A calling skill may hand over several new items at once (the slices of an epic): each one is a
  target, scored in the same run.
- **Backlog**: score or re-score a whole set and return the ranked table. Use it when asked to rank
  a backlog, after a cold start leaves several items unscored, or when single-issue mode reports
  stale references.

## The block

Each scored item carries this section at the end of its description, after `Success measures / DoD`
in an outcome-framed epic. The stored blocks _are_ the reference set: a score nobody writes back is
lost to the next run.

```markdown
## WSJF
<!-- katana:wsjf:v1 -->
| BV | RR/OE | TC | CoD | Size | WSJF | Scored |
|---|---|---|---|---|---|---|
| 8 | 3 | 5 | 55 | 5 | 11.0 | 2026-10-24 |
```

The script reads only the four inputs and the date, and recomputes CoD and WSJF from them.

## Steps

### 1. Reference set

1. **Level**: epic or issue, by the test in [What gets scored](#what-gets-scored).
2. **Scope**: the `WSJF scope` line in the repo's `## Katana skills` block (a target in the tracker:
   a team, a project or a repo). No such line: ask the user.
3. **Fetch** the open items at that level in that scope, with their descriptions (**Search**). Done
   items are out: their delay has stopped costing anything.
4. Write them as JSON, `[{ "id", "title", "description" }]`, to a scratch file and run:
   ```bash
   node <skill-dir>/scripts/wsjf.mjs rank --input <items.json> --today <YYYY-MM-DD>
   ```
   `<skill-dir>` is where this skill is deployed, e.g. `.claude/skills/wsjf/`.
5. Show the user the scored items as the reference set, and let them add or remove items.
6. Report every problem the run surfaced: a **malformed** block (name it; it stays out of the set), a
   **stale** reference (scored over 90 days ago), and any reference whose description names a fixed
   date that has passed. Suggest backlog mode for stale ones; never re-score a reference silently.

Done when the user has seen the reference set and every problem in it has been named.

### 2. Cold start

Fewer than 3 scored references: calibrate before scoring the target. Ask the user to name 3–5 open
items at the same level, or to give their values; otherwise propose 3–5 that span the range (the
smallest, the largest, one in between). For a **drafted** target (step 5), propose them without asking:
the caller's preview is where the user sees them. Score them as in step 3, setting **the smallest item
in each column to 1**. The anchors are verified and written back with the target, and become the
reference set for every later run.

An anchor whose description states no goal or scope (a list of links, a title alone) is a **weak
anchor**: name it, and report the target's rank as provisional.

### 3. Score

For each of BV, RR/OE, TC and Size, pick a Fibonacci value **anchored on a reference** ("BV 8: about
the value of ENG-12, more than ENG-7") and checked against the [rubric](#rubric). Write a one-line
rationale per input that names its reference.

- When the item has an `outcome-framing` type, use its [type hints](#type-hints). No type: classify
  it with that skill's decision tree first; the tree applies to issues as well as epics. A bug fix
  takes the [Bug](#bug) hint instead and is not classified.
- **Size** is relative effort on the same scale. A tracker estimate (points, days) places the item
  among the references; it is never copied over as a number.
- **1 is the floor**, and several items may share it. A target clearly smaller than the current 1 in
  a column scores 1; say so and suggest a backlog-mode re-score to spread the scale.

In **backlog mode**, score every item of the set relative to the others, with the smallest item in
each column at 1.

Done when every input of every item being scored has a value and a rationale.

### 4. Rank

Add the target with its scores and `"target": true` to the JSON from step 1 (backlog mode: every item
with its new scores) and run `rank` again. Ties go to the smaller Size, then the higher TC.

### 5. Verify

One round, except for a **drafted** target: one a calling skill is still drafting. The caller shows
its inputs, rationales and rank in its own preview, where the user accepts or edits them (see
[For calling skills](#for-calling-skills)), so asking here would ask twice. Skip the round for it,
and for the cold-start anchors scored with it: they go back to the caller with the target.

- **Single-issue**: show each input with its rationale, then CoD, WSJF and the rank
  ("3rd of 12"), and the ranked table. Ask: _accept / edit_.
- **Backlog**: show the ranked table, rationales on request. Ask: _accept all / edit N_.

After an edit, re-run `rank` and show the new position in one line, without a second round.

Done when the user has accepted every score but a drafted target's.

### 6. Write back

For each accepted item, build the new description from its current one, and write it back whole
(**Update an item**):

```bash
node <skill-dir>/scripts/wsjf.mjs upsert --description <current.md> --bv N --rroe N --tc N --size N --scored <YYYY-MM-DD>
```

`upsert` replaces the `## WSJF` section in place, or appends it, and leaves every other line as it
was. While no tracker tool is reachable, give the user the block to paste. When a calling skill is still
drafting the item (it is not in a tracker yet, or the caller is about to rewrite its description),
return the block to the caller.

Done when every accepted score is written, pasted, or returned.

## Rubric

The references keep the scale relative; the bands keep each rationale checkable. Each band boundary
is an observable question, asked of the item's description.

**BV**: who gains, and which KPI moves?

| Band | Observable |
|---|---|
| 1–2 | a few users or an internal convenience; no KPI moves measurably |
| 3–5 | one segment notices; a secondary KPI moves |
| 8–13 | a core workflow for most users, or a primary KPI (revenue, retention, conversion) moves |
| 20 | the largest value in the set: a primary KPI moves across the whole customer base |

**RR/OE**: what goes wrong without it, and what can start once it is done?

| Band | Observable |
|---|---|
| 1–2 | removes no known risk and unlocks nothing |
| 3–5 | reduces a risk that has a workaround, or unlocks one later item |
| 8–13 | removes a risk of incident, outage or penalty with no workaround, or unlocks several items |
| 20 | other epics cannot start without it, or it removes an existential risk (data loss, licence to operate) |

**TC**: does delay only postpone the value, or destroy some of it? Place the item on one of the four
urgency profiles first:

| Urgency profile | Observable | TC |
|---|---|---|
| Long life cycle, peak unaffected by delay | the value arrives later but in full | 1–3 |
| Long life cycle, peak affected by delay | competitors or churn take part of the value while it waits | 3–8 |
| Short life cycle, peak affected by delay | a market window or season closes | 8–20 |
| Fixed date | a contract, regulation or event date; the value collapses after it | by slack: ample 3–5, tight 8–13, at risk now 20 |

## Type hints

From the `outcome-framing` types, where the value of each kind of epic or issue tends to sit:

- **Product**: BV carries most of it; take it from the item's KPI.
- **Tech**: BV is usually low; the value is **RR/OE**. A lower change fail rate or failed deployment
  recovery time is risk reduction; better deployability or testability is opportunity enablement.
  Score it there, so tech epics and tech issues do not lose the ranking for having no user-facing value.
- **Compliance**: the penalty or exposure avoided is **RR**; **TC** is the fixed-date profile, from
  the deadline.

### Bug

A bug fix is scored from the `Severity:` line in its description: a level, Critical, High, Medium or
Low, that `bug-intake` sets from the reproduction, and the bug's reach. Without the line, ask the user
for both.

| Severity | RR/OE |
|---|---|
| **Critical** | 13–20 |
| **High** | 8–13 |
| **Medium** | 3–5 |
| **Low** | 1–2 |

- **RR/OE** carries the severity: the broken behaviour is the risk the fix removes.
- **BV** is the reach: who hits the bug and how often, in the BV bands.
- **TC**: a bug users hit today loses value every day it waits, so at least 3–8 (peak affected by
  delay). A fix due by an SLA or a contract takes the fixed-date profile. A latent bug nobody hits yet
  scores 1–3.

## For calling skills

A calling skill gets, per scored item: the four inputs with rationales, CoD, WSJF, rank, and the
block. It owns nothing else: verification and write-back happen here, except for an item the caller
is still drafting. That item's block is returned unverified, together with the inputs, rationales and
blocks of any cold-start anchors scored with it, and the caller owes the user one look at them before
publishing:

- **Show** the score in the caller's own preview, beside the rest of the draft, in this compact form
  rather than the bare block or the ranked table:

  ```
  WSJF 8.1 (1st of 4) · BV 13 · RR/OE 8 · TC 5 · Size 13
  - BV 13: <one line, naming the reference it is anchored on>
  - RR/OE 8: <one line>
  - TC 5: <one line>
  - Size 13: <one line>
  Anchors (new, written back on publish): ENG-7 3.2 · ENG-9 2.0 · ENG-4 2.0
  ```

  Drop the `Anchors` line when there was no cold start. A provisional rank reads
  `(1st of 4, provisional: weak anchors ENG-4, ENG-9)`. The ranked table and the anchors' rationales
  are shown on request.
- **An edit** to an input, the target's or an anchor's, comes back here: re-run `rank` and `upsert`
  with the edited value, and show the new position in one line, without another round.
- **Publishing** the draft accepts its score and its anchors. The caller then writes each anchor's
  block through the tracker tool, with `upsert` on the anchor's current description.
