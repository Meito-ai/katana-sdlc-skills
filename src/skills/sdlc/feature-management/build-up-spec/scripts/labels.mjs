#!/usr/bin/env node

// The label rules of build-up-spec's step 8: which labels an item gets, which
// it loses, and which the team lacks, worked out from the item's level and the
// text about to be published.

import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// What a design-deferred run leaves in place of the design. Any one of them
// left in the text keeps the item at `needs-design`.
export const DESIGN_PLACEHOLDERS = ['[add testing seams]', '[add implementation decisions]', '[add key interfaces]'];

// `[add bound]`, or `\[add bound\]` once a tracker has escaped the brackets.
const PLACEHOLDER = /\\?\[add [^\]\n]*?\\?\]/i;
const PLACEHOLDERS = new RegExp(PLACEHOLDER.source, 'gi');

const unescape = (placeholder) => placeholder.replaceAll('\\', '').toLowerCase();

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
 * (to offer for creation once). `level` is `epic` or `issue`; `type` is
 * `product`, `tech` or `compliance`; `text` is everything about to be
 * published (an issue's body, or an epic's card and PRD). `map` renames the
 * canonical labels to the strings a repo's triage-labels.md maps them to.
 * Every comparison ignores case, and a label the team has keeps its spelling.
 */
export function planLabels({ level, type, text, current = [], available = [], map = {} }) {
  if (level !== 'epic' && level !== 'issue') throw new Error(`level must be epic or issue; got ${level}`);
  const designDeferred = (text.match(PLACEHOLDERS) ?? []).some((found) => DESIGN_PLACEHOLDERS.includes(unescape(found)));
  const needsInfo = level !== 'epic' && PLACEHOLDER.test(section(text, 'acceptance criteria'));

  const wanted = [];
  if (level === 'epic') wanted.push('Epic');
  if (designDeferred) wanted.push('needs-design');
  if (needsInfo) wanted.push('needs-info');
  if (level !== 'epic' && !designDeferred && !needsInfo) wanted.push('ready-for-agent');
  if (type) wanted.push(type);

  const name = (label) => map[label] ?? label;
  const find = (labels, label) => labels.find((other) => other.toLowerCase() === name(label).toLowerCase());
  const add = wanted.filter((label) => !find(current, label)).map((label) => find(available, label) ?? name(label));

  // Labels are otherwise only ever added. This one goes because it contradicts
  // the design's state: needs-design and ready-for-agent never sit together.
  const stale = find(current, designDeferred ? 'ready-for-agent' : 'needs-design');

  return { add, remove: stale ? [stale] : [], missing: add.filter((label) => !find(available, label)) };
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
  labels.mjs plan --level epic|issue --text <file> [--type product|tech|compliance]
                  [--current <label,...>] [--available <label,...>] [--map <canonical=label,...>]`;

export async function main(argv) {
  const [command, ...rest] = argv;
  if (command !== 'plan') throw new Error(USAGE);
  const options = parseOptions(rest);
  if (!options.text) throw new Error('plan needs --text <file>');

  const plan = planLabels({
    level: options.level,
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
