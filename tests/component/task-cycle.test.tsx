// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "../render-spanish";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskCycle } from "@/components/task-cycle";
import type { ChatMessage } from "@/lib/chat-contract";
const message: ChatMessage = { id: "message", role: "assistant", content: "", status: "streaming", createdAt: "2026-10-11T12:00:00.000Z", plan: [{ step: "Llegir", status: "in_progress" }], activity: [], approvals: [], artifacts: [], attachments: [], diff: "" };
afterEach(cleanup);
describe("factual task cycle", () => {
  it("omits unknown progress, timing and approval metadata", () => {
    const { container } = render(<TaskCycle message={message} threadId="thread" onResolveApproval={vi.fn()} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText("Permiso")).toBeNull();
    expect(container.querySelector("time")).toBeNull();
  });
  it("puts the permission before a folded plan and preserves exact decisions", () => {
    const resolve = vi.fn();
    const approval = { id: "permission", threadId: "thread", turnId: "turn", itemId: "item", kind: "connector" as const, title: "Enviar correu", detail: "Revisa el resum", status: "pending" as const };
    const { container } = render(<TaskCycle message={{ ...message, approvals: [approval] }} threadId="thread" onResolveApproval={resolve} />);
    expect(container.querySelector(".task-cycle")?.firstElementChild).toHaveAttribute("data-slot", "permission-grant");
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));
    expect(resolve).toHaveBeenCalledWith(approval, "decline");
  });
  it("saves the current proposal revision and applies only the returned server message", async () => {
    const proposed: ChatMessage = { ...message, status: "complete", planProposal: { status: "proposed", revision: 4 } };
    const saved: ChatMessage = { ...proposed, planProposal: { status: "proposed", revision: 5 } };
    const change = vi.fn(); const persist = vi.fn(async () => saved);
    render(<TaskCycle message={proposed} threadId="thread" onResolveApproval={vi.fn()} onMessageChange={change} onMutate={persist} />);
    fireEvent.click(screen.getByRole("button", { name: "Edita el plan" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Revisar\nEnviar" } });
    fireEvent.click(screen.getByRole("button", { name: "Guarda el plan" }));
    await waitFor(() => expect(change).toHaveBeenCalledWith(saved));
    expect(persist).toHaveBeenCalledWith("/api/runtime/plans", { action: "edit", threadId: "thread", assistantMessageId: "message", revision: 4, steps: ["Revisar", "Enviar"] });
  });
  it("offers only published incident actions and never offers them to a viewer", () => {
    const incident = { id: "incident", stepIndex: 0, message: "Document protegit", actions: ["retry" as const], status: "open" as const, timestamp: message.createdAt };
    const props = { message: { ...message, incidents: [incident] }, threadId: "thread", onResolveApproval: vi.fn(), onMessageChange: vi.fn() };
    const { rerender } = render(<TaskCycle {...props} />);
    expect(screen.getByRole("button", { name: "Vuelve a intentarlo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Omite este paso" })).toBeNull();
    rerender(<TaskCycle {...props} readOnly />);
    expect(screen.queryByRole("button", { name: "Vuelve a intentarlo" })).toBeNull();
    rerender(<TaskCycle {...props} message={{ ...props.message, status: "complete" }} />);
    expect(screen.queryByRole("button", { name: "Vuelve a intentarlo" })).toBeNull();
  });
});
