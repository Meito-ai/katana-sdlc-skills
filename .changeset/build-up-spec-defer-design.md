---
"katana-sdlc-skills": patch
---

`build-up-spec` lets a product owner leave the design to the engineer who builds the item. Say that
design is for the engineer (or answer the one question the skill asks a product owner), and the run:

- **Skips the design.** Grilling leaves out the Interfaces branch, and the item keeps
  `[add testing seams]`, `[add implementation decisions]` (epic) and `[add key interfaces]` (issue) as
  placeholders.
- **Holds the item back from agents.** It is published `needs-design` instead of `ready-for-agent`.
  When your team has no `needs-design` label, the skill offers once to create it.
- **Hands over to the engineer.** The run ends with `/build-up-spec <item>`. The engineer refines the
  item in place, fills in the design, and `needs-design` comes off; an issue then gets
  `ready-for-agent`.

A run where you don't defer the design labels items exactly as before.
