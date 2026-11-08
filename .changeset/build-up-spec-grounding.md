---
"katana-sdlc-skills": patch
---

`build-up-spec` now checks the draft before it shows you the preview. It re-reads each statement of the problem, the implementation decisions and the testing seams against its source, and checks the decisions against your knowledge base's release and compatibility rules. The preview lists every correction it made, and asks you about any correction that would change a decision you already accepted. Grilling also covers a new **Rollout** branch: what existing users must change, install or rerun once the work ships, and the release impact that follows from it.
