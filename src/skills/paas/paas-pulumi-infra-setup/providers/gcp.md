# Google Cloud

| | |
|---|---|
| Package | `@pulumi/gcp` |
| Credentials | `GOOGLE_CREDENTIALS`: the JSON key of a service account with Compute Admin |
| Extra config | `<project>:gcpProject` (the project id) and `<project>:zone` (one zone of the region), non-secret, in every stack file |
| `region` | a region name, set on the provider |
| `size` | a machine type name |
| `image` | an image family in `ubuntu-os-cloud` (`ubuntu-os-cloud/ubuntu-<version>-lts-amd64`) |
| Private network | always: a VPC network is the scaffolding an instance needs |
| SSH user | `ubuntu` |

## Live catalog

- **Authenticated** (`gcloud`): `gcloud compute regions list`, `gcloud compute zones list
  --filter=region:<region>`, `gcloud compute machine-types list --filter=zone:<zone>`, and
  `gcloud compute images list --project ubuntu-os-cloud` for the Ubuntu families.
- **Public**: https://cloud.google.com/compute/docs/regions-zones,
  https://cloud.google.com/compute/docs/general-purpose-machines,
  https://cloud.google.com/compute/vm-instance-pricing and https://cloud-images.ubuntu.com/locator/.

## Building blocks

| Concept | Resource |
|---|---|
| Private network | `compute.Network` (`autoCreateSubnetworks: false`) + `compute.Subnetwork` (`SUBNET_CIDR`) |
| Firewall | `compute.Firewall`, one per rule set, selecting instances by network tag |
| Static IP | `compute.Address`, external |
| Server | `compute.Instance` |

## Quirks

- **The project, region and zone are set on the provider**: build `new gcp.Provider('gcp', { project:
  cfg.gcpProject, region: cfg.region, zone: cfg.zone })` in `index.ts`. Propose a zone that exists:
  not every region has an `-a` zone.
- **Custom machine types** (`e2-custom-<vCPUs>-<memory MB>`) match a tier exactly when no predefined
  type does; the catalog does not list them.
- **Firewalls belong to the network** and select instances by tag: `<project>-<stack>-ingress` /
  `-internal`, plus one internal rule (TCP, UDP, ICMP from `PRIVATE_CIDR`) with no target tags.
  Egress is open by default, and instances with an external IP reach the internet without a router.
- **`allowStoppingForUpdate: true`**, or a machine type change fails instead of stopping the instance.
- **External IPs**: ingress servers take the address as their access config's NAT IP, other servers
  an empty access config (an ephemeral external IP). Ingress servers take `deleteBeforeReplace: true`
  (rule 4).
- **Metadata**: SSH keys as `ssh-keys: ubuntu:<key>`; Ubuntu runs cloud-init on the `user-data`
  key, skipped when the bootstrap is `none`. `ignoreChanges: ['metadata']` (rule 3).
- Boot disk: 30 GB. Labels are `labels`, lowercase keys and values.

`ServerInfo`: `publicIp` = the first access config's NAT IP, `privateIp` = the first interface's
network IP, `staticIp` from the address. Mocks: the instance's first interface carries both.

## For the runbook

- The Compute Engine API must be enabled in the project (`gcloud services enable compute.googleapis.com`).
- A machine type change stops the instance, resizes it and starts it again: a short outage.
