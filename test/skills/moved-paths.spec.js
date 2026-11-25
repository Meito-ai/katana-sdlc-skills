import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, test } from 'node:test';

const SKILLS = new URL('../../src/skills/', import.meta.url);
const setup = readFileSync(new URL('setup-katana-skills/SKILL.md', SKILLS), 'utf8');

/** `old -> new` pairs from the "Moved paths" table. */
const oldToNewPaths = [...setup.matchAll(/^\| `(sdlc\/[^`]+)` \| `(sdlc\/[^`]+)` \|$/gm)].map(([, from, to]) => ({ from, to }));

describe('setup-katana-skills moved paths', () => {
  test('maps every old area path to a skill that exists under sdlc/flows or sdlc/atomic', () => {
    assert.ok(oldToNewPaths.length > 0);
    for (const { from, to } of oldToNewPaths) {
      assert.match(from, /^sdlc\/(branch-management|code-review|feature-management|implementation)\//);
      const name = from.split('/').pop();
      assert.match(to, new RegExp(`^sdlc/(flows|atomic)/${name}$`));
      assert.ok(existsSync(new URL(`${to}/SKILL.md`, SKILLS)), `${to} does not exist`);
      assert.ok(!existsSync(new URL(from, SKILLS)), `${from} still exists`);
    }
  });

  test('every skill under sdlc/flows is in the skill table at its new path', () => {
    for (const name of readdirSync(new URL('sdlc/flows/', SKILLS))) {
      assert.match(setup, new RegExp(`\\| \`${name}\` \\| \`sdlc/flows/${name}\``));
    }
  });

  test('rewrites old entries to the new path, and names each one in the preview before writing', () => {
    const text = setup.replace(/\s+/g, ' ');
    assert.match(text, /Rewrite each entry at an old path/);
    assert.match(text, /`<old path>` -> `<new path>`/);
    assert.match(text, /before anything is written/);
  });
});

describe('the release that moves the skills', () => {
  test('carries a changeset whose table maps each old path to its new one', () => {
    const dir = new URL('../../.changeset/', import.meta.url);
    const changeset = readdirSync(dir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .map((f) => readFileSync(new URL(f, dir), 'utf8'))
      .find((t) => t.includes('sdlc/branch-management/'));
    assert.ok(changeset, 'no changeset carries the old-to-new path table');
    for (const { from, to } of oldToNewPaths) {
      assert.match(changeset, new RegExp(`\\| \`${from}\` \\| \`${to}\` \\|`));
    }
  });
});
