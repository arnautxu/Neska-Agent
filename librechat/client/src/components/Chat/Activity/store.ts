import { atom } from 'jotai';

/**
 * The conversation whose "Activitat" panel is open beside the chat, or `null`.
 * Keyed by conversation so the panel never carries over into another chat.
 */
export const activityPanelConversationAtom = atom<string | null>(null);

/** The conversation that has at least one step to show, so the header can offer the panel. */
export const activityAvailableConversationAtom = atom<string | null>(null);
