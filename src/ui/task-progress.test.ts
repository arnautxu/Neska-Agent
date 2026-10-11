import { describe, expect, it } from "vitest";
import type { ChatMessage, PlanStep } from "@/lib/chat-contract";
import { isMultiStepTask, isStepDone, taskProgress } from "@/ui/task-progress";

type Turn = Pick<ChatMessage, "plan" | "approvals" | "status">;

const plan: PlanStep[] = [
  { step: "Llegir les factures", status: "completed" },
  { step: "Creuar imports", status: "in_progress" },
  { step: "Redactar correus", status: "pending" },
];

function turn(overrides: Partial<Turn> = {}): Turn {
  return { plan, approvals: [], status: "streaming", ...overrides };
}

describe("taskProgress", () => {
  it("tracks the live step while the turn is streaming", () => {
    expect(taskProgress(turn())).toMatchObject({ state: "working", done: 1, total: 3, current: 1 });
  });

  it("reports waiting while an approval is pending", () => {
    const approvals = [{ status: "pending" }] as ChatMessage["approvals"];
    expect(taskProgress(turn({ approvals }))).toMatchObject({ state: "waiting", current: 1 });
  });

  it("counts the in-progress step as done once the turn completes", () => {
    expect(taskProgress(turn({ status: "complete" }))).toMatchObject({ state: "done", done: 2, current: -1 });
  });

  it("does not mark a step current or finished when the turn stopped", () => {
    expect(taskProgress(turn({ status: "stopped" }))).toMatchObject({ state: "stopped", done: 1, current: -1 });
    expect(taskProgress(turn({ status: "error" }))).toMatchObject({ state: "stopped" });
    const approvals = [{ status: "pending" }] as ChatMessage["approvals"];
    expect(taskProgress(turn({ status: "stopped", approvals }))).toMatchObject({ state: "stopped", current: -1 });
  });

  it("only treats plans with two or more steps as multi-step tasks", () => {
    expect(isMultiStepTask(taskProgress(turn()))).toBe(true);
    expect(isMultiStepTask(taskProgress(turn({ plan: plan.slice(0, 1) })))).toBe(false);
    expect(taskProgress(turn({ plan: [] })).total).toBe(0);
  });

  it("reads completion from each step when steps finish out of order", () => {
    const outOfOrder: PlanStep[] = [
      { step: "Llegir les factures", status: "pending" },
      { step: "Creuar imports", status: "completed" },
    ];
    const progress = taskProgress(turn({ plan: outOfOrder }));
    expect(progress.done).toBe(1);
    expect(progress.steps.map((step) => isStepDone(step, progress.state))).toEqual([false, true]);
  });
});
