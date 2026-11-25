import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// The atomic contract (AGENTS.md, "Atomic skills"): a skill in sdlc/atomic does one step, never
// involves a human, never touches the tracker, never calls a flow, and takes its inputs and returns
// its results in a fixed shape. This spec reads the skill text and fails when the text breaks it.

const SKILLS = new URL('../../src/skills/', import.meta.url);
const ATOMIC = new URL('sdlc/atomic/', SKILLS);
const FLOWS = new URL('sdlc/flows/', SKILLS);

const flowNames = existsSync(FLOWS) ? readdirSync(FLOWS) : [];

/** Wording that asks the user, waits for approval or asks for confirmation (AC1). */
const HUMAN_WORDING = [
  /\bask(?:s|ed|ing)?\s+(?:the\s+|a\s+|your\s+)?(?:user|human|person|developer|reviewer|author|owner|people)\b/i,
  /\bask(?:s|ed|ing)?\s+(?:for\s+)?(?:approval|confirmation|permission|a\s+decision)\b/i,
  /\bwait(?:s|ed|ing)?\s+for\s+(?:the\s+|a\s+|their\s+|your\s+)?(?:user|human|person|people|approval|confirmation|answer|reply|response|go-ahead)\b/i,
  /\b(?:get|gets|need|needs|require|requires|await|awaits|seek|seeks)\s+(?:the\s+|an?\s+|their\s+|your\s+)?(?:user'?s?\s+)?(?:approval|confirmation|sign-off)\b/i,
  /\bconfirm(?:s|ed|ing)?\s+(?:it\s+|this\s+|that\s+)?(?:with|to)\s+(?:the\s+)?(?:user|human|person)\b/i,
  /\bstop\s+and\s+ask\b/i,
  /\b(?:approval|human|user)\s+gate\b/i,
  /\bprompt(?:s|ing)?\s+the\s+(?:user|human)\b/i,
];

/** The tracker, by name and by the operations `issue-tracker` defines (AC2). */
const TRACKER_WORDING = [
  /issue-tracker/i,
  /\btrackers?\b/i,
  /\bfetch(?:es)? an item\b/i,
  /\bepic PRD\b/i,
  /\bclose as duplicate\b/i,
  /\bfrontier\b/i,
  /\bPR link\b/i,
];

/** Skills read from one harness's own directory (AC3). */
const HARNESS_DIRECTORIES = /(?:^|[^\w])\.(?:claude|codex|cursor|gemini|windsurf|opencode)\/(?:skills|commands|agents)?/i;

/** A slash command such as `/wsjf` or `/code-review` (AC3). Paths hold a second slash and pass. */
const SLASH_COMMAND = /(?:^|[\s(`])\/[a-z][a-z0-9-]*(?=[\s`).,;:!?]|$)/m;

const NEGATION = /\b(?:never|not|no|without|nor|neither|cannot|can't|won't|doesn't|don't)\b/i;

/** The sentence of `text` holding index `at`. */
function sentenceAround(text, at) {
  const start = Math.max(text.lastIndexOf('. ', at), text.lastIndexOf('\n', at)) + 1;
  const dot = text.indexOf('. ', at);
  const newline = text.indexOf('\n', at);
  const end = [dot, newline].filter((i) => i !== -1).sort((a, b) => a - b)[0] ?? text.length;
  return { before: text.slice(start, at), sentence: text.slice(start, end) };
}

/** Every match of `patterns` in `text` whose sentence does not negate it. */
function wordingIn(text, patterns, { allowNegation = false } = {}) {
  const found = [];
  for (const pattern of patterns) {
    const global = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
    for (const match of text.matchAll(global)) {
      const { before } = sentenceAround(text, match.index);
      if (allowNegation && NEGATION.test(before)) continue;
      found.push(match[0].trim());
    }
  }
  return found;
}

/** The body of the `## <title>` section, or undefined. */
function section(text, title) {
  const heading = new RegExp(`^## ${title}[ \\t]*$`, 'm').exec(text);
  if (!heading) return undefined;
  const rest = text.slice(heading.index + heading[0].length);
  const next = /^## /m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/** The problems with one skill's text, each `{ rule, wording }`. */
export function atomicViolations(text, { flows = flowNames } = {}) {
  const prose = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const problems = [];
  const add = (rule, found) => found.forEach((wording) => problems.push({ rule, wording }));

  add('AC1 asks the user, waits for approval or asks for confirmation', wordingIn(prose, HUMAN_WORDING, { allowNegation: true }));
  add('AC2 names the tracker', wordingIn(prose, TRACKER_WORDING));
  add('AC3 reads one harness directory only', wordingIn(prose, [HARNESS_DIRECTORIES]));
  add('AC3 calls a skill by slash command', wordingIn(prose, [SLASH_COMMAND]));
  add(
    'AC3 calls a flow',
    flows.flatMap((flow) => wordingIn(prose, [new RegExp(`(?<![\\w-])${flow}(?![\\w-])`, 'i')])),
  );

  const inputs = section(prose, 'Inputs');
  if (inputs === undefined) {
    problems.push({ rule: 'AC4 lacks an Inputs section', wording: '## Inputs' });
  } else {
    const items = inputs.split(/\n(?=[-*] )/).filter((item) => /^[-*] /.test(item));
    if (items.length === 0) problems.push({ rule: 'AC4 Inputs lists no input', wording: '## Inputs' });
    for (const item of items) {
      if (!/\*\*(?:required|optional)\*\*|\((?:required|optional)\)|\b(?:required|optional)\b/i.test(item.split('\n')[0])) {
        problems.push({ rule: 'AC4 an input is not marked required or optional', wording: item.split('\n')[0] });
      }
    }
  }

  const results = section(prose, 'Results');
  if (results === undefined) {
    problems.push({ rule: 'AC4 lacks a Results section', wording: '## Results' });
  } else {
    for (const result of ['done', 'decision needed', 'blocked']) {
      if (!results.includes(`\`${result}\``)) {
        problems.push({ rule: `AC4 Results does not name \`${result}\``, wording: '## Results' });
      }
    }
  }

  return problems;
}

/** The markdown files a skill ships: its text, whatever else an agent reads. */
function skillTexts(name) {
  const directory = new URL(`${name}/`, ATOMIC);
  return readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith('.md') && !file.startsWith('LICENSE'))
    .map((file) => ({ file: `${name}/${file}`, text: readFileSync(new URL(file, directory), 'utf8') }));
}

const GOOD = [
  '---',
  'name: example',
  '---',
  '',
  '# Example',
  '',
  '## Inputs',
  '',
  '- `run-dir` (required): where outputs go.',
  '- `pr` (optional): the PR number.',
  '',
  '## Results',
  '',
  '- `done`: with output paths.',
  '- `decision needed`: a question, options and a recommendation.',
  '- `blocked`: a reason.',
  '',
].join('\n');

const rules = (text) => atomicViolations(text, { flows: ['implement-issue', 'wsjf'] }).map(({ rule }) => rule);
const withBody = (extra) => GOOD.replace('# Example\n', `# Example\n\n${extra}\n`);

describe('the atomic contract spec', () => {
  test('passes a skill that follows the contract', () => {
    assert.deepEqual(atomicViolations(GOOD, { flows: ['implement-issue'] }), []);
  });

  test('AC1: fails on asking the user, waiting for approval or asking for confirmation', () => {
    for (const line of [
      'Ask the user which PR to use.',
      'Then wait for approval before writing.',
      'Waits for the user to answer.',
      'Ask for confirmation first.',
      'Confirm with the user.',
      'There is a human gate here.',
      'Stop and ask where to write it.',
    ]) {
      assert.ok(rules(withBody(line)).some((rule) => rule.startsWith('AC1')), `passed: ${line}`);
    }
  });

  test('AC1: names the wording that broke the rule', () => {
    const [problem] = atomicViolations(withBody('Ask the user which PR to use.'));
    assert.match(problem.wording, /Ask the user/);
  });

  test('AC1: lets a skill say that it never asks', () => {
    assert.deepEqual(rules(withBody('It never asks the user, and it does not wait for approval.')), []);
  });

  test('AC2: fails on issue-tracker or a tracker operation', () => {
    for (const line of ['Read the issue with `issue-tracker`.', 'Post to the tracker.', 'Run the epic PRD operation.']) {
      assert.ok(rules(withBody(line)).some((rule) => rule.startsWith('AC2')), `passed: ${line}`);
    }
  });

  test('AC3: fails on calling a flow', () => {
    assert.ok(rules(withBody('Then run `implement-issue`.')).some((rule) => rule === 'AC3 calls a flow'));
  });

  test('AC3: fails on a slash command', () => {
    assert.ok(rules(withBody('Invoke `/wsjf` next.')).includes('AC3 calls a skill by slash command'));
    assert.deepEqual(rules(withBody('Write to `/dev/null`.')), []);
  });

  test('AC3: fails on a harness-only skills directory', () => {
    assert.ok(rules(withBody('Read `.claude/skills/x/SKILL.md`.')).includes('AC3 reads one harness directory only'));
  });

  test('AC4: fails without an Inputs section, or with an input not marked required or optional', () => {
    assert.ok(rules(GOOD.replace('## Inputs', '## Arguments')).includes('AC4 lacks an Inputs section'));
    assert.ok(rules(GOOD.replace('(required)', '')).includes('AC4 an input is not marked required or optional'));
  });

  test('AC4: fails without a Results section naming every result', () => {
    assert.ok(rules(GOOD.replace('## Results', '## Output')).includes('AC4 lacks a Results section'));
    assert.ok(rules(GOOD.replace('`blocked`', 'stuck')).includes('AC4 Results does not name `blocked`'));
    assert.ok(rules(GOOD.replace('`decision needed`', 'unsure')).includes('AC4 Results does not name `decision needed`'));
  });
});

describe('every skill in the atomic folder', () => {
  const names = existsSync(ATOMIC) ? readdirSync(ATOMIC) : [];

  test('exists', () => {
    assert.ok(names.includes('visual-pr'), 'visual-pr is not in sdlc/atomic');
  });

  for (const name of names) {
    test(`${name} follows the atomic contract`, () => {
      const problems = skillTexts(name).flatMap(({ file, text }) =>
        atomicViolations(text)
          // Only SKILL.md is a skill; its siblings are reference text and carry no Inputs or Results.
          .filter(({ rule }) => file === `${name}/SKILL.md` || !rule.startsWith('AC4'))
          .map(({ rule, wording }) => `${file}: ${rule}: "${wording}"`),
      );
      assert.deepEqual(problems, []);
    });
  }
});
