# Optional Windows document adapter

The reusable scripts under `infra/hetzner/rdp-*.py` support operator-governed document access/import. They are not a configured connection and no customer systemd units are bundled.

An operator provisions a private connection manifest, read-only access policy, endpoint credentials, installation ID, connection ID, data roots and explicit publication audiences. The example `rdp-sync.example.json` uses fictional identifiers and publishes nothing by default. Do not copy another installation's manifest or credentials.

The Unix sync broker requires all bindings from the operator:

```sh
python3 infra/hetzner/rdp-sync-broker.py --manifest /private/sync.json --installation-id example-company --connection-id documents --service-unit neska-document-sync.service
```

The systemd unit must be independently provisioned to execute that manifest only. The broker verifies the installation and connection binding, allows only a service-unit name and never accepts a command/unit from a client request. Socket peer identity, authorized roots and per-request scope checks remain mandatory. Source access stays read-only; import status must distinguish a verified current snapshot from an older copy after a failure.

Before enabling: verify source read-only ACLs, destination ownership, peer credentials, cross-user denial, extraction limits, provenance, interrupted transfer recovery and secret isolation in the real Linux environment. Test with synthetic files first. No live Windows acceptance is claimed by this repository.
