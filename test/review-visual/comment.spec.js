import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { assertHeadMatchesPullRequest, findReviewVisualComment, upsertReviewVisualComment } from '../../src/skills/review-visual/scripts/comment.mjs';
import { REVIEW_VISUAL_MARKER } from '../../src/skills/review-visual/scripts/contract.mjs';

const VISUAL = { body: `${REVIEW_VISUAL_MARKER}\n## Review visual`, html_url: 'https://github.com/c/1', id: 1 };
const HUMAN = { body: 'Please rename this port.', html_url: 'https://github.com/c/2', id: 2 };

describe('findReviewVisualComment', () => {
  test('finds the marked comment regardless of position', () => {
    assert.equal(findReviewVisualComment([HUMAN, VISUAL, HUMAN]).id, 1);
  });

  test('returns null when no comment carries the marker', () => {
    assert.equal(findReviewVisualComment([HUMAN]), null);
  });

  test('returns null for an empty thread', () => {
    assert.equal(findReviewVisualComment([]), null);
  });

  test('refuses to guess between duplicates', () => {
    assert.throws(() => findReviewVisualComment([VISUAL, { ...VISUAL, id: 9 }]), {
      message: /Found 2 review-visual comments \(ids: 1, 9\)/,
    });
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

describe('upsertReviewVisualComment', () => {
  test('creates the comment when none is marked', async () => {
    const created = [];
    const result = await upsertReviewVisualComment({
      body: 'fresh',
      createComment: async ({ body }) => {
        created.push(body);
        return { html_url: 'https://github.com/c/3' };
      },
      listComments: async () => [HUMAN],
      updateComment: async () => assert.fail('must not patch when there is nothing to patch'),
    });

    assert.deepEqual(created, ['fresh']);
    assert.deepEqual(result, { action: 'created', url: 'https://github.com/c/3' });
  });

  test('patches the marked comment in place, leaving human comments alone', async () => {
    const patched = [];
    const result = await upsertReviewVisualComment({
      body: 'refreshed',
      createComment: async () => assert.fail('must not post a second visual'),
      listComments: async () => [VISUAL, HUMAN],
      updateComment: async ({ body, id }) => {
        patched.push({ body, id });
        return { html_url: 'https://github.com/c/1' };
      },
    });

    assert.deepEqual(patched, [{ body: 'refreshed', id: 1 }]);
    assert.deepEqual(result, { action: 'updated', url: 'https://github.com/c/1' });
  });
});
