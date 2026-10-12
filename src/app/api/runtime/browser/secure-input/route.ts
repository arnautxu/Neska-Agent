import { NextResponse } from "next/server";
import { isSameOriginMutation } from "@/auth/request-security";
import { getLocalBrowserRequestAuth } from "@/runtime/browser/route-security";
import { browserAuthError } from "@/runtime/browser/http-response";
import { privateBrowserInputStatus, privateBrowserInputAction } from "@/runtime/browser/server-service";
import { getThreadRuntimeContext } from "@/workbench/store";
import { loadInstallationConfig } from "@/config/installation";
import { resolveServerTurnPermissions } from "@/runtime/permission-turn";
import { PRIVATE_INPUT_PRESETS, type PrivateInputPreset } from "@/runtime/browser/secure-input-contract";
import { isUuid } from "@/workbench/types";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
function rejected(status = 409) {
  // No error objects, bodies, values, page messages or causes reach logging/response.
  return NextResponse.json({ error: "La petició privada no s’ha pogut verificar. Revisa la pantalla.", code: "PRIVATE_INPUT_REJECTED" }, { status, headers });
}

export async function GET(request: Request) {
  const auth = await getLocalBrowserRequestAuth();
  if ("error" in auth) return browserAuthError(auth.error);
  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId || !isUuid(threadId)) return rejected(400);
  try {
    await getThreadRuntimeContext(auth.session, threadId);
    return NextResponse.json(await privateBrowserInputStatus({
      installationId: auth.session.tenant.id, userId: auth.session.user.id, threadId,
    }), { headers });
  } catch { return rejected(404); }
}

async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export async function POST(request: Request) {
  if (!await isSameOriginMutation(request)) return rejected(403);
  const auth = await getLocalBrowserRequestAuth();
  if ("error" in auth) return browserAuthError(auth.error);
  const body = await boundedBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return rejected(400);
  const record = body as Record<string, unknown>;
  const allowed = record.action === "fill" ? ["action", "threadId", "browserSessionId", "requestId", "values"]
    : record.action === "start" ? ["action", "threadId", "browserSessionId", "requestId", "preset"]
    : ["action", "threadId", "browserSessionId", "requestId"];
  if (Object.keys(record).length !== allowed.length || Object.keys(record).some(key => !allowed.includes(key)) ||
      typeof record.threadId !== "string" || !isUuid(record.threadId) ||
      typeof record.browserSessionId !== "string" || !isUuid(record.browserSessionId) ||
      typeof record.requestId !== "string" || !isUuid(record.requestId) ||
      !["start", "fill", "dismiss", "finish"].includes(String(record.action)) ||
      record.action === "start" && !PRIVATE_INPUT_PRESETS.includes(record.preset as PrivateInputPreset)) return rejected(400);
  try {
    const context = await getThreadRuntimeContext(auth.session, record.threadId);
    const installation = await loadInstallationConfig();
    const permissions = await resolveServerTurnPermissions(installation, {
      installationId: auth.session.tenant.id, userId: auth.session.user.id,
      projectId: context.projectId, turnId: record.requestId,
    });
    const exact = permissions.rules.filter(rule => rule.ruleId === "browser.execute" && rule.action === "execute");
    const rules = exact.length ? exact : permissions.rules.filter(rule => rule.ruleId === "tools.execute" && rule.action === "execute");
    if (rules.some(rule => rule.effect === "deny") || !rules.some(rule => rule.effect === "allow")) return rejected(403);
    await privateBrowserInputAction({
      installationId: auth.session.tenant.id, userId: auth.session.user.id,
      threadId: record.threadId, browserSessionId: record.browserSessionId,
      requestId: record.requestId, action: record.action as "start" | "fill" | "dismiss" | "finish",
      ...(record.action === "start" ? { preset: record.preset as PrivateInputPreset } : {}),
      values: record.action === "fill" ? record.values as Record<string, string> : {},
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch { return rejected(); }
}
