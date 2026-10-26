import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { BLOCK_END, BLOCK_START, readStamp, renderStampLine } from '../../src/skills/sdlc/code-review/visual-pr/scripts/contract.mjs';

const HOOK_PATH = new URL('../../src/skills/sdlc/code-review/visual-pr/scripts/hook.mjs', import.meta.url).pathname;
const HEAD_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const OLD_SHA = 'f'.repeat(40);

function stampedBody(sha) {
  return `${BLOCK_START}\n## Summary\n\n${renderStampLine(sha)}\n${BLOCK_END}\n\nAuthor text.`;
}

// A fake `gh` and `git` on PATH: `gh pr view` prints the PR from a file, or
// fails like gh does on a branch without a PR when the file is absent.
const FAKE_GH = `#!/bin/sh
if [ "$1" = "pr" ] && [ "$2" = "view" ] && [ -f "$FAKE_IO/pr.json" ]; then
  cat "$FAKE_IO/pr.json"
  exit 0
fi
echo "no pull requests found" >&2
exit 1
`;

const FAKE_GIT = `#!/bin/sh
if [ "$1" = "rev-parse" ]; then
  printf '%s\\n' "$FAKE_LOCAL_HEAD"
  exit 0
fi
exit 1
`;

async function createFixture({ pullRequest } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'visual-pr-hook-'));
  await writeFile(join(directory, 'gh'), FAKE_GH);
  await writeFile(join(directory, 'git'), FAKE_GIT);
  await chmod(join(directory, 'gh'), 0o755);
  await chmod(join(directory, 'git'), 0o755);
  if (pullRequest) {
    await writeFile(join(directory, 'pr.json'), JSON.stringify({ number: 6, state: 'OPEN', ...pullRequest }));
  }

  return {
    directory,
    env: { ...process.env, FAKE_IO: directory, FAKE_LOCAL_HEAD: HEAD_SHA, PATH: `${directory}:${process.env.PATH}` },
  };
}

function runHook(payload, fixture) {
  const input = JSON.stringify({ cwd: fixture.directory, tool_name: 'Bash', ...payload });
  return spawnSync(process.execPath, [HOOK_PATH], { encoding: 'utf8', env: fixture.env, input });
}

function additionalContext(result) {
  return JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
}

describe('hook', () => {
  test('reminds the agent when a push leaves the stamp behind HEAD', async () => {
    const fixture = await createFixture({ pullRequest: { body: stampedBody(OLD_SHA) } });

    const result = runHook({ tool_input: { command: 'git add -A && git commit -m x && git push -q' } }, fixture);

    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.equal(
      additionalContext(result),
      "PR #6's description is stamped `fffffff` but HEAD is `a1b2c3d`. Refresh it with the visual-pr skill.",
    );
  });

  test('asks for a block when a PR is created without one', async () => {
    const fixture = await createFixture({ pullRequest: { body: 'Written by hand.' } });

    const result = runHook({ tool_input: { command: 'gh pr create --title T --body "Written by hand."' } }, fixture);

    assert.equal(result.status, 0);
    assert.match(additionalContext(result), /^PR #6 has no visual-pr block/);
  });

  test('stays silent when the stamp names HEAD', async () => {
    const fixture = await createFixture({ pullRequest: { body: stampedBody(HEAD_SHA) } });

    const result = runHook({ tool_input: { command: 'git push' } }, fixture);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  test('stays silent for a closed or merged PR', async () => {
    const fixture = await createFixture({ pullRequest: { body: stampedBody(OLD_SHA), state: 'MERGED' } });

    const result = runHook({ tool_input: { command: 'git push' } }, fixture);

    assert.equal(result.stdout, '');
  });

  test('stays silent when the branch has no PR', async () => {
    const fixture = await createFixture();

    const result = runHook({ tool_input: { command: 'git push -u origin feat-x' } }, fixture);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  test('ignores commands that neither push nor open a PR', async () => {
    const fixture = await createFixture({ pullRequest: { body: stampedBody(OLD_SHA) } });

    for (const command of ['git status', 'gh pr view 6', 'git pushd', 'echo "git-push"']) {
      assert.equal(runHook({ tool_input: { command } }, fixture).stdout, '', command);
    }
  });

  test('stays silent on input it cannot parse', async () => {
    const fixture = await createFixture();

    const result = spawnSync(process.execPath, [HOOK_PATH], { encoding: 'utf8', env: fixture.env, input: 'not json' });

    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });
});

describe('readStamp', () => {
  test('reads the short sha from a stamped description', () => {
    assert.equal(readStamp(stampedBody(HEAD_SHA)), 'a1b2c3d');
  });

  test('returns null for a description without a block', () => {
    assert.equal(readStamp('Closes #12.'), null);
    assert.equal(readStamp(null), null);
  });
});
