# Alibaba Cloud

| | |
|---|---|
| Package | `@pulumi/alicloud` (`import * as alicloud from '@pulumi/alicloud'`) |
| Credentials | `ALICLOUD_ACCESS_KEY` + `ALICLOUD_SECRET_KEY` of a RAM user with ECS and VPC rights |
| `region` | `eu-central-1` (Frankfurt), `eu-west-1` (London), `us-east-1` (Virginia), `us-west-1`, `ap-southeast-1` (Singapore), `cn-hangzhou` |
| `image` | an image **name regex**: `^ubuntu_24_04_x64` |
| Private network | always: a VPC is the scaffolding an instance needs |
| SSH user | `root` |

The region is set on the provider: build `new alicloud.Provider('alicloud', { region: cfg.region })`
in `index.ts` and pass it as `{ providers: [provider] }`.

## Sizes (checked 2026-10-13)

| Tier | Instance type | Spec |
|---|---|---|
| S | `ecs.u1-c1m2.large` | 2 vCPU / 4 GB |
| M | `ecs.u1-c1m2.xlarge` | 4 vCPU / 8 GB |
| L | `ecs.u1-c1m2.2xlarge` | 8 vCPU / 16 GB |

Stock varies by zone: the zone lookup below picks one that sells the type.

## Resources

- **Lookups**, once per environment with `{ parent: this }`:
  `alicloud.ecs.getImagesOutput({ nameRegex: image, owners: 'system', mostRecent: true })` -> the
  first image's `id`; `alicloud.getZonesOutput({ availableResourceCreation: 'VSwitch',
  availableInstanceType: <the first group's size> })` -> the first zone's `id`.
- **SSH key**: `alicloud.ecs.EcsKeyPair` `{ publicKey }`; instances take `keyName:
  keyPair.keyPairName`.
- **Network**: `alicloud.vpc.Network` `{ cidrBlock: PRIVATE_CIDR }` plus `alicloud.vpc.Switch`
  `{ vpcId, cidrBlock: SUBNET_CIDR, zoneId }`.
- **Firewall**: one `alicloud.ecs.SecurityGroup` `{ vpcId }` per rule set, and one
  `alicloud.ecs.SecurityGroupRule` per rule `{ securityGroupId, type: 'ingress', ipProtocol: 'tcp',
  portRange: '22/22', cidrIp: '0.0.0.0/0', policy: 'accept', priority: 1 }`, plus `{ ipProtocol:
  'all', portRange: '-1/-1', cidrIp: PRIVATE_CIDR }`. Outbound is allowed by default.
- **Server**: `alicloud.ecs.Instance` `{ imageId, instanceType: size, vswitchId, securityGroups:
  [group.id], keyName, userData: <base64 bootstrap>, instanceChargeType: 'PostPaid',
  internetChargeType: 'PayByTraffic', internetMaxBandwidthOut, systemDiskCategory: 'cloud_essd',
  systemDiskSize: 40, tags }`.
  - `internetMaxBandwidthOut`: `0` on ingress servers (the EIP carries their traffic), `10` otherwise
    (a public IP for SSH and egress; there is no NAT gateway).
  - Options: `ignoreChanges: ['imageId', 'userData', 'keyName']`. `imageId` because the lookup
    returns newer images over time; a `userData` change reboots the instance.
- **Static IP**: `alicloud.ecs.EipAddress` `{ bandwidth: '10', internetChargeType: 'PayByTraffic' }`
  plus `alicloud.ecs.EipAssociation` `{ allocationId: eip.id, instanceId: instance.id }`. The
  association is its own resource, so no `deleteBeforeReplace`.
- **Labels**: `tags`, a record.

`ServerInfo`: `publicIp` = `eip.ipAddress` on ingress servers and `instance.publicIp` otherwise,
`privateIp` = `instance.privateIp`, `staticIp` = `eip.ipAddress`.

## Mocks

Fixtures, matched by `args.token.endsWith(...)`: `/getImages:getImages` -> `{ images: [{ id:
'ubuntu_24_04_x64_20G_alibase.vhd' }] }`, `/getZones:getZones` -> `{ zones: [{ id: 'eu-central-1a' }] }`.
Mock state: `publicIp: '203.0.113.10'`, `privateIp: '10.0.1.2'`, `ipAddress: '203.0.113.20'`,
`keyPairName: 'key'`. `privateNetworkId` is always set.

## Behaviour to put in the runbook

- Instances in mainland China regions need ICP filing before serving web traffic on 80/443.
- An `instanceType` change stops and starts the instance.
