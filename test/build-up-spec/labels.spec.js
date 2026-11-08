import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { promisify } from 'node:util';

import { planLabels } from '../../src/skills/sdlc/feature-management/build-up-spec/scripts/labels.mjs';

const CLI_PATH = new URL('../../src/skills/sdlc/feature-management/build-up-spec/scripts/labels.mjs', import.meta.url).pathname;
const run = promisify(execFile);

const TEAM = ['Epic', 'ready-for-agent', 'needs-info', 'needs-design', 'Tech'];

const ISSUE = [
  '## What to build',
  'Planners cap daily spend.',
  '',
  '## Key interfaces',
  '- `SpendCap`: new',
  '',
  '## Testing seams',
  '- spend API: AC1',
  '',
  '## Acceptance criteria',
  '- [ ] AC1. When a planner sets a cap, the planner shall see it.',
  '',
  '## Out of scope',
  '- [add bound]',
].join('\n');

describe('planLabels', () => {
  test('an issue with agreed design and filled criteria is ready for an agent', () => {
    assert.deepEqual(planLabels({ level: 'issue', text: ISSUE, available: TEAM }), {
      add: ['ready-for-agent'],
      remove: [],
      missing: [],
    });
  });

  test('a placeholder left in the criteria needs info instead', () => {
    const text = ISSUE.replace('shall see it.', 'shall see it within [add bound].');
    assert.deepEqual(planLabels({ level: 'issue', text, available: TEAM }).add, ['needs-info']);
  });

  test('reads a placeholder whose brackets the tracker escaped', () => {
    const text = ISSUE.replace('shall see it.', 'shall see it within \\[add bound\\].');
    assert.deepEqual(planLabels({ level: 'issue', text, available: TEAM }).add, ['needs-info']);
  });

  test('a design placeholder quoted in a run that did not defer design changes nothing', () => {
    const text = ISSUE.replace('Planners cap daily spend.', 'Seams are never left as `[add testing seams]`.');
    assert.deepEqual(planLabels({ level: 'issue', text, available: TEAM }).add, ['ready-for-agent']);
  });

  test('offers to create neither ready-for-agent nor needs-info', () => {
    assert.deepEqual(planLabels({ level: 'issue', text: ISSUE, available: [] }).missing, []);
  });
});

describe('planLabels with design deferred', () => {
  const DEFERRED_ISSUE = ISSUE.replace('- `SpendCap`: new', '[add key interfaces]').replace(
    '- spend API: AC1',
    '[add testing seams]',
  );
  const DEFERRED_EPIC = [
    '## Problem',
    'Planners overspend.',
    '',
    '## Requirements',
    '- **R1.** When a planner sets a cap, the planner shall see it.',
    '',
    '## Implementation decisions',
    '[add implementation decisions]',
    '',
    '## Testing seams',
    '[add testing seams]',
  ].join('\n');

  test('an issue needs design and is not ready for an agent', () => {
    assert.deepEqual(planLabels({ level: 'issue', deferred: true, text: DEFERRED_ISSUE, available: TEAM }), {
      add: ['needs-design'],
      remove: [],
      missing: [],
    });
  });

  test('an issue still missing criteria needs both design and info', () => {
    const text = DEFERRED_ISSUE.replace('shall see it.', 'shall see it within [add bound].');
    assert.deepEqual(planLabels({ level: 'issue', deferred: true, text, available: TEAM }).add, ['needs-design', 'needs-info']);
  });

  test('an epic is labelled Epic and needs design', () => {
    assert.deepEqual(planLabels({ level: 'epic', deferred: true, text: DEFERRED_EPIC, available: TEAM }).add, ['Epic', 'needs-design']);
  });

  test('takes ready-for-agent off an item refined into a deferred design', () => {
    const plan = planLabels({ level: 'issue', deferred: true, text: DEFERRED_ISSUE, current: ['ready-for-agent'], available: TEAM });
    assert.deepEqual(plan, { add: ['needs-design'], remove: ['ready-for-agent'], missing: [] });
  });
});

describe('planLabels against the team labels', () => {
  const DEFERRED = ISSUE.replace('- spend API: AC1', '[add testing seams]');

  test('reports needs-design as missing when the team has no such label', () => {
    const plan = planLabels({ level: 'issue', deferred: true, text: DEFERRED, available: ['Epic', 'ready-for-agent'] });
    assert.deepEqual(plan, { add: ['needs-design'], remove: [], missing: ['needs-design'] });
  });

  test("adds the type label in the team's own spelling", () => {
    const plan = planLabels({ level: 'issue', type: 'tech', text: ISSUE, available: TEAM });
    assert.deepEqual(plan.add, ['ready-for-agent', 'Tech']);
    assert.deepEqual(plan.missing, []);
  });

  test('reports a type label the team lacks as missing', () => {
    const plan = planLabels({ level: 'epic', type: 'compliance', text: '', available: TEAM });
    assert.deepEqual(plan, { add: ['Epic', 'compliance'], remove: [], missing: ['compliance'] });
  });

  test('uses the label strings a triage map names', () => {
    const plan = planLabels({
      level: 'issue',
      deferred: true,
      text: DEFERRED,
      current: ['agent-ready'],
      available: ['agent-ready', 'design-pending'],
      map: { 'ready-for-agent': 'agent-ready', 'needs-design': 'design-pending' },
    });
    assert.deepEqual(plan, { add: ['design-pending'], remove: ['agent-ready'], missing: [] });
  });
});

describe('planLabels for a tracker that marks epics by type', () => {
  test('an epic gets no Epic label', () => {
    const plan = planLabels({ level: 'epic', epicLabel: false, type: 'product', text: '', available: ['product'] });
    assert.deepEqual(plan, { add: ['product'], remove: [], missing: [] });
  });

  test('never offers to create the Epic label', () => {
    assert.deepEqual(planLabels({ level: 'epic', epicLabel: false, text: '', available: [] }).missing, []);
  });

  test('an issue is labelled as before', () => {
    assert.deepEqual(planLabels({ level: 'issue', epicLabel: false, text: ISSUE, available: TEAM }).add, ['ready-for-agent']);
  });
});

describe('planLabels refining a needs-design item', () => {
  test('an issue whose design is filled loses needs-design and becomes ready for an agent', () => {
    const plan = planLabels({ level: 'issue', text: ISSUE, current: ['Tech', 'needs-design'], available: TEAM });
    assert.deepEqual(plan, { add: ['ready-for-agent'], remove: ['needs-design'], missing: [] });
  });

  test('an epic whose design is filled loses needs-design and is never ready for an agent', () => {
    const plan = planLabels({ level: 'epic', text: '## Testing seams\n- spend API', current: ['Epic', 'Needs-Design'], available: TEAM });
    assert.deepEqual(plan, { add: [], remove: ['Needs-Design'], missing: [] });
  });

  test('an item whose design is deferred again keeps needs-design', () => {
    const text = ISSUE.replace('- spend API: AC1', '[add testing seams]');
    const plan = planLabels({ level: 'issue', deferred: true, text, current: ['needs-design'], available: TEAM });
    assert.deepEqual(plan, { add: [], remove: [], missing: [] });
  });
});

describe('cli', () => {
  async function textFile(text) {
    const file = join(await mkdtemp(join(tmpdir(), 'labels-')), 'item.md');
    await writeFile(file, text);
    return file;
  }

  test('plan prints the labels as JSON', async () => {
    const file = await textFile(ISSUE.replace('- spend API: AC1', '[add testing seams]'));
    const { stdout } = await run('node', [
      CLI_PATH, 'plan', '--level', 'issue', '--deferred', 'yes', '--type', 'tech', '--text', file,
      '--current', 'ready-for-agent', '--available', 'ready-for-agent,Tech',
      '--map', 'needs-info=needs-triage',
    ]);
    assert.deepEqual(JSON.parse(stdout), {
      add: ['needs-design', 'Tech'],
      remove: ['ready-for-agent'],
      missing: ['needs-design'],
    });
  });

  test('--epic-label no drops Epic', async () => {
    const file = await textFile('');
    const { stdout } = await run('node', [
      CLI_PATH, 'plan', '--level', 'epic', '--epic-label', 'no', '--text', file, '--available', 'Epic',
    ]);
    assert.deepEqual(JSON.parse(stdout), { add: [], remove: [], missing: [] });
  });

  test('rejects an --epic-label other than yes or no', async () => {
    const file = await textFile('');
    await assert.rejects(
      run('node', [CLI_PATH, 'plan', '--level', 'epic', '--epic-label', 'maybe', '--text', file]),
      (error) => error.code === 1 && /--epic-label must be yes or no/.test(error.stderr),
    );
  });

  test('rejects a --deferred other than yes or no', async () => {
    const file = await textFile(ISSUE);
    await assert.rejects(
      run('node', [CLI_PATH, 'plan', '--level', 'issue', '--deferred', 'maybe', '--text', file]),
      (error) => error.code === 1 && /--deferred must be yes or no/.test(error.stderr),
    );
  });

  test('rejects an unknown level with a non-zero exit', async () => {
    const file = await textFile(ISSUE);
    await assert.rejects(
      run('node', [CLI_PATH, 'plan', '--level', 'story', '--text', file]),
      (error) => error.code === 1 && /level must be epic or issue/.test(error.stderr),
    );
  });
});
