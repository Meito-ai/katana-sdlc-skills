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
| Firewall | a Cloud Firewall per rule set (inbound dropped by default, outbound accepted), attached to each instance by its own device attachment |
| Server | a Linode instance: a public interface first, plus a VPC interface when the network exists |
| Static IP | a reserved IP and its assignment (**verify** the account has access, below) |

## Quirks

- **Ids are numeric**: inputs typed `number` take `Number(...)` inside an `apply`.
- **Explicit labels** on firewalls, VPCs and subnets (rule 5), unique per account and within the
  label length and character rules in Linode's API documentation.
- **User data goes through the Metadata service**, base64-encoded:
  `Buffer.from(script).toString('base64')`.
- **Pin the instance's interface model.** Linode has two, and an unpinned instance takes the
  account's default, so the same program behaves differently per account. The model that declares
  interfaces inline on the instance needs nothing else; the newer standalone-interface model also
  needs explicit disk and config resources before the instance boots. Take the inline one unless
  the package docs now mark it deprecated.
- **Attach firewalls with the device attachment**, not the instance's own firewall field: changing
  that field recreates the instance, so replacing a firewall would rebuild every server.
- Private traffic: TCP, UDP and ICMP from `PRIVATE_CIDR`, as firewall inbound rules.
- **Verify** that the account can reserve IPs: the package docs have said reservation is not open to
  every account (support enables it). Tell the user, and put it in the runbook's prerequisites.
- **Network Helper configures an assigned reserved IP inside the OS only at boot**: the runbook
  reboots each ingress server once after its first `up`. **Verify** in Akamai's IP address docs that
  this still holds.

`ServerInfo`: `publicIp` from the instance, `privateIp` from its VPC interface, `staticIp` from the
reserved IP. Mocks: ids are numeric strings, and the instance's interfaces carry a VPC address.

## For the runbook

- Reboot each ingress server once after its first `up`, so the reserved IP is configured.
- Reserved IPs may need enabling by Linode support before the first `up`.
- A `size` change resizes in place, with a reboot; `image` and `region` replace the instance.
