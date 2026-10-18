import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { BEHAVIORAL_DELTA_LABEL, CHANGE_SHAPE_LABEL, REVIEW_VISUAL_MARKER } from '../../src/skills/sdlc/review-visual/scripts/contract.mjs';

const CLI_PATH = new URL('../../src/skills/sdlc/review-visual/scripts/cli.mjs', import.meta.url).pathname;
const HEAD_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

const CONTENT = [
  CHANGE_SHAPE_LABEL,
  '',
  '```text',
  'scripts/review-visual/   # new',
  '```',
  '',
  BEHAVIORAL_DELTA_LABEL,
  '',
  '```mermaid',
  'sequenceDiagram',
  '    Agent->>GitHub: PATCH marked comment',
  '```',
].join('\n');

// A fake `gh` and `git` on PATH keep the CLI's own wiring under test — argument
// shapes, the sha guard, marker upsert — without touching the network.
const FAKE_GH = `#!/bin/sh
if [ "$1" = "pr" ]; then
  printf '{"headRefOid":"%s","number":42,"url":"https://github.com/example/repo/pull/42"}\\n' "$FAKE_PR_HEAD"
  exit 0
fi
if [ "$1" = "api" ]; then
  case "$*" in
    *"--method POST"*) cat > "$FAKE_IO/created.json"; printf '{"html_url":"https://github.com/c/new"}\\n' ;;
    *"--method PATCH"*) cat > "$FAKE_IO/patched.json"; printf '{"html_url":"https://github.com/c/old"}\\n' ;;
    *) printf '%s\\n' "$FAKE_COMMENTS" ;;
  esac
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

async function createFixture({ comments = '', localHead = HEAD_SHA, prHead = HEAD_SHA } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'review-visual-'));
  await writeFile(join(directory, 'gh'), FAKE_GH);
  await writeFile(join(directory, 'git'), FAKE_GIT);
  await chmod(join(directory, 'gh'), 0o755);
  await chmod(join(directory, 'git'), 0o755);

  const contentPath = join(directory, 'visual.md');
  await writeFile(contentPath, CONTENT);

  return {
    contentPath,
    directory,
    env: {
      ...process.env,
      FAKE_COMMENTS: comments,
      FAKE_IO: directory,
      FAKE_LOCAL_HEAD: localHead,
      FAKE_PR_HEAD: prHead,
      PATH: `${directory}:${process.env.PATH}`,
    },
  };
}

function runCli(args, env) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: 'utf8', env });
}

describe('post', () => {
  test('creates a stamped comment when the thread has no marked comment', async () => {
    const fixture = await createFixture();

    const result = runCli(['post', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    const { body } = JSON.parse(await readFile(join(fixture.directory, 'created.json'), 'utf8'));
    assert.ok(body.startsWith(REVIEW_VISUAL_MARKER));
    assert.match(body, /Behavioral delta for `a1b2c3d`/);
    assert.match(body, /PATCH marked comment/);
    assert.match(result.stdout, /created review visual on PR #42/);
  });

  test('patches the existing marked comment instead of posting a second one', async () => {
    // One JSON object per line, as `gh api --paginate --jq` emits them.
    const comments = [
      { body: 'Rename this port please.', html_url: 'https://github.com/c/2', id: 2 },
      { body: `${REVIEW_VISUAL_MARKER}\nstale`, html_url: 'https://github.com/c/1', id: 1 },
    ]
      .map((comment) => JSON.stringify(comment))
      .join('\n');
    const fixture = await createFixture({ comments });

    const result = runCli(['post', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    const { body } = JSON.parse(await readFile(join(fixture.directory, 'patched.json'), 'utf8'));
    assert.match(body, /Behavioral delta for `a1b2c3d`/);
    assert.match(result.stdout, /updated review visual on PR #42/);
  });

  test('refuses to stamp a sha the PR head does not carry', async () => {
    const fixture = await createFixture({ localHead: 'f'.repeat(40) });

    const result = runCli(['post', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^review-visual: local HEAD fffffff is not the PR head a1b2c3d — push first\./);
  });

  test('posts the no-delta sentinel with a reason', async () => {
    const fixture = await createFixture();

    const result = runCli(['post', '--no-delta', 'docs only'], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    const { body } = JSON.parse(await readFile(join(fixture.directory, 'created.json'), 'utf8'));
    assert.match(body, /_No behavioral delta in `a1b2c3d` — docs only\._/);
  });

  test('rejects --body together with --no-delta', async () => {
    const fixture = await createFixture();

    const result = runCli(['post', '--body', fixture.contentPath, '--no-delta', 'docs only'], fixture.env);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, 'review-visual: Pass either --body or --no-delta, not both\n');
  });

  test('reports a missing body option without a stack trace', async () => {
    const fixture = await createFixture();

    const result = runCli(['post'], fixture.env);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, 'review-visual: Missing required option: --body <file> (or --no-delta "<reason>")\n');
  });

  test('accepts a package-manager argument separator', async () => {
    const fixture = await createFixture();

    const result = runCli(['post', '--', '--body', fixture.contentPath], fixture.env);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /created review visual on PR #42/);
  });

  test('rejects an unknown command', async () => {
    const fixture = await createFixture();

    const result = runCli(['refresh'], fixture.env);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^review-visual: Usage: cli\.mjs post --body <file>/);
  });
});
