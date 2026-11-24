import { ContentTypes } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { buildActivity, stepText } from '../model';

const call = (id: string, name: string, args: unknown, output?: string) => ({
  type: ContentTypes.TOOL_CALL,
  tool_call: { id, name, args, output },
});

describe('Activitat model', () => {
  it('uses the intent, else a plain fallback, never the tool name', () => {
    expect(stepText('execute_code', { intent: 'sumar els imports.' })).toBe('Sumar els imports');
    expect(stepText('web_search', '{}')).toBe('Buscar a internet');
    expect(stepText('send_mail_mcp_gmail', {})).toBe('Fer una acció');
  });

  it('groups steps under their label and reads their state', () => {
    const messages = [
      { messageId: 'u1', isCreatedByUser: true, text: 'Resum de factures' },
      {
        messageId: 'a1',
        parentMessageId: 'u1',
        isCreatedByUser: false,
        content: [
          call('t1', 'read_file', { intent: 'Llegir les factures' }, 'ok'),
          call('t2', 'bash_tool', { intent: 'Sumar' }, 'Blocked: no'),
          call('t3', 'bash_tool', { intent: 'Comprovar' }),
          {
            type: ContentTypes.ACTIVITY_LABEL,
            activity_label: 'He llegit les factures',
            tool_call_ids: ['t1'],
          },
        ],
      },
    ] as unknown as TMessage[];
    const [turn] = buildActivity(messages);
    expect(turn.request).toBe('Resum de factures');
    expect(turn.blocks[0]).toMatchObject({ summary: 'He llegit les factures' });
    expect(turn.blocks.flatMap((b) => b.steps.map((s) => s.state))).toEqual([
      'done',
      'declined',
      'running',
    ]);
  });
});
