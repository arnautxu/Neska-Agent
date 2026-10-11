# Neska Agent

A reusable company brain on its own server, with isolated users, durable work and explicitly authorized connections to customer systems.

## Product boundary

The core provides identity, permissions, conversations, projects, documents, memory, governed connectors, automations and recovery. Customer facts, branding, credentials, source servers and business procedures belong to installation configuration or optional adapters. No real customer installation is bundled.

Read [the base architecture](docs/NESKA_BASE_ARCHITECTURE.md), [operating status](docs/OPERATING_TRUTH.md) and [repository rules](AGENTS.md).

## Local development

```sh
npm ci
npm run dev
```

Development uses `config/installations/neska-agent.development.json` unless `AIBRAIN_INSTALLATION_CONFIG` is already set (Playwright sets its synthetic installation), loopback port 3102 and isolated temporary data paths. Provision synthetic data as described in the user provisioning runbook. Real model and identity credentials must be configured independently; demo operation is not production acceptance.

```sh
npm run typecheck
npm run lint
npm test
npm run infra:validate
npm run build
```

## Installation and release

`config/installations/example-company.example.json` is a fictional example, not an enabled company connection. Each production installation needs explicit domains, secrets, durable volumes, backups and connection grants. See [installation configuration](docs/INSTALLATION_CONFIGURATION.md) and [connectors](CONNECTORS.md).

The legacy customer deployment workflow has been removed. Publication remains disabled until the Neska release pipeline is configured and validated. Backend CI, image publication, deployment and authenticated live acceptance are separate gates. No production service is provisioned by cloning this repository.
