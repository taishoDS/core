// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { neutrals } from './neutrals';

export type V3 = [number, number, number];
export type Gamut = 'srgb' | 'p3';
export type Mode = 'light' | 'dark';
export interface Oklch { l: number; c: number; h: number }

const D2R = Math.PI / 180;

export function oklchToLinSrgb({ l, c, h }: Oklch): V3 {
    const a = c * Math.cos(h * D2R), b = c * Math.sin(h * D2R);
    const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
        4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
        -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
        -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
    ];
}

export function linSrgbToLinP3([r, g, b]: V3): V3 {
    const X = 0.4123908 * r + 0.3575843 * g + 0.1804808 * b;
    const Y = 0.212639 * r + 0.7151687 * g + 0.0721923 * b;
    const Z = 0.0193308 * r + 0.1191948 * g + 0.9505322 * b;
    return [
        2.4934969 * X - 0.9313836 * Y - 0.4027108 * Z,
        -0.829489 * X + 1.7626641 * Y + 0.0236247 * Z,
        0.0358458 * X - 0.0761724 * Y + 0.9568845 * Z,
    ];
}

export const luminance = (c: Oklch): number => {
    const [r, g, b] = oklchToLinSrgb(c);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function inGamut(c: Oklch, gamut: Gamut, eps = 5e-4): boolean {
    const lin = oklchToLinSrgb(c);
    return (gamut === 'srgb' ? lin : linSrgbToLinP3(lin)).every(x => x >= -eps && x <= 1 + eps);
}

export const wcag = (y1: number, y2: number): number => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const enc = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

export function apcaY(c: Oklch): number {
    const [r, g, b] = oklchToLinSrgb(c).map(x => clamp01(enc(clamp01(x))) ** 2.4);
    return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
}

export function apca(textY: number, bgY: number): number {
    const soft = (y: number) => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y);
    const t = soft(textY), b = soft(bgY);
    if (Math.abs(b - t) < 0.0005) return 0;
    if (b > t) { const s = (b ** 0.56 - t ** 0.57) * 1.14; return s < 0.1 ? 0 : (s - 0.027) * 100; }
    const s = (b ** 0.65 - t ** 0.62) * 1.14;
    return s > -0.1 ? 0 : (s + 0.027) * 100;
}

const CVD_MATRIX = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
    tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
} as const;
export type Cvd = keyof typeof CVD_MATRIX;
export const CVD_KINDS = Object.keys(CVD_MATRIX) as Cvd[];

type Lab = V3;
function linSrgbToOklab([r, g, b]: V3): Lab {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}
const oklchToOklab = ({ l, c, h }: Oklch): Lab => [l, c * Math.cos(h * D2R), c * Math.sin(h * D2R)];

export function simulateCvd(c: Oklch, kind: Cvd): Lab {
    const v = oklchToLinSrgb(c).map(clamp01);
    const out = CVD_MATRIX[kind].map(row => clamp01(row[0] * v[0] + row[1] * v[1] + row[2] * v[2])) as V3;
    return linSrgbToOklab(out);
}

export function deltaEOk(a: Oklch, b: Oklch, kind?: Cvd): number {
    const A = kind ? simulateCvd(a, kind) : oklchToOklab(a);
    const B = kind ? simulateCvd(b, kind) : oklchToOklab(b);
    return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

export type Vars = Map<string, string>;

function splitTop(s: string): string[] {
    const out: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') depth--;
        else if (s[i] === ',' && depth === 0) { out.push(s.slice(start, i).trim()); start = i + 1; }
    }
    out.push(s.slice(start).trim());
    return out;
}

function blocks(css: string): { sel: string; body: string }[] {
    const out: { sel: string; body: string }[] = [];
    let depth = 0, selStart = 0, bodyStart = 0, sel = '';
    for (let i = 0; i < css.length; i++) {
        if (css[i] === '{') {
            if (depth === 0) { sel = css.slice(selStart, i).trim(); bodyStart = i + 1; }
            depth++;
        } else if (css[i] === '}') {
            depth--;
            if (depth === 0) { out.push({ sel, body: css.slice(bodyStart, i) }); selStart = i + 1; }
        }
    }
    return out;
}

function decls(body: string): Vars {
    const m: Vars = new Map();
    for (const d of body.split(';')) {
        const i = d.indexOf(':');
        const k = d.slice(0, i).trim();
        if (i > 0 && k.startsWith('--')) m.set(k, d.slice(i + 1).trim());
    }
    return m;
}

export interface ParsedCss {
    srgb: Record<Mode, Vars>;
    p3: Record<Mode, Vars> | null;
}

export function parseThemeCss(rawCss: string, extra?: Record<Mode, Vars>): ParsedCss {
    const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const base: Record<Mode, Vars> = { light: new Map(), dark: new Map() };
    const p3: Record<Mode, Vars> = { light: new Map(), dark: new Map() };
    let hasP3 = false;
    const take = (target: Record<Mode, Vars>, src: string) => {
        for (const { sel, body } of blocks(src)) {
            if (sel === ':root') for (const [k, v] of decls(body)) target.light.set(k, v);
            else if (sel === '.dark') for (const [k, v] of decls(body)) target.dark.set(k, v);
        }
    };
    for (const { sel, body } of blocks(css)) {
        if (/^@media\s*\(\s*color-gamut\s*:\s*p3\s*\)$/.test(sel)) { hasP3 = true; take(p3, body); }
        else take(base, `${sel}{${body}}`);
    }
    const layer = (m: Mode, over: Vars): Vars => {
        const out: Vars = new Map();
        for (const [grp, shades] of Object.entries(neutrals[m]))
            for (const [shade, val] of Object.entries(shades)) out.set(`--color-${grp}-${shade}`, val);
        for (const [k, v] of extra?.[m] ?? []) out.set(k, v);
        for (const [k, v] of over) out.set(k, v);
        return out;
    };
    const merged = (src: Record<Mode, Vars>): Record<Mode, Vars> => ({
        light: layer('light', src.light),
        dark: layer('dark', new Map([...src.light, ...src.dark])),
    });
    const srgb = merged(base);
    return {
        srgb,
        p3: hasP3
            ? {
                light: new Map([...srgb.light, ...p3.light]),
                dark: new Map([...srgb.dark, ...p3.light, ...p3.dark]),
            }
            : null,
    };
}

export function resolveColor(name: string, vars: Vars, mode: Mode, seen = new Set<string>()): Oklch | null {
    if (seen.has(name)) return null;
    seen.add(name);
    let v = vars.get(name)?.trim();
    if (!v) return null;
    const ld = v.match(/^light-dark\((.+)\)$/);
    if (ld) v = splitTop(ld[1])[mode === 'light' ? 0 : 1];
    const ref = v.match(/^var\((--[\w-]+)\)$/);
    if (ref) return resolveColor(ref[1], vars, mode, seen);
    const ok = v.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
    return ok ? { l: +ok[1], c: +ok[2], h: +ok[3] } : null;
}

export const SHADES = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'] as const;

export function families(vars: Vars): string[] {
    const out = new Set<string>();
    for (const k of vars.keys()) {
        const m = k.match(/^--color-(.+)-500-contrast$/);
        if (m) out.add(m[1]);
    }
    return [...out];
}

export function toHex(c: Oklch): string {
    return '#' + oklchToLinSrgb(c).map(x => Math.round(clamp01(enc(clamp01(x))) * 255).toString(16).padStart(2, '0')).join('');
}

export function maxChromaBisect(l: number, h: number, gamut: Gamut): number {
    let lo = 0, hi = 0.5;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (inGamut({ l, c: m, h }, gamut, 1e-9)) lo = m; else hi = m; }
    return lo;
}

export function sweepSeeds(): Record<string, string> {
    const out: Record<string, string> = {};
    let n = 0;
    for (let h = 0; h < 360; h += 5) for (const l of [0.45, 0.6, 0.75]) for (const f of [0.4, 0.7, 1]) {
        out[`s${String(n++).padStart(3, '0')}`] = toHex({ l, c: maxChromaBisect(l, h, 'srgb') * f, h });
    }
    return out;
}
