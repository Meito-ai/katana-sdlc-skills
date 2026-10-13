# Linode / Akamai Cloud

| | |
|---|---|
| Package | `@pulumi/linode` (`import * as linode from '@pulumi/linode'`) |
| Credentials | `LINODE_TOKEN`: Cloud Manager -> profile -> API Tokens, read/write on Linodes, Firewalls, VPCs and IPs |
| `region` | `de-fra-2`, `nl-ams`, `gb-lon`, `fr-par`, `us-east`, `us-ord`, `us-sea`, `sg-sin-2` (pick one with the Metadata service, which cloud-init needs) |
| `image` | `linode/ubuntu24.04` |
| Private network | when more than one server |
| SSH user | `root` |

## Sizes (checked 2026-10-13)

| Tier | Type | Spec |
|---|---|---|
| S | `g6-standard-2` | 2 shared vCPU / 4 GB |
| M | `g6-standard-4` | 4 shared vCPU / 8 GB |
| L | `g6-standard-6` | 6 shared vCPU / 16 GB (nearest; no 8 vCPU / 16 GB shared plan) |

## Resources

Linode ids are numeric; inputs typed `number` take `Number(...)` inside an `apply`. Firewalls, VPCs
and subnets need an explicit `label` (rule 5): unique per account, letters, digits, `-`, `_`, `.`;
firewall labels at most 32 characters.

- **SSH key**: no resource. Instances take `authorizedKeys: [sshPublicKey]`.
- **Network**: `linode.Vpc` `{ label, region }` plus `linode.VpcSubnet` `{ label, vpcId:
  Number(vpc.id), ipv4: SUBNET_CIDR }`.
- **Firewall**: one `linode.Firewall` per rule set `{ label, inboundPolicy: 'DROP', outboundPolicy:
  'ACCEPT', inbounds }`. Inbound entries: `{ label, action: 'ACCEPT', protocol: 'TCP', ports: port,
  ipv4s: ['0.0.0.0/0'], ipv6s: ['::/0'] }` per port, plus `TCP`, `UDP` and `ICMP` from
  `ipv4s: [PRIVATE_CIDR]`. Instances take `firewallId: Number(firewall.id)`.
- **Server**: `linode.Instance` `{ region, type: size, image, authorizedKeys, firewallId, tags,
  metadatas: [{ userData }], interfaces }`.
  - `userData` must be **base64**: `Buffer.from(script).toString('base64')`.
  - `interfaces`: `[{ purpose: 'public' }]`, plus `{ purpose: 'vpc', subnetId: Number(subnet.id) }`
    when the private network exists. The public interface comes first.
  - Options: `ignoreChanges: ['metadatas', 'authorizedKeys']`.
- **Static IP**: `linode.ReservedIp` `{ region }` plus `linode.ReservedIpAssignment` `{ linodeId:
  Number(instance.id), address: reservedIp.address, public: true, applyImmediately: true }`.
  **Verify** in Akamai's reserved-IP docs that Network Helper configures the added address at boot
  before telling the user to point DNS at it; if it does not, the runbook adds the address to the
  interface by hand.
- **Labels**: `tags`, plain strings.

`ServerInfo`: `publicIp` = `instance.ipAddress`, `privateIp` = the VPC interface's `ipv4.vpc` (check
the output shape in `node_modules/@pulumi/linode/types/output.d.ts`), `staticIp` =
`reservedIp.address`.

## Mocks

Ids must be numeric strings. Mock state: `ipAddress: '203.0.113.10'`, `address: '203.0.113.20'`,
`interfaces: [{ purpose: 'public' }, { purpose: 'vpc', ipv4: { vpc: '10.0.1.2' } }]`.

## Behaviour to put in the runbook

- A `type` change resizes in place (with a reboot); `image` and `region` replace the instance.
