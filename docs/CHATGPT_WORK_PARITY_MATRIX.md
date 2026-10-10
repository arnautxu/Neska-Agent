# ChatGPT Work / Codex functional parity matrix

Last reviewed: 2026-08-28 (Europe/Madrid)
Audit base: `d381ccf836516f91464f20225403996e7e8158d1`
UI branch: `codex/aibrain-ui-functional-parity`


## Status vocabulary


Existing tests or historical reports are links, not proof that the current branch or live release passed. A row advances only after a fresh readback at the corresponding gate.

## Reference evidence and confidence

| Reference | Verified on | What is verified | Limits |
| --- | --- | --- | --- |
| [Projects and chats](https://learn.chatgpt.com/docs/projects) | Official OpenAI documentation, 2026-08-28 | Projects group chats, files, instructions and sources; project and projectless chat are distinct flows. | Describes behavior, not every pixel or account-specific control. |
| [Scheduled tasks](https://learn.chatgpt.com/docs/automations) | Official OpenAI documentation, 2026-08-28 | Scheduled exposes active, paused, completed and recent runs; local tasks require the desktop app/computer, while web tasks use uploaded or connected context. | Availability varies by plan and workspace. |
| [Notifications](https://learn.chatgpt.com/docs/notifications) | Official OpenAI documentation, 2026-08-28 | Activity is opened from the sidebar bell; it tracks unread, running and waiting chats, supports filters and mark-all-read, and documents `Cmd+Option+U` / `Ctrl+Alt+U`. | Delivery channels vary by surface/account. |
| [Settings](https://learn.chatgpt.com/docs/reference/settings) | Official OpenAI documentation, 2026-08-28 | Settings includes general behavior, shortcuts, notifications and appearance. | Some options are desktop-only or account-dependent. |
| [Agent approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security) | Official OpenAI documentation, 2026-08-28 | Approval policy and sandbox mode are separate controls; approvals must stop work before the protected action. | AiBrain must implement its own contract and policy boundary. |
| [ChatGPT Work overview](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-overview) | Official OpenAI documentation, 2026-08-28 | Local and cloud Work have different execution/file boundaries; permissions and workspace policy constrain both. | Does not imply AiBrain cloud parity. |
| Live logged-out ChatGPT web shell, desktop and 390x844 mobile | Read-only Chrome inspection, 2026-08-28 | Desktop uses a persistent left navigation and bottom composer; mobile collapses navigation behind a top control while preserving the composer. Generic controls observed: new chat, search, files/more and send. | The available session was not authenticated. Projects, Library, Activity, admin and logged-in states below are therefore official-docs verified or AiBrain-only audited, not live-reference verified. |

## Current functional inventory


## First-wave audit conclusion

The clean integrated checkout `codex/aibrain-integrated-qa@8d26166` contains the earlier employee workbench but not the broad parity surfaces above. The release coordinator selected `d381ccf` as the clean functional base because it combines `origin/main@390bbb0`, the latest UI refinement and the work-parity branch while excluding all 64 uncommitted files in `AiBrain-today-integration`.

The first implementable UI-only gap is `KBD-01`: the reference documents Activity as a sidebar-bell view with `Cmd+Option+U` / `Ctrl+Alt+U`, while the audited AiBrain base exposed Tareas only by pointer/touch. This branch adds the equivalent global shortcut and accessible shortcut metadata without changing task data, runtime, persistence, auth, deployment, contracts or visual assets.
