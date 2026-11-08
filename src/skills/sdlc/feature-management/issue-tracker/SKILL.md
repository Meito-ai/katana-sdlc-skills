---
name: issue-tracker
description: "The tracker contract the katana SDLC skills read and write backlog items through: eleven operations (list targets, fetch, search, create, update, comment, labels, epic PRD, close as duplicate, frontier, PR link), each with a text fallback, performed by an adapter for Linear, GitHub, Jira Cloud, GitLab, or one written for the host repo. Use when a katana skill reads or writes a tracker item, records a Tracker, Backlog or WSJF scope line, or when asked which tracker a repo uses."
---

# Issue tracker

The katana SDLC skills (`build-up-spec`, `slice-spec`, `bug-intake`, `wsjf`, `implement-issue`) never
name a tracker. Every tracker read and write they make is an **operation** of this contract, and an
**adapter** performs it on the repo's tracker: a shipped one in [`trackers/`](trackers), or a file the
host repo keeps. Where the tracker cannot do an operation natively, the adapter applies the operation's
**text fallback**, and the calling skill's preview shows it exactly as it will be written.

## Resolve the adapter

Before a run's first operation:

1. **Read the `Tracker:` line**, under `### Issue tracker` in the `## Katana skills` block, or in the
   local file the block names (see [Tracker lines](#tracker-lines)):
   - `linear`, `github`, `jira`: the shipped adapter `trackers/<name>.md` in this skill's directory.
   - `gitlab (free)` or `gitlab (premium)`: `trackers/gitlab.md`, on that tier.
   - A path: the host repo's adapter file at that path, from the repo root.
   - Anything else, or a path with no file: stop before any write, and name the line.
2. **No `Tracker:` line**: infer the tracker from the `Backlog:` or `WSJF scope:` line. A Linear team
   or project means `linear`; a GitHub repo (`owner/name`) means `github`. Record the inferred line.
3. **Nothing to infer**: ask the user, listing every shipped tracker and "other", and record the
   answer. "Other" needs an adapter first: stop and name `/setup-katana-skills`, which writes one.
4. **Read the adapter** in full, then run its `## Check`. A failing check means no tracker tool is
   reachable: every operation of the run becomes text (see [Unreachable](#unreachable)), and the
   calling skill says which check failed.

Done when the adapter is read and its check has passed or failed.

## Tracker lines

The **tracker lines** are `Tracker:`, `Backlog:` and `WSJF scope:`. A skill records one when the user
chooses a value or changes a default:

- **A local file.** When the block reads `Tracker lines: local, see <file>`, read and write every
  tracker line in that file's own `## Katana skills` block, under the same subsections, and none in
  the committed block.
- **The block.** Otherwise they go in the `## Katana skills` block of `AGENTS.md`, and of `CLAUDE.md`
  when it exists and never references `AGENTS.md`, creating the block (markers, heading and
  subsection) where it is missing. `Tracker:` goes under `### Issue tracker`, `Backlog:` under
  `### Backlog items`, `WSJF scope:` under `### WSJF`.
- **A public repo.** Before writing a tracker line into a committed file, ask the code host whether the
  repo is public (`gh repo view --json visibility`, `glab repo view`). When it is, or the code host
  can't say, stop and ask where to write it: a local file that agents load and git ignores (such as
  `CLAUDE.local.md`, or a bare-clone container's `CLAUDE.md`), or the committed file after all. For a
  local file, write the lines there and `Tracker lines: local, see <file>` under `### Issue tracker`
  in the block.

Leave the change uncommitted.

## Operations

Each operation names its inputs and outputs, and the text fallback an adapter applies where the
tracker lacks it. An item's **id** is the tracker's own (`ENG-12`, `#42`, `PROJ-7`); a **target** is
a team, project or repo, written the way the `Backlog:` line writes it.

### 1. List targets

- **In**: nothing, or a parent target. **Out**: the targets the user can file into.
- **Fallback**: ask the user to name one.

### 2. Fetch an item

- **In**: an id or a URL. **Out**: title, body, state, labels, comments, parent, children, relations
  (blocked by, blocks, related, duplicate of), and an epic's PRD.
- **Fallback**: the parent from a `Part of <id>` line, blockers from a `Blocked by: <id>, …` line,
  related items from a `Related: <id>, …` line, and the PRD from the body's `# Spec` section.

### 3. Search

- **In**: one of: key terms in a target; the epics in a target; the open items at one level (epic or
  issue) in a target. **Out**: the open items found, each with its id, title, labels and body.
- **Fallback**: epics are the items labelled `Epic`.

### 4. Create an item

- **In**: title, body, target, labels, parent, related, blocked by, duplicate of. **Out**: the id and
  link. The state is left at the tracker's default.
- **Fallback**: a relation the tracker lacks becomes its line (`Part of <id>`, `Blocked by: <id>, …`,
  `Related: <id>, …`) at the top of the body, after the `Epic:` or `Spec:` line when there is one.
  Duplicate of: create, then [close as duplicate](#9-close-as-duplicate).

### 5. Update an item

- **In**: an id, and any of: title, body, labels to add, labels to remove, relations to add.
  Labels are only ever added or removed one by one; the item's other labels stay.
- **Fallback**: where the tracker can only replace a body whole, fetch the body, change it, and write
  all of it back: the WSJF write-back included. Relations as in [Create](#4-create-an-item).

### 6. Comment

- **In**: an id and a body. **Out**: the comment's link.
- **Fallback**: none needed; every tracker comments.

### 7. Labels

- **In**: a target. **Out**: its labels. **Create**: one label, only on the user's yes.
- **Fallback**: where a label comes into existence by being applied, creating it means applying it to
  the item being written, and the preview says so.

### 8. Epic PRD

- **Read, attach, patch** the PRD of an epic.
- **Fallback**: the PRD is a `# Spec` section in the epic's body, after the card. The card's `Spec:`
  line and the PRD's `Card:` line are dropped, since both share one body. Patching it is an
  [update](#5-update-an-item) of that section.

### 9. Close as duplicate

- **In**: the duplicate's id and the original's id.
- **Fallback**: a `Duplicate of <id>` comment, then close the item.

### 10. Frontier

- **In**: an epic. **Out**: its **frontier**: the open children with no open blocker.
- **Fallback**: children from `Part of <id>` lines, blockers from `Blocked by:` lines.

### 11. PR link

- **In**: an id and the code host (GitHub or GitLab). **Out**: the text a PR (or merge request)
  description carries to link the item, and whether merging it closes the item on that code host.
- **Fallback**: where the code host cannot close the item, the caller ends the description with
  `Close <id> on merge`.

## Body limit

An adapter may declare `Body limit: <n> characters`. Before a preview, the calling skill counts each
body it is about to write (an epic's card and PRD together, where they share one body) and warns in
the preview when one exceeds the limit.

## Unreachable

While no tracker tool is reachable (the check failed, or there is no adapter), the calling skill hands
the item back as text to paste: every relation as its fallback line, and an epic's PRD as its
`# Spec` section.

## Adapter file

One Markdown file per tracker, the same shape for a shipped adapter and a host repo's:

```markdown
# <Tracker> adapter

Tool: <the MCP server or CLI, with its minimum version>. Bodies are <format>.
Body limit: <n> characters

## Check
<the command or tool call that proves the tool is reachable and signed in, and what success looks like>

## Epics
Epic label: <yes|no>
<how an epic, its children, its blockers and its PRD are represented>

## 1. List targets
**Native.** <the calls>
…
## 11. PR link
**Native, with fallback:** <the calls; then what falls back, and how>
```

- `Body limit:` is optional.
- `Epic label: no` when the tracker marks an epic by its type, so `build-up-spec` leaves the `Epic`
  label off it.
- Each of the eleven operation headings, numbered as above, opens with `**Native.**`,
  `**Fallback.**` or `**Native, with fallback:**`.

A new shipped tracker is one adapter file here and one row in `setup-katana-skills`'s tracker table.
