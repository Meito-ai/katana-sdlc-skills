# Issue template

The shape of one issue: a slice from `slice-spec`, or a single issue from `build-up-spec`. Use the
repo's glossary vocabulary. Describe interfaces and behaviour, not locations: no file paths and no line
numbers, because the code moves before the issue is picked up. The exception is a snippet from a
prototype that pins a decision more precisely than prose can (a state machine, a schema, a type
shape). Inline it, trimmed to the parts that carry the decision, and note that it came from a
prototype.

```markdown
Epic: <epic link> · Spec: <PRD link> · Covers: R2, R5

## What to build
<the end-to-end behaviour this issue makes work, from the user's point of view; not a list of layers>

## Current behaviour
<what happens today: the status quo that makes each criterion below false>

## Key interfaces
- `<TypeName>`: <what changes, and why>
- `<functionName()>`: <what it returns today, and after>
- <config shape>

## Acceptance criteria
- [ ] AC1 (R2). When <trigger>, the <system> shall <response>.
- [ ] AC2 (R5). If <trigger>, then the <system> shall <response>.
- [ ] Repo DoD: <link>

## Out of scope
- <adjacent work a reader might assume is included>

## Sources
- <the document, URL, ADR or tracker item each fact came from>

## WSJF
<the wsjf block, or: Inherits <epic>'s priority.>
```

## Sections

- **First line**: only on an issue that belongs to an epic. `Covers` lists the epic's requirements
  that this issue implements. Without a PRD, keep only `Epic:`.
- **Acceptance criteria** follow [EARS](ears.md). Add the `Repo DoD` line only when the repo's
  knowledge base defines a definition of done; link to it rather than copying it.
- **Key interfaces**: leave the section out when the issue touches no type, signature or config.
- **Out of scope**: always present.
- **Sources**: only on an issue without an epic. A slice's facts come from its epic's PRD.
- **WSJF**: a story carries the `wsjf` block; a task carries the inherits line.

The epic, and any blocking issues, are set as the tracker's own parent and blocking relations, not
written into the body. The exception is text handed back for pasting when there is no tracker tool:
then add a `Blocked by: <titles>` line under the first line, or
`Blocked by: none (can start immediately)`.
