"use client";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { STANDALONE_PROJECT_SLUG, type WorkbenchProject } from "@/workbench/types";
import { PreviewTheme } from "../preview-theme";
import { NeskaHomeHeader, NeskaCurrentTasks } from "@/components/neska-home";
import type { TaskCenterItem } from "@/task-center/contracts";
const tasks: TaskCenterItem[] = [
  { id: "example-live", threadId: "example-thread", projectId: "example-project", threadTitle: "Conciliació de factures octubre", projectName: "Comptabilitat", status: "running", title: "Conciliar", detail: "", createdAt: "2026-10-11T09:00:00.000Z", updatedAt: "2026-10-11T09:01:00.000Z", unread: false },
  { id: "example-wait", threadId: "example-wait", projectId: "example-project", threadTitle: "Resposta a Ferreteria Puig", projectName: "Comptabilitat", status: "needs_attention", title: "Permís", detail: "", createdAt: "2026-10-11T09:00:00.000Z", updatedAt: "2026-10-11T09:01:00.000Z", unread: false },
];
const noop = () => {};
const project: WorkbenchProject = { id: "example-project", name: "Tasques", slug: STANDALONE_PROJECT_SLUG, status: "active", pinned: false, instructions: "", sources: [], memory: { enabled: false, notes: "", updatedAt: null }, sharing: { visibility: "private", members: [] }, workspace: { id: "workspace", label: "Maqueta", hostType: "managed", status: "ready", isPrimary: true }, createdAt: tasks[0].createdAt, updatedAt: tasks[0].updatedAt };
export function HomePreview() {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  return <PreviewTheme><div className="workbench-shell flex h-[100dvh] overflow-hidden">
    <Sidebar branding={{ installationId: "preview", companyName: "Neska", companySlug: "preview", publicUrl: "https://example.test", productName: "Neska", logoPath: "/branding/neska/logo.svg", faviconPath: "/branding/neska/favicon.svg", accentColor: "#6B3A1E", visualTheme: "neska" }} session={{ provider: "local", user: { id: "preview", name: "Arnau", email: "preview@example.test" }, tenant: { id: "preview", name: "Maqueta" }, expiresAt: "2099-01-01T00:00:00.000Z" }} projects={[project]} threads={tasks.map(task => ({ id: task.threadId, projectId: project.id, title: task.threadTitle, status: "active", pinned: false, createdAt: task.createdAt, updatedAt: task.updatedAt, messages: [] }))} activeProjectId={project.id} activeThreadId={null} mobileOpen={mobileOpen} desktopOpen={desktopOpen} busy={false} threadActivityById={{ "example-thread": { state: "running", unreadCount: 0 }, "example-wait": { state: "needs_attention", unreadCount: 0 } }} pendingTasks={1} onCloseMobile={() => setMobileOpen(false)} onCloseDesktop={() => setDesktopOpen(false)} onOpenDesktop={() => setDesktopOpen(true)} onOpenCommandPalette={noop} onOpenAutomations={noop} onOpenInbox={noop} onSelectProject={noop} onSelectThread={noop} onNewThread={noop} onNewProject={noop} onProjectAction={noop} onThreadAction={noop} onOpenCustomization={noop} />
    <main className="mx-auto w-full max-w-[816px] overflow-y-auto px-6 py-16 md:py-24"><button type="button" className="mb-4 min-h-11 md:hidden" onClick={() => setMobileOpen(true)}>☰ Inici</button><p className="mb-8 text-xs text-[var(--text-secondary)]">Maqueta · dades fictícies</p><NeskaHomeHeader userName="Arnau" tasks={tasks} onOpenInbox={() => {}} />
      <div className="my-8 border border-[var(--border)] p-4"><textarea aria-label="Missatge de maqueta" className="min-h-20 w-full resize-none bg-transparent text-[17px]" placeholder="Què vols que faci?" /><div className="flex justify-between text-sm text-[var(--text-secondary)]"><button className="min-h-11">+ Fitxer</button><button className="min-h-11 px-4" aria-label="Enviar maqueta">↑</button></div></div>
      <NeskaCurrentTasks tasks={tasks} onOpenTask={() => {}} />
    </main>
  </div></PreviewTheme>;
}
