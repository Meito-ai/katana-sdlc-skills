# Google Cloud

| | |
|---|---|
| Package | `@pulumi/gcp` (`import * as gcp from '@pulumi/gcp'`) |
| Credentials | `GOOGLE_CREDENTIALS`: the JSON key of a service account with Compute Admin. Workload Identity Federation (`google-github-actions/auth`) is the recommended CI upgrade, noted in the runbook |
| Extra config | `<project>:gcpProject` (the project id) and `<project>:zone` (one zone of the region), non-secret, in every stack file |
| `region` | `europe-west3`, `europe-west1`, `europe-west4`, `europe-north1`, `us-central1`, `us-east1`, `asia-southeast1` |
| `image` | `ubuntu-os-cloud/ubuntu-2404-lts-amd64` (an image family) |
| Private network | always: a VPC network is the scaffolding an instance needs |
| SSH user | `ubuntu` |

The project and region are set on the provider: build `new gcp.Provider('gcp', { project:
cfg.gcpProject, region: cfg.region, zone: cfg.zone })` in `index.ts` and pass it as
`{ providers: [provider] }`. Propose a zone that exists: not every region has an `-a` zone
(`europe-west1` starts at `-b`); `gcloud compute zones list --filter=region:<region>` lists them.

## Sizes (checked 2026-10-13)

| Tier | Machine type | Spec |
|---|---|---|
| S | `e2-medium` | 2 shared vCPU / 4 GB |
| M | `e2-custom-4-8192` | 4 vCPU / 8 GB (custom) |
| L | `e2-custom-8-16384` | 8 vCPU / 16 GB (custom) |

## Resources

- **Network**: `gcp.compute.Network` `{ autoCreateSubnetworks: false }` plus
  `gcp.compute.Subnetwork` `{ network: network.id, ipCidrRange: SUBNET_CIDR, region }`. Instances
  with an external IP reach the internet without a router.
- **Firewall**: GCP firewalls belong to the network and select instances by **network tag**. One
  `gcp.compute.Firewall` per rule set `{ network: network.id, direction: 'INGRESS', allows: [{
  protocol: 'tcp', ports }], sourceRanges: ['0.0.0.0/0'], targetTags: [tag] }` with tags
  `<project>-<stack>-ingress` / `-internal`, plus one internal rule `{ allows: [{ protocol: 'tcp' },
  { protocol: 'udp' }, { protocol: 'icmp' }], sourceRanges: [PRIVATE_CIDR] }` with no target tags (it
  covers the whole network). Egress is open by default.
- **Static IP**: `gcp.compute.Address` `{ region, addressType: 'EXTERNAL' }`.
- **Server**: `gcp.compute.Instance` `{ machineType: size, zone, bootDisk: { initializeParams: {
  image, size: 30 } }, networkInterfaces: [{ subnetwork: subnet.id, accessConfigs }], metadata: {
  'ssh-keys': `ubuntu:${sshPublicKey}`, 'user-data': script }, tags: [ruleTag], labels,
  allowStoppingForUpdate: true }`. Without `allowStoppingForUpdate` a `machineType` change fails
  instead of stopping the instance.
  - `accessConfigs`: `[{ natIp: address.address }]` on ingress servers, `[{}]` (an ephemeral
    external IP) otherwise.
  - Ubuntu images run cloud-init on the `user-data` metadata key; skip the key when the bootstrap is
    `none`.
  - Options: `ignoreChanges: ['metadata']`; ingress servers also `deleteBeforeReplace: true` (the
    address is bound through `accessConfigs`, rule 4).
- **Labels**: `labels`, a record of lowercase keys and values.

`ServerInfo`: `publicIp` = `networkInterfaces[0].accessConfigs[0].natIp`, `privateIp` =
`networkInterfaces[0].networkIp`, `staticIp` = `address.address`.

## Mocks

Mock state: `address: '203.0.113.20'`; for an instance, `networkInterfaces` with `networkIp:
'10.0.1.2'` and `accessConfigs: [{ natIp: '203.0.113.10' }]` merged into the first entry.
`privateNetworkId` is always set.

## Prerequisites for the runbook

- The Compute Engine API must be enabled in the project (`gcloud services enable compute.googleapis.com`).
- A `machineType` change stops the instance, resizes it and starts it again: a short outage.
