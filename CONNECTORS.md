# Company connections

Neska exposes only installed, authorized connectors. Cloning the repository does not connect an employee account or a company server.

## Configuration and authorization

- Provision a separate installation and approved destination. Store secrets outside source control and model-readable files.
- Enable the adapter in installation configuration and grant its catalog resource to the intended users/groups. Context files are never authorization.
- Gmail and Outlook use per-user OAuth and independently configured application registrations. Callback paths are `/api/connectors/gmail/oauth/callback` and `/api/connectors/outlook/oauth/callback` on the installation's exact public origin.
- Composio requires an installation-owned project, reviewed toolkit/scopes and per-user consent. Its callback is `/api/connectors/composio/<toolkit>/callback` on that same origin. Do not reuse another installation's connected accounts.
- Company mail requires an administrator-approved IMAPS host/domain and encrypted personal credentials; see [COMPANY_MAIL.md](docs/COMPANY_MAIL.md).
- Server documents use optional scoped adapters; see [WINDOWS_DOCUMENT_SYNC.md](docs/WINDOWS_DOCUMENT_SYNC.md). Network access alone does not authorize a resource.

## Acceptance

Verify identity and tenant binding, allowed and denied operations, credential revocation, provider readback, retries and failure recovery. A listed connector, a configuration file or a passing build does not prove a live connection. Keep background effects disabled until their exact actions have durable authorization.
