import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// The SDLC skills read and write the tracker only through issue-tracker's
// contract, so none of them may name a tracker or a tracker tool. Code-host
// commands (gh pr, glab mr) stay allowed: the code host is not the tracker.

const SKILLS = new URL('../../src/skills/', import.meta.url);
const SDLC_SKILLS = [
  'sdlc/feature-management/build-up-spec',
  'sdlc/feature-management/slice-spec',
  'sdlc/feature-management/bug-intake',
  'sdlc/feature-management/wsjf',
  'sdlc/implementation/implement-issue',
];

const TRACKER_NAMES = [
  /\bsave_(issue|document|comment|issue_label)\b/,
  /\b(get|list)_(issue|document|issues|comments|issue_labels)\b/,
  /\bgh (issue|label|search issues)\b/,
  /\bglab (issue|api|label|work-items)\b/,
  /\bacli\b/,
  /\bLinear\b/,
  /\bJira\b/,
  /GitHub [Ii]ssues?\b/,
];

const markdown = SDLC_SKILLS.flatMap((path) =>
  readdirSync(new URL(`${path}/`, SKILLS), { recursive: true })
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({ path: `${path}/${file}`, text: readFileSync(new URL(`${path}/${file}`, SKILLS), 'utf8') })),
);

describe('the SDLC skills are tracker-blind', () => {
  test('no SDLC skill names a tracker or a tracker tool', () => {
    const offenders = markdown.flatMap(({ path, text }) =>
      text.split('\n').flatMap((line, index) =>
        TRACKER_NAMES.filter((name) => name.test(line)).map((name) => `${path}:${index + 1} ${name}`),
      ),
    );
    assert.deepEqual(offenders, []);
  });

  test('every SDLC skill needs issue-tracker', () => {
    for (const path of SDLC_SKILLS) {
      const skill = readFileSync(new URL(`${path}/SKILL.md`, SKILLS), 'utf8');
      assert.match(skill, /`issue-tracker`/, `${path} does not name issue-tracker`);
    }
  });

  test('no SDLC skill declares issue-tracker in its apm.yml', () => {
    for (const path of SDLC_SKILLS) {
      let manifest = '';
      try {
        manifest = readFileSync(new URL(`${path}/apm.yml`, SKILLS), 'utf8');
      } catch {
        continue;
      }
      assert.ok(!manifest.includes('issue-tracker'), `${path}/apm.yml declares issue-tracker`);
    }
  });
});
