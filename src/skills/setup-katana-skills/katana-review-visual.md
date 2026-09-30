# Seed: `docs/agents/katana-review-visual.md`

Written by step 6 of [SKILL.md](SKILL.md). Fill every `{{...}}` (a `<...>` is literal text; keep it).
`{{skill-dir}}` is the deployed skill directory that exists in this repo: `.agents/skills/review-visual`
when the `agent-skills` target is on, else `.claude/skills/review-visual`.

````markdown
# Review visual (review-visual)

An optional sticky PR comment showing a change's behavioral delta: a Mermaid diagram or control-flow
diff for the human reviewer. The `review-visual` skill composes it. Written by `/setup-katana-skills`;
edit freely.

## When

After `gh pr create`, once local `HEAD` is pushed. Re-run the same command after each later push: it
patches the same comment. Nothing fails when it is skipped.

## Commands

```bash
node {{skill-dir}}/scripts/cli.mjs post --body <file>          # post or refresh the visual
node {{skill-dir}}/scripts/cli.mjs post --no-delta "<reason>"  # the change has no behavioral delta
```

Keep `<file>` outside the repo; the visual is never committed and never goes into the PR description.

## Requirements

- `gh`, authenticated (`gh auth status`): the comment goes through the GitHub API.
- Node.js >= 20 on the machine. The scripts are dependency-free, so this repo needs no `package.json`.

## The marker

Every visual carries `<!-- katana:review-visual:v1 -->`. It is posted with the author's own token, so
the marker is the only thing that tells it apart from real review feedback; agents skip any comment
containing `katana:review-visual` when addressing review comments.
````
