import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { BLOCK_END, BLOCK_START } from '../../src/skills/sdlc/code-review/visual-pr/scripts/contract.mjs';

const CLI_PATH = new URL('../../src/skills/sdlc/code-review/visual-pr/scripts/cli.mjs', import.meta.url).pathname;
const HEAD_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

const CONTENT = [
  '## Summary',
  '',
  '```diff',
  ' scripts/',
  '+└── visual-pr/   # new',
  '```',
  '',
  '## Evidence',
  '',
  '- **Before:** no block',
  '  **After:** block written',
  '',
  '## Merge Danger',
  '',
  '**Door:** two-way',
  '',
  '**Blast Radius:** none',
].join('\n');

// A fake `gh` and `git` on PATH keep the CLI's own wiring under test — argument
// shapes, the sha guard, the block upsert — without touching the network.
const FAKE_GH = `#!/bin/sh
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  cat "$FAKE_IO/pr.json"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "edit" ]; then
  printf '%s\\n' "$*" > "$FAKE_IO/edit-args.txt"
  cat > "$FAKE_IO/edited.md"
  exit 0
fi
echo "unexpected gh invocation: $*" >&2
exit 1
`;

const FAKE_GIT = `#!/bin/sh
if [ "$1" = "rev-parse" ]; then
  printf '%s\\n' "$FAKE_LOCAL_HEAD"
  exit 0
fi
echo "unexpected git invocation: $*" >&2
exit 1
`;

async function createFixture({ body = '', localHead = HEAD_SHA, prHead = HEAD_SHA } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'visual-pr-'));
  await writeFile(join(directory, 'gh'), FAKE_GH);
  await writeFile(join(directory, 'git'), FAKE_GIT);
  await chmod(join(directory, 'gh'), 0o755);
  await chmod(join(directory, 'git'), 0o755);
  await writeFile(
    join(directory, 'pr.json'),
    JSON.stringify({ body, headRefOid: prHead, number: 42, url: 'https://github.com/example/repo/pull/42' }),
  );

  const contentPath = join(directory, 'content.md');
  await writeFile(contentPath, CONTENT);

  return {
    contentPath,
    directory,
    env: {
      ...process.env,
      FAKE_IO: directory,
      FAKE_LOCAL_HEAD: localHead,
      PATH: `${directory}:${process.env.PATH}`,
    },
  };
}

function runCli(args, env) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: 'utf8', env });
}

describe('write', () => {
  test('puts a stamped block above the author text of a description without one', async () => {
    const fixture = await createFixture({ body: 'Closes #12.' });

    const result = runCli(['write', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    const edited = await readFile(join(fixture.directory, 'edited.md'), 'utf8');
    assert.ok(edited.startsWith(`${BLOCK_START}\n## Summary`));
    assert.match(edited, /visual-pr for `a1b2c3d`/);
    assert.ok(edited.endsWith(`${BLOCK_END}\n\nCloses #12.`));
    assert.equal(await readFile(join(fixture.directory, 'edit-args.txt'), 'utf8'), 'pr edit 42 --body-file -\n');
    assert.match(result.stdout, /created visual-pr block on PR #42/);
  });

  test('replaces the existing block in place', async () => {
    const body = `Author intro.\n\n${BLOCK_START}\nstale\n${BLOCK_END}\n\nAuthor outro.`;
    const fixture = await createFixture({ body });

    const result = runCli(['write', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    const edited = await readFile(join(fixture.directory, 'edited.md'), 'utf8');
    assert.ok(edited.startsWith(`Author intro.\n\n${BLOCK_START}\n## Summary`));
    assert.ok(edited.endsWith(`${BLOCK_END}\n\nAuthor outro.`));
    assert.doesNotMatch(edited, /stale/);
    assert.match(result.stdout, /updated visual-pr block on PR #42/);
  });

  test('refuses to stamp a sha the PR head does not carry', async () => {
    const fixture = await createFixture({ localHead: 'f'.repeat(40) });

    const result = runCli(['write', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^visual-pr: local HEAD fffffff is not the PR head a1b2c3d — push first\./);
  });

  test('reports a contract violation without editing the description', async () => {
    const fixture = await createFixture();
    await writeFile(fixture.contentPath, CONTENT.replace('**Door:** two-way', '**Door:** maybe'));

    const result = runCli(['write', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^visual-pr: ## Merge Danger needs a line \*\*Door:\*\*/);
    await assert.rejects(readFile(join(fixture.directory, 'edited.md'), 'utf8'), { code: 'ENOENT' });
  });

  test('reports a missing body option without a stack trace', async () => {
    const fixture = await createFixture();

    const result = runCli(['write'], fixture.env);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, 'visual-pr: Missing required option: --body <file>\n');
  });

  test('accepts a package-manager argument separator', async () => {
    const fixture = await createFixture();

    const result = runCli(['write', '--', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /created visual-pr block on PR #42/);
  });

  test('rejects an unknown command', async () => {
    const fixture = await createFixture();

    const result = runCli(['post'], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^visual-pr: Usage: cli\.mjs write --body <file>/);
  });
});
