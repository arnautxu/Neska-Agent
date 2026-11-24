import { useEffect, useMemo } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import type { ReactNode } from 'react';
import type { TMessage } from 'librechat-data-provider';
import { activityAvailableConversationAtom, activityPanelConversationAtom } from './store';
import useDrawerViewport from '~/hooks/Nav/useDrawerViewport';
import { buildActivity } from './model';
import ActivityPanel from './Panel';

/**
 * Puts the "Activitat" panel beside the chat on wide screens and over it on small ones.
 * The chat stays mounted either way, so closing the panel keeps scroll and draft.
 */
export default function ActivitySurface({
  conversationId,
  messages,
  children,
}: {
  conversationId?: string | null;
  messages: TMessage[] | null;
  children: ReactNode;
}) {
  const [openId, setOpenId] = useAtom(activityPanelConversationAtom);
  const setAvailable = useSetAtom(activityAvailableConversationAtom);
  const isSmallScreen = useDrawerViewport();
  const turns = useMemo(() => buildActivity(messages), [messages]);
  const hasActivity = conversationId != null && turns.length > 0;
  const open = hasActivity && openId === conversationId;

  useEffect(() => {
    setAvailable(hasActivity ? (conversationId ?? null) : null);
  }, [hasActivity, conversationId, setAvailable]);

  useEffect(() => {
    if (openId != null && openId !== conversationId) {
      setOpenId(null);
    }
  }, [conversationId, openId, setOpenId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpenId]);

  return (
    <div className="relative flex h-full w-full">
      <div className="relative flex h-full min-w-0 flex-1 flex-col">{children}</div>
      {open && (
        <ActivityPanel
          turns={turns}
          onClose={() => setOpenId(null)}
          className={
            isSmallScreen
              ? 'absolute inset-0 z-50'
              : 'border-border-light w-[360px] shrink-0 border-s'
          }
        />
      )}
    </div>
  );
}
