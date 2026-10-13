# AWS

| | |
|---|---|
| Package | `@pulumi/aws` (`import * as aws from '@pulumi/aws'`) |
| Credentials | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` of an IAM user with EC2 rights (`AWS_SESSION_TOKEN` too for temporary credentials). OIDC (`aws-actions/configure-aws-credentials` with `role-to-assume`) is the recommended CI upgrade, noted in the runbook |
| `region` | `eu-central-1`, `eu-west-1`, `eu-north-1`, `us-east-1`, `us-east-2`, `us-west-2`, `ap-southeast-1` |
| `image` | an AMI **name pattern**: `ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*` |
| Private network | always: a VPC is the scaffolding an instance needs |
| SSH user | `ubuntu` |

The region is set on the provider: build `new aws.Provider('aws', { region: cfg.region })` in
`index.ts` and pass it as `{ providers: [provider] }` (reference design, `index.ts`).

## Sizes (checked 2026-10-13)

| Tier | Type | Spec |
|---|---|---|
| S | `t3.medium` | 2 burstable vCPU / 4 GB |
| M | `c7i.xlarge` | 4 vCPU / 8 GB |
| L | `c7i.2xlarge` | 8 vCPU / 16 GB |

## Resources

- **Lookup**: `aws.ec2.getAmiOutput({ owners: ['099720109477'], mostRecent: true, filters: [{ name:
  'name', values: [image] }, { name: 'virtualization-type', values: ['hvm'] }] }, { parent: this })`.
  `099720109477` is Canonical's account.
- **SSH key**: `aws.ec2.KeyPair` `{ publicKey }`; instances take `keyName: keyPair.keyName`.
- **Network**: `aws.ec2.Vpc` `{ cidrBlock: PRIVATE_CIDR, enableDnsHostnames: true, tags }`,
  `aws.ec2.InternetGateway` `{ vpcId }`, `aws.ec2.Subnet` `{ vpcId, cidrBlock: SUBNET_CIDR,
  mapPublicIpOnLaunch: true }`, `aws.ec2.RouteTable` `{ vpcId, routes: [{ cidrBlock: '0.0.0.0/0',
  gatewayId: igw.id }] }` and `aws.ec2.RouteTableAssociation` `{ subnetId, routeTableId }`.
- **Firewall**: one `aws.ec2.SecurityGroup` per rule set `{ vpcId, ingress, egress, tags }`. Ingress:
  `{ protocol: 'tcp', fromPort, toPort, cidrBlocks: ['0.0.0.0/0'] }` per port, plus `{ protocol: '-1',
  fromPort: 0, toPort: 0, cidrBlocks: [PRIVATE_CIDR] }`. **Declare egress** `{ protocol: '-1',
  fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] }`: the provider removes AWS's default allow-all
  egress rule from a security group it creates.
- **Server**: `aws.ec2.Instance` `{ ami: ami.id, instanceType: size, subnetId, vpcSecurityGroupIds:
  [group.id], keyName, userData, rootBlockDevice: { volumeSize: 30, volumeType: 'gp3' }, tags }`.
  The default 8 GB root volume fills up with container images. Set `tags.Name` to the rule-5 name:
  it is what the console shows.
  Options: `ignoreChanges: ['ami', 'userData', 'keyName']`. `ami` is included because the lookup
  returns a newer AMI every time Canonical publishes one, which would replace every instance on the
  next `up`. Image upgrades are deliberate: `pulumi up --replace <urn>`.
- **Static IP**: `aws.ec2.Eip` `{ domain: 'vpc', tags }` plus `aws.ec2.EipAssociation` `{ instanceId:
  instance.id, allocationId: eip.allocationId }`. The association is its own resource, so no
  `deleteBeforeReplace`.
- **Labels**: `tags`, a record.

`ServerInfo`: `publicIp` = `eip.publicIp` on ingress servers and `instance.publicIp` otherwise,
`privateIp` = `instance.privateIp`, `staticIp` = `eip.publicIp`.

## Mocks

Fixture for the call whose `args.token` ends with `/getAmi:getAmi`: `{ id: 'ami-0123456789abcdef0' }`.
Mock state: `publicIp: '203.0.113.10'`, `privateIp: '10.0.1.2'`, `allocationId: 'eipalloc-1'`,
`keyName: 'key'`. `privateNetworkId` is always set.

## Behaviour to put in the runbook

- An `instanceType` change stops and starts the instance: a short outage, same disk and EIP.
- The account's EC2 quotas (vCPU limit per instance family) can block a first `up`: raise them in
  Service Quotas.
