import { isChatStreamEvent, type ChatStreamEvent } from "@/lib/chat-contract";
import { publicActivityText } from "@/ui/public-activity";
import type { DynamicToolSpec } from "../../contracts/codex/0.153.4/types/v2/DynamicToolSpec";
import type { DynamicToolCallParams } from "../../contracts/codex/0.153.4/types/v2/DynamicToolCallParams";
import type { DynamicToolCallResponse } from "../../contracts/codex/0.153.4/types/v2/DynamicToolCallResponse";

export const TASK_REPORT_NAMESPACE = "neska_task";
export const TASK_REPORT_TOOLS: readonly DynamicToolSpec[] = [{
  type: "namespace", name: TASK_REPORT_NAMESPACE,
  description: "Publish factual public task progress. This never authorizes or executes a business action.",
  tools: [{ type: "function", name: "report", description: "Report a plan, nonfatal incident, or public decision criterion. Never include private reasoning, credentials, commands or internal paths.",
    inputSchema: { type: "object", additionalProperties: false, required: ["event"], properties: { event: { type: "object" } } } }],
}];

export const TASK_REPORT_INSTRUCTIONS = `Use neska_task.report for factual task plans, step tool display names, requiresApproval, progress {done,total}, current object, nonfatal incidents with an explicit zero-based stepIndex, and public decisions with criterion. Report only observed facts, never guesses or internal reasoning. Public text is Catalan. Incident actions are retry and skip; these request steering and never authorize tool effects. Use an incident id that stays stable on updates. Resolve an incident only after observing the result. In plan mode publish pending steps and stop after proposing them; do not execute the proposed actions. Omit unavailable fields.`;

export async function handleTaskReport(params: DynamicToolCallParams, context: {
  runtimeThreadId: string; runtimeTurnId: string; stepCount: number;
  emit(event: ChatStreamEvent): Promise<void>;
}): Promise<DynamicToolCallResponse> {
  const answer = (success: boolean, text: string): DynamicToolCallResponse => ({ success, contentItems: [{ type: "inputText", text }] });
  if (params.namespace !== TASK_REPORT_NAMESPACE || params.tool !== "report" ||
      params.threadId !== context.runtimeThreadId || params.turnId !== context.runtimeTurnId ||
      !params.arguments || typeof params.arguments !== "object" || Array.isArray(params.arguments) ||
      Object.keys(params.arguments).length !== 1 || !("event" in params.arguments)) {
    return answer(false, "El report no pertany a aquest torn.");
  }
  const event = params.arguments.event;
  if (!isChatStreamEvent(event) || !["plan", "incident", "activity"].includes(event.type)) return answer(false, "Report no vàlid.");
  const safe = (value: string) => publicActivityText(value, 1_000) === value;
  if (event.type === "plan" && (event.steps.length < 1 || event.steps.length > 100 ||
      event.steps.some(step => !safe(step.step) || (step.tool && !safe(step.tool)) || (step.current && !safe(step.current))) ||
      (event.explanation && !safe(event.explanation)))) return answer(false, "El pla conté text no publicable.");
  if (event.type === "incident" && (event.incident.stepIndex >= context.stepCount ||
      !safe(event.incident.message) || (event.incident.detail && !safe(event.incident.detail)))) return answer(false, "La incidència no correspon a un pas publicat.");
  if (event.type === "activity" && (event.item.kind !== "decision" || event.item.output ||
      !safe(event.item.label) || !safe(event.item.criterion ?? "") || (event.item.object && !safe(event.item.object)) ||
      (event.item.detail && !safe(event.item.detail)))) return answer(false, "Només es publica la decisió i el criteri.");
  const now = new Date().toISOString();
  const observed: ChatStreamEvent = event.type === "plan" ? { type: "plan", explanation: event.explanation, steps: event.steps.map(step => ({
    step: step.step, status: step.status, ...(step.tool ? { tool: step.tool } : {}),
    ...(step.requiresApproval !== undefined ? { requiresApproval: step.requiresApproval } : {}),
    ...(step.progress ? { progress: step.progress } : {}), ...(step.current ? { current: step.current } : {}),
  })) } : event.type === "incident" ? { type: "incident", incident: {
    id: event.incident.id, stepIndex: event.incident.stepIndex, message: event.incident.message,
    ...(event.incident.detail ? { detail: event.incident.detail } : {}),
    actions: event.incident.actions, status: event.incident.status, timestamp: now,
  } } : event.type === "activity" ? { type: "activity", item: {
    id: event.item.id, kind: "decision", label: event.item.label, status: event.item.status,
    criterion: event.item.criterion, ...(event.item.object ? { object: event.item.object } : {}),
    ...(event.item.detail ? { detail: event.item.detail } : {}), timestamp: now,
  } } : event;
  await context.emit(observed);
  return answer(true, "Report publicat.");
}
