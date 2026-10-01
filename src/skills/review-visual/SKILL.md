---
name: review-visual
description: "Compose and post the review-visual PR comment: a behavioral-delta diagram for human reviewers, kept as one marked sticky comment per GitHub PR. Use after opening a PR, when refreshing the visual after a new push, or when the user asks to show a PR's behavioral change visually."
---

# Review visual

Give the human reviewer the one thing prose review cannot: **the shape of the behavioral change**. A PR
usually already carries automated review comments, and they are all prose. Do not restate them. Show what
the system now *does* differently.

The comment is sticky (found by marker, patched in place), stamped with the PR head sha, and posted by
`scripts/cli.mjs` in this skill's directory. `scripts/contract.mjs` owns every heading and cap and
**rejects** a body that breaks them, so read the error and fix the content rather than working around it.

## Requirements

- **GitHub only.** The CLI talks to the PR through `gh`, which must be installed and authenticated
  (`gh auth status`).
- **Node.js >= 20 on the machine.** The scripts are dependency-free `.mjs` files, so the host repo does
  not need to be a Node project or have a `package.json`.

## Workflow

`<skill-dir>` below is the directory holding this `SKILL.md` (e.g. `.claude/skills/review-visual`).

1. The PR must already exist (`gh pr create`) and local `HEAD` must be pushed. The CLI refuses to post
   otherwise: the stamped sha must name the commit the visual was derived from.
2. Read the diff against the merge-base. Decide whether behavior changed at all.
3. **No behavioral delta** (docs, config, comments, pure rename, tooling): do not manufacture a diagram.

   ```bash
   node <skill-dir>/scripts/cli.mjs post --no-delta "docs only"
   ```

   The reason is required, must be specific and checkable, and must not end with punctuation.
4. **Behavioral delta**: write the body to a scratch file outside the repo (never commit it), then post:

   ```bash
   node <skill-dir>/scripts/cli.mjs post --body /tmp/review-visual.md
   ```

   Add `--pr <number>` when the current branch is not the PR's head branch.
5. Report the comment URL. After a later push, run the same command again: it patches the same comment.

## Body shape

Write **only** these two sections. The CLI adds the marker, heading, sha stamp and footer.

```markdown
**Change shape**

<the opening frame, max 15 lines>

**Behavioral delta**

<one diagram, the point of the whole comment>
```

Caps: 60 lines and 8 KiB for the whole rendered comment, 15 lines for the change-shape frame. Budget
accordingly: the delta deserves most of it.

### Change shape

A shallow file or module tree, annotated only where the annotation earns its line. Include the modules the
diff crosses and nothing else. No full paths when the parent is obvious.

```text
packages/auth/
├── session.port.ts     # new: refresh contract
└── session.service.ts  # refresh moved behind the port
```

### Behavioral delta

Pick the form that shows the mechanism, and show **before and after** in one view:

- **`sequenceDiagram`**: the default. Interaction order changed, a participant was added or removed, a
  call moved. Mark the change inline with `Note over` rather than drawing two diagrams.
- **`stateDiagram-v2`**: a lifecycle gained or lost a state or transition.
- **A control-flow diff**: the change is a branch, a guard, or an ordering, and the surrounding shape
  already exists. Cheaper and clearer than a diagram:

  ````markdown
  ```diff
   on(save)
  -  write content
  +  if content is unchanged
  +    return cached result
  +  write new content
  ```
  ````

Only these Mermaid diagram types are accepted: `sequenceDiagram`, `stateDiagram-v2`, `stateDiagram`,
`flowchart`, `graph`, `classDiagram`, `erDiagram`. The first line inside a `mermaid` fence must be the
keyword. The contract lints it, because a typo renders as an error box that only the reviewer sees.

A second diagram is allowed **only** inside `<details><summary>…</summary>` and only when the first one
cannot carry the point.

## Rules

- **Real names.** Real participants, real events, real states, taken from the diff. A diagram of
  `Service A → Service B` is worse than no diagram.
- **Delta, not description.** If the diagram would look identical before and after the change, you are
  describing the system, not the change. Use `--no-delta` instead.
- **Never touch the diff or the PR description.** The visual lives only in its own comment. GitHub
  sanitizes HTML in comments and private-repo images do not render through its image proxy, so Markdown
  with Mermaid is the only surface that needs no hosting.
- **Interactive HTML** is out of scope here. If a change genuinely needs it, publish the page as a Claude
  Artifact and link it from the **Behavioral delta** section, and only if the running agent can publish
  one. Never commit the HTML.
- This comment is **not review feedback**. It is posted with the author's own token, so authorship cannot
  tell it apart from a real comment; the marker `katana:review-visual` is the only reliable signal. When
  addressing review comments, skip any comment whose body contains it. The host repo's `AGENTS.md` (or
  `CLAUDE.md`) should carry that rule; `setup-katana-skills` writes it.
