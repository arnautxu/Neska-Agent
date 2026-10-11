# AiBrain fleet releases


## Unit of release

Every accepted source revision produces two immutable image digests: the app
image and the ingress/egress gateway image. A fleet release records:

- source commit and contract version;
- exact image digests;
- required file-store schema versions;
- minimum `InstallationConfig` version;
- health, migration and rollback commands.

Never deploy a mutable tag, run `git pull` on a customer server or copy one
customer's volumes, browser profiles, Supabase project or secrets to another.

## Per-customer boundary

Each customer gets:

- a dedicated Hetzner server and Compose project;
- a unique `installationId`, domain, TLS certificate and branding config;
- a dedicated Supabase project used only for Auth;
- separate filesystem volumes for users, workers, workspaces, staging,
  browsers, documents, journals, approvals, memory, usage and audit;
- root-owned runtime secret files and connector credentials;
- its own backup repository, alert routing and release state.

The same image digest must boot two installations with different configs and
branding. No customer name, domain, path or Supabase identifier may be compiled
into the image.

## Promotion policy



## Compatibility rule

File-store migrations are forward-only, versioned, atomic and restartable.
Every release declares whether the previous app version can read the migrated
state. If it cannot, the release requires a verified backup and a separate data
restore procedure before promotion. UI/backend contracts remain versioned so
the same backend release cannot silently break a customer-specific frontend.

## New installation acceptance

Use `npm run installation:new` to generate configuration, then provision users
from an operator-owned input file. Before DNS or real data, validate:

- config and filesystem boundaries;
- twenty synthetic users and isolated workers;
- a dedicated Supabase Auth project;
- Codex authentication chosen for that installation;
- browser, Office/PDF, publishing and backup/restore;
- immutable release promotion and rollback.
