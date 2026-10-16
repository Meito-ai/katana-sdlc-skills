import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';

import { detect, parsePnpmWorkspace } from '../../src/skills/paas/paas-pulumi-infra-setup/scripts/detect.mjs';

const DETECT_PATH = new URL('../../src/skills/paas/paas-pulumi-infra-setup/scripts/detect.mjs', import.meta.url).pathname;

// Builds a throwaway repo from a { 'relative/path': contents } map. Objects are
// written as JSON, strings verbatim.
function createRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'paas-detect-'));
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof contents === 'string' ? contents : JSON.stringify(contents));
  }
  return root;
}

// A fake command runner: answers from a { 'command arg': stdout } map and
// fails (null) for anything else, like a missing CLI.
function fakeRun(answers = {}) {
  return (command, args) => answers[[command, ...args].join(' ')] ?? null;
}

describe('parsePnpmWorkspace', () => {
  test('reads quoted, commented and negated entries and stops at the next key', () => {
    const text = ['packages:', '  - "apps/*"', "  - 'packages/*' # libs", '  - "!packages/legacy"', 'catalog:', '  - nope'].join('\n');
    assert.deepEqual(parsePnpmWorkspace(text), ['apps/*', 'packages/*', '!packages/legacy']);
  });
});

describe('detect', () => {
  test('a single-package repo is node, not a monorepo, and reports its toolchain', () => {
    const root = createRepo({
      'package.json': { name: '@acme/shop', type: 'module', devDependencies: { typescript: '^5.6.0', vitest: '^3.0.0' } },
      'package-lock.json': '{}',
      'tsconfig.json': '{}',
      'biome.json': '{}',
    });

    const report = detect(root, { run: fakeRun() });

    assert.equal(report.language, 'node');
    assert.equal(report.repoName, 'shop');
    assert.equal(report.node.packageManager, 'npm');
    assert.equal(report.node.type, 'module');
    assert.equal(report.node.scope, '@acme');
    assert.equal(report.node.monorepo.isMonorepo, false);
    assert.deepEqual(report.node.typescript, { range: '^5.6.0', major: 5, bases: { files: ['tsconfig.json'], sharedPackages: [] } });
    assert.deepEqual(report.node.testRunners, ['vitest']);
    assert.equal(report.node.linter, 'biome');
  });

  test('a pnpm + Turborepo monorepo lists its projects, honouring negated globs', () => {
    const root = createRepo({
      'package.json': { name: 'acme', packageManager: 'pnpm@9.12.0', scripts: { build: 'turbo run build', lint: 'turbo run lint' } },
      'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n  - "packages/*"\n  - "!packages/legacy"\n',
      'turbo.json': { tasks: { build: {}, typecheck: {}, 'web#test': {} } },
      'apps/web/package.json': { name: '@acme/web', type: 'module', scripts: { build: 'vite build', dev: 'vite', 'test:unit': 'vitest' }, devDependencies: { vitest: '^3.0.0' } },
      'apps/web/tsconfig.json': '{}',
      'packages/tsconfig/package.json': { name: 'tsconfig' },
      'packages/api/package.json': { name: '@acme/api', devDependencies: { jest: '^30.0.0', typescript: '^6.0.3' } },
      'packages/legacy/package.json': { name: '@acme/legacy' },
      'packages/not-a-package/README.md': 'no package.json here',
    });

    const { node } = detect(root, { run: fakeRun() });

    assert.equal(node.packageManager, 'pnpm');
    assert.deepEqual(node.monorepo.tools, ['turborepo']);
    assert.deepEqual(
      node.monorepo.projects.map((project) => project.path),
      ['apps/web', 'packages/api', 'packages/tsconfig'],
    );
    const web = node.monorepo.projects.find((project) => project.name === '@acme/web');
    assert.deepEqual(web, {
      name: '@acme/web',
      path: 'apps/web',
      type: 'module',
      hasTsconfig: true,
      hasProjectJson: false,
      scripts: ['build', 'test:unit'],
      testRunner: 'vitest',
    });
    assert.equal(node.scope, '@acme');
    assert.equal(node.typescript.major, 6);
    assert.deepEqual(node.typescript.bases.sharedPackages, ['tsconfig']);
    assert.deepEqual(node.tasks.standard, ['build', 'typecheck', 'lint', 'test']);
    assert.deepEqual(node.tasks.turboPerPackageEntries, ['web#test']);
  });

  test('npm workspaces in object form with nx and a ** glob', () => {
    const root = createRepo({
      'package.json': { name: 'acme', workspaces: { packages: ['libs/**'] } },
      'nx.json': { targetDefaults: { build: {}, test: {} } },
      'libs/core/package.json': { name: '@acme/core' },
      'libs/core/project.json': '{}',
      'libs/ui/forms/package.json': { name: '@acme/forms' },
    });

    const { node } = detect(root, { run: fakeRun() });

    assert.deepEqual(node.monorepo.tools, ['nx']);
    assert.deepEqual(node.monorepo.workspaceGlobs, ['libs/**']);
    assert.deepEqual(
      node.monorepo.projects.map((project) => [project.path, project.hasProjectJson]),
      [
        ['libs/core', true],
        ['libs/ui/forms', false],
      ],
    );
    assert.deepEqual(node.tasks.standard, ['build', 'test']);
  });

  test('a repo without package.json is not node and names its language', () => {
    const root = createRepo({ 'pyproject.toml': '[project]\nname = "svc"\n', 'app/main.py': '' });

    const report = detect(root, { run: fakeRun() });

    assert.equal(report.language, 'python');
    assert.equal(report.node, null);
  });

  test('a polyglot repo with a pnpm workspace still counts as node', () => {
    const root = createRepo({ 'go.mod': 'module x', 'pnpm-workspace.yaml': 'packages:\n  - web\n', 'web/package.json': { name: 'web' } });

    const report = detect(root, { run: fakeRun() });

    assert.equal(report.language, 'node');
    assert.deepEqual(report.otherLanguages, ['go']);
    assert.deepEqual(report.node.monorepo.projects.map((project) => project.path), ['web']);
  });

  test('finds existing Pulumi projects but not ones inside dependencies', () => {
    const root = createRepo({
      'package.json': { name: 'acme' },
      'deployment/pulumi/Pulumi.yaml': 'name: acme\n',
      'node_modules/some-template/Pulumi.yaml': 'name: template\n',
    });

    assert.deepEqual(detect(root, { run: fakeRun() }).pulumi.projects, ['deployment/pulumi/Pulumi.yaml']);
  });

  test('reads git, apm and pulumi state through the command runner', () => {
    const root = createRepo({
      'package.json': { name: '@acme/shop' },
      'apm.yml': 'dependencies:\n  mcp:\n    - name: pulumi\n      args: ["npx -y mcp-remote https://mcp.ai.pulumi.com/mcp"]\n',
      '.claude/skills/pulumi-best-practices/SKILL.md': '',
      '.claude/skills/unrelated/SKILL.md': '',
      'CLAUDE.md': '@AGENTS.md\n',
      'AGENTS.md': '# Agents\n',
    });

    const report = detect(root, {
      run: fakeRun({
        'git remote get-url origin': 'git@github.com:acme/storefront.git',
        'git symbolic-ref --short refs/remotes/origin/HEAD': 'origin/trunk',
        'apm --version': 'Agent Package Manager (APM) CLI version 0.32.0 (f0509d7)',
        'pulumi version': 'v3.268.0',
        'pulumi whoami': 'acme-org',
      }),
    });

    assert.deepEqual(report.git, {
      origin: 'git@github.com:acme/storefront.git',
      github: true,
      repoName: 'storefront',
      defaultBranch: 'trunk',
    });
    assert.equal(report.repoName, 'storefront');
    assert.deepEqual(report.apm, { manifest: true, cli: '0.32.0', pulumiMcp: true, pulumiSkills: ['pulumi-best-practices'] });
    assert.deepEqual(report.pulumi.cli, { version: 'v3.268.0', user: 'acme-org' });
    assert.deepEqual(report.agentFiles, { agents: true, claude: true, claudeImportsAgents: true });
  });

  test('missing CLIs and remotes report null rather than failing', () => {
    const root = createRepo({ 'package.json': { name: 'shop' } });

    const report = detect(root, { run: fakeRun() });

    assert.deepEqual(report.git, { origin: null, github: false, repoName: null, defaultBranch: null });
    assert.deepEqual(report.pulumi.cli, { version: null, user: null });
    assert.equal(report.apm.cli, null);
    assert.equal(report.repoName, 'shop');
  });

  test('a non-GitHub origin is not github', () => {
    const root = createRepo({ 'package.json': { name: 'shop' } });

    const report = detect(root, { run: fakeRun({ 'git remote get-url origin': 'https://gitlab.com/acme/shop.git' }) });

    assert.equal(report.git.github, false);
    assert.equal(report.git.repoName, 'shop');
  });

  test('the CLI prints the report as JSON for the given directory', () => {
    const root = createRepo({ 'package.json': { name: 'shop' } });

    const result = spawnSync(process.execPath, [DETECT_PATH, root], { encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).root, root);
  });
});
