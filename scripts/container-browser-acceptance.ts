/** Real browser/CDP acceptance, without remote navigation or model credentials. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { ChromeCdpRuntime } from "@/runtime/browser/chrome-runtime";
import type { PrivateCdpClient } from "@/runtime/browser/cdp-client";
import type { BrowserRuntimeContext } from "@/runtime/browser/types";

const config = JSON.parse(await readFile("/etc/aibrain/installation.json", "utf8"));
assert.equal(config.paths.usersRoot, "/var/lib/aibrain/data/users");
const contexts: BrowserRuntimeContext[] = [];
const runtimes: ChromeCdpRuntime[] = [];

async function createBrowser() {
  const userId = randomUUID();
  const browserRoot = path.join(config.paths.usersRoot, userId, "browser");
  const context: BrowserRuntimeContext = {
    installationId: config.installationId, userId, browserSessionId: randomUUID(),
    generation: 1, recovering: false,
    roots: { browserRoot, profile: path.join(browserRoot, "profile"),
      downloads: path.join(browserRoot, "downloads"), stateFile: path.join(browserRoot, "state.json") },
  };
  contexts.push(context);
  await mkdir(context.roots.profile, { recursive: true, mode: 0o700 });
  await mkdir(context.roots.downloads, { recursive: true, mode: 0o700 });
  const runtime = new ChromeCdpRuntime(context, {
    executablePath: "/usr/local/bin/aibrain-chrome", expectedVersion: "155.0.8059.39",
  });
  runtimes.push(runtime);
  await runtime.start();
  return runtime;
}

async function evaluate(runtime: ChromeCdpRuntime, thread: string, expression: string) {
  // Test fixtures use the real owned private CDP pipe; no product route or
  // network policy is changed to create the synthetic offline document.
  const owned = runtime as unknown as {
    requireThreadPage(id: string): Promise<{ sessionId: string }>;
    requireBrowser(): PrivateCdpClient;
  };
  const page = await owned.requireThreadPage(thread);
  const result = await owned.requireBrowser().send<{ result: { value: unknown } }>(
    "Runtime.evaluate", { expression, returnByValue: true }, { sessionId: page.sessionId });
  return result.result.value;
}

const deadline = setTimeout(() => { console.error("Native browser acceptance timed out"); process.exit(1); }, 60_000);
try {
  const first = await createBrowser();
  const second = await createBrowser();
  const thread = randomUUID();
  await first.agentNavigate(thread, "about:blank");
  await second.agentNavigate(thread, "about:blank");
  await evaluate(first, thread, 'document.body.innerHTML="<input id=entry style=position:absolute;left:10px;top:10px;width:400px;height:40px>";window.privateCanary="employee-a"');
  assert.equal(await evaluate(second, thread, 'typeof window.privateCanary'), "undefined");
  await assert.rejects(first.agentNavigate(thread, "file:///etc/aibrain/installation.json"));
  await assert.rejects(first.agentNavigate(thread, "http://169.254.169.254/latest/meta-data/"));
  await first.takeOver();
  for (const event of ["mousePressed", "mouseReleased"] as const) {
    await first.dispatchInput(thread, { kind: "mouse", event, x: 30, y: 30, button: "left", clickCount: 1 });
  }
  const text = "Català ñ 日本語 👩🏽‍💻";
  await first.dispatchInput(thread, { kind: "key", event: "char", key: "Unidentified", text });
  assert.equal(await evaluate(first, thread, 'document.querySelector("#entry").value'), text);
  await first.releaseTakeover();
  await assert.rejects(first.dispatchInput(thread, { kind: "key", event: "keyDown", key: "x", text: "x" }),
    { code: "CHROME_TAKEOVER_REQUIRED" });
  const frame = await first.captureFrame(thread);
  assert.equal(frame.mediaType, "image/png");
  assert.equal(Buffer.from(frame.dataBase64, "base64").subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  console.log(JSON.stringify({ browser: "155.0.8059.39", sandbox: "production-bubblewrap",
    privateCdp: "PASS", independentEmployees: "PASS", unicodeInput: "PASS", pngCapture: "PASS",
    localFilesAndMetadataDenied: "PASS", takeoverAuthorization: "PASS" }));
} finally {
  for (const runtime of runtimes.reverse()) await runtime.stop();
  for (const context of contexts) await rm(path.dirname(context.roots.browserRoot), { recursive: true, force: true });
  clearTimeout(deadline);
}
