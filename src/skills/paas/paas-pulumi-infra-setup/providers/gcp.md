# Google Cloud

| | |
|---|---|
| Registry package | `gcp` |
| Credentials | the JSON key of a service account with the Compute Admin role |
| Extra config | `<project>:gcpProject` (the project id) and `<project>:zone` (one zone of the region), non-secret, in every stack file |
| `region` | a region name, set on the provider |
| `size` | a machine type name |
| `image` | an Ubuntu image family in Canonical's `ubuntu-os-cloud` project |
| Private network | always: a VPC network is the scaffolding an instance needs |
| SSH user | `ubuntu` |

## Live catalog

- **Authenticated** (`gcloud`): `gcloud compute regions list`, `gcloud compute zones list
  --filter=region:<region>`, `gcloud compute machine-types list --filter=zone:<zone>`, and `gcloud
  compute images list --project ubuntu-os-cloud` for the Ubuntu families.
- **Public**: the regions and zones, machine families and VM pricing pages on cloud.google.com, and
  Ubuntu's cloud image locator on cloud-images.ubuntu.com.

## Building blocks

| Concept | Google Cloud product |
|---|---|
| Private network | a VPC network without auto-created subnetworks, plus one subnetwork (`SUBNET_CIDR`) |
| Firewall | a VPC firewall rule per rule set, selecting instances by network tag |
| Static IP | a regional external address |
| Server | a Compute Engine instance |

## Quirks

- **The project, region and zone are set on the provider**: build an explicit provider from
  `cfg.gcpProject`, `cfg.region` and `cfg.zone` in `index.ts`. Propose a zone that exists: not every
  region has an `-a` zone.
- **Custom machine types** match a tier exactly when no predefined type does; the catalog does not
  list them, so take their naming from the machine family docs.
- **Firewall rules belong to the network** and select instances by tag: `<project>-<stack>-ingress`
  / `-internal`, plus one internal rule (TCP, UDP, ICMP from `PRIVATE_CIDR`) with no target tags.
  Egress is open by default, and instances with an external IP reach the internet without a router.
- **Allow stopping for update**, or a machine type change fails instead of stopping the instance.
- **External IPs**: ingress servers use the address as their access config's NAT IP; other servers
  get an ephemeral external IP. Ingress servers take `deleteBeforeReplace: true` (rule 4).
- **Metadata**: SSH keys as `ssh-keys: ubuntu:<key>`; Ubuntu runs cloud-init on the `user-data` key,
  skipped when the bootstrap is `none`. Ignore changes to the whole metadata (rule 3).
- Boot disk: 30 GB. Labels are lowercase keys and values.

`ServerInfo`: `publicIp` = the first access config's NAT IP, `privateIp` = the first interface's
internal IP, `staticIp` from the address. Mocks: the instance's first interface carries both.

## For the runbook

- The Compute Engine API must be enabled in the project.
- A machine type change stops the instance, resizes it and starts it again: a short outage.
