import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// The katana block's E2E:, Mutation: and Formal model: lines are prose the agent follows.
// These checks keep each rule in the step that applies it (MEI-215, AC1-AC8).

const read = (path) => readFileSync(new URL(`../../src/skills/${path}`, import.meta.url), 'utf8');

/** A `## <n>. <title>` step of a SKILL.md, up to the next `## ` heading, whitespace collapsed. */
function step(markdown, title) {
  const start = markdown.indexOf(`\n## ${title}`);
  assert.notEqual(start, -1, `no "## ${title}" step`);
  const end = markdown.indexOf('\n## ', start + 1);
  return markdown.slice(start, end === -1 ? undefined : end).replace(/\s+/g, ' ');
}

const IMPLEMENT = read('sdlc/flows/implement-issue/SKILL.md');
const BUILD_UP_SPEC = read('sdlc/flows/build-up-spec/SKILL.md');

const TRIGGER = /concurrency, distributed state, a protocol or a state machine/;

describe('implement-issue reads the repo facts', () => {
  const facts = step(IMPLEMENT, '4. Read the repo facts');

  test('AC1: records E2E: and Mutation: the way it records Checks:, confirming them once', () => {
    assert.match(facts, /`E2E:`/);
    assert.match(facts, /`Mutation:`/);
    assert.match(facts, /confirm them with the user once/);
    assert.match(facts, /record them as that line/i);
    assert.match(facts, /`Checks:`, `E2E:` and `Mutation:`/);
  });

  test('AC2: records "none" when the repo has no such tool', () => {
    assert.match(facts, /no e2e or mutation tool[^.]*`none`/i);
  });

  test('never infers the Formal model: line, which is recorded at the gate', () => {
    assert.match(facts, /`Formal model:`[^.]*gate/);
  });
});

describe('the design step drafts a formal model', () => {
  const design = step(IMPLEMENT, '6. Settle the design');

  test('AC3: implement-issue drafts one in the tool the Formal model: line names', () => {
    assert.match(design, TRIGGER);
    assert.match(design, /tool the `Formal model:` line names/);
  });

  test('AC5: checks the model before the gate and shows the result there', () => {
    assert.match(design, /check the model before the gate/i);
    assert.match(design, /result[^.]*gate|gate[^.]*result/i);
  });

  test('AC6: a passing check adds an acceptance criterion per invariant, covered by a property test', () => {
    assert.match(design, /passes[^.]*criterion for each invariant[^.]*property test/i);
  });

  test('AC7: a counterexample is shown at the gate and the design revised before approval', () => {
    assert.match(design, /counterexample[^.]*show[^.]*gate[^.]*revise the design[^.]*before approval/i);
  });

  test('AC8: a missing Formal model: line is asked for at the gate and recorded', () => {
    assert.match(design, /no `Formal model:` line[^.]*ask for the tool at the gate[^.]*record/i);
  });
});

describe('build-up-spec drafts a formal model', () => {
  const requirements = step(BUILD_UP_SPEC, '5. Requirements');
  const preview = step(BUILD_UP_SPEC, '8. Preview and publish');

  test('AC4: drafts it the same way when the change involves one of the triggers', () => {
    assert.match(requirements, TRIGGER);
    assert.match(requirements, /tool the `Formal model:` line names/);
    assert.match(requirements, /property test/i);
  });

  test('AC5, AC7: the preview shows the check result, and a counterexample revises the design', () => {
    assert.match(preview, /formal model/i);
    assert.match(preview, /counterexample/i);
  });

  test('AC8: a missing line is asked for in the preview and recorded', () => {
    assert.match(preview, /no `Formal model:` line[^.]*ask for the tool[^.]*record/i);
  });

  test('a design-deferred run drafts no model', () => {
    assert.match(requirements, /Design deferred[^]*no formal model/i);
  });
});
