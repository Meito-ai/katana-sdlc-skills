# Hetzner Cloud

| | |
|---|---|
| Package | `@pulumi/hcloud` (`import * as hcloud from '@pulumi/hcloud'`) |
| Credentials | `HCLOUD_TOKEN`: Hetzner Console -> project -> Security -> API tokens, read & write |
| `region` | a location: `fsn1`, `nbg1`, `hel1` (EU), `ash` (US east), `hil` (US west), `sin` (Singapore) |
| `image` | `ubuntu-24.04` |
| Private network | when more than one server |
| SSH user | `root` |

## Sizes (checked 2026-10-13)

| Tier | Type | Spec |
|---|---|---|
| S | `cpx22` | 2 shared AMD vCPU / 4 GB / 80 GB NVMe |
| M | `cpx32` | 4 shared AMD vCPU / 8 GB / 160 GB |
| L | `cpx42` | 8 shared AMD vCPU / 16 GB / 320 GB |

Not every type is sold in every location: confirm with `hcloud server-type list` or the console.

## Resources

Hetzner ids are numeric, but Pulumi `id` outputs are strings. Convert with a guard rather than a bare
`Number()`, so a non-numeric id fails loudly:

```ts
function toId(id: pulumi.Input<string>, field: string): pulumi.Output<number> {
  return pulumi.output(id).apply((value) => {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric)) throw new Error(`Expected a numeric Hetzner id for ${field}, got "${value}".`);
    return numeric;
  });
}
```

- **SSH key**: one `hcloud.SshKey` `{ publicKey }` per environment; servers take `sshKeys: [key.id]`.
- **Network**: `hcloud.Network` `{ ipRange: PRIVATE_CIDR, labels }` plus `hcloud.NetworkSubnet`
  `{ networkId: toId(network.id), type: 'cloud', networkZone, ipRange: SUBNET_CIDR }`. The zone
  follows the location: `eu-central` (fsn1, nbg1, hel1), `us-east` (ash), `us-west` (hil),
  `ap-southeast` (sin).
- **Firewall**: one `hcloud.Firewall` per rule set, `rules` of
  `{ direction: 'in', protocol: 'tcp', port, sourceIps: ['0.0.0.0/0', '::/0'], description }`.
  Hetzner firewalls filter **public interfaces only**: private-network traffic already passes, so
  skip the `PRIVATE_CIDR` rule. With no `out` rules, all egress is allowed. Servers take
  `firewallIds: [toId(firewall.id)]`.
- **Server**: `hcloud.Server` `{ serverType: size, location: region, image, sshKeys, firewallIds,
  userData, labels, publicNets }`. `publicNets` is `[{ ipv4Enabled: true, ipv4: toId(primaryIp.id),
  ipv6Enabled: true }]` on ingress servers, `[{ ipv4Enabled: true, ipv6Enabled: true }]` otherwise.
  Options: `ignoreChanges: ['userData', 'sshKeys']`; ingress servers also `deleteBeforeReplace: true`
  (the primary IP is bound through `publicNets`, rule 4).
- **Private attachment**: `hcloud.ServerNetwork` `{ serverId: toId(server.id), subnetId: subnet.id }`
  with `dependsOn: [subnet]`. Prefer it over the server's inline `networks` input, which detaches and
  reattaches on every update unless `aliasIps: []` is set.
- **Static IP**: `hcloud.PrimaryIp` `{ type: 'ipv4', location: region, autoDelete: false, labels }`.
  Leave `assigneeType` unset: the server's `publicNets` attaches it.
- **Labels**: a `{ [key]: value }` record.

`ServerInfo`: `publicIp` = `server.ipv4Address`, `staticIp` = `primaryIp.ipAddress`,
`privateIp` = `serverNetwork.ip`.

## Mocks

Ids must be numeric strings (a counter). Add to the mock state: `ipv4Address: '203.0.113.10'`,
`ipv6Address: '2001:db8::1'`, `ipAddress: '203.0.113.20'`, `ip: '10.0.1.2'`.

## Behaviour to put in the runbook

- **`serverType` is a resize, not a rebuild**: the provider powers the server off, changes the type,
  and leaves it **powered off**. Start it again in the console or with `hcloud server poweron`.
- **`image` or `location` replaces the server**: with a primary IP attached that is delete-first, so
  expect downtime and a wiped host.
- The primary IP survives every replacement (`autoDelete: false`), so DNS keeps pointing at it.
