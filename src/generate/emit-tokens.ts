// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { conRespaldo } from './emit-fonts';
import { enPx } from './emit-reset';
import {
    densityTokens, densitySpacingCompact, defaultScales, type Scales,
    loopDurations, reducedMotionDuration, iterations, reducedMotionIterations, zIndex, contrastThreshold,
} from '../config/scales';
import { diferenciasP3, esSemillaBlanca, getContrastColor, parseSeed, paletasDePrimario, paletasDeSemillas, semillaPrimaria, SHADES } from '../lib/theme/palette';
import type { EscalasDeSemillas } from '../lib/theme/palette';
import { effectiveNeutrals } from '../lib/theme/neutrals';
import { luzOscuro, spotlightDeTema } from '../lib/theme/opciones';
import { interlineadoRtl, reglaRtl, trackingRtl } from '../lib/theme/typography-scale';
import { anchosDeFocoEnCero } from '../lib/theme/aviso-borde';
import { radiosSquircle } from '../lib/theme/radius-scale';
import type { ThemeEntry, ThemeDef } from '../config/taisho.types';
import type { WarningData } from './avisos-tipos';
import { tokensDeExtensiones } from './registro';
import type { TaishoExtensions } from './extension';
import { MEDIA_OSCURO, RAIZ_POR_SISTEMA, type DarkMode } from '../lib/theme/modo-oscuro';
import { bloqueSinLightDark } from '../lib/theme/sin-light-dark';
import { haloSinLightDark } from './foco';

export interface MaterialVars { bg?: string; border?: string; shadowRgb?: string; }
/**
 * Un color con su valor en light y (opcional) su valor en dark. `p3`: el par para pantallas Display-P3,
 * SÓLO si difiere del sRGB (donde sRGB recorta la croma); sin `p3`, el valor sRGB vale para las dos gamas.
 */
export interface ResolvedColor { light: string; dark?: string; p3?: { light: string; dark: string }; }
/** Estado de status (success/warning/…): alias a la paleta `--color-{name}-*`. */
export interface ResolvedStateStatus { kind: 'status'; }
/** Estado custom: color plano OKLCH + contraste por modo. */
export interface ResolvedStateCustom {
    kind: 'custom';
    l: number; c: number; h: number;
    contrastLight: string; contrastDark: string;
}
export type ResolvedState = ResolvedStateStatus | ResolvedStateCustom;

export interface ResolvedThemeTokens {
    sizing: Record<string, number>;
    fontSizes: Record<string, number | string>;
    lineHeights: Record<string, string>;
    letterSpacing: Record<string, string>;
    fontWeights: Record<string, string>;
    /** Declaraciones de la regla de los idiomas RTL que el tema cambia (interlineado y tracking); `undefined` = el reset ya las tiene. */
    rtl?: string[];
    fonts: Record<string, string>;
    /** paleta → shade → { light, dark? }. Orden: neutros, colores del tema, estados. */
    colors: Record<string, Record<string, ResolvedColor>>;
    semantic: Record<string, string>;
    /** Orden = orden de `effectiveStates`. */
    states: Record<string, ResolvedState>;
    gaps: Record<string, string>;
    spaces: Record<string, string>;
    radius: Record<string, string>;
    /** Forma de las esquinas del tema: con `squircle` se emite el bloque `@supports (corner-shape: squircle)` con la escala de radios subida un paso. */
    cornerShape: 'round' | 'squircle';
    borderWidths: Record<string, string>;
    blurs: Record<string, string>;
    zIndex: Record<string, string>;
    opacities: Record<string, string>;
    screens: Record<string, string>;
    /** Tokens de los componentes de las extensiones, por slug: `--ts-<prefix>-<clave>`. Vacío sin extensiones. */
    components: Record<string, { prefix: string; tokens: Record<string, string> }>;
    contrastThreshold: string;
    /** Color del aro de foco del tema; `undefined` = no se emite y cada aro usa su color por defecto. */
    focusRing?: string;
    shadows: Record<string, string>;
    /** Motion: `durations` (transiciones, se anulan con reduced-motion), `loops` (duraciones de las infinitas), `iterations` (repeticiones de los bucles ambientales, se anulan con reduced-motion) y curvas. */
    motion: { durations: Record<string, string>; loops: Record<string, string>; iterations: Record<string, string>; easings: Record<string, string> };
    densityComfortable: Record<string, Record<string, number>>;
    densityCompact: Record<string, Record<string, number>>;
    /** Gaps del modo compact (los de fábrica y lo que el tema cambia). */
    densitySpacingCompact: Record<string, string>;
    /** Spaces del modo compact. */
    densitySpacesCompact: Record<string, string>;
    /** Sólo lo que el tema cambia de la densidad, por modo: alimenta `var(--ts-density-<modo>-<familia>-<talle>)` del override local. `undefined` sin densidad en el tema. */
    densityOverrides?: { comfortable: Record<string, Record<string, number>>; compact: Record<string, Record<string, number>> };
    material: { light?: MaterialVars; dark?: MaterialVars };
    spotlight: { light: string; dark: string };
    /** Semillas que el motor tuvo que correr para que el texto se lea: avisos `seed-shifted`. */
    warnings: WarningData[];
}

const UMBRAL_AVISO_DL = 0.01;

function tipografiaRtlDeTema(ov: Partial<ThemeDef>, letterSpacingEfectivo: Record<string, string>, sizing: Record<string, number>): string[] | undefined {
    const decls = [
        ...(ov.letterSpacing?.normal === undefined ? [] : trackingRtl(letterSpacingEfectivo)),
        ...interlineadoRtl(ov.lineHeights ?? {}, (v) => enPx(v, sizing)),
    ];
    return decls.length ? decls : undefined;
}

const tallesDeTema = (modo: Record<string, unknown> | undefined, familia: string): Record<string, number> =>
    (familia === 'spacing' ? {} : (modo?.[familia] as Record<string, number> | undefined)) ?? {};

function densidadDeTema(density: ThemeDef['density']): ResolvedThemeTokens['densityOverrides'] {
    const out = { comfortable: {} as Record<string, Record<string, number>>, compact: {} as Record<string, Record<string, number>> };
    for (const modo of ['comfortable', 'compact'] as const) {
        for (const familia of Object.keys(densityTokens)) {
            const talles = tallesDeTema(density?.[modo], familia);
            if (Object.keys(talles).length) out[modo][familia] = talles;
        }
    }
    return Object.keys(out.comfortable).length || Object.keys(out.compact).length ? out : undefined;
}

function avisosDeSemillas(tema: string, escalas: EscalasDeSemillas, semillas: Record<string, string>): WarningData[] {
    const avisos: WarningData[] = [];
    for (const [familia, { light, dark }] of Object.entries(escalas)) {
        if (esSemillaBlanca(semillas[familia])) avisos.push({ code: 'seed-white', params: { theme: tema, color: familia, seed: semillas[familia] } });
        for (const [modo, escala] of [['light', light], ['dark', dark]] as const) {
            if (!escala.adjusted || Math.abs(escala.dL) < UMBRAL_AVISO_DL) continue;
            avisos.push({ code: 'seed-shifted', params: { theme: tema, color: familia, seed: semillas[familia], mode: modo, step: SHADES[escala.seedStep], deltaL: escala.dL } });
        }
    }
    return avisos;
}

export const UMBRAL_MARCA_ESTADO = 0.05;

const aOklab = (semilla: string): [number, number, number] => {
    const { l, c, h } = parseSeed(semilla);
    const rad = (h * Math.PI) / 180;
    return [l, c * Math.cos(rad), c * Math.sin(rad)];
};

export function distanciaOklab(a: string, b: string): number {
    const [l1, a1, b1] = aOklab(a), [l2, a2, b2] = aOklab(b);
    return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function avisosMarcaVsEstado(entry: ThemeEntry, defaultStates: Record<string, string>): WarningData[] {
    const marca = semillaPrimaria(entry.def) ?? entry.def.colors.brand;
    const estados = { ...defaultStates, ...(entry.def.locked ? {} : entry.def.states ?? {}) };
    const avisos: WarningData[] = [];
    for (const [estado, hex] of Object.entries(estados)) {
        const d = distanciaOklab(marca, hex);
        if (d >= UMBRAL_MARCA_ESTADO) continue;
        avisos.push({ code: 'brand-like-status', params: { theme: entry.name, brand: marca, status: estado, seed: hex, distance: d, threshold: UMBRAL_MARCA_ESTADO } });
    }
    return avisos;
}

/**
 * Resuelve un tema a datos puros (sin CSS). Reutiliza el motor de theming
 * (createPaletteFromHex, effectiveNeutrals, getContrastColor). No emite strings.
 */
export function resolveThemeTokens(
    entry: ThemeEntry,
    userFonts: Record<string, string>,
    defaultStates: Record<string, string>,
    scales: Scales = defaultScales,
    extensiones: TaishoExtensions = {},
): ResolvedThemeTokens {
    const ov: Partial<ThemeDef> = entry.def.locked ? {} : entry.def;

    const STATUS = Object.keys(defaultStates);
    const effectiveStates = { ...defaultStates, ...(ov.states ?? {}) };

    const eff = effectiveNeutrals(ov.neutral);
    const effP3 = effectiveNeutrals(ov.neutral, 'p3');
    const seeds = { ...entry.def.colors, ...effectiveStates };
    const srgb = paletasDeSemillas(seeds, eff, 'srgb');
    const p3 = paletasDeSemillas(seeds, effP3, 'p3');
    const semillaDelPrimario = semillaPrimaria(entry.def);
    const prim = paletasDePrimario(semillaDelPrimario, eff, 'srgb');
    const primP3 = paletasDePrimario(semillaDelPrimario, effP3, 'p3');
    const lightColors: Record<string, Record<string, string>> = { ...eff.light, ...srgb.light, ...prim.light };
    const darkColors: Record<string, Record<string, string>> = { ...eff.dark, ...srgb.dark, ...prim.dark };
    const dif = diferenciasP3(
        { light: lightColors, dark: darkColors },
        { light: { ...effP3.light, ...p3.light, ...primP3.light }, dark: { ...effP3.dark, ...p3.dark, ...primP3.dark } },
    );

    const colors: Record<string, Record<string, ResolvedColor>> = {};
    for (const [pName, p] of Object.entries(lightColors)) {
        colors[pName] = {};
        for (const [shade, color] of Object.entries(p)) {
            const darkColor = darkColors[pName]?.[shade];
            const c: ResolvedColor = darkColor !== undefined ? { light: color, dark: darkColor } : { light: color };
            const d = dif[pName]?.[shade];
            if (d) c.p3 = d;
            colors[pName][shade] = c;
        }
    }

    const states: Record<string, ResolvedState> = {};
    for (const [name, hex] of Object.entries(effectiveStates)) {
        if (STATUS.includes(name)) {
            states[name] = { kind: 'status' };
        } else {
            const { l, c, h } = parseSeed(hex);
            states[name] = {
                kind: 'custom', l, c, h,
                contrastLight: getContrastColor(l, c, h, false),
                contrastDark: getContrastColor(l, c, h, true),
            };
        }
    }

    return {
        sizing: scales.sizing,
        fontSizes: { ...scales.fontSizes, ...(ov.fontSizes ?? {}) },
        lineHeights: { ...scales.lineHeights, ...(ov.lineHeights ?? {}) },
        letterSpacing: { ...scales.letterSpacing, ...(ov.letterSpacing ?? {}) },
        fontWeights: { ...scales.fontWeights, ...(ov.fontWeights ?? {}) },
        rtl: tipografiaRtlDeTema(ov, { ...scales.letterSpacing, ...(ov.letterSpacing ?? {}) }, scales.sizing),
        fonts: { ...userFonts, ...(ov.fonts ?? {}) },
        colors,
        semantic: {
            heading: 'var(--color-gray-1000)',
            copy:    'var(--color-gray-1000)',
            subtle:  'var(--color-gray-700)',
            label:   'var(--color-gray-1000)',
            btn:     'var(--color-gray-1000)',
            highlight: luzOscuro('var(--color-gray-100)', 'var(--color-gray-200)'),
            'highlight-strong': luzOscuro('var(--color-gray-200)', 'var(--color-gray-300)'),
            'toggle-thumb': luzOscuro('var(--color-background-100)', 'var(--color-gray-1000)'),
            'toggle-icon': luzOscuro('var(--color-gray-1000)', 'var(--color-gray-100)'),
            ...(ov.semantic ?? {}),
        },
        states,
        gaps:    { ...scales.gaps, ...(ov.spacing?.gaps ?? {}) },
        spaces:  { ...scales.spaces, ...(ov.spacing?.spaces ?? {}) },
        radius:  { ...scales.radius, ...(ov.radius ?? {}) },
        cornerShape: ov.cornerShape ?? 'round',
        borderWidths: { ...scales.borderWidths, ...(ov.borderWidths ?? {}) },
        blurs: { ...scales.blurs, ...(ov.blurs ?? {}) },
        zIndex: { ...zIndex, ...(ov.zIndex ?? {}) },
        opacities: { ...scales.opacities, ...(ov.opacities ?? {}) },
        screens: { ...scales.screens, ...(ov.screens ?? {}) },
        components: Object.fromEntries(tokensDeExtensiones(extensiones).map(({ slug, prefijo, tokens }) => [
            slug,
            { prefix: prefijo, tokens: Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, ov.components?.[slug]?.[k] ?? v])) },
        ])),
        contrastThreshold: ov.contrastThreshold ?? contrastThreshold,
        focusRing: entry.def.focusRing,
        shadows: { ...scales.shadows, ...(ov.shadows ?? {}) },
        motion: {
            durations: { ...scales.durations, ...(ov.motion?.durations ?? {}) },
            loops: { ...loopDurations, ...(ov.motion?.loops ?? {}) },
            iterations: { ...iterations, ...(ov.motion?.iterations ?? {}) },
            easings: { ...scales.easings, ...(ov.motion?.easings ?? {}) },
        },
        densityComfortable: Object.fromEntries(
            Object.entries(densityTokens).map(([family, { comfortable }]) => [family, { ...comfortable, ...tallesDeTema(ov.density?.comfortable, family) }]),
        ),
        densityCompact: Object.fromEntries(
            Object.entries(densityTokens).map(([family, { compact }]) => [family, { ...compact, ...tallesDeTema(ov.density?.compact, family) }]),
        ),
        densitySpacingCompact: { ...densitySpacingCompact, ...(ov.density?.compact?.spacing?.gaps ?? {}) },
        densitySpacesCompact: { ...densitySpacingCompact, ...(ov.density?.compact?.spacing?.spaces ?? {}) },
        densityOverrides: densidadDeTema(ov.density),
        material: { light: ov.material?.light, dark: ov.material?.dark },
        spotlight: spotlightDeTema(ov.spotlight),
        warnings: [
            ...avisosDeSemillas(entry.name, { ...srgb.escalas, ...prim.escalas }, semillaDelPrimario === undefined ? seeds : { ...seeds, primary: semillaDelPrimario }),
            ...anchosDeFocoEnCero(ov.borderWidths).map(([name, value]): WarningData => ({ code: 'border-width-zero', params: { theme: entry.name, name, value } })),
        ],
    };
}

function varsDeMaterial(m?: MaterialVars): string {
    let s = '';
    if (m?.bg) s += `  --ts-material-bg: ${m.bg};\n`;
    if (m?.border) s += `  --ts-material-border: ${m.border};\n`;
    if (m?.shadowRgb) s += `  --ts-material-shadow-rgb: ${m.shadowRgb};\n`;
    return s;
}

/**
 * Serializa el modelo resuelto a un tokens/{tema}.css self-contained. La clase de contexto de densidad sale como
 * `:where(.ts).compact`.
 */
export function buildTokensCSS(model: ResolvedThemeTokens, darkMode: DarkMode = 'class'): string {
    const t = model;

    const ld = luzOscuro;
    const matVars = varsDeMaterial;

    let css = '/* Archivo auto-generado: TOKENS */\n\n:root {\n';
    for (const [k, v] of Object.entries(t.sizing)) css += `  --ts-sizing-${k}: ${v}px;\n`;
    for (const [k, v] of Object.entries(t.fontSizes)) css += `  --ts-fontsize-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.lineHeights)) css += `  --ts-lh-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.letterSpacing)) css += `  --ts-ls-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.fontWeights)) css += `  --ts-fw-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.fonts)) css += `  --font-${k}: ${conRespaldo(v)};\n`;
    for (const [pName, p] of Object.entries(t.colors)) {
        for (const [shade, { light, dark }] of Object.entries(p)) {
            css += `  --color-${pName}-${shade}: ${dark !== undefined ? ld(light, dark) : light};\n`;
        }
    }
    for (const [k, v] of Object.entries(t.semantic)) css += `  --ts-color-${k}: ${v};\n`;
    for (const [name, state] of Object.entries(t.states)) {
        if (state.kind === 'status') {
            css += `  --ts-color-${name}: var(--color-${name}-500);\n`;
            css += `  --ts-color-${name}-bg: var(--color-${name}-100);\n`;
            css += `  --ts-color-${name}-border: var(--color-${name}-200);\n`;
            css += `  --ts-color-${name}-contrast: var(--color-${name}-500-contrast);\n`;
            css += `  --ts-color-${name}-text: var(--color-${name}-700);\n`;
        } else {
            const { l, c, h } = state;
            css += `  --ts-color-${name}: oklch(${l} ${c} ${h});\n`;
            css += `  --ts-color-${name}-bg: var(--color-${name}-100);\n`;
            css += `  --ts-color-${name}-border: var(--color-${name}-200);\n`;
            css += `  --ts-color-${name}-contrast: ${ld(state.contrastLight, state.contrastDark)};\n`;
        }
    }
    for (const [k, v] of Object.entries(t.gaps)) css += `  --ts-gap-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.spaces)) css += `  --ts-space-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.radius)) css += `  --ts-radius-${k}: ${v};\n`;
    css += `  --ts-corner-shape: round;\n`;
    for (const [k, v] of Object.entries(t.borderWidths)) css += `  --ts-border-width-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.blurs)) css += `  --ts-blur-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.zIndex)) css += `  --ts-z-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.opacities)) css += `  --ts-opacity-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.screens)) css += `  --ts-screen-${k}: ${v};\n`;
    for (const { prefix, tokens } of Object.values(t.components)) {
        for (const [k, v] of Object.entries(tokens)) css += `  --ts-${prefix}-${k}: ${v};\n`;
    }
    css += `  --ts-contrast-threshold: ${t.contrastThreshold};\n`;
    css += `  --ts-focus-ring-color: ${t.focusRing ?? 'var(--color-brand-solid)'};\n`;
    for (const [k, v] of Object.entries(t.shadows)) css += `  --ts-shadow-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.motion.durations)) css += `  --ts-duration-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.motion.loops)) css += `  --ts-duration-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.motion.iterations)) css += `  --ts-iterations-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.motion.easings)) css += `  --ts-ease-${k}: ${v};\n`;
    for (const [family, sizes] of Object.entries(t.densityComfortable)) {
        for (const [size, px] of Object.entries(sizes)) css += `  --ts-${family}-${size}: ${px}px;\n`;
    }
    for (const modo of ['comfortable', 'compact'] as const) {
        for (const [family, sizes] of Object.entries(t.densityOverrides?.[modo] ?? {})) {
            for (const [size, px] of Object.entries(sizes)) css += `  --ts-density-${modo}-${family}-${size}: ${px}px;\n`;
        }
    }
    css += matVars(t.material.light);
    css += `  --ts-spotlight-color: ${ld(t.spotlight.light, t.spotlight.dark)};\n`;
    const cuerpoRaiz = css.slice(css.indexOf(':root {\n') + ':root {\n'.length);
    const darkMat = matVars(t.material.dark);
    if (darkMat) css += `}\n\n.dark {\n${darkMat}`;
    if (darkMat && darkMode === 'media') css += `}\n\n@media ${MEDIA_OSCURO} {\n  ${RAIZ_POR_SISTEMA} {\n${darkMat}  }\n`;
    css += '}\n\n:where(.ts).compact {\n';
    for (const [family, sizes] of Object.entries(t.densityCompact)) {
        for (const [size, px] of Object.entries(sizes)) css += `  --ts-${family}-${size}: ${px}px;\n`;
    }
    for (const [k, v] of Object.entries(t.densitySpacingCompact)) {
        css += `  --ts-gap-${k}: ${v};\n`;
        css += `  --ts-space-${k}: ${t.densitySpacesCompact[k]};\n`;
    }
    css += '}\n';
    if (t.cornerShape === 'squircle') {
        css += '\n@supports (corner-shape: squircle) {\n  :root {\n    --ts-corner-shape: squircle;\n';
        for (const [k, v] of Object.entries(radiosSquircle(t.radius))) css += `    --ts-radius-${k}: ${v};\n`;
        css += '  }\n}\n';
    }
    if (t.rtl) css += `\n${reglaRtl(t.rtl)}\n`;
    css += '\n@media (prefers-reduced-motion: reduce) {\n  :root {\n';
    for (const k of Object.keys(t.motion.durations)) css += `    --ts-duration-${k}: ${reducedMotionDuration};\n`;
    for (const k of Object.keys(t.motion.iterations)) css += `    --ts-iterations-${k}: ${reducedMotionIterations};\n`;
    css += '  }\n}\n';
    let p3 = '';
    for (const [pName, p] of Object.entries(t.colors)) {
        for (const [shade, { p3: v }] of Object.entries(p)) if (v) p3 += `    --color-${pName}-${shade}: ${ld(v.light, v.dark)};\n`;
    }
    if (p3) css += `\n@media (color-gamut: p3) {\n  :root {\n${p3}  }\n}\n`;
    css += bloqueSinLightDark(cuerpoRaiz, darkMode, haloSinLightDark(darkMode));
    return css;
}

export function materialDeSecciones(model: ResolvedThemeTokens): string {
    const bloque = (selector: string, m?: MaterialVars) => {
        const vars = varsDeMaterial(m);
        return vars ? `\n${selector} {\n${vars}}\n` : '';
    };
    return bloque('.scheme-dark', model.material.dark) + bloque('.scheme-light', model.material.light);
}

export const usaSecciones = (css: string) => css.includes('scheme-dark') || css.includes('scheme-light');
