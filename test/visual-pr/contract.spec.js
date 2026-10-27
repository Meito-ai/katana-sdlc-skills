import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  BLOCK_END,
  BLOCK_START,
  buildBlock,
  lintMermaidFences,
  MAX_BLOCK_LINES,
  MAX_SUMMARY_LINES,
  renderStampLine,
  splitSections,
  toShortSha,
} from '../../src/skills/sdlc/code-review/visual-pr/scripts/contract.mjs';

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

const SUMMARY = [
  '## Summary',
  '',
  'Refresh moves behind the session port.',
  '',
  '```mermaid',
  'sequenceDiagram',
  '    Client->>API: POST /session',
  '    API-->>Client: 201 + refresh cookie',
  '```',
];

const EVIDENCE = [
  '## Evidence',
  '',
  '- **Before:** `refresh after expiry` fails: 401',
  '  **After:** `refresh after expiry` passes',
];

const MERGE_DANGER = ['## Merge Danger', '', '**Door:** two-way', '', '**Blast Radius:** auth'];

function content({ summary = SUMMARY, evidence = EVIDENCE, mergeDanger = MERGE_DANGER } = {}) {
  return [...summary, '', ...evidence, '', ...mergeDanger].join('\n');
}

describe('buildBlock', () => {
  test('wraps the content in markers and stamps the head sha', () => {
    const block = buildBlock({ content: content(), sha: SHA });
    const lines = block.split('\n');

    assert.equal(lines[0], BLOCK_START);
    assert.equal(lines.at(-1), BLOCK_END);
    assert.equal(lines.at(-2), renderStampLine(SHA));
    assert.match(block, /visual-pr for `a1b2c3d`/);
    assert.match(block, /201 \+ refresh cookie/);
  });

  test('accepts the no-visual line in place of a visual', () => {
    const summary = ['## Summary', '', '_No visual: bumps the Node version in CI._'];

    assert.doesNotThrow(() => buildBlock({ content: content({ summary }), sha: SHA }));
  });

  test('rejects a summary with neither a visual nor the no-visual line', () => {
    const summary = ['## Summary', '', 'Refresh moves behind the port.'];

    assert.throws(() => buildBlock({ content: content({ summary }), sha: SHA }), { message: /needs a fenced visual/ });
  });

  test('rejects a no-visual reason that already ends in punctuation', () => {
    const summary = ['## Summary', '', '_No visual: docs only.._'];

    assert.throws(() => buildBlock({ content: content({ summary }), sha: SHA }), { message: /must not end with/ });
  });

  test('requires both before and after evidence', () => {
    const evidence = ['## Evidence', '', '- **After:** passes'];

    assert.throws(() => buildBlock({ content: content({ evidence }), sha: SHA }), { message: /must show \*\*Before:\*\*/ });
  });

  test('requires the door to be one-way or two-way', () => {
    const mergeDanger = ['## Merge Danger', '', '**Door:** revolving', '', '**Blast Radius:** auth'];

    assert.throws(() => buildBlock({ content: content({ mergeDanger }), sha: SHA }), { message: /\*\*Door:\*\* one-way/ });
  });

  test('requires a blast radius', () => {
    const mergeDanger = ['## Merge Danger', '', '**Door:** one-way'];

    assert.throws(() => buildBlock({ content: content({ mergeDanger }), sha: SHA }), { message: /\*\*Blast Radius:\*\*/ });
  });

  test('rejects content that carries the markers itself', () => {
    assert.throws(() => buildBlock({ content: `${BLOCK_START}\n${content()}`, sha: SHA }), {
      message: /must not carry the block markers/,
    });
  });

  test('caps the summary', () => {
    const tree = Array.from({ length: MAX_SUMMARY_LINES }, (_, index) => `line ${index}`);
    const summary = ['## Summary', '```text', ...tree, '```'];

    assert.throws(() => buildBlock({ content: content({ summary }), sha: SHA }), { message: /over the 50-line cap/ });
  });

  test('caps the whole block by lines', () => {
    const output = Array.from({ length: MAX_BLOCK_LINES }, (_, index) => `ok ${index}`);
    const evidence = [...EVIDENCE, '', ...output];

    assert.throws(() => buildBlock({ content: content({ evidence }), sha: SHA }), { message: /over the 100-line cap/ });
  });

  test('caps the whole block by bytes', () => {
    const evidence = [...EVIDENCE, 'x'.repeat(13 * 1024)];

    assert.throws(() => buildBlock({ content: content({ evidence }), sha: SHA }), { message: /over the 12288-byte cap/ });
  });

  test('rejects empty content', () => {
    assert.throws(() => buildBlock({ content: '   \n', sha: SHA }), { message: /Content is empty/ });
  });
});

describe('splitSections', () => {
  test('ignores level-2 headings inside a code fence', () => {
    const summary = ['## Summary', '', '```diff', '-## Old heading', '+## New heading', '```'];

    const sections = splitSections(content({ summary }));

    assert.deepEqual(sections['## Summary'], ['```diff', '-## Old heading', '+## New heading', '```']);
  });

  test('rejects sections out of order', () => {
    const swapped = [...EVIDENCE, '', ...SUMMARY, '', ...MERGE_DANGER].join('\n');

    assert.throws(() => splitSections(swapped), { message: /found ## Evidence, ## Summary, ## Merge Danger/ });
  });

  test('rejects an extra section', () => {
    const extra = `${content()}\n\n## Notes\n\nmore`;

    assert.throws(() => splitSections(extra), { message: /holds exactly ## Summary, ## Evidence, ## Merge Danger/ });
  });

  test('rejects text before the summary', () => {
    assert.throws(() => splitSections(`Intro.\n\n${content()}`), { message: /must start with ## Summary/ });
  });
});

describe('lintMermaidFences', () => {
  test('accepts every supported diagram keyword', () => {
    for (const keyword of ['sequenceDiagram', 'stateDiagram-v2', 'flowchart LR', 'classDiagram']) {
      assert.doesNotThrow(() => lintMermaidFences(['```mermaid', keyword, 'A-->B', '```'].join('\n')));
    }
  });

  test('rejects an unknown diagram keyword', () => {
    assert.throws(() => lintMermaidFences(['```mermaid', 'sequencediagram', 'A->>B: hi', '```'].join('\n')), {
      message: /expected one of: sequenceDiagram/,
    });
  });

  test('rejects an unclosed fence', () => {
    assert.throws(() => lintMermaidFences(['```mermaid', 'sequenceDiagram', 'A->>B: hi'].join('\n')), {
      message: /Unclosed code fence opened at line 1/,
    });
  });

  test('rejects an empty mermaid fence', () => {
    assert.throws(() => lintMermaidFences(['prose', '```mermaid'].join('\n')), { message: /Mermaid fence is empty/ });
  });

  test('ignores keywords inside a non-mermaid fence', () => {
    assert.doesNotThrow(() => lintMermaidFences(['```text', 'not-a-diagram', '```'].join('\n')));
  });
});

describe('toShortSha', () => {
  test('shortens a full sha to seven characters', () => {
    assert.equal(toShortSha(SHA), 'a1b2c3d');
  });

  test('rejects something that is not a git object id', () => {
    assert.throws(() => toShortSha('main'), { message: /Not a git object id: main/ });
  });
});
