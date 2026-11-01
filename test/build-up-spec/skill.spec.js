import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { DESIGN_PLACEHOLDERS } from '../../src/skills/sdlc/feature-management/build-up-spec/scripts/labels.mjs';

// The design-deferred run is prose the agent follows. These checks keep that
// prose in step with what labels.mjs detects, and keep each rule in its step.

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
  test('writes every design placeholder that labels.mjs detects', () => {
    const requirements = step(BUILD_UP_SPEC, '5. Requirements');
    for (const placeholder of DESIGN_PLACEHOLDERS) assert.ok(requirements.includes(`\`${placeholder}\``), placeholder);
  });

  test('skips the Interfaces branch while grilling', () => {
    assert.match(step(BUILD_UP_SPEC, '4. Grill'), /\*\*Interfaces\*\*[^\n]*design is deferred[^\n]*skip/i);
  });

  test('decides the deferral while reading the input', () => {
    assert.match(step(BUILD_UP_SPEC, '1. Read the input'), /design-deferred/i);
  });

  test('labels the item with labels.mjs', () => {
    assert.match(step(BUILD_UP_SPEC, '8. Preview and publish'), /scripts\/labels\.mjs plan/);
  });
});

describe('slice-spec', () => {
  test('stops on an epic labelled needs-design and names build-up-spec as the next step', () => {
    const gather = step(SLICE_SPEC, '1. Gather the epic');
    assert.match(gather, /`needs-design`/);
    assert.match(gather, /`\/build-up-spec <epic[^`]*>`/);
  });
});
