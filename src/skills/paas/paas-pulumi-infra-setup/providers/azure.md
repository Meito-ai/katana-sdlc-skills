# Microsoft Azure

| | |
|---|---|
| Registry package | `azure-native`, imported per module (compute, network, resources); not the classic `azure` package |
| Credentials | a service principal with a client secret, holding the Contributor role on the subscription |
| `region` | a location name |
| `size` | a VM size name |
| `image` | a Canonical image URN, `publisher:offer:sku:version` with version `latest` |
| Private network | always: a virtual network is the scaffolding a VM needs |
| SSH user | `azureuser` |

## Live catalog

- **Authenticated** (`az` CLI): `az account list-locations`; `az vm list-skus --location <region>
  --resource-type virtualMachines`, whose restrictions show the sizes this subscription cannot use
  there (common on new subscriptions); `az vm image list-offers --location <region> --publisher
  Canonical` and `az vm image list-skus` for the Ubuntu URN.
- **Public**: the Azure Retail Prices API (`https://prices.azure.com/api/retail/prices`, filtered to
  Virtual Machines, the region and consumption prices; skip the Windows rows), the VM size
  documentation on learn.microsoft.com, and Ubuntu's cloud image locator on cloud-images.ubuntu.com.

## Building blocks

Every resource takes the resource group and the location.

| Concept | Azure product |
|---|---|
| Resource group | one per stack: deleting it removes everything |
| Private network | a virtual network (`PRIVATE_CIDR`) with its subnet (`SUBNET_CIDR`) declared **inline** |
| Firewall | a network security group per rule set, attached to the NIC |
| Public IP | a Standard public IP per server (SSH needs it); the static IP on ingress servers |
| NIC | a network interface |
| Server | a virtual machine |

## Quirks

- **Declare the subnet inline** and read its id from the virtual network: a separate subnet resource
  fights the virtual network over its subnet list.
- **The built-in security rules** already allow traffic within the virtual network and all outbound,
  so there is no private or egress rule to add. Inbound rules need distinct priorities.
- Standard public IPs are always static, and closed until a security group opens them.
- **Custom data must be base64**: `Buffer.from(script).toString('base64')`. Password login off; the
  SSH key goes to the admin user's `~/.ssh/authorized_keys`.
- OS disk: a standard SSD managed disk, deleted with the VM.
- **Ignore changes to the whole OS profile** (rule 3): it holds both the custom data and the keys,
  and is create-only. `deleteBeforeReplace: true` on every VM: a NIC belongs to one VM at a time
  (rule 4).
- Labels are tags, a record.

`ServerInfo`: `publicIp` from the public IP, `privateIp` from the NIC's first IP configuration,
`staticIp` = the public IP on ingress servers. Mocks: the NIC's first IP configuration carries a
private address, and the virtual network's first subnet an id.

## For the runbook

- A size change deallocates and restarts the VM when the new size needs other hardware.
- New subscriptions often have a vCPU quota of a few cores per VM family: check the region's usage
  (`az vm list-usage`) before the first `up`.
