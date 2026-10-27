#!/usr/bin/env node

// Claude Code PostToolUse hook for Bash. After a `gh pr create` or `git push`,
// it compares the visual-pr stamp in the branch's open PR with local HEAD and,
// when they differ, reminds the agent to refresh the description. Every other
// command, and every failure (no PR, no gh, no network), stays silent: a
// reminder is worth a lot less than a hook that gets in the agent's way.

import { spawn } from 'node:child_process';
import process from 'node:process';
import { readStamp, toShortSha } from './contract.mjs';

const TRIGGER_PATTERN = /\bgh\s+pr\s+create\b|\bgit\s+push\b/;

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] });
    let stdout = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(stdout) : reject(new Error(`${command} exit ${code}`))));
  });
}

async function readStdin() {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input;
}

// Compares against local HEAD, not the PR's headRefOid: right after a push,
// GitHub can still report the previous head for a moment.
async function reminderFor(cwd) {
  const localSha = (await run('git', ['rev-parse', 'HEAD'], cwd)).trim();
  const pullRequest = JSON.parse(await run('gh', ['pr', 'view', '--json', 'body,number,state'], cwd));
  if (pullRequest.state !== 'OPEN') {
    return null;
  }

  const stamp = readStamp(pullRequest.body);
  if (!stamp) {
    return `PR #${pullRequest.number} has no visual-pr block. Write its description with the visual-pr skill.`;
  }
  if (localSha.startsWith(stamp)) {
    return null;
  }
  return (
    `PR #${pullRequest.number}'s description is stamped \`${stamp}\` but HEAD is \`${toShortSha(localSha)}\`. ` +
    'Refresh it with the visual-pr skill.'
  );
}

async function main() {
  const payload = JSON.parse(await readStdin());
  const command = payload.tool_input?.command ?? '';
  if (payload.tool_name !== 'Bash' || !TRIGGER_PATTERN.test(command)) {
    return;
  }

  const reminder = await reminderFor(payload.cwd || process.cwd());
  if (reminder) {
    const output = { hookSpecificOutput: { additionalContext: reminder, hookEventName: 'PostToolUse' } };
    process.stdout.write(`${JSON.stringify(output)}\n`);
  }
}

main().catch(() => {});
