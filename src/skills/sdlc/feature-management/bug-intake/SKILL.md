---
name: bug-intake
description: "Turn a bug report into an agent-sized issue: check for duplicates, reproduce it, rate its severity, ask the reporter for what is missing, and publish the fix as EARS criteria with the seam the failing test attaches at."
disable-model-invocation: true
---

# Bug intake

Turn a **bug report** (something that worked, or should work, and doesn't) into an issue one fresh
agent session can fix and verify, in `slice-spec`'s [issue template](../slice-spec/issue-template.md)
with criteria under its [EARS rules](../slice-spec/ears.md). Intake ends at the **reproduction**: the
root cause and the fix belong to the implementer (`diagnosing-bugs`, when installed). A feature
request or an improvement is `build-up-spec`'s work: say so, and point the user to it.

Every statement in the issue is **sourced**: from the report, the reproduction, the codebase, the
knowledge base, or the user's own answer. A gap becomes a **placeholder** (`[add version]`, …).

The duplicate check, the three reproduction outcomes and the triage notes are adapted from the
`triage` skill of `mattpocock/skills` at `f3fc5632` ([licence](LICENSE-mattpocock-skills)).

## Requirements

- **`slice-spec` and `wsjf`**, the katana skills this one uses. `setup-katana-skills` installs them
  with this one. If either is missing, stop and name it, with the line that installs it.
- **A tracker tool**: a Linear MCP, or `gh` for GitHub issues. Without one, step 6 hands the issue
  back as text.

## 1. Read the input

- **Free text**: the report.
- **A tracker item** (an identifier or a URL): the report, which this run **updates in place**. Fetch
  its title, description, comments, labels, reporter and attachments. If it carries triage notes, see
  [Resuming](#resuming).
- **A URL or a file**: a source (a log, a screenshot, a stack trace, a support thread). Its facts
  count as sourced and are cited under `## Sources`.
- **A feature request**: stop, as above.

Restate the report as **steps**, **expected**, **actual** and **environment** (version, platform,
data, account), each statement sourced or a placeholder, and show it to the user to strike anything
wrong.

Done when every source has been read and the user has seen the restatement.

## 2. Explore

- **Knowledge base**: where `AGENTS.md` / `CLAUDE.md`, or the `Knowledge base:` line in the
  `## Katana skills` block, says it lives. When neither says, ask the user where it is, or whether
  there is none, and record the answer as that line (see [Repo choices](#repo-choices)). Read the
  glossary terms, decisions and definition of done the report touches.
- **Code**: the area the report touches and the tests that cover it, read in this session rather than
  in a sub-agent: steps 3 and 4 build on it.
- **Already works**: search the code and tests for the expected behaviour by domain concept, not just
  the report's wording, and report where you looked. A passing test or a code path that already
  produces it is a match.
- **Duplicates**: search the tracker's open issues for the report's key terms (in the `Backlog:`
  line's team, or the whole workspace), leaving out the item this run updates.

Show every match, and let the user pick:

- For a **duplicate**: **refine it** (it becomes the item updated in place), **link it** as related
  (written in step 6), **mark the report as its duplicate**, or **carry on**. Marking ends the run: for
  a tracker item, preview the relation and set it on the user's yes (on GitHub, a `Duplicate of #<n>`
  comment).
- For behaviour that **already works**: **close the report as working**, or **carry on**, since the
  report may describe a case the match misses. Closing ends the run: for a tracker item, preview a
  comment naming the passing test or code path, and post it on the user's yes.

Done when the knowledge base is located or recorded as none, the code and its tests have been read,
and the user has decided on every match.

## 3. Reproduce

Follow the report's steps the cheapest way that still exercises the reported path: run the command,
call the public interface from a scratch script or a throwaway test, query the data. Scratch files go
in a temporary directory outside the repo.

Report one outcome with its evidence:

- **Confirmed**: the observed output against the expected one, and the **code path**: the entry point
  and the interface where the wrong behaviour first shows. Why it happens is the implementer's
  question. Go to step 4.
- **Insufficient detail**: the steps can't be run as written. Name each missing fact, and go to step 5.
- **Failed**: the steps ran and behaved correctly. List what was tried and where. The user picks step 5
  (ask for the condition that differs) or stopping (for a tracker item, offer to post what was tried).

When the user supplies the missing detail now, fold it into the restatement and reproduce again.

Done when the outcome has been reported with its evidence, and the next step is chosen.

## 4. Specify the fix

Draft the issue from the template:

- **Title** and **What to build**: the fixed behaviour from the user's point of view, in the knowledge
  base's vocabulary.
- **Current behaviour**: a `Severity:` line, the [level](#severity) with its reach and a one-line
  rationale (`Severity: High. Reach: every user who exports a report. The export fails and nothing
  else produces the file.`). Then the reproduction: the steps, the observed and expected behaviour,
  and the code path, named by its interfaces.
- **Key interfaces**: the types, signatures or config the reproduction showed the fix touching.
- **Testing seams**: the highest public interface that reaches the wrong behaviour, with prior art
  from the tests read in step 2. Prefer one.
- **Acceptance criteria**: the fixed behaviour, false today as the reproduction shows, plus a
  `(guard)` for neighbouring behaviour that step 2 found at risk.
- **Out of scope**: other defects noticed on the way, and any redesign beyond the fix.
- **Sources**: the report, each source read, and the reproduction (what was run, and when).
- **WSJF**: invoke `wsjf` on the draft with its severity and reach, telling it the item is still
  being drafted so that it returns the block without asking the user. For a **Critical** bug, also
  tell the user it should be fixed now rather than wait for its rank.

Confirm the draft with the user in a single round, showing the WSJF score as `wsjf`'s
[For calling skills](../wsjf/SKILL.md#for-calling-skills) says: each input with its rationale, and the
rank. An edit to a WSJF input goes back to `wsjf`.

Done when the user has accepted the draft, the severity has a level, every criterion sits under a
seam, and the WSJF section is filled.

## 5. Ask the reporter

Draft the issue with what is established: `Current behaviour` is the restated report headed
`Unconfirmed:`, its `Severity:` line is the level the report describes or a placeholder, and every
criterion that depends on a missing fact keeps its placeholder. Then draft the **triage notes**:

```markdown
## Triage notes

**Reproduction:** <failed | insufficient detail>, <date>. <what was tried, in what environment>

**What we've established so far:**

- <fact, with its source>

**What we still need from you (<reporter's handle>):**

- <question>
```

"Established" carries everything settled so far, earlier rounds included, so the work isn't lost.
Each question names the missing fact and how to get it ("Which version does `app --version` print?"),
never "please provide more info".

Done when every missing fact (after a failed reproduction, every condition that may differ from the
reporter's) has a question, and the user has seen the issue and the notes.

## 6. Preview and publish

1. **Target**: the `Backlog:` line, a team and a project or a GitHub repo, which the user may change
   for this issue. With no line, ask, listing the teams and projects through the tracker tool. Record
   a new or changed default (see [Repo choices](#repo-choices)).
2. **Labels.** Only these two, added to whatever the item already carries:
   - `ready-for-agent` after step 4, or `needs-info` after step 5. Moving to `ready-for-agent`
     removes `needs-info`.
   - The team's `bug` type label: its label named `bug` (any case). When it is missing, offer once to
     create it, and create it only on the user's yes.

   When `AGENTS.md` / `CLAUDE.md` or the knowledge base maps these labels to other names, use those.
   Leave the tracker's priority field unchanged: the WSJF block is the ranking.
3. **Preview** exactly what will be written: the title, the body, the labels, the related and duplicate
   links, the triage notes, the target, and, for an item updated in place, what changes. Ask once:
   _publish / edit_.
4. **Write.**
   - On **Linear**: for an item updated in place, first post its original title and description as a
     comment (`Original before bug-intake, <date>`). Create or update the issue with `save_issue`
     (title, description, team, project, labels, `relatedTo`), leaving the state at the team's
     default. Post the triage notes with `save_comment`.
   - On **GitHub**: `gh issue create` or `gh issue edit`, with `--label`, and a `Related: #<n>` line
     at the end of the body for each related issue. Post the original and the triage notes with
     `gh issue comment`.
   - With **no tracker tool**: hand back the issue and the notes as text.

Done when every write has succeeded and its link has been reported, or the text has been handed back.
After step 5, also report the command that resumes once the reporter answers: `/bug-intake <issue id>`.

## Resuming

A tracker item carrying `## Triage notes` comments resumes from them. Read every set of notes and the
comments after the latest: an answered question moves to "established", with the answer as its source,
and only the open ones are asked again. Show the user the updated picture, then run the steps again
from step 2. Still blocked: post new notes. Reproduced: rewrite the description through step 4, and
move the issue from `needs-info` to `ready-for-agent`.

## Repo choices

The `Knowledge base:` and `Backlog:` lines sit under `### Backlog items` in the `## Katana skills`
block. Write them to every file `setup-katana-skills` writes the block to: `AGENTS.md`, and
`CLAUDE.md` when it exists and never references `AGENTS.md`. Where the block is missing, create it
(markers, heading and subsection). Leave the change uncommitted: these lines are the run's only writes
to the repo.

## Severity

What breaks when the bug fires, as the reproduction showed it:

| Level | Situation |
|---|---|
| **Critical** | data is lost or corrupted, access control is bypassed, or the product can't be used at all, with no workaround |
| **High** | a core workflow fails for whoever reaches it, with no workaround |
| **Medium** | a workflow fails but a workaround exists, or a feature outside the core workflows fails |
| **Low** | the result is correct; only its presentation or wording is wrong |

The level measures what breaks, and only that. Who hits the bug and how often is its **reach**,
written beside the level: a Critical bug that one account hits is still Critical, and `wsjf` scores
the reach as value. When what was observed fits two levels, let the user pick.
