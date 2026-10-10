# Neska bootstrap and provenance

Created 2026-10-09 as an independent private repository from reusable AiBrain source revision `3e3e9c6e7b735115f4ad6d03572baea9590ba441`.

The initial Neska baseline was `7be2399c36e3148f275c6a6d3ece19955b9320f6`. Development uses its own installation ID `neska-agent-dev`, loopback port 3102 and `/tmp/neska-agent-dev` roots. No ignored environment file, customer runtime directory, browser session, backup, identity project or model credentials were imported as part of bootstrap.

On 2026-10-10 the product direction was clarified: a neutral brain with its own server and per-company connections. The current cleanup removes customer-only code, assets, context, deployment configuration and historical operational reports from the current source tree. Tests use fictional companies and generic seed templates.

Read [current architecture](NESKA_BASE_ARCHITECTURE.md) and [operating status](OPERATING_TRUTH.md). Historical Git commits remain recoverable; the cleanup does not rewrite Git history or modify another repository or live system.
