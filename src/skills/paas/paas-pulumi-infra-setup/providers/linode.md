# Linode / Akamai Cloud

| | |
|---|---|
| Package | `@pulumi/linode` |
| Credentials | `LINODE_TOKEN`: a personal access token with read/write on Linodes, Firewalls, VPCs and IPs |
| `region` | a region id whose capabilities include `Metadata` (cloud-init needs it) and `VPCs` |
| `size` | a Linode type id |
| `image` | a public image id (`linode/ubuntu<version>`) |
| Private network | when more than one server |
| SSH user | `root` |

## Live catalog

- **Public, no token needed**: `GET https://api.linode.com/v4/regions` (each with its
  `capabilities`), `/v4/linode/types` (vCPUs, memory, disk, price, per-region prices; a non-null
  `successor` means superseded) and `/v4/images` (with a `deprecated` flag).

## Building blocks

| Concept | Resource |
|---|---|
| SSH key | none: instances take `authorizedKeys: [sshPublicKey]` |
| Private network | `Vpc` + `VpcSubnet` (`SUBNET_CIDR`) |
| Firewall | `Firewall`, one per rule set: inbound policy `DROP`, outbound `ACCEPT` |
| Server | `Instance`: a public interface first, plus a VPC interface when the network exists |
| Static IP | `ReservedIp` + `ReservedIpAssignment` |

## Quirks

- **Ids are numeric**: inputs typed `number` take `Number(...)` inside an `apply`.
- **Explicit labels** on firewalls, VPCs and subnets (rule 5): unique per account, letters, digits,
  `-`, `_`, `.`; firewall labels at most 32 characters.
- **User data goes through the metadata service** and must be **base64**:
  `Buffer.from(script).toString('base64')`.
- Private traffic: TCP, UDP and ICMP from `PRIVATE_CIDR`, as firewall inbound rules.
- `ignoreChanges` on the metadata (user data) and `authorizedKeys` (rule 3). Labels are `tags`,
  plain strings.
- **Verify** in Akamai's reserved-IP docs that Network Helper configures the added address at boot
  before telling the user to point DNS at it; if it does not, the runbook adds the address to the
  interface by hand.

`ServerInfo`: `publicIp` from the instance, `privateIp` from its VPC interface (check the output
shape in the type definitions), `staticIp` from the reserved IP. Mocks: ids are numeric strings, and
the instance's interfaces carry a VPC address.

## For the runbook

- A `size` change resizes in place, with a reboot; `image` and `region` replace the instance.
