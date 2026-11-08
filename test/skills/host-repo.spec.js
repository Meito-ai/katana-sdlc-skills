import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const SKILLS = new URL('../../src/skills/', import.meta.url);
const read = (path) => readFileSync(new URL(path, SKILLS), 'utf8');
const prose = (path) => read(path).replace(/\s+/g, ' ');

// The skills that read the host repo's knowledge base.
const KNOWLEDGE_BASE_READERS = [
  'sdlc/feature-management/bug-intake',
  'sdlc/feature-management/build-up-spec',
  'sdlc/feature-management/slice-spec',
  'sdlc/implementation/implement-issue',
].map((path) => ({
  name: path.split('/').pop(),
  text: read(`${path}/SKILL.md`),
}));

// The skills that read or write a Backlog: or WSJF scope: line, a tracker line.
const TRACKER_LINE_USERS = [
  'sdlc/feature-management/bug-intake',
  'sdlc/feature-management/build-up-spec',
  'sdlc/feature-management/wsjf',
];

/** The paragraph (or list item and its continuation lines) holding `needle`. */
function paragraph(text, needle) {
  const at = text.indexOf(needle);
  if (at === -1) return undefined;
  const start = text.lastIndexOf('\n\n', at);
  const end = text.indexOf('\n\n', at);
  return text.slice(start === -1 ? 0 : start, end === -1 ? undefined : end);
}

describe('the knowledge base', () => {
  test('a reader resolves it from the line, then AGENTS.md / CLAUDE.md, then docs/', () => {
    for (const { name, text } of KNOWLEDGE_BASE_READERS) {
      const lookup = paragraph(text, '`Knowledge base:`');
      assert.ok(lookup, `${name} does not read the Knowledge base line`);
      const order = ['`Knowledge base:`', '`AGENTS.md` / `CLAUDE.md`', '`docs/`'].map((step) => lookup.indexOf(step));
      assert.ok(order.every((at) => at >= 0), `${name} does not name every place in the lookup`);
      assert.deepEqual([...order].sort((a, b) => a - b), order, `${name} looks in the wrong order`);
    }
  });

  test('a reader never asks the user, and says so when there is none', () => {
    for (const { name, text } of KNOWLEDGE_BASE_READERS) {
      const lookup = paragraph(text, '`Knowledge base:`');
      assert.doesNotMatch(lookup, /ask the user/, `${name} asks where the knowledge base lives`);
      assert.match(lookup, /without (a|one)[^.]*say so/, `${name} does not carry on without one and say so`);
    }
  });

  test('setup-katana-skills writes the line from AGENTS.md / CLAUDE.md or docs/', () => {
    const question = read('setup-katana-skills/SKILL.md')
      .split(/\n(?=\d+\. \*\*)/)
      .find((item) => item.startsWith('11. **Knowledge base**'));
    assert.ok(question, 'setup has no Knowledge base question');
    assert.match(question.replace(/\s+/g, ' '), /`AGENTS\.md` \/ `CLAUDE\.md`[^.]*`docs\/`/);
    assert.doesNotMatch(question, /asks/);
  });
});

describe('tracker lines in a public repo', () => {
  const issueTracker = read('sdlc/feature-management/issue-tracker/SKILL.md');

  test('issue-tracker stops and asks before writing one into a committed file of a public repo', () => {
    const start = issueTracker.indexOf('\n## Tracker lines\n');
    assert.notEqual(start, -1, 'issue-tracker has no "## Tracker lines" section');
    const rules = issueTracker.slice(start, issueTracker.indexOf('\n## ', start + 1)).replace(/\s+/g, ' ');
    assert.match(rules, /public/);
    assert.match(rules, /stop and ask where to write it/);
    assert.match(rules, /`Tracker lines: local, see <file>`/);
  });

  test('every skill that reads or writes a tracker line finds it through issue-tracker', () => {
    for (const path of TRACKER_LINE_USERS) {
      assert.match(read(`${path}/SKILL.md`), /\]\(\.\.\/issue-tracker\/SKILL\.md#tracker-lines\)/, `${path} places tracker lines itself`);
    }
  });

  test('setup-katana-skills checks visibility and offers a local file that git ignores', () => {
    const setup = prose('setup-katana-skills/SKILL.md');
    assert.match(setup, /gh repo view --json visibility/);
    assert.match(setup, /glab repo view/);
    assert.match(setup, /`CLAUDE\.local\.md`/);
    assert.match(setup, /`Tracker lines: local, see <file>`/);
  });
});
