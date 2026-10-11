import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/auth/types";
import type { ChatMessage } from "@/lib/chat-contract";
import { WorkbenchConflictError } from "@/workbench/errors";
import { FileTurnProjectionStore } from "@/workbench/turn-projection-store";

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const state = vi.hoisted(() => ({ session: null as AuthSession | null, installation: {} as object,
  writable: true, messages: [] as ChatMessage[], starts: [] as unknown[], controls: [] as unknown[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/auth/session", () => ({ getSession: async () => state.session }));
vi.mock("@/auth/request-security", () => ({ isSameOriginMutation: async (request: Request) => request.headers.get("Origin") === "https://neska.example" }));
vi.mock("@/config/installation", () => ({ loadInstallationConfig: async () => state.installation }));
vi.mock("@/workbench/store", () => ({
  getThreadRuntimeContext: async () => { if (!state.writable) throw new WorkbenchConflictError("Només lectura"); return { projectId: id(10) }; },
  getThread: async () => ({ messages: state.messages }),
  finishThreadTurn: async () => {},
}));
vi.mock("@/app/api/chat/route", () => ({ POST: async (request: Request) => { state.starts.push(await request.json()); return new Response('{"type":"done"}\n', { headers: { "Content-Type": "application/x-ndjson" } }); } }));
vi.mock("@/app/api/runtime/turns/control/route", () => ({ POST: async (request: Request) => { state.controls.push(await request.json()); return Response.json({ ok: true }); } }));

const { POST: plans } = await import("@/app/api/runtime/plans/route");
const { POST: incidents } = await import("@/app/api/runtime/incidents/route");
let root: string;
let store: FileTurnProjectionStore;
const request = (body: unknown, origin = "https://neska.example") => new Request(`${origin}/api/runtime/plans`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const execution = () => ({ projectId: id(10), threadId: id(20), userMessageId: id(31), assistantMessageId: id(41), message: "Forged browser content", preferences: { tone: "balanced", language: "ca", showActivity: false },
  options: { mode: "agent", experience: "fast", model: null, effort: null, webSearch: false, imageGeneration: false, skill: null, attachments: [] } });
const planRequest = (action: string) => ({ action, threadId: id(20), assistantMessageId: id(40), revision: 1, ...(action === "edit" ? { steps: ["Revisar el document"] } : { execution: execution() }) });

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "neska-task-actions-"));
  await mkdir(path.join(root, id(1)), { mode: 0o700 });
  await mkdir(path.join(root, id(2)), { mode: 0o700 });
  state.session = { provider: "local", user: { id: id(1), name: "Employee", email: "employee@example.test" }, tenant: { id: "task-lab", name: "Lab" }, expiresAt: "2027-01-01T00:00:00.000Z" };
  state.installation = { installationId: "task-lab", paths: { usersRoot: root } };
  state.writable = true; state.starts = []; state.controls = [];
  const message: ChatMessage = { id: id(40), role: "assistant", content: "Pla", createdAt: "2026-10-11T12:00:00.000Z", status: "complete", activity: [], plan: [{ step: "Llegir el document", status: "pending" }], planProposal: { status: "proposed", revision: 1 }, approvals: [], attachments: [], artifacts: [], diff: "" };
  state.messages = [{ ...message, id: id(30), role: "user", content: "Petició original", planProposal: undefined }, message];
  store = new FileTurnProjectionStore({ installationId: "task-lab", userId: id(1), usersRoot: root });
  await store.initialize(id(20), message);
});
afterEach(async () => { vi.restoreAllMocks(); await rm(root, { recursive: true, force: true }); });

describe("private task action routes", () => {
  it("rejects origin, anonymous, viewer and tenant mismatch before reading a private projection", async () => {
    const read = vi.spyOn(FileTurnProjectionStore.prototype, "read");
    expect((await plans(request(planRequest("edit"), "https://foreign.example"))).status).toBe(403);
    const session = state.session;
    state.session = null;
    expect((await plans(request(planRequest("edit")))).status).toBe(401);
    state.session = session; state.writable = false;
    expect((await plans(request(planRequest("edit")))).status).toBe(409);
    state.writable = true; state.session = { ...session!, tenant: { id: "foreign-lab", name: "Foreign" } };
    expect((await plans(request(planRequest("edit")))).status).toBe(403);
    expect(read).not.toHaveBeenCalled();
    expect(state.starts).toHaveLength(0);
  });

  it("does not read another employee's proposal and persists revisioned edits", async () => {
    const own = state.session!;
    state.session = { ...own, user: { ...own.user, id: id(2) } };
    expect((await plans(request(planRequest("edit")))).status).toBe(404);
    state.session = own;
    expect((await plans(request(planRequest("edit")))).status).toBe(200);
    expect((await store.read(id(20), id(40)))?.message).toMatchObject({ plan: [{ step: "Revisar el document" }], planProposal: { revision: 2 } });
    expect((await plans(request(planRequest("edit")))).status).toBe(409);
  });

  it("executes persisted content through ordinary chat and fences a second execution", async () => {
    expect((await plans(request(planRequest("execute")))).status).toBe(200);
    expect(state.starts[0]).toMatchObject({ message: expect.stringContaining("Llegir el document"), options: { mode: "agent" } });
    expect(JSON.stringify(state.starts[0])).toContain("Petició original");
    expect(JSON.stringify(state.starts[0])).not.toContain("Forged browser content");
    const other = { ...planRequest("execute"), execution: { ...execution(), assistantMessageId: id(42) } };
    expect((await plans(request(other))).status).toBe(409);
    expect(state.starts).toHaveLength(1);
  });

  it("steers only a published open incident and does not claim the tool retry succeeded", async () => {
    await store.mutateTask(id(20), id(40), message => ({ ...message, status: "streaming", incidents: [{ id: "incident", stepIndex: 0, message: "Document protegit", actions: ["retry"], status: "open", timestamp: "2026-10-11T12:00:00.000Z" }] }));
    const body = { threadId: id(20), assistantMessageId: id(40), incidentId: "incident", action: "skip", clientRequestId: id(50), userMessageId: id(51) };
    expect((await incidents(request(body))).status).toBe(409);
    expect((await incidents(request({ ...body, action: "retry" }))).status).toBe(200);
    expect(state.controls[0]).toMatchObject({ action: "steer", message: expect.stringContaining("Llegir el document") });
    expect((await store.read(id(20), id(40)))?.message).toMatchObject({ status: "streaming", incidents: [{ status: "retry_requested" }] });
    expect((await incidents(request({ ...body, action: "retry", clientRequestId: id(52) }))).status).toBe(409);
    expect(state.controls).toHaveLength(1);
  });
});
