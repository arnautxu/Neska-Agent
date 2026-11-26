import type { ToolApprovalHookContext, ResolvedToolApprovalHook } from './hooks';

/**
 * Neska (NESKA_FORK.md, "Permission card"): ask before Neska deletes the person's files in its
 * own workspace. The skills keep the person's files (uploads and deliveries) in `/mnt/data` and
 * their own scratch work in `/tmp`, so a delete that only touches scratch paths, skill files or
 * the presentation review sheet goes ahead; any other delete in a code or shell call waits for
 * "Permet" / "Ara no". Unknown targets (relative paths, variables) ask, so the check fails safe.
 */

export const NESKA_DELETE_TOOL_NAMES = ['bash_tool', 'execute_code'] as const;
export const NESKA_DELETE_REASON = 'Esborrarà fitxers teus. Un cop fet, no es pot desfer.';

const SHELL_DELETE = /(^|[\s;&|(`$])(rm|unlink|rmdir|shred)(\s|$)|\bfind\b[^\n]*\s-delete\b/;
const PYTHON_DELETE =
  /\b(os\.(remove|unlink|rmdir|removedirs)|shutil\.rmtree|send2trash)\s*\(|\.(unlink|rmdir)\s*\(/;
const PATH_TOKEN = /\/[\w.~@%+-]+(?:\/[\w.~@%+*-]*)*/g;
const SCRATCH = /^(\/tmp(\/|$)|\/var\/tmp(\/|$)|\/dev\/null$|\/mnt\/data\/skills\/)/;
const SCRATCH_WORDS = /\b(tmp|temp|tempfile|tmpdir|mkdtemp)\b|revisio-/i;

/** One delete statement is safe when every path it names is scratch, or it names scratch only. */
function isScratchOnly(line: string): boolean {
  const paths = line.match(PATH_TOKEN) ?? [];
  const userPaths = paths.filter((p) => !SCRATCH.test(p) && !/revisio-/.test(p));
  if (paths.length > 0) {
    return userPaths.length === 0;
  }
  return SCRATCH_WORDS.test(line);
}

function sourceOf(toolInput: Record<string, unknown> | undefined): string {
  if (toolInput == null) {
    return '';
  }
  const parts = [toolInput.command, toolInput.code, toolInput.args]
    .flat()
    .filter((value): value is string => typeof value === 'string');
  return parts.join('\n');
}

/** Whether a code or shell call deletes something that may be the person's file. */
export function deletesUserFiles(
  toolName: string,
  toolInput: Record<string, unknown> | undefined,
): boolean {
  if (!(NESKA_DELETE_TOOL_NAMES as readonly string[]).includes(toolName)) {
    return false;
  }
  return sourceOf(toolInput)
    .split(/\n|;|&&|\|\|/)
    .some((line) => (SHELL_DELETE.test(line) || PYTHON_DELETE.test(line)) && !isScratchOnly(line));
}

/** Built-in hook, on only where `toolApproval.riskLabels` is on (Neska's config). */
export function buildNeskaDeleteHook(
  context: ToolApprovalHookContext,
): ResolvedToolApprovalHook | undefined {
  const policy = context.appConfig?.endpoints?.agents?.toolApproval as
    | { riskLabels?: boolean }
    | undefined;
  if (policy?.riskLabels !== true) {
    return undefined;
  }
  return {
    matcher: `^(${NESKA_DELETE_TOOL_NAMES.join('|')})$`,
    toolNames: [...NESKA_DELETE_TOOL_NAMES],
    hook: async (input) => {
      if (!deletesUserFiles(input.toolName, input.toolInput)) {
        return {};
      }
      return {
        decision: 'ask',
        reason: NESKA_DELETE_REASON,
        allowedDecisions: ['approve', 'reject'],
      };
    },
  };
}
