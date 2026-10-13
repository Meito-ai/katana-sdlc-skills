# DigitalOcean

| | |
|---|---|
| Package | `@pulumi/digitalocean` (`import * as digitalocean from '@pulumi/digitalocean'`) |
| Credentials | `DIGITALOCEAN_TOKEN`: Control Panel -> API -> Tokens, read & write |
| `region` | `fra1`, `ams3`, `lon1`, `nyc3`, `sfo3`, `tor1`, `sgp1`, `blr1`, `syd1` |
| `image` | `ubuntu-24-04-x64` |
| Private network | always: a droplet joins a VPC regardless, so each stack gets its own instead of the region's default |
| SSH user | `root` |

## Sizes (checked 2026-10-13)

| Tier | Slug | Spec |
|---|---|---|
| S | `s-2vcpu-4gb` | 2 shared vCPU / 4 GB / 80 GB |
| M | `s-4vcpu-8gb` | 4 shared vCPU / 8 GB / 160 GB |
| L | `s-6vcpu-16gb` | 6 shared vCPU / 16 GB / 320 GB (nearest; no 8 vCPU / 16 GB basic plan) |

## Resources

Droplet ids are numeric; inputs typed `number` take `Number(droplet.id)` inside an `apply`.

- **SSH key**: `digitalocean.SshKey` `{ publicKey }`; droplets take `sshKeys: [key.fingerprint]`.
- **Network**: `digitalocean.Vpc` `{ region }` with **no `ipRange`**: DigitalOcean assigns a free
  range, and a fixed one collides with the account's other VPCs in the region (staging and prod).
  Use `vpc.ipRange`, not `PRIVATE_CIDR`, wherever a rule names the private range.
- **Firewall**: one `digitalocean.Tag` per rule set (named `<project>-<stack>-ingress` /
  `-internal`), and one `digitalocean.Firewall` per tag `{ tags: [tag.id], inboundRules,
  outboundRules }`. Droplets join by carrying the tag, so the firewall never waits on them.
  Inbound: `{ protocol: 'tcp', portRange: port, sourceAddresses: ['0.0.0.0/0', '::/0'] }` per port,
  plus `tcp` and `udp` `portRange: '1-65535'` and `icmp` from `[vpc.ipRange]`.
  **DigitalOcean firewalls deny anything not allowed, outbound included**: add outbound `tcp` and
  `udp` `1-65535` and `icmp` to `['0.0.0.0/0', '::/0']`, or the bootstrap cannot download Docker.
- **Server**: `digitalocean.Droplet` `{ image, region, size, sshKeys, userData, vpcUuid: vpc.id,
  tags: [ruleTag.id, ...labels], resizeDisk: false }`. Options: `ignoreChanges: ['userData',
  'sshKeys']`. `resizeDisk: false` keeps a resize reversible: a grown disk can never shrink back.
- **Static IP**: `digitalocean.ReservedIp` `{ region }` plus `digitalocean.ReservedIpAssignment`
  `{ ipAddress: reservedIp.ipAddress, dropletId: Number(droplet.id) }`. The assignment is its own
  resource, so no `deleteBeforeReplace`.
- **Labels**: tags are plain strings (letters, digits, `:`, `-`, `_`): `<project>`, `<project>-<stack>`,
  `<project>-<stack>-<group>`.

`ServerInfo`: `publicIp` = `droplet.ipv4Address`, `privateIp` = `droplet.ipv4AddressPrivate`,
`staticIp` = `reservedIp.ipAddress`.

## Mocks

Ids must be numeric strings. Mock state: `ipv4Address: '203.0.113.10'`,
`ipv4AddressPrivate: '10.0.1.2'`, `ipAddress: '203.0.113.20'`, `fingerprint: 'aa:bb'`,
`ipRange: '10.110.0.0/20'`. `privateNetworkId` is always set.

## Behaviour to put in the runbook

- Inbound traffic to a reserved IP reaches the droplet; outbound traffic still leaves from the
  droplet's own public IP.
- A `size` change powers the droplet off, resizes it and boots it again (CPU and RAM only, because of
  `resizeDisk: false`).
