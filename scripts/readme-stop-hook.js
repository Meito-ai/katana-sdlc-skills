#!/usr/bin/env node
/**
 * Claude Code Stop hook. When this branch touches src/skills/ or README.md and
 * the README is out of step with the skills (scripts/sync-readme.js), it
 * blocks the stop and tells the agent which rows to write and which skills to
 * re-check in the flow diagram.
 *
 * Branches that touch neither stay silent even when the README is stale: CI
 * keeps main clean, so that README is someone else's branch's to fix. So does
 * every failure (no git, no origin): a check worth a lot less than a hook that
 * gets in the agent's way.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

import { checkReadme, currentSkills, describe, hasProblems, SDLC_ROOT, SKILLS_ROOT } from "./sync-readme.js";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/** Files this branch changes against the default branch: committed, staged, unstaged and untracked. */
function changedFiles() {
  let base = "origin/main";
  try {
    base = git("rev-parse", "--abbrev-ref", "origin/HEAD").trim();
  } catch {}
  const mergeBase = git("merge-base", "HEAD", base).trim();
  return [...git("diff", "--name-only", mergeBase).split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")];
}

function message(problems) {
  const recheck = [...problems.missing, ...problems.unstamped, ...problems.stale].filter((path) =>
    path.startsWith(`${SDLC_ROOT}/`)
  );
  return [
    "README.md is out of step with the skills:",
    ...describe(problems).map((line) => `- ${line}`),
    "",
    'Write each row from its SKILL.md, following "README skill rows" in AGENTS.md.',
    ...(recheck.length > 0
      ? [`Then check that the SDLC flow diagram still shows the place and gates of: ${recheck.map((p) => p.split("/").pop()).join(", ")}.`]
      : []),
    "Finish with `npm run readme:stamp`, which must print ok.",
  ].join("\n");
}

function main() {
  const payload = JSON.parse(readFileSync(0, "utf8") || "{}");
  // The agent already continued once because of this hook; let it stop.
  if (payload.stop_hook_active) return;
  if (payload.cwd) process.chdir(payload.cwd);
  process.chdir(git("rev-parse", "--show-toplevel").trim());

  if (!changedFiles().some((file) => file.startsWith(`${SKILLS_ROOT}/`) || file === "README.md")) return;

  const problems = checkReadme(readFileSync("README.md", "utf8"), currentSkills());
  if (hasProblems(problems)) process.stdout.write(`${JSON.stringify({ decision: "block", reason: message(problems) })}\n`);
}

try {
  main();
} catch {}
