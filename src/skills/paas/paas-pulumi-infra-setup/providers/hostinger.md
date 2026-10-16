# Hostinger

Hostinger has no native Pulumi package. Pulumi bridges its official Terraform provider into a local
SDK, which needs the **Pulumi CLI** at setup time.

| | |
|---|---|
| Terraform provider | `hostinger/hostinger`, bridged with `pulumi package add terraform-provider hostinger/hostinger` in `<infra-dir>`: it writes `sdks/hostinger`, adds a `packages:` entry to `Pulumi.yaml`, and prints the dependency line and import name to use |
| Credentials | an API token from the Hostinger account; the variable name is in the provider's docs on the Terraform Registry |
| `region` | a numeric **data center id**, stored as a string |
| `size` | a plan **price id**, which carries the currency and billing period |
| `image` | a numeric OS **template id**, stored as a string |
| Private network | none (**verify**) |
| SSH user | `root` |

## Live catalog

- **Authenticated** only: the VPS data centers, the VPS OS templates and the billing catalog of the
  Hostinger API (reference on developers.hostinger.com), with the token as a bearer token. When the
  token is not in this session's environment, ask the user to run the calls and paste the output
  (it holds no secret).
- **Public**: the VPS plans and prices on hostinger.com, without the ids.

## Billing: say this before the plan is confirmed

**Creating a VPS buys a subscription** on the account's default payment method, and destroying it
cancels the subscription. A **plan change replaces the VPS**: a new purchase and a wiped server. A
**template change reinstalls the OS** in place, wiping the disk. The runbook repeats all three.

## Building blocks

The generated SDK exposes the provider's resources in camelCase: check `sdks/hostinger` for the
names.

| Concept | Hostinger product |
|---|---|
| SSH key | a VPS SSH key (rule-5 name) |
| Bootstrap | a VPS post-install script, one per group |
| Firewall | none (**verify**): **ufw inside the bootstrap**, see below |
| Server | a VPS: plan = `size`, data center and template ids as numbers, hostname = the rule-5 name |
| Static IP | none: a VPS keeps its IPv4 for the subscription's life, so an ingress server's `staticIp` is its own address |

## Quirks

- **Verify** in the provider's docs that it still has no firewall or private-network resource. If
  one exists now, use it in place of ufw or in place of public-IP traffic between servers, and tell
  the user.
- **The firewall is ufw**, per group, in that group's post-install script even when the bootstrap is
  `none`: `ufw default deny incoming`, `ufw default allow outgoing`, `ufw allow <port>/tcp` for each
  of the group's `publicPorts`, `ufw --force enable`. With no private network, servers reach each
  other over public IPs, which ufw must allow by hand once they exist (`ufw allow from <peer ip>`);
  and ports Docker publishes bypass ufw. The runbook says both.
- A post-install script must start with a shebang; the bootstrap script does.
- **Generated SDK**: `sdks/` is gitignored (`<infra-dir>/.gitignore`), and `pulumi install`
  regenerates it from the `packages:` entry in `Pulumi.yaml`. Run it in `<infra-dir>` **before** the
  repo's own install on a fresh clone and in CI: the dependency on `sdks/hostinger` does not resolve
  until it exists. The runbook and the CI workflow both carry this step.
- No labels. `privateNetworkId` is always null.

`ServerInfo`: `publicIp` from the VPS, `privateIp` = `null`, `staticIp` = the VPS's address on ingress
servers.

## For the runbook

- The three billing facts above.
- The two ufw caveats above.
