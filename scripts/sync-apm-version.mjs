#!/usr/bin/env node
/**
 * Keeps apm.yml's `version:` in step with package.json's.
 *
 * package.json is the source of truth because changesets owns it. apm.yml needs
 * the same number because apm mandates a semver `version:` and consumers pin
 * this repo by the matching git tag.
 *
 * Run with --check to verify instead of write (used in CI).
 */
import { readFileSync, writeFileSync } from "node:fs";

const CHECK = process.argv.includes("--check");
const APM_YML = "apm.yml";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`package.json version "${version}" is not a bare semver.`);
  console.error("apm rejects anything else, so prereleases need a manual decision.");
  process.exit(1);
}

const source = readFileSync(APM_YML, "utf8");
// Only the top-level `version:` key. Anchored to column 0 so a `version:`
// nested under a dependency is never touched.
const RE = /^version:[ \t]*["']?([^"'\s#]+)["']?[ \t]*$/m;
const found = source.match(RE);

if (!found) {
  console.error(`No top-level "version:" key found in ${APM_YML}.`);
  process.exit(1);
}

if (found[1] === version) {
  console.log(`✓ ${APM_YML} version ${version} matches package.json`);
  process.exit(0);
}

if (CHECK) {
  console.error(
    `✗ version drift: package.json is ${version}, ${APM_YML} is ${found[1]}.\n` +
      `  Run: npm run version   (or: node scripts/sync-apm-version.mjs)`
  );
  process.exit(1);
}

writeFileSync(APM_YML, source.replace(RE, `version: ${version}`));
console.log(`✓ ${APM_YML} version ${found[1]} -> ${version}`);
