# Reference design

The provider-neutral shape of every program this skill writes. The chosen provider's card
(`providers/<provider>.md`) fills each `card:` slot below with that provider's resources, and the
live catalog (SKILL.md, step 2) each `catalog:` slot; everything else is written as shown. When the
card and this file disagree, the card wins for its provider.

Placeholders: `<infra-dir>` is the directory chosen in the interview, `<project>` the Pulumi project
name, `<stack>` each stack name.

## Layout

```
<infra-dir>/
├── Pulumi.yaml
├── Pulumi.<stack>.yaml        # one per stack
├── package.json               # package mode only
├── tsconfig.json
├── .gitignore                 # bridged providers only: sdks/
├── src/
│   ├── index.ts               # entry: loadConfig -> Environment -> exports
│   ├── config.ts              # SERVER_GROUPS + loadConfig: the single config read point
│   ├── topology.ts            # pure helpers: groups, ports, names (no resources)
│   ├── bootstrap.ts           # first-boot script
│   ├── environment.ts         # Environment component
│   ├── network.ts             # Network component: private network (+ cloud scaffolding)
│   ├── firewall.ts            # Firewall component
│   ├── server-group.ts        # ServerGroup component: count x server (+ static IP)
│   └── *.spec.ts              # unit tests beside the code
└── integration/
    └── preview.spec.ts        # with the CI workflow only
```

**Package mode** (a dedicated workspace package): `package.json` named `<scope>/infra` (or `infra`
without a scope), `"private": true`, owning the `@pulumi/*` dependencies.

**Folder mode** (a folder inside an existing project, or `infra/` in a single-package repo): no
`package.json` of its own. `@pulumi/*` go into the host project's `package.json` as
**devDependencies** (they are needed to run Pulumi, never at app runtime), and the scripts are added
there with an `infra:` prefix. The folder still gets its own `tsconfig.json`, and the host's build
`tsconfig` and test config must **exclude** `<infra-dir>`, or the app build compiles the Pulumi program.

## Pulumi.yaml

```yaml
name: <project>
description: <one line: what this infrastructure is>
runtime:
  name: nodejs
  options:
    packagemanager: <npm | pnpm | yarn | bun>
    typescript: false
    nodeargs: "--import tsx"
main: src/index.ts
```

`main` always points at the file, so the host `package.json` "main" never matters (folder mode).
A bridged provider adds a `packages:` block, written by `pulumi package add` (see its card).

**Pulumi runs the program through `tsx`**, not its built-in TypeScript support. The built-in path
loads the `typescript` package's JavaScript compiler API through a bundled ts-node 7: TypeScript 7
has no such API, and with TypeScript 6 the bundled ts-node fails to resolve `@types/node`. `tsx`
works with every TypeScript version, in CommonJS and ESM alike, so the program never depends on
which TypeScript the repo uses. Type checking is the `typecheck` script's job, run in step 5 and in
CI.

## Stack files

One `Pulumi.<stack>.yaml` per stack, committed. Only non-secret values; secrets never appear here.

```yaml
config:
  <project>:region: <catalog: the chosen region>
  <project>:image: <catalog: the newest Ubuntu LTS, in the card's image form>
  <project>:bootstrap: docker          # none | docker
  <project>:serverGroups:
    app:
      count: 1
      size: <catalog: the type the tier resolved to>
```

Every group in `SERVER_GROUPS` (below) appears under `serverGroups` in every stack. A group a stack
does not run gets `count: 0`. Provider-specific keys (an OVH project id, a GCP project) come from the
card and sit beside these.

## Source modules

### `topology.ts`: pure helpers

No Pulumi resources, so it is tested without mocks.

```ts
export interface GroupShape {
  /** Takes public web traffic: gets a static IP and public 80/443. */
  readonly ingress: boolean;
}

export interface GroupScale {
  readonly count: number;
  readonly size: string;
}

export interface ServerGroupSpec extends GroupShape, GroupScale {
  readonly name: string;
}

export interface PortRule {
  readonly port: string;
  readonly description: string;
}

/** The private address space every stack uses. */
export const PRIVATE_CIDR = '10.0.0.0/16';
export const SUBNET_CIDR = '10.0.1.0/24';

/** Merges the fixed shape with one stack's scale; rejects any mismatch between the two. */
export function resolveGroups(
  shapes: Record<string, GroupShape>,
  scale: Record<string, GroupScale>,
): ServerGroupSpec[] {
  const unknown = Object.keys(scale).filter((name) => !(name in shapes));
  if (unknown.length > 0) {
    throw new Error(`serverGroups lists unknown group(s): ${unknown.join(', ')}. Add them to SERVER_GROUPS first.`);
  }
  return Object.entries(shapes).map(([name, shape]) => {
    const entry = scale[name];
    if (!entry) throw new Error(`serverGroups has no entry for "${name}". Give it a count (0 to skip) and a size.`);
    if (!Number.isInteger(entry.count) || entry.count < 0) {
      throw new Error(`serverGroups.${name}.count must be a whole number >= 0, got ${entry.count}.`);
    }
    if (typeof entry.size !== 'string' || entry.size.length === 0) {
      throw new Error(`serverGroups.${name}.size must be a provider server type.`);
    }
    return { name, ingress: shape.ingress, count: entry.count, size: entry.size };
  });
}

export function totalServers(groups: readonly ServerGroupSpec[]): number {
  return groups.reduce((sum, group) => sum + group.count, 0);
}

/** A private network exists once servers have someone to talk to. */
export function needsPrivateNetwork(groups: readonly ServerGroupSpec[]): boolean {
  return totalServers(groups) > 1;
}

/** Public TCP ingress. Everything else between servers travels the private network. */
export function publicPorts(ingress: boolean): PortRule[] {
  const ssh = { port: '22', description: 'SSH' };
  if (!ingress) return [ssh];
  return [ssh, { port: '80', description: 'HTTP + ACME http-01' }, { port: '443', description: 'HTTPS' }];
}

/** Logical name of the index-th server of a group: app-1, app-2, ... */
export function serverName(group: string, index: number): string {
  return `${group}-${index + 1}`;
}
```

### `config.ts`: the single read point

```ts
import * as pulumi from '@pulumi/pulumi';
import { type GroupScale, type GroupShape, resolveGroups, type ServerGroupSpec } from './topology';

/**
 * The topology: which server groups exist and which take public web traffic. The shape is
 * identical in every stack; each stack's Pulumi.<stack>.yaml sets only count and size.
 */
export const SERVER_GROUPS: Record<string, GroupShape> = {
  app: { ingress: true },
};

export type Bootstrap = 'none' | 'docker';

export interface InfraConfig {
  readonly region: string;
  readonly image: string;
  readonly bootstrap: Bootstrap;
  readonly groups: readonly ServerGroupSpec[];
  readonly sshPublicKey: string;
  // card: provider-specific non-secret keys
}

// Nothing else reads pulumi.Config or process.env. Non-secret values are committed in
// Pulumi.<stack>.yaml; SSH_PUBLIC_KEY and the provider credentials come from the environment
// (CI secrets in CI, exported locally) and are never committed.
export function loadConfig(): InfraConfig {
  const config = new pulumi.Config();

  const sshPublicKey = process.env.SSH_PUBLIC_KEY;
  if (!sshPublicKey) {
    throw new Error(
      'SSH_PUBLIC_KEY is not set. Export the public key the servers should accept ' +
        '(a CI secret in CI). It is never stored in stack config.',
    );
  }

  return {
    region: config.require('region'),
    image: config.require('image'),
    bootstrap: parseBootstrap(config.require('bootstrap')),
    groups: resolveGroups(SERVER_GROUPS, config.requireObject<Record<string, GroupScale>>('serverGroups')),
    sshPublicKey,
  };
}

export function parseBootstrap(value: string): Bootstrap {
  if (value === 'none' || value === 'docker') return value;
  throw new Error(`bootstrap must be "none" or "docker", got "${value}".`);
}
```

Write `SERVER_GROUPS` from the interview: one entry per group, `ingress` as the user marked it.

### `bootstrap.ts`: first boot

```ts
import type { Bootstrap } from './config';

// Runs once, when a server is created. Editing it never reaches a running server: the server
// ignores changes to it (rule 3). A shell script rather than #cloud-config, so every provider
// takes it: cloud-init runs a `#!` user-data as a script, and providers without cloud-init take
// it as a post-install script.
export function buildBootstrapScript(bootstrap: Bootstrap): string | undefined {
  if (bootstrap === 'none') return undefined;
  return [
    '#!/bin/bash',
    'set -euo pipefail',
    'curl -fsSL https://get.docker.com | sh',
    'systemctl enable --now docker',
    '',
  ].join('\n');
}
```

### Components

Four `ComponentResource`s, type tokens `paas:infra:<Name>`. Every child is created with
`{ parent: this }`, and every component ends with `registerOutputs`. Components take everything as
arguments and never read config or the environment.

```ts
// environment.ts
export interface ServerInfo {
  readonly name: string;
  readonly publicIp: string;
  readonly privateIp: string | null;
  readonly staticIp: string | null;
}

export interface EnvironmentArgs {
  readonly region: string;
  readonly image: string;
  readonly groups: readonly ServerGroupSpec[];
  readonly userData: string | undefined;
  readonly sshPublicKey: pulumi.Input<string>;
  // card: provider-specific args (from InfraConfig)
}

export class Environment extends pulumi.ComponentResource {
  /** Every server, keyed by group. */
  public readonly servers: pulumi.Output<Record<string, ServerInfo[]>>;
  /** The private network's id, or null when the stack has none (an undefined output only warns). */
  public readonly privateNetworkId: pulumi.Output<string | null>;

  constructor(name: string, args: EnvironmentArgs, opts?: pulumi.ComponentResourceOptions) {
    super('paas:infra:Environment', name, {}, opts);
    // card: SSH key resource, when the provider has one
    // Network -> Firewall -> one ServerGroup per group, wired as the card describes
    // servers = all groups' ServerInfo lists, keyed by group name
    this.registerOutputs({ servers: this.servers, privateNetworkId: this.privateNetworkId });
  }
}
```

- **`Network`**: creates the private network (and subnet) when `needsPrivateNetwork(groups)`, or
  always when the card says the provider needs one. CIDRs from `PRIVATE_CIDR` / `SUBNET_CIDR`. On the
  hyperscalers it also holds the scaffolding a VM needs to exist (VPC, subnet, internet gateway or
  route, resource group): a fresh network per stack, never the account's default.
- **`Firewall`**: two rule sets from `publicPorts(true)` (ingress groups) and `publicPorts(false)`
  (all other groups), each also allowing all traffic from `PRIVATE_CIDR`. Egress is unrestricted: on
  a provider whose firewall denies outbound by default, add explicit allow-all outbound rules.
- **`ServerGroup`**: `count` servers named `serverName(group, i)`, each with the bootstrap as user
  data, the SSH key, the group's firewall, and a private-network attachment when the network exists.
  An ingress group's servers each get a static IP (rule 4). Exposes `servers: Output<ServerInfo[]>`.

### `index.ts`

```ts
import * as pulumi from '@pulumi/pulumi';
import { buildBootstrapScript } from './bootstrap';
import { loadConfig } from './config';
import { Environment } from './environment';

const cfg = loadConfig();

// The root component is named after the project, so names follow a rename of Pulumi.yaml.
const env = new Environment(pulumi.getProject(), {
  region: cfg.region,
  image: cfg.image,
  groups: cfg.groups,
  userData: buildBootstrapScript(cfg.bootstrap),
  sshPublicKey: cfg.sshPublicKey,
});

export const servers = env.servers;
export const privateNetworkId = env.privateNetworkId;
```

When the card's provider sets its region on the provider (AWS, GCP, Alibaba), create one explicit
provider from `cfg.region` here and pass it as `{ providers: [provider] }`, so `region` stays the
single source; children inherit it through `parent`. Data-source calls inside components pass
`{ parent: this }` to inherit it too.

## Rules

Each one is a lesson from running this shape in production. They hold on every provider.

1. **One config read point.** `loadConfig` is the only reader of `pulumi.Config` and `process.env`.
2. **Secrets come from the environment.** Provider credentials (named in the card) and
   `SSH_PUBLIC_KEY` are exported locally and stored as CI secrets. Stack files hold only non-secret
   values.
3. **First-boot inputs are ignored after creation.** Put the server's user-data and SSH-key fields
   (named in the card) in `ignoreChanges`. They take effect only at creation, and many providers
   treat a change as replace: diffing them would rebuild a live server to apply what only a rebuild
   can. A new server still gets both. Apply changes to running servers over SSH.
4. **Static IPs outlive servers.** A static IP is its own resource, never deleted with its server.
   Attach it with the provider's association resource where one exists. When the IP can only be
   bound through a server input that forces replacement, mark the server `deleteBeforeReplace: true`:
   the IP can belong to one server at a time, so create-before-delete would deadlock. Such a
   replacement means downtime and a wiped host; the runbook says so.
5. **Names.** Logical names are `serverName(group, i)` under the component tree. Leave physical names
   to Pulumi's autonaming. Where the card says the provider needs an explicit unique name or label,
   use `` `${pulumi.getProject()}-${pulumi.getStack()}-<suffix>` `` within that provider's limits.
6. **Labels.** Where the provider supports labels or tags, set `project`, `stack` and `group`.
7. **Outputs by group.** Export `servers` keyed by group, so a later skill or person finds a group's
   IPs without knowing the resource tree.

## Size tiers

The interview offers sizes as tiers, resolved against the live catalog for the stack's region; the
stack file stores the exact type, so a later change is an edit to that string.

| Tier | Target |
|---|---|
| S | 2 vCPU / 4 GB |
| M | 4 vCPU / 8 GB |
| L | 8 vCPU / 16 GB |

For each tier, pick the **cheapest** type that meets both targets among those the region sells (a
type with no price there is not for sale) and the catalog shows as current (not deprecated, no
successor). No GPUs; x86, matching the image, unless the user asks for Arm; shared or burstable
vCPUs are fine. When no type meets a target, take the closest by memory and say so.

## Package wiring

**Module mode** follows the `package.json` in effect (the infra package's, or the host's in folder
mode). `"type": "module"`: relative imports end in `.js` (`from './config.js'`). Otherwise (CommonJS,
the default for a new package): extensionless static imports. A dynamic `import()` takes the `.js`
extension in **both** modes: under `nodenext` it is always an ECMAScript import. `tsconfig.json`, in
both modes:

```json
{
  "extends": "<repo base tsconfig, when there is one>",
  "compilerOptions": {
    "strict": true,
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2022",
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "integration/**/*.ts"]
}
```

Add the test runner's types when it needs them (`"jest"` for jest globals).

**Scripts.** Add only the task names the repo already uses (from `detect.mjs`): `typecheck` /
`build` -> `tsc -p tsconfig.json` (no emit: Pulumi runs the TypeScript directly), `lint` -> the
repo's linter on this directory, `test` -> the unit tests, and `test:integ` -> the preview test when
CI is set up. Folder mode prefixes each with `infra:` and points it at `<infra-dir>`.

**Dependencies.** `@pulumi/pulumi` and the card's package, at the current version range
(`npm view <package> version`); `tsx`, which runs the program (see `Pulumi.yaml`); `typescript` and
`@types/node` at the versions the repo already uses. The test runner's own packages only when the
repo lacks them.

## Tests

Unit tests run with no credentials and no network. Use the repo's test runner; with none, use
`node:test` through the `tsx` loader: `node --import tsx --test "src/**/*.spec.ts"`. The unit run
never picks up `integration/`.

### What they cover

- `topology.spec.ts`: `resolveGroups` (an unknown group, a missing group, a negative or fractional
  count, an empty size each throw), `publicPorts`, `needsPrivateNetwork`, `serverName`.
- `bootstrap.spec.ts`: `none` gives `undefined`; `docker` gives a script starting `#!/bin/bash`.
- `config.spec.ts`: `loadConfig` throws without `SSH_PUBLIC_KEY`, and `parseBootstrap` rejects an
  unknown value. Set config with `pulumi.runtime.setAllConfig({ '<project>:region': ... })`.
- `environment.spec.ts`, through the component's outputs only, never provider type tokens:
  - each group has `count` servers;
  - every ingress server has a `staticIp` and no other server does;
  - `privateNetworkId` is non-null exactly when the card says a network exists for that topology
    (more than one server, or always).

### Mocks

`setMocks` must run before the components are loaded, so import them dynamically after it (with the
`.js` extension, see "Module mode"):

```ts
import * as pulumi from '@pulumi/pulumi';

pulumi.runtime.setMocks(
  {
    newResource: (args) => ({
      // card: some providers need numeric ids
      id: `${args.name}-id`,
      // plus every output attribute the components read for ServerInfo, with documentation addresses
      state: { ...args.inputs },
    }),
    // a fixture for each data-source call the program makes (the card's lookups)
    call: (args) => args.inputs,
  },
  '<project>',
  'staging',
  false,
);

function value<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => output.apply(resolve));
}

// inside a test:
const { Environment } = await import('./environment.js');
```

Mock addresses come from the documentation ranges: `203.0.113.0/24` public, `10.0.1.0/24` private.

### Preview test (CI only)

`integration/preview.spec.ts` previews a throwaway stack, so it never touches the real stacks. Written
for vitest; the other runners differ only where the comments say.

```ts
import { copyFileSync, rmSync } from 'node:fs';
import * as path from 'node:path';
// The automation namespace comes from the package root: @pulumi/pulumi has no export map, so the
// '@pulumi/pulumi/automation' subpath does not resolve in an ESM package under nodenext.
import * as pulumi from '@pulumi/pulumi';
import { afterAll, describe, expect, it } from 'vitest';

// CI passes a unique <org>/<project>/ci-<run id>; set it by hand to run this locally.
const STACK_NAME = process.env.PULUMI_PREVIEW_STACK ?? '';
const SHORT_NAME = STACK_NAME.split('/').pop() ?? '';
// ESM: path.dirname(fileURLToPath(import.meta.url)) instead of __dirname
const WORK_DIR = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(WORK_DIR, `Pulumi.${SHORT_NAME}.yaml`);

// card: the provider credential variables
const HAS_CREDS = Boolean(STACK_NAME && process.env.PULUMI_ACCESS_TOKEN /* && card credentials */);

// jest: (HAS_CREDS ? describe : describe.skip)('preview', ...)
// node:test: describe('preview', { skip: !HAS_CREDS }, ...), with after() and node:assert
describe.skipIf(!HAS_CREDS)('preview', () => {
  let stack: pulumi.automation.Stack | undefined;

  afterAll(async () => {
    if (stack) await stack.workspace.removeStack(STACK_NAME, { force: true });
    rmSync(CONFIG_FILE, { force: true });
  });

  it('plans the first stack topology', async () => {
    // The throwaway stack previews the first stack's committed config.
    copyFileSync(path.join(WORK_DIR, 'Pulumi.<first stack>.yaml'), CONFIG_FILE);
    stack = await pulumi.automation.LocalWorkspace.createOrSelectStack(
      { stackName: STACK_NAME, workDir: WORK_DIR },
      { envVars: { SSH_PUBLIC_KEY: 'ssh-ed25519 AAAA preview' } },
    );
    const preview = await stack.preview();
    expect(preview.changeSummary.create ?? 0).toBeGreaterThan(0);
  }, 300_000);
});
```

It skips without credentials so it stays runnable locally. In CI the workflow decides whether
credentials exist **before** running it and fails when they do not, so a skip is never green.
