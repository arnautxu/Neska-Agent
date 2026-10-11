import type { ChatMessage, PlanStep } from "@/lib/chat-contract";
import { publicActivityText } from "@/ui/public-activity";

export type TaskState = "working" | "waiting" | "done" | "stopped";

export type TaskProgress = {
  state: TaskState;
  steps: PlanStep[];
  done: number;
  total: number;
  /** Index of the step Neska is on, or -1 when nothing is in progress. */
  current: number;
};

/** One factual summary of a turn's plan. It never invents steps: the plan,
 * approvals and status all come from the persisted assistant message. */
export function taskProgress(message: Pick<ChatMessage, "plan" | "approvals" | "status">): TaskProgress {
  const steps = message.plan.flatMap((step) => {
    const label = publicActivityText(step.step, 1_000);
    return label ? [{ ...step, step: label }] : [];
  });
  // A stopped or failed turn stays stopped even if an approval it raised was
  // never resolved; only a live or completed turn can be waiting on one.
  const terminal = message.status === "stopped" || message.status === "error";
  const waiting = !terminal && message.approvals.some((approval) => approval.status === "pending");
  const state: TaskState = terminal
    ? "stopped"
    : waiting
      ? "waiting"
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

/** Steps can finish out of order, so completion is read from each step's own
 * status; a finished turn also closes the step it was still on. */
export function isStepDone(step: PlanStep, state: TaskState) {
  return step.status === "completed" || (state === "done" && step.status === "in_progress");
}

/** The panel and the header only appear for work that has steps. */
export function isMultiStepTask(progress: TaskProgress) {
  return progress.total >= 2;
}
