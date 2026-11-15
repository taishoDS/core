// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Theming en runtime.
 *
 * Genera un tema desde semillas hex en el browser, sin build. Reusa la matemática portable de
 * ./palette.ts y se monta ENCIMA de un tokens/{base}.css ya cargado: solo emite lo que el tema define
 * (colores de marca/estado + overrides), los neutros/sizing salen del base.
 *
 * Usa Constructable Stylesheets (`adoptedStyleSheets`) con una regla `:root{}` en
 * `light-dark()` — NO inline styles (pisarían el modo oscuro) ni un <style> en el DOM.
 */
import { avisarSemillasBlancas, esDesarrollo } from './aviso-blanca';
import { diferenciasP3, paletasDePrimario, paletasDeSemillas, semillaPrimaria } from './palette';
import { effectiveNeutrals } from './neutrals';
import { MEDIA_OSCURO, RAIZ_POR_SISTEMA, type DarkMode } from './modo-oscuro';
import { luzOscuro, opcionesDeTema } from './opciones';
import { bloqueSinLightDark } from './sin-light-dark';
import { densitySpacingCompact } from './density-scale';
import { radius as radiusDeFabrica, radiosSquircle } from './radius-scale';
import { reducedMotionDuration, reducedMotionIterations } from './motion-scale';
import { interlineadoRtl, letterSpacing as letterSpacingDeFabrica, reglaRtl, trackingRtl } from './typography-scale';
import { anchosDeFocoEnCero, textoBordeEnCero } from './aviso-borde';
import type { ThemeDef } from './theme-def';

export type { DarkMode };

type Paletas = Record<string, Record<string, string>>;

let sheet: CSSStyleSheet | null = null;

/** Opciones de `createTheme`. */
export interface CreateThemeOptions {
    /** Cómo se activa el modo oscuro; se usa el mismo valor que `darkMode` en la config. Hace falta para los materiales propios y en navegadores sin `light-dark()`. Predeterminado: `'class'`. */
    darkMode?: DarkMode;
}

function tallesDeDensidad(def: ThemeDef, modo: 'comfortable' | 'compact'): string {
    return Object.entries(def.density?.[modo] ?? {}).flatMap(([familia, talles]) =>
        familia === 'spacing' ? [] : Object.entries(talles as Record<string, number>).map(([talle, px]) => `--ts-${familia}-${talle}:${px}px;`),
    ).join('');
}

const anchosAvisados = new Set<string>();

function avisarAnchosEnCero(borderWidths: Record<string, string> | undefined): void {
    if (!esDesarrollo()) return;
    for (const [nombre, valor] of anchosDeFocoEnCero(borderWidths)) {
        const clave = `${nombre}:${valor}`;
        if (anchosAvisados.has(clave)) continue;
        anchosAvisados.add(clave);
        console.warn(`[TaishoDS] ${textoBordeEnCero('runtime', nombre, valor)}`);
    }
}

function escalasDeTema(def: ThemeDef): [string, Record<string, string> | undefined][] {
    return [
        ['--ts-fontsize-', def.fontSizes], ['--ts-lh-', def.lineHeights], ['--ts-ls-', def.letterSpacing], ['--ts-fw-', def.fontWeights],
        ['--ts-border-width-', def.borderWidths], ['--ts-blur-', def.blurs], ['--ts-z-', def.zIndex], ['--ts-opacity-', def.opacities],
        ['--ts-screen-', def.screens], ['--ts-duration-', def.motion?.durations], ['--ts-duration-', def.motion?.loops], ['--ts-iterations-', def.motion?.iterations], ['--ts-ease-', def.motion?.easings],
    ];
}

/** Construye el CSS del tema (parte pura, testeable sin DOM). */
export function buildThemeCss(def: ThemeDef, { darkMode = 'class' }: CreateThemeOptions = {}): string {
    const ov: ThemeDef = def.locked ? { colors: def.colors, primary: def.primary, focusRing: def.focusRing } : def;
    const eff = effectiveNeutrals(ov.neutral);
    const seeds = { ...def.colors, ...(ov.states ?? {}) };
    const semillaDelPrimario = semillaPrimaria(def);
    const srgb = paletasDeSemillas(seeds, eff, 'srgb');
    const prim = paletasDePrimario(semillaDelPrimario, eff, 'srgb');
    const lightColors = { ...srgb.light, ...prim.light };
    const darkColors = { ...srgb.dark, ...prim.dark };

    const claroYOscuro = (claro: Paletas, oscuro: Paletas) => {
        let vars = '';
        for (const [pName, p] of Object.entries(claro)) {
            for (const [shade, color] of Object.entries(p)) vars += `--color-${pName}-${shade}:${luzOscuro(color, oscuro[pName]?.[shade] ?? color)};`;
        }
        return vars;
    };
    let root = '';
    if (ov.neutral) root += claroYOscuro(eff.light, eff.dark);
    root += claroYOscuro(lightColors, darkColors);
    if (ov.semantic) for (const [k, v] of Object.entries(ov.semantic)) root += `--ts-color-${k}:${v};`;
    if (ov.radius) for (const [k, v] of Object.entries(ov.radius)) root += `--ts-radius-${k}:${v};`;
    if (ov.cornerShape === 'round') root += '--ts-corner-shape:round;';
    if (ov.spacing?.gaps) for (const [k, v] of Object.entries(ov.spacing.gaps)) root += `--ts-gap-${k}:${v};`;
    if (ov.spacing?.spaces) for (const [k, v] of Object.entries(ov.spacing.spaces)) root += `--ts-space-${k}:${v};`;
    if (ov.shadows) for (const [k, v] of Object.entries(ov.shadows)) root += `--ts-shadow-${k}:${v};`;
    for (const [prefijo, escala] of escalasDeTema(ov)) for (const [k, v] of Object.entries(escala ?? {})) root += `${prefijo}${k}:${v};`;
    root += tallesDeDensidad(ov, 'comfortable');
    for (const [k, v] of opcionesDeTema(ov)) root += `${k}:${v};`;
    if (ov.fonts) for (const [k, v] of Object.entries(ov.fonts)) root += `--font-${k}:${v};`;
    const matVars = (m?: { bg?: string; border?: string; shadowRgb?: string }) =>
        (m?.bg ? `--ts-material-bg:${m.bg};` : '') +
        (m?.border ? `--ts-material-border:${m.border};` : '') +
        (m?.shadowRgb ? `--ts-material-shadow-rgb:${m.shadowRgb};` : '');
    const materialClaro = matVars(ov.material?.light);
    const materialOscuro = matVars(ov.material?.dark);
    root += materialClaro;

    let materiales = '';
    if (materialOscuro) {
        materiales += `.dark,.scheme-dark{${materialOscuro}}`;
        if (darkMode === 'media') materiales += `@media ${MEDIA_OSCURO}{${RAIZ_POR_SISTEMA}{${materialOscuro}}}`;
    }
    if (materialClaro) materiales += `.scheme-light{${materialClaro}}`;

    const effP3 = effectiveNeutrals(ov.neutral, 'p3');
    const p3Semillas = paletasDeSemillas(seeds, effP3, 'p3');
    const primP3 = paletasDePrimario(semillaDelPrimario, effP3, 'p3');
    const p3 = { light: { ...p3Semillas.light, ...primP3.light }, dark: { ...p3Semillas.dark, ...primP3.dark } };
    const dif = diferenciasP3(
        ov.neutral ? { light: { ...eff.light, ...lightColors }, dark: { ...eff.dark, ...darkColors } } : { light: lightColors, dark: darkColors },
        ov.neutral ? { light: { ...effP3.light, ...p3.light }, dark: { ...effP3.dark, ...p3.dark } } : p3,
    );
    let rootP3 = '';
    for (const [pName, p] of Object.entries(dif)) {
        for (const [shade, v] of Object.entries(p)) rootP3 += `--color-${pName}-${shade}:${luzOscuro(v.light, v.dark)};`;
    }
    const bloqueP3 = rootP3 ? `@media (color-gamut:p3){:root{${rootP3}}}` : '';

    const compactoDe = (familia: 'gap' | 'space', clave: 'gaps' | 'spaces') => {
        const delTema = ov.density?.compact?.spacing?.[clave] ?? {};
        const nombres = new Set([...Object.keys(ov.spacing?.[clave] ?? {}).filter((k) => Object.hasOwn(densitySpacingCompact, k)), ...Object.keys(delTema)]);
        return [...nombres].map((k) => `--ts-${familia}-${k}:${delTema[k] ?? densitySpacingCompact[k]};`).join('');
    };
    const compacto = tallesDeDensidad(ov, 'compact') + compactoDe('gap', 'gaps') + compactoDe('space', 'spaces');
    const bloqueCompacto = compacto ? `:where(.ts).compact{${compacto}}` : '';
    const reducido = Object.keys(ov.motion?.durations ?? {}).map((k) => `--ts-duration-${k}:${reducedMotionDuration};`).join('')
        + Object.keys(ov.motion?.iterations ?? {}).map((k) => `--ts-iterations-${k}:${reducedMotionIterations};`).join('');
    const bloqueReducido = reducido ? `@media (prefers-reduced-motion:reduce){:root{${reducido}}}` : '';

    const rtl = reglaRtl([
        ...(ov.letterSpacing?.normal === undefined ? [] : trackingRtl({ ...letterSpacingDeFabrica, ...ov.letterSpacing })),
        ...interlineadoRtl(ov.lineHeights ?? {}),
    ]);

    let squircle = '';
    if (ov.cornerShape === 'squircle') {
        const subidos = radiosSquircle({ ...radiusDeFabrica, ...ov.radius });
        squircle = `@supports (corner-shape:squircle){:root{--ts-corner-shape:squircle;${Object.entries(subidos).map(([k, v]) => `--ts-radius-${k}:${v};`).join('')}}}`;
    }

    return `:root{${root}}${squircle}${rtl}${bloqueCompacto}${materiales}${bloqueP3}${bloqueSinLightDark(root, darkMode)}${bloqueReducido}`;
}

/**
 * Aplica un tema en runtime vía un único CSSStyleSheet adoptado por el documento.
 * Llamadas sucesivas reemplazan el tema anterior (no acumulan).
 * Si la config usa `darkMode: 'media'`, se pasa el mismo valor en `opciones`.
 * No-op en SSR (sin document).
 */
export function createTheme(def: ThemeDef, opciones: CreateThemeOptions = {}): void {
    if (typeof def.colors?.brand !== 'string' || def.colors.brand.trim() === '') {
        throw new Error("[TaishoDS] createTheme: colors.brand es obligatorio. Se pasa un hex, p. ej. createTheme({ colors: { brand: '#4F46E5' } }).");
    }
    if (typeof document === 'undefined') return;
    if (!sheet) {
        sheet = new CSSStyleSheet();
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    sheet.replaceSync(buildThemeCss(def, opciones));
    avisarAnchosEnCero(def.locked ? undefined : def.borderWidths);
    avisarSemillasBlancas({ ...def.colors, ...(def.states ?? {}), ...(def.primary === undefined ? {} : { primary: def.primary }) });
}

/** Quita el tema runtime (vuelve al tokens/{base}.css cargado por <link>). */
export function clearTheme(): void {
    if (typeof document === 'undefined' || !sheet) return;
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
    sheet = null;
}
