# Epic templates

An epic is published as two parts. The **card** is the epic issue's description: what people scan and
what `wsjf` scores. The **PRD** is the spec that agents slice and build from. Each fact lives in
**one** of the two, and each part links to the other. Neither repeats what the other says.

| Tracker | Card | PRD |
|---|---|---|
| Linear | the epic issue's description | a document attached to that issue |
| GitHub | the epic issue's body | the same body, after the card, under a `# Spec` heading |
| No tracker tool | text to paste | text to paste |

Both use the repo's glossary vocabulary, and contain no file paths and no code snippets. The exception
is a snippet from a prototype that pins a decision more precisely than prose (a state machine, a
schema, a type shape): inline it, trimmed to the parts that carry the decision, and note that it came
from a prototype.

## Card

```markdown
Spec: [<epic title>](<PRD link>). Read it before slicing or implementing.

## Goal
<the Outcome or Impact statement: who gains what>

## Scope
- <one line per capability, citing its requirements: "Planners cap daily spend per flight (R1-R3)">

## Out of scope
- <boundaries a reader could miss, starting with what the user turned down while grilling>

## Success measures / DoD
- <measure, with baseline and target>

## WSJF
<the wsjf block>
```

The draft handed to `outcome-framing` (step 6) is the card without its first line or its WSJF block.
What comes back (a title and the four sections) is assembled into the card: the `Spec:` line, then
the description `outcome-framing` returned, then the `## WSJF` block. On GitHub the card's `Spec:`
line and the PRD's `Card:` line are both dropped, since the two parts share one body. `wsjf` rewrites its section only up to the next
heading, so the `# Spec` heading keeps the PRD out of reach.

## PRD

```markdown
Card: <epic issue link>

## Problem
<the problem from the user's point of view, and the current behaviour that the requirements change>

## Requirements
- **R1.** When <trigger>, the <system> shall <response>.
- **R2.** If <trigger>, then the <system> shall <response>.

## Implementation decisions
- <modules built or changed, their interfaces, schema changes, API contracts, architectural decisions>

## Testing seams
- <seam>: <what is tested there>; prior art: <similar tests in the codebase>

## Further notes
<anything else a builder needs; drop the section when there is nothing>

## Sources
- <the document, URL, ADR or tracker item each fact came from>
```

Requirements follow `slice-spec`'s [EARS rules](../slice-spec/ears.md), IDs included. Goal, scope
boundaries and success measures stay on the card.

An existing PRD changes in place. An amendment from a single issue (step 5) appends the next free
`R` number to `## Requirements`. Nothing is renumbered, and nothing is deleted: a requirement that is
dropped stays struck through, with its reason.
