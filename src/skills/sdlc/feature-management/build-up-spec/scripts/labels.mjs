#!/usr/bin/env node

// The label rules of build-up-spec's step 8: which labels an item gets, which
// it loses, and which the team lacks, worked out from the item's level, whether
// its design was deferred, and the text about to be published.

import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// `[add bound]`, or `\[add bound\]` once a tracker has escaped the brackets.
const PLACEHOLDER = /\\?\[add [^\]\n]*?\\?\]/i;

// The labels a run offers to create when the team lacks them. A missing
// ready-for-agent or needs-info is left to the team, as it always was.
const OFFERED = new Set(['epic', 'needs-design', 'product', 'tech', 'compliance']);

/** The body of a `## <heading>` section, up to the next heading of level 1 or 2. */
function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`);
  if (start === -1) return '';
  const next = lines.findIndex((line, index) => index > start && /^#{1,2}\s/.test(line));
  return lines.slice(start + 1, next === -1 ? undefined : next).join('\n');
}

/**
 * The labels to add, the labels to remove, and the added labels the team lacks
 * (to offer for creation once). `level` is `epic` or `issue`; `deferred` is
 * step 1's decision that the design is left to an engineer; `type` is
 * `product`, `tech` or `compliance`; `text` is everything about to be
 * published (an issue's body, or an epic's card and PRD). `map` renames the
 * canonical labels to the strings a repo's triage-labels.md maps them to.
 * `epicLabel` is false for a tracker whose adapter marks an epic by its type
 * rather than by the `Epic` label. Every comparison ignores case, and a label
 * the team has keeps its spelling.
 */
export function planLabels({ level, deferred = false, epicLabel = true, type, text, current = [], available = [], map = {} }) {
  if (level !== 'epic' && level !== 'issue') throw new Error(`level must be epic or issue; got ${level}`);
  const isIssue = level === 'issue';
  const needsInfo = isIssue && PLACEHOLDER.test(section(text, 'acceptance criteria'));

  const wanted = [];
  if (!isIssue && epicLabel) wanted.push('Epic');
  if (deferred) wanted.push('needs-design');
  if (needsInfo) wanted.push('needs-info');
  if (isIssue && !deferred && !needsInfo) wanted.push('ready-for-agent');
  if (type) wanted.push(type);

  const spelled = (label) => map[label] ?? label;
  const findIn = (labels, label) => labels.find((other) => other.toLowerCase() === spelled(label).toLowerCase());
  const added = wanted.filter((label) => !findIn(current, label));

  // Labels are otherwise only ever added. This one goes because it contradicts
  // the design's state: needs-design and ready-for-agent never sit together.
  const contradicted = findIn(current, deferred ? 'ready-for-agent' : 'needs-design');

  return {
    add: added.map((label) => findIn(available, label) ?? spelled(label)),
    remove: contradicted ? [contradicted] : [],
    missing: added.filter((label) => OFFERED.has(label.toLowerCase()) && !findIn(available, label)).map(spelled),
  };
}

function parseOptions(values) {
  const options = {};
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    if (!name?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${name ?? 'end of command'}`);
    }
    options[name.slice(2)] = value;
  }
  return options;
}

const list = (value) => (value ? value.split(',').map((label) => label.trim()).filter(Boolean) : []);

const USAGE = `Usage:
  labels.mjs plan --level epic|issue --text <file> [--deferred yes|no] [--epic-label yes|no]
                  [--type product|tech|compliance] [--current <label,...>] [--available <label,...>]
                  [--map <canonical=label,...>]`;

export async function main(argv) {
  const [command, ...rest] = argv;
  if (command !== 'plan') throw new Error(USAGE);
  const options = parseOptions(rest);
  if (!options.text) throw new Error('plan needs --text <file>');
  const deferred = options.deferred ?? 'no';
  if (deferred !== 'yes' && deferred !== 'no') throw new Error(`--deferred must be yes or no; got ${deferred}`);
  const epicLabel = options['epic-label'] ?? 'yes';
  if (epicLabel !== 'yes' && epicLabel !== 'no') throw new Error(`--epic-label must be yes or no; got ${epicLabel}`);

  const plan = planLabels({
    level: options.level,
    deferred: deferred === 'yes',
    epicLabel: epicLabel === 'yes',
    type: options.type,
    text: await readFile(options.text, 'utf8'),
    current: list(options.current),
    available: list(options.available),
    map: Object.fromEntries(list(options.map).map((pair) => pair.split('=').map((part) => part.trim()))),
  });
  return JSON.stringify(plan, null, 2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (output) => console.log(output),
    (error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
