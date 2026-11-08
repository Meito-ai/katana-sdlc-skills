import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const SCRIPT_PATH = new URL('../../scripts/sync-apm-version.js', import.meta.url).pathname;

const INSTALL_EXAMPLE = `\`\`\`yaml
dependencies:
  apm:
    - git: Meito-ai/katana-sdlc-skills/src/skills/setup-katana-skills
      ref: v0.2.0        # or "^0.2.0" on apm >= 0.16.0
    - git: mattpocock/skills
      ref: "^1.3.2"
\`\`\`
CI pins \`v0.32.0\`.
`;

const SKILL_EXAMPLE = `    - git: Meito-ai/katana-sdlc-skills/src/skills/sdlc/branch-management/branch-shutdown

      ref: "^0.2.0"
`;

function createRepo(version) {
  const repo = mkdtempSync(join(tmpdir(), 'sync-apm-version-'));
  writeFileSync(
    join(repo, 'package.json'),
    JSON.stringify({ version, repository: { type: 'git', url: 'https://github.com/Meito-ai/katana-sdlc-skills' } })
  );
  writeFileSync(join(repo, 'apm.yml'), `name: katana-sdlc-skills\nversion: ${version}\n`);
  writeFileSync(join(repo, 'README.md'), INSTALL_EXAMPLE);
  mkdirSync(join(repo, 'src/skills/branch-shutdown'), { recursive: true });
  writeFileSync(join(repo, 'src/skills/branch-shutdown/SKILL.md'), SKILL_EXAMPLE);
  return repo;
}

const run = (repo, ...args) => spawnSync('node', [SCRIPT_PATH, ...args], { cwd: repo, encoding: 'utf8' });
const read = (repo, path) => readFileSync(join(repo, path), 'utf8');

describe('sync-apm-version install examples', () => {
  test('a patch release moves exact tags and leaves the caret range on the minor', () => {
    const repo = createRepo('0.2.3');
    assert.equal(run(repo).status, 0);

    assert.match(read(repo, 'README.md'), /ref: v0\.2\.3 {8}# or "\^0\.2\.0" on apm/);
    assert.equal(read(repo, 'src/skills/branch-shutdown/SKILL.md'), SKILL_EXAMPLE);
  });

  test('a minor release moves caret ranges too, and never touches other repos or prose', () => {
    const repo = createRepo('0.3.0');
    assert.equal(run(repo).status, 0);

    const readme = read(repo, 'README.md');
    assert.match(readme, /ref: v0\.3\.0 {8}# or "\^0\.3\.0" on apm/);
    assert.match(readme, /ref: "\^1\.3\.2"/);
    assert.match(readme, /CI pins `v0\.32\.0`/);
    assert.match(read(repo, 'src/skills/branch-shutdown/SKILL.md'), /ref: "\^0\.3\.0"/);
  });

  test('--check reports a stale pin with its line and writes nothing', () => {
    const repo = createRepo('0.2.3');
    const result = run(repo, '--check');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /README\.md:5 reads "ref: v0\.2\.0/);
    assert.equal(read(repo, 'README.md'), INSTALL_EXAMPLE);
  });

  test('--check passes once the pins are written', () => {
    const repo = createRepo('0.3.0');
    run(repo);
    assert.equal(run(repo, '--check').status, 0);
  });
});
