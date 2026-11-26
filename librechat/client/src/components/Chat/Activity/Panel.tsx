import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ActivityItem, ActivityStep, ActivityThought, ActivityTurn, StepState } from './model';
import type { TranslationKeys } from '~/hooks/useLocalize';
import { NeskaIcon } from '~/components/NeskaIcons';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * Neska "Activitat": every step of the conversation in plain words, newest request last.
 * State is shape first (DESIGN: errors use a cross, never red): a filled brown square
 * while working, a hollow square while it waits for permission, a check when done,
 * a cross when it was declined or did not work. A thought (what Neska is thinking and why)
 * has no shape: it is quieter text between the steps, so only steps read as things done.
 */

const STATE_KEY: Record<Exclude<StepState, 'done'>, TranslationKeys> = {
  running: 'com_neska_activity_running',
  waiting: 'com_neska_activity_waiting',
  declined: 'com_neska_activity_declined',
  failed: 'com_neska_activity_failed',
};

function Marker({ state }: { state: StepState }) {
  if (state === 'running') {
    return (
      <span
        aria-hidden="true"
        className="bg-surface-submit mt-[7px] inline-block size-2 shrink-0 motion-safe:animate-pulse"
      />
    );
  }
  if (state === 'waiting') {
    return (
      <span
        aria-hidden="true"
        className="border-text-primary mt-[6px] inline-block size-2.5 shrink-0 border"
      />
    );
  }
  if (state === 'done') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="text-text-secondary mt-[5px] size-3 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M2 6.5 4.8 9 10 3" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="text-text-primary mt-[5px] size-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="m3 3 6 6M9 3 3 9" />
    </svg>
  );
}

function Step({ step }: { step: ActivityStep }) {
  const localize = useLocalize();
  return (
    <li className="flex gap-3" data-state={step.state}>
      <Marker state={step.state} />
      <span className="min-w-0">
        <span className={cn(step.state === 'done' ? 'text-text-secondary' : 'text-text-primary')}>
          {step.text}
        </span>
        {step.state !== 'done' && (
          <span className="text-text-primary block text-sm font-medium">
            {localize(STATE_KEY[step.state])}
          </span>
        )}
      </span>
    </li>
  );
}

function Thought({ thought }: { thought: ActivityThought }) {
  return (
    <li className="flex gap-3" data-kind="thought">
      <span aria-hidden="true" className="w-3 shrink-0" />
      <p className="text-text-secondary min-w-0 text-[15px] leading-snug">
        {thought.text}
        {thought.live && <span aria-hidden="true">…</span>}
      </p>
    </li>
  );
}

function Item({ item }: { item: ActivityItem }) {
  return item.kind === 'thought' ? <Thought thought={item} /> : <Step step={item} />;
}

export default function ActivityPanel({
  turns,
  onClose,
  className,
}: {
  turns: ActivityTurn[];
  onClose: () => void;
  className?: string;
}) {
  const localize = useLocalize();
  const endRef = useRef<HTMLDivElement>(null);
  /** Grows with every new step or thought, and as a live thought is rewritten. */
  const stepCount = turns.reduce(
    (total, turn) =>
      total +
      turn.blocks.reduce(
        (sum, block) =>
          sum +
          block.steps.reduce(
            (n, item) => n + 1 + (item.kind === 'thought' ? item.text.length : 0),
            0,
          ),
        0,
      ),
    0,
  );

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [stepCount]);

  return (
    <aside
      id="neska-activity-panel"
      aria-labelledby="neska-activity-title"
      data-testid="neska-activity-panel"
      className={cn('bg-presentation flex h-full min-h-0 flex-col', className)}
    >
      <header className="border-border-light flex h-[52px] shrink-0 items-center justify-between border-b px-5">
        <h2 id="neska-activity-title" className="text-text-primary text-base font-medium">
          {localize('com_neska_activity_title')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={localize('com_neska_activity_close')}
          className="text-text-secondary hover:text-text-primary hover:bg-surface-hover -me-2 grid size-9 place-items-center rounded-[2px]"
        >
          <NeskaIcon icon={X} size={18} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {turns.length === 0 ? (
          <p className="text-text-secondary">{localize('com_neska_activity_empty')}</p>
        ) : (
          <ol className="flex flex-col gap-8">
            {turns.map((turn) => (
              <li key={turn.id} className="flex flex-col gap-4">
                {turn.request.length > 0 && (
                  <div>
                    <p className="neska-label">{localize('com_neska_activity_you_asked')}</p>
                    <p className="text-text-primary mt-1 leading-snug">{turn.request}</p>
                  </div>
                )}
                {turn.blocks.map((block) => (
                  <div key={block.id} className="flex flex-col gap-2">
                    {block.summary != null && (
                      <p className="text-text-primary leading-snug font-medium">{block.summary}</p>
                    )}
                    <ul
                      className={cn(
                        'flex flex-col gap-2',
                        block.summary != null && 'border-border-light ms-1 border-s ps-4',
                      )}
                    >
                      {block.steps.map((item) => (
                        <Item key={`${item.kind}-${item.id}`} item={item} />
                      ))}
                    </ul>
                  </div>
                ))}
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>
    </aside>
  );
}
