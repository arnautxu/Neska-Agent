import { neskaLightTheme } from './neska';

function luminance(rgb: string): number {
  const [r, g, b] = rgb.split(' ').map((v) => {
    const c = Number(v) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('neska light theme', () => {
  it('draws the tooltip label readable on its dark fill', () => {
    const text = neskaLightTheme['rgb-text-tooltip'];
    const fill = neskaLightTheme['rgb-surface-tooltip'];
    expect(text).toBeDefined();
    expect(fill).toBeDefined();
    expect(contrast(text as string, fill as string)).toBeGreaterThanOrEqual(4.5);
  });
});
