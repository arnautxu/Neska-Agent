"use client";
import { useState } from "react";
import { ChatWorkspace } from "@/components/chat-workspace";
import { Sidebar } from "@/components/sidebar";
import { baseBrainManifest, type BrainPreferences } from "@/config/brain";
import type { PublicInstallationBranding } from "@/config/installation-branding";
import type { ChatMessage } from "@/lib/chat-contract";
import type { ComposerExperience } from "@/lib/composer-experience";
import { initialRuntimeStatus } from "@/lib/runtime-status";
import type { ConnectorMention } from "@/connectors/mentions-contract";
import type { TaskCenterItem } from "@/task-center/contracts";
import type { StagedComposerDocument } from "@/ui/document-ui-adapter";
import type { ThreadActivity } from "@/workbench/thread-activity";
import { STANDALONE_PROJECT_SLUG, type WorkbenchProject, type WorkbenchThread } from "@/workbench/types";
import { exampleTask } from "../tasca/preview";
import { PreviewTheme } from "../preview-theme";

// The whole intuitive flow with mock data: sidebar grouped by state, the
// labelled composer, the task with its status line and permission on top.
// ?estat=inici|treballant|permis
const now = "2026-10-12T09:00:00.000Z";
const day = (offset: number) => new Date(Date.parse(now) - offset * 86_400_000).toISOString();
const branding: PublicInstallationBranding = { installationId: "preview", companyName: "Neska", companySlug: "preview", publicUrl: "https://example.test", productName: "Neska", logoPath: "/branding/neska/logo.svg", faviconPath: "/branding/neska/favicon.svg", accentColor: "#6B3A1E", visualTheme: "neska" };
const project: WorkbenchProject = { id: "00000000-0000-4000-8000-000000000001", name: "Comptabilitat", slug: "comptabilitat", status: "active", pinned: false, instructions: "", sources: [], memory: { enabled: true, notes: "", updatedAt: null }, sharing: { visibility: "private", members: [] }, workspace: { id: "w", label: "Principal", hostType: "managed", status: "ready", isPrimary: true }, createdAt: now, updatedAt: now };
const standalone: WorkbenchProject = { ...project, id: "00000000-0000-4000-8000-000000000009", name: "Tasques", slug: STANDALONE_PROJECT_SLUG };
const preferences: BrainPreferences = { assistantName: "Neska", tone: "balanced", accent: "blue", density: "comfortable", corners: "soft", showInspector: true, showActivityPanel: true, conversationMemory: true };
const thread = (id: string, title: string, updatedAt: string, messages: ChatMessage[] = []): WorkbenchThread => ({ id, projectId: project.id, title, status: "active", pinned: false, createdAt: updatedAt, updatedAt, messages } as WorkbenchThread);
const request: ChatMessage = { id: "u1", role: "user", content: "Concilia les factures d'octubre amb l'extracte del banc i prepara el correu per als proveïdors amb diferències.", createdAt: now, status: "complete", plan: [], activity: [], approvals: [], diff: "", attachments: [], artifacts: [] };
const working: ChatMessage = { ...exampleTask, content: "" };
const asking: ChatMessage = { ...exampleTask, content: "", approvals: [{ id: "permission", threadId: "preview", turnId: "turn", itemId: "item", kind: "connector", title: "Enviar un correu a Ferreteria Puig", detail: "La factura F-2026-0931 és de 1.240,00 € i el banc en mostra 1.204,00 €. Els reclamo la diferència de 36,00 €.", status: "pending", stepIndex: 4 }] };
const threads = [
  thread("t-puig", "Correu a Ferreteria Puig", day(0)),
  thread("t-conc", "Conciliació factures octubre", day(0)),
  thread("t-q3", "Informe vendes Q3", day(1)),
  thread("t-nau", "Contracte lloguer nau", day(3)),
  thread("t-nom", "Nòmines setembre", day(10)),
];
const activity: Record<string, ThreadActivity> = {
  "t-puig": { state: "needs_attention", unreadCount: 0 },
  "t-conc": { state: "running", unreadCount: 0 },
  "t-q3": { state: "completed", unreadCount: 0 },
  "t-nau": { state: "completed", unreadCount: 0 },
  "t-nom": { state: "completed", unreadCount: 0 },
} as Record<string, ThreadActivity>;
const tasks: TaskCenterItem[] = [
  { id: "c-conc", threadId: "t-conc", projectId: project.id, threadTitle: "Conciliació factures octubre", projectName: "Comptabilitat", status: "running", title: "Conciliar", detail: "", createdAt: now, updatedAt: now, unread: false },
  { id: "c-puig", threadId: "t-puig", projectId: project.id, threadTitle: "Correu a Ferreteria Puig", projectName: "Comptabilitat", status: "needs_attention", title: "Enviar un correu a Ferreteria Puig", detail: "", createdAt: now, updatedAt: now, unread: false },
] as TaskCenterItem[];
const connectors = [
  { id: "gmail", label: "Gmail", status: "connected", canRead: true },
  { id: "google-drive", label: "Drive", status: "connected", canRead: true },
  { id: "bank", label: "Banc", status: "connected", canRead: true },
] as ConnectorMention[];
const noop = () => {};
const asyncNoop = async () => undefined;

export function IntuitivePreview({ estat }: { estat: string }) {
  const state = estat === "treballant" || estat === "permis" ? estat : "inici";
  const [prompt, setPrompt] = useState("");
  const [experience, setExperience] = useState<ComposerExperience>("smart");
  const [ids, setIds] = useState<string[]>([]);
  const [docs, setDocs] = useState<StagedComposerDocument[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const active = state === "inici" ? null : { ...threads[1], messages: [request, state === "permis" ? asking : working] } as WorkbenchThread;
  return <PreviewTheme><div className="workbench-shell flex h-[100dvh] overflow-hidden">
    <Sidebar branding={branding} session={{ provider: "local", user: { id: "preview", name: "Arnau", email: "preview@example.test" }, tenant: { id: "preview", name: "Maqueta" }, expiresAt: "2099-01-01T00:00:00.000Z" }}
      projects={[project, standalone]} threads={threads} activeProjectId={project.id} activeThreadId={active?.id ?? null} mobileOpen={mobileOpen} desktopOpen={desktopOpen} busy={false}
      threadActivityById={activity} pendingTasks={1} onCloseMobile={() => setMobileOpen(false)} onCloseDesktop={() => setDesktopOpen(false)} onOpenDesktop={() => setDesktopOpen(true)}
      onOpenCommandPalette={noop} onOpenAutomations={noop} onOpenInbox={noop} onSelectProject={noop} onSelectThread={noop} onNewThread={noop} onNewProject={noop} onProjectAction={noop} onThreadAction={noop} onOpenCustomization={noop} />
    <ChatWorkspace
      manifest={baseBrainManifest} preferences={preferences} project={project} thread={active} projects={[project]} tasks={tasks}
      userName="Arnau" companyName="Neska" assistantName="Neska" hydrated prompt={prompt} composerExperience={experience} imageGeneration={false}
      connectorMentions={connectors} selectedConnectorMentionIds={ids} attachments={[]} documents={docs} publications={[]} documentUploading={false}
      sending={state !== "inici"} stopping={false} queuedMessages={[]} runtimeStatus={{ ...initialRuntimeStatus, mode: "demo", codex: "disabled", ready: true }}
      networkOnline streamRecovery={null} onRetryRuntime={noop} onPromptChange={setPrompt} onComposerExperienceChange={setExperience} onImageGenerationChange={noop}
      onDestinationChange={noop} onConnectorMentionIdsChange={setIds} onAttachmentsChange={noop} onDocumentsChange={setDocs} onAddDocuments={asyncNoop}
      onFreezePublication={asyncNoop} onDecidePublication={asyncNoop} onComposerNotice={noop} onSend={noop} onPlanRequest={noop} onStop={noop} onCancelQueuedMessage={noop}
      sidebarOpen={desktopOpen} onToggleSidebar={() => setDesktopOpen(!desktopOpen)} onResolveApproval={asyncNoop} onEditMessage={noop} managedAppActionEnabled={false} managedAppApprovalKeys={[]}
      onManagedAppPrepared={noop} onPreviewDocument={noop} onOpenReview={noop} onOpenBrowser={noop} onOpenInbox={noop} onOpenTask={noop}
      branding={branding}
    />
  </div></PreviewTheme>;
}
