# Neska Agent

Independent product base copied from AiBrain commit
`3e3e9c6e7b735115f4ad6d03572baea9590ba441` on 2026-10-09.
The new Git repository starts with a clean history.

## Local development

Use Node 24 and npm. Install dependencies with `npm ci`, then create a new local
session secret (never reuse an AiBrain environment file):

```bash
node -e 'require("node:fs").writeFileSync(".env.development.local", "AIBRAIN_AUTH_MODE=demo\nAIBRAIN_SESSION_SECRET=" + require("node:crypto").randomBytes(32).toString("hex") + "\n", { flag: "wx", mode: 0o600 })'
npm run dev
```

Open http://localhost:3102. The development command selects
`config/installations/neska-agent.development.json` unless
`AIBRAIN_INSTALLATION_CONFIG` is already set (Playwright sets it to its
synthetic `playwright.example.json`); its files live under
`/tmp/neska-agent-dev`, separate from AiBrain. This temporary root is suitable
for local tests, not durable production data. The visual assets are inherited
placeholders until Neska receives its own design.

Demo login is available locally. Real AI turns require newly configured runtime
authentication; no existing Codex credentials, sessions or browser profiles have
been copied. Production requires its own Supabase Auth project, secrets, durable
storage and release configuration.

## Release boundary

The inherited GHCR publication and Arnall deployment jobs are explicitly disabled
with `false &&` job conditions. Do not enable them: build a Neska-specific release
path first. Existing Arnall examples and operational documents are upstream
references, not the configuration or release history of Neska Agent.

See [bootstrap provenance and status](docs/NESKA_AGENT_BOOTSTRAP.md).

---

# Upstream AiBrain reference

AiBrain is a white-label Company Brain built on Codex App Server. One codebase
serves independent company installations; identity, branding, paths, secrets,
networks, volumes and release tags come from configuration rather than tenant
forks or customer hardcodes.

## Implemented architecture

- Supabase is used only to authenticate login, initial-password change and
  recovery. AiBrain exchanges that identity for an opaque, revocable local
  session cookie; all product data remains local.
- Projects, threads, turns, approvals, documents, publication records, memory,
  audit and runtime state use validated, versioned filesystem stores with
  atomic writes, locks, journals and recovery.
- Every employee receives an independent `CODEX_HOME`, workspace, staging,
  artifacts, browser profile, downloads, credentials and audit roots.
- A persistent per-employee worker talks to the server through an authenticated
  loopback WebSocket transport with replay, ACK, dedupe, idempotency,
  heartbeat, backoff and restart recovery. The browser never connects to App
  Server.
- `PERMISSIONS.md` is resolved read-only on the server for each turn and its
  version/fingerprint is written to durable audit before execution.
- Office, PDF, text and image uploads stream to private staging, are validated
  before isolated preview conversion, and can reach the official document root
  only through the server-side freeze/review/confirm publisher.
- Completed answers can become limited, data-backed visualizations or sanitized
  internal sites. Their versions are immutable, private to the employee and
  exportable as HTML/ZIP; “publish” means authenticated internal access, not
  public hosting.
- Each employee has one persistent Chromium runtime. Threads receive separate
  page targets and download roots. CDP uses inherited process pipes only—no TCP
  listener or discovery file—and the viewer requires short, session- and
  thread-bound tokens plus explicit takeover for human input.
- The production container is non-root/read-only, does not mount `docker.sock`,
  masks other employees and `publish-rw` from worker sandboxes, and uses unique
  networks, volumes, ports and host paths per installation.

## Local development

Requirements: Node 24 and npm. The committed development installation is
synthetic and writes only below `/tmp/aibrain-example-lab`.

```bash
npm ci
export AIBRAIN_INSTALLATION_CONFIG="$PWD/config/installations/development.example.json"
export AIBRAIN_SESSION_SECRET="$(openssl rand -hex 32)"
npm run dev
```

Demo login is development-only. Production requires `AIBRAIN_AUTH_MODE=supabase`,
the Supabase URL/publishable key, independent session/challenge/publication/
browser secrets, an absolute `AIBRAIN_INSTALLATION_CONFIG`, and an exact
`AIBRAIN_CHROME_EXPECTED_VERSION`. No Supabase service-role key or product
database is used.

Provision employees using the same UUID issued by Supabase Auth:

```bash
npm run users:provision -- --input /absolute/path/to/users.json
```

El lifecycle posterior es host-local, idempotente y auditable: `POST /api/operations/users` para baja/reactivación/recuperación con la app activa, o `npm run users:manage -- --offline ...` únicamente con la app detenida. Consulta `docs/USER_PROVISIONING.md`.

The command is idempotent and accepts any number of employees; capacity is
controlled operationally rather than through commercial quotas.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:e2e
npm run build
npm run infra:validate
```

The real document and Chromium matrices are opt-in because they require the
host toolchain:

```bash
npm run test:documents:real
AIBRAIN_CHROME_EXECUTABLE=/absolute/path/to/pinned/chrome \
AIBRAIN_CHROME_EXPECTED_VERSION=152.0.7977.64 \
npm run test:browser:real
```

## Contracts and operations

- [UI/backend contract](docs/UI_BACKEND_CONTRACT.md)
- [Backend progress and reproducible evidence](docs/AIBRAIN_BACKEND_PROGRESS.md)
- [Installation configuration](docs/INSTALLATION_CONFIGURATION.md)
- [Permissions provider](docs/PERMISSIONS_PROVIDER.md)
- [Browser/Computer Use runtime](docs/BROWSER_COMPUTER_USE_RUNTIME.md)
- [Document publisher](docs/DOCUMENT_PUBLISHER.md)
- [Document storage and temporary recovery](docs/DOCUMENT_MAINTENANCE.md)
- [Visualizations and internal sites](docs/ADVANCED_ARTIFACTS.md)
- [Backup and restore](docs/BACKUP_RESTORE.md)
- [Dedicated-server operation](docs/PRODUCTION.md)
- [Isolated Hetzner QA runbook](docs/HETZNER_MIGRATION.md)
- [Hetzner to Windows RDP connection](docs/WINDOWS_RDP_CONNECTION.md)

The repository does not authorize DNS changes, production cutover, real client
data, real NAS writes, destructive Supabase actions, subscription purchases or
shared personal Codex accounts.
