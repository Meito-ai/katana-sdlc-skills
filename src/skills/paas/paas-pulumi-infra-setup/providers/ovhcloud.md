# OVHcloud Public Cloud

| | |
|---|---|
| Package | `@ovhcloud/pulumi-ovh` (`import * as ovh from '@ovhcloud/pulumi-ovh'`) |
| Credentials | `OVH_ENDPOINT` (`ovh-eu`, `ovh-ca` or `ovh-us`) plus either `OVH_APPLICATION_KEY`, `OVH_APPLICATION_SECRET`, `OVH_CONSUMER_KEY` (API keys from the endpoint's `createToken` page), or `OVH_CLIENT_ID`, `OVH_CLIENT_SECRET` (an OAuth2 service account) |
| Extra config | `<project>:cloudProjectId`: the Public Cloud project id (the `serviceName`), non-secret, in every stack file |
| `region` | an OpenStack region enabled in the project: `GRA11`, `SBG5`, `DE1`, `UK1`, `WAW1`, `BHS5` |
| `image` | the image **name** `Ubuntu 24.04`, resolved to an id per region |
| Private network | when more than one server, **or** whenever an ingress group has servers (floating IPs need it) |
| SSH user | `ubuntu` |

## Sizes (checked 2026-10-13)

`size` holds the flavor **name**; the program resolves it to the region's flavor id.

| Tier | Flavor | Spec |
|---|---|---|
| S | `c3-4` | 2 vCPU / 4 GB / 50 GB NVMe |
| M | `c3-8` | 4 vCPU / 8 GB / 100 GB |
| L | `c3-16` | 8 vCPU / 16 GB / 200 GB |

## Resources

All resources take `serviceName: cfg.cloudProjectId` and `region`. Use the `ovh.Cloud*` resources
at the package root (the newer API), not the older `ovh.cloudproject.*` ones.

- **Lookups**: `ovh.getCloudInstanceFlavorsOutput({ serviceName, region })` and
  `ovh.getCloudInstanceImagesOutput({ serviceName, region })`, then pick the entry whose `name`
  equals `size` / `image`; throw a clear error when none matches. Call them once per environment
  with `{ parent: this }`.
- **SSH key**: `ovh.CloudSSHKey` `{ serviceName, publicKey }`; instances take
  `sshKeyName: key.name`.
- **Network**: `ovh.CloudNetworkPrivateVrack` `{ serviceName, region }` plus
  `ovh.CloudNetworkPrivateVrackSubnet` `{ serviceName, region, networkId: network.id,
  cidr: SUBNET_CIDR, dhcpEnabled: true, gatewayIp: '10.0.1.1' }`. When an ingress group has servers,
  add `ovh.CloudGateway` `{ serviceName, region, subnetIds: [subnet.id], externalGateway:
  { enabled: true, model: 'S' } }`: a floating IP is NAT'd through it.
- **Firewall**: one `ovh.CloudSecurityGroup` per rule set, `rules` of `{ direction: 'ingress',
  ethernetType: 'IPv4', protocol: 'tcp', portRangeMin, portRangeMax, remoteIpPrefix: '0.0.0.0/0' }`,
  plus `{ direction: 'ingress', ethernetType: 'IPv4', remoteIpPrefix: PRIVATE_CIDR }` (no protocol
  means any), plus explicit egress `{ direction: 'egress', ethernetType: 'IPv4' }` and
  `{ direction: 'egress', ethernetType: 'IPv6' }` so the rule list never leaves egress closed.
  Instances take `securityGroupIds: [group.id]`. Omitting it applies the project's `default` group,
  and `[]` blocks all inbound traffic.
- **Server**: `ovh.CloudInstance` `{ serviceName, region, flavorId, imageId, sshKeyName, userData,
  securityGroupIds, networks }`.
  - Ingress servers: `networks: [{ networkId, subnetId, ip: floatingIp.currentState.ip }]`. They have
    no public interface of their own; inbound arrives on the floating IP and outbound leaves through
    the gateway. Options: `deleteBeforeReplace: true` (rule 4), and `dependsOn` the gateway: the
    floating IP is associated through it.
  - Other servers: `networks: [{ autoAssignPublicIp: true }]`, plus `{ networkId, subnetId }` when the
    private network exists.
  - Options for all: `ignoreChanges: ['userData', 'imageId']`. A `userData` change **reinstalls** the
    instance (root disk wiped), and image ids rotate when OVH republishes an image, so a fresh lookup
    would rebuild every server. `sshKeyName` is immutable and recreates the instance.
- **Static IP**: `ovh.CloudFloatingIp` `{ serviceName, region, description }`; its address is
  `floatingIp.currentState.ip`.
- **Labels**: none on these resources; put the group in the `description` where one exists.

`ServerInfo`: read addresses from `instance.currentState.networks[].addresses[]`, keeping `version` 4
and `type` `FIXED`. The one inside `SUBNET_CIDR` is `privateIp`, the other is `publicIp`; the floating
IP is `staticIp`, and also an ingress server's `publicIp`.

A flavor or image name the region does not offer fails inside an `apply`, during registration: make
the lookup throw a message naming what the region does offer, and unit-test that lookup as a plain
function.

## Mocks

Fixtures for the two calls, matched by `args.token.endsWith(...)`:
`getCloudInstanceFlavors` -> `{ flavors: [{ id: 'flavor-c3-4', name: 'c3-4' }, ...] }` (one entry per
size in the stack files) and `getCloudInstanceImages` -> `{ images: [{ id: 'image-ubuntu', name:
'Ubuntu 24.04' }] }`. Mock state: `currentState: { ip: '203.0.113.20', networks: [{ subnetId: '', addresses: [{ ip:
'203.0.113.10', type: 'FIXED', version: 4 }, { ip: '10.0.1.2', type: 'FIXED', version: 4 }] }] }`, and
`name: args.name` (the SSH key's `name` feeds `sshKeyName`). `privateNetworkId` is non-null whenever
an ingress group has servers.

## Prerequisites for the runbook

- The Public Cloud project must be attached to a **vRack** before a private network can be created:
  Control Panel -> Public Cloud -> Private Network creates and attaches one.
- The chosen region must be enabled in the project.
- The gateway (model `S`) and each floating IP are billed hourly even when idle.
