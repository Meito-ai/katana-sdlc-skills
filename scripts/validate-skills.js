#!/usr/bin/env node
/**
 * Validates the skills this repo publishes, and catches the one pairing that
 * is easy to forget.
 *
 * Skills live at src/skills/<name>/SKILL.md (nesting under a category
 * directory is allowed). Consumers install each one by its subpath at a tag,
 * which is why the source can live here rather than in apm's .apm/skills/.
 *
 * Checks, all measured against apm 0.32.0:
 *
 *  1. Frontmatter `name:` must equal the skill's directory name, and the
 *     frontmatter must be ASCII-only. apm enforces both; a mismatch changes
 *     the deployed name or fails the install.
 *  2. `description:` must exist and be <= 1024 chars.
 *  3. Every skill must have a matching `- ./src/skills/<path>` entry under
 *     devDependencies in the root apm.yml. Without it the skill still
 *     publishes to consumers, but `apm install` does not deploy it into this
 *     repo's .claude/skills/ -- so you cannot use or test your own skill while
 *     writing it, and nothing tells you why.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = "src/skills";
const APM_YML = "apm.yml";
const errors = [];

if (!existsSync(ROOT)) {
  console.error(`x ${ROOT} does not exist.`);
  process.exit(1);
}

/** Every directory at any depth that contains a SKILL.md. */
function findSkills(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (existsSync(join(full, "SKILL.md"))) out.push(full);
    else out.push(...findSkills(full));
  }
  return out;
}

const skillDirs = findSkills(ROOT);

// Self-reference entries in apm.yml, e.g. "- ./src/skills/sdlc/branch-shutdown".
const apmYml = readFileSync(APM_YML, "utf8");
const selfRefs = new Set(
  [...apmYml.matchAll(/^\s*-\s+\.\/(src\/skills\/[^\s#]+?)\/?\s*$/gm)].map((m) => m[1])
);

for (const dir of skillDirs) {
  const name = dir.split(sep).pop();
  const skillMd = join(dir, "SKILL.md");
  const fm = readFileSync(skillMd, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!fm) {
    errors.push(`${skillMd} has no YAML frontmatter block`);
    continue;
  }
  if (/[^\x00-\x7F]/.test(fm[1])) {
    errors.push(`${skillMd} frontmatter has non-ASCII characters (apm requires ASCII)`);
  }

  const declared = fm[1].match(/^name:[ \t]*["']?([^"'\n]+?)["']?[ \t]*$/m)?.[1];
  if (!declared) errors.push(`${skillMd} frontmatter has no "name:" field`);
  else if (declared !== name) {
    errors.push(`${skillMd} frontmatter name "${declared}" != directory name "${name}"`);
  }

  const description = fm[1].match(/^description:[ \t]*["']?([^\n]+?)["']?[ \t]*$/m)?.[1];
  if (!description) errors.push(`${skillMd} frontmatter has no "description:" field`);
  else if (description.length > 1024) {
    errors.push(`${skillMd} description is ${description.length} chars (apm limit: 1024)`);
  }

  const refPath = relative(".", dir).split(sep).join("/");
  if (!selfRefs.has(refPath)) {
    errors.push(
      `${dir} has no self-reference in ${APM_YML}.\n` +
        `    It will publish to consumers but will NOT be installed into\n` +
        `    .claude/skills/ here, so you cannot use it while authoring.\n` +
        `    Add under devDependencies.apm:  - ./${refPath}`
    );
  }
}

// A self-reference pointing at a skill that no longer exists fails the install.
for (const ref of selfRefs) {
  if (!existsSync(join(ref, "SKILL.md"))) {
    errors.push(`${APM_YML} references ./${ref} but ${ref}/SKILL.md does not exist`);
  }
}

if (errors.length > 0) {
  console.error(`x ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  skillDirs.length === 0
    ? `ok ${ROOT} is valid (no skills authored yet)`
    : `ok ${skillDirs.length} skill(s) valid: ${skillDirs
        .map((d) => relative(ROOT, d).split(sep).join("/"))
        .sort()
        .join(", ")}`
);
