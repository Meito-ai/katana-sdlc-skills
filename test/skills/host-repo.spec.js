import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const SKILLS = new URL('../../src/skills/', import.meta.url);
const read = (path) => readFileSync(new URL(path, SKILLS), 'utf8');

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

describe('host repo layout', () => {
  test('no knowledge-base reader assumes a docs/ directory', () => {
    for (const { name, text } of KNOWLEDGE_BASE_READERS) assert.ok(!text.includes('docs/'), `${name} names docs/`);
  });

  test('a knowledge-base reader asks the user when nothing says where it lives', () => {
    for (const { name, text } of KNOWLEDGE_BASE_READERS) {
      const start = text.indexOf('`Knowledge base:`');
      assert.ok(start >= 0, `${name} does not read the Knowledge base line`);
      const lookup = text.slice(start, text.indexOf('\n\n', start));
      assert.match(lookup, /ask the user/, `${name} does not ask where the knowledge base lives`);
    }
  });

  test('setup-katana-skills tells the user the skills ask, not guess', () => {
    const setup = read('setup-katana-skills/SKILL.md').replace(/\s+/g, ' ');
    assert.doesNotMatch(setup, /look through `README` and `docs\/`/);
  });
});
