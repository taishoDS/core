// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ThemeEntry, FontFaceDef } from './taisho.types';
import taisho from './themes/taisho';

export const userFonts: Record<string, string> = {
    sans: '"Geist Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    mono: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

export const userFontFaces: FontFaceDef[] = [
    { source: '@fontsource/geist-sans', subsets: ['latin'], weights: [300, 400, 500, 600, 700] },
    { source: '@fontsource/geist-mono', subsets: ['latin'], weights: [400, 500] },
];

export const userGridMins: Record<string, string> = {
    '2xs': '160px',
    'xs':  '200px',
    'sm':  '240px',
    'md':  '280px',
    'lg':  '340px',
    'xl':  '400px',
};

export const defaultStates: Record<string, string> = {
    success: '#1A9338',
    warning: '#E79C13',
    info:    '#0091FF',
    danger:  '#E5484D',
};

export const themeList: ThemeEntry[] = [
    { name: 'taisho', group: 'root', def: taisho },
];

export const userColors: Record<string, string> = Object.fromEntries(
    themeList.flatMap(t => Object.entries(t.def.colors)),
);

export const userStates: Record<string, string> = defaultStates;

export const customIconsDir = 'src/icons';
