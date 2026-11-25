import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const SKILLS = new URL('../../src/skills/', import.meta.url);
const markdown = readdirSync(SKILLS, { recursive: true })
  .filter((path) => path.endsWith('.md'))
  .map((path) => ({ path, text: readFileSync(new URL(path, SKILLS), 'utf8') }));

describe('skill vocabulary', () => {
  test('names backlog items epic, issue or task, never story', () => {
    const offenders = markdown
      .flatMap(({ path, text }) => text.split('\n').map((line, index) => ({ path, line, number: index + 1 })))
      .filter(({ line }) => /\bstor(y|ies)\b/i.test(line))
      .map(({ path, number }) => `${path}:${number}`);
    assert.deepEqual(offenders, []);
  });

  test('every skill that sorts scored from unscored items applies wsjf\'s value test', () => {
    const read = (path) => markdown.find((file) => file.path === path).text;
    assert.match(read('sdlc/flows/wsjf/SKILL.md'), /\*\*value test\*\*/);
    for (const path of ['sdlc/flows/build-up-spec/SKILL.md', 'sdlc/flows/slice-spec/SKILL.md']) {
      assert.match(read(path), /`wsjf`'s value test/, `${path} does not apply the value test`);
    }
  });
});
