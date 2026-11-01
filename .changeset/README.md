# Changesets

This directory holds in-flight changesets. Each is a small markdown file
describing a pending change; its text becomes the release note, verbatim, in
`CHANGELOG.md` and the GitHub Release.

Why the repo has npm tooling at all, given it ships only markdown: `apm.yml`
*requires* a semver `version:`, and consumers pin this repo by git tag.
Something has to own bumping that number and explaining what changed between
tags. That is all changesets does here -- nothing is published to npm
(`"private": true`).

Workflow:

```bash
npm run changeset          # describe your change (patch/minor/major), on your feature branch
npx changeset --empty      # a PR that intentionally releases nothing
```

How to word a changeset and pick its bump is "Writing a changeset" in
`AGENTS.md`. Releasing is automatic: merging to `main` refreshes the Version
Packages PR, and merging that PR tags and publishes the release ("Releasing"
in `AGENTS.md`).
