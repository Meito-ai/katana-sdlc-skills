#!/usr/bin/env node

// Reports the shape of the repo paas-pulumi-infra-setup is about to scaffold
// into, as JSON on stdout. Read-only: it never writes a file. Dependency-free
// on purpose, since it runs inside the consumer's tree.
//
// Usage: node detect.mjs [repo-root]   (defaults to the current directory)

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

// Directories never worth descending into: dependencies, build output, VCS and
// agent tooling. `sdks` is where Pulumi generates bridged-provider SDKs.
const SKIP_DIRS = new Set([
  '.agents',
  '.bare',
  '.claude',
  '.git',
  '.next',
  '.nx',
  '.turbo',
  '.venv',
  'apm_modules',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'sdks',
  'target',
  'vendor',
  'venv',
]);
const MAX_DEPTH = 6;

// Languages Pulumi also supports, detected so a non-Node repo is named rather
// than just refused.
const LANGUAGE_MARKERS = [
  ['python', ['pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile', 'uv.lock', 'poetry.lock']],
  ['go', ['go.mod']],
  ['dotnet', [/\.(sln|csproj|fsproj)$/]],
  ['java', ['pom.xml', 'build.gradle', 'build.gradle.kts']],
  ['rust', ['Cargo.toml']],
  ['ruby', ['Gemfile']],
  ['php', ['composer.json']],
];

const UPSTREAM_PULUMI_SKILLS = [
  'pulumi-overview',
  'pulumi-best-practices',
  'pulumi-component',
  'pulumi-esc',
  'pulumi-automation-api',
  'provider-upgrade',
];

const STANDARD_TASKS = ['build', 'typecheck', 'type-check', 'check-types', 'lint', 'test'];

function defaultRun(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 15000 });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim();
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function toPosix(path) {
  return path.split(sep).join('/');
}

function subdirectories(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name))
      .map((entry) => join(dir, entry.name));
  } catch {
    return [];
  }
}

function dependencyNames(pkg) {
  return new Set([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
    ...Object.keys(pkg?.peerDependencies ?? {}),
  ]);
}

function dependencyRange(pkg, name) {
  return pkg?.devDependencies?.[name] ?? pkg?.dependencies?.[name] ?? null;
}

function detectLanguages(root) {
  let entries = [];
  try {
    entries = readdirSync(root);
  } catch {
    // An unreadable root reports no languages.
  }
  return LANGUAGE_MARKERS.filter(([, markers]) =>
    markers.some((marker) =>
      typeof marker === 'string' ? entries.includes(marker) : entries.some((entry) => marker.test(entry)),
    ),
  ).map(([language]) => language);
}

function detectPackageManager(root, rootPkg) {
  const declared = rootPkg?.packageManager?.split('@')[0];
  if (declared) return declared;
  if (existsSync(join(root, 'pnpm-lock.yaml')) || existsSync(join(root, 'pnpm-workspace.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lock')) || existsSync(join(root, 'bun.lockb'))) return 'bun';
  return 'npm';
}

// The `packages:` list of pnpm-workspace.yaml. A line parser, not a YAML
// parser: the file is a flat list in practice, and this script stays
// dependency-free.
export function parsePnpmWorkspace(text) {
  const globs = [];
  let inPackages = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    const item = line.match(/^\s+-\s*["']?([^"'#]+?)["']?\s*(#.*)?$/);
    if (item) globs.push(item[1]);
    else if (/^\S/.test(line)) inPackages = false;
  }
  return globs;
}

function workspaceGlobs(root, rootPkg) {
  const pnpm = readText(join(root, 'pnpm-workspace.yaml'));
  if (pnpm !== null) return parsePnpmWorkspace(pnpm);
  const declared = rootPkg?.workspaces;
  if (Array.isArray(declared)) return declared;
  if (Array.isArray(declared?.packages)) return declared.packages;
  return [];
}

// Expands one workspace glob. Supports what workspace globs use in practice:
// literal segments, `*` (one directory level) and `**` (any depth).
export function expandGlob(root, pattern) {
  const segments = pattern.replace(/^\.\//, '').replace(/\/+$/, '').split('/').filter(Boolean);
  let current = [root];
  for (const segment of segments) {
    const next = [];
    for (const dir of current) {
      if (segment === '**') {
        const stack = [[dir, 0]];
        while (stack.length > 0) {
          const [candidate, depth] = stack.pop();
          next.push(candidate);
          if (depth < MAX_DEPTH) for (const child of subdirectories(candidate)) stack.push([child, depth + 1]);
        }
      } else if (segment.includes('*')) {
        const matcher = new RegExp(`^${segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
        next.push(...subdirectories(dir).filter((child) => matcher.test(basename(child))));
      } else if (isDirectory(join(dir, segment))) {
        next.push(join(dir, segment));
      }
    }
    current = next;
  }
  return current;
}

function workspaceProjects(root, globs) {
  const included = new Set();
  const excluded = new Set();
  for (const glob of globs) {
    const negated = glob.startsWith('!');
    for (const dir of expandGlob(root, negated ? glob.slice(1) : glob)) {
      (negated ? excluded : included).add(dir);
    }
  }
  return [...included]
    .filter((dir) => !excluded.has(dir) && existsSync(join(dir, 'package.json')))
    .sort()
    .map((dir) => {
      const pkg = readJson(join(dir, 'package.json')) ?? {};
      return {
        name: pkg.name ?? basename(dir),
        path: toPosix(relative(root, dir)),
        type: pkg.type === 'module' ? 'module' : 'commonjs',
        hasTsconfig: existsSync(join(dir, 'tsconfig.json')),
        hasProjectJson: existsSync(join(dir, 'project.json')),
        // Only the task names the generated package has to match.
        scripts: Object.keys(pkg.scripts ?? {}).filter((script) => STANDARD_TASKS.includes(script) || /^test:/.test(script)),
        testRunner: testRunnerOf(pkg),
        pkg,
      };
    });
}

function testRunnerOf(pkg) {
  const deps = dependencyNames(pkg);
  if (deps.has('vitest')) return 'vitest';
  if (deps.has('jest')) return 'jest';
  if (Object.values(pkg?.scripts ?? {}).some((script) => /\bnode\b.*--test\b/.test(script))) return 'node:test';
  return null;
}

// Runners ranked by how many packages use them, most-used first.
function rankTestRunners(packages) {
  const counts = new Map();
  for (const pkg of packages) {
    const runner = testRunnerOf(pkg);
    if (runner) counts.set(runner, (counts.get(runner) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([runner]) => runner);
}

function detectTypescript(packages) {
  const range = packages.map((pkg) => dependencyRange(pkg, 'typescript')).find(Boolean) ?? null;
  const major = range?.match(/\d+/)?.[0];
  return { range, major: major ? Number(major) : null };
}

function tsconfigBases(root, projects) {
  const files = ['tsconfig.base.json', 'tsconfig.json'].filter((file) => existsSync(join(root, file)));
  // A workspace package that exists only to share tsconfig files, e.g. `tsconfig` or `@acme/tsconfig`.
  const sharedPackages = projects.filter((project) => /(^|\/)tsconfig$/.test(project.name)).map((project) => project.name);
  return { files, sharedPackages };
}

function taskNames(root, rootPkg) {
  const turbo = readJson(join(root, 'turbo.json'));
  const nx = readJson(join(root, 'nx.json'));
  const turboTasks = Object.keys(turbo?.tasks ?? turbo?.pipeline ?? {});
  const names = new Set([
    ...Object.keys(rootPkg?.scripts ?? {}),
    ...turboTasks.map((task) => task.split('#').pop()),
    ...Object.keys(nx?.targetDefaults ?? {}),
  ]);
  return {
    all: [...names].sort(),
    standard: STANDARD_TASKS.filter((task) => names.has(task)),
    turboPerPackageEntries: turboTasks.filter((task) => task.includes('#')),
  };
}

function detectLinter(root) {
  let entries = [];
  try {
    entries = readdirSync(root);
  } catch {
    return null;
  }
  if (entries.some((entry) => /^biome\.jsonc?$/.test(entry))) return 'biome';
  if (entries.some((entry) => /^(eslint\.config\.|\.eslintrc)/.test(entry))) return 'eslint';
  return null;
}

function findPulumiProjects(root) {
  const found = [];
  const stack = [[root, 0]];
  while (stack.length > 0) {
    const [dir, depth] = stack.pop();
    for (const file of ['Pulumi.yaml', 'Pulumi.yml']) {
      if (existsSync(join(dir, file))) found.push(toPosix(relative(root, join(dir, file))));
    }
    if (depth < MAX_DEPTH) for (const child of subdirectories(dir)) stack.push([child, depth + 1]);
  }
  return found.sort();
}

function detectGit(root, run) {
  const origin = run('git', ['remote', 'get-url', 'origin'], root);
  const head = run('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], root);
  const repoName = origin?.replace(/\.git$/, '').split(/[/:]/).pop() || null;
  return {
    origin,
    github: origin ? /github\.com[:/]/.test(origin) : false,
    repoName,
    defaultBranch: head ? head.replace(/^origin\//, '') : null,
  };
}

function detectApm(root, run) {
  const manifest = readText(join(root, 'apm.yml'));
  const versionOutput = run('apm', ['--version'], root);
  const deployed = ['.claude/skills', '.agents/skills'].flatMap((dir) => {
    try {
      return readdirSync(join(root, dir));
    } catch {
      return [];
    }
  });
  const mcpJson = readText(join(root, '.mcp.json')) ?? '';
  return {
    manifest: manifest !== null,
    cli: versionOutput?.match(/\d+\.\d+\.\d+/)?.[0] ?? null,
    pulumiMcp: /mcp\.ai\.pulumi\.com/.test(`${manifest ?? ''}\n${mcpJson}`),
    pulumiSkills: UPSTREAM_PULUMI_SKILLS.filter((skill) => deployed.includes(skill)),
  };
}

function detectPulumiCli(root, run) {
  const version = run('pulumi', ['version'], root);
  return {
    version,
    // Only meaningful with a version: `pulumi whoami` fails when logged out.
    user: version ? run('pulumi', ['whoami'], root) : null,
  };
}

function agentFiles(root) {
  const claude = readText(join(root, 'CLAUDE.md'));
  return {
    agents: existsSync(join(root, 'AGENTS.md')),
    claude: claude !== null,
    // A CLAUDE.md that only imports AGENTS.md defers to it.
    claudeImportsAgents: claude !== null && /^@AGENTS\.md\s*$/m.test(claude),
  };
}

export function detect(rootDir = process.cwd(), { run = defaultRun } = {}) {
  const root = resolve(rootDir);
  const rootPkg = readJson(join(root, 'package.json'));
  const otherLanguages = detectLanguages(root);
  const isNode = rootPkg !== null || existsSync(join(root, 'pnpm-workspace.yaml'));
  const git = detectGit(root, run);

  const report = {
    root,
    language: isNode ? 'node' : (otherLanguages[0] ?? 'unknown'),
    otherLanguages,
    repoName: git.repoName ?? rootPkg?.name?.split('/').pop() ?? basename(root),
    git,
    pulumi: { projects: findPulumiProjects(root), cli: detectPulumiCli(root, run) },
    apm: detectApm(root, run),
    agentFiles: agentFiles(root),
    githubWorkflows: isDirectory(join(root, '.github', 'workflows')),
    node: null,
  };
  if (!isNode) return report;

  const globs = workspaceGlobs(root, rootPkg);
  const projects = workspaceProjects(root, globs);
  const tools = [
    ['turborepo', 'turbo.json'],
    ['nx', 'nx.json'],
  ]
    .filter(([, file]) => existsSync(join(root, file)))
    .map(([tool]) => tool);
  const allPackages = [rootPkg ?? {}, ...projects.map((project) => project.pkg)];

  report.node = {
    packageManager: detectPackageManager(root, rootPkg),
    type: rootPkg?.type === 'module' ? 'module' : 'commonjs',
    engines: rootPkg?.engines?.node ?? null,
    scope: rootPkg?.name?.startsWith('@') ? rootPkg.name.split('/')[0] : (projects.find((p) => p.name.startsWith('@'))?.name.split('/')[0] ?? null),
    monorepo: {
      isMonorepo: globs.length > 0 || tools.length > 0,
      tools,
      workspaceGlobs: globs,
      projects: projects.map(({ pkg, ...project }) => project),
    },
    typescript: { ...detectTypescript(allPackages), bases: tsconfigBases(root, projects) },
    testRunners: rankTestRunners(allPackages),
    linter: detectLinter(root),
    tasks: taskNames(root, rootPkg),
  };
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(detect(process.argv[2] ?? process.cwd()), null, 2)}\n`);
}
