#!/usr/bin/env node

// Writes (or refreshes) the visual-pr block in a PR description. Runs locally,
// once the PR exists and HEAD is pushed. The content is composed by the
// visual-pr skill; this only guards the contract and owns the block mechanics.

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { buildBlock } from './contract.mjs';
import { assertHeadMatchesPullRequest, upsertBlock } from './description.mjs';

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
  const stdout = await run('gh', ['pr', 'view', ...selector, '--json', 'body,headRefOid,number,url']);
  return JSON.parse(stdout);
}

async function runWrite(options) {
  if (!options.body) {
    throw new Error('Missing required option: --body <file>');
  }
  const content = await readFile(options.body, 'utf8');

  const pullRequest = await readPullRequest(options.pr);
  const localSha = await readLocalHeadSha();
  assertHeadMatchesPullRequest({ localSha, pullRequestHeadSha: pullRequest.headRefOid });

  const block = buildBlock({ content, sha: pullRequest.headRefOid });
  const { action, body } = upsertBlock(pullRequest.body, block);
  await run('gh', ['pr', 'edit', String(pullRequest.number), '--body-file', '-'], body);

  process.stdout.write(`${action} visual-pr block on PR #${pullRequest.number}: ${pullRequest.url}\n`);
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === 'write') {
    return runWrite(options);
  }
  throw new Error('Usage: cli.mjs write --body <file> [--pr <number>]');
}

main().catch((error) => {
  process.stderr.write(`visual-pr: ${error.message}\n`);
  process.exitCode = 1;
});
