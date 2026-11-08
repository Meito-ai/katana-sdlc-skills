---
"katana-sdlc-skills": patch
---

`setup-katana-skills` now asks which tracker the repo uses. It proposes one from your `origin`, your
connected MCP servers and the CLIs on your machine, runs that tracker's check before recording it
(showing the failing command if it fails), and asks the tier on GitLab. On a public repo it offers to
keep the `Tracker:`, `Backlog:` and `WSJF scope:` lines in a local file git ignores, such as
`CLAUDE.local.md`, so your committed `AGENTS.md` never names your tracker's teams or projects; the
skills then read and write those lines there, and stop to ask before writing one into a committed file.
