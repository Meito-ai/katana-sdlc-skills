# Microsoft Azure

| | |
|---|---|
| Package | `@pulumi/azure-native` (import per module: `import * as compute from '@pulumi/azure-native/compute'`, `.../network`, `.../resources`) |
| Credentials | a service principal: `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID`. OIDC (`azure/login` with federated credentials) is the recommended CI upgrade, noted in the runbook |
| `region` | a location: `westeurope`, `northeurope`, `germanywestcentral`, `swedencentral`, `eastus`, `eastus2`, `westus2` |
| `image` | an image URN `Canonical:ubuntu-24_04-lts:server:latest` (publisher:offer:sku:version) |
| Private network | always: a virtual network is the scaffolding a VM needs |
| SSH user | `azureuser` |

Use `azure-native`, not the classic `@pulumi/azure`.

## Sizes (checked 2026-10-13)

| Tier | Size | Spec |
|---|---|---|
| S | `Standard_B2ls_v2` | 2 burstable vCPU / 4 GB |
| M | `Standard_F4als_v6` | 4 vCPU / 8 GB |
| L | `Standard_F8als_v6` | 8 vCPU / 16 GB |

New subscriptions often have a vCPU quota of a few cores per family: check
`az vm list-usage --location <region>` before the first `up`.

## Resources

All resources take `resourceGroupName: group.name` and `location: region`.

- **Network**: `resources.ResourceGroup` (one per stack: deleting it removes everything), and
  `network.VirtualNetwork` `{ addressSpace: { addressPrefixes: [PRIVATE_CIDR] }, subnets: [{ name:
  'servers', addressPrefix: SUBNET_CIDR }] }`. Define the subnet **inline** and read its id from
  `vnet.subnets`; a separate `network.Subnet` fights the VNet over the subnet list.
- **Firewall**: one `network.NetworkSecurityGroup` per rule set, `securityRules` of `{ name, priority:
  100 + i, direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourcePortRange: '*',
  destinationPortRange: port, sourceAddressPrefix: '*', destinationAddressPrefix: '*' }`. The
  built-in default rules already allow traffic within the VNet and all outbound, so there is no
  private or egress rule to add. Attach it to the NIC.
- **Public IPs**: every server needs one for SSH. `network.PublicIPAddress` `{ sku: { name:
  'Standard' }, publicIPAllocationMethod: 'Static' }` (Standard IPs are always static and closed until
  an NSG opens them). On ingress servers it is the static IP.
- **NIC**: `network.NetworkInterface` `{ ipConfigurations: [{ name: 'primary', subnet: { id },
  publicIPAddress: { id: publicIp.id }, privateIPAllocationMethod: 'Dynamic' }],
  networkSecurityGroup: { id: group.id } }`.
- **Server**: `compute.VirtualMachine` `{ hardwareProfile: { vmSize: size }, networkProfile: {
  networkInterfaces: [{ id: nic.id, primary: true }] }, osProfile: { computerName: <rule-5 name>,
  adminUsername: 'azureuser', customData: <base64 bootstrap>, linuxConfiguration: {
  disablePasswordAuthentication: true, ssh: { publicKeys: [{ path:
  '/home/azureuser/.ssh/authorized_keys', keyData: sshPublicKey }] } } }, storageProfile: {
  imageReference: { publisher, offer, sku, version }, osDisk: { createOption: 'FromImage',
  managedDisk: { storageAccountType: 'StandardSSD_LRS' }, deleteOption: 'Delete' } }, tags }`.
  - `customData` must be **base64**: `Buffer.from(script).toString('base64')`.
  - Options: `ignoreChanges: ['osProfile']` (it holds both the custom data and the keys, and is
    create-only), and `deleteBeforeReplace: true`: a NIC belongs to one VM at a time (rule 4).
- **Labels**: `tags`, a record.

`ServerInfo`: `publicIp` = `publicIp.ipAddress`, `privateIp` =
`nic.ipConfigurations[0].privateIPAddress`, `staticIp` = `publicIp.ipAddress` on ingress servers.

## Mocks

Mock state: `ipAddress: '203.0.113.10'`; for a NIC, `ipConfigurations` with `privateIPAddress:
'10.0.1.4'` added to the first entry; for the VNet, `subnets` with an `id` added to the first entry.
`privateNetworkId` is always set.

## Behaviour to put in the runbook

- A `vmSize` change deallocates and restarts the VM when the new size needs other hardware.
- The service principal needs the Contributor role on the subscription (or on a pre-made resource
  group, if the program is changed to use one).
