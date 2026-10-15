# UpCloud

| | |
|---|---|
| Package | `@upcloud/pulumi-upcloud` |
| Credentials | `UPCLOUD_USERNAME` + `UPCLOUD_PASSWORD` of an API-enabled subaccount, or `UPCLOUD_TOKEN` where the provider version supports it |
| `region` | a zone id |
| `size` | a plan name |
| `image` | a public template's title or UUID |
| Private network | when more than one server |
| SSH user | `root` |

## Live catalog

- **Authenticated**: `GET https://api.upcloud.com/1.3/zone`, `/1.3/plan`, `/1.3/price` and
  `/1.3/storage/template`, with `-u "$UPCLOUD_USERNAME:$UPCLOUD_PASSWORD"` (or `upctl zone list`,
  `upctl server plans`, `upctl storage list --template`).
- **Public**: https://upcloud.com/docs/products/cloud-servers/plans/.

## Building blocks

| Concept | Resource |
|---|---|
| SSH key | none: servers take `login: { user: 'root', keys: [sshPublicKey], createPassword: false }` |
| Private network | `Network`: `SUBNET_CIDR`, DHCP on, no default route |
| Firewall | `ServerFirewallRules`, one per server |
| Server | `Server`: a public interface, plus a private one when the network exists |
| Static IP | `FloatingIpAddress`, bound to the server's public interface by MAC address |

## Quirks

- `hostname` is required: the rule-5 name. The template storage's size is the plan's disk size.
- **`metadata: true` is required** for cloud-init templates; without it `userData` never runs.
- **The firewall is stateless**: it tracks no connections, so replies to the server's own outbound
  traffic need inbound rules too. It filters the public interface only. Rules apply in order:
  1. `accept` inbound TCP to each of the group's ports, for IPv4 and again for IPv6;
  2. `accept` inbound TCP and UDP to the ephemeral range `32768`-`60999` (replies to outbound
     traffic, DNS and NTP included), and inbound ICMP;
  3. a final inbound `drop`, and an outbound `accept`.
- **The OS does not answer on a floating IP** until it is configured inside the server: the runbook
  adds it to the public interface (netplan) once the address is known. Until then the server's own
  public IP serves, and it is stable for the server's lifetime.
- `ignoreChanges: ['userData', 'login']` (rule 3). Labels are a `{ [key]: value }` record.

`ServerInfo`: from the server's interfaces, the public one's address is `publicIp` and the private
one's is `privateIp`; `staticIp` comes from the floating IP. Mocks: the server's interfaces carry a
public address with a MAC address, and a private address.

## For the runbook

- A `size` change resizes the server, which stops it first.
- The floating IP needs the in-server configuration step above before DNS points at it.
