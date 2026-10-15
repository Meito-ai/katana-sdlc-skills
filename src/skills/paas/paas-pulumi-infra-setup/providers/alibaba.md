# Alibaba Cloud

| | |
|---|---|
| Package | `@pulumi/alicloud` |
| Credentials | `ALICLOUD_ACCESS_KEY` + `ALICLOUD_SECRET_KEY` of a RAM user with ECS and VPC rights |
| `region` | a region id, set on the provider |
| `size` | an instance type |
| `image` | a system image **name regex** (`^ubuntu_<major>_04_x64`) |
| Private network | always: a VPC is the scaffolding an instance needs |
| SSH user | `root` |

## Live catalog

- **Authenticated** (`aliyun` CLI): `aliyun ecs DescribeRegions`; `aliyun ecs
  DescribeAvailableResource --RegionId <region> --DestinationResource InstanceType` (what each zone
  has in stock) and `aliyun ecs DescribeInstanceTypes` (vCPUs, memory); `aliyun ecs DescribeImages
  --RegionId <region> --ImageOwnerAlias system --OSType linux`.
- **Public**: https://www.alibabacloud.com/help/en/ecs/user-guide/overview-of-instance-families and
  https://www.alibabacloud.com/en/product/ecs-pricing-list.

## Building blocks

| Concept | Resource |
|---|---|
| Lookups | `ecs.getImagesOutput` (`nameRegex: image`, system images, most recent) and `getZonesOutput` (a zone selling the first group's size), once per environment |
| SSH key | `ecs.EcsKeyPair` |
| Private network | `vpc.Network` (`PRIVATE_CIDR`) + `vpc.Switch` (`SUBNET_CIDR`, the looked-up zone) |
| Firewall | `ecs.SecurityGroup`, one per rule set, and an `ecs.SecurityGroupRule` per rule |
| Server | `ecs.Instance`, pay-as-you-go |
| Static IP | `ecs.EipAddress` + `ecs.EipAssociation`: the association is its own resource, so no `deleteBeforeReplace` |

## Quirks

- **The region is set on the provider**: build `new alicloud.Provider('alicloud', { region:
  cfg.region })` in `index.ts`.
- **Stock varies by zone**: the zone lookup picks one that sells the type.
- Outbound is allowed by default. Private traffic: all protocols from `PRIVATE_CIDR`.
- **Public bandwidth**: `internetMaxBandwidthOut` `0` on ingress servers (the EIP carries their
  traffic) and above `0` otherwise, which gives the instance a public IP for SSH and egress: there
  is no NAT gateway.
- **`userData` must be base64**: `Buffer.from(script).toString('base64')`.
- `ignoreChanges: ['imageId', 'userData', 'keyName']`. `imageId` because the lookup returns newer
  images over time; a `userData` change reboots the instance.
- System disk: ESSD, 40 GB. Labels are `tags`, a record.

`ServerInfo`: `publicIp` is the EIP on ingress servers and the instance's public IP otherwise,
`privateIp` from the instance, `staticIp` from the EIP. Mocks: fixtures for the two lookups
(`/getImages:getImages` and `/getZones:getZones`, one entry each).

## For the runbook

- Instances in mainland China regions need ICP filing before serving web traffic on 80/443.
- An instance type change stops and starts the instance.
