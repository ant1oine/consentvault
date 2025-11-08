# ConsentVault

ConsentVault is a trust and compliance layer for organizations that need to prove how customer consent, preferences, and data-rights requests are captured, honored, and audited. It packages years of regulatory know‑how into a ready-to-run service so teams can launch products without inventing their own consent back office.

## What It Does
- Centralizes consent, withdrawal, and data-rights workflows with tamper-evident audit trails.
- Exposes a real-time API plus a modern admin dashboard for compliance, CX, and product teams.
- Emits deterministic webhooks so downstream systems stay in sync with the consent ledger.
- Provides opinionated rate limiting, key management, and encryption defaults out of the box.

## Why It Exists
Organizations expanding into regulated regions (GCC, PDPL, GDPR, etc.) need provable consent operations but rarely have the time or expertise to build them. ConsentVault shortens that journey by offering:

- **Built-in evidence** – every action is logged with cryptographic hashes for auditors.
- **Faster launches** – teams integrate a single API instead of stitching together scripts, spreadsheets, and ad-hoc dashboards.
- **Operational clarity** – reset, test, and monitoring workflows are standardized so on-call engineers are never guessing.
- **Future coverage** – the architecture leaves room for new channels, regions, and privacy obligations without rewrites.

## How It’s Delivered
ConsentVault ships as a self-hosted stack with two visible surfaces:

1. **Consent API (FastAPI + PostgreSQL + Redis):** handles core business logic, rate limiting, background jobs, and security controls.
2. **Admin Dashboard (Next.js 15):** gives humans search, reporting, and key-management tools. It talks to the API through the same public endpoints customers use.

Both services run locally with Docker Compose and promote cleanly to staging or production using the same manifests. Automation scripts (Makefile targets) keep the developer experience one command away.

## Value for Stakeholders
- **Founders & product leaders:** launch in privacy-sensitive markets without pausing roadmaps.
- **Compliance & legal:** receive consistent, exportable evidence for audits and regulatory responses.
- **Engineering & DevOps:** get a documented, reproducible runtime with batteries included (reset scripts, health checks, CI-friendly tests).
- **Customer success:** use the dashboard to answer “what did we promise this user?” within seconds.

## Learn More
The business overview ends here. Technical collaborators can dive into the `docs/` directory for everything else:

- [Architecture](docs/architecture.md) – components, data flow, and deployment diagram.
- [Running ConsentVault](docs/running.md) – environment setup for local, staging, and production.
- [Makefile Guide](docs/makefile.md) – how automation targets map to day-to-day tasks.
- [Organization & Access Management](docs/organizations.md) – creating orgs, API keys, and admins.
- [Runbook](docs/runbook.md) – operational procedures for on-call engineers.

Questions or partnerships? Reach out to the ConsentVault team and we’ll walk you through the roadmap.
