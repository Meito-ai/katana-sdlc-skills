# AWS

| | |
|---|---|
| Registry package | `aws` |
| Credentials | the access keys of an IAM user with EC2 rights (plus a session token for temporary credentials) |
| `region` | a region code, set on the provider |
| `size` | an instance type |
| `image` | an AMI **name pattern** of Canonical's Ubuntu server images for amd64 |
| Private network | always: a VPC is the scaffolding an instance needs |
| SSH user | `ubuntu` |

## Live catalog

- **Authenticated** (`aws` CLI): `aws ec2 describe-regions`; `aws ec2
  describe-instance-type-offerings --location-type region --region <region>` (what the region
  sells) and `describe-instance-types` (vCPUs, memory, architecture); `aws ec2 describe-images
  --owners 099720109477 --region <region>` for the current Ubuntu image names (`099720109477` is
  Canonical's account).
- **Public**: the EC2 instance types and on-demand pricing pages on aws.amazon.com, and Ubuntu's
  cloud image locator on cloud-images.ubuntu.com.

## Building blocks

| Concept | AWS product |
|---|---|
| Lookup | the AMI data source: Canonical's account, most recent, filtered by the `image` pattern, once per environment |
| SSH key | an EC2 key pair |
| Private network | a VPC (`PRIVATE_CIDR`), an internet gateway, a subnet (`SUBNET_CIDR`, public IPs on launch), and a route table sending `0.0.0.0/0` to the gateway, associated with the subnet |
| Firewall | a security group per rule set |
| Server | an EC2 instance |
| Static IP | an Elastic IP and its association, a resource of its own, so no `deleteBeforeReplace` |

## Quirks

- **The region is set on the provider**: build an explicit provider from `cfg.region` in `index.ts`
  (reference design, `index.ts`).
- **Declare egress** (all protocols to `0.0.0.0/0`): the provider removes AWS's default allow-all
  egress rule from a security group it creates. Private traffic: all protocols from `PRIVATE_CIDR`.
- **Root volume**: the default is too small for container images; give it 30 GB of the current
  general-purpose SSD type.
- The `Name` tag is the rule-5 name: it is what the console shows. Labels are tags, a record.
- **Ignore changes to the AMI** as well (rule 3): the lookup returns a newer AMI every time Canonical
  publishes one, which would replace every instance on the next `up`. Image upgrades are deliberate:
  `pulumi up --replace <urn>`.

`ServerInfo`: `publicIp` is the Elastic IP on ingress servers and the instance's public IP otherwise;
`privateIp` from the instance; `staticIp` from the Elastic IP. Mocks: a fixture for the AMI lookup.

## For the runbook

- An instance type change stops and starts the instance: a short outage, same disk and Elastic IP.
- The account's EC2 quotas (vCPUs per instance family) can block a first `up`: raise them in
  Service Quotas.
