#!/usr/bin/env node
/**
 * Keeps every apm.yml's `version:` in step with package.json's: the root one,
 * and the per-skill ones under src/skills/ (a skill that declares upstream
 * dependencies carries its own manifest, since a subpath install reads that
 * file rather than the root's).
 *
 * package.json is the source of truth because changesets owns it. apm.yml needs
 * the same number because apm mandates a semver `version:` and consumers pin
 * this repo by the matching git tag.
 *
 * Run with --check to verify instead of write (used in CI).
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHECK = process.argv.includes("--check");
const SKILLS_ROOT = "src/skills";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`package.json version "${version}" is not a bare semver.`);
  console.error("apm rejects anything else, so prereleases need a manual decision.");
  process.exit(1);
}

/** Every apm.yml under dir, at any depth. */
function findManifests(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return findManifests(full);
    return entry === "apm.yml" ? [full] : [];
  });
}

// Only the top-level `version:` key. Anchored to column 0 so a `version:`
// nested under a dependency is never touched.
const RE = /^version:[ \t]*["']?([^"'\s#]+)["']?[ \t]*$/m;
let drifted = false;

for (const manifest of ["apm.yml", ...findManifests(SKILLS_ROOT)]) {
  const source = readFileSync(manifest, "utf8");
  const found = source.match(RE);

  if (!found) {
    console.error(`No top-level "version:" key found in ${manifest}.`);
    process.exit(1);
  }

  if (found[1] === version) {
    console.log(`✓ ${manifest} version ${version} matches package.json`);
  } else if (CHECK) {
    console.error(`✗ version drift: package.json is ${version}, ${manifest} is ${found[1]}.`);
    drifted = true;
  } else {
    writeFileSync(manifest, source.replace(RE, `version: ${version}`));
    console.log(`✓ ${manifest} version ${found[1]} -> ${version}`);
  }
}

if (drifted) {
  console.error(`  Run: npm run version   (or: node scripts/sync-apm-version.js)`);
  process.exit(1);
}
