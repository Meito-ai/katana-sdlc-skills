# AWS

| | |
|---|---|
| Package | `@pulumi/aws` |
| Credentials | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` of an IAM user with EC2 rights (`AWS_SESSION_TOKEN` too for temporary credentials) |
| `region` | a region code, set on the provider |
| `size` | an instance type |
| `image` | an AMI **name pattern** of Canonical's Ubuntu images, ending in `-amd64-server-*` |
| Private network | always: a VPC is the scaffolding an instance needs |
| SSH user | `ubuntu` |

## Live catalog

- **Authenticated** (`aws` CLI): `aws ec2 describe-regions`; `aws ec2
  describe-instance-type-offerings --location-type region --region <region>` (what the region
  sells) and `describe-instance-types` (vCPUs, memory, architecture); `aws ec2 describe-images
  --owners 099720109477 --region <region> --filters 'Name=name,Values=ubuntu/images/*-amd64-server-*'`
  for the current Ubuntu name pattern (`099720109477` is Canonical's account).
- **Public**: https://aws.amazon.com/ec2/instance-types/, https://aws.amazon.com/ec2/pricing/on-demand/
  and https://cloud-images.ubuntu.com/locator/ (images).

## Building blocks

| Concept | Resource |
|---|---|
| Lookup | `ec2.getAmiOutput` `{ owners: [Canonical], mostRecent: true }`, filtered by the `image` pattern, once per environment |
| SSH key | `ec2.KeyPair` |
| Private network | `ec2.Vpc` (`PRIVATE_CIDR`), `ec2.InternetGateway`, `ec2.Subnet` (`SUBNET_CIDR`, public IP on launch), `ec2.RouteTable` (`0.0.0.0/0` to the gateway) and `ec2.RouteTableAssociation` |
| Firewall | `ec2.SecurityGroup`, one per rule set |
| Server | `ec2.Instance` |
| Static IP | `ec2.Eip` + `ec2.EipAssociation`: the association is its own resource, so no `deleteBeforeReplace` |

## Quirks

- **The region is set on the provider**: build `new aws.Provider('aws', { region: cfg.region })` in
  `index.ts` (reference design, `index.ts`).
- **Declare egress** (all protocols to `0.0.0.0/0`): the provider removes AWS's default allow-all
  egress rule from a security group it creates. Private traffic: all protocols from `PRIVATE_CIDR`.
- **Root volume**: the default 8 GB fills up with container images; give it 30 GB of `gp3`.
- `tags.Name` is the rule-5 name: it is what the console shows. Labels are `tags`, a record.
- `ignoreChanges: ['ami', 'userData', 'keyName']`. `ami` because the lookup returns a newer AMI
  every time Canonical publishes one, which would replace every instance on the next `up`. Image
  upgrades are deliberate: `pulumi up --replace <urn>`.

`ServerInfo`: `publicIp` is the Elastic IP on ingress servers and the instance's public IP otherwise;
`privateIp` from the instance; `staticIp` from the Elastic IP. Mocks: a fixture for the AMI lookup
(`/getAmi:getAmi` -> `{ id: 'ami-0123456789abcdef0' }`).

## For the runbook

- An `instanceType` change stops and starts the instance: a short outage, same disk and Elastic IP.
- The account's EC2 quotas (vCPUs per instance family) can block a first `up`: raise them in
  Service Quotas.
