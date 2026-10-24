---
name: wsjf
description: "Score and rank work by WSJF (Weighted Shortest Job First): cost of delay, (user/business value + risk reduction/opportunity enablement) x time criticality, divided by job size, each scored on a Fibonacci scale relative to already-scored items. Use when asked for the WSJF or cost of delay of an epic or vertical slice, to prioritise or rank a backlog, or what to work on next."
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

Requires nothing upstream. Writing the score back needs a tracker tool (a Linear MCP, `gh` for GitHub
issues); without one the skill hands back text to paste.

## What gets scored

- **Epics and projects.**
- **Vertical slices**: an issue passes when _"if this shipped alone, would a user or the business get
  value from it?"_ is yes.
- **Tasks** fail that test: they deliver value only as part of their epic, so they get no score and
  inherit the epic's priority. Say so and stop.

A ranking compares like with like: **epics with epics**, **slices with slices** across the team's
backlog. One set never mixes the two.

## Modes

- **Single-issue** (default): score one target against the reference set, report its WSJF and rank.
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

1. **Level**: epic or slice, by the test in [What gets scored](#what-gets-scored).
2. **Scope**: the `WSJF scope` line in the repo's `## Katana skills` block (a Linear team or project,
   a GitHub repo). No such line: ask the user.
3. **Fetch** the open items at that level in that scope, with their descriptions, through the
   tracker tool. Done items are out: their delay has stopped costing anything.
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
smallest, the largest, one in between). Score them as in step 3, setting **the smallest item in each
column to 1**. The anchors are verified and written back with the target, and become the reference
set for every later run.

### 3. Score

For each of BV, RR/OE, TC and Size, pick a Fibonacci value **anchored on a reference** ("BV 8: about
the value of ENG-12, more than ENG-7") and checked against the [rubric](#rubric). Write a one-line
rationale per input that names its reference.

- When the epic has an `outcome-framing` type, use its [type hints](#type-hints). No type: classify
  it with that skill's decision tree first.
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

One round.

- **Single-issue**: show each input with its rationale, then CoD, WSJF and the rank
  ("3rd of 12"), and the ranked table. Ask: _accept / edit_.
- **Backlog**: show the ranked table, rationales on request. Ask: _accept all / edit N_.

After an edit, re-run `rank` and show the new position in one line, without a second round.

Done when the user has accepted every score.

### 6. Write back

For each accepted item, build the new description and write it through the tracker tool:

```bash
node <skill-dir>/scripts/wsjf.mjs upsert --description <current.md> --bv N --rroe N --tc N --size N --scored <YYYY-MM-DD>
```

`upsert` replaces the `## WSJF` section in place, or appends it, and leaves every other line as it
was. When there is no tracker tool, give the user the block to paste. When the item is not in a
tracker yet (a calling skill is still drafting it), return the block to the caller.

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

From the `outcome-framing` types, where the value of each kind of epic tends to sit:

- **Product**: BV carries most of it; take it from the epic's KPI.
- **Tech**: BV is usually low; the value is **RR/OE**. A lower change fail rate or failed deployment
  recovery time is risk reduction; better deployability or testability is opportunity enablement.
  Score it there, so tech epics do not lose the ranking for having no user-facing value.
- **Compliance**: the penalty or exposure avoided is **RR**; **TC** is the fixed-date profile, from
  the deadline.

## For calling skills

A calling skill gets, per scored item: the four inputs with rationales, CoD, WSJF, rank, and the
block. It owns nothing else: verification and write-back happen here, except for an item not yet in
a tracker, whose block is returned for the caller to place.
