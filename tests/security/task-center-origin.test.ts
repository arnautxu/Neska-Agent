import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/auth/session", () => ({ getSession: mocks.session }));
vi.mock("@/config/installation", () => ({ loadInstallationConfig: async () => ({ publicUrl: "https://brain.example.test" }) }));
vi.mock("@/task-center/server-service", () => ({ getTaskCenter: vi.fn(), updateTaskCenter: mocks.update }));
import { PATCH } from "@/app/api/task-center/route";
beforeEach(() => { vi.stubEnv("NODE_ENV", "production"); vi.clearAllMocks(); mocks.session.mockResolvedValue({ user: { id: "synthetic" } }); mocks.update.mockResolvedValue({ preferences: { inApp: false, desktop: false } }); });
afterEach(() => vi.unstubAllEnvs());
const body = JSON.stringify({ action: "preferences", preferences: { inApp: false, desktop: false } });
describe("task-center mutation origin", () => {
  it.each([
    { origin: "https://foreign.example.test", "sec-fetch-site": "cross-site" },
    { origin: "null" },
    { origin: "malformed" },
    { "sec-fetch-site": "cross-site" },
    {},
  ])("rejects before session reads or writes: %j", async (headers) => {
    const result = await PATCH(new Request("https://brain.example.test/api/task-center", { method: "PATCH", headers: headers as HeadersInit, body }));
    expect(result.status).toBe(403); expect(mocks.session).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("preserves authenticated same-origin updates", async () => {
    const result = await PATCH(new Request("https://brain.example.test/api/task-center", { method: "PATCH", headers: { origin: "https://brain.example.test" }, body }));
    expect(result.status).toBe(200); expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ user: { id: "synthetic" } }, { preferences: { inApp: false, desktop: false } });
  });
  it("keeps authentication mandatory", async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await PATCH(new Request("https://brain.example.test/api/task-center", { method: "PATCH", headers: { origin: "https://brain.example.test" }, body }))).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
