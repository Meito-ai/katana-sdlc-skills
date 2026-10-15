<!--
Template for the infra runbook, written by step 8 of SKILL.md. Delete this comment.

Fill every %%...%% placeholder. A line or section marked [if <condition>] stays only when the
condition holds; strip the marker when it does. Conditions: cloud (Pulumi Cloud backend), bucket
(self-managed backend), local (local backend), ci (the workflow was written), bridged (Hostinger),
hyperscaler (AWS, Azure, GCP). Add the card's "For the runbook" items where marked.
%%catalog-source%% is where the user lists current server types later: the card's "Live catalog"
command or URL that answered in the interview. Every command must run as written: real paths, real
stack names.
-->

# Infrastructure runbook

Operator procedures for the %%provider%% infrastructure managed by Pulumi. The program lives in
[`%%infra-dir%%`](%%infra-dir-link%%); each stack's values live in `%%infra-dir%%/Pulumi.<stack>.yaml`.

## What it provisions

Per stack (%%stacks%%), on %%provider%% in the stack's region:

%%groups-table%%

- A **firewall** per group: public TCP 22 on every server, plus 80 and 443 on ingress groups.
  Traffic between servers travels the private network.
- A **static IP** per ingress server, kept when the server is rebuilt, so DNS never moves.
- A **private network** %%private-network-rule%%.
- First boot: %%bootstrap-description%%.

Out of scope here, by design: managed databases, object storage, load balancers and reverse proxies,
and DNS records. They belong to the platform layer on top of these servers.

## Prerequisites (one time)

1. **Pulumi Cloud** account. Create an access token (Settings -> Access Tokens) and export it:
   `export PULUMI_ACCESS_TOKEN=...`. The organization `%%org%%` prefixes every stack. [if cloud]
1. **State bucket** `%%backend-url%%`, reachable with the credentials below; log in with
   `pulumi login %%backend-url%%`. [if bucket]
1. **Local state** in `~/.pulumi`, for trying things out only: it lives on one machine and CI cannot
   reach it. `pulumi login --local`. [if local]
2. **%%provider%% credentials**, exported in the shell:
   %%credentials-list%%
3. **SSH key** the servers accept. The public half is `SSH_PUBLIC_KEY`:
   ```bash
   ssh-keygen -t ed25519 -C "%%project%%-infra" -f ~/.ssh/%%project%%-infra
   export SSH_PUBLIC_KEY="$(cat ~/.ssh/%%project%%-infra.pub)"
   ```
4. **The generated provider SDK**: run `pulumi install` in `%%infra-dir%%` before the repo's own
   install on every fresh clone. [if bridged]
5. **GitHub** (Settings -> Secrets and variables -> Actions): [if ci]
   - Secrets: `PULUMI_ACCESS_TOKEN`, `SSH_PUBLIC_KEY`, %%credential-names%%.
   - Repository variable (the *Variables* tab, not an environment variable): `PULUMI_STACK_BASE` =
     `%%org%%/%%project%%`. Every job fails fast without it.
   - Environments (Settings -> Environments): %%stacks%%. Add a required reviewer to the production
     one: manual deploys pause for that approval.

%%card-prerequisites%%

Building and the unit tests need **no credentials**; only `preview`, `up` and the preview test do.

## Create the stacks (once per stack)

From `%%infra-dir%%`, with the credentials and `SSH_PUBLIC_KEY` exported:

```bash
%%stack-init-commands%%
```

Nothing else to commit: the non-secret values are already in `Pulumi.<stack>.yaml`, and the secrets
come from the environment.

## Deploy

A person runs these, never an agent: `up` creates billable resources.

```bash
pulumi preview --stack %%first-stack-ref%%
pulumi up --stack %%first-stack-ref%%
pulumi stack output servers --stack %%first-stack-ref%%
```

CI deploys `%%auto-stack%%` on merge to `%%default-branch%%`; other stacks deploy from Actions ->
Infra (Pulumi) -> Run workflow. [if ci]

After the first `up`, point the DNS A records of the platform's domains at the ingress servers'
`staticIp` values from `pulumi stack output servers`.

%%card-post-deploy%%

## Configuration reference

All inputs are read in one place: `%%infra-dir%%/src/config.ts` (`loadConfig`).

| Input | Where | Notes |
|---|---|---|
| `region` | `Pulumi.<stack>.yaml` | %%region-note%% |
| `image` | `Pulumi.<stack>.yaml` | %%image-note%% |
| `bootstrap` | `Pulumi.<stack>.yaml` | `none` or `docker`; runs on first boot only |
| `serverGroups.<group>.count` | `Pulumi.<stack>.yaml` | `0` skips the group in that stack |
| `serverGroups.<group>.size` | `Pulumi.<stack>.yaml` | the provider's server type |
%%extra-config-rows%%
| `SERVER_GROUPS` | `src/config.ts` | the groups and which take public web traffic; the same in every stack |
| `SSH_PUBLIC_KEY` | environment | never committed |
%%credential-rows%%

## Changing it later

- **More servers in a group**: raise its `count` in the stack file, then preview and up.
- **A bigger server**: change its group's `size` to a current type from %%catalog-source%%.
  %%resize-behaviour%%
- **A new group**: add it to `SERVER_GROUPS` in `src/config.ts`, then give it a `count` and `size`
  in **every** stack file (`count: 0` where it should not run). The unit tests fail until both agree.
- **`image` or `region`**: replaces the servers: a new, empty host. Expect downtime, and run the
  host setup again.
- **The first-boot script** (`src/bootstrap.ts`) reaches new servers only. Apply a change to a
  running server over SSH.
- **Upgrading the provider package**: the `provider-upgrade` skill from `pulumi/agent-skills`
  reconciles the diff a new provider version brings.
- **Secrets**: [Pulumi ESC](https://www.pulumi.com/docs/esc/) can replace the exported variables
  once there are more than a few. [if cloud]
- **CI credentials**: replace the static credential secrets with OIDC federation, so CI holds no
  long-lived cloud key. [if hyperscaler]

## Rollback

`pulumi stack history --stack <stack>` lists past updates. Revert the commit that caused the change
and run `pulumi up` again; a replaced server comes back empty, so restore its data from backups.

## Testing

- Unit tests (no credentials, no network): `%%unit-test-command%%`.
- Preview test (credentials and `PULUMI_PREVIEW_STACK=%%org%%/%%project%%/<throwaway>`):
  `%%preview-test-command%%`. It previews a throwaway copy of the first stack and removes it. [if ci]
