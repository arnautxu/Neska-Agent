import path from "node:path";
import { ResourceLockManager } from "@/storage/resource-lock";
import type {
  AuthIdentityProvider,
  RecoveryProof,
} from "@/auth/identity-provider";
import type { FileLocalAuthChallengeStore } from "@/auth/local-auth-challenge-store";
import type { CreatedLocalSession, FileLocalSessionStore } from "@/auth/local-session-store";
import type { FileLocalUserStore, LocalUser } from "@/auth/local-user-store";

export class LocalAuthError extends Error {
  readonly code:
    | "invalid_input"
    | "invalid_credentials"
    | "profile_unavailable"
    | "profile_disabled"
    | "challenge_invalid"
    | "recovery_invalid";

  constructor(code: LocalAuthError["code"], message: string) {
    super(message);
    this.name = "LocalAuthError";
    this.code = code;
  }
}

export type SuccessfulLocalAuthentication = {
  kind: "authenticated";
  user: LocalUser;
  session: CreatedLocalSession;
};

export type InitialPasswordChallenge = {
  kind: "password_change_required";
  challengeId: string;
  expiresAt: number;
};

function normalizedEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new LocalAuthError("invalid_input", "Email address is invalid.");
  }
  return email;
}

export function validatePassword(value: string) {
  if (
    value.length < 12 ||
    value.length > 128 ||
    !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value) ||
    !/[0-9]/.test(value)
  ) {
    throw new LocalAuthError(
      "invalid_input",
      "Password must have 12–128 characters and include a letter and a number.",
    );
  }
  return value;
}

export class LocalAuthService {
  private readonly authenticationLocks: ResourceLockManager;

  constructor(
    readonly installationId: string,
    private readonly identityProvider: AuthIdentityProvider,
    private readonly users: FileLocalUserStore,
    private readonly sessions: FileLocalSessionStore,
    private readonly challenges: FileLocalAuthChallengeStore,
  ) {
    this.authenticationLocks = new ResourceLockManager({
      rootDirectory: path.join(sessions.rootDirectory, "authentication-locks"),
    });
  }

  private withIdentityLock<T>(email: string, operation: () => Promise<T>) {
    return this.authenticationLocks.withLock(`authentication:${this.installationId}:${normalizedEmail(email)}`, operation);
  }

  private async authorizedLocalUser(userId: string, identityEmail: string) {
    const user = await this.users.read(userId);
    if (!user || user.email !== identityEmail) {
      throw new LocalAuthError("profile_unavailable", "Local user profile is unavailable.");
    }
    if (!user.enabled) {
      await this.sessions.revokeUser(this.installationId, userId);
      throw new LocalAuthError("profile_disabled", "Local user profile is disabled.");
    }
    return user;
  }

  private async issueSession(user: LocalUser) {
    return this.sessions.create(this.installationId, user.userId);
  }

  async login(emailInput: string, password: string): Promise<
    SuccessfulLocalAuthentication | InitialPasswordChallenge
  > {
    const email = normalizedEmail(emailInput);
    if (password.length < 1 || password.length > 4096) {
      throw new LocalAuthError("invalid_input", "Password is invalid.");
    }
    // Hold the same cross-process identity lock from password verification to
    // local issuance. Recovery cannot miss a login verified with the old password.
    return this.withIdentityLock(email, async () => {
      const identity = await this.identityProvider.verifyPassword(email, password);
      let retainedForChallenge = false;
      try {
        if (normalizedEmail(identity.email) !== email) {
          throw new LocalAuthError("invalid_credentials", "Identity email does not match the login.");
        }
        const user = await this.authorizedLocalUser(identity.userId, identity.email);
        await this.users.saveAvatarUrl(user.userId, identity.avatarUrl ?? null);
        if (await this.users.hasInitialPasswordMarker(user.userId)) {
          const challenge = await this.challenges.create({
            installationId: this.installationId,
            userId: user.userId,
            accessToken: identity.accessToken,
            refreshToken: identity.refreshToken,
          });
          retainedForChallenge = true;
          return {
            kind: "password_change_required" as const,
            challengeId: challenge.challengeId,
            expiresAt: challenge.record.expiresAt,
          };
        }
        return { kind: "authenticated" as const, user, session: await this.issueSession(user) };
      } finally {
        if (!retainedForChallenge) await this.identityProvider.signOut(identity);
      }
    });
  }

  async changeInitialPassword(challengeId: string, newPasswordInput: string) {
    const newPassword = validatePassword(newPasswordInput);
    const result = await this.challenges.consume(
      challengeId,
      this.installationId,
      async (challenge) => {
        try {
          const profile = await this.users.read(challenge.userId);
          if (!profile) throw new LocalAuthError("profile_unavailable", "Local user profile is unavailable.");
          return await this.withIdentityLock(profile.email, async () => {
            const user = await this.authorizedLocalUser(challenge.userId, profile.email);
            if (!await this.users.hasInitialPasswordMarker(user.userId)) {
              throw new LocalAuthError("challenge_invalid", "Password-change challenge is no longer valid.");
            }
            await this.identityProvider.updatePassword(challenge, newPassword);
            await this.sessions.revokeUser(this.installationId, user.userId);
            await this.users.clearInitialPasswordMarker(user.userId);
            return { kind: "authenticated" as const, user, session: await this.issueSession(user) };
          });
        } finally {
          await this.identityProvider.signOut(challenge);
        }
      },
    );
    if (!result) {
      throw new LocalAuthError("challenge_invalid", "Password-change challenge is invalid.");
    }
    return result;
  }

  async requestPasswordRecovery(emailInput: string, redirectTo: string) {
    const email = normalizedEmail(emailInput);
    await this.identityProvider.requestPasswordRecovery(email, redirectTo);
  }

  async completePasswordRecovery(
    proof: RecoveryProof,
    newPasswordInput: string,
  ): Promise<SuccessfulLocalAuthentication> {
    const newPassword = validatePassword(newPasswordInput);
    const identity = await this.identityProvider.verifyPasswordRecovery(proof);
    try {
      return await this.withIdentityLock(identity.email, async () => {
        const user = await this.authorizedLocalUser(identity.userId, identity.email);
        await this.identityProvider.updatePassword(identity, newPassword);
        await this.sessions.revokeUser(this.installationId, user.userId);
        await this.users.clearInitialPasswordMarker(user.userId);
        return { kind: "authenticated" as const, user, session: await this.issueSession(user) };
      });
    } finally {
      await this.identityProvider.signOut(identity);
    }
  }
}
