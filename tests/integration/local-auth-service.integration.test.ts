import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalAuthService } from "@/auth/auth-service";
import type {
  AuthIdentityProvider,
  IdentityCredentials,
  RecoveryProof,
  VerifiedIdentity,
} from "@/auth/identity-provider";
import { IdentityProviderError } from "@/auth/identity-provider";
import { FileLocalAuthChallengeStore } from "@/auth/local-auth-challenge-store";
import { FileLocalSessionStore } from "@/auth/local-session-store";
import { FileLocalUserStore } from "@/auth/local-user-store";

const USER_ID = "0198b9f0-6631-7000-8000-000000000010";
const identity: VerifiedIdentity = {
  userId: USER_ID,
  email: "employee@example.test",
  accessToken: "access-token-synthetic-0001",
  refreshToken: "refresh-token-synthetic-001",
};
const roots: string[] = [];

class FakeIdentityProvider implements AuthIdentityProvider {
  available = true;
  passwordUpdates = 0;
  recoveryRequests = 0;
  signOuts = 0;
  password = "Temporary-pass-123";

  private check() {
    if (!this.available) throw new IdentityProviderError("provider_unavailable", "offline");
  }
  async verifyPassword(email: string, password: string) {
    this.check();
    if (email !== identity.email || password !== this.password) {
      throw new IdentityProviderError("invalid_credentials", "invalid");
    }
    return identity;
  }
  async updatePassword(_credentials: IdentityCredentials, _password: string) {
    this.check();
    this.passwordUpdates += 1;
    this.password = _password;
  }
  async requestPasswordRecovery(_email: string, _redirectTo: string) {
    this.check();
    this.recoveryRequests += 1;
  }
  async verifyPasswordRecovery(_proof: RecoveryProof) {
    this.check();
    return identity;
  }
  async signOut(_credentials: IdentityCredentials) {
    this.signOuts += 1;
  }
}

async function fixture(initialPassword = false) {
  const root = await mkdtemp(path.join(tmpdir(), "aibrain-auth-service-"));
  roots.push(root);
  const usersRoot = path.join(root, "users");
  const userRoot = path.join(usersRoot, USER_ID);
  await mkdir(userRoot, { recursive: true });
  await writeFile(path.join(userRoot, "user.json"), JSON.stringify({
    schemaVersion: 1,
    userId: USER_ID,
    email: identity.email,
    displayName: "Synthetic Employee",
    enabled: true,
    workerId: "synthetic-employee",
  }));
  if (initialPassword) await writeFile(path.join(userRoot, "password-change-required"), "1\n");
  const provider = new FakeIdentityProvider();
  const sessions = new FileLocalSessionStore({ rootDirectory: path.join(root, "sessions") });
  const users = new FileLocalUserStore(usersRoot);
  const challenges = new FileLocalAuthChallengeStore({
    rootDirectory: path.join(root, "challenges"),
  });
  const service = new LocalAuthService("example-lab-dev", provider, users, sessions, challenges);
  return { provider, sessions, users, challenges, service, root };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("LocalAuthService", () => {
  it("exchanges provider credentials for an opaque local session that survives provider outage", async () => {
    const { provider, sessions, service } = await fixture();
    const result = await service.login(identity.email, "Temporary-pass-123");
    expect(result.kind).toBe("authenticated");
    if (result.kind !== "authenticated") throw new Error("unexpected result");
    provider.available = false;

    expect(await sessions.read(result.session.sessionId, "example-lab-dev")).toMatchObject({
      record: { userId: USER_ID },
    });
    expect(provider.signOuts).toBe(1);
  });

  it("requires a one-time initial password change before issuing the workbench session", async () => {
    const { provider, sessions, users, service, root } = await fixture(true);
    const challenge = await service.login(identity.email, "Temporary-pass-123");
    expect(challenge.kind).toBe("password_change_required");
    if (challenge.kind !== "password_change_required") throw new Error("unexpected result");

    const storedChallenge = await readFile(path.join(
      root,
      "challenges",
      "records",
      `${createHash("sha256").update(challenge.challengeId).digest("hex")}.json`,
    ), "utf8");
    expect(storedChallenge).not.toContain(identity.accessToken);
    expect(storedChallenge).not.toContain(identity.refreshToken);

    const authenticated = await service.changeInitialPassword(
      challenge.challengeId,
      "Permanent-pass-456",
    );
    expect(provider.passwordUpdates).toBe(1);
    expect(await users.hasInitialPasswordMarker(USER_ID)).toBe(false);
    expect(await sessions.read(authenticated.session.sessionId, "example-lab-dev")).not.toBeNull();
    await expect(service.changeInitialPassword(challenge.challengeId, "Permanent-pass-789"))
      .rejects.toMatchObject({ code: "challenge_invalid" });
  });

  it("supports recovery without exposing provider tokens to the browser", async () => {
    const { provider, service } = await fixture();
    await service.requestPasswordRecovery(identity.email, "https://brain.example.test/auth/recovery");
    const authenticated = await service.completePasswordRecovery(
      { tokenHash: "synthetic-token-hash" },
      "Recovered-pass-789",
    );
    expect(provider.recoveryRequests).toBe(1);
    expect(provider.passwordUpdates).toBe(1);
    expect(authenticated.user.userId).toBe(USER_ID);
  });
});


describe("password recovery security", () => {
  const installation = "example-lab-dev";
  it("revokes old cookies, preserves another user and installation, and closes provider credentials", async () => {
    const { provider, sessions, service } = await fixture();
    const old = await service.login(identity.email, "Temporary-pass-123");
    if (old.kind !== "authenticated") throw new Error("unexpected challenge");
    const other = await sessions.create(installation, "0198b9f0-6631-7000-8000-000000000011");
    const otherTenant = await sessions.create("other-company", USER_ID);
    const fresh = await service.completePasswordRecovery({ tokenHash: "synthetic" }, "Recovered-pass-789");
    expect(await sessions.read(old.session.sessionId, installation)).toBeNull();
    expect(await sessions.read(fresh.session.sessionId, installation)).not.toBeNull();
    expect(await sessions.read(other.sessionId, installation)).not.toBeNull();
    expect(await sessions.read(otherTenant.sessionId, "other-company")).not.toBeNull();
    expect(provider.signOuts).toBe(2);
    await expect(service.login(identity.email, "Temporary-pass-123")).rejects.toMatchObject({ code: "invalid_credentials" });
    expect((await service.login(identity.email, "Recovered-pass-789")).kind).toBe("authenticated");
  });

  it("serializes recovery with an old-password login across independent service instances", async () => {
    const { provider, sessions, users, challenges, service, root } = await fixture();
    const second = new LocalAuthService(installation, provider, users,
      new FileLocalSessionStore({ rootDirectory: path.join(root, "sessions") }), challenges);
    let enter!: () => void; let release!: () => void;
    const entered = new Promise<void>((resolve) => { enter = resolve; });
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const verify = provider.verifyPassword.bind(provider);
    vi.spyOn(provider, "verifyPassword").mockImplementationOnce(async (...args) => {
      const verified = await verify(...args); enter(); await hold; return verified;
    });
    const oldLogin = service.login(identity.email, "Temporary-pass-123");
    await entered;
    const recovery = second.completePasswordRecovery({ tokenHash: "synthetic" }, "Recovered-pass-789");
    release();
    const [old, fresh] = await Promise.all([oldLogin, recovery]);
    if (old.kind !== "authenticated") throw new Error("unexpected challenge");
    expect(await sessions.read(old.session.sessionId, installation)).toBeNull();
    expect(await sessions.read(fresh.session.sessionId, installation)).not.toBeNull();
  });

  it("checks a queued login against the new password after recovery", async () => {
    const { provider, users, challenges, service, root } = await fixture();
    const second = new LocalAuthService(installation, provider, users,
      new FileLocalSessionStore({ rootDirectory: path.join(root, "sessions") }), challenges);
    let enter!: () => void; let release!: () => void;
    const entered = new Promise<void>((resolve) => { enter = resolve; });
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const update = provider.updatePassword.bind(provider);
    vi.spyOn(provider, "updatePassword").mockImplementationOnce(async (...args) => { enter(); await hold; await update(...args); });
    const recovery = service.completePasswordRecovery({ tokenHash: "synthetic" }, "Recovered-pass-789");
    await entered;
    const denied = expect(second.login(identity.email, "Temporary-pass-123")).rejects.toMatchObject({ code: "invalid_credentials" });
    release(); await recovery; await denied;
  });

  it("rejects an earlier initial-password challenge after recovery", async () => {
    const { provider, service } = await fixture(true);
    const challenge = await service.login(identity.email, "Temporary-pass-123");
    if (challenge.kind !== "password_change_required") throw new Error("missing challenge");
    await service.completePasswordRecovery({ tokenHash: "synthetic" }, "Recovered-pass-789");
    await expect(service.changeInitialPassword(challenge.challengeId, "Attacker-pass-789"))
      .rejects.toMatchObject({ code: "challenge_invalid" });
    expect(provider.passwordUpdates).toBe(1);
    expect(provider.signOuts).toBe(2);
  });

  it("does not revoke on a rejected provider update, but always closes recovery credentials", async () => {
    const { provider, sessions, service } = await fixture();
    const old = await sessions.create(installation, USER_ID);
    vi.spyOn(provider, "updatePassword").mockRejectedValueOnce(new Error("provider rejected"));
    await expect(service.completePasswordRecovery({ tokenHash: "synthetic" }, "Recovered-pass-789")).rejects.toThrow("provider rejected");
    expect(await sessions.read(old.sessionId, installation)).not.toBeNull();
    expect(provider.signOuts).toBe(1);
  });
});
