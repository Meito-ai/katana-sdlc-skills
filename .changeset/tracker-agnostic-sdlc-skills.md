---
"katana-sdlc-skills": minor
---

`build-up-spec`, `slice-spec`, `bug-intake`, `wsjf` and `implement-issue` now need `issue-tracker`, a new
skill that holds every tracker read and write they make. **Rerun `/setup-katana-skills`** after
upgrading: it adds `issue-tracker` to your `apm.yml` and a `### Issue tracker` subsection to your
`## Katana skills` block. If you already file into Linear or GitHub, your `Backlog:` or `WSJF scope:`
line settles the tracker, so you are not asked to choose it again.
