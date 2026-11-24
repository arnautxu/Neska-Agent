import { useAtom, useAtomValue } from 'jotai';
import { History } from 'lucide-react';
import { Button, TooltipAnchor } from '@librechat/client';
import { activityAvailableConversationAtom, activityPanelConversationAtom } from './store';
import { NeskaIcon } from '~/components/NeskaIcons';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/** Header control that opens or closes the "Activitat" panel for this conversation. */
export default function ActivityButton({ conversationId }: { conversationId?: string }) {
  const localize = useLocalize();
  const available = useAtomValue(activityAvailableConversationAtom);
  const [openId, setOpenId] = useAtom(activityPanelConversationAtom);
  if (conversationId == null || available !== conversationId) {
    return null;
  }
  const open = openId === conversationId;
  const label = localize('com_neska_activity_title');

  return (
    <TooltipAnchor
      description={localize(open ? 'com_neska_activity_close' : 'com_neska_activity_open')}
      render={
        <Button
          variant="outline"
          aria-pressed={open}
          aria-controls="neska-activity-panel"
          onClick={() => setOpenId(open ? null : conversationId)}
          data-testid="header-activity-button"
          className={cn(
            'bg-presentation hover:bg-surface-tertiary h-9 shrink-0 gap-2 rounded-xl px-3',
            open && 'border-text-primary',
          )}
        >
          <NeskaIcon icon={History} size={16} />
          <span className="text-sm">{label}</span>
        </Button>
      }
    />
  );
}
