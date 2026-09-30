// Single source of truth for the review-visual PR comment: the marker agents
// filter on, the skeleton the skill fills, and the caps that keep the comment
// readable. Both readers — ../SKILL.md (prose) and
// cli.mjs (enforcement) — reference these constants rather than restating them.

export const REVIEW_VISUAL_MARKER = '<!-- katana:review-visual:v1 -->';
export const REVIEW_VISUAL_HEADING = '## Review visual — behavioral delta';
export const REVIEW_VISUAL_FOOTER = '_Generated review visual — not review feedback. Do not action._';

export const CHANGE_SHAPE_LABEL = '**Change shape**';
export const BEHAVIORAL_DELTA_LABEL = '**Behavioral delta**';

// Rendered comment height is what decides whether the comment gets read at all:
// a PR here already carries several automated review comments before this one.
// Lines are therefore the primary cap; the byte ceiling only stops a single
// pathological long line from slipping through.
export const MAX_REVIEW_VISUAL_LINES = 60;
export const MAX_REVIEW_VISUAL_BYTES = 8 * 1024;
export const MAX_CHANGE_SHAPE_LINES = 15;

// Mermaid that fails to parse renders as an error box in the comment, and a
// local run never sees it. These are the diagram types a behavioral delta uses.
export const MERMAID_DIAGRAM_KEYWORDS = [
  'sequenceDiagram',
  'stateDiagram-v2',
  'stateDiagram',
  'flowchart',
  'graph',
  'classDiagram',
  'erDiagram',
];

const NO_OP_PATTERN = /^_No behavioral delta in `([0-9a-f]{7,40})` — (.+?)\._$/;
const SHORT_SHA_LENGTH = 7;

function normalize(text) {
  return text.replaceAll('\r\n', '\n').trim();
}

export function toShortSha(sha) {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) {
    throw new Error(`Not a git object id: ${sha}`);
  }
  return sha.slice(0, SHORT_SHA_LENGTH);
}

export function renderStampLine(sha) {
  return `Behavioral delta for \`${toShortSha(sha)}\``;
}

function assertCaps(comment) {
  const lines = comment.split('\n').length;
  if (lines > MAX_REVIEW_VISUAL_LINES) {
    throw new Error(
      `Review visual is ${lines} lines, over the ${MAX_REVIEW_VISUAL_LINES}-line cap. ` +
        'Cut the change-shape tree or move the second diagram into a <details> block.',
    );
  }

  const bytes = Buffer.byteLength(comment, 'utf8');
  if (bytes > MAX_REVIEW_VISUAL_BYTES) {
    throw new Error(`Review visual is ${bytes} bytes, over the ${MAX_REVIEW_VISUAL_BYTES}-byte cap`);
  }
}

export function lintMermaidFences(content) {
  const lines = normalize(content).split('\n');
  let openedAt = null;
  let expectDiagramKeyword = false;

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (expectDiagramKeyword) {
      const keyword = trimmed.split(/\s/)[0];
      if (!MERMAID_DIAGRAM_KEYWORDS.includes(keyword)) {
        throw new Error(
          `Mermaid fence at line ${openedAt + 1} starts with "${trimmed || '(blank)'}" — ` +
            `expected one of: ${MERMAID_DIAGRAM_KEYWORDS.join(', ')}`,
        );
      }
      expectDiagramKeyword = false;
      continue;
    }

    if (!trimmed.startsWith('```')) {
      continue;
    }

    if (openedAt === null) {
      openedAt = index;
      expectDiagramKeyword = trimmed === '```mermaid';
      continue;
    }

    openedAt = null;
  }

  // An unterminated `mermaid` fence with nothing after it is both unclosed and
  // empty; "empty" is the more precise diagnosis, so report it first.
  if (expectDiagramKeyword) {
    throw new Error('Mermaid fence is empty');
  }
  if (openedAt !== null) {
    throw new Error(`Unclosed code fence opened at line ${openedAt + 1}`);
  }
}

function sectionLines(content, label, nextLabel) {
  const lines = normalize(content).split('\n');
  const start = lines.findIndex((line) => line.trim() === label);
  const after = nextLabel ? lines.findIndex((line) => line.trim() === nextLabel) : -1;
  const end = after === -1 ? lines.length : after;
  return lines.slice(start + 1, end).filter((line) => line.trim() !== '');
}

function assertSkeleton(content) {
  const normalized = normalize(content);
  const changeShape = normalized.indexOf(CHANGE_SHAPE_LABEL);
  const behavioralDelta = normalized.indexOf(BEHAVIORAL_DELTA_LABEL);

  if (changeShape === -1 || behavioralDelta === -1) {
    throw new Error(`Review visual must contain both ${CHANGE_SHAPE_LABEL} and ${BEHAVIORAL_DELTA_LABEL}`);
  }
  if (behavioralDelta < changeShape) {
    throw new Error(`${CHANGE_SHAPE_LABEL} must come before ${BEHAVIORAL_DELTA_LABEL} — it is the opening frame`);
  }

  const shape = sectionLines(normalized, CHANGE_SHAPE_LABEL, BEHAVIORAL_DELTA_LABEL);
  if (shape.length === 0) {
    throw new Error(`${CHANGE_SHAPE_LABEL} section is empty`);
  }
  if (shape.length > MAX_CHANGE_SHAPE_LINES) {
    throw new Error(`${CHANGE_SHAPE_LABEL} is ${shape.length} lines, over the ${MAX_CHANGE_SHAPE_LINES}-line cap`);
  }
  if (sectionLines(normalized, BEHAVIORAL_DELTA_LABEL, null).length === 0) {
    throw new Error(`${BEHAVIORAL_DELTA_LABEL} section is empty`);
  }

  lintMermaidFences(normalized);
}

export function renderNoOpComment({ reason, sha }) {
  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    throw new Error('A no-delta review visual must state a reason, e.g. "docs only"');
  }
  if (/[.!?]$/.test(trimmedReason)) {
    throw new Error(`No-delta reason must not end with punctuation: ${trimmedReason}`);
  }

  const sentinel = `_No behavioral delta in \`${toShortSha(sha)}\` — ${trimmedReason}._`;
  const comment = [REVIEW_VISUAL_MARKER, REVIEW_VISUAL_HEADING, '', sentinel, '', REVIEW_VISUAL_FOOTER].join('\n');

  assertCaps(comment);
  assertReviewVisualComment(comment, { sha });
  return comment;
}

export function buildReviewVisualComment({ content, sha }) {
  const normalized = normalize(content);
  if (!normalized) {
    throw new Error('Review visual content is empty');
  }

  assertSkeleton(normalized);
  const comment = [
    REVIEW_VISUAL_MARKER,
    REVIEW_VISUAL_HEADING,
    '',
    renderStampLine(sha),
    '',
    normalized,
    '',
    REVIEW_VISUAL_FOOTER,
  ].join('\n');

  assertCaps(comment);
  assertReviewVisualComment(comment, { sha });
  return comment;
}

export function hasReviewVisualMarker(body) {
  return typeof body === 'string' && body.includes(REVIEW_VISUAL_MARKER);
}

export function assertReviewVisualComment(comment, { sha } = {}) {
  const normalized = normalize(comment);
  if (!hasReviewVisualMarker(normalized)) {
    throw new Error(`Review visual must carry the ${REVIEW_VISUAL_MARKER} marker`);
  }
  if (!normalized.includes(REVIEW_VISUAL_HEADING)) {
    throw new Error(`Review visual must carry the heading ${REVIEW_VISUAL_HEADING}`);
  }
  if (!normalized.endsWith(REVIEW_VISUAL_FOOTER)) {
    throw new Error('Review visual must end with the do-not-action footer');
  }

  const noOp = normalized.split('\n').find((line) => NO_OP_PATTERN.test(line.trim()));
  const stamped = sha
    ? normalized.includes(renderStampLine(sha))
    : /Behavioral delta for `[0-9a-f]{7,40}`/.test(normalized);

  if (!noOp && !stamped) {
    throw new Error(
      sha
        ? `Review visual must stamp the PR head sha: ${renderStampLine(sha)}`
        : 'Review visual must stamp a head sha or declare no behavioral delta',
    );
  }
  if (noOp && sha && !noOp.includes(`\`${toShortSha(sha)}\``)) {
    throw new Error(`No-delta sentinel names a different sha than the PR head ${toShortSha(sha)}`);
  }

  assertCaps(normalized);
  return normalized;
}
