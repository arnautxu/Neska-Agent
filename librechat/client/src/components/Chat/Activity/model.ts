import { ContentTypes } from 'librechat-data-provider';
import { getToolCallIntent } from '@librechat/chat/react';
import type { TMessage, TMessageContentParts } from 'librechat-data-provider';

/**
 * Neska "Activitat": the steps Neska took in a conversation, in plain words.
 *
 * Read only from the saved message content. A step's sentence is the `intent` Neska wrote
 * for the call (tool_intents); a block's summary is the activity label the fast model
 * wrote after it (activityLabel); a thought is the reasoning label the fast model wrote
 * for a stretch of Neska's thinking (reasoningLabel). None is ever a tool name, raw
 * arguments or the raw thinking itself.
 */

export type StepState = 'done' | 'running' | 'waiting' | 'declined' | 'failed';

export type ActivityStep = { kind: 'step'; id: string; text: string; state: StepState };

/** One short sentence of what Neska is thinking and why (reasoning label of a THINK part). */
export type ActivityThought = { kind: 'thought'; id: string; text: string; live: boolean };

export type ActivityItem = ActivityStep | ActivityThought;

export type ActivityBlock = { id: string; summary?: string; steps: ActivityItem[] };

export type ActivityTurn = { id: string; request: string; blocks: ActivityBlock[] };

type ToolCallLike = {
  id?: string;
  name?: string;
  args?: unknown;
  output?: string;
  approval?: unknown;
};

/** Plain wording for Neska's own tools when a call carries no sentence of its own. */
const PLAIN_TOOL_TEXT: Record<string, string> = {
  web_search: 'Buscar a internet',
  execute_code: 'Fer càlculs',
  bash_tool: 'Fer càlculs',
  run_tools_with_code: 'Fer càlculs',
  run_tools_with_bash: 'Fer càlculs',
  read_file: 'Llegir un fitxer',
  write_file: 'Preparar un fitxer',
  create_file: 'Preparar un fitxer',
  edit_file: 'Canviar un fitxer',
  list_directory: 'Mirar quins fitxers hi ha',
  glob_search: 'Buscar fitxers',
  grep_search: 'Buscar dins dels fitxers',
  skill: 'Consultar com es fa',
  tool_search: 'Buscar l’eina adequada',
  set_memory: 'Recordar una cosa per a més endavant',
  delete_memory: 'Oblidar una cosa',
  file_search: 'Buscar als documents',
  subagent: 'Encarregar una part de la feina',
  ask_user_question: 'Fer-te una pregunta',
};

const MAX_REQUEST_CHARS = 90;

export function stepText(name: string | undefined, args: unknown): string {
  /** Same reader as the chat's own tool rows: it also reads an intent that is still
   *  streaming (args as an unfinished JSON string), so a step shows its sentence live. */
  const intent =
    typeof args === 'string' || (args != null && typeof args === 'object')
      ? getToolCallIntent(args as string | Record<string, unknown>)
      : undefined;
  if (intent != null) {
    const text = intent.replace(/[.…]+$/, '');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  const base = (name ?? '').split('_mcp_')[0].split('_action_')[0];
  return PLAIN_TOOL_TEXT[base] ?? 'Fer una acció';
}

function stepState(call: ToolCallLike): StepState {
  const output = typeof call.output === 'string' ? call.output : '';
  if (output.length === 0) {
    return call.approval != null ? 'waiting' : 'running';
  }
  if (output.startsWith('Blocked:')) {
    return 'declined';
  }
  if (/^Error\b/.test(output)) {
    return 'failed';
  }
  return 'done';
}

function toolCallOf(part: TMessageContentParts | undefined): ToolCallLike | undefined {
  if (part?.type !== ContentTypes.TOOL_CALL) {
    return undefined;
  }
  return (part as { tool_call?: ToolCallLike }).tool_call;
}

function labelOf(
  part: TMessageContentParts | undefined,
): { text: string; ids: string[] } | undefined {
  if (part?.type !== ContentTypes.ACTIVITY_LABEL) {
    return undefined;
  }
  const label = part as {
    activity_label?: string;
    activity_label_type?: string;
    tool_call_ids?: string[];
  };
  const text = label.activity_label?.trim() ?? '';
  if (label.activity_label_type === 'phase' || text.length === 0) {
    return undefined;
  }
  return { text, ids: label.tool_call_ids ?? [] };
}

function thoughtOf(
  part: TMessageContentParts | undefined,
  index: number,
): ActivityThought | undefined {
  if (part?.type !== ContentTypes.THINK) {
    return undefined;
  }
  const think = part as {
    reasoning_label?: string;
    reasoning_label_status?: 'streaming' | 'complete';
    reasoning_label_step_id?: string;
  };
  const text = (think.reasoning_label ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.…]+$/, '');
  if (text.length === 0) {
    return undefined;
  }
  return {
    kind: 'thought',
    id: think.reasoning_label_step_id ?? `thought-${index}`,
    text: text.charAt(0).toUpperCase() + text.slice(1),
    live: think.reasoning_label_status === 'streaming',
  };
}

function requestText(message: TMessage | undefined): string {
  const text = (message?.text ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= MAX_REQUEST_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_REQUEST_CHARS - 1)}…`;
}

/** Steps of one assistant message, grouped under the summary that covers them. A thought
 *  joins the block of the step that follows it; thoughts after the last step join the last
 *  block, and a message with thoughts but no steps gets one block without a summary. */
export function buildBlocks(content: TMessageContentParts[] | undefined): ActivityBlock[] {
  const parts = content ?? [];
  const summaryById = new Map<string, string>();
  for (const part of parts) {
    const label = labelOf(part);
    label?.ids.forEach((id) => summaryById.set(id, label.text));
  }
  const blocks: ActivityBlock[] = [];
  let pending: ActivityThought[] = [];
  parts.forEach((part, index) => {
    const thought = thoughtOf(part, index);
    if (thought != null) {
      pending.push(thought);
      return;
    }
    const call = toolCallOf(part);
    if (call == null) {
      return;
    }
    const id = call.id ?? `step-${index}`;
    const summary = summaryById.get(id);
    const step: ActivityStep = {
      kind: 'step',
      id,
      text: stepText(call.name, call.args),
      state: stepState(call),
    };
    const last = blocks[blocks.length - 1];
    if (last != null && last.summary === summary && summary != null) {
      last.steps.push(...pending, step);
    } else {
      blocks.push({ id, summary, steps: [...pending, step] });
    }
    pending = [];
  });
  if (pending.length > 0) {
    const last = blocks[blocks.length - 1];
    if (last != null) {
      last.steps.push(...pending);
    } else {
      blocks.push({ id: pending[0].id, steps: pending });
    }
  }
  return blocks;
}

/** Every turn of the conversation in which Neska took at least one step, oldest first. */
export function buildActivity(messages: TMessage[] | null | undefined): ActivityTurn[] {
  const list = messages ?? [];
  const byId = new Map(list.map((message) => [message.messageId, message]));
  const turns: ActivityTurn[] = [];
  for (const message of list) {
    if (message.isCreatedByUser) {
      continue;
    }
    const blocks = buildBlocks(message.content as TMessageContentParts[] | undefined);
    if (blocks.length === 0) {
      continue;
    }
    turns.push({
      id: message.messageId,
      request: requestText(byId.get(message.parentMessageId ?? '')),
      blocks,
    });
  }
  return turns;
}
