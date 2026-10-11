# Container security review — 2026-10-11

The first CAX21 deployment remains blocked by the image vulnerability gate.
Functional Backend CI success does not establish image security or authorize
an older published image. No scan suppression, severity downgrade or
`--ignore-unfixed` option is introduced by this change.

## Reproduction and remediation

Trivy 0.75.0 scanned the native ARM application image built from the recovery
fix at `d19319a6ea5e11926a701a28492d9d3f596c69b9`. It reported 98 CRITICAL
package findings. These are not 98 distinct vulnerabilities: Chromium findings
repeat for the browser, common files and sandbox packages. Scanner severity also
differs from several upstream vendor assessments.

Updating only the signed Debian snapshot from 2026-08-20 to 2026-10-11 reduced
the experimental image to 14 findings. Chromium became 154.0.8037.92 and the
affected Perl packages were fixed. This experimental image is not a release.

The reviewed build changes are:

- Node 24.21.0, pinned by multi-architecture digest; the same Node version in CI.
- A shared Debian base upgraded from the immutable 2026-10-11 snapshot before
  either runtime target. The gateway no longer carries unused npm/npx.
- tsx 4.23.15 replaces the runtime version that carried an affected Go/esbuild
  binary. The application dependency lockfile is unchanged.
- rclone 1.75.2 from its official GitHub release, with separate SHA-256 digests
  for ARM64 and AMD64 verified before extraction. Debian's older rclone is not
  installed. Installation rejects unrecognized architectures or hash mismatches.
- Pillow 12.3.0 from pinned, hash-checked CPython 3.11 Linux wheels. The affected
  Debian Pillow package is not installed. `/usr/bin/python3` loads the fixed
  wheel from its standard local site directory; the build asserts the version.

The existing document, worker sandbox, backup and browser behavior must pass
native tests before publication. Build the exact final revision, scan both
immutable published digests again and preserve reports/SBOMs before promotion.

## Remaining findings to resolve before deployment

The snapshot-only scan still reports the following. Upstream severity is
context for assessment, not an automatic waiver of the deployment gate.

| Finding | Vendor evidence and current disposition |
| --- | --- |
| CVE-2026-106237, Chromium | [Debian](https://security-tracker.debian.org/tracker/CVE-2026-106237) describes a permissions/site-isolation leak and records Chromium's Low severity. Debian 154 is affected; no fixed Debian package is listed. Remains blocking. |
| CVE-2026-58016, GLib | [Debian](https://security-tracker.debian.org/tracker/CVE-2026-58016) records a malformed D-Bus introspection XML denial of service; Bookworm fix deferred. Remains blocking. |
| CVE-2025-7458, SQLite | [Debian](https://security-tracker.debian.org/tracker/CVE-2025-7458) describes an overflow requiring attacker-controlled SQL. Bookworm remains affected. Remains blocking. |
| CVE-2026-6653, libxml2 | [Debian](https://security-tracker.debian.org/tracker/CVE-2026-6653) records a parsing use-after-free/denial of service and defers the Bookworm fix. Remains blocking. |
| CVE-2026-106195, Chromium | [Debian's description](https://security-tracker.debian.org/tracker/CVE-2026-106195) is specific to Chromoting on macOS. The deployed target is Linux. Record a package-specific non-applicability assessment before any exception; no exception currently exists. |
| CVE-2023-45853, zlib1g | [Debian](https://security-tracker.debian.org/tracker/CVE-2023-45853) says Bookworm's zlib source does not build the affected minizip binaries. A zlib1g-specific assessment must not suppress the separate minizip package. No exception currently exists. |

The rclone RC endpoint issues [CVE-2026-41176](https://security-tracker.debian.org/tracker/CVE-2026-41176)
and [CVE-2026-41179](https://security-tracker.debian.org/tracker/CVE-2026-41179)
are addressed by replacing the binary, even though Neska does not start an RC
listener. [Pillow's affected image decoder](https://security-tracker.debian.org/tracker/CVE-2026-54058)
is addressed by the upstream fixed wheel. Verify their absence in the new scan.

Any future exception requires a narrow package/version scope, evidence,
expiry, review and retained raw findings. Do not silently equate vendor Low
severity or sandboxing with "not affected". Do not promote while the unchanged
critical gate rejects the candidate.

## Official LTS replacement under validation

Debian 13 fixes GLib and SQLite but still reverts libxml2 to affected 2.9.14.
The candidate therefore uses the signed Ubuntu 24.04 LTS archive at snapshot
`20261011T000000Z`, with a pinned multi-architecture Ubuntu image. This supplies
vendor-maintained fixes for [libxml2](https://ubuntu.com/security/CVE-2026-6653)
and [GLib](https://ubuntu.com/security/CVE-2026-58016); its
[SQLite version is not affected](https://ubuntu.com/security/CVE-2025-7458).
No Debian packages or custom XML patches are transplanted into Ubuntu.

The exact official Node 24.21.0 binary and npm are copied from the separately
pinned Node image. Ubuntu provides its compatible system libraries. Gateway
and runtime still remove npm/npx; the worker version and isolation are unchanged.
Pillow uses pinned CPython 3.12 wheels for the new LTS Python runtime.

The browser is the official Google Chrome **stable** 155.0.8059.39-1, available
for both ARM64 and AMD64. Google's dated stable package metadata supplies the
pinned per-architecture SHA-256 hashes. Installation verifies the complete
package before invoking APT; dependencies stay on the signed Ubuntu snapshot.
The moving repository added by Google's installer is removed. The existing
`/usr/bin/chromium` protocol path aliases the Chrome launcher, preserving the
mandatory non-root, read-only, per-user bubblewrap/CDP/proxy boundary. This is
a browser engine security update; product UI is untouched. Version readback
accepts either vendor prefix and still requires the exact numeric version.

Re-run native document conversion, passive XLS, packaged App Server and browser
isolation, encrypted backup/restore, and the raw image scan on both architectures.
No suppression or risk exception is enabled. Do not promote until these gates
and the exact main CI/publication gates pass.
