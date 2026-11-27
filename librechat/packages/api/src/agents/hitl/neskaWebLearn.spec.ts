import { buildNeskaWebLearnHook, NESKA_WEB_LEARN_REASON } from './neskaWebLearn';
import { buildToolApprovalHooks } from './hooks';
import type { AppConfig } from '@librechat/data-schemas';

const config = (riskLabels?: boolean) =>
  ({
    endpoints: { agents: { toolApproval: { enabled: true, riskLabels } } },
  }) as unknown as AppConfig;

type Hook = (input: { toolName: string; toolInput?: Record<string, unknown> }) => Promise<unknown>;

function hookFor(riskLabels = true): Hook {
  const built = buildNeskaWebLearnHook({ appConfig: config(riskLabels) });
  return built!.hook as unknown as Hook;
}

describe('buildNeskaWebLearnHook', () => {
  it('is off without riskLabels', () => {
    expect(buildNeskaWebLearnHook({ appConfig: config(undefined) })).toBeUndefined();
  });

  it('only matches web search and the brain’s learn tool', () => {
    const built = buildNeskaWebLearnHook({ appConfig: config(true) });
    expect(built?.matcher).toBe('^(web_search|aprendre_mcp_cervell)$');
    expect(new RegExp(built!.matcher!).test('cercar_mcp_cervell')).toBe(false);
  });

  it('lets the brain learn when the response has not read the web', async () => {
    const hook = hookFor();
    await expect(hook({ toolName: 'aprendre_mcp_cervell', toolInput: {} })).resolves.toEqual({});
  });

  it('refuses to learn for the rest of a response that read the web', async () => {
    const hook = hookFor();
    await expect(hook({ toolName: 'web_search', toolInput: { query: 'x' } })).resolves.toEqual({});
    const denied = { decision: 'deny', reason: NESKA_WEB_LEARN_REASON };
    await expect(hook({ toolName: 'aprendre_mcp_cervell', toolInput: {} })).resolves.toEqual(denied);
    await expect(hook({ toolName: 'aprendre_mcp_cervell', toolInput: {} })).resolves.toEqual(denied);
  });

  it('starts clean in the next response (a new run builds a new hook)', async () => {
    const first = hookFor();
    await first({ toolName: 'web_search' });
    const next = hookFor();
    await expect(next({ toolName: 'aprendre_mcp_cervell' })).resolves.toEqual({});
  });

  it('is part of the built-in hooks on Neska’s config', () => {
    const hooks = buildToolApprovalHooks({ appConfig: config(true) });
    expect(hooks.some((h) => h.matcher === '^(web_search|aprendre_mcp_cervell)$')).toBe(true);
    expect(buildToolApprovalHooks({ appConfig: config(false) })).toHaveLength(0);
  });
});
