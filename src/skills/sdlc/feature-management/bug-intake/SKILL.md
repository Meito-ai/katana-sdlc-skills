---
name: bug-intake
description: "Turn a bug report into an agent-sized issue: check for duplicates, reproduce it, ask the reporter for what is missing, and publish the fix as EARS criteria with the seam the failing test attaches at."
disable-model-invocation: true
---

# Bug intake

Turn a **bug report** (something that worked, or should work, and doesn't) into an issue that one
fresh agent session can fix and verify. The issue uses `slice-spec`'s
[issue template](../slice-spec/issue-template.md): `Current behaviour` is the **reproduction**,
`What to build` is the fixed behaviour, and the criteria follow `slice-spec`'s [EARS rules](../slice-spec/ears.md).

Intake ends at the reproduction. Finding the root cause, and the fix itself, belong to the
implementer (`diagnosing-bugs`, when it is installed). A new feature or an improvement is
`build-up-spec`'s work: say so, and point the user to it.

Every statement in the issue is **sourced**: it comes from the report, the reproduction, the codebase,
the knowledge base, or the user's own answer. A gap becomes a **placeholder** (`[add expected
behaviour]`, `[add version]`, …).

The duplicate check, the three reproduction outcomes and the triage notes are adapted from the
`triage` skill of `mattpocock/skills` at `f3fc5632` ([licence](LICENSE-mattpocock-skills)).

## Requirements

- **`slice-spec` and `wsjf`**, the katana skills this one uses: `slice-spec` for the issue template
  and EARS rules, `wsjf` for the score. `setup-katana-skills` installs them along with this one; when
  installing by hand, add both.
- **A tracker tool**: a Linear MCP, or `gh` for GitHub issues. Without one, step 6 hands the issue
  back as text to paste.

## 1. Read the input

Check that `slice-spec` and `wsjf` are each deployed (under `.claude/skills/<name>/` or
`.agents/skills/<name>/`). If either is missing, stop and name it, with the line that installs it.

Sort what the user gave:

- **Free text**: the report.
- **A tracker item** (an identifier or a URL): the report, which this run **updates in place**. Fetch
  its title, description, comments, labels, reporter and attachments. When it carries triage notes
  from an earlier run, see [Resuming](#resuming).
- **A URL or a file**: a source (a log, a screenshot, a stack trace, a support thread). Read it; its
  facts count as sourced and are cited under `## Sources`.
- **A feature request**: stop, as described above.

Restate the report in four parts, each statement with its source or as a placeholder: **steps** to
trigger it, **expected** behaviour, **actual** behaviour, and **environment** (version, platform,
data, account). Show the restatement to the user so they can strike anything wrong.

Done when every part of the input has been sorted, every source has been read, and the user has seen
the restatement.

## 2. Explore

- **Knowledge base**: what `AGENTS.md` / `CLAUDE.md` says about it, then the `Knowledge base:` line
  in the `## Katana skills` block, then a shallow look through `README` and `docs/`, telling the user
  that this last one was a guess. Read the glossary terms and recorded decisions the report touches,
  and the repo's definition of done if it has one.
- **Code**: the area the report touches, and the tests that already cover it. Explore it in this
  session rather than in a sub-agent: steps 3 and 4 build on what is read here.
- **Already works**: search the code and its tests for the expected behaviour by domain concept, not
  just the report's wording, and report where you looked. A passing test or a code path that already
  produces the expected behaviour is a match.
- **Duplicates**: search the tracker for open issues using the report's key terms (in the team named
  on the `Backlog:` line, or across the whole workspace), leaving out the item this run updates.

Show every match. For a duplicate, the user picks:

- **refine it**: the open issue becomes the item this run updates in place;
- **link it** as related, written in step 6;
- **mark the report as its duplicate**, which ends the run. For a tracker item, preview the duplicate
  relation and set it on the user's yes (on GitHub, a `Duplicate of #<n>` comment);
- **carry on**.

For behaviour that already works, the user picks:

- **close the report as working**, which ends the run. For a tracker item, preview a comment pointing
  to the passing test or code path, and post it on the user's yes;
- **carry on**: the report may describe a case the match doesn't cover.

Done when the knowledge base has been located (or the guess reported), the code and its tests have
been read, and the user has decided on every match.

## 3. Reproduce

Follow the report's steps in the cheapest way that still exercises the reported path: run the
command, call the public interface from a scratch script or a throwaway test, query the data. Scratch
files go in a temporary directory outside the repo, so the working tree ends as it started.

Report one outcome, with its evidence:

- **Confirmed**: the observed output against the expected one, and the **code path**: the entry point
  the steps go through and the interface where the wrong behaviour first shows. Stop there; why it
  happens is the implementer's question.
- **Failed**: the steps ran and the behaviour was correct. List what was tried and in what
  environment.
- **Insufficient detail**: the steps can't be run as written. Name each missing fact.

When the user supplies the missing detail now, fold it into the restatement and reproduce again.
Otherwise:

- **Confirmed** goes to step 4.
- **Insufficient detail** goes to step 5.
- **Failed**: the user picks step 5 (ask the reporter for the condition that differs), or stopping (the
  report doesn't hold; for a tracker item, offer to post what was tried as a comment).

Done when the outcome has been reported with its evidence, and the user has chosen the next step.

## 4. Specify the fix

Draft the issue from the [issue template](../slice-spec/issue-template.md):

- **Title**: the fixed behaviour, in the knowledge base's vocabulary.
- **What to build**: the fixed behaviour from the user's point of view.
- **Current behaviour**: the confirmed reproduction: the steps, the observed and the expected
  behaviour, and the code path, named by its interfaces rather than its files.
- **Key interfaces**: the types, signatures or config the fix is expected to touch, when the
  reproduction showed them.
- **Testing seams**: where the failing test attaches: the highest public interface that reaches the
  wrong behaviour, with prior art from the tests read in step 2. Prefer one seam.
- **Acceptance criteria**, following the EARS rules: the fixed behaviour, false today because the
  reproduction shows it failing. Every When gets an If. Add a `(guard)` for neighbouring behaviour
  the fix must keep, when step 2 found one at risk.
- **Out of scope**: other defects noticed on the way, and any redesign beyond the fix.
- **Sources**: the report, each source read, and the reproduction (what was run, and when).
- **WSJF**: a bug fix passes `wsjf`'s story test, since shipped alone it restores behaviour someone
  relies on. Invoke `wsjf` on the draft, telling it the item is still being drafted so that it returns
  the block instead of writing it.

Confirm the draft with the user in a single round.

Done when the user has accepted the draft, every criterion sits under a seam, and the WSJF section is
filled.

## 5. Ask the reporter

Draft the issue with what is established: `Current behaviour` is the report as restated, headed
`Unconfirmed:`, and every criterion that depends on a missing fact keeps its placeholder. Then draft
the **triage notes**:

```markdown
## Triage notes

**Reproduction:** <failed | insufficient detail>, <date>. <what was tried, in what environment>

**What we've established so far:**

- <fact, with its source>

**What we still need from you (<reporter's handle>):**

- <question>
```

List under "established" everything settled so far, answers from earlier rounds included, so the
work isn't lost. Each question is specific and actionable: it names the missing fact and how to get
it ("Which version does `app --version` print?"), never "please provide more info".

Done when every missing fact from step 3 (or, after a failed reproduction, each condition that may
differ from the reporter's) has a question, and the user has seen the issue and the notes.

## 6. Preview and publish

1. **Target.** Read the `Backlog:` line in the `## Katana skills` block: a team and a project, or a
   GitHub repo. Propose it, and let the user change it for this issue.
   - When there is no such line, ask, listing the teams and projects through the tracker tool. Write
     the answer as the `Backlog:` line under `### Backlog items` in that block.
   - When the user changes the default, update the line.
   - Write to every file `setup-katana-skills` writes the block to: `AGENTS.md`, and `CLAUDE.md` when
     it exists and never references `AGENTS.md`. If the block doesn't exist in one, create it there
     (markers, heading and subsection).
   - Leave the change uncommitted. It is the run's only write to the repo; everything else lands in
     the tracker.
2. **Labels.** Only these two, added to whatever the item already carries:
   - `ready-for-agent` after step 4, or `needs-info` after step 5. Moving to `ready-for-agent`
     removes `needs-info`.
   - The team's `bug` type label: its label named `bug` (any case). When it is missing, offer once to
     create it, and create it only on the user's yes.

   When the repo has `docs/agents/triage-labels.md`, use the strings it maps these labels to. Leave the
   tracker's own priority field unchanged: the WSJF block is the ranking.
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
After step 5, also report the command that resumes the issue once the reporter answers:
`/bug-intake <issue id>`.

## Resuming

A tracker item that already carries `## Triage notes` comments resumes where they left off:

- Read every set of notes and every comment after the latest one. A question the reporter has answered
  moves to "established", with the answer as its source. Ask only the questions still open.
- Show the user the updated picture before step 2, then run the steps again: step 3 reproduces with the
  new detail.
- Still blocked: post new notes carrying everything established and only the open questions.
- Reproduced: rewrite the description through step 4, and move the issue from `needs-info` to
  `ready-for-agent`.
