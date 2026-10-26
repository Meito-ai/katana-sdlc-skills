---
name: visual-pr
description: "Write a GitHub PR description that is fast to review: a visual of the change, before/after evidence and merge danger, kept in one marked block stamped with the PR head commit. Use when opening a PR, writing a PR description, or after pushing to a branch with an open PR."
---

# Visual PR

Write the PR description so the reviewer gets the change from the top of the page: the **shape of the
change** first, then the **evidence** that it works, then the **merge danger**. The description is the
first thing a reviewer reads, so it carries the visual, and it stays current: refresh it after every push.

Everything this skill writes sits in one **block** of the description, between the `katana:visual-pr`
markers, stamped with the PR head commit. `scripts/cli.mjs` in this skill's directory writes it: it
replaces the block in place, leaves every line outside it untouched, and **rejects** content that breaks
`scripts/contract.mjs` (sections, caps, Mermaid). Read the error and fix the content rather than working
around it.

Inspired by the [`pr` skill](https://github.com/mattpocock/skills/tree/v1.3.1/skills/engineering/pr)
of `mattpocock/skills` v1.3.1: the sections and the merge-danger vocabulary come from it
([licence](LICENSE-mattpocock-skills)). The block, the stamp, the refresh and the contract are additions.

## Requirements

- **GitHub only.** The CLI talks to the PR through `gh`, which must be installed and authenticated
  (`gh auth status`).
- **Node.js >= 20 on the machine.** The scripts are dependency-free `.mjs` files, so the host repo does
  not need to be a Node project.

## Workflow

`<skill-dir>` below is the directory holding this `SKILL.md` (e.g. `.claude/skills/visual-pr`).

1. **Push.** Local `HEAD` must be the PR head: the stamp names the commit the content was derived from,
   and the CLI refuses to write otherwise.
2. **Open the PR** when there is none: `gh pr create --title "<title>" --body ""`. When the repo has a PR
   template, fill the template's sections that the block does not cover and pass them as `--body`
   instead; they stay below the block, as the author's text.
3. **Read the change**: the diff against the merge-base and the commits. On a refresh, also read the
   current block (`gh pr view --json body`).
4. **Write the content** (below) to a scratch file outside the repo, never committed.
5. **Write the block**:

   ```bash
   node <skill-dir>/scripts/cli.mjs write --body <scratch-file>
   ```

   Add `--pr <number>` when the current branch is not the PR's head branch.
6. Report the PR URL.

Done when the CLI reports the block written for the current head.

**Refresh** after every push to the PR: steps 3 to 5 again. Derive Summary and Evidence afresh from the
whole diff. Carry Merge Danger over unless the new commits change the door or the blast radius.

In Claude Code, `scripts/hook.mjs` is a `PostToolUse` hook on `Bash` that catches a missed refresh:
after a `gh pr create` or `git push`, it tells the agent when the PR's stamp is not `HEAD`.
`setup-katana-skills` installs it.

## Content

Write only these three sections, in this order, with these headings. The CLI adds the markers and the
stamp. Skip preambles, keep prose brief, and use the repo's domain language (its glossary, when it has
one).

```markdown
## Summary

<one visual, beside a line or two of text>

## Evidence

- **Before:** <screenshot, output or failing test run>
  **After:** <screenshot, output or passing test run>

## Merge Danger

**Door:** two-way

<optional: why>

**Blast Radius:** <one word>

<optional: what could break>
```

Caps: 100 lines and 12 KiB for the whole block, 50 lines for Summary. A detail that does not fit goes in
a `<details><summary>…</summary>` block.

### Summary

Show the **delta**: the smallest visual that makes the change clear, with before and after in one view. If
the visual would look the same before and after the change, it describes the system, not the change.

| The change is in | Show |
|---|---|
| logic, a branch, a guard, an ordering | pseudocode as a `diff` |
| runtime control flow | a call tree, as a `diff` when the shape already exists |
| interaction order, a participant added or removed | Mermaid `sequenceDiagram`, the change marked with `Note over` |
| a lifecycle state or transition | Mermaid `stateDiagram-v2` |
| UI structure | a component tree, with the state and module boundaries that matter |
| file responsibility, a broad refactor, a rename | a shallow file tree, as a `diff` |
| mostly new code | the whole target block, when the reader needs its exact shape |

- **Real names**: participants, events, states and files taken from the diff. A diagram of
  `Service A → Service B` is worse than none.
- **One visual**, placed beside the text it supports. Add a second only when the first cannot carry the
  point.
- **Nothing to draw** (a typo, a version bump, a config value): write `_No visual: <reason>._` in place
  of the visual, with a specific, checkable reason.
- **Mermaid**: the first line inside a `mermaid` fence is one of `sequenceDiagram`, `stateDiagram-v2`,
  `stateDiagram`, `flowchart`, `graph`, `classDiagram`, `erDiagram`. The contract checks it, because a
  typo renders as an error box that only the reviewer sees.

### Evidence

Concrete proof that the change works, before and after. Best is a screenshot of a visual change, when
the environment can attach one. Next is execution: the exact test that failed and now passes (written as
pseudocode), or command output.

### Merge Danger

- **Door**: `two-way` when a revert walks the merge back completely; `one-way` when it cannot, as with a
  destructive migration, deleted data, a published release or tag, or anything already announced
  outside the repo.
- **Blast Radius**: one word for the reach of a failure, then what could break: consumers, layout,
  mobile, data, CI.

## The block

- **The block belongs to this skill; the rest of the description belongs to the author.** Change the
  block only through the CLI. A human edit inside the block is overwritten on the next refresh, and the
  stamp line says so.
- **Markers are the CLI's.** Leave them out of the content; the contract rejects them. A description
  with a lone or repeated marker stops the CLI: fix the markers on GitHub by hand, then rerun it.
- **Markdown and Mermaid only.** GitHub sanitizes HTML in descriptions, and private-repo images do not
  render through its image proxy, so they are the only formats that need no hosting.
