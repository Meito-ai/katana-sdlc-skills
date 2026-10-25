#!/usr/bin/env node

// The arithmetic half of the wsjf skill: parses the `katana:wsjf:v1` block,
// validates the Fibonacci inputs, computes Cost of Delay and WSJF, ranks a set,
// and writes the block into a description. The scores themselves are judged by
// the agent running the skill; nothing here estimates anything.

import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const FIBONACCI = [1, 2, 3, 5, 8, 13, 20];
export const WSJF_MARKER = '<!-- katana:wsjf:v1 -->';
export const WSJF_HEADING = '## WSJF';
export const STALE_AFTER_DAYS = 90;

const INPUTS = ['bv', 'rroe', 'tc', 'size'];
const INPUT_LABELS = { bv: 'BV', rroe: 'RR/OE', tc: 'TC', size: 'Size' };
const TABLE_HEADER = '| BV | RR/OE | TC | CoD | Size | WSJF | Scored |';
const TABLE_RULE = '|---|---|---|---|---|---|---|';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Throws unless every input is on the Fibonacci scale and `scored` is an ISO date. */
export function assertScores(scores) {
  for (const key of INPUTS) {
    if (!FIBONACCI.includes(scores[key])) {
      throw new Error(`${INPUT_LABELS[key]} must be one of ${FIBONACCI.join(', ')}; got ${scores[key]}`);
    }
  }
  if (scores.scored !== undefined && !ISO_DATE.test(scores.scored)) {
    throw new Error(`Scored must be a YYYY-MM-DD date; got ${scores.scored}`);
  }
}

/** CoD = (BV + RR/OE) x TC; WSJF = CoD / Size, rounded to one decimal. */
export function computeWsjf(scores) {
  assertScores(scores);
  const cod = (scores.bv + scores.rroe) * scores.tc;
  return { cod, wsjf: Math.round((cod / scores.size) * 10) / 10 };
}

/**
 * Reads the block out of a description. Returns null when there is no marker;
 * throws when the marker is there but its row is malformed, so a broken
 * reference is reported instead of silently leaving the set.
 */
export function parseWsjfBlock(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === WSJF_MARKER);
  if (start === -1) return null;

  const row = lines.slice(start + 1).find((line) => /^\|\s*\d/.test(line.trim()));
  if (!row) throw new Error('WSJF block has a marker but no score row');

  const cells = row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  if (cells.length !== 7) throw new Error(`WSJF row needs 7 cells, found ${cells.length}: ${row.trim()}`);

  const [bv, rroe, tc, , size, , scored] = cells;
  const scores = { bv: Number(bv), rroe: Number(rroe), tc: Number(tc), size: Number(size), scored };
  assertScores(scores);
  return scores;
}

/** The `## WSJF` section, ready to sit at the end of a description. */
export function renderWsjfBlock(scores) {
  const { cod, wsjf } = computeWsjf(scores);
  const row = `| ${scores.bv} | ${scores.rroe} | ${scores.tc} | ${cod} | ${scores.size} | ${wsjf.toFixed(1)} | ${scores.scored} |`;
  return [WSJF_HEADING, WSJF_MARKER, TABLE_HEADER, TABLE_RULE, row].join('\n');
}

/**
 * Replaces the `## WSJF` section in place, or appends it at the end. Every
 * line outside that section is returned untouched.
 */
export function upsertWsjfSection(description, scores) {
  const block = renderWsjfBlock(scores);
  const lines = description.replace(/\s+$/, '').split('\n');
  const start = lines.findIndex((line) => line.trim() === WSJF_HEADING);

  if (start === -1) {
    return `${lines.join('\n')}${description.trim() ? '\n\n' : ''}${block}\n`;
  }

  const next = lines.findIndex((line, index) => index > start && /^#{1,2}\s/.test(line));
  const tail = next === -1 ? [] : ['', ...lines.slice(next)];
  return `${[...lines.slice(0, start), block, ...tail].join('\n')}\n`;
}

/** Whole days between an ISO `scored` date and `today`. */
export function ageInDays(scored, today) {
  return Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${scored}T00:00:00Z`)) / 86_400_000);
}

/**
 * Scores and orders a set. Each item is `{ id, title, description? , bv?, rroe?,
 * tc?, size?, scored?, target? }`: explicit scores win, otherwise the block in
 * `description` is parsed. Ties go to the smaller Size, then the higher TC.
 */
export function rankItems(items, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const ranked = [];
  const unscored = [];
  const errors = [];

  for (const item of items) {
    let scores;
    try {
      scores = INPUTS.every((key) => item[key] !== undefined)
        ? { bv: item.bv, rroe: item.rroe, tc: item.tc, size: item.size, scored: item.scored ?? today }
        : parseWsjfBlock(item.description ?? '');
      if (scores) assertScores(scores);
    } catch (error) {
      errors.push({ id: item.id, title: item.title, message: error.message });
      continue;
    }
    if (!scores) {
      unscored.push({ id: item.id, title: item.title });
      continue;
    }
    const age = ageInDays(scores.scored, today);
    ranked.push({
      id: item.id,
      title: item.title,
      target: Boolean(item.target),
      ...scores,
      ...computeWsjf(scores),
      stale: age > STALE_AFTER_DAYS,
      age,
    });
  }

  ranked.sort((a, b) => b.wsjf - a.wsjf || a.size - b.size || b.tc - a.tc);
  ranked.forEach((item, index) => {
    item.rank = index + 1;
  });
  return { ranked, unscored, errors };
}

/** The ranked set as the markdown the skill shows the user. */
export function renderRanking({ ranked, unscored, errors }) {
  const out = [
    '| # | Item | BV | RR/OE | TC | CoD | Size | WSJF | Scored | Note |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const item of ranked) {
    const notes = [item.target && 'target', item.stale && `stale: ${item.age} days`].filter(Boolean).join('; ');
    const name = `${item.id ? `${item.id} ` : ''}${item.title ?? ''}`.trim();
    out.push(
      `| ${item.rank} | ${item.target ? `**${name}**` : name} | ${item.bv} | ${item.rroe} | ${item.tc} | ${item.cod} | ${item.size} | ${item.wsjf.toFixed(1)} | ${item.scored} | ${notes} |`,
    );
  }
  if (unscored.length) {
    out.push('', `Unscored (${unscored.length}): ${unscored.map((item) => item.id ?? item.title).join(', ')}`);
  }
  if (errors.length) {
    out.push('', `Malformed blocks (${errors.length}):`);
    for (const error of errors) out.push(`- ${error.id ?? error.title}: ${error.message}`);
  }
  return out.join('\n');
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

function scoresFrom(options) {
  return {
    bv: Number(options.bv),
    rroe: Number(options.rroe),
    tc: Number(options.tc),
    size: Number(options.size),
    scored: options.scored ?? new Date().toISOString().slice(0, 10),
  };
}

const USAGE = `Usage:
  wsjf.mjs rank   --input <items.json> [--today YYYY-MM-DD] [--format markdown|json]
  wsjf.mjs block  --bv N --rroe N --tc N --size N [--scored YYYY-MM-DD]
  wsjf.mjs upsert --description <file> --bv N --rroe N --tc N --size N [--scored YYYY-MM-DD]`;

export async function main(argv) {
  const [command, ...rest] = argv;
  const options = parseOptions(rest);

  if (command === 'rank') {
    if (!options.input) throw new Error('rank needs --input <items.json>');
    const items = JSON.parse(await readFile(options.input, 'utf8'));
    const result = rankItems(items, options.today ? { today: options.today } : {});
    return options.format === 'json' ? JSON.stringify(result, null, 2) : renderRanking(result);
  }
  if (command === 'block') return renderWsjfBlock(scoresFrom(options));
  if (command === 'upsert') {
    if (!options.description) throw new Error('upsert needs --description <file>');
    return upsertWsjfSection(await readFile(options.description, 'utf8'), scoresFrom(options)).trimEnd();
  }
  throw new Error(USAGE);
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
