# Secure Input

Implemented locally on 2026-10-12. This note describes the code contract, not a
published or deployed release.

## Employee flow

When a page needs a password, SMS code, authenticator code or PIN, the agent
calls `aibrain_browser.secure_input` with a preset only. It receives request
metadata and stops browser work. The employee sees a private card in the chat
with the exact destination origin. The padlock in the browser toolbar can also
start this flow directly, including during an existing human takeover.

The card posts to `/api/runtime/browser/secure-input`, independently of the
composer, messages, chat events, model tools, attachments and browser storage.
Login accepts a username/email plus password. OTP supports one field or six
single-character fields; PIN supports one field or four fields. Ambiguous,
framed or incompatible forms enter employee-only mode without guessing targets.
Payment-card entry remains a design preview and is not an agent preset.

A successful fill confirms the fields, not successful authentication. The
employee completes submission/MFA on the live browser screen. `Torna el control
a Neska` closes every page of that employee's private browser, retaining the
Chrome profile/cookies, and releases any human takeover. The next agent action
opens a fresh page; it cannot restore the document or URL that held credentials.
The employee can then ask the agent to continue. Cookies remain subject to the
website's own lifetime; session-only cookies may disappear on process restart.

## Server and privacy boundaries

- Same-origin mutation, authenticated local session, enabled user, installation,
  writable thread and current server-resolved browser execution permissions are
  checked before dispatch. The body cannot supply a user or installation ID.
- Requests belong to that employee's runtime and thread and expire after five
  minutes. The POST additionally binds the current browser session. Values are
  bounded and must exactly match the preset's keys. There is no value argument
  in the model-facing tool schema.
- Discovery is static server-owned code over visible top-frame inputs. Fill binds
  actual backend nodes, original page/document generation, exact URL, input type,
  visibility and a same-origin form action. All nodes are checked before the
  first write. Values travel only over the inherited private CDP pipe using
  `Runtime.callFunctionOn`; its result is a boolean. Page changes, errors or
  partial writes consume the request and never trigger automatic replay.
- From request creation until explicit return, **all model browser operations**
  for that employee are fenced, including page reads, screenshots, tabs,
  downloads, navigation and mutations. The employee viewer remains available.
  This prevents even a page that echoes/encodes entered values from exposing them
  through a subsequent model screenshot/read. Other employees are unaffected.
- `browser/private-input.json` is a bound, validated private atomic fence with
  installation, user and boolean state only. It survives process restart.
  Request metadata lives in memory; no secret value is retained in a request,
  journal, audit, chat event, error/cause, response or navigation projection.
  Values exist transiently in the employee form, HTTPS request, server call and
  destination website. The destination website necessarily receives them.
- Navigation recovery is cleared before input. Private navigation is not saved,
  and private-session downloads do not enter the agent-visible download
  projection. The native worker's existing private filesystem sandbox excludes
  the browser profile. No CDP endpoint is exposed to the model/client.
- Dismissal also closes private pages: a user may already have typed manually in
  the viewer. Closing the viewer or losing a heartbeat never removes the fence.
  A failed page-close leaves it active. A blank owned target prevents headless
  Chromium from exiting when the last private page is closed.

The secure card is the protected entry path. Do not paste passwords or codes
into the ordinary chat composer. If entering them manually in the viewer,
activate the padlock/private mode first. The browser cannot infer every website's
custom secret control.

## Validation

Focused route/component/contract tests cover origin/authentication, permission
revocation, request body bounds, no extra identity fields, private-only payload
routing, missing-transport failure, metadata-only tool replay, private atomic
state and foreign bindings. Existing browser and worker suites remain required.

The opt-in `Secure Input` real Chromium test uses synthetic credentials only.
It verifies login fields, split OTP, blocked native model password typing,
cross-thread/replay denial, blocked reads/images/downloads, employee viewing,
blank navigation recovery, persistent restart fencing, authenticated-cookie
continuity after private-page closure, ambiguous forms and changed-page denial.

```sh
AIBRAIN_REAL_CHROME_TEST=1 /usr/bin/lockf -t 0 /tmp/neska-release-qa.lock \
  npx vitest run src/runtime/browser/chrome-runtime.real.test.ts -t 'Secure Input'
```

Use the corresponding shared QA mutex on Linux. Backend CI, GHCR publication,
deployment and authenticated live acceptance remain separate gates; local
Chromium and mocked HTTP/component tests do not establish those gates.

Local candidate checks: TypeScript and full ESLint passed; the browser, HTTP
route, chat/viewer component and worker suites passed. Real Chromium also passed
login, OTP, PIN, SMS, expiry, replay/foreign-thread rejection, changed-page
rejection, manual takeover/dismissal and persistent privacy fencing. The
production webpack build passed. Default Turbopack compilation encountered
`next/font/google` Rubik URL-resolution errors; the font layout and build
configuration were not changed by this feature. This default-build issue must
be checked separately in Backend CI before any release is accepted.

The versioned HTTP catalog and strict response schemas also cover both private
input methods. Contract tests reject secret-valued properties in responses.
Native ARM CI successfully compiled the default Turbopack build for the first
PR head; its failed route-inventory assertion exposed the missing catalog
entries, now corrected without weakening that check.
