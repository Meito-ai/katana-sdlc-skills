import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { FLOW_END, FLOW_START, TABLE_END, TABLE_START, checkReadme, skillHash, stampReadme } from '../../scripts/sync-readme.js';

const SKILL_MD = (description) => `---\nname: wsjf\ndescription: "${description}"\n---\n\n# WSJF\n\nBody.\n`;
const APM_YML = (version, ref) =>
  `# A comment\nname: thing\nversion: ${version}\ndependencies:\n  apm:\n    - git: owner/repo\n      ref: "${ref}"  # why\n`;

const WSJF = 'src/skills/sdlc/feature-management/wsjf';
const PAAS = 'src/skills/paas/paas-pulumi-infra-setup';

function readme({ rows, flow = 'wsjf' }) {
  return [
    '# Title',
    FLOW_START,
    '```mermaid',
    `flowchart TD\n  a[${flow}]`,
    '```',
    FLOW_END,
    TABLE_START,
    '| Skill | What it does |',
    '|---|---|',
    ...rows,
    TABLE_END,
    '',
  ].join('\n');
}

const row = (name, path, stamp) => `| [\`${name}\`](./${path})${stamp ? ` <!-- stamp: ${stamp} -->` : ''} | Does things. |`;

describe('skillHash', () => {
  test('changes with the description and with the dependencies', () => {
    const base = skillHash(SKILL_MD('Scores work.'), APM_YML('0.2.3', '^1.3.2'));
    assert.notEqual(skillHash(SKILL_MD('Scores and ranks work.'), APM_YML('0.2.3', '^1.3.2')), base);
    assert.notEqual(skillHash(SKILL_MD('Scores work.'), APM_YML('0.2.3', '^1.4.0')), base);
  });

  test('ignores the version a release bumps, comments and the SKILL.md body', () => {
    const base = skillHash(SKILL_MD('Scores work.'), APM_YML('0.2.3', '^1.3.2'));
    assert.equal(skillHash(SKILL_MD('Scores work.'), APM_YML('0.3.0', '^1.3.2')), base);
    assert.equal(skillHash(SKILL_MD('Scores work.').replace('Body.', 'Other body.'), APM_YML('0.2.3', '^1.3.2')), base);
    assert.equal(
      skillHash(SKILL_MD('Scores work.'), APM_YML('0.2.3', '^1.3.2').replace('  # why', '  # because')),
      base
    );
  });

  test('a skill without an apm.yml hashes its description alone', () => {
    assert.match(skillHash(SKILL_MD('Scores work.'), null), /^[0-9a-f]{12}$/);
  });
});

describe('checkReadme', () => {
  test('a stamped row for every skill and every SDLC skill in the flow is clean', () => {
    const problems = checkReadme(readme({ rows: [row('wsjf', WSJF, 'aaa'), row('paas-pulumi-infra-setup', PAAS, 'bbb')] }), {
      [WSJF]: 'aaa',
      [PAAS]: 'bbb',
    });
    assert.deepEqual(Object.values(problems).flat(), []);
  });

  test('reports a skill with no row, a row with no skill, and a row naming another skill', () => {
    const problems = checkReadme(
      readme({ rows: [row('gone', 'src/skills/sdlc/gone', 'aaa'), row('not-paas', PAAS, 'bbb')] }),
      { [WSJF]: 'aaa', [PAAS]: 'bbb' }
    );
    assert.deepEqual(problems.missing, [WSJF]);
    assert.deepEqual(problems.orphaned.sort(), [PAAS, 'src/skills/sdlc/gone']);
  });

  test('tells an unstamped row from a stale one', () => {
    const problems = checkReadme(readme({ rows: [row('wsjf', WSJF), row('paas-pulumi-infra-setup', PAAS, 'old')] }), {
      [WSJF]: 'aaa',
      [PAAS]: 'bbb',
    });
    assert.deepEqual(problems.unstamped, [WSJF]);
    assert.deepEqual(problems.stale, [PAAS]);
  });

  test('requires SDLC skills in the flow by whole name, and only those', () => {
    const problems = checkReadme(readme({ rows: [row('wsjf', WSJF, 'aaa')], flow: 'wsjf-ranker' }), { [WSJF]: 'aaa' });
    assert.deepEqual(problems.notInFlow, [WSJF]);

    const paasOnly = checkReadme(readme({ rows: [row('paas-pulumi-infra-setup', PAAS, 'bbb')], flow: 'x' }), { [PAAS]: 'bbb' });
    assert.deepEqual(paasOnly.notInFlow, []);
  });

  test('reports missing markers', () => {
    assert.equal(checkReadme('# No markers\n', { [WSJF]: 'aaa' }).markers.length, 2);
  });
});

describe('stampReadme', () => {
  test('stamps unstamped rows, replaces stale stamps and keeps the rest of the line', () => {
    const before = readme({ rows: [row('wsjf', WSJF), row('paas-pulumi-infra-setup', PAAS, 'old')] });
    const after = stampReadme(before, { [WSJF]: 'aaa', [PAAS]: 'bbb' });

    assert.ok(after.includes(row('wsjf', WSJF, 'aaa')));
    assert.ok(after.includes(row('paas-pulumi-infra-setup', PAAS, 'bbb')));
    assert.deepEqual(Object.values(checkReadme(after, { [WSJF]: 'aaa', [PAAS]: 'bbb' })).flat(), []);
  });

  test('leaves rows for skills that no longer exist alone, so the check still reports them', () => {
    const before = readme({ rows: [row('gone', 'src/skills/sdlc/gone', 'old')] });
    assert.equal(stampReadme(before, {}), before);
  });
});
