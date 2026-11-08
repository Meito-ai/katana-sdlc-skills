# Linear adapter

Tool: the Linear MCP server (`https://mcp.linear.app/mcp`). Bodies are Markdown.

## Check

Call `whoami`. It returns the signed-in user and the workspace.

## Epics

Epic label: yes

An epic is an issue labelled `Epic`. Its slices are sub-issues (`parentId`), and its blockers are
native blocking relations. The PRD is a document attached to the epic.

## 1. List targets

**Native.** `list_teams`, then `list_projects` with `team`. Pass `cursor` while `hasNextPage`.

## 2. Fetch an item

**Native.** `get_issue` with `includeRelations: true` (blocked by, blocks, related, duplicate of) and
`fields` including `parentId`, `labels`, `status`, `documents`. Comments come from `list_comments`
with `issueId`: `get_issue` returns none. Children: `list_issues` with `parentId`.

## 3. Search

**Native, with fallback:** Linear has no "has sub-issues" filter, so epics are the issues labelled
`Epic`. `list_issues` with `query` (it searches title and description), `team` and `project`, or with
`label: Epic` for epics, `limit` up to 250 and `cursor` while `hasNextPage`. "Open" means a state type
other than completed, canceled or duplicate: filter on `statusType`.

## 4. Create an item

**Native.** `save_issue` without `id`: `team`, `project`, `title`, `description`, `labels`,
`parentId`, `relatedTo`, `blockedBy`, `duplicateOf`. Leave `state` unset, so the team's default
applies. Every relation is set in the one call.

## 5. Update an item

**Native.** `save_issue` with `id`: `title`; `description` to replace the body, or `patch` to change
part of it (each anchor must match the current body exactly once); `addLabels` and `removeLabels`
(never `labels`, which replaces the whole set); `relatedTo`, `blockedBy`, `parentId`.

## 6. Comment

**Native.** `save_comment` with `issueId` and `body`.

## 7. Labels

**Native.** List: `list_issue_labels` with `team`. Create: `save_issue_label` with `name`,
`description` and the team's id (leave the team out for a workspace label).

## 8. Epic PRD

**Native.** Attach: `save_document` with `title`, `content` and `issue: <epic id>`, then point the
card's `Spec:` line at the document's URL (an [update](../SKILL.md#5-update-an-item)). Read: `get_issue`
with `fields: ["documents"]`, then `get_document`. Patch: `save_document` with `id` and `patch`.

## 9. Close as duplicate

**Native.** `save_issue` with `id` and `duplicateOf: <original id>`: Linear moves it to its duplicate
state and links the original.

## 10. Frontier

**Native.** `list_issues` with `parentId: <epic>`; drop the completed, canceled and duplicate
children; then `get_issue` with `includeRelations: true` for each, and keep the children whose every
blocker is completed or canceled. Linear can filter on whether a blocker exists, not on its state, so
the state check is yours.

## 11. PR link

**Native.** With the workspace's GitHub or GitLab integration connected: `Closes <ID>` in a GitHub
PR's description (or title), or in a GitLab merge request's description. Merging closes the item on
GitHub, and on GitLab 15.6 or later (a self-managed instance must be reachable from Linear). A PR that
only contributes: `Refs <ID>`.
