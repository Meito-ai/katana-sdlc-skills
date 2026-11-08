---
"katana-sdlc-skills": patch
---

`build-up-spec`, `bug-intake` and `slice-spec` no longer ask you to accept the WSJF score separately before their own preview. `wsjf` hands the score back unverified to a skill that is still drafting the item, and that skill's preview (its draft confirmation, for `bug-intake`) shows each input with its reason and the rank, where you accept or edit it with the rest. Running `wsjf` yourself is unchanged: it still asks before writing to the tracker.
