import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';

const SCRIPT_PATH = new URL('../../scripts/validate-skills.js', import.meta.url).pathname;

/** A repo holding one skill at each of `paths` (under src/skills/), all self-referenced. */
function createRepo(paths) {
  const repo = mkdtempSync(join(tmpdir(), 'validate-skills-'));
  const refs = [];
  for (const path of paths) {
    const dir = join(repo, 'src/skills', path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${path.split('/').pop()}\ndescription: A skill.\n---\n`);
    refs.push(`    - ./src/skills/${path}`);
  }
  writeFileSync(
    join(repo, 'apm.yml'),
    `name: x\nrepository: https://github.com/o/r\ndevDependencies:\n  apm:\n${refs.join('\n')}\n`
  );
  return repo;
}

const validate = (repo) => spawnSync('node', [SCRIPT_PATH], { cwd: repo, encoding: 'utf8' });

describe('the SDLC layout rule', () => {
  test('accepts SDLC skills under sdlc/flows and sdlc/atomic', () => {
    const result = validate(createRepo(['sdlc/flows/a', 'sdlc/atomic/b']));
    assert.equal(result.status, 0, result.stderr);
  });

  test('fails and names an SDLC skill in an area folder', () => {
    const result = validate(createRepo(['sdlc/feature-management/old-skill', 'sdlc/flows/a']));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /sdlc\/feature-management\/old-skill/);
    assert.doesNotMatch(result.stderr, /sdlc\/flows\/a/);
  });

  test('fails an SDLC skill directly under sdlc/', () => {
    const result = validate(createRepo(['sdlc/loose']));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /sdlc\/loose/);
  });

  test('leaves skills outside sdlc/ where they are', () => {
    const result = validate(createRepo(['paas/p', 'setup']));
    assert.equal(result.status, 0, result.stderr);
  });
});
