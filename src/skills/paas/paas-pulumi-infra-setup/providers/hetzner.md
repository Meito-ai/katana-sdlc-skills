# Hetzner Cloud

| | |
|---|---|
| Package | `@pulumi/hcloud` |
| Credentials | `HCLOUD_TOKEN`: a read & write API token of the Hetzner Cloud project |
| `region` | a location name |
| `size` | a server type name |
| `image` | a system image name (`ubuntu-<version>`) |
| Private network | when more than one server |
| SSH user | `root` |

## Live catalog

- **Authenticated**: `GET https://api.hetzner.cloud/v1/locations`, `/server_types` and
  `/images?type=system`, with `Authorization: Bearer $HCLOUD_TOKEN` (or the `hcloud` CLI's `list`
  commands with `-o json`). Server types report their deprecation and the locations that sell them.
- **Public**: https://docs.hetzner.com/cloud/servers/overview/ (types) and
  https://www.hetzner.com/cloud (prices).

## Building blocks

| Concept | Resource |
|---|---|
| SSH key | `SshKey`, one per environment |
| Private network | `Network` (`PRIVATE_CIDR`) + `NetworkSubnet` (type `cloud`, `SUBNET_CIDR`) |
| Firewall | `Firewall`, one per rule set |
| Server | `Server` |
| Private attachment | `ServerNetwork`, `dependsOn` the subnet |
| Static IP | `PrimaryIp`, bound through the server's `publicNets` |

## Quirks

- **Ids are numeric**, but Pulumi `id` outputs are strings. Convert with a guard rather than a bare
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

- The subnet's **network zone** follows the location: take it from the location's `network_zone` in
  the catalog.
- **Firewalls filter public interfaces only**: private-network traffic already passes, so skip the
  `PRIVATE_CIDR` rule. With no outbound rules, all egress is allowed.
- **Attach the private network with `ServerNetwork`**, not the server's inline `networks` input,
  which detaches and reattaches on every update.
- **The primary IP**: `autoDelete: false`, and `assigneeType` unset (the server's `publicNets`
  attaches it). Ingress servers take `deleteBeforeReplace: true` (rule 4).
- `ignoreChanges: ['userData', 'sshKeys']` (rule 3). Labels are a `{ [key]: value }` record.

`ServerInfo`: `publicIp` from the server, `staticIp` from the primary IP, `privateIp` from the
`ServerNetwork`. Mocks: ids are numeric strings (a counter).

## For the runbook

- **A `size` change is a resize, not a rebuild**: the provider powers the server off, changes the
  type, and leaves it **powered off**. Start it again in the console or with `hcloud server poweron`.
- **`image` or `region` replaces the server**: with a primary IP attached that is delete-first, so
  expect downtime and a wiped host.
- The primary IP survives every replacement (`autoDelete: false`), so DNS keeps pointing at it.
