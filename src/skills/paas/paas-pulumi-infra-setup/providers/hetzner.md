# Hetzner Cloud

| | |
|---|---|
| Registry package | `hcloud` |
| Credentials | an API token of the Hetzner Cloud project, with read & write access |
| Extra config | `<project>:networkZone`: the location's network zone (from the catalog), non-secret, in every stack file |
| `region` | a location name |
| `size` | a server type name |
| `image` | a system image name |
| Private network | when more than one server |
| SSH user | `root` |

## Live catalog

- **Authenticated**: the Cloud API's locations, server types and system images
  (`https://api.hetzner.cloud/v1/locations`, `/server_types`, `/images?type=system`), with the token
  as a bearer token. Server types report their deprecation and the locations that sell them.
- **Public**: thin. Hetzner's docs carry the locations with their network zones and a per-location
  price list; hetzner.com renders its prices with JavaScript. Server type specs may need a
  third-party catalog, and no public source lists the system images, so confirm the image with the
  user.

## Building blocks

| Concept | Hetzner product |
|---|---|
| SSH key | an SSH key, one per environment |
| Private network | a Network with one cloud subnet |
| Firewall | a Firewall per rule set |
| Server | a Server |
| Private attachment | the server's network attachment, as a resource of its own |
| Static IP | a Primary IP, bound through the server's public network settings |

## Quirks

- **Ids are mostly numeric**, but Pulumi `id` outputs are strings. Check each id input's type in the
  type definitions (the network attachment takes its subnet id as a string), and convert the numeric
  ones with a guard rather than a bare `Number()`, so a non-numeric id fails loudly:

  ```ts
  function toId(id: pulumi.Input<string>, field: string): pulumi.Output<number> {
    return pulumi.output(id).apply((value) => {
      const numeric = Number.parseInt(value, 10);
      if (!Number.isFinite(numeric)) throw new Error(`Expected a numeric Hetzner id for ${field}, got "${value}".`);
      return numeric;
    });
  }
  ```

- The subnet's **network zone** follows the location: the `networkZone` config key, from the
  catalog's location entry.
- **Firewalls filter public interfaces only**: private-network traffic already passes, so skip the
  `PRIVATE_CIDR` rule. With no outbound rules, all egress is allowed.
- **Attach the private network with its own resource**, not the server's inline network list, which
  detaches and reattaches the server when its IP changes.
- **The primary IP outlives its server**: turn its auto-delete off, and leave its assignee unset (the
  server's public network settings attach it). Ingress servers take `deleteBeforeReplace: true`
  (rule 4).
- Labels are a key-value record.

`ServerInfo`: `publicIp` from the server, `staticIp` from the primary IP, `privateIp` from the
network attachment. Mocks: ids are numeric strings (a counter).

## For the runbook

- **A `size` change is a resize, not a rebuild**: Hetzner powers the server off, changes the type,
  and leaves it **powered off**. Start it again from the console or the CLI.
- **`image` or `region` replaces the server**: with a primary IP attached that is delete-first, so
  expect downtime and a wiped host.
- The primary IP survives every replacement, so DNS keeps pointing at it.
