// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { createPaletteFromHex } from '../lib/theme/palette.ts';
import { neutrals } from '../lib/theme/neutrals.ts';
import { radius } from '../lib/theme/radius-scale.ts';

export const sizing: Record<string, number> = {
    '0': 0,
    '1': 1,
    '2': 2,
    '4': 4,
    '6': 6,
    '8': 8,
    '10': 10,
    '12': 12,
    '14': 14,
    '16': 16,
    '18': 18,
    '20': 20,
    '24': 24,
    '28': 28,
    '32': 32,
    '36': 36,
    '40': 40,
    '44': 44,
    '48': 48,
    '52': 52,
    '56': 56,
    '60': 60,
    '64': 64,
    '68': 68,
    '72': 72,
    '76': 76,
    '80': 80,
    '84': 84,
    '88': 88,
    '92': 92,
    '96': 96,
    '128': 128,
    '160': 160,
    '192': 192,
    '224': 224,
    '256': 256,
};

export const gaps: Record<string, string> = {
    'none': '0px',
    'quarter': 'var(--ts-sizing-6)',
    'half': 'var(--ts-sizing-12)',
    'base': 'var(--ts-sizing-24)',
    'section': 'var(--ts-sizing-32)',
    'double': 'var(--ts-sizing-48)',
};

export const spaces: Record<string, string> = {
    'none': '0px',
    'quarter': 'var(--ts-sizing-6)',
    'half': 'var(--ts-sizing-12)',
    'base': 'var(--ts-sizing-24)',
    'section': 'var(--ts-sizing-32)',
    'double': 'var(--ts-sizing-48)',
};

type TallesDensidad = Record<'sm' | 'md' | 'lg', number> & Partial<Record<'xs', number>>;
export const densityTokens: Record<string, { comfortable: TallesDensidad; compact: TallesDensidad }> = {
    'control-h':       { comfortable: { xs: 24, sm: 32, md: 40, lg: 48 }, compact: { xs: 20, sm: 28, md: 32, lg: 40 } },
    'button-px':       { comfortable: { xs: 6, sm: 10, md: 14, lg: 20 }, compact: { xs: 4, sm: 8,  md: 10, lg: 14 } },
    'field-px':        { comfortable: { sm: 10, md: 12, lg: 14 }, compact: { sm: 8,  md: 10, lg: 12 } },
    'select-pr':       { comfortable: { sm: 32, md: 36, lg: 40 }, compact: { sm: 28, md: 32, lg: 36 } },
    'textarea-px':     { comfortable: { sm: 10, md: 12, lg: 14 }, compact: { sm: 8,  md: 10, lg: 12 } },
    'textarea-py':     { comfortable: { sm: 8,  md: 10, lg: 12 }, compact: { sm: 6,  md: 8,  lg: 10 } },
    'badge-h':         { comfortable: { sm: 20, md: 24, lg: 28 }, compact: { sm: 18, md: 20, lg: 24 } },
    'badge-px':        { comfortable: { sm: 8,  md: 10, lg: 12 }, compact: { sm: 6,  md: 8,  lg: 10 } },
    'tag-h':           { comfortable: { sm: 20, md: 24, lg: 28 }, compact: { sm: 18, md: 20, lg: 24 } },
    'tag-px':          { comfortable: { sm: 6,  md: 8,  lg: 10 }, compact: { sm: 4,  md: 6,  lg: 8  } },
    'control-box':     { comfortable: { sm: 14, md: 16, lg: 20 }, compact: { sm: 12, md: 14, lg: 16 } },
    'radio-dot':       { comfortable: { sm: 6,  md: 8,  lg: 10 }, compact: { sm: 4,  md: 6,  lg: 8  } },
};

export { densitySpacingCompact } from '../lib/theme/density-scale.ts';

export { radius };

export const borderWidths: Record<string, string> = {
    '1': '1px',
    '2': '2px',
    '3': '3px',
    '4': '4px',
};

export const blurs: Record<string, string> = {
    'none': '0px',
    'sm': '4px',
    'md': '8px',
    'lg': '16px',
    'xl': '48px',
};

export const zIndex: Record<string, string> = {
    'base': '0',
    'raised': '1',
    'pinned': '2',
    'handle': '3',
    'sticky': '10',
    'glow': '30',
    'nav': '30',
    'banner': '40',
    'nav-menu': '40',
    'dropdown': '50',
    'toast': '50',
    'overlay': '50',
    'dialog': '51',
};

export const opacities: Record<string, string> = {
    '0': '0',
    '30': '0.3',
    '40': '0.4',
    '50': '0.5',
    '60': '0.6',
    '70': '0.7',
    '75': '0.75',
    '80': '0.8',
    '90': '0.9',
    '100': '1',
    'muted': 'var(--ts-opacity-60)',
};

export const screens: Record<string, string> = {
    'sm': '640px',
    'md': '768px',
    'lg': '1024px',
    'xl': '1280px',
};

export const contrastThreshold = '0.56';

import { durations, loopDurations, reducedMotionDuration, iterations, reducedMotionIterations, easings } from '../lib/theme/motion-scale.ts';
export { durations, loopDurations, reducedMotionDuration, iterations, reducedMotionIterations, easings };
export const tr = (prop: string, duration = 'fast', ease = 'standard'): string =>
    `${prop} var(--ts-duration-${duration}) var(--ts-ease-${ease})`;

export const shadows: Record<string, string> = {
    'sm': '0 0 0 1px var(--color-grayAlpha-200), 0 1px 2px rgba(0,0,0,0.04)',
    'md': '0 0 0 1px var(--color-grayAlpha-200), 0 1px 1px rgba(0,0,0,0.02), 0 4px 8px -2px rgba(0,0,0,0.04), 0 12px 20px -6px rgba(0,0,0,0.06)',
    'lg': '0 0 0 1px var(--color-grayAlpha-200), 0 1px 1px rgba(0,0,0,0.02), 0 8px 16px -4px rgba(0,0,0,0.04), 0 20px 32px -8px rgba(0,0,0,0.06)',
    'xl': '0 0 0 1px var(--color-grayAlpha-200), 0 1px 1px rgba(0,0,0,0.02), 0 12px 24px -4px rgba(0,0,0,0.06), 0 32px 48px -8px rgba(0,0,0,0.08)',
};

const SHRGB = 'var(--ts-material-shadow-rgb, 0 0 0)';
export const matDrop: Record<string, string> = {
    sm: `0 1px 2px rgb(${SHRGB} / 0.04)`,
    md: `0 1px 1px rgb(${SHRGB} / 0.02), 0 4px 8px -2px rgb(${SHRGB} / 0.04), 0 12px 20px -6px rgb(${SHRGB} / 0.06)`,
    lg: `0 1px 1px rgb(${SHRGB} / 0.02), 0 8px 16px -4px rgb(${SHRGB} / 0.04), 0 20px 32px -8px rgb(${SHRGB} / 0.06)`,
    xl: `0 1px 1px rgb(${SHRGB} / 0.02), 0 12px 24px -4px rgb(${SHRGB} / 0.06), 0 32px 48px -8px rgb(${SHRGB} / 0.08)`,
};

export const fontSizes: Record<string, number | string> = {
    '10': `var(--ts-sizing-10)`,
    '12': `var(--ts-sizing-12)`,
    '14': `var(--ts-sizing-14)`,
    '16': `var(--ts-sizing-16)`,
    '18': `var(--ts-sizing-18)`,
    '20': `var(--ts-sizing-20)`,
    '24': `clamp(var(--ts-sizing-20), 2vw + 1rem, var(--ts-sizing-24))`,
    '28': `clamp(var(--ts-sizing-24), 2.5vw + 1rem, var(--ts-sizing-28))`,
    '32': `clamp(var(--ts-sizing-24), 3vw + 1rem, var(--ts-sizing-32))`,
    '36': `clamp(var(--ts-sizing-28), 3.5vw + 1rem, var(--ts-sizing-36))`,
    '40': `clamp(var(--ts-sizing-32), 4vw + 1rem, var(--ts-sizing-40))`,
    '48': `clamp(var(--ts-sizing-36), 5vw + 1rem, var(--ts-sizing-48))`,
    '60': `clamp(var(--ts-sizing-40), 6vw + 1rem, var(--ts-sizing-60))`,
    '72': `clamp(var(--ts-sizing-48), 7.5vw + 1rem, var(--ts-sizing-72))`,
};

export const fontWeights: Record<string, string> = {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
};

import { letterSpacing } from '../lib/theme/typography-scale.ts';
export { letterSpacing };

export const lineHeights: Record<string, string> = {
    '10': `var(--ts-sizing-14)`,
    '12': `var(--ts-sizing-16)`,
    '14': `var(--ts-sizing-20)`,
    '16': `var(--ts-sizing-24)`,
    '18': `var(--ts-sizing-28)`,
    '20': `var(--ts-sizing-28)`,
    '24': `var(--ts-sizing-32)`,
    '28': `var(--ts-sizing-36)`,
    '32': `var(--ts-sizing-40)`,
    '36': `clamp(var(--ts-sizing-32), calc(2vw + 1.25rem), var(--ts-sizing-40))`,
    '40': `clamp(var(--ts-sizing-36), calc(2.5vw + 1.5rem), var(--ts-sizing-44))`,
    '48': `clamp(var(--ts-sizing-40), calc(3vw + 1.5rem), var(--ts-sizing-52))`,
    '60': `clamp(var(--ts-sizing-48), calc(4vw + 2rem), var(--ts-sizing-64))`,
    '72': `clamp(var(--ts-sizing-60), calc(5vw + 2rem), var(--ts-sizing-72))`,
    '96': `clamp(var(--ts-sizing-72), calc(7vw + 2rem), var(--ts-sizing-96))`,
};

export function buildVocabularyColors(
    userColors: Record<string, string>,
    userStates: Record<string, string>,
): Record<string, Record<string, string>> {
    const vocabularyColors: Record<string, Record<string, string>> = { ...neutrals.light };
    for (const [name, hex] of Object.entries(userColors)) vocabularyColors[name] = createPaletteFromHex(hex, false);
    for (const [name, hex] of Object.entries(userStates)) vocabularyColors[name] = createPaletteFromHex(hex, false);
    return vocabularyColors;
}

export interface Scales {
    /** Los niveles de `--ts-sizing-N` (el nombre es el valor en px). Fija: se suman niveles con `extend.sizing`, un tema no cambia valores. */
    sizing: Record<string, number>;
    screens: Record<string, string>;
    radius: Record<string, string>;
    gaps: Record<string, string>;
    spaces: Record<string, string>;
    fontSizes: Record<string, number | string>;
    lineHeights: Record<string, string>;
    letterSpacing: Record<string, string>;
    fontWeights: Record<string, string>;
    borderWidths: Record<string, string>;
    blurs: Record<string, string>;
    opacities: Record<string, string>;
    shadows: Record<string, string>;
    /** Duraciones de transición (`motion.durations`). Los loops no se amplían. */
    durations: Record<string, string>;
    easings: Record<string, string>;
}

export const defaultScales: Scales = {
    sizing, screens, radius, gaps, spaces, fontSizes, lineHeights, letterSpacing, fontWeights, borderWidths, blurs, opacities, shadows, durations, easings,
};
