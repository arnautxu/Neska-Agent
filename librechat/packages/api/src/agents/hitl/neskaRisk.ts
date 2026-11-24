/**
 * Neska: plain-language risk line for a paused tool call.
 *
 * When `toolApproval.riskLabels` is on, every call the static policy sends to review gets
 * a reason the person can read ("Un cop fet, no es pot desfer.") and only two choices,
 * approve or reject (the card shows them as "Permet" and "Ara no"). The level is decided
 * here, on the server, from the tool's own name; nothing the model writes can lower it.
 * A tool we cannot place is treated as possibly irreversible.
 */
import { Constants } from 'librechat-data-provider';

export type NeskaRiskLevel = 'irreversible' | 'reversible' | 'unknown';

/** Verbs whose effect leaves Neska (sent, paid, published) or destroys data. Checked first. */
const IRREVERSIBLE =
  /(^|_|-)(send|sends|enviar|envia|reply|respon|forward|reenvia|mail|email|delete|remove|purge|destroy|esborra|elimina|pay|paga|charge|transfer|transfereix|publish|publica|post|tweet|submit|cancel|cancel·la|anul·la|order|comanda|purchase|compra|book|reserva|invite|convida|share|comparteix|sign|signa|approve|aprova|execute|run)($|_|-)/i;

/** Verbs whose effect stays editable afterwards (a draft, a record that can be changed back). */
const REVERSIBLE =
  /(^|_|-)(create|crea|draft|esborrany|update|actualitza|edit|edita|write|escriu|save|desa|move|mou|rename|reanomena|label|etiqueta|tag|add|afegeix|set|archive|arxiva|copy|copia|upload|puja)($|_|-)/i;

export const NESKA_RISK_REASON: Record<NeskaRiskLevel, string> = {
  irreversible: 'Un cop fet, no es pot desfer.',
  reversible: 'Es pot desfer després.',
  unknown: 'No sé segur si es pot desfer. Revisa-ho abans de dir que sí.',
};

/** The tool's own name, without the `_mcp_<server>` suffix MCP tools carry. */
function baseToolName(toolName: string): string {
  const index = toolName.indexOf(Constants.mcp_delimiter);
  return index > 0 ? toolName.slice(0, index) : toolName;
}

export function classifyNeskaRisk(toolName: string): NeskaRiskLevel {
  const name = baseToolName(toolName);
  if (IRREVERSIBLE.test(name)) {
    return 'irreversible';
  }
  if (REVERSIBLE.test(name)) {
    return 'reversible';
  }
  return 'unknown';
}

/** Review result for a call the static policy asked about. */
export function neskaReview(toolName: string): {
  reason: string;
  allowedDecisions: Array<'approve' | 'reject'>;
} {
  return {
    reason: NESKA_RISK_REASON[classifyNeskaRisk(toolName)],
    allowedDecisions: ['approve', 'reject'],
  };
}
