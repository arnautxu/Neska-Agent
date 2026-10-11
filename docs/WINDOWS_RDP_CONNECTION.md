# Optional RDP connection boundary

Neska can use a separately provisioned host-side adapter for authorized document reads. The model and employee browser do not receive a remote desktop session or its credentials.

Use a dedicated read-only identity, explicit endpoint and filesystem allowlist, pinned host identity and a private operator manifest. Remote modifications, arbitrary commands and broad drive export are not granted by a document connection. Network reachability does not prove access control or successful synchronization.

See [WINDOWS_DOCUMENT_SYNC.md](WINDOWS_DOCUMENT_SYNC.md) for broker binding and acceptance. Each new company must configure and validate its own connection. No customer endpoint, service unit or credential is included.
