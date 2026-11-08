import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// The design-deferred run is prose the agent follows. These checks keep each
// of its rules in the step that applies it.

// The design placeholders, as MEI-194 names them.
const DESIGN_PLACEHOLDERS = ['[add testing seams]', '[add implementation decisions]', '[add key interfaces]'];

const read = (path) => readFileSync(new URL(`../../src/skills/sdlc/feature-management/${path}`, import.meta.url), 'utf8');

/** A `## <n>. <title>` step of a SKILL.md, up to the next `## ` heading. */
function step(markdown, title) {
  const start = markdown.indexOf(`\n## ${title}`);
  assert.notEqual(start, -1, `no "## ${title}" step`);
  const end = markdown.indexOf('\n## ', start + 1);
  return markdown.slice(start, end === -1 ? undefined : end);
}

const BUILD_UP_SPEC = read('build-up-spec/SKILL.md');
const SLICE_SPEC = read('slice-spec/SKILL.md');

describe('build-up-spec with design deferred', () => {
  test('writes every design placeholder', () => {
    const requirements = step(BUILD_UP_SPEC, '5. Requirements');
    for (const placeholder of DESIGN_PLACEHOLDERS) assert.ok(requirements.includes(`\`${placeholder}\``), placeholder);
  });

  test('skips the Interfaces branch while grilling', () => {
    assert.match(step(BUILD_UP_SPEC, '4. Grill'), /\*\*Interfaces\*\*[^\n]*design is deferred[^\n]*skip/i);
  });

  test('decides the deferral while reading the input', () => {
    assert.match(step(BUILD_UP_SPEC, '1. Read the input'), /design-deferred/i);
  });

  test('labels the item with labels.mjs, passing the deferral on', () => {
    assert.match(step(BUILD_UP_SPEC, '8. Preview and publish'), /scripts\/labels\.mjs plan[^`]*--deferred <yes\|no>/);
  });

  test('stops a needs-design item before offering to slice it', () => {
    const publish = step(BUILD_UP_SPEC, '8. Preview and publish');
    assert.ok(publish.indexOf('`/build-up-spec <item id>`') < publish.indexOf('slice it now?'));
  });
});

// The checks an earlier run missed: a release bump that broke the knowledge
// base's bump table, and a new skill consumers would not receive.
describe('build-up-spec grounding and rollout', () => {
  test('grills a Rollout branch that settles the release impact', () => {
    assert.match(step(BUILD_UP_SPEC, '4. Grill'), /\*\*Rollout\*\*[\s\S]*release\s+or\s+compatibility\s+rules/);
  });

  test('grounds every statement before the preview, and the preview shows the corrections', () => {
    const publish = step(BUILD_UP_SPEC, '8. Preview and publish');
    assert.match(publish, /1\. \*\*Ground\.\*\*/);
    assert.ok(publish.indexOf('**Ground.**') < publish.indexOf('**Preview.**'));
    assert.match(publish, /\*\*Preview\.\*\*[\s\S]*corrections\s+grounding made/);
  });
});

// The user is asked in grilling's rounds and in the preview, nowhere between.
describe('build-up-spec asks in two places', () => {
  test('steps 1 to 3 queue their questions for grilling\'s first round', () => {
    for (const title of ['1. Read the input', '2. Explore']) {
      assert.match(step(BUILD_UP_SPEC, title), /grilling's first round/, title);
    }
    assert.match(step(BUILD_UP_SPEC, '3. Enrich'), /grilling's first round opens with\s+this list/);
    assert.match(step(BUILD_UP_SPEC, '4. Grill'), /\*\*first round\*\*/);
  });

  test('drafts requirements and framing without a round of their own', () => {
    assert.doesNotMatch(step(BUILD_UP_SPEC, '5. Requirements'), /confirm it with the user/);
    assert.match(step(BUILD_UP_SPEC, '6. Frame the outcome'), /still being drafted/);
  });

  test('routes a preview edit back to the step that owns it', () => {
    const publish = step(BUILD_UP_SPEC, '8. Preview and publish');
    assert.match(publish, /An edit goes back to the step that owns it/);
    assert.match(publish, /publishing creates it/);
  });
});

describe('the skills build-up-spec drafts with', () => {
  const OUTCOME_FRAMING = read('outcome-framing/SKILL.md');
  const WSJF = read('wsjf/SKILL.md');
  const callers = WSJF.slice(WSJF.indexOf('\n## For calling skills'));

  test('outcome-framing skips its verification round for a drafted epic', () => {
    const verify = OUTCOME_FRAMING.slice(OUTCOME_FRAMING.indexOf('\n### 7. Verify'), OUTCOME_FRAMING.indexOf('\n## Output block'));
    assert.match(verify, /For a \*\*drafted\*\* epic, skip the round/);
  });

  test('wsjf hands cold-start anchors back with a drafted target, in the compact form', () => {
    assert.match(WSJF, /Skip the round for it,\s+and for the cold-start anchors/);
    assert.match(callers, /WSJF 8\.1 \(1st of 4\) · BV 13/);
    assert.match(callers, /Anchors \(new, written back on publish\)/);
    assert.match(callers, /with `upsert` on the anchor's current description/);
  });

  test('wsjf flags weak anchors and a provisional rank', () => {
    assert.match(WSJF, /\*\*weak\s+anchor\*\*/);
    assert.match(callers, /provisional: weak anchors/);
  });
});

describe('slice-spec', () => {
  test('stops on an epic labelled needs-design and names build-up-spec as the next step', () => {
    const gather = step(SLICE_SPEC, '1. Gather the epic');
    assert.match(gather, /`needs-design`/);
    assert.match(gather, /`\/build-up-spec <epic[^`]*>`/);
  });
});
