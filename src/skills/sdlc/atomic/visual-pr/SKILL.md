---
name: visual-pr
description: "Write a GitHub PR description that is fast to review: a visual of the change, before/after evidence and merge danger, kept in one marked block stamped with the PR head commit. Use when writing the description of an open PR, or after pushing to a branch with an open PR."
metadata:
  adapted-from: "https://github.com/mattpocock/skills/tree/v1.3.1/skills/engineering/pr"
  adapted-license: "MIT, Matt Pocock; see LICENSE-mattpocock-skills"
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

## Inputs

- **`run-dir`** (required): the directory the caller passes for this skill's files. The skill writes its
  content to `<run-dir>/visual-pr/content.md` and nowhere else.
- **`pr`** (optional): the PR number. Without it, the PR of the current branch.

The PR must already exist and local `HEAD` must be pushed to it: the stamp names the commit the content
was derived from, and the CLI refuses to write otherwise. The skill never opens a PR and never pushes.

## Results

The skill ends with exactly one result, the CLI's last line.

- `done`: `done: <PR url>`. The block is written for the current head.
- `decision needed`: never returned. The content follows from the diff, so there is no choice to hand back.
- `blocked`: `blocked: <reason>`, from the CLI: `missing run-dir`, `missing pull request`, a head that
  is not the PR head, or a broken marker. Return the CLI's reason as it is. A `missing <input>` is
  returned the same way when the caller omits a required input.

A content error (a missing section, a cap, a Mermaid typo) is not `blocked`: the CLI prints what to fix,
and the skill fixes the content and runs it again.

## Requirements

- **GitHub only.** The CLI talks to the PR through `gh`, which must be installed and authenticated
  (`gh auth status`).
- **Node.js >= 20 on the machine.** The scripts are dependency-free `.mjs` files, so the host repo does
  not need to be a Node project.

## Workflow

`<skill-dir>` below is the directory holding this `SKILL.md`, wherever the harness installed it.

1. **Check the inputs.** A missing `run-dir` is `blocked: missing run-dir`.
2. **Read the change**: the diff against the merge-base and the commits. On a refresh, also read the
   current block (`gh pr view --json body`).
3. **Write the content** (below) to `<run-dir>/visual-pr/content.md`.
4. **Write the block**:

   ```bash
   node <skill-dir>/scripts/cli.mjs write --run-dir <run-dir>
   ```

   Add `--pr <number>` when `pr` was passed.
5. **Return the result**: the CLI's `done: <PR url>` or `blocked: <reason>`.

**Refresh** after every push to the PR: steps 2 to 4 again. Derive Summary and Evidence afresh from the
whole diff. Carry Merge Danger over unless the new commits change the door or the blast radius.

**Side effects.** The only thing this skill writes outside the run directory is the PR description, and
inside it only the block. It makes no commit, no push and no other call that changes the PR.

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
  with a lone or repeated marker stops the CLI with `blocked`: the caller repairs the markers, then
  runs the skill again.
- **Markdown and Mermaid only.** GitHub sanitizes HTML in descriptions, and private-repo images do not
  render through its image proxy, so they are the only formats that need no hosting.
