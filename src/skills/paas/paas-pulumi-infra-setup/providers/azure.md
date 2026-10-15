# Microsoft Azure

| | |
|---|---|
| Package | `@pulumi/azure-native`, imported per module (`@pulumi/azure-native/compute`, `/network`, `/resources`); not the classic `@pulumi/azure` |
| Credentials | a service principal: `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID` |
| `region` | a location name |
| `size` | a VM size name |
| `image` | a Canonical image URN, `publisher:offer:sku:version` with version `latest` |
| Private network | always: a virtual network is the scaffolding a VM needs |
| SSH user | `azureuser` |

## Live catalog

- **Authenticated** (`az` CLI): `az account list-locations`; `az vm list-skus --location <region>
  --resource-type virtualMachines`, whose `restrictions` show the sizes this subscription cannot use
  there (common on new subscriptions); `az vm image list-offers --location <region> --publisher
  Canonical` and `az vm image list-skus` for the Ubuntu URN.
- **Public**: `GET https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Virtual
  Machines' and armRegionName eq '<region>' and priceType eq 'Consumption'` (Linux rows have no
  "Windows" in `productName`); specs at https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview;
  images at https://cloud-images.ubuntu.com/locator/.

## Building blocks

All resources take `resourceGroupName: group.name` and `location: region`.

| Concept | Resource |
|---|---|
| Resource group | `resources.ResourceGroup`, one per stack: deleting it removes everything |
| Private network | `network.VirtualNetwork` (`PRIVATE_CIDR`), with the subnet (`SUBNET_CIDR`) **inline** |
| Firewall | `network.NetworkSecurityGroup`, one per rule set, attached to the NIC |
| Public IP | `network.PublicIPAddress`, Standard SKU, one per server (SSH needs it); the static IP on ingress servers |
| NIC | `network.NetworkInterface` |
| Server | `compute.VirtualMachine` |

## Quirks

- **Define the subnet inline** and read its id from the VNet's `subnets`: a separate subnet resource
  fights the VNet over the subnet list.
- **The built-in NSG rules** already allow traffic within the VNet and all outbound, so there is no
  private or egress rule to add. Inbound rules need distinct priorities (`100 + i`).
- Standard public IPs are always static, and closed until an NSG opens them.
- **`customData` must be base64**: `Buffer.from(script).toString('base64')`. SSH: password login
  disabled, the key at `/home/azureuser/.ssh/authorized_keys`.
- OS disk: `StandardSSD_LRS`, deleted with the VM.
- `ignoreChanges: ['osProfile']`: it holds both the custom data and the keys, and is create-only.
  `deleteBeforeReplace: true` on every VM: a NIC belongs to one VM at a time (rule 4).
- Labels are `tags`, a record.

`ServerInfo`: `publicIp` from the public IP resource, `privateIp` from the NIC's first IP
configuration, `staticIp` = the public IP on ingress servers. Mocks: the NIC's first IP
configuration carries a private address, and the VNet's first subnet an `id`.

## For the runbook

- A size change deallocates and restarts the VM when the new size needs other hardware.
- The service principal needs the Contributor role on the subscription.
- New subscriptions often have a vCPU quota of a few cores per family: check
  `az vm list-usage --location <region>` before the first `up`.
