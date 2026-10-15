# Linode / Akamai Cloud

| | |
|---|---|
| Registry package | `linode` |
| Credentials | a personal access token with read & write on Linodes, Firewalls, VPCs and IPs |
| `region` | a region id that offers the Metadata service (cloud-init needs it) and VPCs |
| `size` | a Linode type id |
| `image` | a public image id |
| Private network | when more than one server |
| SSH user | `root` |

## Live catalog

- **Public, no token needed**: the API's regions (`https://api.linode.com/v4/regions`, each with its
  capabilities), types (`/v4/linode/types`: specs, prices and per-region prices; a superseded type
  names its successor) and images (`/v4/images`, with a deprecation flag).

## Building blocks

| Concept | Akamai product |
|---|---|
| SSH key | none: the instance takes the authorized keys directly |
| Private network | a VPC with one subnet |
| Firewall | a Cloud Firewall per rule set: inbound dropped by default, outbound accepted |
| Server | a Linode instance: a public interface first, plus a VPC interface when the network exists |
| Static IP | a reserved IP and its assignment |

## Quirks

- **Ids are numeric**: inputs typed `number` take `Number(...)` inside an `apply`.
- **Explicit labels** on firewalls, VPCs and subnets (rule 5), unique per account and within the
  label length and character rules in Linode's API documentation.
- **User data goes through the Metadata service**, base64-encoded:
  `Buffer.from(script).toString('base64')`.
- Linode has more than one way to declare an instance's interfaces: use the one the package docs
  currently recommend.
- Private traffic: TCP, UDP and ICMP from `PRIVATE_CIDR`, as firewall inbound rules.
- **Verify** in Akamai's reserved-IP docs that Network Helper configures the added address at boot
  before telling the user to point DNS at it; if it does not, the runbook adds the address to the
  interface by hand.

`ServerInfo`: `publicIp` from the instance, `privateIp` from its VPC interface, `staticIp` from the
reserved IP. Mocks: ids are numeric strings, and the instance's interfaces carry a VPC address.

## For the runbook

- A `size` change resizes in place, with a reboot; `image` and `region` replace the instance.
