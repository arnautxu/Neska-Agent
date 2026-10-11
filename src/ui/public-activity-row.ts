import type { ActivityItem } from "@/lib/chat-contract";
import { publicActivityText, publicCommandTitle, publicProjectPath } from "./public-activity";
const verbs = { command: "Executa", file: "Revisa", tool: "Consulta", web: "Cerca", plan: "Planifica", agent: "Coordina", decision: "Decideix", system: "Actualitza", reasoning: "" };
/** Display only explicit, public facts. Legacy rows may have no time/object. */
export function publicActivityRow(item: ActivityItem) {
  if (item.kind === "reasoning" || item.status === "pending" || /^(?:runtime-|client-request)/u.test(item.id)) return null;
  const label = publicActivityText(item.label, 160);
  if (!label) return null;
  const path = item.files?.[0]?.path;
  const object = item.object ? publicActivityText(item.object, 240) : path && publicProjectPath(path) ? path : null;
  const detail = item.kind === "decision" ? publicActivityText(item.criterion, 240)
    : item.kind === "command" ? publicCommandTitle(item.label)
    : publicActivityText(item.detail ?? item.label, 240);
  return { id: item.id, verb: verbs[item.kind], object, detail,
    translateDetail: item.kind === "command", timestamp: item.timestamp ?? null, failed: item.status === "failed" };
}
