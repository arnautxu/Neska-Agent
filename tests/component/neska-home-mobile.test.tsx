// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiLocaleProvider } from "@/i18n/provider";
import { MobilePermission } from "@/components/mobile-permission";
import { NeskaCurrentTasks, NeskaHomeHeader } from "@/components/neska-home";
import type { TaskCenterItem } from "@/task-center/contracts";
const approval = { id: "exact-id", threadId: "thread", turnId: "turn", itemId: "item", kind: "connector" as const, title: "Enviar correu", detail: "Revisa l’enviament", status: "pending" as const };
const task: TaskCenterItem = { id: "task", threadId: "thread", projectId: "project", threadTitle: "Factures", projectName: null, status: "running", title: "", detail: "", createdAt: "2026-10-11T09:00:00.000Z", updatedAt: "2026-10-11T09:01:00.000Z", unread: false };
function mobile() { vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))); }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Neska home and mobile use published facts", () => {
  it("hides unknown work and completed tasks instead of inventing a current task", () => {
    render(<UiLocaleProvider locale="ca"><NeskaHomeHeader userName="Arnau" tasks={[]} /><NeskaCurrentTasks tasks={[{ ...task, status: "completed" }]} /></UiLocaleProvider>);
    expect(screen.queryByText(/tasques en curs/)).toBeNull();
    expect(screen.queryByRole("region", { name: "Ara mateix" })).toBeNull();
  });
  it("shows queue and proposal only when their server metadata exists", () => {
    const select = vi.fn();
    render(<UiLocaleProvider locale="ca"><NeskaCurrentTasks tasks={[{ ...task, queue: { state: "waiting", timestamp: task.createdAt } }, { ...task, id: "proposal", threadTitle: "Pla", status: "completed", planProposal: { status: "proposed", revision: 1 } }]} onOpenTask={select} /></UiLocaleProvider>);
    expect(screen.getByText("A la cua")).toBeInTheDocument();
    expect(screen.getByText("Pla proposat")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Pla.*Pla proposat/ }));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: "proposal" }));
  });
  it("opens the mobile permission, traps focus and closes without submitting a decision", async () => {
    mobile(); const resolve = vi.fn();
    render(<UiLocaleProvider locale="ca"><MobilePermission approval={approval} sheetAllowed onResolve={resolve} /></UiLocaleProvider>);
    const dialog = screen.getByRole("dialog", { name: "Necessito el teu permís" });
    const allow = within(dialog).getByRole("button", { name: "Permet" });
    await waitFor(() => expect(allow).toHaveFocus());
    within(dialog).getByRole("button", { name: "Tanca" }).focus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(allow).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(resolve).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Revisa el permís pendent" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Revisa el permís pendent" }));
    fireEvent.click(screen.getByRole("button", { name: "Permet" }));
    expect(resolve).toHaveBeenCalledExactlyOnceWith("accept");
  });
  it("offers no decision buttons to a read-only viewer", () => {
    mobile();
    render(<UiLocaleProvider locale="ca"><MobilePermission approval={approval} sheetAllowed readOnly onResolve={vi.fn()} /></UiLocaleProvider>);
    expect(screen.queryByRole("button", { name: "Permet" })).toBeNull();
    expect(screen.getByText("Esperant la decisió d’un editor del projecte")).toBeInTheDocument();
  });
});
