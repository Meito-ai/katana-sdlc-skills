// Sticky-comment mechanics. `gh pr comment --edit-last` edits whichever comment
// you posted most recently, so any comment made after the visual would be
// clobbered instead. Everything here keys off the marker rather than authorship
// or recency — the comment is posted with the author's own token, so identity
// cannot distinguish it from a real review comment.

import { hasReviewVisualMarker, toShortSha } from './contract.mjs';

export function findReviewVisualComment(comments) {
  const matches = comments.filter(({ body }) => hasReviewVisualMarker(body));
  if (matches.length > 1) {
    const ids = matches.map(({ id }) => id).join(', ');
    throw new Error(`Found ${matches.length} review-visual comments (ids: ${ids}) — delete the stale ones and retry`);
  }
  return matches[0] ?? null;
}

export function assertHeadMatchesPullRequest({ localSha, pullRequestHeadSha }) {
  if (localSha === pullRequestHeadSha) {
    return;
  }
  throw new Error(
    `local HEAD ${toShortSha(localSha)} is not the PR head ${toShortSha(pullRequestHeadSha)} — push first. ` +
      'The stamped sha must name the commit the visual was derived from.',
  );
}

export async function upsertReviewVisualComment({ body, createComment, listComments, updateComment }) {
  const existing = findReviewVisualComment(await listComments());

  if (existing) {
    const updated = await updateComment({ body, id: existing.id });
    return { action: 'updated', url: updated?.html_url ?? existing.html_url };
  }

  const created = await createComment({ body });
  return { action: 'created', url: created?.html_url };
}
