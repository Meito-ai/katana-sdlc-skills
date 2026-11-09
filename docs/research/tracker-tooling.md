# Tracker tooling for the `issue-tracker` contract

This report maps the 11 operations of the `issue-tracker` skill's contract onto the agent tooling of
four trackers: Linear, GitHub Issues, Jira Cloud, and GitLab (Free and Premium). For every operation
and tracker it names the MCP tool or CLI command, the REST/GraphQL fallback, what is native and what
needs the contract's text fallback, and the tier, format and size limits that apply. Adapter
implementers can work from it without re-deriving the facts.

**Checked: 2026-11-08.** Every row was checked on that date unless it says otherwise.

## How facts were verified

| Source kind | What was used |
|---|---|
| Local CLI `--help` | `gh` 2.96.0 (installed locally): `gh issue create/edit/close/view/list/comment`, `gh label list/create`, `gh repo list`, `gh search issues`, `gh auth status`. The latest release is 2.103.3; the 2.94.0 and 2.88.0 release notes were read for when the flags arrived. `glab` and `acli` are **not** installed locally. |
| CLI source / reference | `glab` docs generated from source (`gitlab-org/cli`, `docs/source/`, `main`, latest release v1.128.0 of 2026-11-03). `acli` reference pages on developer.atlassian.com (pages say "Last updated Oct 3, 2024"; latest release v1.3.15-stable, 2026-03-25, per its changelog). |
| MCP tool lists | GitHub MCP server README and `docs/insiders-features.md` (`github/github-mcp-server`, release v2.1.0, 2026-11-03). Linear MCP: the tool input schemas the server itself publishes (loaded, not called), plus linear.app/docs/mcp. Atlassian Rovo MCP: the "Supported tools" page (last updated 2026-11-02), changelog, and Atlassian's own v2 skills in `atlassian/atlassian-mcp-server`. GitLab MCP: `doc/user/model_context_protocol/mcp_server_tools.md` from `gitlab-org/gitlab` `master`. |
| Schemas | Linear GraphQL SDL (`linear/linear`, `packages/sdk/src/schema.graphql`). GitHub GraphQL introspection run through `gh api graphql`. Jira REST v3 OpenAPI (`swagger-v3.v3.json`). GitLab GraphQL reference (`doc/api/graphql/reference/*.md`). |
| Product docs | docs.github.com, github.blog/changelog, linear.app/docs, support.atlassian.com, docs.gitlab.com (Markdown source in `gitlab-org/gitlab`). |

No issue, label, or document was created on any tracker during this research. Community posts are
marked as such wherever they appear and are never the only source for a fact.

## Summary matrix

Legend: **native** means the tool does it in one call or a short sequence of calls. **fallback** means
the contract's text convention or a client-side step is needed. **tier** means it depends on the plan.

| # | Operation | Linear | GitHub Issues | Jira Cloud | GitLab Free | GitLab Premium+ |
|---|---|---|---|---|---|---|
| 1 | List targets | native | native | native | native | native |
| 2 | Fetch: title, body, labels, comments | native | native | native | native | native |
| 2 | Fetch: parent and children | native | native | native | native for Issue→Task only; fallback: `Part of` for issue→issue | native (Epic→Issue→Task) |
| 2 | Fetch: related / blocks / duplicate | native | blocks: native; related: fallback (timeline mentions or body text); duplicate: native (`duplicateOf`) | native (`issuelinks`) | relates_to: native; blocks: fallback `Blocked by:` | native |
| 2 | Fetch: attached PRD | native (issue documents) | fallback: `# Spec` in body | fallback: description, or remote link to Confluence | fallback: `# Spec` in body | fallback: `# Spec` in epic description |
| 3 | Search open items by terms | native | native | native (JQL) | native | native |
| 3 | Search epics | fallback: label or convention (no "has children" filter) | native for org issue types (`type:Epic`); fallback: label for user repos | native (`issuetype = Epic`) | fallback: label | native (`--type epic`) |
| 4 | Create with labels and parent | native | native (gh ≥ 2.94) | native | labels: native; parent: Issue→Task only | native |
| 4 | Create with related | native | fallback: `Related:` text | two calls (create, then link) | native (`relates_to`) | native |
| 4 | Create with blocked-by | native | native (gh ≥ 2.94) | two calls | tier: fallback `Blocked by:` | native |
| 4 | Create with duplicate-of | native | two calls (create, close as duplicate) | two calls | native via `/duplicate` | native via `/duplicate` |
| 5 | Update title/body (full replace) | native | native | native | native | native |
| 5 | Update body (partial patch) | native (`patch`) | fallback: read-modify-write | fallback: read-modify-write (ADF) | fallback: read-modify-write | fallback: read-modify-write |
| 5 | Add/remove labels | native | native | native (acli/REST); MCP: unverified | native | native |
| 5 | Add relations | native | blocks/parent: native; related: fallback | native | relates_to: native; blocks: tier | native |
| 6 | Comment | native | native | native | native | native |
| 7 | Labels: list | native | native | native (REST, acli search); MCP: no tool | native | native |
| 7 | Labels: create | native | native | implicit on first use; no create endpoint | glab/REST: native; MCP: no tool | glab/REST: native; MCP: no tool |
| 8 | Epic PRD: read/attach/patch | native (document, `patch`) | fallback: `# Spec` in body, 65,536 chars | fallback: description (32,767, ADF) or Confluence + remote link | fallback: `# Spec` in body, ~1M chars | fallback: `# Spec` in epic description, ~1M chars |
| 9 | Close as duplicate | native | native (gh ≥ 2.88, MCP, GraphQL) | two calls; resolution depends on workflow | native via `/duplicate` (glab/REST); MCP cannot | same as Free |
| 10 | Frontier | native data, client filter | native data, client filter (one GraphQL query) | native data, client filter (one JQL query) | fallback: parse `Blocked by:` lines | native data, client filter |
| 11 | PR link text | magic words (GitHub PR title/body, GitLab MR body) | closing keywords; GitHub issues only | key in PR title/branch links it; closing needs smart commits or GitLab's Jira integration | `Closes #n` in MR body or commit | same as Free |

---

## Linear

| Aspect | Finding | Source |
|---|---|---|
| Epic model | A **parent issue** with sub-issues (`parentId`). Sub-issues inherit team, priority and project, not labels. Parent auto-close and sub-issue auto-close are optional per-team settings. A Linear **project** is the other common "epic" container; the contract's parent-issue model maps onto sub-issues. | linear.app/docs/parent-and-sub-issues |
| Primary tool | Official Linear MCP server, `https://mcp.linear.app/mcp` (Streamable HTTP). `/mcp/readonly` is read-only. `/sse` is deprecated. There is no official Linear CLI. | linear.app/docs/mcp |
| Auth / health check | MCP tool `whoami` returns the user, the workspace, and how the connection reaches Linear. Auth is OAuth 2.1 (dynamic client registration) or `Authorization: Bearer <API key>`. | tool schema; linear.app/docs/mcp |
| Body format | Markdown for issue `description`, comment `body`, and document `content`. Collapsible sections use `+++ Title` … `+++`. | tool schemas |
| Size limits | Not documented by Linear (see Unverified). | — |
| Plan limits | The MCP docs restrict only Claude auto-connect (Business/Enterprise). No plan gate is documented for any tool used here. | linear.app/docs/mcp |

| # | Operation | MCP tool and parameters | Notes | Source |
|---|---|---|---|---|
| 1 | List targets | `list_teams` (`query`, `parentTeam`, `ancestorTeam`); `list_projects` (`team`, `query`, `state`; max 50 per page) | Paginated: pass `cursor` while `hasNextPage`. | tool schemas |
| 2 | Fetch | `get_issue` (`id`, `includeRelations: true`, `fields: [..., "parentId", "relations", "documents", "attachments", "labels"]`); `list_comments` (`issueId`); children via `list_issues` (`parentId`) | `get_issue` does **not** return comments; call `list_comments`, which also returns inline description comments (`quotedText`). Relations cover blocking, related and duplicate. | tool schemas; server instructions |
| 3 | Search | `list_issues` (`query` searches title and description; plus `team`, `project`, `state`, `label`, `parentId`, `limit` ≤ 250) | `state` takes one state type, name or ID. For "all open", query per state type or filter client-side. There is no "has sub-issues" filter, so epics need a label or naming convention. | tool schema |
| 4 | Create | `save_issue` without `id`: `team` (required), `title`, `description`, `labels` / `addLabels`, `parentId`, `relatedTo[]`, `blockedBy[]`, `blocks[]`, `duplicateOf`, `project`, `links[]` | Every relation is set in one call. Relation arrays are append-only. Call `list_issues` first to avoid duplicates (server guidance). | tool schema |
| 5 | Update | `save_issue` with `id`: `title`; `description` (full replace) **or** `patch[]` (ops `replace`, `insert_before`, `insert_after`, `prepend`, `append`, `replace_range`; atomic; ≤ 50 ops; each anchor must match once); `addLabels` / `removeLabels` (`labels` replaces the whole set); `relatedTo`, `blockedBy`, `removeBlockedBy`, `removeRelatedTo` | Partial patch is native. | tool schema |
| 6 | Comment | `save_comment` (`issueId`, `body`; `parentId` for replies; `id` to edit) | Markdown. | tool schema |
| 7 | Labels | List: `list_issue_labels` (`team`, `name`). Create: `save_issue_label` (`name`, `color`, `description`, `teamId` (omit for a workspace label), `parent` for groups) | `create_issue_label` still exists but is marked deprecated in favour of `save_issue_label`. Labels are team- or workspace-scoped, and retired labels carry `retiredAt`. | tool schemas |
| 8 | Epic PRD | Attach: `save_document` (`title`, `content`, `issue: <epic>`). Read: `get_issue` with `fields: ["documents"]`, then `get_document` (`id`); or `list_documents`. Patch: `save_document` (`id`, `patch[]`) | Documents are long-form text attachable to projects, initiatives, teams, issues or cycles, with version history. The SDL confirms `Document.issue` and `Issue.documents`. | linear.app/docs/documents; tool schemas; Linear SDL |
| 9 | Close as duplicate | `save_issue` (`id`, `duplicateOf: <original>`) | The workflow state type filter includes `"duplicate"` (SDL). Linear's changelog says duplicate issues use a dedicated status type and every duplicate links its original. | Linear SDL (`WorkflowStateFilter.type`); linear.app/changelog |
| 10 | Frontier | `list_issues` (`parentId: <epic>`), then client-side drop of completed/canceled/duplicate children, then `get_issue` (`includeRelations: true`) per child and keep children whose blockers are all closed | GraphQL filters `hasBlockedByRelations` only test whether a relation **exists** (`RelationExistsComparator {eq, neq}`), not whether the blocker is open, so the blocker state check is client-side. | Linear SDL |
| 11 | PR link text | Closing: `close(s/d/ing)`, `fix(es/ed/ing)`, `resolve(s/d/ing)`, `complete(s/d/ing)`, `implement(s/ed/ing)` + issue ID. Non-closing: `ref`, `refs`, `references`, `part of`, `contributes to`, `toward(s)`. Link only: `relates to`, `related to`. | **GitHub**: PR title or description, commit messages, or issue ID in the branch name. Not PR comments. Several IDs after one word work. **GitLab**: magic word + ID in the **MR description**, or the ID in the branch name. Not comments or commit messages. Needs GitLab 15.6+ and, for self-managed, a publicly reachable instance. | linear.app/docs/github; linear.app/docs/gitlab |

REST/GraphQL fallback: Linear's GraphQL API (`https://api.linear.app/graphql`, SDL linked above).
`IssueRelationType` = `blocks | duplicate | related | similar`.

---

## GitHub Issues

| Aspect | Finding | Source |
|---|---|---|
| Epic model | A parent issue with **sub-issues**: up to 100 per parent, up to 8 nesting levels. Organizations may also define **issue types** (defaults task, bug, feature; up to 25), so an `Epic` type is possible in org repos only. | docs.github.com: adding sub-issues; managing issue types |
| Primary tool | `gh` CLI **≥ 2.94.0** (2026-06-10) for sub-issues, blocked-by/blocking and issue types; **≥ 2.88.0** for `gh issue close --duplicate-of`. On GHES, sub-issues and types need 3.17+ and relationships need 3.19+. | gh 2.94.0 and 2.88.0 release notes |
| Secondary tool | Official GitHub MCP server (v2.1.0). The default toolsets are `context, repos, issues, pull_requests, users`. `labels` is **not** default. Dependency tools are behind a feature flag. | github-mcp-server README, insiders-features.md |
| Auth / health check | `gh auth status` exits 1 if any account has auth problems (`--json hosts` always exits 0). MCP: `get_me`. | `gh auth status --help`; MCP README |
| Body format | GitHub Flavored Markdown. | — |
| Size limits | Issue body ≤ **65,536 characters**: the API error `Body is too long (maximum is 65536 characters)` is quoted in GitHub's own `github/issue-metrics` docs, but docs.github.com does not state it. Dependencies: up to 50 issues per relationship type. | github/issue-metrics `docs/dealing-with-large-issue-metrics.md`; github.blog changelog 2025-08-21 |

| # | Operation | CLI (gh) | MCP | REST/GraphQL fallback | Notes | Source |
|---|---|---|---|---|---|---|
| 1 | List targets | `gh repo list <owner> --json nameWithOwner,hasIssuesEnabled --no-archived` | `search_repositories` | `GET /orgs/{org}/repos` | | `gh repo list --help`; MCP README |
| 2 | Fetch | `gh issue view <n> --json title,body,labels,comments,parent,subIssues,blockedBy,blocking,stateReason,closedByPullRequestsReferences` | `issue_read` with `method`: `get`, `get_comments`, `get_sub_issues`, `get_parent`, `get_labels` | GraphQL `Issue.{parent, subIssues, blockedBy, blocking, duplicateOf}` | There is no native "related" relation: use `#n` mentions (timeline cross-references) or a `Related:` line. MCP blocked-by reads need `issue_dependency_read` (feature-gated). | `gh issue view --help`; GraphQL introspection; MCP docs |
| 3 | Search | `gh issue list --search "<terms> in:title,body" --state open --label <l>`; `gh search issues <terms> --repo o/r --state open --match title,body`; epics: `--search 'type:"Epic"'` (org types) or `--label epic` | `search_issues` (`query`, `owner`, `repo`); `list_issues` (`state`, `labels`) | `GET /search/issues` | Advanced search supports `AND`/`OR` and parentheses up to 5 levels. `is:blocked`, `is:blocking`, `blocked-by:`, `blocking:` exist per the changelog. | docs.github.com: filtering and searching; github.blog changelog 2025-08-21 |
| 4 | Create | `gh issue create -t <title> -F body.md -l a,b --parent <n\|url> --blocked-by <n,...> --blocking <n,...> [--type Epic]` | `issue_write` `method: create` (`title`, `body`, `labels`, `parent_issue_number`, `type`) | REST `POST /repos/{o}/{r}/issues`, then sub-issue and dependency endpoints | Related: text line. Duplicate-of: create, then op 9. MCP has no blocked-by on create. | `gh issue create --help`; MCP README |
| 5 | Update | `gh issue edit <n> -t <title> -F body.md --add-label a --remove-label b --parent <n> --add-sub-issue <n,...> --add-blocked-by <n> --add-blocking <n> --remove-blocked-by <n>` | `issue_write` `method: update` (`title`, `body`, `labels`); `sub_issue_write` (`add`/`remove`/`reprioritize`, takes `sub_issue_id` = issue **ID**, not number) | `PATCH /repos/{o}/{r}/issues/{n}`; `POST .../issues/{n}/dependencies/blocked_by` (body `issue_id`); `POST .../issues/{n}/sub_issues` (`sub_issue_id`, `replace_parent`) | Body is full replace only, so partial patch is read-modify-write. MCP `labels` on update is a full set; prefer `gh --add-label`. | `gh issue edit --help`; docs.github.com REST sub-issues and issue-dependencies |
| 6 | Comment | `gh issue comment <n> -F body.md` (`--edit-last` to edit) | `add_issue_comment`; `update_issue_comment` | `POST .../issues/{n}/comments` | | `gh issue comment --help`; MCP README |
| 7 | Labels | `gh label list --json name,description --limit 200`; `gh label create <name> -d <desc> -c <hex> [--force]` | `list_label`, `label_write` (`create`/`update`/`delete`), both in the non-default `labels` toolset; `get_label` | `GET/POST /repos/{o}/{r}/labels`; GraphQL `createLabel` | | `gh label --help`; MCP README |
| 8 | Epic PRD | read `gh issue view <n> --json body`; write `gh issue edit <n> -F body.md` | `issue_read get` / `issue_write update` | — | There is no document entity: keep the spec in a `# Spec` section of the epic body (65,536 cap), or in a repo file the body links to. | — |
| 9 | Close as duplicate | `gh issue close <n> --duplicate-of <m>` (or `-r duplicate`; `-c` adds a comment) | `issue_write` `method: update`, `state: closed`, `state_reason: duplicate`, `duplicate_of: <m>` | GraphQL `closeIssue(issueId, stateReason: DUPLICATE, duplicateIssueId)` | A `Duplicate of #m` comment also marks a duplicate (commenter needs write access) but does not close the issue. | `gh issue close --help`; GraphQL introspection; docs.github.com: marking duplicates |
| 10 | Frontier | `gh api graphql` with one query: `issue(number:N){subIssues(first:100){nodes{number state blockedBy(first:50){nodes{number state}}}}}`, then keep open children with no open blocker | — (dependency reads are feature-gated) | same | Fields verified by introspection. | GraphQL introspection |
| 11 | PR link text | `close(s/d)`, `fix(es/ed)`, `resolve(s/d)` + `#n` or `OWNER/REPO#n`, in the PR description or a commit message; colons and upper case allowed | — | GraphQL `addCloseIssueReferences` links a PR without keywords | Closes on merge into the **default branch** only. Closes GitHub issues only: a GitLab MR cannot close a GitHub issue (nothing in either product documents it). | docs.github.com: linking a PR to an issue |

---

## Jira Cloud

| Aspect | Finding | Source |
|---|---|---|
| Epic model | An `Epic` work item type. Children point to it through the **`parent`** field (JQL `parent = KEY`). `Epic Link` filters still work, but `parent` is advised for new ones. An epic can span spaces (projects). | support.atlassian.com: what is an epic |
| Primary tool | **Atlassian Rovo MCP v2**, `https://mcp.atlassian.com/v2/mcp` (OAuth 2.1 or API token). v2 exposes a few *primary* tools; the rest are reached through the `discover` and `execute` (or `executeRead`/`executeWrite`) meta-tools. Most tools need a `cloudId` from `getAccessibleAtlassianResources`. `delete_jira` and `manage_jira` are disabled by default. | atlassian-mcp-server README and `skills/README.md`; Supported tools page |
| Secondary tool | `acli` (Atlassian CLI) `jira workitem ...`. | acli reference |
| Auth / health check | `acli jira auth status`. MCP: `atlassianUserInfo` (primary) and `getJiraCurrentUser` (read_jira). REST: `GET /rest/api/3/myself`. | acli `jira auth` page; Supported tools page; Jira OpenAPI |
| Body format | **REST v3: ADF** for `description` and multi-line text fields. **acli: plain text or ADF**, Markdown not mentioned. **Rovo MCP v2: Markdown**: Atlassian's own v2 skills pass Markdown `description` strings to `createJiraIssue`, and a `getContentFormatGuide` operation exists. | Jira OpenAPI (`PUT /issue`); acli create/edit/comment pages; atlassian-mcp-server skills |
| Size limits | Description and comments: **32,767 characters**, not raisable on Cloud. | support.atlassian.com KB (JCMA text-limit article) |

| # | Operation | Rovo MCP v2 | acli | REST v3 fallback | Notes | Source |
|---|---|---|---|---|---|---|
| 1 | List targets | `listJiraProjects` (non-primary, via `execute`) | `acli jira project list` | `GET /rest/api/3/project/search` | | Supported tools; acli `jira project` |
| 2 | Fetch | `getJiraIssue`; `listJiraIssueComments` (primary since 2026-10-28); `listJiraIssueRemoteIssueLinks`; children via `searchJiraIssuesUsingJql` `parent = KEY` | `acli jira workitem view KEY --fields '*all' --json`; `acli jira workitem comment list`; `acli jira workitem link list` | `GET /rest/api/3/issue/{key}?fields=summary,description,labels,parent,issuelinks,comment` | `issuelinks` entries embed the linked issue's `status` (OpenAPI `LinkedIssue.fields`). | Supported tools; acli view/link; Jira OpenAPI |
| 3 | Search | `searchJiraIssuesUsingJql` (`project = X AND statusCategory != Done AND text ~ "terms"`; epics `issuetype = Epic`) | `acli jira workitem search --jql '<jql>' --json --paginate` | `GET/POST /rest/api/3/search/jql` (enhanced search, `nextPageToken`) | The cross-product `search` tool is beta and semantic. | Supported tools; acli search; Jira OpenAPI |
| 4 | Create | `createJiraIssue` (`cloudId`, `projectKey`, `issueType`, `summary`, `description`, `parent`, `priority`, `additional_fields` for custom fields) | `acli jira workitem create -p KEY -t Story -s <summary> --description-file f --parent EPIC-KEY -l a,b` (or `--from-json`) | `POST /rest/api/3/issue` | Relations need a second call: `createJiraIssueLink` / `acli jira workitem link create`. Labels through MCP are unverified (no label parameter is documented). | atlassian-mcp-server `spec-to-backlog` skill; acli create |
| 5 | Update | `editJiraIssue` (field parameters not published; use `discover`) | `acli jira workitem edit -k KEY -s <summary> --description-file f --labels a --remove-labels b` (no `--parent` flag documented; use `--from-json` or REST) | `PUT /rest/api/3/issue/{key}` with `fields` and `update` (e.g. `update.labels: [{add}, {remove}]`; `update.parent.set.none` removes the parent) | No partial patch: read-modify-write the ADF or Markdown. Links: `createJiraIssueLink` (`listJiraIssueLinkTypes` gives the names). | Supported tools; acli edit; Jira OpenAPI |
| 6 | Comment | `addOrEditJiraIssueComment` | `acli jira workitem comment create -k KEY -F body.txt` | `POST /rest/api/3/issue/{key}/comment` (ADF) | 32,767 cap. acli takes plain text or ADF. | Supported tools; acli comment create |
| 7 | Labels | **No Jira label tool** in Rovo MCP | List: none documented; derive from search output. Create: none | List: `GET /rest/api/3/label`. **No create-label endpoint** | Labels are created by using them: type a new name in the Labels field (UI). Through REST or acli this means setting it on an issue. | Supported tools; Jira OpenAPI; support.atlassian.com KB "How to create and use labels" |
| 8 | Epic PRD | Description via `createJiraIssue`/`editJiraIssue`. Long spec: `createConfluenceContent` / `getConfluenceContent` / `updateConfluenceContent` (v2 edits need a `snapshotToken` from the preceding read), then `createJiraIssueRemoteIssueLink` to attach it; `listJiraIssueRemoteIssueLinks` to find it | `--description-file` (plain/ADF) | `POST /rest/api/3/issue/{key}/remotelink` (`globalId` makes it create-or-update) | The description holds 32,767 chars. Confluence is a separate product the site must have. | Supported tools; skills/README.md; Jira OpenAPI |
| 9 | Close as duplicate | `createJiraIssueLink` (type `Duplicate`), then `transitionJiraIssue` | `acli jira workitem link create --out DUP --in ORIG --type Duplicate --yes`; `acli jira workitem transition -k DUP -s Done --yes` | `POST /rest/api/3/issueLink`; `POST /rest/api/3/issue/{key}/transitions` (set `fields.resolution` if the screen allows) | acli `transition` has **no resolution flag**. Whether a `Duplicate` resolution exists depends on the site's workflow and resolutions (`GET /rest/api/3/resolution`). | acli link create / transition; Jira OpenAPI |
| 10 | Frontier | `searchJiraIssuesUsingJql` `parent = EPIC AND statusCategory != Done` with `issuelinks` in the fields, then drop children that have an inward "is blocked by" link to an issue whose status category is not Done | `acli jira workitem search --jql ... --fields key,status,issuelinks --json` | `/search/jql` with `fields=issuelinks,status` | One query, then a client filter. JQL cannot express "no open blocker" natively. | Jira OpenAPI |
| 11 | PR link text | — | — | — | **GitHub PR**: the issue key in the PR title or source branch links it (with the GitHub for Jira app connected). Transitions need **smart commits** in commit messages (`KEY #comment ...`, `KEY #<transition-name>`, e.g. `#close`), not PR titles. GitHub and Bitbucket support them, and the committer email must match exactly one Jira user. **GitLab MR**: GitLab's Jira issue integration closes `Resolves/Closes/Fixes KEY` from a commit or MR targeting the default branch, if transition IDs are configured. | support.atlassian.com: reference issues in development work; smart commits; docs.gitlab.com: Jira issues integration |

Link types: `Blocks` (name and outward description "blocks") is a default type; `Relates` and
`Duplicate` also exist as defaults, and `Cloners` is used by cloning. For `acli ... link create`,
`--out X --in Y --type Blocks` means "X blocks Y", so "A is blocked by B" is `--out B --in A`.
Read the actual names with `listJiraIssueLinkTypes` / `acli jira workitem link type`.

---

## GitLab (Free and Premium)

| Aspect | Finding | Source |
|---|---|---|
| Epic model | **Premium+**: `Epic` work items (group-level) with child issues (≤ 5,000 direct children). Nested epics are Ultimate. **Free**: the only hierarchy is Issue → **Task**, so an "epic" is a parent issue whose children are tasks, or a label plus `Part of` lines for issue→issue. | docs.gitlab.com: Epics (tier Premium, Ultimate); child items; tasks (Free) |
| Primary tool | `glab` CLI (v1.128.0) for every tier, because it can create labels and run quick actions through notes. GitLab's built-in MCP server is **GA since 19.5** on Free/Premium/Ultimate (`https://<host>/api/v4/mcp`); it needs a top-level-group or instance admin to allow access and an OAuth token with `mcp` scope or a fine-grained PAT. Legacy PATs are rejected with 403. `glab work-items` is **experimental**. | glab docs; docs.gitlab.com: MCP server |
| Auth / health check | `glab auth status` (`--all`, `--hostname`, `--output json`). MCP: `get_user` with `me=true`; `get_mcp_server_version`. | glab `auth status`; MCP tools doc |
| Body format | GitLab Flavored Markdown. | MCP `save_work_item` |
| Size limits | Descriptions and comments of issues, MRs and epics: ~1 million characters / ~1 MB (MCP: description max 1,048,576; Notes API: body ≤ 1,000,000). Max 5,000 comments per issue (self-managed instance limit). | docs.gitlab.com: application limits; MCP tools doc; Notes API |

| # | Operation | glab | GitLab MCP | REST/GraphQL fallback | Tier / notes | Source |
|---|---|---|---|---|---|---|
| 1 | List targets | `glab repo list -g <group> -G --output json`; `--member` | `list_projects` (`group_id`, `search`); `list_groups` (`include_subgroups`) | `GET /groups/:id/projects` | Free | glab `repo list`; MCP tools doc |
| 2 | Fetch | `glab issue view <iid> --comments --output json`; children: `glab api` GraphQL hierarchy widget; links: `glab api projects/:id/issues/:iid/links` | `get_work_item` (`include`: `notes` / `discussions` / `related_merge_requests`, one facet per call; returns parent and labels); children: `list_work_items` (`parent_iid`, GitLab 19.6+) | GraphQL `WorkItemWidgetHierarchy.{parent, children}`, `WorkItemWidgetLinkedItems.{linkedItems, blocked, blockedByCount}`; REST `GET /projects/:id/issues/:iid/links` | `get_work_item` docs do not list linked items, so read links via REST or GraphQL. | glab `issue view`; MCP tools doc; GraphQL reference; issue links API |
| 3 | Search | `glab issue list --search "<terms>" --in title,description` (open by default); epics: `glab work-items list --type epic -g <group>` (Premium) | `list_work_items` (`search`, `state: opened`, `types: ["EPIC"]`, `label_name`); `search` (`scope: work_items`) | `GET /projects/:id/issues?search=&state=opened` | Epics are Premium. On Free, use a label. | glab `issue list`, `work-items list`; MCP tools doc |
| 4 | Create | `glab issue create -t <title> --description-file f -l a,b --linked-issues <iid,...> --link-type relates_to\|blocks\|is_blocked_by --epic <id> -y`; task child: `glab work-items create --type task --parent <iid>` | `save_work_item` (no `work_item_iid`; `title`, `type_name`, `description`, `labels`, `parent_id`), then `link_work_items` | `POST /projects/:id/issues`; `POST /projects/:id/issues/:iid/links` | `blocks`/`is_blocked_by` and `--epic` are Premium. `relates_to` is Free. | glab `issue create`; MCP tools doc; issue links API |
| 5 | Update | `glab issue update <iid> -t <title> --description-file f -l add -u remove`; parent: `glab work-items update <iid> --parent <iid>`; relations: `glab issue note <iid> -m "/relate #n"` / `/blocked_by #n` | `save_work_item` (`work_item_iid`, `title`, `description`, `add_labels`, `remove_labels`, `parent_id`); `link_work_items` (`link_type`, ≤ 10 ids) | `PUT /projects/:id/issues/:iid` (`add_labels`, `remove_labels`) | No partial patch: read-modify-write. `glab issue update` has no link flags, so use quick actions through notes, or REST. | glab `issue update`, `work-items update`; MCP tools doc |
| 6 | Comment | `glab issue note <iid> -m <text>` | `save_note` (`work_item_iid`, `body`) | `POST /projects/:id/issues/:iid/notes` | MCP `save_note`: lines may not start with `/`, so quick actions are blocked. The Notes API runs quick actions. | glab `issue note`; MCP tools doc; Notes API |
| 7 | Labels | List: `glab label list [-g group] --output json`. Create: `glab label create --name <n> --color "#hex" --description <d>` | List: `search_labels` (`full_path`, `is_project`). **No create-label tool** | `GET/POST /projects/:id/labels`; GraphQL `labelCreate` | Free | glab `label`; MCP tools doc; GraphQL mutations |
| 8 | Epic PRD | read `glab issue view`; write `glab issue update --description-file` (Premium epics: `glab work-items update <iid> -g <group> --description-file f`) | `get_work_item` / `save_work_item` `description` | Wiki: `/projects/:id/wikis` (MCP `wikis` toolset is opt-in and has `list_wiki_pages` only) | There is no document entity: a `# Spec` section in the epic or parent-issue body (~1M chars). | glab docs; MCP tools doc |
| 9 | Close as duplicate | `glab issue note <iid> -m "/duplicate #<orig>"` | Not possible as one call (`save_note` rejects `/`). Fallback: `save_work_item` `state: closed` + `link_work_items` `relates_to` + a `Duplicate of #n` comment | Notes API with `/duplicate` | `/duplicate` closes the item and marks it related to, and a duplicate of, the target. Free. | quick actions doc; MCP tools doc |
| 10 | Frontier | `glab api graphql` on the hierarchy widget's children and their `linkedItems`/`blocked`, then client filter | `list_work_items` (`parent_iid`, `state: opened`), then REST links per child | GraphQL as left | **Premium**: native data. **Free**: there are no blocks links, so parse `Blocked by:` lines in children's bodies. | GraphQL reference; MCP tools doc |
| 11 | PR link text | — | — | — | `Close/Closes/Closed/Closing`, `Fix…`, `Resolve…`, `Implement…` + `#n`, `group/project#n`, or a full URL, in the **MR description or a commit message**. Closes on merge or push to the **default branch**. `Related to #n` only links. Maintainers can turn auto-close off per project. A GitHub PR cannot close a GitLab issue: GitLab's docs describe closing only from its own MRs and commits. | docs.gitlab.com: managing issues (closing pattern) |

Quick actions an adapter can post through `glab issue note` or the Notes API: `/relate`,
`/blocked_by`, `/blocks` (Premium), `/set_parent` (alias `/epic` for issues), `/add_child`, `/label`,
`/unlabel`, `/duplicate`, `/close`. Quick actions whose feature the tier lacks are not available.

---

## Gaps that need the contract's text fallbacks

| Tracker | Gap | Text fallback |
|---|---|---|
| Linear | No "is an epic" filter | An `epic` label (or project) as the epic marker. |
| Linear | Blocker state not filterable | Client-side check of each blocker's `statusType` (data is native). |
| GitHub | No "related" relation | `Related: #n` line in the body. Mentions create timeline cross-references. |
| GitHub | No document entity | `# Spec` section in the epic body, 65,536-char cap. Overflow goes to a repo file linked from the body. |
| GitHub | Body edit is full replace | Read-modify-write. Write the whole body with `-F`. |
| GitHub | Epic type only for org repos | `epic` label in user-owned repos. |
| GitHub | MCP lacks dependency writes (feature-gated) and its label tools are in a non-default toolset | Use `gh` for relations and labels. |
| Jira | Relations cannot be set at create time | Create, then link. Leave a `Blocked by:` line only if linking is disabled on the site. |
| Jira | No label tool in Rovo MCP; no label-create anywhere | Labels come into existence when first set (acli `--label`, REST `update.labels`). |
| Jira | 32,767-char description; ADF via REST and acli | `# Spec` in the description when it fits, otherwise a Confluence page plus remote link. Without Confluence, split the spec across comments under a `# Spec` heading (adapter decision). |
| Jira | Duplicate resolution is workflow-dependent | Duplicate link + transition to a done status. The resolution is best effort. |
| Jira | acli `edit` has no `--parent` | `--from-json` or REST `PUT` with `fields.parent`. |
| GitLab Free | No `blocks`/`blocked_by` | `Blocked by: #n` lines, parsed for the frontier. |
| GitLab Free | No epics; only Issue→Task children | Parent issue + Task children, or an `epic` label with `Part of #n` lines for issue children. |
| GitLab (all) | No document entity | `# Spec` section in the epic or parent description (~1M chars). |
| GitLab (all) | MCP cannot create labels or run quick actions | `glab label create`, and `glab issue note -m "/duplicate #n"` etc. |
| GitLab (all) | No partial patch | Read-modify-write. |
| Cross-host | GitHub PR → GitLab issue, and GitLab MR → GitHub issue | No native close. The adapter closes the item itself after merge. |

## Unverified

- **Linear description and comment size limits.** Linear does not document them. A third-party bug report on GitHub quotes a `250000` character validation error for `description` (community, not confirmed). The only Linear-documented 250,000 figure applies to email-created issue bodies.
- **GitHub comment body limit.** A community discussion reports `maximum is 65536 characters` for comments. The issue *body* limit is confirmed only through the API error quoted in a GitHub-owned repo, not on docs.github.com.
- **GitHub search qualifiers `parent-issue:` / `has:sub-issues`.** Not on docs.github.com. The 2025 engineering blog mentions `has:parent-issue` and `has:sub-issues-progress`. Only `is:blocked`, `is:blocking`, `blocked-by:`, `blocking:` are confirmed (changelog).
- **GitHub sub-issues across owners and plan gating.** The REST docs say the sub-issue must belong to the same repository owner as the parent. Dependencies across repos and plan gating are not documented.
- **Rovo MCP v2 input schemas** for `editJiraIssue`, `createJiraIssueLink`, `transitionJiraIssue`: not published. Whether `editJiraIssue` can add or remove labels, and whether `transitionJiraIssue` can set a resolution, are unknown. Run `discover` on a live server.
- **Rovo MCP Markdown handling.** Inferred from Atlassian's own v2 skills, which pass Markdown descriptions. No published contract states the conversion to ADF.
- **Jira default link-type inward wording** (`is blocked by`, `is duplicated by`, `relates to`). Only `Blocks`/"blocks" is quoted in the admin docs.
- **Jira label rules** (no spaces in names, site-wide scope). Not confirmed from a primary page.
- **acli 1.3.15 flags.** The reference pages were last updated 2024-10-03 and acli was not run locally. Flags may have changed.
- **GitLab `get_work_item` linked items and children.** Not listed in its documented output.
- **GitLab GraphQL `blockedByCount` / `blocked`.** Whether these count only open blockers is not documented.
- **Linear duplicate status.** The current behaviour (dedicated Duplicate status type) comes from the changelog. The docs page for issue relations returned 404 on the check date.

## Sources

- https://linear.app/docs/mcp
- https://linear.app/docs/github (served as https://linear.app/docs/github-integration.md)
- https://linear.app/docs/gitlab
- https://linear.app/docs/documents
- https://linear.app/docs/parent-and-sub-issues
- https://linear.app/llms.txt
- https://linear.app/changelog
- https://raw.githubusercontent.com/linear/linear/master/packages/sdk/src/schema.graphql
- https://github.com/cli/cli/releases/tag/v2.94.0
- https://github.com/cli/cli/releases/tag/v2.88.0
- https://github.com/cli/cli/releases (latest v2.103.3)
- https://github.com/github/github-mcp-server (README, `docs/insiders-features.md`, release v2.1.0)
- https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues
- https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies
- https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
- https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/marking-issues-or-pull-requests-as-a-duplicate
- https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests
- https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests
- https://docs.github.com/en/issues/tracking-your-work-with-issues/configuring-issues/managing-issue-types-in-an-organization
- https://docs.github.com/en/rest/issues/sub-issues
- https://docs.github.com/en/rest/issues/issue-dependencies
- https://github.blog/changelog/2025-08-21-dependencies-on-issues/
- https://github.blog/changelog/2026-06-10-manage-sub-issues-types-and-dependencies-from-github-cli/
- https://github.blog/engineering/architecture-optimization/introducing-sub-issues-enhancing-issue-management-on-github/
- https://github.com/github/issue-metrics/blob/main/docs/dealing-with-large-issue-metrics.md
- https://github.com/orgs/community/discussions/41331 (community, supplement only)
- https://developer.atlassian.com/cloud/rovo-mcp/guides/supported-tools/
- https://support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/
- https://developer.atlassian.com/cloud/rovo-mcp/changelog/
- https://github.com/atlassian/atlassian-mcp-server (README, `skills/README.md`, `skills/spec-to-backlog/SKILL.md`, `skills/triage-issue/SKILL.md`, `skills/capture-tasks-from-meeting-notes/SKILL.md`)
- https://developer.atlassian.com/cloud/acli/reference/commands/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-auth/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-project/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-create/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-edit/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-view/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-search/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-link/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-link-create/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-comment-create/
- https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-transition/
- https://developer.atlassian.com/cloud/acli/changelog/
- https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
- https://support.atlassian.com/atlassian-cloud/kb/commentbodycharacterlimitexceededexception-no-message-or-the-entered-text-is-too-long-it-exceeds-the-allowed-limit-of-32-767-characters-error-message-in-jcma/
- https://support.atlassian.com/jira-software-cloud/docs/what-is-an-epic/
- https://support.atlassian.com/jira-software-cloud/docs/process-issues-with-smart-commits/
- https://support.atlassian.com/jira-software-cloud/docs/reference-issues-in-your-development-work/
- https://support.atlassian.com/jira-cloud-administration/docs/configure-issue-linking/
- https://support.atlassian.com/jira/kb/how-to-create-and-use-labels-in-jira-cloud/
- https://gitlab.com/gitlab-org/cli/-/tree/main/docs/source (`issue/`, `work-items/`, `label/`, `auth/status.md`, `repo/list.md`; release v1.128.0)
- https://docs.gitlab.com/user/model_context_protocol/mcp_server/
- https://docs.gitlab.com/user/model_context_protocol/mcp_server_tools/
- https://docs.gitlab.com/user/work_items/child_items/
- https://docs.gitlab.com/user/group/epics/
- https://docs.gitlab.com/user/tasks/
- https://docs.gitlab.com/user/project/issues/related_issues/
- https://docs.gitlab.com/user/project/issues/managing_issues/
- https://docs.gitlab.com/user/project/quick_actions/
- https://docs.gitlab.com/api/issue_links/
- https://docs.gitlab.com/api/notes/
- https://docs.gitlab.com/api/issues/
- https://docs.gitlab.com/api/graphql/reference/ (objects, enums, mutations)
- https://docs.gitlab.com/administration/instance_limits/
- https://docs.gitlab.com/integration/jira/issues/
