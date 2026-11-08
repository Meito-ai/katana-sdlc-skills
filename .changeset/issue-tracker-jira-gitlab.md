---
"katana-sdlc-skills": minor
---

`issue-tracker` is a new skill that lets the SDLC skills run on Jira Cloud and GitLab as well as Linear
and GitHub. It defines one contract of eleven operations (fetch, search, create, update, comment,
labels, the epic's PRD, close as duplicate, the frontier of unblocked work, and the PR link) and ships
an adapter per tracker:

- **Jira Cloud**, through the Atlassian Rovo MCP server: an epic is a native Epic issue with its
  slices as children, and blockers are "is blocked by" links.
- **GitLab Free and Premium**, through `glab`: Premium uses native epics and blocking links; Free
  marks an epic with an `Epic` label and writes blockers as `Blocked by:` lines.
- **Any other tracker**: `/setup-katana-skills` writes an adapter for it from your description.

Where a tracker lacks an operation, the adapter falls back to text (`Blocked by:` and `Part of` lines,
a `# Spec` section for the PRD), and the preview shows it before anything is written. A preview also
warns when a body exceeds the tracker's limit, such as Jira's 32,767 characters.
