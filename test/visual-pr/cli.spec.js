import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { BLOCK_END, BLOCK_START } from '../../src/skills/sdlc/atomic/visual-pr/scripts/contract.mjs';

const CLI_PATH = new URL('../../src/skills/sdlc/atomic/visual-pr/scripts/cli.mjs', import.meta.url).pathname;
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
printf '%s\\n' "$*" >> "$FAKE_IO/gh-calls.txt"
if [ "$1" = "pr" ] && [ "$2" = "view" ] && [ -f "$FAKE_IO/no-pr" ]; then
  echo 'no pull requests found for branch "feat"' >&2
  exit 1
fi
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

  const runDir = join(directory, 'run');
  const contentPath = join(runDir, 'visual-pr', 'content.md');
  await mkdir(join(runDir, 'visual-pr'), { recursive: true });
  await writeFile(contentPath, CONTENT);

  return {
    contentPath,
    directory,
    runDir,
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

    const result = runCli(['write', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    const edited = await readFile(join(fixture.directory, 'edited.md'), 'utf8');
    assert.ok(edited.startsWith(`${BLOCK_START}\n## Summary`));
    assert.match(edited, /visual-pr for `a1b2c3d`/);
    assert.ok(edited.endsWith(`${BLOCK_END}\n\nCloses #12.`));
    assert.equal(await readFile(join(fixture.directory, 'edit-args.txt'), 'utf8'), 'pr edit 42 --body-file -\n');
    assert.match(result.stdout, /^done: https:\/\/github\.com\/example\/repo\/pull\/42 \(created the visual-pr block\)\n$/);
  });

  test('replaces the existing block in place', async () => {
    const body = `Author intro.\n\n${BLOCK_START}\nstale\n${BLOCK_END}\n\nAuthor outro.`;
    const fixture = await createFixture({ body });

    const result = runCli(['write', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    const edited = await readFile(join(fixture.directory, 'edited.md'), 'utf8');
    assert.ok(edited.startsWith(`Author intro.\n\n${BLOCK_START}\n## Summary`));
    assert.ok(edited.endsWith(`${BLOCK_END}\n\nAuthor outro.`));
    assert.doesNotMatch(edited, /stale/);
    assert.match(result.stdout, /^done: https:\/\/github\.com\/example\/repo\/pull\/42 \(updated the visual-pr block\)\n$/);
  });

  test('refuses to stamp a sha the PR head does not carry', async () => {
    const fixture = await createFixture({ localHead: 'f'.repeat(40) });

    const result = runCli(['write', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^visual-pr: blocked: local HEAD fffffff is not the PR head a1b2c3d — push first\./);
  });

  test('reports a contract violation without editing the description', async () => {
    const fixture = await createFixture();
    await writeFile(fixture.contentPath, CONTENT.replace('**Door:** two-way', '**Door:** maybe'));

    const result = runCli(['write', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^visual-pr: ## Merge Danger needs a line \*\*Door:\*\*/);
    await assert.rejects(readFile(join(fixture.directory, 'edited.md'), 'utf8'), { code: 'ENOENT' });
  });

  test('returns blocked: missing run-dir when no run directory is passed', async () => {
    const fixture = await createFixture();

    const result = runCli(['write'], fixture.env);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, 'visual-pr: blocked: missing run-dir\n');
  });

  test('returns blocked: missing the content when the run directory holds none', async () => {
    const fixture = await createFixture();
    await rm(fixture.contentPath);

    const result = runCli(['write', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, `visual-pr: blocked: missing ${fixture.contentPath}\n`);
  });

  test('returns blocked: missing pull request when the branch has none', async () => {
    const fixture = await createFixture();
    await writeFile(join(fixture.directory, 'no-pr'), '');

    const result = runCli(['write', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, 'visual-pr: blocked: missing pull request (none for the current branch; pass --pr <number>)\n');
  });

  test('returns blocked with the reason when a marker is broken, and edits nothing', async () => {
    const fixture = await createFixture({ body: `Intro.\n\n${BLOCK_START}\nno end marker` });

    const result = runCli(['write', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^visual-pr: blocked: The description has 1 start and 0 end visual-pr markers; expected one of each\./);
    await assert.rejects(readFile(join(fixture.directory, 'edited.md'), 'utf8'), { code: 'ENOENT' });
  });

  test('writes nothing but the PR description: no file changes, one gh edit', async () => {
    const fixture = await createFixture({ body: 'Closes #12.' });
    const before = await readdir(fixture.directory, { recursive: true });

    const result = runCli(['write', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    const added = (await readdir(fixture.directory, { recursive: true })).filter((file) => !before.includes(file));
    assert.deepEqual(added.sort(), ['edit-args.txt', 'edited.md', 'gh-calls.txt']);
    const calls = (await readFile(join(fixture.directory, 'gh-calls.txt'), 'utf8')).trim().split('\n');
    assert.deepEqual(calls, ['pr view --json body,headRefOid,number,url', 'pr edit 42 --body-file -']);
  });

  test('accepts a package-manager argument separator', async () => {
    const fixture = await createFixture();

    const result = runCli(['write', '--', '--run-dir', fixture.runDir], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^done: https:\/\/github\.com\/example\/repo\/pull\/42 \(created the visual-pr block\)\n$/);
  });

  test('rejects an unknown command', async () => {
    const fixture = await createFixture();

    const result = runCli(['post'], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^visual-pr: Usage: cli\.mjs write --run-dir <dir>/);
  });
});
