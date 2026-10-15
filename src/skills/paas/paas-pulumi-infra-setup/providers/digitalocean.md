# DigitalOcean

| | |
|---|---|
| Registry package | `digitalocean` |
| Credentials | a personal access token with read & write scope |
| `region` | a region slug |
| `size` | a droplet size slug |
| `image` | a distribution image slug |
| Private network | always: a droplet joins a VPC regardless, so each stack gets its own instead of the region's default |
| SSH user | `root` |

## Live catalog

- **Authenticated**: the API's regions, sizes and distribution images
  (`https://api.digitalocean.com/v2/regions`, `/v2/sizes`, `/v2/images?type=distribution`), with the
  token as a bearer token. Each size lists the regions that sell it and whether it is available.
- **Public**: the slug list in DigitalOcean's API documentation, and the Droplet pricing on
  digitalocean.com.

## Building blocks

| Concept | DigitalOcean product |
|---|---|
| SSH key | an SSH key; droplets reference it by fingerprint |
| Private network | a VPC |
| Firewall | a tag and a Cloud Firewall per rule set |
| Server | a Droplet |
| Static IP | a Reserved IP and its assignment, a resource of its own, so no `deleteBeforeReplace` |

## Quirks

- **Ids are numeric**: inputs typed `number` take `Number(droplet.id)` inside an `apply`.
- **Leave the VPC's IP range unset**: DigitalOcean assigns a free one, and a fixed range collides
  with the account's other VPCs in the region (staging and prod). Wherever a rule names the private
  range, use the range the VPC reports, not `PRIVATE_CIDR`.
- **Firewalls select droplets by tag**: one tag per rule set (`<project>-<stack>-ingress` /
  `-internal`) that the firewall targets and the droplets carry, so the firewall never waits on them.
- **Firewalls deny anything not allowed, outbound included**: allow outbound TCP and UDP on all
  ports and ICMP to every IPv4 and IPv6 address, or the bootstrap cannot download Docker. Private
  traffic: TCP, UDP and ICMP from the VPC's range.
- **Resize CPU and RAM only**, never the disk: a grown disk can never shrink back.
- Labels are tags, plain strings within DigitalOcean's tag rules: `<project>`, `<project>-<stack>`,
  `<project>-<stack>-<group>`.

`ServerInfo`: `publicIp` and `privateIp` from the droplet, `staticIp` from the reserved IP. Mocks: ids
are numeric strings, and the VPC reports a range (`10.110.0.0/20`).

## For the runbook

- Inbound traffic to a reserved IP reaches the droplet; **outbound** traffic still leaves from the
  droplet's own public IP.
- A `size` change powers the droplet off, resizes its CPU and RAM, and boots it again.
