import type { ApprovalDecision, ApprovalItem, ApprovalRisk, ApprovalRiskLevel } from "@/lib/chat-contract";

/**
 * Server-side blast-radius classification for pending approvals.
 *
 * The level describes how hard the effect is to undo, never how confident the
 * model is. It is presentation plus a narrowing rule: it can only remove the
 * "allow for the whole task" scope from an irreversible action. It never
 * approves, widens or skips anything. Unknown input always falls to a higher
 * level, so a new command shape can only be shown as riskier than it is.
 */

type RiskInput =
  | { kind: "command"; command?: string | null; networkEnabled?: boolean; extraPermissions?: boolean }
  | { kind: "file" }
  | { kind: "permissions"; networkEnabled: boolean }
  | { kind: "browser" }
  | { kind: "connector" };

const REASONS: Record<ApprovalRiskLevel, Record<string, string>> = {
  contained: {
    readOnly: "Només llegeix. No canvia res.",
  },
  wide: {
    command: "Es pot desfer, però pot canviar fitxers o instal·lar coses.",
    file: "Es pot desfer, però canvia fitxers del teu espai.",
    permissions: "Es pot desfer, però amplia el que pot tocar durant la tasca.",
    unknown: "Es pot desfer, però no sé exactament fins on arriba.",
  },
  irreversible: {
    connector: "No es pot desfer. Envia o canvia dades fora de Neska.",
    browser: "No es pot desfer. Actua en una web en nom teu.",
    delete: "No es pot desfer. Esborra o sobreescriu dades.",
    outbound: "No es pot desfer. Envia dades fora de Neska.",
    network: "No es pot desfer. Dona accés a internet i les dades poden sortir.",
    system: "No es pot desfer. Canvia el sistema o els permisos.",
  },
};

// Commands that only read. A command is contained only when every segment of
// a pipeline/sequence is one of these and nothing redirects output to a file.
const READ_ONLY = new Set([
  "ls", "cat", "head", "tail", "wc", "grep", "rg", "pwd", "echo", "printf",
  "stat", "file", "du", "df", "which", "whoami", "date", "tree", "sort", "uniq",
  "cut", "diff", "jq", "realpath", "basename", "dirname", "true",
]);
const READ_ONLY_GIT = new Set(["status", "diff", "log", "show", "branch", "rev-parse", "ls-files", "blame"]);
// Options that make an otherwise read-only program write, delete or execute.
const WRITING_OPTIONS: Record<string, RegExp> = {
  sort: /^(?:-[A-Za-z]*o|--output)/u,
  tree: /^(?:-o|--output)/u,
  find: /^-(?:fprint|fprintf|fprint0|fls|ok|okdir|execdir)/u,
  git: /^--output/u,
};
// `git branch` only lists when every argument is a listing flag.
const GIT_BRANCH_LISTING = new Set(["-a", "-r", "-v", "-vv", "--all", "--list", "--remotes", "--show-current", "--verbose"]);

const DELETE = [
  /\brm\s/u, /\brmdir\b/u, /\bshred\b/u, /\bunlink\b/u, /\btruncate\b/u,
  /\bdd\s/u, /\bmkfs/u, /\bfind\b[^|;&]*\s-(?:delete|exec)\b/u,
  /\b(?:drop|truncate)\s+(?:table|database|schema)\b/iu, /\bdelete\s+from\b/iu,
  /\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f|push\s+[^|;&]*(?:--force|-f\b))/u,
  /\bgit\s+branch\s+[^|;&]*(?:-[A-Za-z]*[dD]\b|--delete\b)/u,
];
const OUTBOUND = [
  /\bgit\s+push\b/u, /\b(?:npm|pnpm|yarn)\s+publish\b/u, /\bdocker\s+push\b/u,
  /\b(?:scp|rsync|sftp|ftp)\s/u, /\b(?:sendmail|mail|mutt|ssh)\s/u,
  /\bcurl\b[^|;&]*(?:\s-X\s*(?:POST|PUT|PATCH|DELETE)|\s--data\b|\s-d\s|\s-F\s|\s--upload-file\b|\s-T\s)/iu,
  /\bwget\b[^|;&]*--post/iu,
];
const SYSTEM = [
  /\bsudo\b/u, /\bsu\s/u, /\bchmod\s+-R\b/u, /\bchown\b/u, /\b(?:shutdown|reboot|halt)\b/u,
  /\b(?:kill|pkill|killall)\b/u, /\bsystemctl\b/u, /\bcrontab\b/u, /\b(?:useradd|userdel|passwd)\b/u,
];

function risk(level: ApprovalRiskLevel, reason: string): ApprovalRisk {
  return { level, reason: REASONS[level][reason] ?? REASONS.wide.unknown };
}

function isReadOnlySegment(segment: string): boolean {
  const words = segment.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return true;
  // Leading VAR=value assignments do not change what the program does.
  while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/u.test(words[0]!)) words.shift();
  const [program, sub] = words;
  if (!program) return true;
  const writing = WRITING_OPTIONS[program];
  if (writing && words.slice(1).some((word) => writing.test(word))) return false;
  if (program === "git") {
    if (sub === undefined || !READ_ONLY_GIT.has(sub)) return false;
    return sub !== "branch" || words.slice(2).every((word) => GIT_BRANCH_LISTING.has(word));
  }
  if (program === "find") return true; // -delete/-exec matched by DELETE, writers above.
  return READ_ONLY.has(program);
}

export function classifyCommand(command: string | null | undefined): ApprovalRisk {
  const text = typeof command === "string" ? command.trim() : "";
  if (!text) return risk("wide", "unknown");
  if (DELETE.some((pattern) => pattern.test(text))) return risk("irreversible", "delete");
  if (OUTBOUND.some((pattern) => pattern.test(text))) return risk("irreversible", "outbound");
  if (SYSTEM.some((pattern) => pattern.test(text))) return risk("irreversible", "system");
  // Any output redirection or substitution may overwrite or execute: not read-only.
  if (/>|\$\(|`/u.test(text)) return risk("wide", "command");
  const segments = text.split(/\|\||&&|[|;\n]/u);
  return segments.every(isReadOnlySegment) ? risk("contained", "readOnly") : risk("wide", "command");
}

export function classifyApprovalRisk(input: RiskInput): ApprovalRisk {
  switch (input.kind) {
    case "command": {
      // Permissions requested alongside a command count before its text.
      if (input.networkEnabled) return risk("irreversible", "network");
      const byText = classifyCommand(input.command);
      if (input.extraPermissions && byText.level === "contained") return risk("wide", "permissions");
      return byText;
    }
    case "file":
      return risk("wide", "file");
    case "permissions":
      if (input.networkEnabled) return risk("irreversible", "network");
      return risk("wide", "permissions");
    case "browser":
      return risk("irreversible", "browser");
    case "connector":
      return risk("irreversible", "connector");
    default:
      return risk("wide", "unknown");
  }
}

/**
 * An irreversible action is approved one at a time. "Allow for this task" is
 * narrowed to a single approval on the server, whatever the client sent.
 */
export function narrowDecisionForRisk(
  decision: ApprovalDecision | "cancel",
  item: Pick<ApprovalItem, "risk">,
): ApprovalDecision | "cancel" {
  if (decision === "acceptForSession" && item.risk?.level !== "contained" && item.risk?.level !== "wide") {
    return "accept";
  }
  return decision;
}
