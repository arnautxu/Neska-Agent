import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/chat-contract";
import { verifyTask } from "@/lib/task-verification";
import { taskProgress } from "@/ui/task-progress";

const base: ChatMessage = {
  id: "a1", role: "assistant", content: "Fet: conciliació enviada.", createdAt: "2026-11-03T09:00:00.000Z",
  status: "complete", activity: [], plan: [], approvals: [], diff: "", attachments: [], artifacts: [], toolResults: [],
};
const msg = (overrides: Partial<ChatMessage>): ChatMessage => ({ ...base, ...overrides });
const tool = (title: string, status: "complete" | "failed") => ({ id: `${title}-${status}-${Math.random()}`, kind: "command" as const, title, status, summary: null, output: null, sourceIds: [], createdAt: base.createdAt });

describe("task verification", () => {
  it("only checks finished turns", () => {
    expect(verifyTask(msg({ status: "streaming" }))).toBeNull();
    expect(verifyTask(msg({ status: "stopped" }))).toBeNull();
    expect(verifyTask(msg({ status: "error" }))).toBeNull();
  });

  it("passes a finished task whose concrete checks all hold", () => {
    const result = verifyTask(msg({
      plan: [{ step: "Llegir", status: "completed" }, { step: "Opcional", status: "skipped" }],
      toolResults: [tool("Llegir factures", "complete")],
    }));
    expect(result).toMatchObject({ status: "passed", passed: 3, total: 3 });
  });

  it("fails an empty answer, unfinished steps and broken files", () => {
    const result = verifyTask(msg({
      content: "  ",
      plan: [{ step: "a", status: "completed" }, { step: "b", status: "in_progress" }, { step: "c", status: "pending" }],
      artifacts: [{ id: "d", type: "document", name: "informe.pdf", url: "/api/x", kind: "pdf", mimeType: "application/pdf", size: 1, status: "error", pages: null, previewUrl: null, publicationStatus: null, publicationError: null, targetLabel: null, error: "x" } as never],
    }));
    expect(result?.status).toBe("attention");
    const byId = Object.fromEntries(result!.checks.map((check) => [check.id, check]));
    // An artifact counts as an answer, so the answer check passes here.
    expect(byId.answer.status).toBe("passed");
    expect(byId.steps).toMatchObject({ status: "failed", values: { n: 2, done: 1, total: 3 } });
    expect(byId.files).toMatchObject({ status: "failed", values: { n: 1 } });
    expect(verifyTask(msg({ content: "" }))?.checks[0]).toMatchObject({ id: "answer", status: "failed" });
  });

  it("ignores a failed action that was retried successfully, but not one that never recovered", () => {
    expect(verifyTask(msg({ toolResults: [tool("Llegir", "failed"), tool("Llegir", "complete")] }))?.status).toBe("passed");
    expect(verifyTask(msg({ toolResults: [tool("Llegir", "complete"), tool("Enviar", "failed")] }))?.checks.at(-1))
      .toMatchObject({ id: "actions", status: "failed", values: { n: 1 } });
  });

  it("never clears a failed file change with a later success under the same generic title", () => {
    const file = (status: "complete" | "failed") => ({ ...tool("Cambios en archivos", status), kind: "file" as const });
    expect(verifyTask(msg({ toolResults: [file("failed"), file("complete")] }))?.checks.find((check) => check.id === "actions")?.status).toBe("failed");
  });

  it("reports declined actions as information, not as a failure", () => {
    const result = verifyTask(msg({ approvals: [{ id: "p", threadId: "t", turnId: "u", itemId: "i", kind: "connector", title: "Enviar", detail: "", status: "declined" }] }));
    expect(result?.status).toBe("passed");
    expect(result?.checks.at(-1)).toMatchObject({ id: "declined", status: "info" });
  });

  it("turns a finished task with failed checks into review in the task state", () => {
    expect(taskProgress(msg({})).state).toBe("done");
    expect(taskProgress(msg({ plan: [{ step: "a", status: "pending" }] })).state).toBe("review");
  });
});
