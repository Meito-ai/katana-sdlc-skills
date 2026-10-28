# Changesets

This directory holds in-flight changesets. Each is a small markdown file
describing a pending change; `npm run version` consumes them, bumps
`package.json`, writes `CHANGELOG.md`, and syncs the new version into
`apm.yml`.

Why the repo has npm tooling at all, given it ships only markdown: `apm.yml`
*requires* a semver `version:`, and consumers pin this repo by git tag.
Something has to own bumping that number and explaining what changed between
tags. That is all changesets does here -- nothing is published to npm
(`"private": true`).

Workflow:

```bash
npm run changeset      # describe your change (patch/minor/major), on your feature branch
```

Cutting a release (consuming these files, tagging `main` after the release PR merges) is the
"Releasing" section of `AGENTS.md`.
