---
"katana-sdlc-skills": patch
---

`bug-intake` is a new user-invoked skill (`/bug-intake <report>`) that turns a bug report (free text,
a tracker item or a URL) into an issue one agent session can fix, in `slice-spec`'s issue template:

- **Checks first.** It searches the tracker for duplicates and the code for behaviour that already
  works, and lets you refine, link, mark as duplicate, close or carry on.
- **Reproduces.** It reports the bug as confirmed (with the code path), failed, or insufficient detail.
  A confirmed bug becomes a `ready-for-agent` issue: the reproduction, the fixed behaviour, the seam the
  failing test attaches at, and EARS criteria.
- **Asks the reporter.** Otherwise the issue is labelled `needs-info` and gets triage notes with
  specific questions; `/bug-intake <issue>` resumes from them once the reporter answers.

It applies only `ready-for-agent`, `needs-info` and your team's `bug` label, and writes nothing to the
repo but the `Backlog:` line. It needs `slice-spec` and `wsjf`; install it with `/setup-katana-skills`.
