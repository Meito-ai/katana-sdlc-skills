# DigitalOcean

| | |
|---|---|
| Package | `@pulumi/digitalocean` |
| Credentials | `DIGITALOCEAN_TOKEN`: a read & write personal access token |
| `region` | a region slug |
| `size` | a droplet size slug |
| `image` | a distribution image slug |
| Private network | always: a droplet joins a VPC regardless, so each stack gets its own instead of the region's default |
| SSH user | `root` |

## Live catalog

- **Authenticated**: `GET https://api.digitalocean.com/v2/regions`, `/v2/sizes` and
  `/v2/images?type=distribution`, with `Authorization: Bearer $DIGITALOCEAN_TOKEN` (or `doctl compute
  region list`, `size list`, `image list-distribution` with `-o json`). Each size lists the regions
  that sell it and whether it is available.
- **Public**: https://slugs.do-api.dev/ (slugs) and https://www.digitalocean.com/pricing/droplets
  (prices).

## Building blocks

| Concept | Resource |
|---|---|
| SSH key | `SshKey`; droplets take its `fingerprint` |
| Private network | `Vpc` |
| Firewall | a `Tag` and a `Firewall` per rule set |
| Server | `Droplet` |
| Static IP | `ReservedIp` + `ReservedIpAssignment`: the assignment is its own resource, so no `deleteBeforeReplace` |

## Quirks

- **Ids are numeric**: inputs typed `number` take `Number(droplet.id)` inside an `apply`.
- **Leave the VPC's `ipRange` unset**: DigitalOcean assigns a free range, and a fixed one collides
  with the account's other VPCs in the region (staging and prod). Use `vpc.ipRange`, not
  `PRIVATE_CIDR`, wherever a rule names the private range.
- **Firewalls select droplets by tag**: one tag per rule set (`<project>-<stack>-ingress` /
  `-internal`) that the firewall targets and the droplets carry, so the firewall never waits on them.
- **Firewalls deny anything not allowed, outbound included**: allow outbound TCP and UDP
  `1-65535` and ICMP to `0.0.0.0/0` and `::/0`, or the bootstrap cannot download Docker. Private
  traffic: TCP, UDP and ICMP from `vpc.ipRange`.
- **`resizeDisk: false`** on droplets keeps a resize reversible: a grown disk can never shrink back.
- `ignoreChanges: ['userData', 'sshKeys']` (rule 3). Labels are tags, plain strings (letters,
  digits, `:`, `-`, `_`): `<project>`, `<project>-<stack>`, `<project>-<stack>-<group>`.

`ServerInfo`: `publicIp` and `privateIp` from the droplet, `staticIp` from the reserved IP. Mocks: ids
are numeric strings, and the VPC needs an `ipRange` (`10.110.0.0/20`).

## For the runbook

- Inbound traffic to a reserved IP reaches the droplet; **outbound** traffic still leaves from the
  droplet's own public IP.
- A `size` change powers the droplet off, resizes it and boots it again (CPU and RAM only, because of
  `resizeDisk: false`).
