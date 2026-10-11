# Runtime and performance budgets

This document is the acceptance ledger for turn lifecycle, streaming and
perceived performance. A green port or `/api/health/ready` response is not an
AI health result. Live validation requires an authenticated turn through Codex
App Server, its streamed events, durable projection and final persisted state.

Statuses are `not started`, `implemented`, `validated locally` and
`validated live`. A row may only advance when the linked evidence measures the
same definition.

## Lifecycle contract

### 6 October 2026 local candidate

CPU profiling of the existing paced-answer fixture showed JSX construction in
`BrainApp`, `ChatWorkspace` and `Sidebar` on every text fragment. The candidate
keeps a per-mounted-workbench, thread/message-scoped display buffer, so only the
active answer subscribes to text changes. Non-delta events and final/abort paths
flush the exact accumulated content to chat state; server projection is still
durable and authoritative. Completed plain paragraphs/headings keep their DOM
nodes; complex Markdown retains its full terminal parse. No-op message updates
do not invalidate the workbench.



## 2026-08-30 P0 latency diagnosis

The causal code path was inside the private per-user worker gateway, not the
public NDJSON response or the browser paint scheduler. One promise chain handled
both App Server stdout persistence and incoming WebSocket control/RPC frames.
A busy stream or slow durable append could therefore hold `thread/start`,
`thread/read` and `turn/interrupt` for every chat using that worker. The public
proxy already disables response buffering and the client already applies the
first delta synchronously, so neither is identified as the causal bottleneck by
the available local and prior runtime evidence.


## Metric definitions and budgets

The R2 worker publishes the sanitized complete lexical prefix of each arrival,
including document turns; the trailing unfinished token stays private until it
can be sanitized or the item completes. Distinct authoritative final items
replace previous answers rather than concatenate. Structured terminal snapshots
stop client reattachment. Projection batches validate envelopes/events first,
then the accumulated message at the atomic-write boundary (64-delta fixture:
66 to 3 complete-message validations). These are operation-count/correctness
results, not provider-speed measurements. The local evidence and caveats are in
the current product runbook.

Remote/model-dependent budgets are comparative: measure AiBrain and ChatGPT
Work on the same Mac, network, account/model and prompt set. AiBrain passes when
its p50 and p95 are no worse than the reference by more than 10% or 250 ms,
whichever allowance is larger. This avoids promising a fixed model time without
a controlled benchmark.


## Reproducible local evidence on the authorized base

### 2026-08-30 client pipeline benchmark

Run `npm run benchmark:chat` from a clean installation. The fixture uses a
controlled 16 ms browser scheduler plus a real CPU timer for the 10,000-delta
dispatch loop. It deliberately excludes network, server queue and model time;
those remain separate server/client telemetry fields and must not be inferred
from these numbers.

| Measurement | `origin/main` `cb5f0e70` before | This change after |
| --- | ---: | ---: |
| First factual feedback field | missing | 16 ms paint proxy |
| Real Chromium submit → factual activity paint | not measured | 20.30 ms in the final post-sync focal run; budget < 1,000 ms |
| Accepted response → factual activity | missing | 16 ms paint proxy; budget pass |
| First delta applied before a frame | no | yes |
| First delta arrival → paint proxy | 32 ms | 16 ms |
| Maximum wait when rAF is unavailable | unbounded | 48 ms |
| 10,000 subsequent deltas | one accumulated frame event | historical adaptive reveal queue plus exact terminal flush (superseded on 2026-09-04 by full next-frame batching) |
| Duplicate/reordered content after reconnect snapshot | regression asserted only by event types | final projection equals snapshot exactly |

The current controlled run records three paint opportunities, a 48 ms p95/max
gap and 96 ms from send intent to the completed terminal paint. The
fixture is deliberately short and deterministic; it validates client cadence
instrumentation and ordering, not provider generation speed.

The companion Chromium gate is:

```text
PLAYWRIGHT_PORT=3117 \
PLAYWRIGHT_INSTALLATION_CONFIG=config/installations/playwright-isolated.example.json \
npx playwright test tests/e2e/conversation.spec.ts \
  --project=chromium-desktop \
  --grep 'submit paints honest activity' \
  --workers=1
```

It holds the synthetic response open, measures the real click-to-visible-status
interval with `performance.now()`, asserts it is below 1,000 ms and attaches the
numeric JSON result. It does not claim anything about provider/model latency.

`npm run benchmark:chat` also completes a controlled visible delta sequence and
reports `paintCount`, inter-paint p50/p95/max and terminal-paint time. This is
the full visible cadence readback used by the authenticated details panel; it
does not substitute first-event timing for streaming speed.

### Runtime admission and transport overhead

Run `npm run benchmark:chat:runtime` to record two local controls: the previous
serial admission topology versus parallel memory/worker admission with web as
a server invariant (while retaining policy-enforcing skill synchronization),
and direct App Server delivery versus API NDJSON
encode/decode. The command reports p50/p95 and explicitly excludes provider,
network, model generation and filesystem persistence. These values quantify
AiBrain-owned overhead only; they are not model first-token latency.

Controlled run on 2026-08-30 (`80` admission and `800` delivery samples):

| Local fixture | p50 | p95 |
| --- | ---: | ---: |
| Serial admission before | 37.214 ms | 42.092 ms |
| Parallel/invariant admission after | 19.582 ms | 22.210 ms |
| Direct App Server event delivery | < 0.001 ms | 0.002 ms |
| API NDJSON encode/decode | 0.005 ms | 0.021 ms |

P0 same-user lane fixture on the final local code (`20` samples, with a
controlled 20 ms output-persistence delay rather than real filesystem I/O):

| Same-user request admission | p50 | p95 |
| --- | ---: | ---: |
| Shared input/output chain before | 21.137 ms | 25.399 ms |
| Independent direction lanes after | 0.003 ms | 0.015 ms |

Historical lifecycle baseline: `d381ccf836516f91464f20225403996e7e8158d1`.

Telemetry P0 candidate base: `f2c48dc9d84c8876bfd0432f4f09f1b648d59da0`.
Before this candidate extension, `codex.turn_metrics` emitted only
`firstTextMs` and `totalMs` when a turn completed; it had no cadence summary,
terminal state or stream lifecycle record. The private fields described below
are the server-side replacement, not a visible TTFT measurement.

Focused lifecycle slice:

```text
vitest run
  tests/integration/multi-user-worker-acceptance.integration.test.ts
  tests/integration/worker-crash-recovery.integration.test.ts
  src/runtime/transport/app-server-rpc-router.test.ts
  src/runtime/transport/websocket-app-server-transport.test.ts
  src/workbench/turn-projection-store.test.ts
  src/usage/file-usage-store.test.ts
  src/runtime/worker-codex-turn.test.ts

7 files passed, 32 tests passed, 16.39 s
```

Disconnect regression:

```text
vitest run src/app/api/chat/route.test.ts
1 file passed, 1 test passed
```

Telemetry focal regression on the candidate extension:

```text
npx vitest run
  src/runtime/turn-telemetry.test.ts
  src/runtime/worker-codex-turn.test.ts
  src/app/api/chat/route.test.ts

3 files passed, 6 tests passed, 1.43 s
```

### Three-second idle causal check

Candidate `689c610b5b70478d9104eb09bbb643bc0b4360e3` was checked with a
controlled clock in `src/runtime/transport/websocket-app-server-transport.test.ts`.
The measured internal timeline is: `t=0` private gateway WebSocket opens,
resumes and is ready; at `t=3000 ms` it has sent no heartbeat (the configured
default is 15 s), has no close code/reason, stays `connected` and has made zero
reconnect attempts. The private worker gateway is loopback
`ws://127.0.0.1:<ephemeral>/app-server` in
`src/runtime/workers/local-gateway-runtime.ts`; it cannot be the public NDJSON
EOF path.

The public browser path is POST NDJSON, not WebSocket. Its incomplete-EOF
recovery belongs to `src/ui/app-server-ui-adapter.ts`: `reader.read()` ending
without `done`, `stopped` or `error` currently returns normally instead of
reattaching the same turn snapshot. Do not reduce the internal 15 s heartbeat
without evidence of an internal loopback close. The runtime transport already
reconnects with exponential backoff+jitter and resumes its durable event cursor;
the UI recovery must reattach to the existing thread/assistant-message IDs
without resubmitting input.

The post-change TypeScript check, targeted ESLint check and contract verification
passed. A combined post-change lifecycle run completed 36 assertions in eight
files, while the two timing-heavy integration files hit their fixed 25 s and
20 s ceilings. Individual reruns hit the same ceilings while other AiBrain
worktrees were compiling and running Vitest concurrently. These reruns are
recorded as inconclusive environmental evidence, not as passes; repeat them on
a quiet runner before integration. The green baseline above was collected
before this route-only change from the same authorized commit.


## Private runtime telemetry readback

The existing server-only operational logger emits bounded JSON records per
correlation, never a public route or client payload. `chat.request_phase`
measures the status-sensitive work that must complete before the NDJSON stream
is returned. `codex.turn_phase` then separates memory, worker startup, catalog,
skills, thread resume/start and `turn/start`. `codex.turn_lifecycle`
records `resumed`, `reconnected`, `disconnected`, `cancel_requested` and
`timeout_requested` with
opaque installation/user/project/thread/turn/request IDs and request elapsed
time. `codex.turn_metrics` records terminal `completed`, `error` or `stopped`,
server first-delta time, delta count, inter-delta p50/p95/max, server total and
lifecycle counts. It deliberately excludes prompt/message/content fields,
model output, token data, error text, file paths and credentials.

`codex.turn_model` closes the branded experience-selector chain by recording
the server-resolved requested model and the effective model returned by
`thread/start` or `thread/resume`, plus effort and whether the value came from
the runtime response, explicit request or runtime default. A later
`model/rerouted` notification emits `codex.turn_model_rerouted` with the new
effective model. These records contain model identifiers but still exclude
prompts, output, tokens, paths, credentials and provider secrets.

`codex.app_server_request` records the RPC method and opaque request ID,
transport-acceptance time, total time, active-turn count, pending-request count
and a bounded outcome (`completed`, `timeout`, connection/send failure or
router closure). `codex.worker_recovery` records the one allowed startup or
initialization recovery and final unavailability. `codex.tool_phase` separates
tool queue and execution time using only a bounded namespace/tool label. These
records make “Conectando con el servicio”, service-unavailable and
`thread/read` timeout incidents correlatable without prompts, outputs, paths,
tokens, error text or credentials.

The runtime invariant remains `web_search: "live"` for every thread and every
turn. Web availability is not discovered or disabled on the chat admission hot
path; server policy and egress enforcement remain authoritative.

Operators read these records only from the existing authenticated operational
log sink or an approved server-side acceptance artifact. A visible TTFT or
paint cadence must continue to come from the client benchmark, not these server
records.

## Capacity gate for three to four employees

The Compose defaults are a verified configuration limit, not a measurement of
the Hetzner host: `app` is capped at **2 CPU / 4 GiB**
(`infra/hetzner/compose.yaml`). It is therefore insufficient evidence for a
three-to-four-employee claim, particularly when workers, browser tasks or
document conversion overlap.

`npm run test:soak -- --concurrency 4 --cycles 20 --restart-every 5` is the
safe local equivalent: it runs four isolated worker transports, durable replay
and restart/recovery without a customer prompt, provider action or deployment.
The JSON report captures request latency plus process CPU (`userMicros`,
`systemMicros`), process filesystem I/O counters (`fsRead`, `fsWrite`), memory,
journal growth and leaked resources. It does **not** simulate model inference,
real browsers or live Hetzner contention, so it cannot be called production
capacity proof by itself.

| Tier | Host / app limit | Operating envelope | Required evidence before using it |
| --- | --- | --- | --- |
| Current configured default | app: 2 CPU / 4 GiB | Single-user canary or one active worker; not a 3–4 employee commitment | Read back the real host and container limits; no resizing is implied here. |
| Minimum provisional | host: 4 vCPU / 8 GiB; app: 3 CPU / 6 GiB | 3 employees, text-first turns, one browser/conversion burst at a time | Four-worker soak plus a matched live turn sample with p95 CPU below 70% and memory below 75% of the app cap. |
| Recommended | host: 8 vCPU / 16 GiB SSD; app: 6 CPU / 12 GiB | 3–4 employees with overlapping text turns and controlled browser/document work | Same evidence for a sustained window, no queue/backpressure growth and at least 30% CPU/RAM headroom. |

The host readback is strictly diagnostic and must be captured before any
resize: resolve the installation-specific Compose environment, then collect
`docker compose ... config`, `docker stats --no-stream` for `app`, `free -h`,
`df -h`, `iostat -xz 1 3` (when available), and the last 200 `app` log lines.
The operational log slice must include `chat.request_phase`,
`codex.app_server_request`, `codex.worker_recovery`, `codex.tool_phase`,
`codex.turn_phase`, `codex.turn_lifecycle`, and `codex.turn_metrics`; correlate
only opaque IDs and numeric timings. Record the immutable revision, limits,
sample period and raw counters with the report. Never treat a healthy endpoint,
an empty log, or this local fixture as host-capacity acceptance.

## Client paint telemetry readback

Baseline: candidate `fcb30b15a28f037d70a0eec4141b914e67e7182b` has no
client-side send-to-rAF timing, client paint cadence, terminal paint or
reconnect-to-snapshot measurement. Runtime's private telemetry cannot observe
those client scheduling points.

`src/ui/client-turn-performance.ts` holds at most 24 schema-2 per-turn readbacks in the
authenticated client's memory. A readback has only numeric durations/counts and
a terminal enum: no prompt, response text, tokens, identifiers, filenames,
error detail or secret. It is not exposed as a per-message control; the focal
browser test attaches its numeric benchmark JSON only to that local test run.
This change adds no API route, analytics POST, shared storage or server logger.


## Warm-path implementation

Opening a project verifies the private worker account and starts a non-blocking,
project-scoped catalog preload. Catalog data is fresh for five minutes; for the
next 25 minutes a turn uses the last verified value immediately while a single
deduplicated refresh runs in the background. A cold or older-than-30-minute
catalog still fails closed by awaiting a verified refresh.

Filesystem workbench state is cached only after strict schema validation and is
invalidated by inode, mtime or size changes. Cached entries are cloned before
use, limited to 16 MiB each and 128 MiB process-wide. The durable file lock,
atomic write, tenant/user binding and projection overlay remain authoritative.
Unchanged shared-access fingerprints no longer rewrite the access index or add
a redundant audit entry; actual membership, role or project changes still
invalidate the fingerprint and update the index synchronously.
