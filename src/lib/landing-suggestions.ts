import { spanishUiText, type UiText } from "@/i18n/messages";
import { type WorkbenchProject } from "@/workbench/types";

export type LandingSuggestion = {
  id: "presentation" | "spreadsheets" | "knowledge" | "presentation-image" | "illustration" | "diagram";
  label: string;
  prompt: string;
  iconPath?: string;
  children?: { id: string; label: string; prompt: string }[];
};

/** Uses only the selected project and installation name, never inferred email data. */
export function landingSuggestions(
  _project: WorkbenchProject | null,
  companyName: string,
  capabilities: { gmailAuthorized?: boolean; imageGeneration?: boolean } = {},
  t: UiText = spanishUiText,
): LandingSuggestion[] {
  if (capabilities.imageGeneration) return [
    { id: "presentation-image", label: t("Para una presentación"), prompt: t("Crea una imagen horizontal para una presentación sobre…") },
    { id: "illustration", label: t("Ilustrar una idea"), prompt: t("Crea una ilustración que represente…") },
    { id: "diagram", label: t("Explicar un proceso"), prompt: t("Crea un diagrama visual que explique estos pasos: …") },
  ];
  return scheduledPromptTemplates(companyName, t);
}

/** Fixed editable prompts, never scheduled jobs or automatic actions. */
export function scheduledPromptTemplates(companyName: string, t: UiText = spanishUiText): LandingSuggestion[] {
  return [
    { id: "presentation", iconPath: "/branding/microsoft/powerpoint.svg", label: t("Prepárame una presentación"), prompt: t("Prepárame una presentación sobre…") },
    { id: "spreadsheets", iconPath: "/branding/microsoft/excel.svg", label: t("Trabajemos con estos Excels"), prompt: t("Trabajemos con estos Excels. Quiero…") },
    { id: "knowledge", label: t("Trabajemos con la información de {company}", { company: companyName }), prompt: "", children: [
      { id: "summary", label: t("Preparar un resumen"), prompt: t("Resume la información disponible de {company} sobre… Cita las fuentes y señala lo que falta.", { company: companyName }) },
      { id: "search", label: t("Buscar información"), prompt: t("Busca en los documentos autorizados de {company} información sobre…", { company: companyName }) },
      { id: "changes", label: t("Comparar documentos"), prompt: t("Compara estos documentos de {company} y explica las diferencias…", { company: companyName }) },
    ] },
  ];
}
