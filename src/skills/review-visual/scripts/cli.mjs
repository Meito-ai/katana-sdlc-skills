#!/usr/bin/env node

// Posts (or refreshes) the review-visual PR comment. Runs locally, after
// `gh pr create`, as an optional step of the host repo's PR workflow.
// The visual itself is composed by the review-visual skill; this only guards the
// contract and owns the sticky-comment mechanics.

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { assertHeadMatchesPullRequest, upsertReviewVisualComment } from './comment.mjs';
import { buildReviewVisualComment, renderNoOpComment } from './contract.mjs';

// `promisify(execFile)` silently drops an `input` option, which would leave
// `gh api --input -` waiting on a stdin that never closes. Spawn and write it.
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

function gh(args, input) {
  return run('gh', args, input);
}

async function readLocalHeadSha() {
  const stdout = await run('git', ['rev-parse', 'HEAD']);
  return stdout.trim();
}

async function readPullRequest(prNumber) {
  const selector = prNumber ? [prNumber] : [];
  const stdout = await gh(['pr', 'view', ...selector, '--json', 'headRefOid,number,url']);
  return JSON.parse(stdout);
}

function commentApi(prNumber) {
  return {
    createComment: async ({ body }) => {
      const stdout = await gh(
        ['api', '--method', 'POST', `repos/{owner}/{repo}/issues/${prNumber}/comments`, '--input', '-'],
        JSON.stringify({ body }),
      );
      return JSON.parse(stdout);
    },
    // `gh api --slurp` cannot be combined with `--jq`, so page through as JSON
    // Lines instead: jq's compact output escapes newlines, one comment per line.
    listComments: async () => {
      const stdout = await gh([
        'api',
        '--paginate',
        `repos/{owner}/{repo}/issues/${prNumber}/comments`,
        '--jq',
        '.[] | {id, body, html_url}',
      ]);
      return stdout
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line));
    },
    updateComment: async ({ body, id }) => {
      const stdout = await gh(
        ['api', '--method', 'PATCH', `repos/{owner}/{repo}/issues/comments/${id}`, '--input', '-'],
        JSON.stringify({ body }),
      );
      return JSON.parse(stdout);
    },
  };
}

async function buildBody(options, sha) {
  if (options['no-delta']) {
    if (options.body) {
      throw new Error('Pass either --body or --no-delta, not both');
    }
    return renderNoOpComment({ reason: options['no-delta'], sha });
  }

  if (!options.body) {
    throw new Error('Missing required option: --body <file> (or --no-delta "<reason>")');
  }
  return buildReviewVisualComment({ content: await readFile(options.body, 'utf8'), sha });
}

async function runPost(options) {
  const pullRequest = await readPullRequest(options.pr);
  const localSha = await readLocalHeadSha();
  assertHeadMatchesPullRequest({ localSha, pullRequestHeadSha: pullRequest.headRefOid });

  const body = await buildBody(options, pullRequest.headRefOid);
  const result = await upsertReviewVisualComment({ body, ...commentApi(pullRequest.number) });

  process.stdout.write(`${result.action} review visual on PR #${pullRequest.number}: ${result.url}\n`);
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === 'post') {
    return runPost(options);
  }
  throw new Error('Usage: cli.mjs post --body <file> [--pr <number>] | post --no-delta "<reason>" [--pr <number>]');
}

main().catch((error) => {
  process.stderr.write(`review-visual: ${error.message}\n`);
  process.exitCode = 1;
});
