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
    expect(
      turn.blocks.flatMap((b) => b.steps.map((s) => (s.kind === 'step' ? s.state : s.kind))),
    ).toEqual(['done', 'declined', 'running']);
  });

  it('puts what Neska thinks between the steps, never the raw thinking', () => {
    const think = (stepId: string, label?: string, status = 'complete') => ({
      type: ContentTypes.THINK,
      think: 'raw thinking that must never show',
      reasoning_label: label,
      reasoning_label_status: status,
      reasoning_label_step_id: stepId,
    });
    const messages = [
      { messageId: 'u1', isCreatedByUser: true, text: 'Fes un Excel' },
      {
        messageId: 'a1',
        parentMessageId: 'u1',
        isCreatedByUser: false,
        content: [
          think('r1', 'primer miro quins clients hi ha.'),
          call('t1', 'bash_tool', { intent: 'Crear l’Excel' }, 'ok'),
          think('r2'),
          think('r3', 'Ara comprovo que el fitxer s’obre', 'streaming'),
        ],
      },
      {
        messageId: 'a2',
        parentMessageId: 'u1',
        isCreatedByUser: false,
        content: [think('r4', 'Penso com explicar-ho curt')],
      },
    ] as unknown as TMessage[];
    const [first, second] = buildActivity(messages);
    expect(first.blocks).toHaveLength(1);
    expect(first.blocks[0].steps).toEqual([
      { kind: 'thought', id: 'r1', text: 'Primer miro quins clients hi ha', live: false },
      { kind: 'step', id: 't1', text: 'Crear l’Excel', state: 'done' },
      { kind: 'thought', id: 'r3', text: 'Ara comprovo que el fitxer s’obre', live: true },
    ]);
    expect(second.blocks[0].steps).toHaveLength(1);
    expect(JSON.stringify([first, second])).not.toContain('raw thinking');
  });
});
