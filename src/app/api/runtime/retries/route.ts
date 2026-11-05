import { NextResponse } from "next/server";
import { getSession } from "@/auth/session";
import { isSameOriginMutation } from "@/auth/request-security";
import { loadInstallationConfig } from "@/config/installation";
import { isTaskRetryRequest } from "@/lib/chat-contract";
import { isChatRequest } from "@/lib/demo-runtime";
import { nextTaskRetry, retryDisplayText } from "@/lib/task-retry";
import { getThread, getThreadRuntimeContext } from "@/workbench/store";
import { FileTurnProjectionStore } from "@/workbench/turn-projection-store";
import { WorkbenchConflictError, WorkbenchNotFoundError } from "@/workbench/errors";
import { workbenchErrorResponse } from "@/workbench/http";
import { POST as startChat } from "@/app/api/chat/route";

export const runtime = "nodejs";

/**
 * Starts the bounded automatic retry of a finished task that failed its
 * checks. The retry is decided and worded here, from the persisted thread;
 * the request only names which task and reserves the new turn's IDs. It then
 * runs as an ordinary chat turn, through the same permission fences.
 */
export async function POST(request: Request) {
  if (!await isSameOriginMutation(request)) return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticat." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!isTaskRetryRequest(body) || !isChatRequest(body.execution)) {
    return NextResponse.json({ error: "El reintent no és vàlid." }, { status: 400 });
  }
  try {
    const installation = await loadInstallationConfig();
    if (session.provider !== "local" || installation.installationId !== session.tenant.id) return NextResponse.json({ error: "La sessió no pertany a aquest runtime." }, { status: 403 });
    // Resolve editor/owner access before any private read.
    const context = await getThreadRuntimeContext(session, body.threadId);
    if (context.projectId !== body.execution.projectId) throw new WorkbenchConflictError("La tasca no pertany a aquest projecte.");
    const projections = new FileTurnProjectionStore({ installationId: session.tenant.id, userId: session.user.id, usersRoot: installation.paths.usersRoot });
    return await projections.withTaskActionLock(body.threadId, body.assistantMessageId, async () => {
      const thread = await getThread(session, body.threadId);
      const index = thread.messages.findIndex(message => message.id === body.assistantMessageId);
      if (index < 0) throw new WorkbenchNotFoundError("La tasca no existeix.");
      // Only the latest task is retried. A replay of this same retry (the
      // stream reattaching) finds its own user message right after it.
      const following = thread.messages[index + 1];
      const replay = following?.id === body.execution.userMessageId;
      if (following && !replay) throw new WorkbenchConflictError("La conversa ja ha continuat.");
      const retry = nextTaskRetry(thread.messages, index);
      if (!retry) throw new WorkbenchConflictError("Aquesta tasca no necessita cap reintent automàtic.");
      const execution = { ...body.execution, message: retry.instructions, displayMessage: retryDisplayText(retry.attempt) };
      const headers = new Headers(request.headers);
      headers.set("Content-Type", "application/json");
      return startChat(new Request(request.url, { method: "POST", headers, body: JSON.stringify(execution), signal: request.signal }));
    });
  } catch (error) { return workbenchErrorResponse(error, "No s’ha pogut tornar a provar la tasca."); }
}
