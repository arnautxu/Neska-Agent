import { useEffect, useId, useState } from 'react';
import { Check, X, ChevronRight } from 'lucide-react';
import { NeskaIcon } from '~/components/NeskaIcons';
import {
  useApprovalContext,
  useResumeSubmit,
} from '~/components/Chat/Messages/Content/ApprovalContext';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * Neska permission card ("Neska et demana permís"). Shown instead of LibreChat's review
 * controls when the server offers only approve / reject, which it does for every call
 * under `toolApproval.riskLabels` (packages/api/src/agents/hitl/neskaRisk.ts).
 *
 * - Title: the sentence Neska wrote for the call (`intent`), or a plain fallback.
 * - Risk line: the server's reason ("Un cop fet, no es pot desfer."), never the model's.
 * - One click decides and sends: "Permet" approves, "Ara no" declines. In a batch, the
 *   two buttons answer every call on the card at once.
 *
 * The decision goes through the same approval context and resume route as LibreChat's
 * card; this file only changes what the person sees.
 */

export type NeskaApprovalItem = {
  toolCallId: string;
  toolName?: string;
  args: string | Record<string, unknown> | undefined;
  description?: string;
};

const INTENT_KEY = 'intent';
/** Sent to the model when the person says "Ara no", so it stops instead of retrying. */
const DECLINE_REASON =
  'La persona ha dit «Ara no». No ho facis ni ho tornis a intentar d’una altra manera; digues-li en una frase què no has fet i pregunta-li com vol seguir.';
const MAX_DETAIL_CHARS = 400;

function parseArgs(args: NeskaApprovalItem['args']): Record<string, unknown> {
  if (args == null) {
    return {};
  }
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args) as unknown;
      return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return args;
}

/** "send_email_mcp_gmail" → "send email" */
function plainToolName(toolName: string | undefined): string | undefined {
  if (!toolName) {
    return undefined;
  }
  const base = toolName.split('_mcp_')[0].split('_action_')[0];
  const words = base.replace(/[_-]+/g, ' ').trim();
  return words.length > 0 ? words : undefined;
}

type Localize = ReturnType<typeof useLocalize>;

export function neskaApprovalTitle(item: NeskaApprovalItem, localize: Localize): string {
  const intent = parseArgs(item.args)[INTENT_KEY];
  if (typeof intent === 'string' && intent.trim().length > 0) {
    const text = intent.trim().replace(/[.…]+$/, '');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  const name = plainToolName(item.toolName);
  return name
    ? localize('com_neska_approval_use_tool', { 0: name })
    : localize('com_neska_approval_outside');
}

function detailValue(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (text == null) {
    return '';
  }
  return text.length > MAX_DETAIL_CHARS ? `${text.slice(0, MAX_DETAIL_CHARS - 1)}…` : text;
}

function Details({ item }: { item: NeskaApprovalItem }) {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const id = useId();
  const entries = Object.entries(parseArgs(item.args)).filter(([key]) => key !== INTENT_KEY);
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="text-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
        {localize('com_neska_approval_details')}
      </button>
      {open && (
        <dl id={id} className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-text-tertiary">{key.replace(/[_-]+/g, ' ')}</dt>
              <dd className="text-text-primary [overflow-wrap:anywhere] whitespace-pre-wrap">
                {detailValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function NeskaApproval({
  actionId,
  items,
  className,
}: {
  actionId: string;
  items: NeskaApprovalItem[];
  className?: string;
}) {
  const localize = useLocalize();
  const titleId = useId();
  const { registerToolCall, unregisterToolCall, setDecision, isReady, getStatus } =
    useApprovalContext();
  const { submitToolApproval } = useResumeSubmit();
  const status = getStatus(actionId);
  const locked = status === 'submitting' || status === 'submitted' || status === 'expired';
  const [chosen, setChosen] = useState<'approve' | 'reject' | null>(null);

  const ids = items.map((item) => item.toolCallId).join('\u0000');
  useEffect(() => {
    const callIds = ids.split('\u0000').filter(Boolean);
    callIds.forEach((toolCallId) => registerToolCall(actionId, toolCallId));
    return () => callIds.forEach((toolCallId) => unregisterToolCall(actionId, toolCallId));
  }, [registerToolCall, unregisterToolCall, actionId, ids]);

  if (status === 'submitted' || items.length === 0) {
    return null;
  }

  const decide = (decision: 'approve' | 'reject') => {
    if (locked) {
      return;
    }
    setChosen(decision);
    for (const item of items) {
      setDecision(
        actionId,
        item.toolCallId,
        decision === 'reject'
          ? { tool_call_id: item.toolCallId, decision, reason: DECLINE_REASON }
          : { tool_call_id: item.toolCallId, decision },
      );
    }
    if (isReady(actionId)) {
      submitToolApproval(actionId);
    }
  };

  const reasons = [...new Set(items.map((item) => item.description?.trim()).filter(Boolean))];
  const single = items.length === 1;

  return (
    <section
      aria-labelledby={titleId}
      data-testid="neska-approval"
      className={cn(
        'border-text-primary bg-surface-primary flex w-full flex-col gap-4 rounded-[2px] border p-5',
        className,
      )}
    >
      <p className="neska-label">{localize('com_neska_approval_label')}</p>
      {single ? (
        <h3 id={titleId} className="text-text-primary text-xl leading-snug font-medium">
          {neskaApprovalTitle(items[0], localize)}
        </h3>
      ) : (
        <div className="flex flex-col gap-2">
          <h3 id={titleId} className="text-text-primary text-xl leading-snug font-medium">
            {localize('com_neska_approval_many', { 0: items.length })}
          </h3>
          <ol className="text-text-primary list-decimal space-y-1 ps-5">
            {items.map((item) => (
              <li key={item.toolCallId}>{neskaApprovalTitle(item, localize)}</li>
            ))}
          </ol>
        </div>
      )}
      {single && <Details item={items[0]} />}
      {reasons.map((reason) => (
        <p key={reason} className="text-text-primary flex items-center gap-2 font-medium">
          <span className="bg-text-primary inline-block size-2 shrink-0" aria-hidden="true" />
          {reason}
        </p>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => decide('approve')}
          disabled={locked}
          className="bg-surface-submit hover:bg-surface-submit-hover inline-flex items-center gap-2 rounded-[2px] px-5 py-2.5 font-medium text-white disabled:opacity-60"
        >
          <NeskaIcon icon={Check} size={16} />
          {localize(single ? 'com_neska_approval_allow' : 'com_neska_approval_allow_all')}
        </button>
        <button
          type="button"
          onClick={() => decide('reject')}
          disabled={locked}
          className="text-text-primary hover:bg-surface-hover inline-flex items-center gap-2 rounded-[2px] px-3 py-2.5 disabled:opacity-60"
        >
          <NeskaIcon icon={X} size={16} />
          {localize('com_neska_approval_not_now')}
        </button>
      </div>
      {status === 'submitting' && (
        <p className="text-text-secondary text-sm" role="status">
          {localize(
            chosen === 'reject'
              ? 'com_neska_approval_sending_no'
              : 'com_neska_approval_sending_yes',
          )}
        </p>
      )}
      {status === 'expired' && (
        <p className="text-text-secondary text-sm" role="alert">
          {localize('com_neska_approval_expired')}
        </p>
      )}
      {status === 'error' && (
        <p className="text-text-secondary text-sm" role="alert">
          {localize('com_neska_approval_error')}
        </p>
      )}
    </section>
  );
}

/** The server marks a Neska review by offering exactly approve and reject. */
export function isNeskaReview(allowedDecisions: readonly string[] | undefined): boolean {
  return (
    allowedDecisions != null &&
    allowedDecisions.length === 2 &&
    allowedDecisions.includes('approve') &&
    allowedDecisions.includes('reject')
  );
}

/**
 * The card replaces LibreChat's review controls only under the `neska` theme, read from the
 * same `html[data-theme]` attribute that `neska.css` keys on.
 */
export function useIsNeskaTheme(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'neska';
}
