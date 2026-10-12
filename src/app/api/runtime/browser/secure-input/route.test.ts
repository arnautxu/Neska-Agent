import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ origin: vi.fn(), auth: vi.fn(), context: vi.fn(), permissions: vi.fn(), status: vi.fn(), action: vi.fn() }));
vi.mock("@/auth/request-security", () => ({ isSameOriginMutation: mocks.origin }));
vi.mock("@/runtime/browser/route-security", () => ({ getLocalBrowserRequestAuth: mocks.auth }));
vi.mock("@/runtime/browser/server-service", () => ({ privateBrowserInputStatus: mocks.status, privateBrowserInputAction: mocks.action }));
vi.mock("@/workbench/store", () => ({ getThreadRuntimeContext: mocks.context }));
vi.mock("@/config/installation", () => ({ loadInstallationConfig: async () => ({ installationId: "private-lab" }) }));
vi.mock("@/runtime/permission-turn", () => ({ resolveServerTurnPermissions: mocks.permissions }));
import { GET, POST } from "./route";

const userId = "0198b9f0-6631-7000-8000-000000000401";
const threadId = "0198b9f0-6631-7000-8000-000000000411";
const browserSessionId = "0198b9f0-6631-7000-8000-000000000412";
const requestId = "0198b9f0-6631-7000-8000-000000000413";
const payload = { action: "fill", threadId, browserSessionId, requestId, values: { email: "employee", password: "synthetic-private-sentinel" } };
const post = (body = payload) => new Request("https://app.example.test/api/runtime/browser/secure-input", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.origin.mockResolvedValue(true);
  mocks.auth.mockResolvedValue({ session: { provider: "local", tenant: { id: "private-lab" }, user: { id: userId } }, authSessionId: "opaque-session" });
  mocks.context.mockResolvedValue({ projectId: "private-project" });
  mocks.permissions.mockResolvedValue({ rules: [{ ruleId: "browser.execute", action: "execute", effect: "allow" }] });
  mocks.status.mockResolvedValue({ protected: true, request: null, browserSessionId });
  mocks.action.mockResolvedValue(undefined);
});

describe("employee-only secure input route", () => {
  it("binds values to the authenticated user and returns no values or page errors", async () => {
    const response = await POST(post());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.action).toHaveBeenCalledWith({ installationId: "private-lab", userId, ...payload });
    mocks.action.mockRejectedValue(new Error("page echoed synthetic-private-sentinel"));
    const failed = await POST(post());
    expect(failed.status).toBe(409);
    expect(await failed.text()).not.toContain("synthetic-private-sentinel");
  });
  it("denies foreign origin, unauthenticated access, foreign thread and revoked permissions before browser dispatch", async () => {
    mocks.origin.mockResolvedValue(false);
    expect((await POST(post())).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
    mocks.origin.mockResolvedValue(true);
    mocks.auth.mockResolvedValue({ error: "unauthenticated" });
    expect((await POST(post())).status).toBe(401);
    expect(mocks.context).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue({ session: { provider: "local", tenant: { id: "private-lab" }, user: { id: userId } } });
    mocks.context.mockRejectedValue(new Error("foreign thread"));
    expect((await POST(post())).status).toBe(409);
    expect(mocks.permissions).not.toHaveBeenCalled();
    mocks.context.mockResolvedValue({ projectId: "private-project" });
    mocks.permissions.mockResolvedValue({ rules: [{ ruleId: "browser.execute", action: "execute", effect: "deny" }, { ruleId: "tools.execute", action: "execute", effect: "allow" }] });
    expect((await POST(post())).status).toBe(403);
    expect(mocks.action).not.toHaveBeenCalled();
  });
  it("rejects extra identity fields and bounded payload overflow without echoing the body", async () => {
    const invalid = { ...payload, userId: "other-user" };
    expect((await POST(post(invalid))).status).toBe(400);
    const response = await POST(post({ ...payload, values: { email: "employee", password: "x".repeat(20000) } }));
    expect(response.status).toBe(400);
    expect(mocks.action).not.toHaveBeenCalled();
  });
  it("authorizes the selected thread before exposing request metadata", async () => {
    const response = await GET(new Request(`https://app.example.test/api/runtime/browser/secure-input?threadId=${threadId}`));
    expect(response.status).toBe(200);
    expect(mocks.status).toHaveBeenCalledWith({ installationId: "private-lab", userId, threadId });
    mocks.context.mockRejectedValue(new Error("foreign"));
    mocks.status.mockClear();
    expect((await GET(new Request(`https://app.example.test/api/runtime/browser/secure-input?threadId=${threadId}`))).status).toBe(404);
    expect(mocks.status).not.toHaveBeenCalled();
  });
});
