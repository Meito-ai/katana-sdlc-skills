# GitHub adapter

Tool: `gh` >= 2.94 (sub-issues and blocking links; `gh issue close --duplicate-of` needs >= 2.88).
Bodies are GitHub Flavored Markdown. Every call takes `-R <owner/name>`, the target.
Body limit: 65536 characters

## Check

`gh auth status` exits 0, and `gh --version` reports 2.94 or later.

## Epics

Epic label: yes

An epic is an issue labelled `Epic`. Its slices are sub-issues (`--parent`), and its blockers are
native blocked-by links. The PRD is a `# Spec` section in the epic's body.

## 1. List targets

**Native.** `gh repo list <owner> --no-archived --json nameWithOwner,hasIssuesEnabled`; a target is
`owner/name`.

## 2. Fetch an item

**Native, with fallback:** GitHub has no "related" link, so related items come from the body's
`Related:` line, and the PRD from its `# Spec` section.
`gh issue view <n> --json title,body,state,stateReason,labels,comments,parent,subIssues,blockedBy,blocking`.

## 3. Search

**Native.** Key terms: `gh issue list --state open --search "<terms> in:title,body"
--json number,title,labels,body`. Epics: `gh issue list --state open --label Epic`. Open items at a
level: `gh issue list --state open --limit 1000 --json number,title,labels,body`, epics being the
ones labelled `Epic`.

## 4. Create an item

**Native, with fallback:** related items become a `Related: #<n>, …` line at the top of the body
(after the `Epic:` line when there is one); duplicate of is a create, then a
[close as duplicate](#9-close-as-duplicate).
`gh issue create -t <title> -F <body file> -l <label,…> --parent <n> --blocked-by <n,…>`.

## 5. Update an item

**Native, with fallback:** a body is only ever replaced whole, so fetch it, change it, and write all of
it back with `gh issue edit <n> -F <body file>`; related items as in Create.
`gh issue edit <n> -t <title> --add-label <l> --remove-label <l> --parent <n> --add-blocked-by <n>`.

## 6. Comment

**Native.** `gh issue comment <n> -F <body file>`.

## 7. Labels

**Native.** List: `gh label list --limit 200 --json name,description`. Create:
`gh label create <name> -d <description>`.

## 8. Epic PRD

**Fallback.** GitHub has no document entity: the PRD is a `# Spec` section in the epic's body, after
the card, without the card's `Spec:` line or the PRD's `Card:` line. Read it from the body; attach and
patch it by replacing the body (Update).

## 9. Close as duplicate

**Native.** `gh issue close <n> --duplicate-of <original>`.

## 10. Frontier

**Native.** One query, then keep the `OPEN` children whose every blocker is `CLOSED`:

```bash
gh api graphql -F owner=<owner> -F name=<name> -F epic=<n> -f query='
  query($owner: String!, $name: String!, $epic: Int!) {
    repository(owner: $owner, name: $name) { issue(number: $epic) {
      subIssues(first: 100) { nodes { number title state blockedBy(first: 50) { nodes { number state } } } }
    } }
  }'
```

## 11. PR link

**Native, with fallback:** on GitHub, `Closes #<n>` in the PR description (`Closes owner/name#<n>`
from another repo); merging into the default branch closes the item. A GitLab merge request cannot
close a GitHub issue: it carries `Refs <issue URL>`, and the item is closed by hand after the merge.
