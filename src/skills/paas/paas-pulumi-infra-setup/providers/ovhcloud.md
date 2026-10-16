# OVHcloud Public Cloud

| | |
|---|---|
| Registry package | `ovh` |
| Credentials | the API endpoint (EU, CA or US) plus either application keys with a consumer key, or an OAuth2 service account |
| Extra config | `<project>:cloudProjectId`: the Public Cloud project id (the `serviceName`), non-secret, in every stack file |
| `region` | an OpenStack region enabled in the project |
| `size` | a flavor **name**, resolved to the region's flavor id by the program |
| `image` | an image **name**, resolved to the region's image id by the program |
| Private network | when more than one server, **or** whenever an ingress group has servers (floating IPs need it) |
| SSH user | `ubuntu` |

## Live catalog

- **Public**: the public order catalog
  (`https://eu.api.ovh.com/v1/order/catalog/public/cloud?ovhSubsidiary=<subsidiary>`; not every
  country code is a valid subsidiary, `FR` is) lists every instance flavor with its specs and price.
  Take the hourly (consumption) plans, check the catalog's price unit, and multiply by 730 for a
  month. It has no images and no per-region availability. The Public Cloud regions page on
  ovhcloud.com lists the locations, but not the region ids the API takes: confirm the id and the
  image name with the user.
- **Per region**: the account's API needs signed requests, so the program's own lookups are the
  check. A name the region does not offer fails the first preview with the names it does offer.

## Building blocks

The package carries two generations of Public Cloud resources: use the newer one, as the package
docs mark it. Every resource takes the project id and the region.

| Concept | OVHcloud product |
|---|---|
| Lookups | the region's instance flavors and images, as data sources, once per environment |
| SSH key | a Public Cloud SSH key; instances reference it by name |
| Private network | a vRack private network with one subnet: `SUBNET_CIDR`, DHCP, the gateway at its first address |
| Gateway | a Public Cloud gateway, smallest model (**verify** the model names in OVHcloud's gateway docs), external gateway on, when an ingress group has servers: a floating IP is NAT'd through it |
| Firewall | a security group per rule set |
| Server | a Public Cloud instance |
| Static IP | a floating IP |

## Quirks

- **Lookups**: pick the entry whose name equals `size` / `image`, and make a miss throw a message
  naming what the region does offer. The miss surfaces inside an `apply` during registration, so
  unit-test the lookup as a plain function.
- **Security groups**: allow any protocol from `PRIVATE_CIDR`. OpenStack adds an allow-all egress
  rule to each new group itself, and it never appears in the managed rule list, so add no egress
  rules. Give each instance its group explicitly: with none, the project's default group applies,
  and an empty list blocks all inbound traffic.
- **Ingress servers** have no public interface of their own: their only network is the private
  subnet, with the floating IP attached there. Inbound arrives on the floating IP, outbound leaves
  through the gateway. They take `deleteBeforeReplace: true` (rule 4) and depend on the gateway.
- **Other servers** list a network entry asking for an automatic public IP (at most one such
  entry), plus the private subnet when the network exists.
- **Ignore changes to the image id** as well (rule 3). A user-data change **reinstalls** the
  instance (root disk wiped), and image ids rotate when OVHcloud republishes an image, so a fresh
  lookup would rebuild every server. The SSH key reference is immutable and recreates the instance.
- No labels on these resources; put the group in the description where one exists.

`ServerInfo`: from the instance's reported network state (empty while it is being created), keep
the fixed IPv4 addresses. The one inside `SUBNET_CIDR` is `privateIp`, the other `publicIp`; the
floating IP is `staticIp`, and also an ingress server's `publicIp`. The floating IP's address is in
its own reported state too, not a top-level output. Mocks: fixtures for the two lookups, one entry per size and image in the
stack files; the instance's state holds one public and one private fixed address; the SSH key's
name echoes its input.

## For the runbook

- The Public Cloud project must be attached to a **vRack** before a private network can be created;
  the Control Panel's Private Network section creates and attaches one.
- The chosen region must be enabled in the project.
- The gateway and each floating IP are billed hourly even when idle.
