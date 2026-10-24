import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  assertReviewVisualComment,
  BEHAVIORAL_DELTA_LABEL,
  buildReviewVisualComment,
  CHANGE_SHAPE_LABEL,
  hasReviewVisualMarker,
  lintMermaidFences,
  MAX_CHANGE_SHAPE_LINES,
  MAX_REVIEW_VISUAL_LINES,
  REVIEW_VISUAL_FOOTER,
  REVIEW_VISUAL_MARKER,
  renderNoOpComment,
  renderStampLine,
  toShortSha,
} from '../../src/skills/sdlc/code-review/review-visual/scripts/contract.mjs';

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

const CONTENT = [
  CHANGE_SHAPE_LABEL,
  '',
  '```text',
  'packages/auth/',
  '└── session.ts   # refresh moved behind the port',
  '```',
  '',
  BEHAVIORAL_DELTA_LABEL,
  '',
  '```mermaid',
  'sequenceDiagram',
  '    Client->>API: POST /session',
  '    API-->>Client: 201 + refresh cookie',
  '```',
].join('\n');

describe('buildReviewVisualComment', () => {
  test('assembles marker, heading, sha stamp, content and footer', () => {
    const comment = buildReviewVisualComment({ content: CONTENT, sha: SHA });

    assert.equal(comment.split('\n')[0], REVIEW_VISUAL_MARKER);
    assert.match(comment, /^## Review visual — behavioral delta$/m);
    assert.match(comment, /Behavioral delta for `a1b2c3d`/);
    assert.match(comment, /201 \+ refresh cookie/);
    assert.ok(comment.endsWith(REVIEW_VISUAL_FOOTER));
  });

  test('rejects content missing a skeleton label', () => {
    assert.throws(() => buildReviewVisualComment({ content: `${CHANGE_SHAPE_LABEL}\n\nonly a frame`, sha: SHA }), {
      message: /must contain both/,
    });
  });

  test('rejects a behavioral delta placed before the change-shape frame', () => {
    const inverted = [BEHAVIORAL_DELTA_LABEL, '', 'delta', '', CHANGE_SHAPE_LABEL, '', 'shape'].join('\n');

    assert.throws(() => buildReviewVisualComment({ content: inverted, sha: SHA }), {
      message: /must come before/,
    });
  });

  test('rejects an empty section', () => {
    const empty = [CHANGE_SHAPE_LABEL, '', BEHAVIORAL_DELTA_LABEL, '', 'delta'].join('\n');

    assert.throws(() => buildReviewVisualComment({ content: empty, sha: SHA }), {
      message: new RegExp(`${CHANGE_SHAPE_LABEL.replaceAll('*', '\\*')} section is empty`),
    });
  });

  test('caps the change-shape frame', () => {
    const shape = Array.from({ length: MAX_CHANGE_SHAPE_LINES + 1 }, (_, index) => `line ${index}`);
    const content = [CHANGE_SHAPE_LABEL, ...shape, '', BEHAVIORAL_DELTA_LABEL, 'delta'].join('\n');

    assert.throws(() => buildReviewVisualComment({ content, sha: SHA }), { message: /over the 15-line cap/ });
  });

  test('caps the whole comment by lines', () => {
    const delta = Array.from({ length: MAX_REVIEW_VISUAL_LINES }, (_, index) => `beat ${index}`);
    const content = [CHANGE_SHAPE_LABEL, 'shape', '', BEHAVIORAL_DELTA_LABEL, ...delta].join('\n');

    assert.throws(() => buildReviewVisualComment({ content, sha: SHA }), {
      message: /over the 60-line cap/,
    });
  });

  test('caps the whole comment by bytes', () => {
    const content = [CHANGE_SHAPE_LABEL, 'shape', '', BEHAVIORAL_DELTA_LABEL, 'x'.repeat(9 * 1024)].join('\n');

    assert.throws(() => buildReviewVisualComment({ content, sha: SHA }), { message: /over the 8192-byte cap/ });
  });

  test('rejects empty content', () => {
    assert.throws(() => buildReviewVisualComment({ content: '   \n', sha: SHA }), { message: /content is empty/ });
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

describe('renderNoOpComment', () => {
  test('renders the sentinel with the short sha and the reason', () => {
    const comment = renderNoOpComment({ reason: 'docs only', sha: SHA });

    assert.match(comment, /_No behavioral delta in `a1b2c3d` — docs only\._/);
    assert.ok(comment.endsWith(REVIEW_VISUAL_FOOTER));
    assert.ok(hasReviewVisualMarker(comment));
  });

  test('requires a reason', () => {
    assert.throws(() => renderNoOpComment({ reason: '  ', sha: SHA }), { message: /must state a reason/ });
  });

  test('rejects a reason that already carries sentence punctuation', () => {
    assert.throws(() => renderNoOpComment({ reason: 'docs only.', sha: SHA }), { message: /must not end with/ });
  });
});

describe('assertReviewVisualComment', () => {
  test('accepts a generated comment and its no-op variant', () => {
    assert.doesNotThrow(() => assertReviewVisualComment(buildReviewVisualComment({ content: CONTENT, sha: SHA })));
    assert.doesNotThrow(() => assertReviewVisualComment(renderNoOpComment({ reason: 'config only', sha: SHA })));
  });

  test('rejects a comment without the marker', () => {
    const comment = buildReviewVisualComment({ content: CONTENT, sha: SHA }).replace(REVIEW_VISUAL_MARKER, '');

    assert.throws(() => assertReviewVisualComment(comment), { message: /must carry the <!-- katana:review-visual/ });
  });

  test('rejects a comment without the do-not-action footer', () => {
    const comment = buildReviewVisualComment({ content: CONTENT, sha: SHA }).replace(REVIEW_VISUAL_FOOTER, '');

    assert.throws(() => assertReviewVisualComment(comment), { message: /must end with the do-not-action footer/ });
  });

  test('rejects a stamp that names a different commit', () => {
    const comment = buildReviewVisualComment({ content: CONTENT, sha: SHA });

    assert.throws(() => assertReviewVisualComment(comment, { sha: 'f00ba12'.padEnd(40, '0') }), {
      message: /must stamp the PR head sha/,
    });
  });

  test('rejects a no-op sentinel that names a different commit', () => {
    const comment = renderNoOpComment({ reason: 'docs only', sha: SHA });

    assert.throws(() => assertReviewVisualComment(comment, { sha: 'f00ba12'.padEnd(40, '0') }), {
      message: /names a different sha/,
    });
  });
});

describe('sha helpers', () => {
  test('shortens to seven characters', () => {
    assert.equal(toShortSha(SHA), 'a1b2c3d');
    assert.equal(renderStampLine(SHA), 'Behavioral delta for `a1b2c3d`');
  });

  test('rejects anything that is not a git object id', () => {
    assert.throws(() => toShortSha('HEAD'), { message: /Not a git object id/ });
  });
});
