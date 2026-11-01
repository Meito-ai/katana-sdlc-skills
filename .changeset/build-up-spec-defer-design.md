---
"katana-sdlc-skills": minor
---

`build-up-spec` lets a product owner defer the design to the engineer who builds the item.

A design-deferred run (the user says design is for the engineer, or answers the one question asked of
a product owner) skips the Interfaces branch while grilling, and leaves `[add testing seams]`,
`[add implementation decisions]` (epic) and `[add key interfaces]` (issue) as placeholders. The item
is published `needs-design` instead of `ready-for-agent`, and the run offers once to create the label
when the team has none. An engineer later refines the item in place with `build-up-spec`: once every
design placeholder is filled, `needs-design` comes off and an issue gets `ready-for-agent`.

The label rules of step 8 now live in `scripts/labels.mjs`, which works out the labels to add, the
labels to remove and the ones the team lacks from the level and the text about to be published.

`slice-spec` reads the epic's labels first, and stops on a `needs-design` epic with
`/build-up-spec <epic id>` as the next step.

Refs MEI-194
