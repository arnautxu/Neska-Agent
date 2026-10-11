import type { ChatMessage, PlanStep } from "@/lib/chat-contract";
import { publicActivityText } from "@/ui/public-activity";

export type TaskState = "working" | "waiting" | "done" | "stopped" | "failed" | "proposed" | "queued";

export type TaskProgress = {
  state: TaskState;
  steps: (PlanStep & { originalIndex: number })[];
  done: number;
  total: number;
  /** Index of the step Neska is on, or -1 when nothing is in progress. */
  current: number;
};

/** One factual summary of a turn's plan. It never invents steps: the plan,
 * approvals and status all come from the persisted assistant message. */
export function taskProgress(message: Pick<ChatMessage, "plan" | "approvals" | "status" | "planProposal" | "queue">): TaskProgress {
  const steps = message.plan.flatMap((step, originalIndex) => {
    const label = publicActivityText(step.step, 1_000);
    return label ? [{ ...step, step: label, originalIndex }] : [];
  });
  // A stopped or failed turn stays stopped even if an approval it raised was
  // never resolved; only a live or completed turn can be waiting on one.
  const terminal = message.status === "stopped" || message.status === "error";
  const waiting = !terminal && message.approvals.some((approval) => approval.status === "pending");
  const state: TaskState = message.status === "error" ? "failed" : terminal
    ? "stopped"
    : waiting
      ? "waiting"
      : message.planProposal?.status === "proposed" && message.status === "complete" ? "proposed"
      : message.queue?.state === "waiting" && message.status === "streaming" ? "queued"
      : message.status === "streaming"
        ? "working"
        : message.status === "complete"
          ? "done"
          : "stopped";
  const live = state === "working" || state === "waiting";
  const current = live ? steps.findIndex((step) => step.status === "in_progress") : -1;
  const done = steps.filter((step) => isStepDone(step, state)).length;
  return { state, steps, done, total: steps.length, current };
}

/** Completion is read from each step, even after the turn ends. */
export function isStepDone(step: PlanStep, _state: TaskState) {
  return step.status === "completed";
}

/** The panel and the header only appear for work that has steps. */
export function isMultiStepTask(progress: TaskProgress) {
  return progress.total >= 2;
}
