// Block mechanics inside a PR description. The description is shared with its
// human author: everything outside the markers is theirs and must survive a
// refresh byte for byte, so the block is found by its markers and nothing else.

import { BLOCK_END, BLOCK_START, toShortSha } from './contract.mjs';

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

// Returns the block's character range, or null when the description has none.
// A lone or repeated marker means a human edited the block by hand; guessing
// which part is ours could delete their text, so refuse instead.
export function findBlock(body) {
  const starts = countOccurrences(body, BLOCK_START);
  const ends = countOccurrences(body, BLOCK_END);

  if (starts === 0 && ends === 0) {
    return null;
  }
  if (starts !== 1 || ends !== 1) {
    throw new Error(
      `The description has ${starts} start and ${ends} end visual-pr markers; expected one of each. ` +
        'Fix the markers by hand on GitHub and retry.',
    );
  }

  const start = body.indexOf(BLOCK_START);
  const end = body.indexOf(BLOCK_END) + BLOCK_END.length;
  if (end < start) {
    throw new Error('The visual-pr end marker comes before its start marker. Fix the markers by hand and retry.');
  }
  return { end, start };
}

// Replaces the block in place, or puts a new one at the top so the summary is
// the first thing a reviewer sees, above whatever the author already wrote.
export function upsertBlock(body, block) {
  const text = (body ?? '').replaceAll('\r\n', '\n');
  const range = findBlock(text);

  if (range) {
    return { action: 'updated', body: text.slice(0, range.start) + block + text.slice(range.end) };
  }

  const rest = text.trim();
  return { action: 'created', body: rest ? `${block}\n\n${rest}` : block };
}

export function assertHeadMatchesPullRequest({ localSha, pullRequestHeadSha }) {
  if (localSha === pullRequestHeadSha) {
    return;
  }
  throw new Error(
    `local HEAD ${toShortSha(localSha)} is not the PR head ${toShortSha(pullRequestHeadSha)} — push first. ` +
      'The stamped sha must name the commit the description was derived from.',
  );
}
