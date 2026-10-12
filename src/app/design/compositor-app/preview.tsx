"use client";
import { useState } from "react";
import { ChatWorkspace } from "@/components/chat-workspace";
import { baseBrainManifest, type BrainPreferences } from "@/config/brain";
import type { ChatMessage } from "@/lib/chat-contract";
import type { ComposerExperience } from "@/lib/composer-experience";
import { initialRuntimeStatus } from "@/lib/runtime-status";
import type { ConnectorMention } from "@/connectors/mentions-contract";
import type { StagedComposerDocument } from "@/ui/document-ui-adapter";
import type { WorkbenchProject, WorkbenchThread } from "@/workbench/types";
import { PreviewTheme } from "../preview-theme";

const now = "2026-10-12T09:00:00.000Z";
const project: WorkbenchProject = { id: "00000000-0000-4000-8000-000000000001", name: "Comptabilitat", slug: "comptabilitat", status: "active", pinned: false, instructions: "", sources: [], memory: { enabled: true, notes: "", updatedAt: null }, sharing: { visibility: "private", members: [] }, workspace: { id: "w", label: "Principal", hostType: "managed", status: "ready", isPrimary: true }, createdAt: now, updatedAt: now };
const preferences: BrainPreferences = { assistantName: "Neska", tone: "balanced", accent: "blue", density: "comfortable", corners: "soft", showInspector: true, showActivityPanel: true, conversationMemory: true };
const messages: ChatMessage[] = [
  { id: "u1", role: "user", content: "Concilia les factures d'octubre amb l'extracte del banc.", createdAt: now, status: "complete", plan: [], activity: [], approvals: [], diff: "", attachments: [], artifacts: [] },
  { id: "a1", role: "assistant", content: "He conciliat 37 de 38 factures. Hi ha una diferència de 36,00 € amb Ferreteria Puig.", createdAt: now, status: "complete", plan: [], activity: [], approvals: [], diff: "", attachments: [], artifacts: [] },
];
const thread: WorkbenchThread = { id: "00000000-0000-4000-8000-000000000002", projectId: project.id, title: "Conciliació de factures octubre", status: "active", pinned: false, createdAt: now, updatedAt: now, messages } as WorkbenchThread;
const connectors: ConnectorMention[] = [
  { id: "gmail", label: "Gmail", status: "connected", canRead: true },
  { id: "google-drive", label: "Google Drive", status: "connected", canRead: true },
] as ConnectorMention[];
const docs: StagedComposerDocument[] = [
  { uploadId: "d1", name: "factures-octubre.zip", status: "ready", kind: "file", size: 4_200_000, previewFiles: [] },
  { uploadId: "d2", name: "escanejos-2026.pdf", status: "error", kind: "file", size: 32_000_000, error: "Massa gran · màxim 20 MB", previewFiles: [] },
] as unknown as StagedComposerDocument[];

const noop = () => {};
const asyncNoop = async () => undefined;
const STATES = ["inici", "tasca", "escrivint", "adjunts", "treballant"] as const;

/** The real composer with mock data. ?estat=inici|tasca|escrivint|adjunts|treballant */
export function ComposerAppPreview({ estat }: { estat: string }) {
  const state = (STATES as readonly string[]).includes(estat) ? estat as (typeof STATES)[number] : "tasca";
  const [prompt, setPrompt] = useState(state === "escrivint" ? "Revisa a @Gmail els correus de Ferreteria Puig" : state === "adjunts" ? "Fes la conciliació amb això" : "");
  const [experience, setExperience] = useState<ComposerExperience>("smart");
  const [ids, setIds] = useState<string[]>([]);
  const [docState, setDocState] = useState(state === "adjunts" ? docs : []);
  return <PreviewTheme><div className="workbench-shell flex h-[100dvh] overflow-hidden">
    <ChatWorkspace
      manifest={baseBrainManifest} preferences={preferences} project={project} thread={state === "inici" ? null : thread} projects={[project]}
      userName="Arnau" companyName="Neska" assistantName="Neska" hydrated prompt={prompt} composerExperience={experience} imageGeneration={false}
      connectorMentions={connectors} selectedConnectorMentionIds={ids} attachments={[]} documents={docState} publications={[]} documentUploading={false}
      sending={state === "treballant"} stopping={false} queuedMessages={[]} runtimeStatus={{ ...initialRuntimeStatus, mode: "demo", codex: "disabled", ready: true }}
      networkOnline streamRecovery={null} onRetryRuntime={noop} onPromptChange={setPrompt} onComposerExperienceChange={setExperience} onImageGenerationChange={noop}
      onDestinationChange={noop} onConnectorMentionIdsChange={setIds} onAttachmentsChange={noop} onDocumentsChange={setDocState} onAddDocuments={asyncNoop}
      onFreezePublication={asyncNoop} onDecidePublication={asyncNoop} onComposerNotice={noop} onSend={noop} onPlanRequest={noop} onStop={noop} onCancelQueuedMessage={noop}
      sidebarOpen onToggleSidebar={noop} onResolveApproval={asyncNoop} onEditMessage={noop} managedAppActionEnabled={false} managedAppApprovalKeys={[]}
      onManagedAppPrepared={noop} onPreviewDocument={noop} onOpenReview={noop} onOpenBrowser={noop}
      branding={{ installationId: "preview", companyName: "Neska", companySlug: "preview", publicUrl: "https://example.test", productName: "Neska", logoPath: "/branding/neska/logo.svg", faviconPath: "/branding/neska/favicon.svg", accentColor: "#6B3A1E", visualTheme: "neska" }}
    />
  </div></PreviewTheme>;
}
