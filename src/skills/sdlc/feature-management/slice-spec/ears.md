# EARS requirements

How to write requirements and acceptance criteria in **EARS** (Easy Approach to Requirements Syntax,
Alistair Mavin: <https://alistairmavin.com/ears/>). `slice-spec` writes every ticket's criteria this
way. `build-up-spec` uses the same rules for an epic's requirements and for an issue's criteria.

## Patterns

Every statement has the same parts: optional preconditions, an optional trigger, a named system, and
the system's response.

| Pattern | Template | Use for |
|---|---|---|
| Ubiquitous | The `<system>` shall `<response>`. | a property that always holds |
| State-driven | **While** `<precondition>`, the `<system>` shall `<response>`. | behaviour that holds during a state |
| Event-driven | **When** `<trigger>`, the `<system>` shall `<response>`. | a response to an event |
| Optional feature | **Where** `<feature is included>`, the `<system>` shall `<response>`. | behaviour that exists only in some configurations |
| Unwanted behaviour | **If** `<trigger>`, **then** the `<system>` shall `<response>`. | errors, failures, misuse |
| Complex | **While** `<precondition>`, **when** `<trigger>`, the `<system>` shall `<response>`. | combinations of the above |

## Rules

- **Named system.** `<system>` is a term from the repo's glossary or code: a service, module,
  pipeline, CLI or screen a reader can find. For tech work the system is often a service or a
  pipeline ("the orders-service", "the release pipeline").
- **One response per statement**, so that each statement can be verified on its own.
- **False today.** Each statement fails against the current behaviour, and passes visibly once the
  work is done. State the current behaviour next to it: the issue's `## Current behaviour`, or the
  PRD's `## Problem`. A statement that is already true checks nothing. Keep one only to guard against
  a regression, and mark it `(guard)`.
- **Every When gets an If.** For each event-driven statement, ask what should happen when the trigger
  fails, times out or arrives malformed. Write the answer as an unwanted-behaviour statement. Surfacing
  these error cases is most of what EARS is for.
- **Observable responses.** The response is behaviour a test or a user can observe: a status, an
  output, a message, a bound. Code structure belongs under `Key interfaces`. A vague response ("fast",
  "robust", "user-friendly") becomes a bound; an unknown bound becomes the placeholder `[add bound]`.
- **Obligations stay in success measures.** For compliance work the regulation, clause, deadline and
  evidence belong in the epic's success measures. EARS covers only the behaviour that meets them.

## IDs

- An epic's requirements are `R1`, `R2`, … in the PRD, and are **never renumbered**. A dropped
  requirement is struck through with its reason (`~~R4~~ dropped: <why>`). A new one takes the next
  free number.
- An issue's criteria are `AC1`, `AC2`, …, numbered within the issue. A criterion derived from an epic
  requirement cites it: `AC2 (R5)`.

## Examples

```markdown
- **R1.** When a planner saves a daily cap for a flight, the budget service shall reject spend above the cap for that day.
- **R2.** If the cap fails to reach the ad server, then the budget service shall pause the flight and notify the planner.
- **R3.** While a flight is paused by its cap, the planner dashboard shall show the pause and the cap that caused it.
- **R4.** The orders-service shall deploy without a release of the billing-service.
- **R5.** Where SSO is enforced for a workspace, the login page shall offer SSO sign-in only.
```

As acceptance criteria in an issue:

```markdown
- [ ] AC1 (R1). When a planner saves a daily cap for a flight, the budget service shall reject spend above the cap for that day.
- [ ] AC2 (R2). If the cap fails to reach the ad server, then the budget service shall pause the flight and notify the planner.
- [ ] AC3 (guard). The budget service shall keep accepting spend on flights with no cap.
```
