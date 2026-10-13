# UpCloud

| | |
|---|---|
| Package | `@upcloud/pulumi-upcloud` (`import * as upcloud from '@upcloud/pulumi-upcloud'`) |
| Credentials | `UPCLOUD_USERNAME` + `UPCLOUD_PASSWORD` of an API-enabled subaccount (`UPCLOUD_TOKEN` also works but is marked experimental by the provider) |
| `region` | a zone: `de-fra1`, `fi-hel1`, `nl-ams1`, `uk-lon1`, `es-mad1`, `us-nyc1`, `us-chi1`, `sg-sin1` |
| `image` | the template title `Ubuntu Server 24.04 LTS (Noble Numbat)` |
| Private network | when more than one server |
| SSH user | `root` |

## Sizes (checked 2026-10-13)

| Tier | Plan | Spec |
|---|---|---|
| S | `2xCPU-4GB` | 2 vCPU / 4 GB / 80 GB |
| M | `4xCPU-8GB` | 4 vCPU / 8 GB / 160 GB |
| L | `6xCPU-16GB` | 6 vCPU / 16 GB / 320 GB (nearest General Purpose plan) |

## Resources

- **SSH key**: no resource. Servers take `login: { user: 'root', keys: [sshPublicKey],
  createPassword: false }`.
- **Network**: `upcloud.Network` `{ zone: region, ipNetwork: { address: SUBNET_CIDR, family: 'IPv4',
  dhcp: true, dhcpDefaultRoute: false } }`.
- **Server**: `upcloud.Server` `{ hostname, zone: region, plan: size, metadata: true, userData,
  template: { storage: image, size: <plan's disk size> }, login, firewall: true, labels,
  networkInterfaces }`.
  - `hostname` is required: the rule-5 name.
  - `metadata: true` is required for cloud-init templates; without it `userData` never runs.
  - `networkInterfaces`: `[{ type: 'public' }]`, plus `{ type: 'private', network: network.id }` when
    the private network exists.
  - Options: `ignoreChanges: ['userData', 'login']`.
- **Firewall**: per server, `upcloud.ServerFirewallRules` `{ serverId: server.id, firewallRules }`.
  **The UpCloud firewall is stateless**: it tracks no connections, so return traffic for the
  server's own outbound connections needs inbound rules too. Rules are evaluated in order:
  1. `accept` inbound TCP to each of the group's ports (`destinationPortStart` = `destinationPortEnd`
     = port, `family: 'IPv4'`, and again for `IPv6`);
  2. `accept` inbound TCP and UDP to the ephemeral range `32768`-`60999` (replies to outbound
     traffic, DNS and NTP included), and inbound ICMP;
  3. a final `{ direction: 'in', action: 'drop' }`, and a `{ direction: 'out', action: 'accept' }`.

  It filters the public interface; private-network traffic is not affected.
- **Static IP**: `upcloud.FloatingIpAddress` `{ zone: region, macAddress: <the server's public
  interface macAddress> }`. **The OS does not answer on a floating IP until it is configured
  inside the server**: the runbook adds it to the public interface (netplan) once the address is
  known. Until then the server's own public IP serves, and it is stable for the server's lifetime.
- **Labels**: a `{ [key]: value }` record.

`ServerInfo`: from `server.networkInterfaces`: the `public` interface's `ipAddress` is `publicIp`,
the `private` interface's is `privateIp`; `staticIp` = `floatingIp.ipAddress`.

## Mocks

Mock state: `networkInterfaces: [{ type: 'public', ipAddress: '203.0.113.10', macAddress:
'aa:bb:cc:dd:ee:ff' }, { type: 'private', ipAddress: '10.0.1.2' }]`, `ipAddress: '203.0.113.20'`.

## Behaviour to put in the runbook

- A `plan` change resizes the server, which stops it first.
- The floating IP needs the in-server configuration step above before DNS points at it.
