import { describe, expect, it } from "vitest";
import { applyChatStreamEvent, isChatStreamEvent, isPlanStep, isPlanMutationRequest, isTaskIncident, type ChatMessage } from "@/lib/chat-contract";
import { mutateProposedPlan } from "@/runtime/task-actions";
import { observeTaskEvent, proposalAtCompletion } from "@/runtime/task-events";
import { handleTaskReport } from "@/runtime/task-report-tools";

const timestamp = "2026-10-11T12:00:00.000Z";
const id = "10000000-0000-4000-8000-000000000001";
const userMessageId = "10000000-0000-4000-8000-000000000002";
const assistantMessageId = "10000000-0000-4000-8000-000000000003";
const message = (): ChatMessage => ({ id, role: "assistant", content: "Pla", createdAt: timestamp, status: "complete", activity: [],
  plan: [{ step: "Llegir el resum", status: "pending", tool: "Drive" }], approvals: [], diff: "", attachments: [], artifacts: [],
  planProposal: { revision: 1, status: "proposed" } });
const execution = { projectId: id, threadId: id, userMessageId, assistantMessageId, message: "Executa", preferences: { tone: "balanced", language: "ca", showActivity: true },
  options: { mode: "agent", model: null, effort: null, webSearch: false, imageGeneration: false, skill: null, attachments: [] } } as const;

describe("additive task contract and server observations", () => {
  it("accepts old plans and validates bounded progress and chronological times", () => {
    expect(isPlanStep({ step: "Llegir", status: "pending" })).toBe(true);
    for (const status of ["failed", "skipped"]) expect(isPlanStep({ step: "Llegir", status })).toBe(true);
    expect(isPlanStep({ step: "Llegir", status: "in_progress", progress: { done: 29, total: 38 }, tool: "Drive", requiresApproval: true })).toBe(true);
    for (const progress of [{ done: 39, total: 38 }, { done: -1, total: 3 }, { done: 0, total: 0 }, { done: 1.2, total: 3 }]) {
      expect(isPlanStep({ step: "Llegir", status: "in_progress", progress })).toBe(false);
    }
    expect(isPlanStep({ step: "Llegir", status: "completed", startedAt: "2026-10-11T13:00:00.000Z", completedAt: timestamp })).toBe(false);
    expect(isPlanStep({ step: "Llegir", status: "completed", startedAt: "yesterday" })).toBe(false);
  });

  it("publishes time and approval binding only for observed transitions and an unambiguous step", () => {
    const active = { ...message(), plan: [{ step: "Llegir", status: "in_progress" as const }] };
    const observed = observeTaskEvent(message(), { type: "plan", explanation: null, steps: active.plan }, timestamp);
    expect(observed).toMatchObject({ steps: [{ startedAt: timestamp }] });
    const completed = observeTaskEvent(applyChatStreamEvent(message(), observed), { type: "plan", explanation: null, steps: [{ step: "Llegir", status: "completed" }] }, "2026-10-11T12:00:05.000Z");
    expect(completed).toMatchObject({ steps: [{ startedAt: timestamp, completedAt: "2026-10-11T12:00:05.000Z" }] });
    expect(observeTaskEvent(message(), { type: "plan", explanation: null, steps: [{ step: "Llegir", status: "completed" }] }, timestamp)).toMatchObject({ steps: [{ step: "Llegir", status: "completed" }] });
    expect(proposalAtCompletion({ ...active, planProposal: undefined }, "agent")).toBeNull();
    expect(proposalAtCompletion({ ...active, planProposal: undefined }, "plan")).toMatchObject({ type: "proposal" });
  });

  it("does not terminate a turn on a nonfatal incident or invent progress", () => {
    const incident = { id: "incident-1", stepIndex: 0, message: "No he pogut llegir el document", actions: ["retry", "skip"], status: "open", timestamp };
    expect(isTaskIncident(incident)).toBe(true);
    expect(isTaskIncident({ ...incident, actions: ["retry", "retry"] })).toBe(false);
    expect(isTaskIncident({ ...incident, actions: ["delete"] })).toBe(false);
    const next = applyChatStreamEvent({ ...message(), status: "streaming" }, { type: "incident", incident: incident as never });
    expect(next.status).toBe("streaming");
    expect(next.plan).toEqual(message().plan);
    expect(applyChatStreamEvent(next, { type: "incident", incident: { ...incident, stepIndex: 2 } as never })).toEqual(next);
    expect(isChatStreamEvent({ type: "activity", item: { id: "decision", kind: "decision", label: "Reclama la diferència", status: "complete", timestamp } })).toBe(false);
    expect(isChatStreamEvent({ type: "activity", item: { id: "decision", kind: "decision", label: "Reclama la diferència", criterion: "Supera el llindar configurat de 5 €", status: "complete", timestamp } })).toBe(true);
  });

  it("requires current revision, fences duplicate execution, and drops edited step metadata", () => {
    const edited = mutateProposedPlan(message(), { action: "edit", threadId: id, assistantMessageId: id, revision: 1, steps: ["Un altre pas"] });
    expect(edited.plan).toEqual([{ step: "Un altre pas", status: "pending" }]);
    expect(edited.planProposal?.revision).toBe(2);
    expect(() => mutateProposedPlan(edited, { action: "edit", threadId: id, assistantMessageId: id, revision: 1, steps: ["Pas"] })).toThrow();
    const request = { action: "execute", threadId: id, assistantMessageId: id, revision: 1, execution } as never;
    expect(isPlanMutationRequest(request)).toBe(true);
    const accepted = mutateProposedPlan(message(), request);
    expect(mutateProposedPlan(accepted, request)).toEqual(accepted);
    expect(() => mutateProposedPlan(accepted, { ...request as object, execution: { ...execution, assistantMessageId: userMessageId } } as never)).toThrow();
    expect(isPlanMutationRequest({ action: "edit", threadId: id, assistantMessageId: id, revision: 1, steps: ["Pas"], permission: "admin" })).toBe(false);
  });

  it("rejects foreign runtime reports, terminal events, and internal reasoning", async () => {
    const published: unknown[] = [];
    const context = { runtimeThreadId: "thread", runtimeTurnId: "turn", stepCount: 1, emit: async (event: unknown) => { published.push(event); } };
    const call = (event: unknown, threadId = "thread") => handleTaskReport({ namespace: "neska_task", tool: "report", threadId, turnId: "turn", callId: "call", arguments: { event } } as never, context);
    expect((await call({ type: "done" })).success).toBe(false);
    expect((await call({ type: "plan", explanation: null, steps: [{ step: "Llegir", status: "pending" }] }, "foreign")).success).toBe(false);
    expect((await call({ type: "activity", item: { id: "reason", kind: "reasoning", label: "Raonament", status: "complete" } })).success).toBe(false);
    expect((await call({ type: "plan", explanation: null, steps: [{ step: "Llegir", status: "pending", tool: "Drive" }] })).success).toBe(true);
    expect(published).toHaveLength(1);
  });
});
