import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { promisify } from 'node:util';

import {
  computeWsjf,
  parseWsjfBlock,
  rankItems,
  renderRanking,
  renderWsjfBlock,
  upsertWsjfSection,
  WSJF_MARKER,
} from '../../src/skills/sdlc/feature-management/wsjf/scripts/wsjf.mjs';

const CLI_PATH = new URL('../../src/skills/sdlc/feature-management/wsjf/scripts/wsjf.mjs', import.meta.url).pathname;
const run = promisify(execFile);

const SCORES = { bv: 8, rroe: 3, tc: 5, size: 5, scored: '2026-10-24' };

describe('computeWsjf', () => {
  test('multiplies value by time criticality and divides by size', () => {
    assert.deepEqual(computeWsjf(SCORES), { cod: 55, wsjf: 11 });
  });

  test('rounds WSJF to one decimal', () => {
    assert.equal(computeWsjf({ bv: 5, rroe: 3, tc: 2, size: 3 }).wsjf, 5.3);
  });

  test('rejects values off the Fibonacci scale', () => {
    assert.throws(() => computeWsjf({ ...SCORES, bv: 4 }), /BV must be one of/);
    assert.throws(() => computeWsjf({ ...SCORES, size: 0 }), /Size must be one of/);
    assert.throws(() => computeWsjf({ ...SCORES, tc: 21 }), /TC must be one of/);
  });
});

describe('renderWsjfBlock / parseWsjfBlock', () => {
  test('round-trips a block', () => {
    const block = renderWsjfBlock(SCORES);
    assert.match(block, /^## WSJF\n<!-- katana:wsjf:v1 -->\n/);
    assert.match(block, /\| 8 \| 3 \| 5 \| 55 \| 5 \| 11\.0 \| 2026-10-24 \|$/);
    assert.deepEqual(parseWsjfBlock(`intro\n\n${block}\n`), SCORES);
  });

  test('returns null without a marker', () => {
    assert.equal(parseWsjfBlock('## Goal\nNo score here.'), null);
  });

  test('throws on a marker with a malformed row', () => {
    assert.throws(() => parseWsjfBlock(`${WSJF_MARKER}\n| 8 | 3 | 5 |`), /needs 7 cells/);
    assert.throws(() => parseWsjfBlock(`${WSJF_MARKER}\n| 8 | 3 | 4 | 44 | 5 | 8.8 | 2026-10-24 |`), /TC must be/);
    assert.throws(() => parseWsjfBlock(`${WSJF_MARKER}\nno row`), /no score row/);
  });

  test('recomputes rather than trusting stored CoD and WSJF', () => {
    const tampered = `${WSJF_MARKER}\n| 8 | 3 | 5 | 999 | 5 | 99.9 | 2026-10-24 |`;
    assert.deepEqual(parseWsjfBlock(tampered), SCORES);
  });
});

describe('upsertWsjfSection', () => {
  test('appends the section at the end, after success measures', () => {
    const description = '## Goal\nShip it.\n\n## Success measures / DoD\n- KPI up\n';
    const result = upsertWsjfSection(description, SCORES);
    assert.ok(result.startsWith(description.trimEnd()));
    assert.match(result, /- KPI up\n\n## WSJF\n<!-- katana:wsjf:v1 -->/);
  });

  test('replaces an existing section and leaves the rest untouched', () => {
    const before = `## Goal\nShip it.\n\n${renderWsjfBlock({ ...SCORES, bv: 2 })}\n\n## Notes\nKeep me.\n`;
    const result = upsertWsjfSection(before, SCORES);
    assert.equal(result.match(/## WSJF/g).length, 1);
    assert.match(result, /\| 8 \| 3 \| 5 \| 55 \|/);
    assert.match(result, /^## Goal\nShip it\.\n\n## WSJF/);
    assert.match(result, /\n\n## Notes\nKeep me\.\n$/);
  });

  test('writes into an empty description', () => {
    assert.equal(upsertWsjfSection('', SCORES), `${renderWsjfBlock(SCORES)}\n`);
  });
});

describe('rankItems', () => {
  const block = (scores) => renderWsjfBlock({ scored: '2026-10-01', ...scores });

  test('orders by WSJF, then smaller size, then higher TC', () => {
    const { ranked } = rankItems(
      [
        { id: 'A', description: block({ bv: 5, rroe: 5, tc: 2, size: 5 }) }, // 4.0
        { id: 'B', description: block({ bv: 8, rroe: 2, tc: 2, size: 5 }) }, // 4.0, same size, same TC
        { id: 'C', description: block({ bv: 3, rroe: 1, tc: 2, size: 2 }) }, // 4.0, smaller size
        { id: 'D', description: block({ bv: 13, rroe: 8, tc: 5, size: 3 }) }, // 35.0
        { id: 'E', description: block({ bv: 2, rroe: 3, tc: 5, size: 5 }) }, // 5.0
        { id: 'F', description: block({ bv: 3, rroe: 2, tc: 3, size: 5 }) }, // 3.0
      ],
      { today: '2026-10-24' },
    );
    assert.deepEqual(ranked.map((item) => item.id), ['D', 'E', 'C', 'A', 'B', 'F']);
    assert.deepEqual(ranked.map((item) => item.rank), [1, 2, 3, 4, 5, 6]);
  });

  test('breaks a WSJF and size tie by higher TC', () => {
    const tie = rankItems(
      [
        { id: 'x', bv: 5, rroe: 5, tc: 2, size: 2, scored: '2026-10-24' }, // CoD 20, WSJF 10
        { id: 'y', bv: 1, rroe: 1, tc: 20, size: 2, scored: '2026-10-24' }, // CoD 40, WSJF 20
        { id: 'z', bv: 3, rroe: 2, tc: 2, size: 1, scored: '2026-10-24' }, // CoD 10, WSJF 10, smaller
        { id: 'w', bv: 2, rroe: 3, tc: 2, size: 1, scored: '2026-10-24' }, // CoD 10, WSJF 10, same as z
        { id: 'v', bv: 1, rroe: 1, tc: 5, size: 1, scored: '2026-10-24' }, // CoD 10, WSJF 10, higher TC
      ],
      { today: '2026-10-24' },
    );
    assert.deepEqual(tie.ranked.map((item) => item.id), ['y', 'v', 'z', 'w', 'x']);
  });

  test('explicit scores win over the block and default to today', () => {
    const { ranked } = rankItems(
      [{ id: 'T', target: true, bv: 8, rroe: 3, tc: 5, size: 5, description: block({ bv: 1, rroe: 1, tc: 1, size: 1 }) }],
      { today: '2026-10-24' },
    );
    assert.equal(ranked[0].bv, 8);
    assert.equal(ranked[0].scored, '2026-10-24');
    assert.equal(ranked[0].target, true);
  });

  test('flags scores older than 90 days as stale', () => {
    const { ranked } = rankItems(
      [
        { id: 'old', description: renderWsjfBlock({ ...SCORES, scored: '2026-07-01' }) },
        { id: 'fresh', description: renderWsjfBlock({ ...SCORES, scored: '2026-08-01' }) },
      ],
      { today: '2026-10-24' },
    );
    const byId = Object.fromEntries(ranked.map((item) => [item.id, item]));
    assert.equal(byId.old.stale, true);
    assert.equal(byId.old.age, 115);
    assert.equal(byId.fresh.stale, false);
  });

  test('separates unscored items and malformed blocks from the ranking', () => {
    const result = rankItems(
      [
        { id: 'ok', description: block({ bv: 5, rroe: 3, tc: 2, size: 3 }) },
        { id: 'none', description: '## Goal\nNothing yet.' },
        { id: 'broken', description: `${WSJF_MARKER}\n| 4 | 3 | 5 | 35 | 5 | 7.0 | 2026-10-01 |` },
      ],
      { today: '2026-10-24' },
    );
    assert.deepEqual(result.ranked.map((item) => item.id), ['ok']);
    assert.deepEqual(result.unscored, [{ id: 'none', title: undefined }]);
    assert.equal(result.errors[0].id, 'broken');

    const markdown = renderRanking(result);
    assert.match(markdown, /Unscored \(1\): none/);
    assert.match(markdown, /- broken: BV must be one of/);
  });
});

describe('cli', () => {
  test('rank prints the table with the target in bold', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wsjf-'));
    const input = join(dir, 'items.json');
    await writeFile(
      input,
      JSON.stringify([
        { id: 'ENG-1', title: 'Reference', description: renderWsjfBlock(SCORES) },
        { id: 'ENG-2', title: 'New epic', target: true, bv: 13, rroe: 5, tc: 8, size: 8 },
      ]),
    );
    const { stdout } = await run('node', [CLI_PATH, 'rank', '--input', input, '--today', '2026-10-24']);
    assert.match(stdout, /\| 1 \| \*\*ENG-2 New epic\*\* \| 13 \| 5 \| 8 \| 144 \| 8 \| 18\.0 \| 2026-10-24 \| target \|/);
    assert.match(stdout, /\| 2 \| ENG-1 Reference \|/);
  });

  test('upsert writes the block into a description file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wsjf-'));
    const file = join(dir, 'description.md');
    await writeFile(file, '## Goal\nShip it.\n');
    const { stdout } = await run('node', [
      CLI_PATH, 'upsert', '--description', file, '--bv', '8', '--rroe', '3', '--tc', '5', '--size', '5', '--scored', '2026-10-24',
    ]);
    assert.equal(stdout, `## Goal\nShip it.\n\n${renderWsjfBlock(SCORES)}\n`);
  });

  test('rejects an off-scale value with a non-zero exit', async () => {
    await assert.rejects(
      run('node', [CLI_PATH, 'block', '--bv', '4', '--rroe', '3', '--tc', '5', '--size', '5']),
      (error) => error.code === 1 && /BV must be one of/.test(error.stderr),
    );
  });
});
