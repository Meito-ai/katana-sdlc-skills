#!/usr/bin/env node
/**
 * Guards the two ways a published skill silently fails to ship.
 *
 * Both were measured against apm 0.32.0 with this repo's package shape
 * (an apm.yml carrying a dependencies key). See AGENTS.md.
 *
 *   1. apm scans `.apm/skills/<name>/SKILL.md` -- ONE level. A skill nested in
 *      a category directory publishes NOTHING, with no warning.
 *   2. apm requires the SKILL.md frontmatter `name` to equal its directory
 *      name, and the frontmatter must be ASCII-only.
 *
 * Without this check both failures are invisible until a consumer notices a
 * missing skill, so CI fails the PR instead.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".apm/skills";
const errors = [];
const skills = [];

if (!existsSync(ROOT)) {
  console.error(`✗ ${ROOT} does not exist.`);
  process.exit(1);
}

for (const entry of readdirSync(ROOT)) {
  if (entry.startsWith(".")) continue;
  const dir = join(ROOT, entry);
  if (!statSync(dir).isDirectory()) continue;

  const skillMd = join(dir, "SKILL.md");
  if (!existsSync(skillMd)) {
    // No SKILL.md here -- is this a category directory? That is the silent
    // failure mode, so name it explicitly rather than just "missing SKILL.md".
    const nested = readdirSync(dir).filter(
      (c) => !c.startsWith(".") && existsSync(join(dir, c, "SKILL.md"))
    );
    if (nested.length > 0) {
      errors.push(
        `${dir}/ looks like a category directory containing ${nested.join(", ")}.\n` +
          `    apm scans .apm/skills/<name>/SKILL.md one level deep only, so ` +
          `nothing under it ships.\n` +
          `    Flatten it: .apm/skills/${nested[0]}/SKILL.md`
      );
    } else {
      errors.push(`${dir}/ has no SKILL.md`);
    }
    continue;
  }

  const body = readFileSync(skillMd, "utf8");
  const fm = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) {
    errors.push(`${skillMd} has no YAML frontmatter block`);
    continue;
  }

  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7F]/.test(fm[1])) {
    errors.push(`${skillMd} frontmatter contains non-ASCII characters (apm requires ASCII)`);
  }

  const name = fm[1].match(/^name:[ \t]*["']?([^"'\n]+?)["']?[ \t]*$/m)?.[1];
  if (!name) {
    errors.push(`${skillMd} frontmatter has no "name:" field`);
  } else if (name !== entry) {
    errors.push(`${skillMd} frontmatter name "${name}" != directory name "${entry}"`);
  }

  const description = fm[1].match(/^description:[ \t]*["']?([^\n]+?)["']?[ \t]*$/m)?.[1];
  if (!description) {
    errors.push(`${skillMd} frontmatter has no "description:" field`);
  } else if (description.length > 1024) {
    errors.push(`${skillMd} description is ${description.length} chars (apm limit: 1024)`);
  }

  skills.push(entry);
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s) in ${ROOT}:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  skills.length === 0
    ? `✓ ${ROOT} is valid (no skills authored yet)`
    : `✓ ${skills.length} skill(s) valid: ${skills.sort().join(", ")}`
);
