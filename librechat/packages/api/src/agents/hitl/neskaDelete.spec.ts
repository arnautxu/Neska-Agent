import { buildNeskaDeleteHook, deletesUserFiles, NESKA_DELETE_REASON } from './neskaDelete';
import type { AppConfig } from '@librechat/data-schemas';

const bash = (command: string) => deletesUserFiles('bash_tool', { command });
const py = (code: string) => deletesUserFiles('execute_code', { lang: 'py', code });

describe('deletesUserFiles', () => {
  it('asks when a shell delete targets the person’s files', () => {
    expect(bash('rm /mnt/data/clients.xlsx')).toBe(true);
    expect(bash('cd /mnt/data && rm -f clients.xlsx')).toBe(true);
    expect(bash('find /mnt/data -name "*.xlsx" -delete')).toBe(true);
    expect(bash('rm clients.xlsx')).toBe(true);
  });

  it('asks when Python deletes the person’s files', () => {
    expect(py('import os\nos.remove("/mnt/data/clients.xlsx")')).toBe(true);
    expect(py('from pathlib import Path\nPath("/mnt/data/a.pdf").unlink()')).toBe(true);
    expect(py('import shutil\nshutil.rmtree(folder)')).toBe(true);
  });

  it('lets scratch, skill and review-sheet cleanup through', () => {
    expect(bash('rm -rf /tmp/feina && ls /mnt/data')).toBe(false);
    expect(bash('rm /mnt/data/revisio-diapositives.png')).toBe(false);
    expect(py('import shutil, tempfile\nd = tempfile.mkdtemp()\nshutil.rmtree(tmpdir)')).toBe(
      false,
    );
    expect(py('import os\nos.remove("/tmp/x.html")')).toBe(false);
  });

  it('ignores calls with no delete and tools outside the sandbox', () => {
    expect(bash('ls -la /mnt/data && python make.py')).toBe(false);
    expect(py('print("rm is a word")')).toBe(false);
    expect(deletesUserFiles('web_search', { command: 'rm /mnt/data/a' })).toBe(false);
  });
});

describe('buildNeskaDeleteHook', () => {
  const config = (riskLabels?: boolean) =>
    ({
      endpoints: { agents: { toolApproval: { enabled: true, riskLabels } } },
    }) as unknown as AppConfig;

  it('is off without riskLabels', () => {
    expect(buildNeskaDeleteHook({ appConfig: config(undefined) })).toBeUndefined();
  });

  it('asks with the Neska reason and only approve / reject', async () => {
    const built = buildNeskaDeleteHook({ appConfig: config(true) });
    expect(built?.matcher).toBe('^(bash_tool|execute_code)$');
    const hook = built!.hook as unknown as (input: unknown) => Promise<unknown>;
    await expect(
      hook({ toolName: 'bash_tool', toolInput: { command: 'rm /mnt/data/clients.xlsx' } }),
    ).resolves.toEqual({
      decision: 'ask',
      reason: NESKA_DELETE_REASON,
      allowedDecisions: ['approve', 'reject'],
    });
    await expect(hook({ toolName: 'bash_tool', toolInput: { command: 'ls' } })).resolves.toEqual(
      {},
    );
  });
});
