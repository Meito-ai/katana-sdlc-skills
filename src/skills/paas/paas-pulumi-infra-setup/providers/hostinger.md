# Hostinger

Hostinger has no native Pulumi package. Pulumi bridges its official Terraform provider
(`hostinger/hostinger`) into a local SDK, which needs the **Pulumi CLI** at setup time.

| | |
|---|---|
| Package | generated: run `pulumi package add terraform-provider hostinger/hostinger` in `<infra-dir>`. It writes `sdks/hostinger`, adds a `packages:` entry to `Pulumi.yaml`, and prints the dependency line and import name to use |
| Credentials | `HOSTINGER_API_TOKEN`: hPanel -> Account -> API |
| `region` | a numeric **data center id**, stored as a string |
| `image` | a numeric OS **template id** (Ubuntu 24.04), stored as a string |
| Private network | none: the API has no private networking, so `privateNetworkId` is always null |
| SSH user | `root` |

Look the ids up with the token during the interview:

```bash
curl -s -H "Authorization: Bearer $HOSTINGER_API_TOKEN" https://developers.hostinger.com/api/vps/v1/data-centers
curl -s -H "Authorization: Bearer $HOSTINGER_API_TOKEN" https://developers.hostinger.com/api/vps/v1/templates
curl -s -H "Authorization: Bearer $HOSTINGER_API_TOKEN" https://developers.hostinger.com/api/billing/v1/catalog
```

## Sizes (checked 2026-10-13)

`size` holds a plan **price id**, which carries the currency and billing period
(`hostingercom-vps-kvm2-usd-1m`: KVM 2, USD, monthly). Take the exact ids from the catalog call.

| Tier | Plan | Spec |
|---|---|---|
| S | KVM 2 | 2 vCPU / 8 GB / 100 GB (nearest; KVM 1 is 1 vCPU / 4 GB) |
| M | KVM 4 | 4 vCPU / 16 GB / 200 GB |
| L | KVM 8 | 8 vCPU / 32 GB / 400 GB |

## Billing: say this before the plan is confirmed

**Creating a VPS buys a subscription** on the account's default payment method, and destroying it
cancels the subscription. A **plan change replaces the VPS**: a new purchase and a wiped server. A
**template change reinstalls the OS** in place, wiping the disk. The runbook repeats all three.

## Resources

Names below are the Terraform resource names; the generated SDK exposes them in camelCase (check
`sdks/hostinger` for the exact class names).

- **SSH key**: `VpsSshKey` `{ name: <rule-5 name>, key: sshPublicKey }`; servers take
  `sshKeyIds: [key.id]`.
- **Bootstrap**: `VpsPostInstallScript` `{ name: <rule-5 name>-<group>, content }`, one per group;
  servers take `postInstallScriptId`. `content` must start with a shebang; the bootstrap script does.
- **Firewall**: the provider has no firewall resource, so the firewall is **ufw inside the
  bootstrap**, per group: `ufw default deny incoming`, `ufw default allow outgoing`, `ufw allow <port>/tcp`
  for each of the group's `publicPorts`, `ufw --force enable`. Add these lines to the group's
  post-install script even when the bootstrap is `none`. Two caveats for the runbook: with no private
  network, servers reach each other over public IPs, which ufw must allow by hand once the IPs exist
  (`ufw allow from <peer ip>`); and ports Docker publishes bypass ufw.
- **Server**: `Vps` `{ plan: size, dataCenterId: Number(region), templateId: Number(image), hostname:
  <rule-5 name>, sshKeyIds, postInstallScriptId }`. Options: `ignoreChanges: ['sshKeyIds',
  'postInstallScriptId']`.
- **Static IP**: none as a resource. A VPS keeps its IPv4 for the subscription's life, so an ingress
  server's `staticIp` is its own `ipv4Address`.
- **Labels**: none.

`ServerInfo`: `publicIp` = `vps.ipv4Address`, `privateIp` = `null`, `staticIp` = `vps.ipv4Address`
on ingress servers.

## Generated SDK

`sdks/` is gitignored (`<infra-dir>/.gitignore`), and `pulumi install` regenerates it from the
`packages:` entry in `Pulumi.yaml`. Run `pulumi install` in `<infra-dir>` **before** the repo's own
install on a fresh clone and in CI: the dependency on `sdks/hostinger` does not resolve until it
exists. The runbook and the CI workflow both carry this step.

## Mocks

Mock state: `ipv4Address: '203.0.113.10'`. `privateNetworkId` is always null.
