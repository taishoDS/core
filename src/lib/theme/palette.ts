// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { neutrals } from './neutrals.ts';
import type { NeutralMap } from './neutrals.ts';
import { luminanceOklch, maxChroma, wcagRatio } from './color-math.ts';
import type { Gamut } from './color-math.ts';

export type { Gamut };

export interface ColorPalette extends Record<string, string> {
    '100': string; '200': string; '300': string; '400': string; '500': string;
    '600': string; '700': string; '800': string; '900': string; '1000': string;
}

export function parseHex(hex: string) {
    if (!/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
        throw new Error(`[TaishoDS] Invalid hex color provided: "${hex}". Please use a valid hex format (e.g. #FF0000).`);
    }
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return { r, g, b };
}

export function rgbToOklch(r: number, g: number, b: number) {
    const srgbInverseTransfer = (val: number): number => {
        if (val <= 0.04045) return val / 12.92;
        return Math.pow((val + 0.055) / 1.055, 2.4);
    };

    const rLin = srgbInverseTransfer(r);
    const gLin = srgbInverseTransfer(g);
    const bLin = srgbInverseTransfer(b);

    const l = Math.cbrt(0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin);
    const m = Math.cbrt(0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin);
    const s = Math.cbrt(0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin);

    const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    const bVal = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

    const C = Math.sqrt(a * a + bVal * bVal);
    let H = Math.atan2(bVal, a) * (180 / Math.PI);
    if (H < 0) H += 360;

    return { l: L, c: C, h: H };
}

export function oklchToRgb(l: number, c: number, h: number) {
    const hRad = h * (Math.PI / 180);
    const L = l;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const rLinear = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    const srgbTransfer = (val: number): number => {
        if (val <= 0.0031308) return 12.92 * val;
        return 1.055 * Math.pow(val, 1.0 / 2.4) - 0.055;
    };

    return {
        r: Math.max(0, Math.min(1, srgbTransfer(rLinear))),
        g: Math.max(0, Math.min(1, srgbTransfer(gLinear))),
        b: Math.max(0, Math.min(1, srgbTransfer(bLinear)))
    };
}

export function getLuminance(r: number, g: number, b: number): number {
    const toLinear = (v: number): number => {
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export type Mode = 'light' | 'dark';
export const SHADES = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'] as const;
export type Shade = (typeof SHADES)[number];
export interface Oklch { l: number; c: number; h: number }

export interface ContrastNeutral extends Oklch { ref: string; y: number }

const parseNum = (t: string, pctScale: number): number => (t.endsWith('%') ? parseFloat(t) / 100 * pctScale : parseFloat(t));

export function parseSeed(input: string): Oklch {
    const s = input.trim();
    const m = s.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*\)$/i);
    if (m) {
        const l = parseNum(m[1], 1), c = parseNum(m[2], 0.4), h = parseFloat(m[3]);
        if (!(l >= 0 && l <= 1 && c >= 0 && c <= 0.5 && h >= 0 && h <= 360)) {
            throw new Error(`[TaishoDS] oklch fuera de rango: "${input}". Se usa L 0–1 (o %), C 0–0.5 y H 0–360.`);
        }
        return { l, c, h: h % 360 };
    }
    if (/^oklch\(/i.test(s)) {
        throw new Error(`[TaishoDS] Invalid oklch color provided: "${input}". Formato: oklch(0.62 0.19 259) (sin alfa).`);
    }
    const { r, g, b } = parseHex(s);
    return rgbToOklch(r, g, b);
}

const toContrastNeutral = (ref: string, css: string | undefined, fallback: string): ContrastNeutral => {
    let o: Oklch;
    try { o = parseSeed(css ?? fallback); } catch { o = parseSeed(fallback); }
    return { ref, ...o, y: luminanceOklch(o.l, o.c, o.h) };
};

export function contrastNeutrals(isDark: boolean, eff?: { light: NeutralMap; dark: NeutralMap }): [ContrastNeutral, ContrastNeutral] {
    const mode = isDark ? 'dark' : 'light';
    const base = neutrals[mode].gray, cur = eff?.[mode]?.gray;
    return [
        toContrastNeutral('var(--color-gray-100)', cur?.['100'], base['100']),
        toContrastNeutral('var(--color-gray-1000)', cur?.['1000'], base['1000']),
    ];
}

const DEFAULT_NEUTRALS: Record<Mode, [ContrastNeutral, ContrastNeutral]> = {
    light: contrastNeutrals(false), dark: contrastNeutrals(true),
};

function pickContrast(y: number, pair: [ContrastNeutral, ContrastNeutral]): { neutral: ContrastNeutral; ratio: number } {
    const r0 = wcagRatio(y, pair[0].y), r1 = wcagRatio(y, pair[1].y);
    return r0 >= r1 ? { neutral: pair[0], ratio: r0 } : { neutral: pair[1], ratio: r1 };
}

export function getContrastColor(l: number, c: number, h: number, isDark: boolean): string {
    return pickContrast(luminanceOklch(l, c, h), DEFAULT_NEUTRALS[isDark ? 'dark' : 'light']).neutral.ref;
}

interface ModeSpec { bgY: number; target: number[]; win: [number, number][]; prof: number[] }
const SPEC: Record<Mode, ModeSpec> = {
    light: {
        bgY: 1,
        target: [1.08, 1.22, 1.5, 2.1, 3.6, 6.0, 8.5, 12, 16, 19],
        win: [[1.03, 1.15], [1.15, 1.35], [1.35, 1.8], [1.8, 3.0], [3.0, 4.2], [5.3, 7.0], [7.0, 10], [10, 13.5], [13.5, 17.5], [17.5, 21]],
        prof: [0.12, 0.25, 0.45, 0.75, 1, 1, 0.9, 0.75, 0.6, 0.45],
    },
    dark: {
        bgY: 0.12 ** 3,
        target: [1.04, 1.12, 1.3, 1.8, 3.4, 5.8, 7.8, 11, 15, 18],
        win: [[1.0, 1.08], [1.08, 1.2], [1.2, 1.5], [1.5, 2.6], [2.6, 4.1], [5.0, 6.8], [6.8, 9.5], [9.5, 13], [13, 16.5], [16.5, 20]],
        prof: [0.22, 0.3, 0.45, 0.6, 1, 0.95, 0.8, 0.6, 0.4, 0.2],
    },
};

const hueRot = (h: number, l: number): number =>
    Math.max(0, 1 - Math.abs(h - 90) / 35) * Math.max(-40, Math.min(12, 80 * (l - 0.8)));

const yFromRatio = (R: number, bgY: number, isLight: boolean): number => (isLight ? (bgY + 0.05) / R - 0.05 : R * (bgY + 0.05) - 0.05);

export interface ScaleStep extends Oklch {
    shade: Shade;
    y: number;
    ratio: number;
    css: string;
    contrast: string;
    contrastRatio: number;
    seed: boolean;
}
export interface Scale {
    steps: ScaleStep[];
    seedStep: number;
    adjusted: boolean;
    dL: number;
}

const fmt = (l: number, c: number, h: number) => `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(2)})`;

export function buildScale(seed: Oklch, mode: Mode, gamut: Gamut = 'srgb', pair: [ContrastNeutral, ContrastNeutral] = DEFAULT_NEUTRALS[mode]): Scale {
    const sp = SPEC[mode], isLight = mode === 'light';
    const Ls = seed.l, Hs = seed.h;
    const Cs = Math.min(seed.c, maxChroma(Ls, Hs, gamut));
    const Rs = wcagRatio(luminanceOklch(Ls, Cs, Hs), sp.bgY);

    let k = 0, best = Infinity;
    sp.win.forEach(([a, b], i) => {
        const d = Rs < a ? Math.log(a / Rs) : Rs > b ? Math.log(Rs / b) : 0;
        const score = d * 100 + Math.abs(Math.log(Rs / sp.target[i]));
        if (score < best) { best = score; k = i; }
    });
    const [wa, wb] = sp.win[k];
    const adjusted = Rs < wa || Rs > wb;
    const rotSeed = hueRot(Hs, Ls);

    const steps: ScaleStep[] = sp.target.map((T, i) => {
        let L: number, C: number, H: number;
        if (i === k && !adjusted) {
            L = Ls; C = Cs; H = Hs;
        } else {
            const Yt = yFromRatio(i === k ? Math.min(wb, Math.max(wa, Rs)) : T, sp.bgY, isLight);
            const cap = Cs * sp.prof[i];
            const at = (l: number): [number, number] => {
                const h = (Hs + hueRot(Hs, l) - rotSeed + 360) % 360;
                return [Math.min(cap, maxChroma(l, h, gamut) * 0.995), h];
            };
            const f = (l: number): number => { const [c, h] = at(l); return luminanceOklch(l, c, h) - Yt; };
            let lo = 0, hi = 1, flo = f(0), fhi = f(1), side = 0;
            L = 0.5;
            for (let it = 0; it < 60; it++) {
                L = (lo * fhi - hi * flo) / (fhi - flo);
                const fl = f(L);
                if (Math.abs(fl) < 1e-10) break;
                if (fl < 0) { lo = L; flo = fl; if (side === -1) fhi /= 2; side = -1; }
                else { hi = L; fhi = fl; if (side === 1) flo /= 2; side = 1; }
            }
            [C, H] = at(L);
        }
        const y = luminanceOklch(L, C, H);
        const { neutral, ratio } = pickContrast(y, pair);
        return {
            shade: SHADES[i], l: L, c: C, h: H, y, ratio: wcagRatio(y, sp.bgY), css: fmt(L, C, H),
            contrast: neutral.ref, contrastRatio: ratio,
            seed: i === k,
        };
    });
    return { steps, seedStep: k, adjusted, dL: adjusted ? steps[k].l - Ls : 0 };
}

export function scaleToPalette(scale: Scale): ColorPalette {
    const palette: Record<string, string> = {};
    for (const s of scale.steps) {
        palette[s.shade] = s.css;
        palette[`${s.shade}-contrast`] = s.contrast;
    }
    return palette as ColorPalette;
}

export function createPaletteFromHex(hex: string, isDark: boolean, gamut: Gamut = 'srgb', eff?: { light: NeutralMap; dark: NeutralMap }): ColorPalette {
    return scaleToPalette(buildScale(parseSeed(hex), isDark ? 'dark' : 'light', gamut, eff ? contrastNeutrals(isDark, eff) : undefined));
}

export const CROMA_NEUTRA = 0.02;
export const L_SEMILLA_BLANCA = 0.97;
export const esSemillaBlanca = (semilla: string): boolean => parseSeed(semilla).l >= L_SEMILLA_BLANCA;

export type PasosSolido = [number, number, number];

export function pasosDelSolido(name: string, seed: Oklch, light: Scale, dark?: Scale): { light: PasosSolido; dark: PasosSolido } {
    if (name === 'warning') {
        const conHover = (escala: Scale, oscurecer: 1 | -1): PasosSolido => {
            const n = escala.seedStep;
            const tope = (i: number) => Math.min(Math.max(i, 0), SHADES.length - 1);
            const oscuro = tope(n + oscurecer);
            const h = escala.steps[oscuro].contrast === escala.steps[n].contrast ? oscuro : tope(n - oscurecer);
            return [n, h, h];
        };
        return { light: conHover(light, 1), dark: conHover(dark ?? buildScale(seed, 'dark'), -1) };
    }
    const base = 5;
    const trio = (n: number): PasosSolido => (n >= 8 ? [n, n - 1, n - 2] : [n, n + 1, n + 2]);
    const nLight = Math.max(light.seedStep, base);
    return { light: trio(nLight), dark: trio(seed.c < CROMA_NEUTRA ? nLight : base) };
}

function solidoDePasos(name: string, scale: Scale, pasos: PasosSolido): Record<string, string> {
    const out: Record<string, string> = {};
    (['solid', 'solid-hover', 'solid-active'] as const).forEach((k, i) => {
        out[k] = `var(--color-${name}-${SHADES[pasos[i]]})`;
        out[`${k}-contrast`] = scale.steps[pasos[i]].contrast;
    });
    return out;
}

export type PaletasPorModo = { light: Record<string, Record<string, string>>; dark: Record<string, Record<string, string>> };
export type EscalasDeSemillas = Record<string, { light: Scale; dark: Scale }>;

export function paletasDeSemillas(seeds: Record<string, string>, eff: { light: NeutralMap; dark: NeutralMap }, gamut: Gamut): PaletasPorModo & { escalas: EscalasDeSemillas } {
    const out: PaletasPorModo & { escalas: EscalasDeSemillas } = { light: {}, dark: {}, escalas: {} };
    for (const [name, hex] of Object.entries(seeds)) {
        const seed = parseSeed(hex);
        const light = buildScale(seed, 'light', gamut, contrastNeutrals(false, eff));
        const dark = buildScale(seed, 'dark', gamut, contrastNeutrals(true, eff));
        const pasos = pasosDelSolido(name, seed, light, dark);
        out.light[name] = { ...scaleToPalette(light), ...solidoDePasos(name, light, pasos.light) };
        out.dark[name] = { ...scaleToPalette(dark), ...solidoDePasos(name, dark, pasos.dark) };
        out.escalas[name] = { light, dark };
    }
    return out;
}

const PRIMARIO_VARS = ['solid', 'solid-hover', 'solid-active'] as const;

export function semillaPrimaria(def: { primary?: string }): string | undefined {
    return def.primary;
}

export const primarioComoMarca: Record<string, string> = Object.fromEntries(
    PRIMARIO_VARS.flatMap((k) => [[k, `var(--color-brand-${k})`], [`${k}-contrast`, `var(--color-brand-${k}-contrast)`]]),
);

export function solidoPrimario(semilla: string, eff: { light: NeutralMap; dark: NeutralMap }, gamut: Gamut): { light: Record<string, string>; dark: Record<string, string>; escalas: { light: Scale; dark: Scale } } {
    const seed = parseSeed(semilla);
    const light = buildScale(seed, 'light', gamut, contrastNeutrals(false, eff));
    const dark = buildScale(seed, 'dark', gamut, contrastNeutrals(true, eff));
    const pasos = pasosDelSolido('primary', seed, light);
    const literales = (scale: Scale, p: PasosSolido): Record<string, string> => {
        const out: Record<string, string> = {};
        PRIMARIO_VARS.forEach((k, i) => {
            out[k] = scale.steps[p[i]].css;
            out[`${k}-contrast`] = scale.steps[p[i]].contrast;
        });
        return out;
    };
    return { light: literales(light, pasos.light), dark: literales(dark, pasos.dark), escalas: { light, dark } };
}

export function paletasDePrimario(semilla: string | undefined, eff: { light: NeutralMap; dark: NeutralMap }, gamut: Gamut): PaletasPorModo & { escalas: EscalasDeSemillas } {
    if (semilla === undefined) return { light: { primary: primarioComoMarca }, dark: { primary: primarioComoMarca }, escalas: {} };
    const { light, dark, escalas } = solidoPrimario(semilla, eff, gamut);
    return { light: { primary: light }, dark: { primary: dark }, escalas: { primary: escalas } };
}

export function diferenciasP3(srgb: PaletasPorModo, p3: PaletasPorModo): Record<string, Record<string, { light: string; dark: string }>> {
    const out: Record<string, Record<string, { light: string; dark: string }>> = {};
    for (const [name, pal] of Object.entries(p3.light)) {
        for (const [shade, light] of Object.entries(pal)) {
            const dark = p3.dark[name]?.[shade] ?? light;
            if (light === srgb.light[name]?.[shade] && dark === (srgb.dark[name]?.[shade] ?? srgb.light[name]?.[shade])) continue;
            (out[name] ??= {})[shade] = { light, dark };
        }
    }
    return out;
}
