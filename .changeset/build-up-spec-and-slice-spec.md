---
"katana-sdlc-skills": minor
---

Publish `build-up-spec` and `slice-spec`, which together replace `to-spec` and `to-tickets` from
`mattpocock/skills`.

`build-up-spec` (user-invoked) shapes an idea, a raw backlog item or nothing at all into an epic or an
issue:
- It explores the repo and its knowledge base, and searches the tracker for duplicates.
- It enriches the input with sourced facts only; every gap becomes a placeholder.
- It grills you on the scope, then writes requirements in EARS, each one false today.
- It calls `outcome-framing` for epics, and `wsjf`.
- It publishes after one preview. An epic is a parent issue labelled `Epic`, with an attached PRD
  document on Linear (on GitHub the PRD goes in the issue body). An issue gets `ready-for-agent`.
- Existing items are refined in place.

`slice-spec` adapts `to-tickets`' tracer-bullet slicing (MIT): every slice lists the PRD
requirements it covers, and an uncovered requirement stops publishing. It writes EARS acceptance
criteria, each under the testing seam that verifies it, scores the slices that are stories with `wsjf` (tasks inherit), and publishes sub-issues
with native blocking links.

Also in this release:
- `wsjf` recognises issues labelled `Epic` as epics, and scores several targets in one round.
- `setup-katana-skills` installs the dependencies and asks for `Knowledge base` and `Backlog` lines.
- `validate-skills` rejects a skill `apm.yml` that declares this repo, because the transitive copy
  overwrites the local one.
