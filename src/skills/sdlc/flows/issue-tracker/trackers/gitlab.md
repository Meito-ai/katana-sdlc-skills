# GitLab adapter

Tool: `glab` >= 1.128, with `glab api` (REST and GraphQL) for what its commands lack. Bodies are
GitLab Flavored Markdown. The tier comes from the `Tracker:` line: `gitlab (free)`, or
`gitlab (premium)` for Premium and Ultimate. A target is a project (`group/project`); Premium epics
live in its group. Every project call takes `-R <group/project>`.
Body limit: 1000000 characters

## Check

`glab auth status` exits 0. On Premium, `glab work-items list --type epic -g <group>` also lists the
group's epics. The tier itself is the user's answer at setup, recorded on the `Tracker:` line.
(`glab work-items` is experimental, so read its `--help` when a flag below is refused.)

## Epics

Epic label: yes (free), no (premium)

- **Free**: an epic is an issue labelled `Epic`. Its slices are issues linked to it `relates_to` and
  carrying a `Part of #<epic>` line. Blockers are `Blocked by: #<n>, …` lines, since blocking links
  are Premium.
- **Premium**: an epic is a group-level `Epic` work item, marked by its type. Its slices are its child
  issues, and its blockers are `blocks` links.

On both, the PRD is a `# Spec` section in the epic's description.

## 1. List targets

**Native.** `glab repo list -g <group> -G --output json`, or `glab repo list --member --output json`.

## 2. Fetch an item

**Native, with fallback:** on Free, the parent comes from the `Part of` line and blockers from the
`Blocked by:` line; on both, the PRD from the `# Spec` section.
`glab issue view <iid> --comments --output json`. Links: `glab api projects/:id/issues/<iid>/links`,
each with its `link_type` (`relates_to`, `blocks`, `is_blocked_by`). Premium parent and children:
`glab api graphql` on the work item's hierarchy widget (`WorkItemWidgetHierarchy { parent children }`).

## 3. Search

**Native, with fallback:** on Free, epics are the issues labelled `Epic`. Key terms:
`glab issue list --search "<terms>" --in title,description --output json` (open by default). Epics:
`glab issue list -l Epic` on Free, `glab work-items list --type epic -g <group>` on Premium. Open
issues: `glab issue list --per-page 100 --output json`, paging.

## 4. Create an item

**Native, with fallback:** on Free, the parent is a `relates_to` link plus a `Part of #<epic>` line,
and blockers a `Blocked by: #<n>, …` line, both at the top of the body (after the `Epic:` line). Duplicate
of: create, then [close as duplicate](#9-close-as-duplicate).
`glab issue create -t <title> --description-file <file> -l <label,…> -y`, with `--epic <id>` on
Premium, and `--linked-issues <iid,…> --link-type <relates_to|is_blocked_by>` for one kind of link
(`is_blocked_by` is Premium); any further link through Update. A Premium epic:
`glab work-items create --type epic -g <group>` with its title and description.

## 5. Update an item

**Native, with fallback:** a description is only ever replaced whole, so fetch it, change it, and
write all of it back; on Free, a new blocker is a new entry on the `Blocked by:` line.
`glab issue update <iid> -t <title> --description-file <file> -l <add,…> -u <remove,…>`. Links run as
quick actions in a note: `glab issue note <iid> -m "/relate #<n>"`, and on Premium
`/blocked_by #<n>`. A Premium epic: `glab work-items update <iid> -g <group> --description-file <file>`.

## 6. Comment

**Native.** `glab issue note <iid> -m <text>`. A line that starts with `/` runs as a quick action, so
keep comment text off the start of a line with one.

## 7. Labels

**Native.** List: `glab label list --output json`. Create:
`glab label create --name <name> --color "#<hex>" --description <description>`.

## 8. Epic PRD

**Fallback.** GitLab has no document entity: the PRD is a `# Spec` section in the epic's description,
after the card, without the card's `Spec:` line or the PRD's `Card:` line. Read it from the
description; attach and patch it by replacing the description (Update).

## 9. Close as duplicate

**Native.** `glab issue note <iid> -m "/duplicate #<original>"`: it closes the item and marks it a
duplicate of, and related to, the original.

## 10. Frontier

**Native, with fallback:** Free parses the text lines.

- **Free**: the open issues whose description carries `Part of #<epic>`
  (`glab issue list --search "Part of #<epic>" --in description --output json`); keep those whose
  every `Blocked by:` entry is a closed issue.
- **Premium**: the epic's open children through the hierarchy widget, then
  `glab api projects/:id/issues/<iid>/links` for each; keep those with no `is_blocked_by` link to an
  open issue.

## 11. PR link

**Native, with fallback:** on a GitLab merge request, `Closes #<n>` in the description
(`Closes group/project#<n>` from another project); merging into the default branch closes the item,
unless the project turned auto-close off. A GitHub PR cannot close a GitLab issue: it carries
`Refs <issue URL>`, and the item is closed by hand after the merge.
