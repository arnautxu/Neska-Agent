import { NextResponse } from "next/server";
import { getSession } from "@/auth/session";
import { isSameOriginMutation } from "@/auth/request-security";
import { loadInstallationConfig } from "@/config/installation";
import { isPlanMutationRequest } from "@/lib/chat-contract";
import { isChatRequest } from "@/lib/demo-runtime";
import { mutateProposedPlan, proposedPlanExecutionText } from "@/runtime/task-actions";
import { getThreadRuntimeContext, getThread, finishThreadTurn } from "@/workbench/store";
import { FileTurnProjectionStore } from "@/workbench/turn-projection-store";
import { WorkbenchConflictError, WorkbenchNotFoundError } from "@/workbench/errors";
import { workbenchErrorResponse } from "@/workbench/http";
import { POST as startChat } from "@/app/api/chat/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await isSameOriginMutation(request)) return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticat." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!isPlanMutationRequest(body) || (body.action === "execute" && !isChatRequest(body.execution))) {
    return NextResponse.json({ error: "El canvi de pla no és vàlid." }, { status: 400 });
  }
  try {
    const installation = await loadInstallationConfig();
    if (session.provider !== "local" || installation.installationId !== session.tenant.id) return NextResponse.json({ error: "La sessió no pertany a aquest runtime." }, { status: 403 });
    // Resolve editor/owner access before any private projection read.
    const context = await getThreadRuntimeContext(session, body.threadId);
    if (body.action === "execute" && context.projectId !== body.execution.projectId) throw new WorkbenchConflictError("El pla no pertany a aquest projecte.");
    const projections = new FileTurnProjectionStore({ installationId: session.tenant.id, userId: session.user.id, usersRoot: installation.paths.usersRoot });
    return await projections.withTaskActionLock(body.threadId, body.assistantMessageId, async () => {
      const thread = await getThread(session, body.threadId);
      const proposalIndex = thread.messages.findIndex(message => message.id === body.assistantMessageId);
      const original = thread.messages.slice(0, proposalIndex).findLast(message => message.role === "user");
      if (proposalIndex < 0 || !original) throw new WorkbenchNotFoundError("El pla no existeix.");
      if (!await projections.read(body.threadId, body.assistantMessageId)) throw new WorkbenchNotFoundError("El pla no existeix.");
      const projection = await projections.mutateTask(body.threadId, body.assistantMessageId, message => mutateProposedPlan(message, body));
      await finishThreadTurn(session, body.threadId, projection.message, null);
      if (body.action === "edit") return NextResponse.json({ message: projection.message }, { headers: { "Cache-Control": "private, no-store" } });
      // IDs were reserved atomically above. Replays can only resume that exact
      // durable execution, through the ordinary permission and dispatch fences.
      const execution = { ...body.execution, message: proposedPlanExecutionText(projection.message, original.content), displayMessage: "Executa el pla revisat" };
      const headers = new Headers(request.headers);
      headers.set("Content-Type", "application/json");
      return startChat(new Request(request.url, { method: "POST", headers, body: JSON.stringify(execution), signal: request.signal }));
    });
  } catch (error) { return workbenchErrorResponse(error, "No s’ha pogut aplicar el canvi de pla."); }
}
