# Outcome Framing: worked examples

One per branch of [SKILL.md](SKILL.md). Each shows the input, then the output block. Numbers in a
rewrite come from the input; everything else is a placeholder.

## Tech: vague refactor

**Before:** `Refactor deploy pipeline`
> Every merge rebuilds and redeploys all 14 services, takes ~50 min. Split into per-service pipelines
> with path filters. Shared libs still trigger everything.

```
### Refactor deploy pipeline
Type:     tech - the team gains faster, isolated deploys; no user notices, nothing external requires it
Smells:   Refactor (no object or characteristic)
Title:    Split the monolithic deploy into per-service pipelines to cut change lead time
Description:
## Goal
A change to one service ships without rebuilding and redeploying the other 13.

## Scope
Per-service pipelines with path filters.

## Out of scope
Isolating shared-library changes: they still trigger every service.

## Success measures / DoD
- Fitness function: a change touching only orders-service rebuilds 0 other services (today: 13)
- Pipeline duration for a single-service change: ~50 min -> [add target]
- DORA change lead time, all services: down
Changed:  Activity -> Impact: names work to do, not what improves; added Goal and Success measures;
          the shared-library caveat moved to Out of scope
Open:     [add target]
```

## Tech: upgrade with an end-of-life date

**Before:** `Upgrade to Node 22`
> Node 18 is EOL, no more security patches. 6 services still on it.

```
### Upgrade to Node 22
Type:     tech - security improves; EOL only ends patches, nothing stops working or is forbidden
Smells:   upgrade (object named, no characteristic)
Title:    Upgrade the last 6 services to Node 22 to restore security patch coverage
Description:
## Goal
Every service runs on a runtime that still receives security patches.

## Scope
Move the 6 remaining Node 18 services to Node 22.

## Success measures / DoD
- Fitness function: services on an end-of-life runtime: 6 -> 0
- Open critical runtime vulnerabilities: [add baseline] -> 0
Changed:  Activity -> Impact: names the work, not the security gain; added Goal and Success measures
Open:     [add baseline]
```

Had a customer contract required supported runtimes, the type would be compliance and the title
`Meet <contract clause> by <date>`.

## Compliance

**Before:** `GDPR - implement data deletion`
> Audit finding F-12: erasure requests are handled by hand, some took 60+ days. Art. 17 requires
> "without undue delay", our DPA commits to 30 days. Finding due 2027-03-31.

```
### GDPR - implement data deletion
Type:     compliance - driven by an audit finding and a DPA commitment
Smells:   implement (no obligation in title)
Title:    Meet the 30-day GDPR erasure commitment (finding F-12) by 2027-03-31
Description:
## Goal
Every erasure request completes within the 30 days our DPA commits to, closing audit finding F-12.

## Scope
Automated data deletion replacing the manual handling of erasure requests.

## Success measures / DoD
- Obligation: GDPR Art. 17; DPA 30-day erasure clause; audit finding F-12
- Deadline: 2027-03-31
- Evidence: erasure log showing each request completed in <= 30 days, sampled by the auditor
Changed:  Output -> Impact: names the mechanism, not the obligation met; added Goal and Success measures
Open:     none
```

## Mixed: product primary, tech secondary

**Before:** `Rebuild checkout on the new platform`
> Checkout p95 is 3.1s. Moving it onto the new platform gives the payments team its own deploys.

```
### Rebuild checkout on the new platform
Type:     product - shoppers feel the latency; the team's independent deploys are secondary
Smells:   Rebuild
Title:    Shoppers will be able to complete checkout without waiting, resulting in a faster checkout p95 than today's 3.1s.
Description:
## Goal
Checkout responds fast enough that shoppers do not abandon it while waiting.

## Scope
Move checkout onto the new platform, giving the payments team independent deploys.

## Success measures / DoD
- Checkout p95 latency: 3.1s -> [add target]
- Secondary (tech): DORA deployment frequency for the payments team: up
Changed:  Output -> Outcome: names a rebuild, not what shoppers gain; added Goal and Success
          measures; tech measure kept as secondary
Open:     [add target]
```

No split suggested: the latency gain and the independent deploys ship in the same move.

## Time-boxed container

**Before:** `FY27Q1 Platform work`

```
### FY27Q1 Platform work
Type:     tech - platform work only the team notices
Smells:   none
Title:    FY27Q1 Platform work
Description:
<original, untouched>
Changed:  skipped - Activity, a quarter-long container whatever it holds. Which outcomes does this
          quarter's work serve? Each one is its own epic.
Open:     none
```

## Skipped: an issue, not an epic

**Before:** `Add retry to payment webhook handler`

```
### Add retry to payment webhook handler
Type:     tech
Smells:   none (issues are not reframed)
Title:    Add retry to payment webhook handler
Description:
<original, untouched>
Changed:  skipped - Activity, a task-sized issue. Does this belong in an epic, and which one? (e.g.
          one about payment reliability)
Open:     none
```
