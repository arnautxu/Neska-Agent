import type { ChatMessage, ChatStreamEvent, ComposerMode } from "@/lib/chat-contract";

/** Times are observations of explicit step transitions, not estimates. */
export function observeTaskEvent(message: ChatMessage, event: ChatStreamEvent, now: string): ChatStreamEvent {
  if (event.type === "approval" && event.item.stepIndex === undefined) {
    const active = message.plan.map((step, index) => step.status === "in_progress" ? index : -1).filter(index => index >= 0);
    if (active.length === 1) return { ...event, item: { ...event.item, stepIndex: active[0] } };
  }
  if (event.type !== "plan") return event;
  return { ...event, steps: event.steps.map((step, index) => {
    const previous = message.plan[index];
    const same = previous?.step === step.step;
    const startedAt = step.startedAt ?? (same ? previous.startedAt : undefined) ??
      (step.status === "in_progress" ? now : undefined);
    const completedAt = step.completedAt ?? (same ? previous.completedAt : undefined) ??
      (same && previous.status !== step.status && ["completed", "failed", "skipped"].includes(step.status) ? now : undefined);
    return { ...step, ...(startedAt ? { startedAt } : {}), ...(completedAt ? { completedAt } : {}) };
  }) };
}

export function proposalAtCompletion(message: ChatMessage, mode: ComposerMode): ChatStreamEvent | null {
  return mode === "plan" && message.plan.length > 0 && !message.planProposal
    ? { type: "proposal", proposal: { status: "proposed", revision: 1 } } : null;
}
