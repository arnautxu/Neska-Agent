# Releases and recovery

Use [RELEASE_AND_ACCEPTANCE_RUNBOOK.md](RELEASE_AND_ACCEPTANCE_RUNBOOK.md) for the current release boundary. The generic release manager and backup orchestrator remain available; no customer deployment procedure is bundled.

Each installation owns its deployment state, configuration, networks, durable volumes and immutable current/previous image digests. A failed promotion must recover the prior configuration and service before reporting rollback success. Health alone does not prove authenticated behavior or restored data.

Keep release serialization, maintenance/admission fences, backup verification, bounded cleanup and exact-identity readbacks. Never reuse evidence from a different SHA, installation or customer. Establish a new deployment path and rehearse rollback and restore on isolated data before production onboarding.

La publicació exigeix les variables del repositori `NESKA_APP_IMAGE_REPOSITORY` i `NESKA_EGRESS_IMAGE_REPOSITORY`, amb destinacions GHCR diferents i dedicades a Neska. No hi ha repositoris d’imatge heretats per defecte. El workflow continua desactivat fins a revisar el circuit de release.
