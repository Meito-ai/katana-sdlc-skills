---
"katana-sdlc-skills": minor
---

Publish `paas-pulumi-infra-setup`, the first `paas-*` skill (user-invoked).

It interviews the user and scaffolds the infrastructure layer of a home-grown PaaS as a Pulumi
TypeScript program: server groups (count and size per stack), a private network, firewalls and static
IPs on one of ten providers (AWS, Azure, Google Cloud, Alibaba Cloud, DigitalOcean, Hetzner, Linode /
Akamai, OVHcloud, UpCloud, Hostinger through Pulumi's Terraform bridge), as a dedicated workspace
package or a folder. It writes the stacks, unit tests, an optional GitHub Actions workflow (PR preview
gate, deploy on merge, manual production) and a runbook, wires the optional Pulumi MCP server and extra
Pulumi skills with apm, and never deploys or commits. A dependency-free `detect.mjs` reads the repo's
shape. It depends on `pulumi-overview`, `pulumi-best-practices` and `pulumi-component` from
`pulumi/agent-skills` >= v2.0.0, declared in the skill's own `apm.yml`.

A skill that invokes upstream skills now declares them in its own `apm.yml`: a subpath install reads
that file, not the root one. `scripts/sync-apm-version.js` keeps these per-skill manifests at the
package version.
