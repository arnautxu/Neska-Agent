import type { TAttachment } from 'librechat-data-provider';
import { isReviewSheetPath, withoutReviewSheets } from '../reviewSheets';

const att = (filename: string, filepath: string, toolCallId = 'x') =>
  ({ filename, filepath, toolCallId }) as unknown as TAttachment;

describe('review sheets', () => {
  it('recognises the skills review sheets only', () => {
    expect(isReviewSheetPath('revisio-diapositives.png')).toBe(true);
    expect(isReviewSheetPath('/mnt/data/revisio-full.png')).toBe(true);
    expect(isReviewSheetPath('/images/u/abc__revisio-diapositives.png?v=1')).toBe(true);
    expect(isReviewSheetPath('grafic-vendes.png')).toBe(false);
    expect(isReviewSheetPath('revisio-diapositives.pdf')).toBe(false);
  });

  it('drops the sheet and the image read back from it, keeps the result', () => {
    const sheet = att('revisio-diapositives.png', '/images/u/1.png', 'code1');
    const readBack = att('2dec-read_file_img_abc.png', '/images/u/2dec-read_file_img_abc.png', 'read1');
    const pdf = att('presentacio.pdf', '/files/u/presentacio.pdf', 'code2');
    const otherRead = att('read_file_img_def.png', '/images/u/def.png', 'read2');
    const content = [
      { type: 'tool_call', tool_call: { id: 'read1', name: 'read_file', args: '{"path":"/mnt/data/revisio-diapositives.png"}' } },
      { type: 'tool_call', tool_call: { id: 'read2', name: 'read_file', args: { path: '/mnt/data/foto.png' } } },
    ];
    expect(withoutReviewSheets([sheet, readBack, pdf, otherRead], content)).toEqual([pdf, otherRead]);
  });

  it('returns the same array when nothing is hidden', () => {
    const list = [att('a.pdf', '/files/a.pdf')];
    expect(withoutReviewSheets(list, [])).toBe(list);
  });
});
