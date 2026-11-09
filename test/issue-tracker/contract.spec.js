import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// The adapters are prose an agent follows, so these checks pin their shape:
// every shipped adapter answers every operation of the contract.

const SKILLS = new URL('../../src/skills/', import.meta.url);
const ISSUE_TRACKER = new URL('sdlc/feature-management/issue-tracker/', SKILLS);
const read = (url) => readFileSync(url, 'utf8');

const OPERATIONS = [
  'List targets',
  'Fetch an item',
  'Search',
  'Create an item',
  'Update an item',
  'Comment',
  'Labels',
  'Epic PRD',
  'Close as duplicate',
  'Frontier',
  'PR link',
];
const SHIPPED = ['github', 'gitlab', 'jira', 'linear'];

/** The `### <n>. <name>` operations under the contract's `## Operations`. */
function contractOperations(markdown) {
  const start = markdown.indexOf('\n## Operations\n');
  assert.notEqual(start, -1, 'SKILL.md has no "## Operations" section');
  const end = markdown.indexOf('\n## ', start + 1);
  return [...markdown.slice(start, end === -1 ? undefined : end).matchAll(/^### (\d+)\. (.+)$/gm)].map(
    ([, number, name]) => `${number}. ${name.trim()}`,
  );
}

/** The body of a `## <heading>` section, up to the next `## `. */
function section(markdown, heading) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return undefined;
  const next = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, next === -1 ? undefined : next).join('\n').trim();
}

/** Every way an adapter falls short of the contract, one line each. */
function auditAdapter(markdown, operations) {
  const problems = [];
  if (!section(markdown, 'Check')) problems.push('no "## Check" section');
  const epics = section(markdown, 'Epics');
  if (!epics) problems.push('no "## Epics" section');
  else if (!/^Epic label: (yes|no)\b/m.test(epics)) problems.push('"## Epics" declares no "Epic label: yes|no"');
  const limit = markdown.match(/^Body limit: (.+)$/m);
  if (limit && !/^\d+ characters$/.test(limit[1])) problems.push(`body limit "${limit[1]}" is not "<n> characters"`);
  for (const operation of operations) {
    const body = section(markdown, operation);
    if (body === undefined) problems.push(`operation "${operation}" is missing`);
    else if (!/^\*\*(Native\.|Fallback\.|Native, with fallback:)\*\*/.test(body)) {
      problems.push(`operation "${operation}" is not marked Native, Fallback or Native, with fallback`);
    }
  }
  return problems;
}

const operations = contractOperations(read(new URL('SKILL.md', ISSUE_TRACKER)));
const adapters = readdirSync(new URL('trackers/', ISSUE_TRACKER))
  .filter((file) => file.endsWith('.md'))
  .map((file) => ({ name: file.replace(/\.md$/, ''), text: read(new URL(`trackers/${file}`, ISSUE_TRACKER)) }));

describe('the issue-tracker contract', () => {
  test('defines the eleven operations, in order', () => {
    assert.deepEqual(operations, OPERATIONS.map((name, index) => `${index + 1}. ${name}`));
  });

  test('ships an adapter for Linear, GitHub, Jira Cloud and GitLab', () => {
    assert.deepEqual(adapters.map(({ name }) => name).sort(), SHIPPED);
  });

  test('flags an adapter that lacks an operation, naming it', () => {
    const linear = adapters.find(({ name }) => name === 'linear').text;
    const without = linear.replace(/^## 5\. Update an item$/m, '## Updating');
    assert.deepEqual(auditAdapter(without, operations), ['operation "5. Update an item" is missing']);
  });

  for (const { name, text } of [...adapters].sort((a, b) => a.name.localeCompare(b.name))) {
    test(`the ${name} adapter covers every operation`, () => {
      const problems = auditAdapter(text, operations).map((problem) => `${name}: ${problem}`);
      assert.deepEqual(problems, []);
    });
  }

  test('the Jira adapter declares its 32,767-character body limit', () => {
    assert.match(adapters.find(({ name }) => name === 'jira').text, /^Body limit: 32767 characters$/m);
  });

  test('the Jira adapter marks epics by type, and GitLab Free by label', () => {
    assert.match(section(adapters.find(({ name }) => name === 'jira').text, 'Epics'), /^Epic label: no\b/m);
    assert.match(section(adapters.find(({ name }) => name === 'gitlab').text, 'Epics'), /^Epic label: yes \(free\), no \(premium\)/m);
  });
});

describe('setup-katana-skills', () => {
  test('offers one row per shipped tracker', () => {
    const setup = read(new URL('setup-katana-skills/SKILL.md', SKILLS));
    const offered = [...setup.matchAll(/^\| `(\w+)` \| `trackers\/\1\.md` \|/gm)].map(([, name]) => name).sort();
    assert.deepEqual(offered, SHIPPED);
  });
});
