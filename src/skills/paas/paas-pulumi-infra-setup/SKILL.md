---
name: paas-pulumi-infra-setup
description: "Interview the user and scaffold the infrastructure layer of a home-grown PaaS with Pulumi in TypeScript: server groups, private network, firewalls and static IPs on one of ten cloud providers, with stacks, unit tests, an optional CI workflow and a runbook. New setups in Node.js repos only; never deploys."
disable-model-invocation: true
---

# PaaS Pulumi infra setup

Scaffold the **infra layer** of a home-grown PaaS: the servers, their private network, firewalls and
static IPs, as a small Pulumi TypeScript program meant to be changed later. Everything above the
servers (databases, storage, reverse proxies, DNS) belongs to later layers and stays out.

This skill writes files and runs local checks. **A person deploys.** It runs no `pulumi up`,
`destroy` or `refresh`, and commits nothing: the user reviews and commits the result.

## Requirements

- **Upstream skills**: `pulumi-overview`, `pulumi-best-practices` and `pulumi-component` from
  `pulumi/agent-skills` **>= v2.0.0**. This skill's `apm.yml` declares them, but a repo that already
  pins `pulumi/agent-skills` keeps its own pin and subset, silently, so step 1 checks they are
  deployed.
- **A Node.js repo** managed with apm. Other languages are planned, not supported.
- **Pulumi CLI** only for Hostinger (its SDK is generated) and for the optional `stack init` /
  `preview` in step 7.
- **Pulumi MCP server**, optional: when connected, its registry tools are the quickest schema lookup.

`<skill-dir>` below is the directory holding this `SKILL.md`. Its files:

- [reference-design.md](reference-design.md): the provider-neutral program every run writes.
- `providers/<provider>.md`, the **card**: one provider's packages, credentials, sizes, resources,
  quirks. The card fills every `card:` slot of the reference design.
- `templates/`: the CI workflow, the runbook and the MCP entry.
- `scripts/detect.mjs`: reads the repo's shape.

## 1. Detect

```bash
node <skill-dir>/scripts/detect.mjs
```

Stop, and say why, when:

- `language` is not `node`: "v1 supports Node.js repos; Pulumi for `<language>` is planned."
- `pulumi.projects` is not empty: name each `Pulumi.yaml`. This skill creates new setups only;
  changing an existing one is `pulumi-best-practices` and `provider-upgrade` territory.
- `apm.manifest` is false: this skill installs its companions with apm.

Note what the report settles, so the interview skips it: package manager, monorepo layout, test
runners, task names, GitHub origin, Pulumi CLI and login, an existing Pulumi MCP entry.
Note which of the three required skills `apm.pulumiSkills` lacks: step 4 adds them.

Done when the report is read and no stop condition holds.

## 2. Interview

One question at a time, in this order. Lead with the recommended answer so the user can accept it in
a word, and skip a question the report already settled. Record each answer: step 3 shows them all.

1. **Provider.** No recommendation; the user picks one:

   | Provider | Card |
   |---|---|
   | AWS | `providers/aws.md` |
   | Microsoft Azure | `providers/azure.md` |
   | Google Cloud | `providers/gcp.md` |
   | Alibaba Cloud | `providers/alibaba.md` |
   | DigitalOcean | `providers/digitalocean.md` |
   | Hetzner Cloud | `providers/hetzner.md` |
   | Linode / Akamai Cloud | `providers/linode.md` |
   | OVHcloud | `providers/ovhcloud.md` |
   | UpCloud | `providers/upcloud.md` |
   | Hostinger (Terraform provider through Pulumi's bridge) | `providers/hostinger.md` |

   Then read the card in full; every later question draws on it. Asked for Equinix or Cloudflare:
   Equinix's server product (Equinix Metal) was retired, and Cloudflare runs no servers, so neither
   fits a server-group setup. Hostinger with no Pulumi CLI (`pulumi.cli.version` is null): install the
   CLI first, or pick another provider.
2. **Layout.** In a monorepo: a **dedicated workspace package** (recommended) at `packages/infra`
   (`libs/infra` when the workspace globs use `libs/*`), or a **folder inside an existing project**:
   ask which, and propose `<project>/infra`. In a single-package repo, `infra/`, without asking. Also
   state the Pulumi project name, the report's `repoName` lowercased, and let the user change either.
3. **Stacks.** Recommend `staging` and `prod`; accept any list. The first stack is the one CI
   deploys on merge.
4. **State backend.** Recommend **Pulumi Cloud**, and ask the organization (propose
   `pulumi.cli.user` when logged in). Alternative: a self-managed bucket URL (`s3://`, `gs://`,
   `azblob://`); warn that the Pulumi MCP server and this skill's CI workflow need Pulumi Cloud.
   Local files only for a quick try-out.
5. **Servers.** Show the card's size table. Then ask for the server groups: a name (`app`, `worker`,
   `db`, ...), whether it is an **ingress** group (static IP, public 80/443), and per stack a count
   and a size (a tier or an exact type). Recommend one ingress group `app`, 1 x S in every stack.
   Then per stack the region (propose one near the user from the card's list) and the image (the
   card's default), plus the card's extra config keys.
6. **First boot.** `none` or `docker`; recommend `docker`.
7. **CI workflow.** Offer only when `git.github` and the backend is Pulumi Cloud, and recommend it.
   Otherwise say which condition failed.
8. **Pulumi MCP server.** Offer only with Pulumi Cloud and no entry yet (`apm.pulumiMcp` is false);
   recommend it.
9. **Extra Pulumi skills**, any of: `pulumi-esc` (secrets and config as environments),
   `pulumi-automation-api` (programs that drive Pulumi), `provider-upgrade` (safe provider bumps).
   Default none; skip the ones already deployed.

Done when every question has an answer.

## 3. Confirm the plan

Show, and let the user edit before anything is written:

- the files to create, as a tree, and every existing file to edit with the change: the infra or host
  `package.json`, the host's build and test config (folder mode: exclude `<infra-dir>`), `turbo.json`
  / `nx.json` only when they list per-package entries, `apm.yml`, the agent file, `.gitignore`;
- each `Pulumi.<stack>.yaml` in full;
- the dependencies to add, with versions (`npm view <package> version`);
- the credentials and variables the user will need (from the card), and where each comes from;
- the card's billing warning, when it has one (Hostinger).

Done when the user approves the plan. Write only what it lists.

## 4. Install

1. **apm.** Add the chosen extras and any missing required skill as **one** entry under
   `dependencies.apm`, listing the three required skills too: apm dedupes by repository, so a second
   `pulumi/agent-skills` entry with a different subset silently drops one of them. When the repo
   already has an entry for `pulumi/agent-skills`, extend its `skills:` list instead; if its `ref` is
   older than v2.0.0, say so.

   ```yaml
   - git: pulumi/agent-skills
     ref: "^2.0.0"
     skills:
       - pulumi/pulumi-overview
       - pulumi/pulumi-best-practices
       - pulumi/pulumi-component
       - pulumi/<each extra>
   ```

   With the MCP server chosen, copy [templates/mcp-entry.yml](templates/mcp-entry.yml) under
   `dependencies.mcp`, comment included. Run `apm install`.
2. **Packages.** Add `@pulumi/pulumi`, the card's package and `tsx` (Pulumi runs the program through
   it), plus the test runner's packages only when the repo lacks them. Package mode: the infra
   `package.json`. Folder mode: the host's `devDependencies`. Run the repo's install command.
3. **Bridged provider** (Hostinger): run the card's `pulumi package add` in `<infra-dir>`, and add
   `sdks/` to `<infra-dir>/.gitignore`.

Done when every chosen skill is deployed under `.claude/skills/` or `.agents/skills/`, and the card's
package resolves from `<infra-dir>`.

## 5. Write the program

Load `pulumi-best-practices` and `pulumi-component` first: the program follows them. Then write
every file of the reference design's layout, filling each `card:` slot from the card.

Check every resource's arguments and outputs against the installed type definitions
(`node_modules/<package>/<resource>.d.ts`, or `sdks/` for a bridged provider) or the MCP registry
tools, never from memory: provider APIs drift, and the card names the resources, not every field.
Where the card says **verify**, check before relying on it, and tell the user what you found.

Then run the typecheck and the unit tests, and fix the code until both are **green**. A test that
encodes a wrong assumption about the provider is fixed, and the change named in the report; a test
is never deleted or skipped to get green.

Done when the typecheck passes and every test the reference design lists exists and passes.

## 6. Write the CI workflow

Only when chosen. Fill [templates/infra-workflow.yml](templates/infra-workflow.yml) into
`.github/workflows/infra.yml`, and write `integration/preview.spec.ts` and its `test:integ` script
from the reference design.

Done when no `%%` placeholder and no `[if` marker is left, and the unit tests are still green.

## 7. Create the stacks (optional)

Offer it only when the backend is reachable (Pulumi Cloud: `PULUMI_ACCESS_TOKEN` set or
`pulumi whoami` succeeds; a bucket: `pulumi login <url>` works) and the card's credentials and
`SSH_PUBLIC_KEY` are exported. With the user's yes, from `<infra-dir>`: `pulumi stack init` for each
stack (`<org>/<project>/<stack>` on Pulumi Cloud), then `pulumi preview --stack <first stack>`.
Report the preview's plan. A failed preview is a finding to fix in step 5's code, not a reason to
skip.

## 8. Runbook and agent wiring

1. **Runbook.** Fill [templates/runbook.md](templates/runbook.md) into `docs/runbooks/infra.md` when
   the repo has `docs/runbooks/`, else `<infra-dir>/README.md`. Every command in it must run as
   written. Done when no `%%` placeholder and no `[if` marker is left.
2. **Agent file.** Pick it as `setup-katana-skills` does: `CLAUDE.md` when it exists and is more
   than an `@AGENTS.md` import, else `AGENTS.md`. Add one line, **outside** any
   `<!-- katana-skills:start -->` ... `<!-- katana-skills:end -->` block (before that block when it
   ends the file):

   ```markdown
   Infrastructure: `<infra-dir>` (Pulumi, <provider>). See `<runbook path>`. Agents never run `pulumi up`.
   ```

## 9. Report

- The files created and changed (`git status --short`); nothing is committed.
- The next commands, from the runbook: credentials to export, stacks to create (unless step 7 did),
  `pulumi preview`, then `pulumi up` **by the user**.
- With CI: the secrets, the `PULUMI_STACK_BASE` variable and the GitHub Environments to create.
- Every **verify** item from the card and what was found, and any test changed in step 5.
- Re-running this skill now stops at the new `Pulumi.yaml`; later changes go through
  `pulumi-best-practices` and the runbook's "Changing it later".
