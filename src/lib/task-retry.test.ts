import { describe, expect, it } from "vitest";
import { isTaskRetryRequest, type ChatMessage } from "@/lib/chat-contract";
import { MAX_TASK_RETRIES, nextTaskRetry, retryAttemptOf, retryDisplayText } from "@/lib/task-retry";

const at = "2026-11-05T09:00:00.000Z";
const user = (content: string, id = `u-${content}`): ChatMessage => ({
  id, role: "user", content, createdAt: at, status: "complete", activity: [], plan: [], approvals: [], diff: "", attachments: [], artifacts: [], toolResults: [],
});
const assistant = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "a1", role: "assistant", content: "Fet.", createdAt: at, status: "complete", activity: [], plan: [], approvals: [], diff: "", attachments: [], artifacts: [], toolResults: [],
  ...overrides,
});
const unfinished = assistant({ plan: [{ step: "Llegir factures", status: "completed" }, { step: "Enviar l’informe", status: "pending" }] });
const failedTool = (title: string, status: "complete" | "failed") => ({ id: `${title}-${status}`, kind: "command" as const, title, status, summary: null, output: null, sourceIds: [], createdAt: at });

describe("automatic task retry", () => {
  it("retries a failed task with the open work in the instruction", () => {
    const retry = nextTaskRetry([user("Concilia octubre"), unfinished], 1);
    expect(retry?.attempt).toBe(1);
    expect(retry?.instructions).toContain("intent 1 de 3");
    expect(retry?.instructions).toContain("2. Enviar l’informe");
    expect(retry?.instructions).not.toContain("Llegir factures");
    expect(retry?.instructions).toContain("no autorització");
  });

  it("names broken files and unrecovered actions, not recovered ones", () => {
    const retry = nextTaskRetry([user("x"), assistant({
      artifacts: [{ id: "d", type: "document", name: "informe.pdf", url: "/x", kind: "pdf", mimeType: "application/pdf", size: 1, status: "error", pages: null, previewUrl: null, publicationStatus: null, publicationError: null, targetLabel: null, error: "x" }],
      toolResults: [failedTool("Llegir CSV", "failed"), failedTool("Llegir CSV", "complete"), failedTool("Enviar correu", "failed")],
    })], 1);
    expect(retry?.instructions).toContain("informe.pdf");
    expect(retry?.instructions).toContain("Enviar correu");
    expect(retry?.instructions).not.toContain("Llegir CSV");
  });

  it("does not retry passed, live, stopped or proposed tasks", () => {
    expect(nextTaskRetry([user("x"), assistant()], 1)).toBeNull();
    expect(nextTaskRetry([user("x"), { ...unfinished, status: "streaming" }], 1)).toBeNull();
    expect(nextTaskRetry([user("x"), { ...unfinished, status: "stopped" }], 1)).toBeNull();
    expect(nextTaskRetry([user("x"), { ...unfinished, planProposal: { revision: 1, status: "proposed" } }], 1)).toBeNull();
    expect(nextTaskRetry([user("x")], 0)).toBeNull();
  });

  it("never asks again for something the person declined", () => {
    const declined = { ...unfinished, approvals: [{ id: "p", threadId: "t", turnId: "r", itemId: "i", kind: "command" as const, title: "t", detail: "d", status: "declined" as const }] };
    expect(nextTaskRetry([user("x"), declined], 1)).toBeNull();
  });

  it("does not retry a document that is still converting", () => {
    const converting = assistant({ artifacts: [{ id: "d", type: "document", name: "a.pdf", url: "/x", kind: "pdf", mimeType: "application/pdf", size: 1, status: "processing", pages: null, previewUrl: null, publicationStatus: null, publicationError: null, targetLabel: null, error: null }] });
    expect(nextTaskRetry([user("x"), converting], 1)).toBeNull();
  });

  it("stops after three attempts, counted from the turn's own request", () => {
    expect(nextTaskRetry([user(retryDisplayText(1)), unfinished], 1)?.attempt).toBe(2);
    expect(nextTaskRetry([user(retryDisplayText(2)), unfinished], 1)?.attempt).toBe(3);
    expect(nextTaskRetry([user(retryDisplayText(MAX_TASK_RETRIES)), unfinished], 1)).toBeNull();
    // The marker must be exact and come from a user message.
    expect(retryAttemptOf(user("Reintent automàtic 1 de 3"))).toBe(1);
    expect(retryAttemptOf(user("Reintent automàtic 1 de 3, i també fes X"))).toBeNull();
    expect(retryAttemptOf({ role: "assistant", content: retryDisplayText(1) })).toBeNull();
  });

  it("accepts only a bare retry request with no files, mentions or references", () => {
    const execution = {
      projectId: "11111111-1111-4111-8111-111111111111", threadId: "22222222-2222-4222-8222-222222222222",
      userMessageId: "33333333-3333-4333-8333-333333333333", assistantMessageId: "44444444-4444-4444-8444-444444444444",
      message: retryDisplayText(1), displayMessage: undefined,
      preferences: { tone: "balanced", language: "ca", showActivity: false },
      options: { mode: "agent", model: null, effort: null, webSearch: true, imageGeneration: false, skill: null, attachments: [] },
    };
    const request = { threadId: execution.threadId, assistantMessageId: "55555555-5555-4555-8555-555555555555", execution };
    expect(isTaskRetryRequest(request)).toBe(true);
    expect(isTaskRetryRequest({ ...request, extra: true })).toBe(false);
    expect(isTaskRetryRequest({ ...request, assistantMessageId: execution.assistantMessageId })).toBe(false);
    expect(isTaskRetryRequest({ ...request, execution: { ...execution, threadId: "66666666-6666-4666-8666-666666666666" } })).toBe(false);
    expect(isTaskRetryRequest({ ...request, execution: { ...execution, options: { ...execution.options, connectorMentions: ["gmail"] } } })).toBe(false);
    expect(isTaskRetryRequest({ ...request, execution: { ...execution, options: { ...execution.options, documentUploadIds: ["x"] } } })).toBe(false);
    expect(isTaskRetryRequest({ ...request, execution: { ...execution, options: { ...execution.options, mode: "plan" } } })).toBe(false);
  });
});
