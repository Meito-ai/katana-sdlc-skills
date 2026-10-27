import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { BLOCK_END, BLOCK_START } from '../../src/skills/sdlc/code-review/visual-pr/scripts/contract.mjs';
import { assertHeadMatchesPullRequest, findBlock, upsertBlock } from '../../src/skills/sdlc/code-review/visual-pr/scripts/description.mjs';

const OLD_BLOCK = `${BLOCK_START}\n## Summary\nstale\n${BLOCK_END}`;
const NEW_BLOCK = `${BLOCK_START}\n## Summary\nfresh\n${BLOCK_END}`;

describe('findBlock', () => {
  test('returns null for a description without markers', () => {
    assert.equal(findBlock('Closes #12.'), null);
  });

  test('spans from the start marker to the end of the end marker', () => {
    const body = `Intro\n${OLD_BLOCK}\nOutro`;

    const { end, start } = findBlock(body);

    assert.equal(body.slice(start, end), OLD_BLOCK);
  });

  test('refuses a lone marker', () => {
    assert.throws(() => findBlock(`${BLOCK_START}\n## Summary`), { message: /1 start and 0 end visual-pr markers/ });
  });

  test('refuses a repeated block', () => {
    assert.throws(() => findBlock(`${OLD_BLOCK}\n${OLD_BLOCK}`), { message: /2 start and 2 end/ });
  });

  test('refuses markers in the wrong order', () => {
    assert.throws(() => findBlock(`${BLOCK_END}\n${BLOCK_START}`), { message: /end marker comes before its start/ });
  });
});

describe('upsertBlock', () => {
  test('replaces the block and keeps the author text around it byte for byte', () => {
    const body = `Context from the author.\n\n${OLD_BLOCK}\n\n## Checklist\n- [x] docs`;

    const result = upsertBlock(body, NEW_BLOCK);

    assert.equal(result.action, 'updated');
    assert.equal(result.body, `Context from the author.\n\n${NEW_BLOCK}\n\n## Checklist\n- [x] docs`);
  });

  test('puts a new block above the existing description', () => {
    const result = upsertBlock('Closes #12.\n', NEW_BLOCK);

    assert.equal(result.action, 'created');
    assert.equal(result.body, `${NEW_BLOCK}\n\nCloses #12.`);
  });

  test('writes the block alone into an empty description', () => {
    assert.deepEqual(upsertBlock('', NEW_BLOCK), { action: 'created', body: NEW_BLOCK });
    assert.deepEqual(upsertBlock(null, NEW_BLOCK), { action: 'created', body: NEW_BLOCK });
  });

  test('normalizes the CRLF line endings GitHub returns for browser edits', () => {
    const result = upsertBlock(`Intro\r\n${OLD_BLOCK.replaceAll('\n', '\r\n')}`, NEW_BLOCK);

    assert.equal(result.body, `Intro\n${NEW_BLOCK}`);
  });
});

describe('assertHeadMatchesPullRequest', () => {
  test('passes when local HEAD is the PR head', () => {
    assert.doesNotThrow(() =>
      assertHeadMatchesPullRequest({ localSha: 'a'.repeat(40), pullRequestHeadSha: 'a'.repeat(40) }),
    );
  });

  test('names both commits and says what to do', () => {
    assert.throws(
      () => assertHeadMatchesPullRequest({ localSha: 'a'.repeat(40), pullRequestHeadSha: 'b'.repeat(40) }),
      { message: /local HEAD aaaaaaa is not the PR head bbbbbbb — push first/ },
    );
  });
});
