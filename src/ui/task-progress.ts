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
  const waiting = message.approvals.some((approval) => approval.status === "pending");
  const state: TaskState = waiting
    ? "waiting"
    : message.status === "streaming"
      ? "working"
      : message.status === "complete"
        ? "done"
        : "stopped";
  const live = state === "working" || state === "waiting";
  const current = live ? steps.findIndex((step) => step.status === "in_progress") : -1;
  const done = steps.filter((step) => step.status === "completed" || (!live && state === "done" && step.status === "in_progress")).length;
  return { state, steps, done, total: steps.length, current };
}

/** The panel and the header only appear for work that has steps. */
export function isMultiStepTask(progress: TaskProgress) {
  return progress.total >= 2;
}
