import { NextResponse } from "next/server";
import { getSession } from "@/auth/session";
import { isSameOriginMutation } from "@/auth/request-security";
import { loadInstallationConfig } from "@/config/installation";
import { isIncidentActionRequest } from "@/lib/chat-contract";
import { getThreadRuntimeContext } from "@/workbench/store";
import { FileTurnProjectionStore } from "@/workbench/turn-projection-store";
import { WorkbenchConflictError, WorkbenchNotFoundError } from "@/workbench/errors";
import { workbenchErrorResponse } from "@/workbench/http";
import { POST as steerTurn } from "@/app/api/runtime/turns/control/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await isSameOriginMutation(request)) return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticat." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!isIncidentActionRequest(body)) return NextResponse.json({ error: "L’acció d’incidència no és vàlida." }, { status: 400 });
  try {
    const installation = await loadInstallationConfig();
    if (session.provider !== "local" || installation.installationId !== session.tenant.id) return NextResponse.json({ error: "La sessió no pertany a aquest runtime." }, { status: 403 });
    await getThreadRuntimeContext(session, body.threadId);
    const projections = new FileTurnProjectionStore({ installationId: session.tenant.id, userId: session.user.id, usersRoot: installation.paths.usersRoot });
    return await projections.withTaskActionLock(body.threadId, body.assistantMessageId, async () => {
      const projection = await projections.read(body.threadId, body.assistantMessageId);
      if (!projection) throw new WorkbenchNotFoundError("La incidència no existeix.");
      const incident = projection.message.incidents?.find(item => item.id === body.incidentId);
      if (!incident || !incident.actions.includes(body.action)) throw new WorkbenchConflictError("Aquesta incidència no ofereix l’acció demanada.");
      if (projection.message.activity.some(item => item.id === `steer:${body.clientRequestId}`)) return NextResponse.json({ ok: true, idempotent: true });
      if (projection.message.status !== "streaming" || incident.status !== "open") throw new WorkbenchConflictError("La incidència ja no accepta aquesta acció.");
      const step = projection.message.plan[incident.stepIndex];
      const headers = new Headers(request.headers);
      headers.set("Content-Type", "application/json");
      const response = await steerTurn(new Request(request.url, { method: "POST", headers, signal: request.signal, body: JSON.stringify({
        action: "steer", threadId: body.threadId, assistantMessageId: body.assistantMessageId,
        clientRequestId: body.clientRequestId, userMessageId: body.userMessageId,
        message: `${body.action === "retry" ? "Torna a intentar" : "Salta"} el pas ${incident.stepIndex + 1}: ${step.step}. Incidència: ${incident.message}. Respecta els permisos actuals i publica el resultat observat.`,
      }) }));
      if (!response.ok) return response;
      // A steer acknowledgement is not success of the underlying operation.
      const next = await projections.applyLocalEvent(body.threadId, body.assistantMessageId, { type: "incident", incident: {
        ...incident, status: body.action === "retry" ? "retry_requested" : "skip_requested",
      } });
      return NextResponse.json({ ok: true, message: next.message }, { headers: { "Cache-Control": "private, no-store" } });
    });
  } catch (error) { return workbenchErrorResponse(error, "No s’ha pogut aplicar l’acció d’incidència."); }
}
