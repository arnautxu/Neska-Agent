import type { ChatMessage, ToolResult } from "@/lib/chat-contract";

/**
 * Deterministic checks on a finished task, read only from the persisted
 * assistant message. Each check is something a program can evaluate and that
 * can fail; none asks a model whether the work looks right. The absence of an
 * error is never treated as a pass on its own: a check only exists when there
 * is something concrete to look at.
 */

export type TaskCheckStatus = "passed" | "failed" | "info";
/** `label` is an interface template; `values` fills its {placeholders}. */
export type TaskCheck = { id: "answer" | "steps" | "files" | "actions" | "declined"; status: TaskCheckStatus; label: string; values?: Record<string, number> };
export type TaskVerification = { status: "passed" | "attention"; checks: TaskCheck[]; passed: number; total: number };

type VerifiableMessage = Pick<ChatMessage, "status" | "content" | "plan" | "artifacts" | "toolResults" | "approvals">;

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** A failed action that later succeeded under the same title was retried;
 * only the ones that never recovered count. */
export function unrecoveredFailures(results: readonly ToolResult[]): ToolResult[] {
  return results.filter((result, index) => result.status === "failed" &&
    !results.slice(index + 1).some((later) => later.title === result.title && later.status === "complete"));
}

export function verifyTask(message: VerifiableMessage): TaskVerification | null {
  // Only a turn that claims to be finished is checked. Stopped, failed and
  // live turns already say what happened.
  if (message.status !== "complete") return null;
  const checks: TaskCheck[] = [];

  const hasAnswer = message.content.trim().length > 0 || message.artifacts.length > 0;
  checks.push(hasAnswer
    ? { id: "answer", status: "passed", label: "Hi ha una resposta" }
    : { id: "answer", status: "failed", label: "Ha acabat sense cap resposta" });

  if (message.plan.length > 0) {
    const open = message.plan.filter((step) => step.status !== "completed" && step.status !== "skipped");
    const finished = message.plan.length - open.length;
    checks.push(open.length === 0
      ? { id: "steps", status: "passed", label: plural(message.plan.length, "El pas està acabat", "Tots els passos acabats ({n})"), values: { n: message.plan.length } }
      : { id: "steps", status: "failed", label: plural(open.length, "Queda {n} pas sense acabar ({done} de {total})", "Queden {n} passos sense acabar ({done} de {total})"), values: { n: open.length, done: finished, total: message.plan.length } });
  }

  const files = message.artifacts.filter((artifact) => artifact.type === "document" || artifact.type === "image");
  if (files.length > 0) {
    const broken = files.filter((artifact) => artifact.type === "document" && artifact.status !== "ready");
    checks.push(broken.length === 0
      ? { id: "files", status: "passed", label: plural(files.length, "El fitxer s’ha generat bé", "Els {n} fitxers s’han generat bé"), values: { n: files.length } }
      : { id: "files", status: "failed", label: plural(broken.length, "{n} fitxer no s’ha acabat de generar", "{n} fitxers no s’han acabat de generar"), values: { n: broken.length } });
  }

  const results = message.toolResults ?? [];
  if (results.length > 0) {
    const unrecovered = unrecoveredFailures(results);
    checks.push(unrecovered.length === 0
      ? { id: "actions", status: "passed", label: plural(results.length, "L’acció ha anat bé", "Les {n} accions han anat bé"), values: { n: results.length } }
      : { id: "actions", status: "failed", label: plural(unrecovered.length, "{n} acció ha fallat", "{n} accions han fallat"), values: { n: unrecovered.length } });
  }

  // Declining is the person's choice, not a failure, but the result is
  // missing that effect and should say so.
  const declined = message.approvals.filter((approval) => approval.status === "declined");
  if (declined.length > 0) {
    checks.push({ id: "declined", status: "info", label: plural(declined.length, "{n} acció no s’ha fet perquè vas dir «Ara no»", "{n} accions no s’han fet perquè vas dir «Ara no»"), values: { n: declined.length } });
  }

  const graded = checks.filter((check) => check.status !== "info");
  const passed = graded.filter((check) => check.status === "passed").length;
  return { status: passed === graded.length ? "passed" : "attention", checks, passed, total: graded.length };
}
