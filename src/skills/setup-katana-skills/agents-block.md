# Template: the `## Katana skills` block

Copied into `AGENTS.md`, and into `CLAUDE.md` unless it references `AGENTS.md`, by step 6 of
[SKILL.md](SKILL.md). It is the only file setup
writes besides `apm.yml`, so it carries the always-on rules and the few repo facts the skills defer to
the host repo for, and nothing the skills already say.

Keep the markers, the heading and the intro line; keep only the subsections of the chosen skills. Fill
every `{{...}}` (a `<...>` is literal text; keep it). Drop a line marked `[if ...]` when its condition
is false, and strip the marker when it is true.

In the bootstrap sentence, `{{copy-files}}` lists the files to copy, each followed by `when <condition>`
when the user gave one (e.g. `.claude/skills/` when the sibling's `apm.lock.yaml` matches).
`{{symlink-files}}` lists each link as `<link>` -> `<target>`, the target relative to the link's own
directory. Drop the copy or the symlink clause when its list is empty.

````markdown
<!-- katana-skills:start -->
## Katana skills

Installed with apm from `Meito-ai/katana-sdlc-skills`; `/setup-katana-skills` adds or removes them and
rewrites this block.

### Worktrees

This repo is worked in a bare-clone layout: one sibling worktree per branch. Each agent session stays
on the branch of the worktree it started in; a new branch is a new worktree, created with the
`bare-clone-workflow` skill. `git checkout -b` and `git switch` inside a worktree hijack a directory
another session may hold. Branch names contain no `/`, since each becomes a directory name.
Bootstrap a new worktree: copy {{copy-files}} from a sibling worktree, symlink {{symlink-files}}, run
`{{install-command}}`, then `{{verify-command}}`.
[if workspace file] At session start, confirm the current branch has a folder entry in
`../{{container}}.code-workspace`, and add it if missing.

### Branch shutdown

Retire a merged or abandoned branch with the `branch-shutdown` skill, run from the `{{default-branch}}`
worktree: it proves the work survives on `{{default-branch}}` before deleting anything.

### WSJF

Score and rank epics and issues with the `wsjf` skill. WSJF scope: {{wsjf-scope}}.

### Backlog items

[if build-up-spec] Shape new epics and issues with `/build-up-spec`.
[if slice-spec] Slice an epic into agent-sized issues with the `slice-spec` skill.
[if bug-intake] Turn a bug report into an agent-sized issue with `/bug-intake`.
[if knowledge base] Knowledge base: {{knowledge-base}}.
[if backlog] Backlog: {{backlog}}.

### Implementation

Implement an issue, or a trivial change described in text, with `/implement-issue`; or ask the agent to
pick an issue up.
[if knowledge base, and no Backlog items subsection] Knowledge base: {{knowledge-base}}.
[if checks] Checks: {{checks}}.

### PR descriptions

Write every PR description with the `visual-pr` skill, and refresh it after each push to a branch with
an open PR.
<!-- katana-skills:end -->
````
