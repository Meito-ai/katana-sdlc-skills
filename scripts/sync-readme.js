#!/usr/bin/env node
/**
 * Keeps the README's skills table and SDLC flow diagram in step with
 * src/skills/. The prose is written by an agent, not generated here: this
 * script only finds what an agent must (re)write, and stamps rows once it has.
 *
 * Checks:
 *
 *  1. Every skill has a row in the table, and every row links to a skill
 *     that exists.
 *  2. Every row's stamp matches its skill. The stamp hashes what changes when
 *     a skill's capability or its install line changes: the frontmatter
 *     `description:` and the `dependencies:` of the skill's own apm.yml. Not
 *     `version:`, which every release bumps.
 *  3. Every skill under src/skills/sdlc/ appears in the flow diagram.
 *
 * Run with --stamp to write the current stamps into the rows that exist (after
 * the rows have been rewritten, or judged still accurate). Without it, checks
 * only (used in CI and by the Stop hook, scripts/readme-stop-hook.js).
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const SKILLS_ROOT = "src/skills";
export const SDLC_ROOT = "src/skills/sdlc";
export const TABLE_START = "<!-- skills-table:start -->";
export const TABLE_END = "<!-- skills-table:end -->";
export const FLOW_START = "<!-- sdlc-flow:start -->";
export const FLOW_END = "<!-- sdlc-flow:end -->";

// A row: "| [`name`](./src/skills/<path>) <!-- stamp: <hex> --> | ... |".
const ROW = /^\|\s*\[`([^`]+)`\]\(\.\/(src\/skills\/[^)\s]+?)\/?\)\s*(?:<!--\s*stamp:\s*([^\s>]*)\s*-->)?\s*\|/;
const STAMP = /\s*<!--\s*stamp:[^>]*-->/;

/** Every directory at any depth under root that contains a SKILL.md, as repo-relative posix paths. */
export function findSkills(root = SKILLS_ROOT) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root)) {
    if (entry.startsWith(".")) continue;
    const full = join(root, entry);
    if (!statSync(full).isDirectory()) continue;
    if (existsSync(join(full, "SKILL.md"))) out.push(relative(".", full).split(sep).join("/"));
    else out.push(...findSkills(full));
  }
  return out.sort();
}

/** The hash a row is stamped with, from a skill's SKILL.md text and its apm.yml text (or null). */
export function skillHash(skillMd, apmYml) {
  const frontmatter = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const description = frontmatter.match(/^description:[ \t]*(.*)$/m)?.[1].trim() ?? "";
  return createHash("sha256")
    .update(`${description}\n${dependenciesOf(apmYml ?? "")}`)
    .digest("hex")
    .slice(0, 12);
}

/** The top-level `dependencies:` key and everything nested under it, without comments or blank lines. */
function dependenciesOf(apmYml) {
  const out = [];
  let inside = false;
  for (const line of apmYml.split("\n")) {
    if (/^\s*#/.test(line)) continue;
    if (/^\S/.test(line)) inside = /^dependencies:/.test(line);
    const kept = line.replace(/\s+#.*$/, "").trimEnd();
    if (inside && kept) out.push(kept);
  }
  return out.join("\n");
}

function readSkill(path) {
  const apm = join(path, "apm.yml");
  return skillHash(readFileSync(join(path, "SKILL.md"), "utf8"), existsSync(apm) ? readFileSync(apm, "utf8") : null);
}

function section(readme, start, end) {
  const from = readme.indexOf(start);
  const to = readme.indexOf(end);
  return from >= 0 && to > from ? { from: from + start.length, to } : null;
}

/**
 * Compares a README against the skills. `skills` maps each skill path to its
 * hash. Returns the problems, grouped so a caller can phrase each kind.
 */
export function checkReadme(readme, skills) {
  const problems = { markers: [], missing: [], orphaned: [], unstamped: [], stale: [], notInFlow: [] };

  const table = section(readme, TABLE_START, TABLE_END);
  const flow = section(readme, FLOW_START, FLOW_END);
  if (!table) problems.markers.push(`${TABLE_START} … ${TABLE_END}`);
  if (!flow) problems.markers.push(`${FLOW_START} … ${FLOW_END}`);

  if (table) {
    const rows = new Map();
    for (const line of readme.slice(table.from, table.to).split("\n")) {
      const row = line.match(ROW);
      if (row) rows.set(row[2], { name: row[1], stamp: row[3] });
    }
    for (const [path, hash] of Object.entries(skills)) {
      const row = rows.get(path);
      if (!row) problems.missing.push(path);
      else if (!row.stamp) problems.unstamped.push(path);
      else if (row.stamp !== hash) problems.stale.push(path);
    }
    for (const [path, row] of rows) {
      if (!(path in skills) || row.name !== path.split("/").pop()) problems.orphaned.push(path);
    }
  }

  if (flow) {
    const diagram = readme.slice(flow.from, flow.to);
    for (const path of Object.keys(skills)) {
      // Skill names are lower-case letters, digits and hyphens, so they need no escaping.
      const name = path.split("/").pop();
      const inFlow = new RegExp(`(^|[^\\w-])${name}([^\\w-]|$)`).test(diagram);
      if (path.startsWith(`${SDLC_ROOT}/`) && !inFlow) problems.notInFlow.push(path);
    }
  }

  return problems;
}

/** The README with every existing row stamped with its skill's current hash. */
export function stampReadme(readme, skills) {
  const table = section(readme, TABLE_START, TABLE_END);
  if (!table) return readme;
  const body = readme
    .slice(table.from, table.to)
    .split("\n")
    .map((line) => {
      const row = line.match(ROW);
      if (!row || !(row[2] in skills)) return line;
      // row[0] ends at the bar closing the first cell.
      const cell = line.slice(0, row[0].length - 1).replace(STAMP, "").trimEnd();
      return `${cell} <!-- stamp: ${skills[row[2]]} --> |${line.slice(row[0].length)}`;
    })
    .join("\n");
  return readme.slice(0, table.from) + body + readme.slice(table.to);
}

export function hasProblems(problems) {
  return Object.values(problems).some((list) => list.length > 0);
}

/** One line per problem, each saying what to do. */
export function describe(problems) {
  const lines = [];
  for (const marker of problems.markers) lines.push(`README.md is missing the markers ${marker}.`);
  for (const path of problems.missing) lines.push(`${path}: no row in the README skills table. Write one.`);
  for (const path of problems.orphaned) lines.push(`${path}: the README row links to no skill of that name. Fix or remove it.`);
  for (const path of problems.unstamped) lines.push(`${path}: the README row has no stamp. Check it against the SKILL.md.`);
  for (const path of problems.stale) {
    lines.push(`${path}: changed since its README row was written. Rewrite the row, or keep it if it is still accurate.`);
  }
  for (const path of problems.notInFlow) lines.push(`${path}: not in the README's SDLC flow diagram. Add it.`);
  return lines;
}

export function currentSkills() {
  return Object.fromEntries(findSkills().map((path) => [path, readSkill(path)]));
}

function main() {
  const skills = currentSkills();
  let readme = readFileSync("README.md", "utf8");

  if (process.argv.includes("--stamp")) {
    const stamped = stampReadme(readme, skills);
    if (stamped !== readme) writeFileSync("README.md", stamped);
    readme = stamped;
  }

  const problems = checkReadme(readme, skills);
  if (!hasProblems(problems)) {
    console.log(`ok README.md covers ${Object.keys(skills).length} skill(s), every row stamped`);
    return;
  }
  console.error(`x README.md is out of step with ${SKILLS_ROOT}/:\n`);
  for (const line of describe(problems)) console.error(`  - ${line}`);
  console.error(`\n  Row style: AGENTS.md, "README skill rows". Then: npm run readme:stamp`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
