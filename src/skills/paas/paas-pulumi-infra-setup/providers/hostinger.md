# Hostinger

Hostinger has no native Pulumi package. Pulumi bridges its official Terraform provider
(`hostinger/hostinger`) into a local SDK, which needs the **Pulumi CLI** at setup time.

| | |
|---|---|
| Package | generated: run `pulumi package add terraform-provider hostinger/hostinger` in `<infra-dir>`. It writes `sdks/hostinger`, adds a `packages:` entry to `Pulumi.yaml`, and prints the dependency line and import name to use |
| Credentials | `HOSTINGER_API_TOKEN`: an API token from hPanel's account settings |
| `region` | a numeric **data center id**, stored as a string |
| `size` | a plan **price id**, which carries the currency and billing period |
| `image` | a numeric OS **template id**, stored as a string |
| Private network | none: the API has no private networking, so `privateNetworkId` is always null |
| SSH user | `root` |

## Live catalog

- **Authenticated** only: the ids need the token. When it is not in this session's environment,
  ask the user to run these calls and paste the output (it holds no secret).

  ```bash
  curl -s -H "Authorization: Bearer $HOSTINGER_API_TOKEN" https://developers.hostinger.com/api/vps/v1/data-centers
  curl -s -H "Authorization: Bearer $HOSTINGER_API_TOKEN" https://developers.hostinger.com/api/vps/v1/templates
  curl -s -H "Authorization: Bearer $HOSTINGER_API_TOKEN" https://developers.hostinger.com/api/billing/v1/catalog
  ```

- **Public**: https://www.hostinger.com/vps-hosting shows the plans and prices, not the ids.

## Billing: say this before the plan is confirmed

**Creating a VPS buys a subscription** on the account's default payment method, and destroying it
cancels the subscription. A **plan change replaces the VPS**: a new purchase and a wiped server. A
**template change reinstalls the OS** in place, wiping the disk. The runbook repeats all three.

## Building blocks

The generated SDK exposes the Terraform resources in camelCase: check `sdks/hostinger` for the class
names.

| Concept | Resource |
|---|---|
| SSH key | `VpsSshKey` (rule-5 name); servers take its id |
| Bootstrap | `VpsPostInstallScript`, one per group; servers take its id |
| Firewall | none: **ufw inside the bootstrap**, see below |
| Server | `Vps`: `plan` = `size`, data center and template ids as numbers, `hostname` = the rule-5 name |
| Static IP | none: a VPS keeps its IPv4 for the subscription's life, so an ingress server's `staticIp` is its own address |

## Quirks

- **The firewall is ufw**, per group, in that group's post-install script even when the bootstrap is
  `none`: `ufw default deny incoming`, `ufw default allow outgoing`, `ufw allow <port>/tcp` for each
  of the group's `publicPorts`, `ufw --force enable`. With no private network, servers reach each
  other over public IPs, which ufw must allow by hand once they exist (`ufw allow from <peer ip>`);
  and ports Docker publishes bypass ufw. The runbook says both.
- A post-install script's content must start with a shebang; the bootstrap script does.
- `ignoreChanges` on the SSH key ids and the post-install script id (rule 3). No labels.
- **Generated SDK**: `sdks/` is gitignored (`<infra-dir>/.gitignore`), and `pulumi install`
  regenerates it from the `packages:` entry in `Pulumi.yaml`. Run it in `<infra-dir>` **before** the
  repo's own install on a fresh clone and in CI: the dependency on `sdks/hostinger` does not resolve
  until it exists. The runbook and the CI workflow both carry this step.

`ServerInfo`: `publicIp` from the VPS, `privateIp` = `null`, `staticIp` = the VPS's address on ingress
servers.

## For the runbook

- The three billing facts above.
- The two ufw caveats above.
