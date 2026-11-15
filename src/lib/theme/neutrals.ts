// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ThemeDef } from './theme-def.ts';
import { maxChroma } from './color-math.ts';
import type { Gamut } from './color-math.ts';

export type NeutralMap = Record<string, Record<string, string>>;

export const neutrals: { light: NeutralMap; dark: NeutralMap } = {
    light: {
        background: { '100': 'oklch(1 0 0)', '200': 'oklch(0.98 0.002 240)' },
        overlay: { '100': 'oklch(0 0 0 / 0.40)', '200': 'oklch(0 0 0 / 0.60)' },
        gray: { '100': 'oklch(0.96 0 0)', '200': 'oklch(0.94 0 0)', '300': 'oklch(0.92 0 0)', '400': 'oklch(0.88 0 0)', '500': 'oklch(0.75 0 0)', '600': 'oklch(0.60 0 0)', '700': 'oklch(0.45 0 0)', '800': 'oklch(0.35 0 0)', '900': 'oklch(0.20 0 0)', '1000': 'oklch(0.15 0 0)' },
        grayAlpha: { '100': 'oklch(0 0 0 / 0.05)', '200': 'oklch(0 0 0 / 0.08)', '300': 'oklch(0 0 0 / 0.12)', '400': 'oklch(0 0 0 / 0.16)', '500': 'oklch(0 0 0 / 0.24)', '600': 'oklch(0 0 0 / 0.36)', '700': 'oklch(0 0 0 / 0.48)', '800': 'oklch(0 0 0 / 0.64)', '900': 'oklch(0 0 0 / 0.82)', '1000': 'oklch(0 0 0 / 0.92)' },
    },
    dark: {
        background: { '100': 'oklch(0.12 0 0)', '200': 'oklch(0.08 0 0)' },
        overlay: { '100': 'oklch(0 0 0 / 0.40)', '200': 'oklch(0 0 0 / 0.60)' },
        gray: { '100': 'oklch(0.18 0 0)', '200': 'oklch(0.22 0 0)', '300': 'oklch(0.26 0 0)', '400': 'oklch(0.32 0 0)', '500': 'oklch(0.40 0 0)', '600': 'oklch(0.55 0 0)', '700': 'oklch(0.70 0 0)', '800': 'oklch(0.80 0 0)', '900': 'oklch(0.90 0 0)', '1000': 'oklch(0.98 0 0)' },
        grayAlpha: { '100': 'oklch(1 0 0 / 0.05)', '200': 'oklch(1 0 0 / 0.08)', '300': 'oklch(1 0 0 / 0.12)', '400': 'oklch(1 0 0 / 0.16)', '500': 'oklch(1 0 0 / 0.24)', '600': 'oklch(1 0 0 / 0.36)', '700': 'oklch(1 0 0 / 0.48)', '800': 'oklch(1 0 0 / 0.64)', '900': 'oklch(1 0 0 / 0.82)', '1000': 'oklch(1 0 0 / 0.92)' },
    },
};

export const tintProfile = (l: number): number => Math.sin(Math.PI * Math.min(1, Math.max(0, l)));

export function tintMap(map: Record<string, string>, c: number, h: number, gamut: Gamut = 'srgb'): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [shade, val] of Object.entries(map)) {
        const m = val.match(/^oklch\(\s*([\d.]+)/);
        if (!m) { out[shade] = val; continue; }
        const l = parseFloat(m[1]);
        const cc = Math.min(c * tintProfile(l), maxChroma(l, h, gamut) * 0.995);
        out[shade] = `oklch(${m[1]} ${cc.toFixed(4)} ${h})`;
    }
    return out;
}

export function effectiveNeutrals(neutral?: ThemeDef['neutral'], gamut: Gamut = 'srgb'): { light: NeutralMap; dark: NeutralMap } {
    const clone = (n: NeutralMap): NeutralMap =>
        Object.fromEntries(Object.entries(n).map(([k, v]) => [k, { ...v }]));
    const out = { light: clone(neutrals.light), dark: clone(neutrals.dark) };
    if (!neutral) return out;

    if (neutral.tint) {
        for (const grp of ['gray', 'background'] as const) {
            out.light[grp] = tintMap(out.light[grp], neutral.tint.c, neutral.tint.h, gamut);
            out.dark[grp] = tintMap(out.dark[grp], neutral.tint.c, neutral.tint.h, gamut);
        }
    }
    for (const mode of ['light', 'dark'] as const) {
        const raw = neutral[mode];
        if (!raw) continue;
        for (const [grp, shades] of Object.entries(raw)) {
            out[mode][grp] = { ...(out[mode][grp] ?? {}), ...shades };
        }
    }
    return out;
}
