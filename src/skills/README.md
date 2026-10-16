# Authored skills

The skills this repo publishes. One directory per skill:

```
src/skills/<name>/SKILL.md
src/skills/<category>/<name>/SKILL.md      # nesting is allowed
```

No per-skill `apm.yml` is needed — apm synthesises the metadata — unless the skill invokes an
upstream skill: then it declares that dependency in its own `apm.yml` (see `AGENTS.md`).

Two rules, enforced by `npm run validate-skills` (and by CI):

1. The `SKILL.md` frontmatter `name:` must equal its directory name, and the
   frontmatter must be ASCII-only. apm requires both.
2. Every skill needs a matching `- ./src/skills/<path>` entry under
   `devDependencies` in the root `apm.yml`. Without it, `apm install` does not
   deploy the skill into `.claude/skills/`, so you cannot use or test your own
   skill in this repo while authoring it.

Consumers install a skill by its subpath at a tag — see the root README.
