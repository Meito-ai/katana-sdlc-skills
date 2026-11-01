---
"katana-sdlc-skills": patch
---

`setup-katana-skills` handles more of what a real repo already has:

- **Per-path upstream pins.** Entries like `mattpocock/skills/skills/<category>/<name>#<ref>` do not
  override the upstream a katana skill declares, so apm installed a second copy and deployed the same
  skill twice. Setup now detects them and offers to convert them into one `git:` entry with a
  `skills:` list, at a release tag that satisfies the declared range.
- **Same-name local skills.** A local skill (e.g. `.apm/skills/branch-shutdown`) with the same name as a
  katana skill blocked the katana copy: apm kept the old deployed files as user-edited. Setup now offers
  to remove the local skill, its directory, and its deployed output before installing.
- **Verified install.** Step 5 now ends with `apm install --frozen` exiting 0, one lock package per
  upstream, and no lock entry left for a removed skill. When a check fails, setup regenerates the lock
  and warns that its diff will be large. The report includes the result.
- **Bootstrap line.** The `### Worktrees` bootstrap sentence can name files to symlink from a sibling
  worktree, and a condition on a copy.
