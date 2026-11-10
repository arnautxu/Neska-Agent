import type { IThemeAppearance, ThemeDefinition, IThemeRGB } from 'librechat-data-provider';

/**
 * Neska theme, from the approved minimal design system
 * (docs/design/neska-minimal in the Neska Agent repo, `ds.css`).
 *
 * White canvas, #161616 ink, brown #6B3A1E only for "alive" and the primary action.
 * Hierarchy comes from type and space: 1px lines, 2px corners, no shadows.
 * Errors are drawn with ink and a cross, never red. Young Serif names the product
 * and sets headings; Borna is the reading face and sets short labels (see `neska.css`).
 *
 * Only the roles Neska changes are named; every other role resolves against
 * LibreChat's defaults. Dark mode keeps LibreChat's palette with a lighter brown
 * accent until Neska's own dark mode is designed.
 */

const INK = '22 22 22'; // #161616 (ink, 18.1:1 on white)
const INK_2 = '85 85 85'; // #555555 (ink-2, 7.5:1)
const INK_3 = '118 118 118'; // #767676 (ink-3, 4.5:1)
const PAPER = '255 255 255'; // #ffffff
const SUNK = '246 246 246'; // #f6f6f6
const LINE = '236 236 236'; // #ececec
const LINE_2 = '212 212 212'; // #d4d4d4
const ACC = '107 58 30'; // #6b3a1e (10.4:1)
const ACC_2 = '138 77 41'; // #8a4d29
const ACC_WASH = '247 242 238'; // #f7f2ee

export const neskaLightTheme: Partial<IThemeRGB> = {
  'rgb-text-primary': INK,
  'rgb-text-secondary': INK_2,
  'rgb-text-secondary-alt': INK_2,
  'rgb-text-tertiary': INK_3,
  'rgb-text-muted': INK_3,
  'rgb-badge-label': INK,
  'rgb-text-warning': ACC,
  'rgb-text-destructive': INK,
  'rgb-shimmer-base': INK,
  'rgb-shimmer-dip': INK_3,

  'rgb-link': ACC,
  'rgb-link-hover': ACC_2,
  'rgb-link-visited': ACC,
  'rgb-link-prose': ACC,
  'rgb-accent-primary': ACC,
  'rgb-accent-primary-hover': ACC_2,

  'rgb-ring-primary': ACC,
  'rgb-focus-outline': ACC,
  'rgb-focus-control': ACC,

  'rgb-header-primary': PAPER,
  'rgb-header-hover': SUNK,
  'rgb-header-button-hover': SUNK,

  'rgb-surface-active': SUNK,
  'rgb-surface-active-alt': LINE,
  'rgb-surface-hover': SUNK,
  'rgb-surface-hover-alt': LINE,
  'rgb-surface-pressed': LINE,
  'rgb-surface-composer-hover': SUNK,
  'rgb-surface-primary': PAPER,
  'rgb-surface-primary-alt': PAPER,
  'rgb-surface-primary-contrast': SUNK,
  'rgb-surface-secondary': PAPER,
  'rgb-surface-secondary-alt': SUNK,
  'rgb-surface-tertiary': SUNK,
  'rgb-surface-tertiary-alt': PAPER,
  'rgb-surface-dialog': PAPER,
  'rgb-dialog-title': INK,
  'rgb-surface-submit': ACC,
  'rgb-surface-submit-hover': ACC_2,
  'rgb-surface-destructive': INK,
  'rgb-surface-destructive-hover': '51 51 51',
  'rgb-surface-chat': PAPER,
  'rgb-surface-code': SUNK,
  'rgb-surface-code-body': SUNK,
  'rgb-surface-code-inline': SUNK,
  'rgb-prose-bullet': INK_3,
  'rgb-prose-quote-bar': LINE_2,
  'rgb-surface-inverted': INK,
  'rgb-button-primary': ACC,
  'rgb-button-primary-hover': ACC_2,

  'rgb-border-light': LINE,
  'rgb-border-medium': LINE,
  'rgb-border-medium-alt': LINE,
  'rgb-border-heavy': LINE_2,
  'rgb-border-xheavy': LINE_2,
  'rgb-border-destructive': INK,
  'rgb-border-control': LINE_2,
  'rgb-border-field-focus': INK,
  'rgb-focus-subtle': ACC,
  'rgb-field-fill': PAPER,
  'rgb-field-text': INK,
  'rgb-surface-tooltip': INK,
  'rgb-alert-error-fill': SUNK,
  'rgb-alert-error-border': LINE_2,

  'rgb-surface-canvas': PAPER,
  'rgb-surface-user-message': SUNK,
  'rgb-surface-card': PAPER,
  'rgb-surface-card-hover': SUNK,
  'rgb-surface-nav-hover': SUNK,
  'rgb-surface-nav-selected': ACC_WASH,
  'rgb-surface-tab-selected': SUNK,
  'rgb-surface-menu': PAPER,
  'rgb-surface-popover': PAPER,
  'rgb-border-menu': LINE_2,
  'rgb-surface-composer': PAPER,
  'rgb-surface-search': PAPER,
  'rgb-surface-sidebar': PAPER,
};

export const neskaDarkTheme: Partial<IThemeRGB> = {
  'rgb-accent-primary': '176 122 85', // #b07a55 (dark-mode accent from the UX plan)
  'rgb-accent-primary-hover': '196 145 110',
  'rgb-link': '176 122 85',
  'rgb-link-prose': '176 122 85',
  'rgb-focus-outline': '176 122 85',
  'rgb-focus-control': '176 122 85',
};

const NESKA_SANS = '"Borna", system-ui, -apple-system, "Segoe UI", sans-serif';
const NESKA_SERIF = '"Young Serif", Georgia, "Times New Roman", serif';
const NESKA_MONO = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const FLAT = '0 0 0 0 transparent';

const neskaShape: Partial<IThemeAppearance> = {
  controlRadius: '2px',
  surfaceRadius: '2px',
  largeSurfaceRadius: '4px',
  menuRadius: '2px',
  popoverRadius: '2px',
  menuPanelRadius: '2px',
  compactPanelRadius: '2px',
  composerActionRadius: '2px',
  tooltipRadius: '2px',
  tabRadius: '2px',
  radiusSm: '2px',
  radiusMd: '2px',
  radiusLg: '2px',
  radiusXl: '4px',
  radius2xl: '4px',
  radius3xl: '4px',
  authControlRadius: '2px',
  checkboxRadius: '2px',
  fontFamily: NESKA_SANS,
  displayFontFamily: NESKA_SERIF,
  dialogTitleFontFamily: NESKA_SERIF,
  monoFontFamily: NESKA_MONO,
  shadow2xs: FLAT,
  shadowXs: FLAT,
  shadowSm: FLAT,
  shadowMd: FLAT,
  shadowLg: FLAT,
  shadowXl: FLAT,
  shadow2xl: FLAT,
  elevationSurface: FLAT,
  menuShadow: FLAT,
  tooltipShadow: FLAT,
  motionFast: '120ms',
  motionNormal: '200ms',
};

export const neskaTheme: ThemeDefinition = Object.freeze({
  version: 1,
  name: 'neska',
  modes: {
    light: { colors: neskaLightTheme as IThemeRGB, appearance: neskaShape },
    dark: { colors: neskaDarkTheme as IThemeRGB, appearance: neskaShape },
  },
});
