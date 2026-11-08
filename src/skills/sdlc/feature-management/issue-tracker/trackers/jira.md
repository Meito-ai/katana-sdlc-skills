# Jira Cloud adapter

Tool: the Atlassian Rovo MCP server, v2 (`https://mcp.atlassian.com/v2/mcp`). Most tools take the
site's `cloudId`; tools outside the primary set are reached through `discover` and `execute`, and
`discover` gives their parameters. Bodies are Markdown, which the MCP server converts (the REST API
would need ADF). Jira Data Center and Server are out of reach.
Body limit: 32767 characters

## Check

Call `atlassianUserInfo` (it returns the signed-in user), then `getAccessibleAtlassianResources`, and
keep the site's `cloudId` for every later call.

## Epics

Epic label: no

An epic is a native `Epic` issue: the issue type marks it, so it carries no `Epic` label. Its slices
are its children through the `parent` field, and its blockers are `Blocks` links ("is blocked by" on
the blocked side). The PRD is a `# Spec` section in the epic's description. A target is a project
key.

## 1. List targets

**Native.** `listJiraProjects`.

## 2. Fetch an item

**Native, with fallback:** the PRD is the description's `# Spec` section. `getJiraIssue` returns
summary, description, status, labels, `parent`, and `issuelinks`, each with the linked issue's status.
Comments: `listJiraIssueComments`. Children: `searchJiraIssuesUsingJql` with `parent = <KEY>`.

## 3. Search

**Native.** `searchJiraIssuesUsingJql`, open meaning `statusCategory != Done`:

- key terms: `project = <KEY> AND statusCategory != Done AND text ~ "<terms>"`;
- epics: `project = <KEY> AND issuetype = Epic AND statusCategory != Done`;
- open issues: `project = <KEY> AND issuetype != Epic AND statusCategory != Done`.

## 4. Create an item

**Native.** `createJiraIssue` with `projectKey`, `issueType` (`Epic` for an epic; otherwise the
project's standard type, such as `Task`, or `Bug` for a bug), `summary`, `description`, `parent` (the
epic's key), and the labels in `additional_fields` as `{"labels": [...]}`. Relations take a second
call each, `createJiraIssueLink`: `Blocks` with the blocker as the outward issue, `Relates`, or
`Duplicate`. `listJiraIssueLinkTypes` gives the site's link type names.

## 5. Update an item

**Native, with fallback:** a description is only ever replaced whole, so fetch it, change it, and
write all of it back. `editJiraIssue` with the fields to change: `summary`, `description`, `labels`
(the whole set: read the current labels, then add or remove). Relations: `createJiraIssueLink`.

## 6. Comment

**Native.** `addOrEditJiraIssueComment`. Comments share the 32,767-character limit.

## 7. Labels

**Fallback.** Jira has no label tool in the MCP server and no way to create a label on its own: a label
exists once an issue carries it. List: the union of `labels` over the project's issues
(`searchJiraIssuesUsingJql` with `project = <KEY> AND labels is not EMPTY`). Create: apply the label to
the item being written; the preview says the label is new.

## 8. Epic PRD

**Fallback.** The PRD is a `# Spec` section in the epic's description, after the card, without the
card's `Spec:` line or the PRD's `Card:` line. Card and PRD together count against the body limit.
Read it from the description; attach and patch it by replacing the description (Update).

## 9. Close as duplicate

**Native.** `createJiraIssueLink` of type `Duplicate`, the duplicate as the outward issue, then
`transitionJiraIssue` to a status in the Done category. Whether the resolution reads "Duplicate"
depends on the site's workflow.

## 10. Frontier

**Native.** `searchJiraIssuesUsingJql` with `parent = <EPIC> AND statusCategory != Done`, asking for
`status` and `issuelinks`; keep the children with no inward "is blocked by" link to an issue whose
status category is not Done.

## 11. PR link

**Native, with fallback:** the issue key in the branch name and at the start of the PR title
(`<KEY>: <title>`) links a GitHub PR or a GitLab merge request, once the site has the GitHub for Jira
app or GitLab's Jira integration. Merging closes the item on neither code host by default, so the
item is closed by hand after the merge.
