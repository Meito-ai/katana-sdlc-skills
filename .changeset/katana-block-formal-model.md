---
"katana-sdlc-skills": patch
---

`implement-issue` and `build-up-spec` now record and use three more lines of the `## Katana skills` block.

- `implement-issue` records `E2E:` and `Mutation:` beside `Checks:`, confirming them with you once. A repo with no such tool gets `none`.
- When a design involves concurrency, distributed state, a protocol or a state machine, both skills draft a formal model in the tool the `Formal model:` line names and check it before the gate. A passing check adds an acceptance criterion per invariant, covered by a property test; a counterexample is shown at the gate and the design revised before approval.
- With no `Formal model:` line, the design step asks for the tool at the gate and records it. Nothing to rerun: existing blocks keep working.
