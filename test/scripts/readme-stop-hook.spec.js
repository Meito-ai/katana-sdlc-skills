import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { FLOW_END, FLOW_START, TABLE_END, TABLE_START, skillHash } from '../../scripts/sync-readme.js';

const HOOK_PATH = new URL('../../scripts/readme-stop-hook.js', import.meta.url).pathname;
const SKILL_MD = (name) => `---\nname: ${name}\ndescription: "Does ${name}."\n---\n`;

function writeSkill(repo, path) {
  mkdirSync(join(repo, path), { recursive: true });
  writeFileSync(join(repo, path, 'SKILL.md'), SKILL_MD(path.split('/').pop()));
}

// A repo whose README is in step with one SDLC skill, with origin/main at its first commit.
function createRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'readme-hook-'));
  const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');

  writeSkill(repo, 'src/skills/sdlc/wsjf');
  const stamp = skillHash(SKILL_MD('wsjf'), null);
  const readme = [
    FLOW_START,
    'flowchart TD\n  a[wsjf]',
    FLOW_END,
    TABLE_START,
    '| Skill | What it does |',
    '|---|---|',
    `| [\`wsjf\`](./src/skills/sdlc/wsjf) <!-- stamp: ${stamp} --> | Scores. |`,
    TABLE_END,
    '',
  ].join('\n');
  writeFileSync(join(repo, 'README.md'), readme);
  writeFileSync(join(repo, 'other.txt'), 'x\n');
  git('add', '.');
  git('commit', '-q', '-m', 'init');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  return { repo, git };
}

function runHook(repo, payload = {}) {
  const result = spawnSync('node', [HOOK_PATH], { input: JSON.stringify({ cwd: repo, ...payload }), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout) : null;
}

describe('readme stop hook', () => {
  test('stays silent when the branch touches the README but leaves it in step', () => {
    const { repo } = createRepo();
    appendFileSync(join(repo, 'README.md'), '\nMore prose.\n');
    assert.equal(runHook(repo), null);
  });

  test('blocks when the branch adds a skill without a row, naming it for the diagram too', () => {
    const { repo } = createRepo();
    writeSkill(repo, 'src/skills/sdlc/slice-spec');

    const output = runHook(repo);
    assert.equal(output.decision, 'block');
    assert.match(output.reason, /src\/skills\/sdlc\/slice-spec: no row/);
    assert.match(output.reason, /not in the README's SDLC flow diagram/);
    assert.match(output.reason, /place and gates of: slice-spec/);
    assert.match(output.reason, /npm run readme:stamp/);
  });

  test('blocks for a committed change as well as an uncommitted one', () => {
    const { repo, git } = createRepo();
    writeSkill(repo, 'src/skills/sdlc/slice-spec');
    git('add', '.');
    git('commit', '-q', '-m', 'add skill');
    assert.equal(runHook(repo).decision, 'block');
  });

  test('stays silent on a branch that touches neither src/skills/ nor README.md, however stale', () => {
    const { repo, git } = createRepo();
    writeSkill(repo, 'src/skills/sdlc/slice-spec');
    git('add', '.');
    git('commit', '-q', '-m', 'add skill');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    writeFileSync(join(repo, 'other.txt'), 'y\n');
    assert.equal(runHook(repo), null);
  });

  test('lets the agent stop once it has already continued for this hook', () => {
    const { repo } = createRepo();
    writeSkill(repo, 'src/skills/sdlc/slice-spec');
    assert.equal(runHook(repo, { stop_hook_active: true }), null);
  });

  test('stays silent outside a git repo', () => {
    assert.equal(runHook(mkdtempSync(join(tmpdir(), 'readme-hook-nogit-'))), null);
  });
});
