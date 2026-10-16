# Alibaba Cloud

| | |
|---|---|
| Registry package | `alicloud` |
| Credentials | the AccessKey pair of a RAM user with ECS and VPC permissions |
| `region` | a region id, set on the provider |
| `size` | an instance type |
| `image` | a **name regex** matching the system Ubuntu LTS image for x86 |
| Private network | always: a VPC is the scaffolding an instance needs |
| SSH user | `root` |

## Live catalog

- **Authenticated** (`aliyun` CLI): `aliyun ecs DescribeRegions`; `aliyun ecs
  DescribeAvailableResource --RegionId <region> --DestinationResource InstanceType` (what each zone
  has in stock) and `aliyun ecs DescribeInstanceTypes` (vCPUs, memory); `aliyun ecs DescribeImages
  --RegionId <region> --ImageOwnerAlias system --OSType linux`.
- **Public**: the ECS instance families and pricing pages on alibabacloud.com.

## Building blocks

| Concept | Alibaba Cloud product |
|---|---|
| Lookups | the system images matching `image` (most recent) and a zone selling the first group's size, as data sources, once per environment |
| SSH key | an ECS key pair |
| Private network | a VPC (`PRIVATE_CIDR`) and a vSwitch (`SUBNET_CIDR`) in the looked-up zone |
| Firewall | a security group per rule set, with one rule resource per rule |
| Server | a pay-as-you-go ECS instance |
| Static IP | an EIP and its association, a resource of its own, so no `deleteBeforeReplace` |

## Quirks

- **The region is set on the provider**: build an explicit provider from `cfg.region` in `index.ts`.
- **Stock varies by zone**: the zone lookup picks one that sells the type.
- Outbound is allowed by default. Private traffic: all protocols from `PRIVATE_CIDR`.
- **Public bandwidth**: zero on ingress servers (the EIP carries their traffic), above zero
  otherwise, which gives the instance a public IP for SSH and egress: there is no NAT gateway.
- **User data must be base64**: `Buffer.from(script).toString('base64')`.
- **Ignore changes to the image id** as well (rule 3): the lookup returns newer images over time.
  A user-data change reboots the instance.
- System disk: 40 GB of the current SSD class. Labels are tags, a record.

`ServerInfo`: `publicIp` is the EIP on ingress servers and the instance's public IP otherwise,
`privateIp` from the instance, `staticIp` from the EIP. Mocks: fixtures for the two lookups, one
entry each.

## For the runbook

- Instances in mainland China regions need ICP filing before serving web traffic on 80/443.
- An instance type change stops and starts the instance.
