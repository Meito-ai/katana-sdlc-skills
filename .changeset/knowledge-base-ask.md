---
"katana-sdlc-skills": patch
---

`build-up-spec` and `slice-spec` no longer guess where your knowledge base is from `README` and
`docs/`. When neither `AGENTS.md` / `CLAUDE.md` nor the `Knowledge base:` line in your
`## Katana skills` block says, they ask, and record the answer as that line. They also stop reading
label renames from `docs/agents/triage-labels.md`: if you rename `ready-for-agent` or `needs-info`,
say so in `AGENTS.md` / `CLAUDE.md` or your knowledge base.
