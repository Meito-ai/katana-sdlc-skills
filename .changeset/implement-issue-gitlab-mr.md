---
"katana-sdlc-skills": patch
---

`implement-issue` now opens a merge request when your `origin` is on GitLab, instead of handing back
the branch to paste. The description carries the link text your tracker's adapter gives for that code
host, and ends with `Close <id> on merge` where merging cannot close the item (a Jira issue, or a
GitHub issue from a GitLab merge request). If the merge request cannot be opened, it reports the
failing command and hands back the branch, its base and the description.
