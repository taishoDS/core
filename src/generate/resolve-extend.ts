// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { semillaPrimaria } from '../lib/theme/palette';
import { blurs, borderWidths, buildVocabularyColors, defaultScales, densitySpacingCompact, densityTokens, durations, easings, loopDurations, iterations, opacities, shadows, zIndex, type Scales } from '../config/scales';
import type { ThemeDef } from '../config/taisho.types';
import { buildAtomicCSS } from './emit-atomic';
import { buildComponentsCSS } from './emit-components';
import { buildUtilitiesCSS } from './emit-utilities';
import { parseUtilities } from './emit-flat';
import { aliasDe, renombrar } from './naming-renames';
import { CLASES_DE_TEMA, esModificador } from './naming-table';
import { componerUso, datosComposicion, expandirPropia, partirEntrada } from './propias';
import { tablaPrefijos, validarCadena } from './variantes';
import type { ComponentManifest } from './emit-manifest';
import type { CssDeExtensiones } from './registro';
import type { TaishoConfig } from './vocabulary';
import { ConfigError, type ConfigErrorData, type ConfigKeyError } from './errores-config';

export function clasificarComponentes(manifiesto: ComponentManifest, atomic: string, utilities: string, alias: ReadonlyMap<string, string>) {
    const atomicas = new Set(
        [atomic, utilities].flatMap((css) => parseUtilities(css).flatMap((b) => {
            const n = b.name.replaceAll('\\', '');
            return [n.slice(3), (alias.get(n) ?? n).slice(3)];
        })),
    );
    const componentes = new Set<string>();
    for (const c of Object.values(manifiesto.componentes)) {
        for (const b of c.bloques) for (const n of [b, (alias.get(`ts-${b}`) ?? `ts-${b}`).slice(3)]) componentes.add(n);
    }
    const esComponente = (base: string) => !atomicas.has(base) && (componentes.has(base) || esModificador(base));
    return { atomicas, componentes, esComponente };
}

export const NOMBRE_ESCALA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NOMBRE_UTILIDAD = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PREFIJO_RESERVADO = 'ts-';
const VALOR_PX = /^\d+(\.\d+)?px$/;
const RANGO_NIVEL = { regex: /^[1-9]\d{0,2}$/, rango: '1 a 999' };
const RANGO_OPACIDAD = { regex: /^(?:0|[1-9]\d?|100)$/, rango: '0 a 100' };
type RangoNumerico = typeof RANGO_NIVEL;
const NOMBRE_SCREEN_EXTENDIDO = /^(?:[2-9]?xs|[2-9]xl)$/;

export interface ExtendResuelto {
    userScales: Scales;
    userUtilities: Record<string, string[]>;
}

export const fallo = (ruta: string, datos: ConfigErrorData): ConfigError => new ConfigError([{ path: ruta, ...datos }]);

export function intentarClave(errores: ConfigKeyError[], fn: () => void, alFallar?: () => void): void {
    try {
        fn();
    } catch (e) {
        if (!(e instanceof ConfigError)) throw e;
        errores.push(...e.errors);
        alFallar?.();
    }
}

export function lanzarSiHay(errores: ConfigKeyError[]): void {
    if (errores.length) throw new ConfigError(errores);
}

export function validarValor(ruta: string, valor: unknown): void {
    if (typeof valor !== 'string') throw fallo(ruta, { code: 'value-not-string', params: { value: valor } });
    if (valor.trim() === '') throw fallo(ruta, { code: 'empty-value', params: {} });
    if (/[;{}\\\r\n]|\/\*|\*\//.test(valor)) {
        throw fallo(ruta, { code: 'unsafe-value', params: { value: valor } });
    }
}

const contar = (nombres: string[]) => {
    const m = new Map<string, number>();
    for (const n of nombres) m.set(n, (m.get(n) ?? 0) + 1);
    return m;
};

function distancia(a: string, b: string): number {
    let fila = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const nueva = [i];
        for (let j = 1; j <= b.length; j++) {
            nueva[j] = Math.min(fila[j] + 1, nueva[j - 1] + 1, fila[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        fila = nueva;
    }
    return fila[b.length];
}

export function vecino(clase: string, candidatos: Iterable<string>): string | undefined {
    let mejor = 3;
    let unico: string | undefined;
    for (const c of candidatos) {
        if (Math.abs(c.length - clase.length) > 2) continue;
        const d = distancia(clase, c);
        if (d < mejor) { mejor = d; unico = c; }
        else if (d === mejor) unico = undefined;
    }
    return unico;
}


const CLAVES_DE_TEMA = [
    'colors', 'primary', 'states', 'fonts', 'radius', 'borderWidths', 'blurs', 'zIndex', 'opacities', 'screens', 'components',
    'cornerShape', 'focusRing', 'contrastThreshold', 'spotlight', 'spacing', 'shadows', 'motion', 'semantic', 'neutral', 'material', 'locked',
    'fontSizes', 'lineHeights', 'letterSpacing', 'fontWeights', 'density', 'seedFit',
];
const EXTEND_POR_CLAVE: Record<string, string> = { sizing: 'extend.sizing' };

type Extend = NonNullable<TaishoConfig['extend']>;
const EXTEND_ESCALAS = ['screens', 'radius', 'fontSizes', 'lineHeights', 'letterSpacing', 'fontWeights', 'borderWidths', 'blurs', 'opacities', 'shadows'];
const EXTEND_GRUPOS: Record<string, readonly string[]> = { spacing: ['gaps', 'spaces'], motion: ['durations', 'easings'] };
const EXTEND_EXCLUIDAS = ['zIndex', 'motion.loops', 'motion.iterations'];
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function sanearExtend(crudo: unknown, intentar: (fn: () => void) => void): Extend {
    const limpio: Record<string, unknown> = {};
    if (crudo === undefined) return limpio;
    if (!esObjeto(crudo)) {
        intentar(() => { throw fallo('extend', { code: 'extend-shape-invalid', params: { expected: 'object', value: crudo } }); });
        return limpio;
    }
    const forma = (ruta: string, valor: unknown, esperado: 'object' | 'list') => {
        const ok = esperado === 'list' ? Array.isArray(valor) : esObjeto(valor);
        if (!ok) intentar(() => { throw fallo(ruta, { code: 'extend-shape-invalid', params: { expected: esperado, value: valor } }); });
        return ok;
    };
    const conocidas = ['sizing', ...EXTEND_ESCALAS, ...Object.keys(EXTEND_GRUPOS)];
    for (const [clave, valor] of Object.entries(crudo)) {
        if (clave === 'sizing') { if (forma('extend.sizing', valor, 'list')) limpio.sizing = valor; continue; }
        if (EXTEND_ESCALAS.includes(clave)) { if (forma(`extend.${clave}`, valor, 'object')) limpio[clave] = valor; continue; }
        const validas = EXTEND_GRUPOS[clave];
        if (validas) {
            if (!forma(`extend.${clave}`, valor, 'object')) continue;
            const grupo: Record<string, unknown> = {};
            for (const [sub, v] of Object.entries(valor as Record<string, unknown>)) {
                const ruta = `extend.${clave}.${sub}`;
                if (validas.includes(sub)) { if (forma(ruta, v, 'object')) grupo[sub] = v; continue; }
                intentar(() => {
                    if (EXTEND_EXCLUIDAS.includes(`${clave}.${sub}`)) throw fallo(ruta, { code: 'extend-key-excluded', params: { key: `${clave}.${sub}` } });
                    const suggestion = vecino(sub, validas);
                    throw fallo(ruta, { code: 'extend-key-unknown', params: { key: sub, ...(suggestion && { suggestion }) } });
                });
            }
            limpio[clave] = grupo;
            continue;
        }
        intentar(() => {
            if (EXTEND_EXCLUIDAS.includes(clave)) throw fallo(`extend.${clave}`, { code: 'extend-key-excluded', params: { key: clave } });
            const suggestion = vecino(clave, conocidas);
            throw fallo(`extend.${clave}`, { code: 'extend-key-unknown', params: { key: clave, ...(suggestion && { suggestion }) } });
        });
    }
    return limpio as Extend;
}

const TIPOS_DE_VALOR = {
    integer: (v: string) => /^-?\d+$/.test(v),
    'font-weight': (v: string) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1000,
    opacity: (v: string) => /^var\(.+\)$/.test(v) || (/^(\d+\.?\d*|\.\d+)$/.test(v) && Number(v) >= 0 && Number(v) <= 1),
    duration: (v: string) => /^(\d+\.?\d*|\.\d+)(ms|s)$/.test(v),
    'iterations': (v: string) => v === 'infinite' || /^(\d+\.?\d*|\.\d+)$/.test(v),
} as const;

interface EscalaDeTema {
    ruta: string;
    de: (d: ThemeDef) => Record<string, string> | undefined;
    nombres: string[];
    extendRuta?: string;
    tipo?: keyof typeof TIPOS_DE_VALOR;
}

function validarTema(tema: string, def: ThemeDef, escalas: EscalaDeTema[], estadosDeFabrica: string[], intentar: (fn: () => void) => void): void {
    const raiz = `themes.${tema}`;
    for (const clave of Object.keys(def)) {
        intentar(() => {
            if (CLAVES_DE_TEMA.includes(clave)) return;
            const extendPath = EXTEND_POR_CLAVE[clave];
            const suggestion = extendPath ? undefined : vecino(clave, CLAVES_DE_TEMA);
            throw fallo(`${raiz}.${clave}`, { code: 'theme-key-unknown', params: { key: clave, ...(extendPath && { extendPath }), ...(suggestion && { suggestion }) } });
        });
    }
    if (def.cornerShape !== undefined && def.cornerShape !== 'round' && def.cornerShape !== 'squircle') {
        intentar(() => { throw fallo(`${raiz}.cornerShape`, { code: 'corner-shape-invalid', params: { value: def.cornerShape } }); });
    }
    const familias = [...Object.keys(def.colors ?? {}), ...estadosDeFabrica, ...Object.keys(def.states ?? {}), ...(def.primary === undefined ? [] : ['primary'])];
    if (esObjeto(def.seedFit)) {
        for (const [clave, valor] of Object.entries(def.seedFit)) {
            intentar(() => {
                if (!familias.includes(clave)) { const suggestion = vecino(clave, familias); throw fallo(`${raiz}.seedFit.${clave}`, { code: 'seed-fit-key-unknown', params: { key: clave, families: [...new Set(familias)], ...(suggestion && { suggestion }) } }); }
                if (valor !== 'shift' && valor !== 'keep') throw fallo(`${raiz}.seedFit.${clave}`, { code: 'seed-fit-value-invalid', params: { value: valor } });
            });
        }
    } else if (def.seedFit !== undefined) {
        intentar(() => { throw fallo(`${raiz}.seedFit`, { code: 'seed-fit-value-invalid', params: { value: def.seedFit } }); });
    }
    for (const [clave, validas] of [['spacing', ['gaps', 'spaces']], ['motion', ['durations', 'loops', 'iterations', 'easings']], ['density', ['comfortable', 'compact']]] as const) {
        for (const sub of Object.keys(def[clave] ?? {})) {
            intentar(() => {
                if ((validas as readonly string[]).includes(sub)) return;
                const suggestion = vecino(sub, validas);
                throw fallo(`${raiz}.${clave}.${sub}`, { code: 'theme-key-unknown', params: { key: sub, ...(suggestion && { suggestion }) } });
            });
        }
    }
    for (const { ruta, de, nombres, extendRuta, tipo } of escalas) {
        for (const [nombre, valor] of Object.entries(de(def) ?? {})) {
            intentar(() => {
                const rutaValor = `${raiz}.${ruta}.${nombre}`;
                if (!nombres.includes(nombre)) {
                    throw fallo(rutaValor, { code: 'theme-name-unknown', params: { scale: ruta, name: nombre, ...(extendRuta && { extendPath: extendRuta }) } });
                }
                validarValor(rutaValor, valor);
                if (tipo && !TIPOS_DE_VALOR[tipo](valor.trim())) throw fallo(rutaValor, { code: 'value-type-invalid', params: { kind: tipo, value: valor } });
            });
        }
    }
    for (const modo of ['comfortable', 'compact'] as const) {
        const deModo: Record<string, unknown> = def.density?.[modo] ?? {};
        for (const [familia, talles] of Object.entries(deModo)) {
            const rutaFamilia = `${raiz}.density.${modo}.${familia}`;
            if (modo === 'compact' && familia === 'spacing') {
                for (const [clave, escala] of Object.entries((talles ?? {}) as Record<string, Record<string, string>>)) {
                    if (clave !== 'gaps' && clave !== 'spaces') {
                        const suggestion = vecino(clave, ['gaps', 'spaces']);
                        intentar(() => { throw fallo(`${rutaFamilia}.${clave}`, { code: 'theme-key-unknown', params: { key: clave, ...(suggestion && { suggestion }) } }); });
                        continue;
                    }
                    for (const [nombre, valor] of Object.entries(escala ?? {})) {
                        intentar(() => {
                            const rutaValor = `${rutaFamilia}.${clave}.${nombre}`;
                            if (!Object.hasOwn(densitySpacingCompact, nombre)) {
                                throw fallo(rutaValor, { code: 'theme-name-unknown', params: { scale: `density.compact.spacing.${clave}`, name: nombre } });
                            }
                            validarValor(rutaValor, valor);
                        });
                    }
                }
                continue;
            }
            if (!Object.hasOwn(densityTokens, familia)) {
                intentar(() => { throw fallo(rutaFamilia, { code: 'theme-name-unknown', params: { scale: `density.${modo}`, name: familia } }); });
                continue;
            }
            for (const [talle, px] of Object.entries((talles ?? {}) as Record<string, unknown>)) {
                intentar(() => {
                    const rutaValor = `${rutaFamilia}.${talle}`;
                    if (!Object.hasOwn(densityTokens[familia][modo], talle)) {
                        throw fallo(rutaValor, { code: 'theme-name-unknown', params: { scale: `density.${modo}.${familia}`, name: talle } });
                    }
                    if (typeof px !== 'number' || !Number.isFinite(px) || px < 0) throw fallo(rutaValor, { code: 'value-type-invalid', params: { kind: 'px', value: px } });
                });
            }
        }
    }
    for (const clave of Object.keys(def.neutral?.fixed ?? {})) {
        if (clave !== 'white' && clave !== 'black') {
            intentar(() => { throw fallo(`${raiz}.neutral.fixed.${clave}`, { code: 'theme-name-unknown', params: { scale: 'neutral.fixed', name: clave } }); });
        }
    }
    const sueltos: [string, unknown][] = [
        ...Object.entries(def.fonts ?? {}).map(([k, v]): [string, unknown] => [`fonts.${k}`, v]),
        ...Object.entries(def.semantic ?? {}).map(([k, v]): [string, unknown] => [`semantic.${k}`, v]),
        ['neutral.fixed.white', def.neutral?.fixed?.white], ['neutral.fixed.black', def.neutral?.fixed?.black],
        ['focusRing', def.focusRing], ['contrastThreshold', def.contrastThreshold],
        ['spotlight.light', def.spotlight?.light], ['spotlight.dark', def.spotlight?.dark],
        ...(['light', 'dark'] as const).flatMap((modo) => (['bg', 'border', 'shadowRgb'] as const).map((k): [string, unknown] => [`material.${modo}.${k}`, def.material?.[modo]?.[k]])),
    ];
    for (const [ruta, valor] of sueltos) if (valor !== undefined) intentar(() => validarValor(`${raiz}.${ruta}`, valor));
}

export function resolveExtend(
    config: TaishoConfig,
    userColors: Record<string, string>,
    userStates: Record<string, string>,
    userGridMins: Record<string, string>,
    manifiesto: ComponentManifest,
    extra: CssDeExtensiones = { components: '', utilities: '' },
): ExtendResuelto {
    const errores: ConfigKeyError[] = [];
    const intentar = (fn: () => void, alFallar?: () => void) => intentarClave(errores, fn, alFallar);
    intentar(() => {
        if (config.scope !== undefined && config.scope !== 'ts') {
            throw fallo('scope', { code: 'scope-invalid', params: { value: config.scope } });
        }
        if (config.darkMode !== undefined && config.darkMode !== 'class' && config.darkMode !== 'media') {
            throw fallo('darkMode', { code: 'dark-mode-invalid', params: { value: config.darkMode } });
        }
    });
    intentar(() => {
        if (config.out !== undefined && (typeof config.out !== 'string' || config.out.trim() === '')) {
            throw fallo('out', { code: 'out-invalid', params: { value: config.out } });
        }
    });
    intentar(() => {
        if (config.iconsHtmlDirs !== undefined) throw fallo('iconsHtmlDirs', { code: 'icons-html-dirs-removed', params: {} });
    });
    (config.fontFaces ?? []).forEach((face, i) => {
        intentar(() => {
            const ok = face.styles === undefined || (Array.isArray(face.styles) && face.styles.length > 0 && face.styles.every((e) => e === 'normal' || e === 'italic'));
            if (!ok) throw fallo(`fontFaces[${i}].styles`, { code: 'font-styles-invalid', params: { value: face.styles } });
        });
    });
    for (const [tema, def] of Object.entries(config.themes)) {
        intentar(() => {
            const brand = (def.colors as Record<string, unknown> | undefined)?.brand;
            if (typeof brand !== 'string' || brand.trim() === '') {
                throw fallo(`themes.${tema}.colors.brand`, { code: 'brand-required', params: {} });
            }
        });
        intentar(() => {
            if (Object.hasOwn(def.colors ?? {}, 'primary')) {
                throw fallo(`themes.${tema}.colors.primary`, { code: 'primary-in-colors', params: {} });
            }
        });
        for (const k of ['white', 'black']) {
            intentar(() => {
                if (Object.hasOwn(def.colors ?? {}, k)) throw fallo(`themes.${tema}.colors.${k}`, { code: 'fixed-in-colors', params: { name: k } });
            });
        }
        intentar(() => {
            const primary: unknown = semillaPrimaria(def);
            if (primary !== undefined && (typeof primary !== 'string' || primary.trim() === '')) {
                throw fallo(`themes.${tema}.primary`, { code: 'primary-invalid', params: {} });
            }
        });
    }
    const extend = sanearExtend(config.extend, intentar);
    const utilidades = config.utilities ?? {};
    const userScales: Scales = {
        sizing: { ...defaultScales.sizing, ...Object.fromEntries((Array.isArray(extend.sizing) ? extend.sizing : []).filter((n) => typeof n === 'number').map((n) => [String(n), n])) },
        screens: { ...defaultScales.screens, ...(extend.screens ?? {}) },
        radius: { ...defaultScales.radius, ...(extend.radius ?? {}) },
        gaps: { ...defaultScales.gaps, ...(extend.spacing?.gaps ?? {}) },
        spaces: { ...defaultScales.spaces, ...(extend.spacing?.spaces ?? {}) },
        fontSizes: { ...defaultScales.fontSizes, ...(extend.fontSizes ?? {}) },
        lineHeights: { ...defaultScales.lineHeights, ...(extend.lineHeights ?? {}) },
        letterSpacing: { ...defaultScales.letterSpacing, ...(extend.letterSpacing ?? {}) },
        fontWeights: { ...defaultScales.fontWeights, ...(extend.fontWeights ?? {}) },
        borderWidths: { ...defaultScales.borderWidths, ...(extend.borderWidths ?? {}) },
        blurs: { ...defaultScales.blurs, ...(extend.blurs ?? {}) },
        opacities: { ...defaultScales.opacities, ...(extend.opacities ?? {}) },
        shadows: { ...defaultScales.shadows, ...(extend.shadows ?? {}) },
        durations: { ...defaultScales.durations, ...(extend.motion?.durations ?? {}) },
        easings: { ...defaultScales.easings, ...(extend.motion?.easings ?? {}) },
    };

    let base: { atomic: string[]; utilidades: string[]; resto: string[]; nombres: Set<string>; vocabulary: Record<string, Record<string, string>> } | undefined;
    const diccionarioBase = () => {
        if (!base) {
            const vocabulary = buildVocabularyColors(userColors, userStates);
            const atomic = parseUtilities(buildAtomicCSS(vocabulary, userGridMins)).map((b) => b.name);
            const utilidades = parseUtilities(buildUtilitiesCSS()).map((b) => b.name);
            const resto = [
                ...parseUtilities(buildUtilitiesCSS() + extra.utilities),
                ...parseUtilities(buildComponentsCSS(userColors, userStates) + extra.components),
            ].map((b) => b.name);
            base = { atomic, utilidades, resto, nombres: new Set([...atomic, ...resto, ...aliasDe([...atomic, ...resto]).values()]), vocabulary };
        }
        return base;
    };

    let extendido: Set<string> | undefined;
    const diccionarioExtendido = () => {
        if (!extendido) {
            const { vocabulary } = diccionarioBase();
            const atomic = parseUtilities(buildAtomicCSS(vocabulary, userGridMins, userScales)).map((b) => b.name);
            const resto = [
                ...parseUtilities(buildUtilitiesCSS(userScales) + extra.utilities),
                ...parseUtilities(buildComponentsCSS(userColors, userStates, userScales) + extra.components),
            ].map((b) => b.name);
            extendido = new Set([...atomic, ...resto, ...aliasDe([...atomic, ...resto]).values()]);
        }
        return extendido;
    };

    const pxVistos = new Map<number, string>(
        Object.entries(defaultScales.screens).map(([k, v]) => [parseFloat(v), k]),
    );
    for (const [nombre, valor] of Object.entries(extend.screens ?? {})) {
        intentar(() => {
            const ruta = `extend.screens.${nombre}`;
            if (Object.hasOwn(defaultScales.screens, nombre)) {
                throw fallo(ruta, { code: 'screen-exists', params: { name: nombre } });
            }
            if (!NOMBRE_SCREEN_EXTENDIDO.test(nombre)) {
                throw fallo(ruta, { code: 'screen-name-invalid', params: {} });
            }
            if (typeof valor !== 'string' || !VALOR_PX.test(valor)) {
                throw fallo(ruta, { code: 'screen-value-invalid', params: { value: `${valor}` } });
            }
            const px = parseFloat(valor);
            const otro = pxVistos.get(px);
            if (otro !== undefined) throw fallo(ruta, { code: 'screen-repeated', params: { value: valor, other: otro } });
            pxVistos.set(px, nombre);
            const fabrica = Object.values(defaultScales.screens).map(parseFloat);
            const [, n, familia] = /^(\d)?(xs|xl)$/.exec(nombre)!;
            const orden = Number(n ?? 1);
            if (familia === 'xs' && px >= Math.min(...fabrica)) {
                throw fallo(ruta, { code: 'screen-below-min', params: { name: nombre, px: Math.min(...fabrica) } });
            }
            if (familia === 'xl' && px <= Math.max(...fabrica)) {
                throw fallo(ruta, { code: 'screen-above-max', params: { name: nombre, px: Math.max(...fabrica) } });
            }
            for (const [otroNombre, otroValor] of Object.entries(extend.screens ?? {})) {
                if (otroNombre === nombre) break;
                const m = /^(\d)?(xs|xl)$/.exec(otroNombre);
                if (!m || m[2] !== familia || !VALOR_PX.test(otroValor)) continue;
                const otroOrden = Number(m[1] ?? 1);
                const otroPx = parseFloat(otroValor);
                const debeSerMayor = familia === 'xl' ? orden > otroOrden : orden < otroOrden;
                if (debeSerMayor ? px <= otroPx : px >= otroPx) {
                    throw fallo(ruta, { code: 'screen-order', params: { name: nombre, value: valor, greater: debeSerMayor, other: otroNombre, otherValue: otroValor } });
                }
            }
        }, () => { delete userScales.screens[nombre]; });
    }

    const familias = [
        { ruta: 'extend.radius', clave: 'radius', temaRuta: 'radius', propios: extend.radius },
        { ruta: 'extend.spacing.gaps', clave: 'gaps', temaRuta: 'spacing.gaps', propios: extend.spacing?.gaps },
        { ruta: 'extend.spacing.spaces', clave: 'spaces', temaRuta: 'spacing.spaces', propios: extend.spacing?.spaces },
        { ruta: 'extend.fontSizes', clave: 'fontSizes', temaRuta: 'fontSizes', propios: extend.fontSizes, numerico: RANGO_NIVEL },
        { ruta: 'extend.lineHeights', clave: 'lineHeights', temaRuta: 'lineHeights', propios: extend.lineHeights, numerico: RANGO_NIVEL },
        { ruta: 'extend.letterSpacing', clave: 'letterSpacing', temaRuta: 'letterSpacing', propios: extend.letterSpacing },
        { ruta: 'extend.fontWeights', clave: 'fontWeights', temaRuta: 'fontWeights', propios: extend.fontWeights, tipo: 'font-weight' },
        { ruta: 'extend.borderWidths', clave: 'borderWidths', temaRuta: 'borderWidths', propios: extend.borderWidths, numerico: RANGO_NIVEL },
        { ruta: 'extend.blurs', clave: 'blurs', temaRuta: 'blurs', propios: extend.blurs },
        { ruta: 'extend.opacities', clave: 'opacities', temaRuta: 'opacities', propios: extend.opacities, numerico: RANGO_OPACIDAD, tipo: 'opacity' },
        { ruta: 'extend.shadows', clave: 'shadows', temaRuta: 'shadows', propios: extend.shadows },
        { ruta: 'extend.motion.durations', clave: 'durations', temaRuta: 'motion.durations', propios: extend.motion?.durations, tipo: 'duration' },
        { ruta: 'extend.motion.easings', clave: 'easings', temaRuta: 'motion.easings', propios: extend.motion?.easings },
    ] as readonly {
        ruta: string; clave: keyof Scales; temaRuta: string; propios: Record<string, string> | undefined; numerico?: RangoNumerico; tipo?: keyof typeof TIPOS_DE_VALOR;
    }[];
    const generadas = new Map<string, string>();
    const choquesDeClases = (ruta: string, solo: Scales) => {
        const { atomic, utilidades, nombres, vocabulary } = diccionarioBase();
        const antes = contar([...atomic, ...utilidades]);
        const despues = contar([...parseUtilities(buildAtomicCSS(vocabulary, userGridMins, solo)), ...parseUtilities(buildUtilitiesCSS(solo))].map((b) => b.name));
        for (const [clase, n] of despues) {
            if (n <= (antes.get(clase) ?? 0)) continue;
            if (nombres.has(clase)) {
                throw fallo(ruta, { code: 'class-exists', params: { class: clase } });
            }
            const previo = generadas.get(clase);
            if (previo !== undefined) {
                throw fallo(ruta, { code: 'class-duplicated', params: { class: clase, other: previo } });
            }
            generadas.set(clase, ruta);
            const nuevo = renombrar(clase)?.nuevo;
            if (nuevo && nombres.has(nuevo)) {
                throw fallo(ruta, { code: 'class-renamed-exists', params: { class: clase, renamed: nuevo } });
            }
        }
    };
    for (const { ruta: rutaFamilia, clave, temaRuta, propios, numerico, tipo } of familias) {
        for (const [nombre, valor] of Object.entries(propios ?? {})) {
            intentar(() => {
                const ruta = `${rutaFamilia}.${nombre}`;
                if (Object.hasOwn(defaultScales[clave], nombre)) {
                    throw fallo(ruta, { code: 'scale-exists', params: { name: nombre, themePath: temaRuta } });
                }
                if (numerico) {
                    if (!numerico.regex.test(nombre)) throw fallo(ruta, { code: 'scale-name-numeric', params: { range: numerico.rango } });
                } else if (!NOMBRE_ESCALA.test(nombre)) {
                    throw fallo(ruta, { code: 'scale-name-invalid', params: {} });
                }
                if (clave === 'spaces' && nombre.startsWith('neg-')) {
                    throw fallo(ruta, { code: 'space-neg-prefix', params: {} });
                }
                if (clave === 'spaces' && nombre.endsWith('-negative')) {
                    throw fallo(ruta, { code: 'space-negative-suffix', params: {} });
                }
                validarValor(ruta, valor);
                if (tipo && !TIPOS_DE_VALOR[tipo](valor.trim())) throw fallo(ruta, { code: 'value-type-invalid', params: { kind: tipo, value: valor } });
                if (clave === 'fontSizes' && !Object.hasOwn(defaultScales.lineHeights, nombre) && !Object.hasOwn(extend.lineHeights ?? {}, nombre)) {
                    throw fallo(ruta, { code: 'font-size-needs-line-height', params: { name: nombre } });
                }
                choquesDeClases(ruta, { ...defaultScales, [clave]: { ...defaultScales[clave], [nombre]: valor } });
            }, () => { delete (userScales[clave] as Record<string, string>)[nombre]; });
        }
    }

    const vistos = new Set<number>();
    (Array.isArray(extend.sizing) ? extend.sizing : []).forEach((nivel, i) => {
        intentar(() => {
            const ruta = `extend.sizing[${i}]`;
            if (typeof nivel !== 'number' || !Number.isInteger(nivel)) throw fallo(ruta, { code: 'value-type-invalid', params: { kind: 'integer', value: nivel } });
            if (!RANGO_NIVEL.regex.test(String(nivel))) throw fallo(ruta, { code: 'scale-name-numeric', params: { range: RANGO_NIVEL.rango } });
            if (Object.hasOwn(defaultScales.sizing, String(nivel))) throw fallo(ruta, { code: 'sizing-exists', params: { level: nivel, repeated: false } });
            if (vistos.has(nivel)) throw fallo(ruta, { code: 'sizing-exists', params: { level: nivel, repeated: true } });
            vistos.add(nivel);
            choquesDeClases(ruta, { ...defaultScales, sizing: { ...defaultScales.sizing, [String(nivel)]: nivel } });
        }, () => { if (!Object.hasOwn(defaultScales.sizing, String(nivel))) delete userScales.sizing[String(nivel)]; });
    });

    const nombresDe = (base: Record<string, unknown>, propios?: Record<string, unknown>) => [...Object.keys(base), ...Object.keys(propios ?? {})];
    const escalasDeTema: EscalaDeTema[] = [
        { ruta: 'radius', de: (d) => d.radius, nombres: nombresDe(defaultScales.radius, extend.radius), extendRuta: 'extend.radius' },
        { ruta: 'spacing.gaps', de: (d) => d.spacing?.gaps, nombres: nombresDe(defaultScales.gaps, extend.spacing?.gaps), extendRuta: 'extend.spacing.gaps' },
        { ruta: 'spacing.spaces', de: (d) => d.spacing?.spaces, nombres: nombresDe(defaultScales.spaces, extend.spacing?.spaces), extendRuta: 'extend.spacing.spaces' },
        { ruta: 'screens', de: (d) => d.screens, nombres: nombresDe(defaultScales.screens, extend.screens), extendRuta: 'extend.screens' },
        { ruta: 'fontSizes', de: (d) => d.fontSizes, nombres: nombresDe(defaultScales.fontSizes, extend.fontSizes), extendRuta: 'extend.fontSizes' },
        { ruta: 'lineHeights', de: (d) => d.lineHeights, nombres: nombresDe(defaultScales.lineHeights, extend.lineHeights), extendRuta: 'extend.lineHeights' },
        { ruta: 'letterSpacing', de: (d) => d.letterSpacing, nombres: nombresDe(defaultScales.letterSpacing, extend.letterSpacing), extendRuta: 'extend.letterSpacing' },
        { ruta: 'fontWeights', de: (d) => d.fontWeights, nombres: nombresDe(defaultScales.fontWeights, extend.fontWeights), extendRuta: 'extend.fontWeights', tipo: 'font-weight' },
        { ruta: 'borderWidths', de: (d) => d.borderWidths, nombres: nombresDe(borderWidths, extend.borderWidths), extendRuta: 'extend.borderWidths' },
        { ruta: 'blurs', de: (d) => d.blurs, nombres: nombresDe(blurs, extend.blurs), extendRuta: 'extend.blurs' },
        { ruta: 'zIndex', de: (d) => d.zIndex, nombres: nombresDe(zIndex), tipo: 'integer' },
        { ruta: 'opacities', de: (d) => d.opacities, nombres: nombresDe(opacities, extend.opacities), extendRuta: 'extend.opacities', tipo: 'opacity' },
        { ruta: 'shadows', de: (d) => d.shadows, nombres: nombresDe(shadows, extend.shadows), extendRuta: 'extend.shadows' },
        { ruta: 'motion.durations', de: (d) => d.motion?.durations, nombres: nombresDe(durations, extend.motion?.durations), extendRuta: 'extend.motion.durations', tipo: 'duration' },
        { ruta: 'motion.loops', de: (d) => d.motion?.loops, nombres: nombresDe(loopDurations) },
        { ruta: 'motion.iterations', de: (d) => d.motion?.iterations, nombres: nombresDe(iterations), tipo: 'iterations' },
        { ruta: 'motion.easings', de: (d) => d.motion?.easings, nombres: nombresDe(easings, extend.motion?.easings), extendRuta: 'extend.motion.easings' },
    ];
    for (const [tema, def] of Object.entries(config.themes)) validarTema(tema, def, escalasDeTema, Object.keys(userStates), intentar);

    const claves = Object.keys(utilidades);
    const esClaveModificador = (k: string) => k.includes('.');
    const nombresPropios = claves.filter((k) => !esClaveModificador(k));
    const malas = new Set<string>();
    let cortosMemo: Set<string> | undefined;
    const cortos = () => (cortosMemo ??= new Set([...diccionarioExtendido()].filter((n) => !renombrar(n.replaceAll('\\', ''))).map((n) => n.slice(3))));
    const tabla = tablaPrefijos(userScales.screens);
    let clasif: ReturnType<typeof clasificarComponentes> | undefined;
    const clasificador = () => (clasif ??= (() => {
        const atomic = buildAtomicCSS(diccionarioBase().vocabulary, userGridMins, userScales);
        const utilities = buildUtilitiesCSS(userScales) + extra.utilities;
        const components = buildComponentsCSS(userColors, userStates, userScales) + extra.components;
        const nombres = [atomic, utilities, components].flatMap((css) => parseUtilities(css).map((b) => b.name));
        return clasificarComponentes(manifiesto, atomic, utilities, aliasDe(nombres));
    })());
    const validarEntradas = (ruta: string, clases: unknown) => {
        if (!Array.isArray(clases) || clases.length === 0) throw fallo(ruta, { code: 'utility-empty', params: {} });
        for (const clase of clases) {
            if (typeof clase !== 'string') throw fallo(ruta, { code: 'utility-not-a-class', params: { value: clase } });
            const { cadena, base } = partirEntrada(clase);
            if (esClaveModificador(base)) {
                throw fallo(ruta, { code: 'utility-composes-modifier', params: { class: clase, utility: base.split('.')[0], modifiers: base.split('.').slice(1) } });
            }
            if (cadena.length) {
                const r = validarCadena(cadena, tabla);
                if (!r.ok) {
                    if (r.motivo === 'desconocido') {
                        const sugerida = vecino(r.prefijo, tabla.keys());
                        throw fallo(ruta, { code: 'utility-unknown-prefix', params: { class: clase, prefix: r.prefijo, ...(sugerida && { suggestion: sugerida }) } });
                    }
                    if (r.motivo === 'data-ts') throw fallo(ruta, { code: 'utility-data-ts-variant', params: { class: clase } });
                    if (r.canonica) throw fallo(ruta, { code: 'utility-out-of-order', params: { class: clase, suggestion: r.canonica.join('') + base } });
                    throw fallo(ruta, { code: 'utility-invalid-chain', params: { class: clase } });
                }
                if (clasificador().esComponente(base) && !nombresPropios.includes(base)) {
                    throw fallo(ruta, { code: 'utility-variant-on-component', params: { class: clase, base } });
                }
            }
            if (!cortos().has(base) && !nombresPropios.includes(base)) {
                const candidato = base.startsWith('ts-') ? base.slice(3) : renombrar(`ts-${base}`)?.nuevo?.slice(3);
                const sug = candidato !== undefined && cortos().has(candidato) ? candidato : vecino(base, [...cortos(), ...nombresPropios]);
                throw fallo(ruta, { code: 'utility-unknown-class', params: { class: clase, ...(sug && { suggestion: sug }) } });
            }
        }
    };
    const validarModificador = (ruta: string, mod: string) => {
        if (!NOMBRE_UTILIDAD.test(mod)) {
            throw fallo(ruta, { code: 'modifier-invalid', params: { modifier: mod } });
        }
        if (mod.startsWith(PREFIJO_RESERVADO)) {
            throw fallo(ruta, { code: 'modifier-reserved-prefix', params: { modifier: mod, prefix: PREFIJO_RESERVADO } });
        }
        if (mod === 'ts' || (CLASES_DE_TEMA as readonly string[]).includes(mod)) {
            throw fallo(ruta, { code: 'modifier-theme-class', params: { modifier: mod } });
        }
        if (cortos().has(mod)) {
            throw fallo(ruta, { code: 'modifier-short-name', params: { modifier: mod } });
        }
        if (nombresPropios.includes(mod)) {
            throw fallo(ruta, { code: 'modifier-is-utility', params: { modifier: mod } });
        }
    };
    const combinaciones = new Map<string, string>();
    for (const clave of claves) {
        intentar(() => {
            const ruta = `utilities.${clave}`;
            if (esClaveModificador(clave)) {
                const [componente, ...mods] = clave.split('.');
                if (!nombresPropios.includes(componente)) {
                    throw fallo(ruta, { code: 'component-missing', params: { component: componente } });
                }
                for (const mod of mods) validarModificador(ruta, mod);
                if (new Set(mods).size !== mods.length) throw fallo(ruta, { code: 'modifier-repeated', params: {} });
                const combo = `${componente}.${[...mods].sort().join('.')}`;
                const previa = combinaciones.get(combo);
                if (previa !== undefined) throw fallo(ruta, { code: 'combination-repeated', params: { other: previa } });
                combinaciones.set(combo, clave);
                validarEntradas(ruta, utilidades[clave]);
                return;
            }
            if (!NOMBRE_UTILIDAD.test(clave)) {
                throw fallo(ruta, { code: 'utility-name-invalid', params: {} });
            }
            if (clave.startsWith(PREFIJO_RESERVADO)) {
                throw fallo(ruta, { code: 'utility-reserved-prefix', params: { prefix: PREFIJO_RESERVADO } });
            }
            if (esModificador(clave) || (CLASES_DE_TEMA as readonly string[]).includes(clave)) {
                throw fallo(ruta, { code: 'utility-name-is-modifier', params: {} });
            }
            if (diccionarioBase().nombres.has(clave)) throw fallo(ruta, { code: 'utility-conflicts-ds', params: {} });
            if (clave === 'ts') throw fallo(ruta, { code: 'utility-name-ts', params: {} });
            if (cortos().has(clave)) throw fallo(ruta, { code: 'utility-short-name', params: {} });
            validarEntradas(ruta, utilidades[clave]);
        }, () => { malas.add(clave); });
    }
    const hecho = new Set<string>();
    const enCiclo = new Set<string>();
    const visitar = (nombre: string, camino: string[]): void => {
        if (camino.includes(nombre)) {
            const ciclo = [...camino, nombre].slice(camino.indexOf(nombre));
            intentar(() => { throw fallo(`utilities.${camino[0]}`, { code: 'utility-cycle', params: { cycle: ciclo } }); });
            for (const m of ciclo) { hecho.add(m); enCiclo.add(m); }
            return;
        }
        if (hecho.has(nombre) || malas.has(nombre)) return;
        for (const c of utilidades[nombre]) if (Object.hasOwn(utilidades, c) && !esClaveModificador(c)) visitar(c, [...camino, nombre]);
        hecho.add(nombre);
    };
    for (const nombre of nombresPropios) visitar(nombre, []);

    const sanas = (n: string) => !malas.has(n) && !enCiclo.has(n);
    for (const nombre of claves) {
        if (!sanas(nombre)) continue;
        intentar(() => {
            for (const clase of utilidades[nombre]) {
                const { cadena, base } = partirEntrada(clase);
                if (!cadena.length || esClaveModificador(base) || !Object.hasOwn(utilidades, base) || !sanas(base)) continue;
                const hojas = expandirPropia(base, utilidades);
                const mala = componerUso(cadena, hojas, tabla).find((c) => !c.ok);
                if (mala && !mala.ok) throw fallo(`utilities.${nombre}`, { code: 'utility-invalid-composition', params: datosComposicion(clase, base, cadena, mala) });
                const comp = hojas.find((h) => h.cadena.length === 0 && clasificador().esComponente(h.base) && !nombresPropios.includes(h.base));
                if (comp) throw fallo(`utilities.${nombre}`, { code: 'utility-composes-component', params: { class: clase, utility: base, component: comp.base } });
            }
        });
    }

    lanzarSiHay(errores);

    return { userScales, userUtilities: utilidades };
}
