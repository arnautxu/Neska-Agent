import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppServerRpcRouter } from "@/runtime/transport";
import { createQuotaToolPermissions } from "@/runtime/quota-tool-permissions";
import { LocalGatewayWorkerRuntimeFactory } from "@/runtime/workers/local-gateway-runtime";
import type { ManagedWorkerRuntime, WorkerLaunchContext } from "@/runtime/workers/types";

const ACCEPTANCE_TIMEOUT_MS = 55_000;
const EXPECTED_CODEX_VERSION = "0.153.4";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function withDeadline<T>(operation: Promise<T>, label: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${label} exceeded ${ACCEPTANCE_TIMEOUT_MS}ms.`)),
      ACCEPTANCE_TIMEOUT_MS,
    );
  });
  return Promise.race([operation, deadline]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

async function installationAcceptanceConfig() {
  const configPath = process.env.AIBRAIN_INSTALLATION_CONFIG?.trim()
    || "/etc/aibrain/installation.json";
  const config = JSON.parse(await readFile(configPath, "utf8")) as unknown;
  if (!isRecord(config) || !isRecord(config.paths) || typeof config.paths.usersRoot !== "string") {
    throw new Error("Installation usersRoot is unavailable for App Server acceptance.");
  }
  const usersRoot = path.resolve(config.paths.usersRoot);
  if (process.env.NODE_ENV === "production" && usersRoot !== "/var/lib/aibrain/data/users") {
    throw new Error("Production App Server acceptance requires the immutable users root.");
  }
  return { usersRoot };
}

async function createContext(usersRoot: string) {
  const userId = randomUUID();
  const userRoot = path.join(usersRoot, userId);
  const runtimeRoot = path.join(userRoot, "runtime");
  const xdgRoot = path.join(runtimeRoot, "xdg");
  const staging = path.join(userRoot, "staging");
  const context: WorkerLaunchContext = Object.freeze({
    installationId: "container-app-server-acceptance",
    userId,
    workerId: `worker-${userId}`,
    environment: Object.freeze({
      HOME: path.join(runtimeRoot, "home"),
      CODEX_HOME: path.join(runtimeRoot, "codex-home"),
      XDG_CACHE_HOME: path.join(xdgRoot, "cache"),
      XDG_CONFIG_HOME: path.join(xdgRoot, "config"),
      XDG_DATA_HOME: path.join(xdgRoot, "data"),
      XDG_STATE_HOME: path.join(xdgRoot, "state"),
      TMPDIR: path.join(staging, "tmp"),
    }),
    mounts: Object.freeze({
      runtimeReadOnly: Object.freeze([]),
      runtimeReadWrite: Object.freeze([
        runtimeRoot,
        path.join(userRoot, "workspace"),
        staging,
        path.join(userRoot, "artifacts"),
        path.join(userRoot, "audit", "transport"),
      ]),
      browserReadWrite: Object.freeze([]),
    }),
    workspace: path.join(userRoot, "workspace"),
    staging,
    artifacts: path.join(userRoot, "artifacts"),
    transportAudit: path.join(userRoot, "audit", "transport"),
    browser: Object.freeze({
      profile: path.join(userRoot, "browser", "profile"),
      downloads: path.join(userRoot, "browser", "downloads"),
    }),
  });
  await Promise.all([
    ...Object.values(context.environment).map((directory) => mkdir(directory, { recursive: true, mode: 0o700 })),
    mkdir(context.workspace, { recursive: true, mode: 0o700 }),
    mkdir(path.join(context.staging, "threads"), { recursive: true, mode: 0o700 }),
    mkdir(context.artifacts, { recursive: true, mode: 0o700 }),
    mkdir(context.transportAudit, { recursive: true, mode: 0o700 }),
    mkdir(context.browser.profile, { recursive: true, mode: 0o700 }),
    mkdir(context.browser.downloads, { recursive: true, mode: 0o700 }),
  ]);
  await Promise.all([
    writeFile(path.join(userRoot, "PROFILE.md"), "# Acceptance employee\n", { mode: 0o600 }),
    writeFile(path.join(userRoot, "PREFERENCES.md"), "# Acceptance preferences\n", { mode: 0o600 }),
    writeFile(path.join(userRoot, "PERMISSIONS.md"), "# Acceptance permissions\n", { mode: 0o600 }),
  ]);
  return { context, userRoot };
}

/** Real native subprocess checks; no model, customer data or provider credentials. */
async function acceptPrivateFilesystem(router: AppServerRpcRouter, context: WorkerLaunchContext, generation: number) {
  const home = context.environment.CODEX_HOME;
  const marker = `private-acceptance-${randomUUID()}`;
  const privateFiles = [
    path.join(home, "auth.json.acceptance"),
    path.join(home, "sessions", "acceptance.txt"),
    path.join(home, "state_999.sqlite"),
    path.join(context.transportAudit, "acceptance.txt"),
    path.join("/var/lib/aibrain-restores", `acceptance-${context.userId}-${generation}.txt`),
  ];
  const skill = path.join(home, "skills", "acceptance", "SKILL.md");
  const workspaceFile = path.join(context.workspace, "acceptance.txt");
  for (const file of [...privateFiles, skill, workspaceFile]) {
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, marker, { mode: 0o600 });
  }
  const policy = createQuotaToolPermissions({ workspace: context.workspace, codexHome: home, transportAudit: context.transportAudit });
  const exec = async (command: string[], permissionProfile?: string) => {
    const result = await router.request({ method: "command/exec", id: `privacy-${generation}-${randomUUID()}`,
      params: { command, cwd: context.workspace, timeoutMs: 5_000, outputBytesCap: 4096,
        ...(permissionProfile ? { permissionProfile } : {}) } }, 10_000);
    if (!isRecord(result) || typeof result.exitCode !== "number" || typeof result.stdout !== "string") {
      throw new Error("Native privacy acceptance returned an invalid result.");
    }
    return result;
  };
  // Check the startup default as well as explicit profiles used by turns.
  for (const profile of [undefined, policy.readOnlyId, policy.workspaceWriteId]) {
    const control = await exec(["/bin/cat", workspaceFile, skill], profile);
    if (control.exitCode !== 0 || control.stdout !== marker + marker) {
      throw new Error("Native privacy sandbox could not read its authorized workspace and skill.");
    }
    const denied = await exec(["/bin/cat", ...privateFiles], profile);
    if (denied.exitCode === 0 || denied.stdout !== "") {
      throw new Error("Native privacy sandbox exposed a private canary.");
    }
    const write = await exec(["/bin/sh", "-c", 'printf approved > "$1"', "acceptance", workspaceFile], profile);
    if ((write.exitCode === 0) !== (profile === policy.workspaceWriteId)) {
      throw new Error("Native privacy sandbox did not enforce workspace write permissions.");
    }
    await writeFile(workspaceFile, marker, { mode: 0o600 });
  }
}

async function acceptOneGeneration(context: WorkerLaunchContext, generation: number) {
  const runtime = new LocalGatewayWorkerRuntimeFactory({
    runtimeInstanceId: "container-acceptance",
  }).create(context);
  const router = new AppServerRpcRouter(runtime.transport);
  try {
    await runtime.start();
    const initialize = await router.request({
      method: "initialize",
      id: `acceptance-initialize-${generation}-${randomUUID()}`,
      params: {
        clientInfo: {
          name: "aibrain_container_acceptance",
          title: "AiBrain Container Acceptance",
          version: "1.0.0",
        },
        capabilities: {
          experimentalApi: true,
          requestAttestation: false,
        },
      },
    }, 10_000);
    if (!isRecord(initialize)) throw new Error("Codex initialize returned an invalid result.");
    await router.notify({ method: "initialized" }, `acceptance-initialized-${generation}-${randomUUID()}`);
    const account = await router.request({
      method: "account/read",
      id: `acceptance-account-read-${generation}-${randomUUID()}`,
      params: { refreshToken: false },
    }, 10_000);
    if (!isRecord(account) || !("account" in account)) {
      throw new Error("Codex account/read returned an invalid result.");
    }
    await acceptPrivateFilesystem(router, context, generation);
    const health = await runtime.health();
    if (!health.healthy || health.state !== "running") {
      throw new Error("Private worker gateway was not healthy after App Server RPC acceptance.");
    }
  } finally {
    await Promise.allSettled([
      router.close(),
      runtime.transport.close(),
      stopRuntime(runtime),
    ]);
    await rm(path.join("/var/lib/aibrain-restores", `acceptance-${context.userId}-${generation}.txt`), { force: true });
  }
}

async function stopRuntime(runtime: ManagedWorkerRuntime) {
  await runtime.stop();
}

export async function runContainerAppServerAcceptance() {
  if (process.env.AIBRAIN_CODEX_EXPECTED_VERSION?.trim() !== EXPECTED_CODEX_VERSION) {
    throw new Error(`App Server acceptance requires Codex ${EXPECTED_CODEX_VERSION}.`);
  }
  const { usersRoot } = await installationAcceptanceConfig();
  const { context, userRoot } = await createContext(usersRoot);
  try {
    await acceptOneGeneration(context, 1);
    await acceptOneGeneration(context, 2);
  } finally {
    await rm(userRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  withDeadline(runContainerAppServerAcceptance(), "Codex App Server container acceptance").then(
    () => process.stdout.write("Codex App Server container acceptance passed.\n"),
    (error: unknown) => {
      process.stderr.write(`Codex App Server container acceptance failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
      process.exitCode = 78;
    },
  );
}
