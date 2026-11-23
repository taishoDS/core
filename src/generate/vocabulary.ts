// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ThemeDef, FontFaceDef, ThemeEntry } from '../config/taisho.types';
import type { Scales } from '../config/scales';
import type { DarkMode } from '../lib/theme/modo-oscuro';
import { DEFAULT_STATES } from '../lib/theme/default-states';
import { lanzarSiHay, resolveExtend } from './resolve-extend';
import { cssDeExtensiones, manifiestoDe } from './registro';
import { validarExtensiones, type TaishoExtensions } from './extension';

/**
 * Config pública del generador: lo que trae el consumidor en su
 * `taisho.config.ts`.
 */
export interface TaishoConfig {
    /** Temas a emitir. La key es el nombre del archivo de salida (p.ej. "taisho" →
     * tokens/taisho.css, "frontend/mi-tema" → tokens/frontend/mi-tema.css). */
    themes: Record<string, ThemeDef>;
    /** Las fuentes que se cargan; sin la clave, ninguna (la del sistema). */
    fontFaces?: FontFaceDef[];
    /** Anchos mínimos de ítem para los grids intrínsecos (ts-grid-min-*). */
    gridMins?: Record<string, string>;
    /** Pilas de fuente CSS por familia (--font-sans/--font-mono/--font-display). */
    fonts?: { sans?: string; mono?: string; display?: string };
    /**
     * Estados semánticos por defecto (hex semilla). Un tema puede sobrescribirlos. Opcional, clave por clave: lo que no
     * definas usa el predeterminado (`DEFAULT_STATES`: success, warning, info, danger); lo que definas se respeta.
     */
    defaultStates?: Record<string, string>;
    /**
     * Escotilla para íconos dinámicos: nombres que nunca aparecen literales en
     * el HTML (`data-ts-icon="${variable}"`), así que el escáner de `taisho
     * generate` no los puede ver. Mismo rol que `options.safelist` del plugin
     * de Vite — la excepción, no el default.
     */
    icons?: string[];
    /**
     * Quitada: se declara `content` (el escáner de íconos lee esos mismos archivos). Con la clave, la generación
     * corta con un error; el tipo es `never` para que el editor lo marque antes.
     */
    iconsHtmlDirs?: never;
    /**
     * Archivos que `taisho generate` lee para compilar sólo el CSS que se usa: globs relativos a esta config.
     * Es la entrada del compilador a demanda; el CLI (`taisho generate`) resuelve los globs. Sin la clave, el CSS es el completo.
     */
    content?: string[];
    /**
     * Clases que el código no escribe literales y deben entrar igual (sólo cuentan con `content`). Tres formas:
     * un nombre exacto con variante opcional (`md:grid-cols-3`), una familia con `*` sólo al final (`grid-cols-*`,
     * `md:gap-*`; el `*` expande sólo a clases que existen) o el nombre de un componente (`toast`), que entra entero.
     * Sin regex. Se escribe sin `ts-`.
     */
    safelist?: string[];
    /**
     * Carpeta donde `taisho generate`, `taisho watch` y el plugin `taisho()` escriben el CSS y el JS, relativa a esta config.
     * Predeterminado: `./taisho`. Manda `--out` (o la opción `out` del plugin) sobre esta; `taisho init` la escribe.
     */
    out?: string;
    /**
     * Cómo se activa el modo oscuro. `'class'` (predeterminado): sólo con la clase `dark` en `<html>`. `'media'`: sigue la
     * preferencia del sistema, sin script en el `<head>`; la clase `dark` lo fuerza oscuro y la clase `light` lo fuerza claro.
     */
    darkMode?: DarkMode;
    /**
     * Agrega valores a las escalas del DS, para TODOS los temas (también los `locked`).
     * Sólo AGREGA: pisar un nombre existente es un Error; para cambiar un valor ya
     * existente se usa `themes.<tema>.<escala>.<nombre>`. En la config se declaran
     * nombres; en el tema se cambian valores.
     *
     * Los `gaps`/`spaces` propios NO se compactan con `compact`.
     */
    extend?: {
        screens?: Record<string, string>;
        radius?: Record<string, string>;
        spacing?: { gaps?: Record<string, string>; spaces?: Record<string, string> };
        sizing?: number[];
        fontSizes?: Record<string, string>;
        lineHeights?: Record<string, string>;
        letterSpacing?: Record<string, string>;
        fontWeights?: Record<string, string>;
        borderWidths?: Record<string, string>;
        blurs?: Record<string, string>;
        opacities?: Record<string, string>;
        shadows?: Record<string, string>;
        motion?: { durations?: Record<string, string>; easings?: Record<string, string> };
    };
    /**
     * Utilidades propias: cada una es una composición de clases que ya existen (del DS u
     * otras utilidades propias), con sus nombres cortos. `{ 'card-hero': ['p-double', 'radius-lg'] }` se usa
     * en el HTML como `card-hero` / `md:card-hero`. El nombre NO puede empezar con `ts-`.
     * Una entrada puede llevar variantes adentro, `[cadena:]clase` con la gramática de las variantes
     * (`'hover:bg-brand-800'`, `'md:p-base'`, `'md:hover:p-base'`); el prefijo del uso se suma a esa cadena y, si la suma no
     * es válida, la clase no se emite y se avisa. Salen con todos los screens. Valen en la salida de `taisho generate` y del
     * plugin `taisho()`.
     *
     * Una clave con punto es un modificador de la propia: `'mi-button.destructive': ['bg-danger-700']` sale como
     * `.mi-button:where(.destructive)` (misma especificidad que la base, así una clase del markup la ajusta) y se usa
     * `ts mi-button destructive`. `'mi-button.destructive.outlined'` es el compuesto (cualquier orden). El componente
     * (`mi-button`) tiene que estar declarado sin punto, y el modificador no lleva variante en el markup (`md:mi-button destructive`).
     * Su nombre no puede chocar con un nombre corto del DS ni con otra propia. `safelist` lo acepta sin variante.
     */
    utilities?: Record<string, string[]>;
    /**
     * Ya es el único modo: las clases del DS se escriben SIN `ts-` y valen sólo en un elemento que lleve también la clase
     * `ts`, en el MISMO elemento: `<button class="ts button variant-primary">`. Eso incluye al contexto: `compact`
     * necesita `ts` en su propio elemento (`<section class="ts compact">` => `:where(.ts).compact`). Cada regla sale como
     * `:where(.ts).button`, con la especificidad de una clase (el `:where` no suma), así que tu CSS gana con
     * una clase cualquiera, sin `!important`. Las `utilities` propias (y sus modificadores) salen sin `:where(.ts)` y se componen con nombres
     * cortos (`['p-double', 'radius-lg']`); un nombre propio no puede ser un nombre corto del DS ni `ts`.
     *
     * Se acepta `'ts'` y avisa «ya es el único modo»; sin la clave es lo mismo.
     * @deprecated Se quita la clave.
     */
    scope?: 'ts';
    /**
     * Idioma de los mensajes de `taisho` (CLI) y del plugin `taisho()`: `'es'` o `'en'`. Manda sobre el del sistema
     * (`LC_ALL`/`LC_MESSAGES`/`LANG`); `--lang` manda sobre esta. No cambia el CSS. `taisho init` la escribe.
     */
    lang?: 'es' | 'en';
}

export { DEFAULT_STATES };

export const DEFAULT_GRID_MINS: Record<string, string> = {
    '2xs': '160px',
    'xs':  '200px',
    'sm':  '240px',
    'md':  '280px',
    'lg':  '340px',
    'xl':  '400px',
};

export function splitKey(key: string): { name: string; group: string } {
    const idx = key.lastIndexOf('/');
    if (idx === -1) return { name: key, group: 'root' };
    return { name: key.slice(idx + 1), group: key.slice(0, idx) };
}

/** Vocabulario compartido derivado de un `TaishoConfig`, sin escribir nada a disco. */
export interface ThemeVocabulary {
    themeEntries: ThemeEntry[];
    userColors: Record<string, string>;
    defaultStates: Record<string, string>;
    userStates: Record<string, string>;
    userFonts: Record<string, string>;
    userGridMins: Record<string, string>;
    /** Escalas vigentes: las de fábrica + `config.extend`. */
    userScales: Scales;
    /** `config.utilities`, ya validadas. */
    userUtilities: Record<string, string[]>;
    /** ¿Algún tema (que no sea `locked`) cambia la densidad? Entonces el override local de los componentes (`density="compact"`) lee los valores del tema. */
    themeChangesDensity: boolean;
}

/**
 * Deriva el vocabulario compartido (anclas para componentes / safelist / tipos)
 * de un `TaishoConfig`: unión de los slots de color de TODOS los temas, y los
 * estados por defecto. Función pura, reusada por `orchestrate()` y por
 * `taisho generate` para no forkear la lógica de resolución de tema.
 */
export function deriveThemeVocabulary(config: TaishoConfig, extensiones: TaishoExtensions = {}): ThemeVocabulary {
    const themeEntries: ThemeEntry[] = Object.entries(config.themes).map(([key, def]) => {
        const { name, group } = splitKey(key);
        return { name, group: group as ThemeEntry['group'], def };
    });

    const userColors: Record<string, string> = Object.fromEntries(
        themeEntries.flatMap((t) => Object.entries(t.def.colors ?? {})),
    );
    const defaultStates: Record<string, string> = { ...config.defaultStates };
    for (const [k, hex] of Object.entries(DEFAULT_STATES)) if (!Object.hasOwn(defaultStates, k)) defaultStates[k] = hex;
    const userStates: Record<string, string> = defaultStates;
    const userFonts: Record<string, string> = { ...(config.fonts ?? {}) };
    const userGridMins = config.gridMins ?? DEFAULT_GRID_MINS;

    const erroresExtension = validarExtensiones(extensiones, config, { userColors, userStates, userGridMins });
    lanzarSiHay(erroresExtension);

    const { userScales, userUtilities } = resolveExtend(config, userColors, userStates, userGridMins, manifiestoDe(extensiones), cssDeExtensiones(extensiones));

    const themeChangesDensity = themeEntries.some((t) => !t.def.locked && Object.values(t.def.density ?? {}).some((modo) => modo && Object.keys(modo).length > 0));

    return { themeEntries, userColors, defaultStates, userStates, userFonts, userGridMins, userScales, userUtilities, themeChangesDensity };
}
