// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { oklchToRgb } from '../lib/theme/palette';
import type { ResolvedThemeTokens, ResolvedColor } from './emit-tokens';
import type { ThemeEntry } from '../config/taisho.types';
import { brazoDeModo } from '../lib/theme/sin-light-dark';

const EXT = 'com.taishods';
const EXT_P3 = 'com.taishods.p3';

export type DtcgNode = Record<string, unknown>;

export function varToAlias(value: string): string | null {
    const m = /^var\(--(?:ts-)?([a-zA-Z]+)-(.+?)\)$/.exec(value.trim());
    if (!m) return null;
    const [, kind, rest] = m;
    if (kind === 'sizing') return `{sizing.${rest}}`;
    if (kind === 'opacity') return `{opacity.${rest}}`;
    if (kind === 'color') {
        const cm = /^(.*?)-(\d+(?:-contrast)?|solid(?:-hover|-active)?(?:-contrast)?)$/.exec(rest!);
        if (cm) return `{color.${cm[1]}.${cm[2]}}`;
        return null;
    }
    return null;
}

function toDimension(value: string): DtcgNode | string {
    const alias = varToAlias(value);
    if (alias) return alias;
    const m = /^(-?[\d.]+)(px|em|rem)?$/.exec(value.trim());
    if (!m) return value;
    return { value: parseFloat(m[1]!), unit: m[2] ?? 'px' };
}

function dimensionToken(value: string): DtcgNode {
    const v = toDimension(value);
    return typeof v === 'string' && !v.startsWith('{')
        ? { $type: 'dimension', $value: v, $extensions: { [EXT]: { raw: true } } }
        : { $type: 'dimension', $value: v };
}

function durationToken(v: string): DtcgNode {
    const m = /^(-?[\d.]+)(ms|s)$/.exec(v.trim());
    return m
        ? { $type: 'duration', $value: { value: parseFloat(m[1]!), unit: m[2] } }
        : { $type: 'duration', $value: v, $extensions: { [EXT]: { raw: true } } };
}

const KEYWORD_BEZIER: Record<string, number[]> = {
    'linear': [0, 0, 1, 1], 'ease': [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1],
};
function easingToken(v: string): DtcgNode {
    const m = /^[a-z-]+\(([^)]*)\)$/.exec(v.trim());
    const nums = m ? m[1]!.split(',').map((n) => parseFloat(n)) : KEYWORD_BEZIER[v.trim()];
    return nums && nums.length === 4 && nums.every((n) => !Number.isNaN(n))
        ? { $type: 'cubicBezier', $value: nums, $extensions: { [EXT]: { css: v } } }
        : { $type: 'cubicBezier', $value: v, $extensions: { [EXT]: { css: v, unparsed: true } } };
}

function numberToken(v: string, tipo = 'number'): DtcgNode {
    const alias = tipo === 'number' ? varToAlias(v) : null;
    if (alias) return { $type: tipo, $value: alias };
    const n = Number(v);
    return v.trim() === '' || Number.isNaN(n)
        ? { $type: tipo, $value: v, $extensions: { [EXT]: { raw: true } } }
        : { $type: tipo, $value: n };
}

function pxToken(px: number): DtcgNode {
    return { $type: 'dimension', $value: { value: px, unit: 'px' } };
}

export function oklchToHex(value: string): string | null {
    const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/.exec(value.trim());
    if (!m) return null;
    const { r, g, b } = oklchToRgb(parseFloat(m[1]!), parseFloat(m[2]!), parseFloat(m[3]!));
    const hex = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function colorToken({ light, dark, p3 }: ResolvedColor): DtcgNode {
    const aliasLight = varToAlias(light);
    if (aliasLight) {
        const node: DtcgNode = { $type: 'color', $value: aliasLight };
        const aliasDark = dark !== undefined ? varToAlias(dark) : null;
        if (aliasDark && aliasDark !== aliasLight) node.$extensions = { [EXT]: { dark: aliasDark } };
        return node;
    }
    const ext: DtcgNode = {};
    if (dark !== undefined && dark !== light) ext.dark = dark;
    const hexLight = oklchToHex(light);
    if (hexLight) ext.hex = hexLight;
    if (dark !== undefined && dark !== light) {
        const hexDark = oklchToHex(dark);
        if (hexDark) ext.hexDark = hexDark;
    }
    const node: DtcgNode = { $type: 'color', $value: light };
    if (Object.keys(ext).length) node.$extensions = { [EXT]: ext };
    if (p3) node.$extensions = { ...(node.$extensions as DtcgNode | undefined), [EXT_P3]: { light: p3.light, dark: p3.dark } };
    return node;
}

export function splitTopLevel(input: string): string[] {
    const out: string[] = [];
    let depth = 0, cur = '';
    for (const ch of input) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
        cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

function tokenizeLayer(layer: string): string[] {
    const out: string[] = [];
    let depth = 0, cur = '';
    for (const ch of layer) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (/\s/.test(ch) && depth === 0) { if (cur) { out.push(cur); cur = ''; } continue; }
        cur += ch;
    }
    if (cur) out.push(cur);
    return out;
}

const isLength = (t: string) => /^-?[\d.]+(px|em|rem)?$/.test(t);

export function parseShadowLayer(layer: string): DtcgNode | null {
    const parts = tokenizeLayer(layer);
    const lengths = parts.filter(isLength);
    const colorParts = parts.filter((p) => !isLength(p));
    if (lengths.length < 3 || colorParts.length !== 1) return null;
    const color = colorParts[0]!;
    const node: DtcgNode = {
        color: varToAlias(color) ?? color,
        offsetX: toDimension(lengths[0]!),
        offsetY: toDimension(lengths[1]!),
        blur: toDimension(lengths[2]!),
        spread: lengths[3] !== undefined ? toDimension(lengths[3]) : { value: 0, unit: 'px' },
    };
    return node;
}

function shadowToken(css: string): DtcgNode {
    const layers = splitTopLevel(css).map(parseShadowLayer);
    const ext = { [EXT]: { css } };
    if (layers.some((l) => l === null)) {
        return { $type: 'shadow', $value: css, $extensions: { [EXT]: { css, unparsed: true } } };
    }
    return { $type: 'shadow', $value: layers as DtcgNode[], $extensions: ext };
}

function componentToken(v: string): DtcgNode {
    const alias = varToAlias(v);
    if (alias?.startsWith('{color.')) return { $type: 'color', $value: alias };
    if (/-gradient\(/.test(v)) return { $type: 'gradient', $value: v, $extensions: { [EXT]: { css: v, unparsed: true } } };
    if (/^#[0-9a-fA-F]{3,8}$/.test(v.trim()) || /^oklch\(/.test(v.trim())) return { $type: 'color', $value: v };
    return dimensionToken(v);
}

function mapValues<T>(obj: Record<string, T>, fn: (v: T, k: string) => DtcgNode): DtcgNode {
    const out: DtcgNode = {};
    for (const [k, v] of Object.entries(obj)) out[k] = fn(v, k);
    return out;
}

export function buildDtcg(entry: ThemeEntry, model: ResolvedThemeTokens): DtcgNode {
    const t = model;

    const color: DtcgNode = {};
    for (const [palette, shades] of Object.entries(t.colors)) {
        color[palette] = mapValues(shades, (c) => colorToken(c));
    }
    color.semantic = mapValues(t.semantic, (v) => colorToken({ light: brazoDeModo(v, 0), dark: brazoDeModo(v, 1) }));
    const state: DtcgNode = {};
    for (const [name, s] of Object.entries(t.states)) {
        if (s.kind === 'status') {
            state[name] = {
                default:  { $type: 'color', $value: `{color.${name}.500}` },
                bg:       { $type: 'color', $value: `{color.${name}.100}` },
                border:   { $type: 'color', $value: `{color.${name}.200}` },
                contrast: { $type: 'color', $value: `{color.${name}.500-contrast}` },
                text:     { $type: 'color', $value: `{color.${name}.700}` },
            };
        } else {
            const base = `oklch(${s.l} ${s.c} ${s.h})`;
            const hex = oklchToHex(base);
            state[name] = {
                default:  { $type: 'color', $value: base, ...(hex ? { $extensions: { [EXT]: { hex } } } : {}) },
                bg:       { $type: 'color', $value: `{color.${name}.100}` },
                border:   { $type: 'color', $value: `{color.${name}.200}` },
                contrast: {
                    $type: 'color',
                    $value: varToAlias(s.contrastLight) ?? s.contrastLight,
                    $extensions: { [EXT]: { dark: varToAlias(s.contrastDark) ?? s.contrastDark } },
                },
            };
        }
    }
    color.state = state;

    const density: DtcgNode = {
        comfortable: mapValues(t.densityComfortable, (sizes) => mapValues(sizes, (px) => pxToken(px))),
        compact: mapValues(t.densityCompact, (sizes) => mapValues(sizes, (px) => pxToken(px))),
        compactSpacing: mapValues(t.densitySpacingCompact, (v) => dimensionToken(v)),
        ...(JSON.stringify(t.densitySpacesCompact) === JSON.stringify(t.densitySpacingCompact) ? {} : { compactSpaces: mapValues(t.densitySpacesCompact, (v) => dimensionToken(v)) }),
    };

    const root: DtcgNode = {
        $description: `Tokens del tema "${entry.name}" de TaishoDS (generado — no editar a mano).`,
        sizing: mapValues(t.sizing, (px) => pxToken(px)),
        color,
        fontFamily: mapValues(t.fonts, (v) => ({ $type: 'fontFamily', $value: v })),
        fontSize: mapValues(t.fontSizes, (v) => dimensionToken(String(v))),
        lineHeight: mapValues(t.lineHeights, (v) => dimensionToken(v)),
        letterSpacing: mapValues(t.letterSpacing, (v) => dimensionToken(v)),
        fontWeight: mapValues(t.fontWeights, (v) => numberToken(v, 'fontWeight')),
        spacing: {
            gap: mapValues(t.gaps, (v) => dimensionToken(v)),
            space: mapValues(t.spaces, (v) => dimensionToken(v)),
        },
        radius: mapValues(t.radius, (v) => dimensionToken(v)),
        borderWidth: mapValues(t.borderWidths, (v) => dimensionToken(v)),
        blur: mapValues(t.blurs, (v) => dimensionToken(v)),
        screen: mapValues(t.screens, (v) => dimensionToken(v)),
        ...(Object.keys(t.components).length ? { components: mapValues(t.components, ({ tokens }) => mapValues(tokens, (v) => componentToken(v))) } : {}),
        contrast: { threshold: numberToken(t.contrastThreshold) },
        opacity: mapValues(t.opacities, (v) => numberToken(v)),
        zIndex: mapValues(t.zIndex, (v) => numberToken(v)),
        shadow: mapValues(t.shadows, (v) => shadowToken(v)),
        duration: mapValues({ ...t.motion.durations, ...t.motion.loops }, (v) => durationToken(v)),
        iterations: mapValues(t.motion.iterations, (v) => numberToken(v)),
        easing: mapValues(t.motion.easings, (v) => easingToken(v)),
        density,
    };

    const material: DtcgNode = {};
    for (const mode of ['light', 'dark'] as const) {
        const m = t.material[mode];
        if (!m || !(m.bg || m.border || m.shadowRgb)) continue;
        material[mode] = {
            ...(m.bg ? { bg: varToAlias(m.bg) ?? m.bg } : {}),
            ...(m.border ? { border: varToAlias(m.border) ?? m.border } : {}),
            ...(m.shadowRgb ? { shadowRgb: m.shadowRgb } : {}),
        };
    }
    root.$extensions = {
        [EXT]: {
            theme: entry.name,
            ...(Object.keys(material).length ? { material } : {}),
            spotlight: { light: varToAlias(t.spotlight.light) ?? t.spotlight.light, dark: varToAlias(t.spotlight.dark) ?? t.spotlight.dark },
            cornerShape: t.cornerShape,
            focusRing: t.focusRing ? (varToAlias(t.focusRing) ?? t.focusRing) : '{color.brand.solid}',
        },
    };

    return root;
}

export function buildTokensDTCG(entry: ThemeEntry, model: ResolvedThemeTokens): string {
    return JSON.stringify(buildDtcg(entry, model), null, 2) + '\n';
}
