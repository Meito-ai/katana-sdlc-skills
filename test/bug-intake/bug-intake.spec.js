import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const SKILLS = new URL('../../src/skills/', import.meta.url);
const read = (path) => readFileSync(new URL(path, SKILLS), 'utf8');

const BUG_INTAKE = 'sdlc/feature-management/bug-intake/';
const skill = read(`${BUG_INTAKE}SKILL.md`);

// What triage writes and labels that intake leaves to the repo and to build-up-spec.
const REPO_WRITES = ['domain-modeling', 'GLOSSARY.md', 'docs/adr', '.out-of-scope'];
const OTHER_LABELS = ['needs-triage', 'ready-for-human', 'wontfix', 'enhancement'];

describe('bug-intake', () => {
  test('writes no glossary, ADR or out-of-scope file', () => {
    for (const term of REPO_WRITES) assert.ok(!skill.includes(term), `SKILL.md mentions ${term}`);
  });

  test('applies only ready-for-agent, needs-info and the bug type label', () => {
    for (const label of OTHER_LABELS) assert.ok(!skill.includes(label), `SKILL.md mentions ${label}`);
    const labels = skill.match(/^2\. \*\*Labels\.\*\*[\s\S]*?(?=^3\. )/m)?.[0];
    assert.ok(labels, 'no Labels step');
    for (const label of ['`ready-for-agent`', '`needs-info`', 'label named `bug`']) {
      assert.ok(labels.includes(label), `Labels step does not name ${label}`);
    }
  });

  test('carries the licence of the triage text it reuses', () => {
    const licence = read(`${BUG_INTAKE}LICENSE-mattpocock-skills`);
    assert.match(licence, /`triage` skill of\s+https:\/\/github\.com\/mattpocock\/skills/);
    assert.match(licence, /MIT License/);
    assert.match(licence, /Copyright \(c\) 2026 Matt Pocock/);
    assert.match(skill, /\]\(LICENSE-mattpocock-skills\)/);
  });
});

describe('build-up-spec', () => {
  test('sends a bug to bug-intake', () => {
    const refusal = read('sdlc/feature-management/build-up-spec/SKILL.md')
      .split('\n\n')
      .find((paragraph) => paragraph.includes('A bug (something broken) is out of'));
    assert.ok(refusal, 'no bug refusal paragraph');
    assert.match(refusal, /`bug-intake`/);
  });
});

describe('setup-katana-skills', () => {
  test('lists bug-intake at a path that holds the skill', () => {
    const row = read('setup-katana-skills/SKILL.md')
      .split('\n')
      .find((line) => line.startsWith('| `bug-intake` |'));
    assert.ok(row, 'no bug-intake row in the skill table');
    const path = row.match(/^\| `bug-intake` \| `([^`]+)` \|/)?.[1];
    assert.equal(path, 'sdlc/feature-management/bug-intake');
    assert.ok(existsSync(new URL(`${path}/SKILL.md`, SKILLS)), `${path}/SKILL.md does not exist`);
  });

  test('picking bug-intake also picks the skills it needs', () => {
    const prose = read('setup-katana-skills/SKILL.md').replace(/\s+/g, ' ');
    assert.match(prose, /Picking `bug-intake` also picks `slice-spec` and `wsjf`/);
  });

  test('wires bug-intake into the Katana skills block', () => {
    assert.match(read('setup-katana-skills/agents-block.md'), /^\[if bug-intake\] .*`\/bug-intake`/m);
  });
});
