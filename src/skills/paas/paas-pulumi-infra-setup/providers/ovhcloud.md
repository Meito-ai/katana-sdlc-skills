# OVHcloud Public Cloud

| | |
|---|---|
| Package | `@ovhcloud/pulumi-ovh` |
| Credentials | `OVH_ENDPOINT` (`ovh-eu`, `ovh-ca` or `ovh-us`) plus either `OVH_APPLICATION_KEY`, `OVH_APPLICATION_SECRET`, `OVH_CONSUMER_KEY` (API keys), or `OVH_CLIENT_ID`, `OVH_CLIENT_SECRET` (an OAuth2 service account) |
| Extra config | `<project>:cloudProjectId`: the Public Cloud project id (the `serviceName`), non-secret, in every stack file |
| `region` | an OpenStack region enabled in the project |
| `size` | a flavor **name**, resolved to the region's flavor id by the program |
| `image` | an image **name** (`Ubuntu <version>`), resolved to the region's image id by the program |
| Private network | when more than one server, **or** whenever an ingress group has servers (floating IPs need it) |
| SSH user | `ubuntu` |

## Live catalog

- **Public**: `GET https://eu.api.ovh.com/v1/order/catalog/public/cloud?ovhSubsidiary=<FR, GB, DE,
  ...>`: each flavor is an entry of `addons`, with its name, cores, memory and disk under
  `blobs.technical`, and its price. Regions: https://www.ovhcloud.com/en/public-cloud/regions-availability/.
- **Per region**: the account's API needs signed requests, so the program's own lookups are the
  check. A name the region does not offer fails the first preview with the names it does offer.

## Building blocks

Use the `Cloud*` resources at the package root (the newer API), not the older `cloudproject.*` ones.
All take `serviceName: cfg.cloudProjectId` and `region`.

| Concept | Resource |
|---|---|
| Lookups | `getCloudInstanceFlavorsOutput` and `getCloudInstanceImagesOutput`, once per environment |
| SSH key | `CloudSSHKey`; instances take `sshKeyName: key.name` |
| Private network | `CloudNetworkPrivateVrack` + `CloudNetworkPrivateVrackSubnet` (`SUBNET_CIDR`, DHCP, gateway `10.0.1.1`) |
| Gateway | `CloudGateway` (model `S`, external gateway on) when an ingress group has servers: a floating IP is NAT'd through it |
| Firewall | `CloudSecurityGroup`, one per rule set |
| Server | `CloudInstance` |
| Static IP | `CloudFloatingIp` |

## Quirks

- **Lookups**: pick the entry whose `name` equals `size` / `image`, and make a miss throw a message
  naming what the region does offer. The miss surfaces inside an `apply` during registration, so
  unit-test the lookup as a plain function.
- **Security groups**: add the `PRIVATE_CIDR` ingress rule with no protocol (any), and explicit
  IPv4 and IPv6 egress rules, so the rule list never leaves egress closed. Instances take
  `securityGroupIds: [group.id]`: omitting it applies the project's `default` group, and `[]` blocks
  all inbound traffic.
- **Ingress servers** have no public interface of their own: their only network is the private
  subnet, with the floating IP attached there. Inbound arrives on the floating IP, outbound leaves
  through the gateway. They take `deleteBeforeReplace: true` (rule 4) and `dependsOn` the gateway.
- **Other servers** auto-assign a public IP, plus the private subnet when the network exists.
- `ignoreChanges: ['userData', 'imageId']`. A `userData` change **reinstalls** the instance (root disk
  wiped), and image ids rotate when OVH republishes an image, so a fresh lookup would rebuild every
  server. `sshKeyName` is immutable and recreates the instance.
- No labels on these resources; put the group in the `description` where one exists.

`ServerInfo`: from the instance's reported network state, keep the fixed IPv4 addresses. The one
inside `SUBNET_CIDR` is `privateIp`, the other `publicIp`; the floating IP is `staticIp`, and also an
ingress server's `publicIp`. Mocks: fixtures for the two lookups, one entry per size and image in the
stack files; the instance's state holds one public and one private fixed address; the SSH key's
`name` echoes its input.

## For the runbook

- The Public Cloud project must be attached to a **vRack** before a private network can be created
  (Control Panel, Public Cloud, Private Network creates and attaches one).
- The chosen region must be enabled in the project.
- The gateway and each floating IP are billed hourly even when idle.
