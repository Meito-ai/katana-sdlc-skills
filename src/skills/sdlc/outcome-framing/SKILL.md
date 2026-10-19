---
name: outcome-framing
description: "Refine an epic into outcome framing: classify it as product, tech or compliance and on the Input-Activity-Output-Outcome-Impact ladder, flag prescriptive language, and rewrite its title and description around a measurable result (a KPI, a DORA metric, a fitness function, or a met obligation), then confirm the rewrite with the user. Use when writing, refining or reviewing an epic, initiative or project, or when asked how the team will know it succeeded."
---

# Outcome Framing

Refine epics so the team can answer **"how will we know this succeeded?"** before work begins. Each
epic gets a **type**, a rung on the value **ladder**, a rewritten title and description anchored to a
**success measure**, and one round of user verification.

The skill reads and returns text; writing to a tracker belongs to whatever invoked it. Another skill
may call it: after verification it gets back an [output block](#output-block) for every epic the
user accepted, plus every skipped item.

## Scope

Frame **epics and anything above them**: initiatives, Linear projects, Jira epics, GitHub parent
issues. Below that level the work is legitimately task-shaped: an issue states a task in plain words
(Linear's _write issues, not user stories_), a bug or an operational task is Activity by nature. For
those, classify, ask _"does this belong in an epic, and which one?"_, skip them, and leave their
wording alone.

Write the rewrite in the epic's own language. The smell lists below are English examples: detect a
smell by its meaning.

## Steps

### 1. Type

Walk the decision tree top-down; the first yes decides:

1. **Compliance**: _does an external party require it?_ A regulation, contract, certification, audit
   finding, or a vendor shutting something off. Yes → Compliance.
2. **Product**: _would an external user or customer notice the change?_ Yes → Product. Performance a
   user can feel is Product, with the latency as its KPI.
3. **Tech**: _does the team or the system gain something measurable?_ A DORA metric or an
   [architectural characteristic](#architectural-characteristics) improves. Yes → Tech. Security
   hardening and cost reduction land here.
4. **None of the above**: the epic states no beneficiary at all. Ask the user what it unlocks, and
   classify the answer.

End-of-life work splits on what the date does: if something stops working or a contract forbids it
after the date → Compliance; if it only stops receiving patches → Tech (security).

When the epic does not tell you a node's answer (is that contract clause binding? would users feel
this latency?), ask the user that node's question, naming the two candidate types; never guess.

A **mixed** epic (users get faster checkout _and_ the team gets independent deploys) answers yes at
more than one node: the first yes is its primary type, and each later yes adds a secondary success
measure.
Suggest splitting it into two epics only when the halves could ship independently.

Done when every item has a type with a one-line rationale.

### 2. Level

Place the epic on the ladder as written, then aim the rewrite at Outcome or Impact. The levels mean the
same for every type; only the signals change.

| Level | Product | Tech | Compliance |
|---|---|---|---|
| **Impact** | A business result: revenue, retention, conversion, churn, NPS | A DORA metric or an architectural characteristic measurably improves | The obligation is met by its deadline, the finding is closed, the exposure is removed |
| **Outcome** | A user/customer gains a capability: "users can…", self-serve, visibility | The team or the system gains a capability: "teams can deploy X alone", "survives a zone outage" | The org can **demonstrate** compliance: an auditor can check control X and see evidence Y |
| **Output** | Feature, page, API, dashboard, integration | Pipeline, module, library, platform component | Control, policy, report, consent flow, audit log |
| **Activity** | Implement, test, QA, UAT, spike, discovery | Upgrade, refactor, configure, migrate, clean up | Assess, remediate, document, certify |
| **Input** | Budget, staffing, headcount | Licences, infra spend, contractors | Legal or audit budget, external assessors |

A business metric with an improvement verb ("increase audience 15→50%") is **Impact**, not Outcome:
Outcome needs someone gaining an ability, Impact needs the org gaining a measurable result.

A **time-boxed container** (a quarter or sprint in the title: `FY27Q1 …`, `Q3 platform work`) is
Activity whatever it names inside: it holds work rather than delivering anything.

An Activity epic (spike, discovery, UAT) prompts _"what decision or capability does this unlock?"_;
the answer is the parent outcome, and the rewrite frames that.

Done when every item has a level as written, the level the rewrite reaches, and a one-line rationale
(reported under `Changed`).

### 3. Smells

Check the **title** against its type's list:

- **Product**: prescriptive verbs mark Output framing:
  `build · create · implement · setup · set up · add · integrate · develop · launch · deploy ·
  configure · migrate · establish · introduce · rollout · redesign · rebuild`.
- **Tech**: change verbs are allowed, since engineers need to see the change. Flag a vague verb only
  when the title names neither an object nor a characteristic:
  `refactor · clean up · rework · improve · optimize · modernize · tech debt · upgrade`.
  "Refactor billing" is a smell; "Split billing module so payment changes deploy independently" is not.
- **Compliance**: `meet` and `comply with` are the expected verbs. Flag a title that names no
  obligation.

Done when every title has its smells listed, or `none`.

### 4. Title

One clear sentence; it beats a paragraph.

| Type | Title rule |
|---|---|
| Product | `[Persona] will be able to [core task], resulting in [measurable change].` |
| Tech | `<change> to <improve a characteristic or DORA metric>` |
| Compliance | `Meet <obligation> by <deadline>` |

An epic already at Outcome or Impact keeps its framing: acknowledge it and sharpen the measure.

### 5. Success measures

Every epic leaves with at least one measure. Each measure uses only facts found in the epic or given
by the user; every gap becomes a placeholder the team fills (`[add KPI]`, `[add baseline]`,
`[add target]`, `[add service]`, `[add fitness function]`, `[add obligation]`, `[add deadline]`,
`[add evidence]`).

- **Product**: a KPI with baseline → target.
- **Tech**: either
  - a **fitness function** with baseline → target, an automated or repeatable check the epic itself
    can pass (`p99 checkout latency < 300ms under 2k rps`, `zero import cycles between modules`); or
  - a **DORA metric** + the service or team it is measured on + the direction (`change lead time for
    orders-service: down`). DORA moves over weeks across many changes, so a target is optional.

  Pick from the [characteristics](#architectural-characteristics) and the
  [DORA metrics](#dora-metrics).
- **Compliance**: the **obligation** (regulation, contract clause or finding, cited), the
  **deadline**, and the **evidence** an auditor will check.

Done when every epic has a measure and every unknown in it is a placeholder.

### 6. Description

Rewrite the description into these sections, in order:

```markdown
## Goal
<the Outcome or Impact statement, one or two sentences>

## Scope
<the original delivery details, reorganised>

## Out of scope
<only when it draws a boundary worth stating>

## Success measures / DoD
- <measure>            (secondary measures of a mixed epic are marked "secondary")
```

The original's delivery content all survives into `Scope`: what will be built is legitimate
description material, only the title is outcome-first. Where the original contradicts the new framing
(its stated goal is "ship the dashboard"), keep the text and list the contradiction under `Changed`.
When nothing in the original supplies a `Goal`, write the placeholder `[add goal]` and put the
question _"what decision or capability does this unlock?"_ to the user in step 7.

Write `Out of scope` when the original has one, or when the rewrite leaves a boundary a reader could
miss: the unsplit half of a mixed epic, work the original mentions that the goal does not need. Omit
the section otherwise.

The success measures are the epic's definition of done: the epic is done when they are met, not when
the scope ships.

### 7. Verify

One round of verification for the whole input. Show every output block, then ask once:

- one epic: _accept / edit / reject_;
- several: _accept all / edit N / reject N_.

Name the open placeholders in the question: accepting leaves them open, deliberately. After an edit,
re-check only the edited text for smells, a missing measure, and new placeholders; report what you
find in one line, without a second round. An edited block counts as accepted; a rejected block is
dropped from what you return.

Done when the user has accepted, edited or rejected every block.

## Output block

One per item, in this shape, so a calling skill can read it:

```
### <original title>
Type:     product | tech | compliance - <rationale>
Smells:   <flagged words> | none
Title:    <rewritten title>
Description:
<rewritten description, sections as in step 6>
Changed:  <short list: level shift with its rationale, sections added, contradictions kept>
Open:     <unresolved placeholders> | none
```

The ladder level from step 2 is shown to the user under `Changed` (`Output -> Outcome: names a
feature, not a capability`). A skipped item has `Changed: skipped - <the "belongs in an epic?"
question>`, and its original title and description untouched.

## Architectural characteristics

From Richards & Ford, _Fundamentals of Software Architecture_. Each needs a fitness function or a
metric; the right-hand column shows the shape.

| Characteristic | Typical measure |
|---|---|
| Availability | uptime SLO per month, error-budget burn |
| Reliability / fault tolerance | error rate; survives loss of a node or zone |
| Recoverability | RTO and RPO, proven by a restore drill |
| Performance | p95 / p99 latency, throughput |
| Scalability | load at which the latency SLO still holds |
| Elasticity | time to scale out under a burst |
| Security | open critical vulnerabilities, time to patch |
| Deployability | service deploys independently; pipeline duration |
| Testability | fast-suite duration; share of changes covered by fast tests |
| Maintainability | dependency-rule violations (cycles, layer breaches), coupling |
| Observability | incidents detected by alerting before users report them |
| Cost efficiency | cost per request, tenant or environment |

A characteristic outside the list is fine: name it and its measure.

## DORA metrics

Five software-delivery metrics ([dora.dev](https://dora.dev/guides/dora-metrics/)), measured per
service or team. Fit them to epics that change how software is delivered (pipelines, testing, release
process); runtime and structural work fits the characteristics better.

| Group | Metric | Better is |
|---|---|---|
| Throughput | Change lead time: commit to production | shorter |
| Throughput | Deployment frequency | more often |
| Throughput | Failed deployment recovery time | shorter |
| Instability | Change fail rate: deployments needing immediate intervention | lower |
| Instability | Deployment rework rate: unplanned deployments caused by production incidents | lower |

## Example

**Before:** `Daily Budget Threshold Implementation` (no description)

```
### Daily Budget Threshold Implementation
Type:     product - media planners would notice; nothing external mandates it
Smells:   Implementation
Title:    Media planners will be able to set daily spend caps per flight, resulting in fewer budget overruns.
Description:
## Goal
Planners can cap daily spend per flight themselves instead of asking ops to intervene.

## Scope
[add scope]

## Success measures / DoD
- Flights exceeding their daily budget: [add baseline] -> [add target]
Changed:  Output -> Outcome: names a feature to implement, not a capability gained; added Goal and
          Success measures; no original description to carry into Scope
Open:     [add baseline], [add target], [add scope]
```

More worked cases, one per branch (tech, compliance, mixed, time-boxed, skipped issue), are in
[examples.md](examples.md): read it when an epic does not match the example above.
