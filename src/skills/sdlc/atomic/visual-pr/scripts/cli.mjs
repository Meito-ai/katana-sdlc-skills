#!/usr/bin/env node

// Writes (or refreshes) the visual-pr block in a PR description. Runs locally,
// once the PR exists and HEAD is pushed. The content is composed by the
// visual-pr skill; this only guards the contract and owns the block mechanics.
//
// Reads <run-dir>/visual-pr/content.md and writes nothing but the PR description.
// Ends with one result: `done: <PR url>` on stdout, or `blocked: <reason>` on stderr
// when a precondition the caller owns does not hold. Any other error is a defect in
// the content (fix it and rerun) or in the environment, and carries no prefix.

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { buildBlock } from './contract.mjs';
import { assertHeadMatchesPullRequest, upsertBlock } from './description.mjs';

// A stop the caller can resolve: a missing input, an unpushed head, a broken marker.
class Blocked extends Error {}

// Only commands given `input` get a stdin pipe: writing to the pipe of a child
// that already exited raises EPIPE, which crashes the process when unhandled.
function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} ${args[0]} failed (exit ${code}): ${stderr.trim() || 'no stderr'}`));
    });

    if (input !== undefined) {
      // A child that exits without draining stdin reports through its exit
      // code and stderr; the EPIPE on our side adds nothing.
      child.stdin.on('error', () => {});
      child.stdin.end(input);
    }
  });
}

function parseArguments(values) {
  const [command, ...rest] = values;
  const optionValues = rest[0] === '--' ? rest.slice(1) : rest;
  const options = {};

  for (let index = 0; index < optionValues.length; index += 2) {
    const name = optionValues[index];
    const value = optionValues[index + 1];
    if (!name?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${name ?? 'end of command'}`);
    }
    options[name.slice(2)] = value;
  }

  return { command, options };
}

async function readLocalHeadSha() {
  const stdout = await run('git', ['rev-parse', 'HEAD']);
  return stdout.trim();
}

async function readPullRequest(prNumber) {
  const selector = prNumber ? [prNumber] : [];
  try {
    const stdout = await run('gh', ['pr', 'view', ...selector, '--json', 'body,headRefOid,number,url']);
    return JSON.parse(stdout);
  } catch (error) {
    if (/no pull requests? found/i.test(error.message)) {
      throw new Blocked('missing pull request (none for the current branch; pass --pr <number>)');
    }
    throw error;
  }
}

async function readContent(runDir) {
  const path = join(runDir, 'visual-pr', 'content.md');
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Blocked(`missing ${path}`);
    }
    throw error;
  }
}

function guarded(check) {
  try {
    return check();
  } catch (error) {
    throw new Blocked(error.message);
  }
}

async function runWrite(options) {
  if (!options['run-dir']) {
    throw new Blocked('missing run-dir');
  }
  const content = await readContent(options['run-dir']);

  const pullRequest = await readPullRequest(options.pr);
  const localSha = await readLocalHeadSha();
  guarded(() => assertHeadMatchesPullRequest({ localSha, pullRequestHeadSha: pullRequest.headRefOid }));

  const block = buildBlock({ content, sha: pullRequest.headRefOid });
  const { action, body } = guarded(() => upsertBlock(pullRequest.body, block));
  await run('gh', ['pr', 'edit', String(pullRequest.number), '--body-file', '-'], body);

  process.stdout.write(`done: ${pullRequest.url} (${action} the visual-pr block)\n`);
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === 'write') {
    return runWrite(options);
  }
  throw new Error('Usage: cli.mjs write --run-dir <dir> [--pr <number>]');
}

main().catch((error) => {
  const prefix = error instanceof Blocked ? 'blocked: ' : '';
  process.stderr.write(`visual-pr: ${prefix}${error.message}\n`);
  process.exitCode = 1;
});
