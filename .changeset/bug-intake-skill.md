---
"katana-sdlc-skills": minor
---

Add the `bug-intake` skill: the bug counterpart of `build-up-spec`. It turns a bug report into an
agent-sized issue in `slice-spec`'s template after checking for duplicates and reproducing the bug, or
labels it `needs-info` and posts triage notes for the reporter. `build-up-spec` now points bugs to it,
and `setup-katana-skills` installs and wires it.
