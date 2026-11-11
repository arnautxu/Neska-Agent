import type * as t from 'librechat-data-provider';

/**
 * Neska: the skills draw a review sheet (`revisio-*.png`) and the agent reads it to check its
 * own draft before delivering. Those sheets are working files, not results: keep them, and the
 * images the agent's `read_file` of them returns, out of the conversation.
 */
const REVIEW_SHEET = /(^|\/|__)revisio-[^/?]*\.png(\?.*)?$/i;

export function isReviewSheetPath(path: string | undefined | null): boolean {
  return !!path && REVIEW_SHEET.test(path);
}

function readPath(args: unknown): string {
  let value = args;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return '';
    }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const path = record.path ?? record.file_path;
    return typeof path === 'string' ? path : '';
  }
  return '';
}

/** Tool calls that only read a review sheet. */
function reviewReadIds(content: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(content)) {
    return ids;
  }
  for (const part of content) {
    const call = (part as { tool_call?: { id?: string; name?: string; args?: unknown } } | null)
      ?.tool_call;
    if (call?.id && call.name === 'read_file' && isReviewSheetPath(readPath(call.args))) {
      ids.add(call.id);
    }
  }
  return ids;
}

export function withoutReviewSheets<T extends t.TAttachment | null | undefined>(
  attachments: T[] | undefined,
  content: unknown,
): T[] | undefined {
  if (!attachments || attachments.length === 0) {
    return attachments;
  }
  const readIds = reviewReadIds(content);
  const visible = attachments.filter((attachment) => {
    if (!attachment) {
      return true;
    }
    const a = attachment as { filename?: string; filepath?: string; toolCallId?: string };
    if (isReviewSheetPath(a.filename) || isReviewSheetPath(a.filepath)) {
      return false;
    }
    return !(a.toolCallId && readIds.has(a.toolCallId));
  });
  return visible.length === attachments.length ? attachments : visible;
}
