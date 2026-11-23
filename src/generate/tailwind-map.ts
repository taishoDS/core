// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import {
    sizing, radius, gaps, fontSizes, fontWeights, letterSpacing, lineHeights, opacities, durations, easings, blurs, shadows, screens,
} from '../config/scales';
import { renombrar } from './naming-renames';
import { validarAtomico, type Escalas } from './naming-table';
import { inglesDelMapa, type InglesDelMapa } from './tailwind-map-en';

export const TAILWIND_VERSION = '4.x';

const REM_PX = 16;

export interface Fila {
    tailwind: string;
    taisho: string;
    scope: string;
    familia: string;
    exacta: boolean;
    px?: number;
    nota?: string;
}

export interface SinEquivalente {
    clases: string[];
    motivo: string;
}

export interface Variante {
    tailwind: string;
    taisho: string;
    px: number;
}

export interface MapaTailwind {
    tailwind: string;
    unidades: string;
    columnas: Record<keyof Fila, string>;
    filas: Fila[];
    variantes: Variante[];
    colores: {
        prefijos: { tailwind: string; taisho: string; nota?: string }[];
        familiasCompartidas: string[];
        familiasSoloTailwind: string[];
        familiasSoloTaisho: string[];
        escalonesCompartidos: string[];
        escalonesSoloTailwind: string[];
        escalonesSoloTaisho: string[];
        nota: string;
    };
    sinEquivalente: SinEquivalente[];
    en: InglesDelMapa;
}

export interface EntradaMapa {
    vigentes: ReadonlySet<string>;
    esc: Escalas;
    familias: readonly string[];
}

export function vigentesDe(todos: readonly string[], aliases: readonly string[]): Set<string> {
    return new Set([...todos.filter((n) => !renombrar(n)), ...aliases]);
}

const PASOS = ['0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60', '64', '72', '80', '96'];
const pasoPx = (p: string) => (p === 'px' ? 1 : Number(p) * 4);

/** El valor en px que tiene `<prefijo>-<paso>` en el otro framework (`w-64` = 256), o `null` si no es un paso de su escala o vale lo mismo (`p-0`, `p-px`). */
export function medidaDeOtroFramework(clase: string): number | null {
    const m = /^(.+)-(\d+(?:\.5)?)$/.exec(clase);
    if (!m || !PASOS.includes(m[2]) || m[2] === '0' || !PREFIJOS_MEDIDA.some(([prefijo]) => prefijo === m[1])) return null;
    return pasoPx(m[2]);
}

const LOGICO = 'lado lógico: sigue el sentido de lectura (RTL); el de Tailwind es físico';
const PREFIJOS_MEDIDA: [string, string, string?][] = [
    ['p', 'p'], ['px', 'px'], ['py', 'py'], ['pt', 'pt'], ['pb', 'pb'], ['ps', 'ps'], ['pe', 'pe'], ['pl', 'ps', LOGICO], ['pr', 'pe', LOGICO],
    ['m', 'm'], ['mx', 'mx'], ['my', 'my'], ['mt', 'mt'], ['mb', 'mb'], ['ms', 'ms'], ['me', 'me'], ['ml', 'ms', LOGICO], ['mr', 'me', LOGICO],
    ['gap', 'gap'], ['gap-x', 'gap-x'], ['gap-y', 'gap-y'],
    ['inset', 'inset'], ['inset-x', 'inset-x'], ['inset-y', 'inset-y'], ['top', 'top'], ['bottom', 'bottom'],
    ['start', 'start'], ['end', 'end'], ['left', 'start', LOGICO], ['right', 'end', LOGICO],
    ['w', 'w'], ['h', 'h'], ['size', 'size'], ['min-w', 'min-w'], ['min-h', 'min-h'], ['max-w', 'max-w'], ['max-h', 'max-h'],
];

const RADIOS: Record<string, number> = { none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32, full: 9999 };
const TEXTOS: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128 };
const PESOS: Record<string, number> = { thin: 100, extralight: 200, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };
const TRACKING: Record<string, string> = { tighter: '-0.05em', tight: '-0.025em', normal: '0em', wide: '0.025em', wider: '0.05em', widest: '0.1em' };
const LEADING_PX = ['3', '4', '5', '6', '7', '8', '9', '10'];
const LEADING_SIN_UNIDAD: Record<string, string> = { none: '1', tight: '1.25', snug: '1.375', normal: '1.5', relaxed: '1.625', loose: '2' };
const OPACIDADES = ['0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60', '65', '70', '75', '80', '85', '90', '95', '100'];
const ZINDEX = ['0', '10', '20', '30', '40', '50', 'auto'];
const DURACIONES = ['75', '100', '150', '200', '300', '500', '700', '1000'];
const EASINGS: Record<string, string> = { linear: 'linear', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', 'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)' };
const BLURS: Record<string, number> = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 40, '3xl': 64 };
const SOMBRAS = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const PANTALLAS: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

const PALABRAS: [string, string, string, string?, boolean?][] = [
    ...['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'hidden'].map((c): [string, string, string] => [c, c, 'display']),
    ...['static', 'fixed', 'absolute', 'relative', 'sticky'].map((c): [string, string, string] => [c, c, 'posición']),
    ...['visible', 'invisible'].map((c): [string, string, string] => [c, c, 'visibilidad']),
    ...['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse', 'flex-wrap', 'flex-nowrap', 'flex-1'].map((c): [string, string, string] => [c, c, 'flex']),
    ['grow', 'flex-grow', 'flex'], ['grow-0', 'flex-grow-0', 'flex'], ['shrink', 'flex-shrink', 'flex'], ['shrink-0', 'flex-shrink-0', 'flex'],
    ...['start', 'center', 'end', 'baseline', 'stretch'].map((v): [string, string, string] => [`items-${v}`, `items-${v}`, 'alineación']),
    ...['start', 'center', 'end', 'between', 'around', 'evenly', 'stretch'].map((v): [string, string, string] => [`justify-${v}`, `justify-${v}`, 'alineación']),
    ...['auto', 'start', 'center', 'end', 'baseline', 'stretch'].map((v): [string, string, string] => [`self-${v}`, `self-${v}`, 'alineación']),
    ['text-left', 'align-start', 'texto', 'a start: sigue el sentido de lectura (RTL); `text-left` es físico y el valor calculado es otro (`left` / `start`)', false],
    ['text-center', 'align-center', 'texto'],
    ['text-right', 'align-end', 'texto', 'a end: sigue el sentido de lectura (RTL); `text-right` es físico y el valor calculado es otro (`right` / `end`)', false],
    ['text-start', 'align-start', 'texto'], ['text-end', 'align-end', 'texto'],
    ...['balance', 'pretty', 'nowrap'].map((v): [string, string, string] => [`text-${v}`, `wrap-${v}`, 'texto']),
    ...['truncate', 'uppercase', 'lowercase', 'capitalize', 'normal-case', 'italic', 'not-italic', 'underline', 'no-underline', 'line-through', 'antialiased', 'tabular-nums', 'isolate'].map((c): [string, string, string] => [c, c, 'texto y utilidades']),
    ['sr-only', 'sr-only', 'texto y utilidades', 'mismo efecto (fuera de la vista, legible por un lector de pantalla), otra implementación: Tailwind recorta con `clip-path`, TaishoDS con `clip` y sin borde', false],
    ['not-sr-only', 'not-sr-only', 'texto y utilidades', 'mismo efecto (deshace `sr-only`, p. ej. con `focus:`), otra implementación: Tailwind restablece con `clip-path: none`, TaishoDS con `clip: auto`', false],
    ['font-sans', 'font-sans', 'texto', 'la misma intención, otra pila: la de Tailwind es la del sistema; la de TaishoDS empieza por la fuente de tu tema', false],
    ['font-mono', 'font-mono', 'texto', 'la misma intención, otra pila: la de Tailwind es la del sistema; la de TaishoDS empieza por la fuente mono de tu tema', false],
    ['flex-none', 'flex-none', 'flex'],
    ['m-auto', 'm-auto', 'medidas'], ['mx-auto', 'mx-auto', 'medidas'], ['my-auto', 'my-auto', 'medidas'], ['mt-auto', 'mt-auto', 'medidas'], ['mb-auto', 'mb-auto', 'medidas'],
    ['ms-auto', 'ms-auto', 'medidas'], ['me-auto', 'me-auto', 'medidas'], ['ml-auto', 'ms-auto', 'medidas', LOGICO], ['mr-auto', 'me-auto', 'medidas', LOGICO],
    ['border', 'border-1', 'borde', 'el ancho tiene nombre: `border-1` es 1px (Tailwind dice `border`)'],
    ...['1', '2', '3', '4'].map((n): [string, string, string] => [`border-${n}`, `border-${n}`, 'borde']),
    ...['1', '2', '3', '4'].map((n): [string, string, string, string, boolean] => [`ring-${n}`, `ring-${n}`, 'borde', 'misma intención, otra implementación: es un `box-shadow` que pisa a `shadow-*` (Tailwind los suma)', false]),
    ['transition-colors', 'transition-colors', 'movimiento', 'misma intención, otra implementación: anima el fondo y el color del texto con la duración `fast` del tema; Tailwind anima también el borde, el relleno y el trazo, en 150ms', false],
    ['transition-opacity', 'transition-opacity', 'movimiento', 'misma intención, otra duración: la `fast` del tema; la de Tailwind es de 150ms', false],
    ['transition-shadow', 'transition-shadow', 'movimiento', 'misma intención, otra duración: la `fast` del tema; la de Tailwind es de 150ms', false],
    ['transition-all', 'transition-all', 'movimiento', 'misma intención, otra implementación: anima el fondo, el color, la sombra y el transform con la duración `fast` del tema, no todas las propiedades', false],
    ['transition-none', 'transition-none', 'movimiento', 'misma intención, otra implementación: además de no animar nada pone la duración en 0s; Tailwind sólo quita la propiedad animada', false],
    ['outline-none', 'outline-none', 'interacción', 'quita también el contorno del foco (`:focus-visible`): sin otro indicador de foco, el teclado queda sin referencia'],

    ...['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap'].map((v): [string, string, string] => [`whitespace-${v}`, `whitespace-${v}`, 'texto']),
    ...['break-words', 'break-all', 'break-normal'].map((c): [string, string, string] => [c, c, 'texto']),
    ...['auto', 'hidden', 'scroll', 'visible'].map((v): [string, string, string] => [`overflow-${v}`, `overflow-${v}`, 'overflow']),
    ...['auto', 'hidden'].flatMap((v): [string, string, string][] => [[`overflow-x-${v}`, `overflow-x-${v}`, 'overflow'], [`overflow-y-${v}`, `overflow-y-${v}`, 'overflow']]),
    ...['pointer', 'not-allowed', 'default', 'wait', 'grab', 'grabbing'].map((v): [string, string, string] => [`cursor-${v}`, `cursor-${v}`, 'interacción']),
    ...['none', 'text', 'all', 'auto'].map((v): [string, string, string] => [`select-${v}`, `select-${v}`, 'interacción']),
    ...['none', 'auto'].map((v): [string, string, string] => [`pointer-events-${v}`, `pointer-events-${v}`, 'interacción']),
    ['aspect-square', 'aspect-square', 'layout'], ['aspect-video', 'aspect-video', 'layout'],
    ['object-cover', 'object-cover', 'layout'], ['object-contain', 'object-contain', 'layout'],
    ...Array.from({ length: 12 }, (_, i): [string, string, string][] => [
        [`grid-cols-${i + 1}`, `grid-cols-${i + 1}`, 'grid'], [`col-span-${i + 1}`, `col-span-${i + 1}`, 'grid'],
    ]).flat(),
    ['col-span-full', 'col-span-full', 'grid'], ['col-auto', 'col-span-auto', 'grid'], ['col-start-auto', 'col-start-auto', 'grid'],
    ...['full', 'auto', 'screen', 'fit'].flatMap((v): [string, string, string][] => [[`w-${v}`, `w-${v}`, 'medidas'], [`h-${v}`, `h-${v}`, 'medidas']]),
    ['min-h-screen', 'min-h-screen', 'medidas'], ['min-h-full', 'min-h-full', 'medidas'], ['min-w-full', 'min-w-full', 'medidas'], ['max-w-full', 'max-w-full', 'medidas'],
    ...['1/2', '1/4', '3/4'].map((f): [string, string, string] => [`w-${f}`, `w-${f}`, 'medidas']),
    ...['1/3', '2/3'].map((f): [string, string, string, string, boolean] => [`w-${f}`, `w-${f}`, 'medidas', 'el porcentaje de TaishoDS está redondeado a tres decimales (33.333%); el de Tailwind es exacto (`calc(1/3 * 100%)`): menos de 0.02px de diferencia', false]),
    ...Array.from({ length: 6 }, (_, i): [string, string, string][] => [[`line-clamp-${i + 1}`, `line-clamp-${i + 1}`, 'texto']]).flat(),
];

const COLORES_SUELTOS = ['white', 'black', 'transparent', 'current', 'inherit'];
const FAMILIAS_TAILWIND = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const ESCALONES_TAILWIND = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const PREFIJOS_COLOR: { tailwind: string; taisho: string; nota?: string }[] = [
    { tailwind: 'bg', taisho: 'bg' },
    { tailwind: 'text', taisho: 'color' },
    { tailwind: 'border', taisho: 'border', nota: 'además del color dibuja el borde: 1px sólido (`border-gray-200` de Tailwind sólo pinta el color y necesita `border` para verse)' },
    { tailwind: 'ring', taisho: 'ring', nota: 'además del color dibuja el aro: 1px (`ring-blue-500` de Tailwind sólo pinta el color y necesita `ring-N` para verse)' },
];

const NO_CUBIERTO: SinEquivalente[] = [
    { clases: ['p-[13px]', 'w-[calc(100%-2rem)]', 'bg-[#1da1f2]'], motivo: 'valores arbitrarios: el vocabulario es cerrado. La escotilla es un token del config (taisho.user.ts) o una utilidad propia en `utilities`' },
    { clases: ['data-[open]:*', 'aria-[sort=up]:*', 'has-*:*', 'not-*:*', 'first:*', 'odd:*', 'focus-within:*', 'motion-*:*', 'supports-*:*'], motivo: 'variantes fuera de la lista cerrada: las de estado que existen son hover, focus, focus-visible, active, disabled, checked, invalid, group-*, peer-*, aria-<estado>, data-<nombre> (sólo presencia) y print; para lo demás, una clase propia en tu CSS' },
    { clases: ['dark:*'], motivo: 'no hay variante `dark:`: el oscuro sale del tema (`light-dark()`, `createTheme`), no de una clase por elemento' },
    { clases: ['space-x-*', 'space-y-*'], motivo: 'no existen; se reemplazan por `gap-*` en el contenedor flex/grid' },
    { clases: ['rotate-0', 'rotate-1', 'rotate-2', 'rotate-3', 'rotate-6', 'rotate-12', 'rotate-45', 'rotate-90'], motivo: 'sólo existe `rotate-180`: no hay otros giros; para otro ángulo, una utilidad propia en `utilities`' },
    { clases: ['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden'], motivo: 'el estilo del borde no es una clase aparte: los bordes de TaishoDS son sólidos; para guiones o puntos, una utilidad propia en `utilities`' },
    { clases: ['grayscale', 'grayscale-0', 'invert', 'invert-0', 'sepia', 'sepia-0'], motivo: 'no hay filtros de color: sólo `blur-*` y `backdrop-blur-*`; para otro filtro, una utilidad propia en `utilities`' },
    { clases: ['bg-gradient-to-*', 'bg-linear-*'], motivo: 'no hay gradientes: el fondo es un color de la escala; para un gradiente, una utilidad propia en `utilities`' },
    { clases: ['border-0', 'border-8', 'border-t', 'border-b', 'border-l', 'border-r', 'border-x', 'border-y'], motivo: 'el ancho `border-N` (1 a 4) dibuja los cuatro lados y `border-none` lo quita: no hay `border-0` ni `border-8`, ni un lado o un eje sin número; el de un solo lado (`border-t-N`) sólo fija el ancho y el trazo lo dibuja `border-t-<familia>-<n>`' },
    { clases: ['transition'], motivo: 'no hay una `transition` sola: se elige la propiedad (`transition-colors`, `transition-opacity`, `transition-shadow`, `transition-transform`, `transition-all`); `duration-*` y `ease-*` fijan la duración y la curva, y los componentes ya traen su transición; para otra propiedad, una utilidad propia en `utilities`' },
    { clases: ['ring', 'ring-0', 'ring-8', 'ring-inset'], motivo: 'el anillo va de 1 a 4 (`ring-1`…`ring-4`): no hay `ring` sin número, `ring-0`, `ring-8` ni `ring-inset`; el anillo de foco lo pone el reset (`:focus-visible`) y cada componente' },
    { clases: ['outline-hidden'], motivo: 'no hay `outline-hidden`: para quitar el contorno, `outline-none`' },
    { clases: ['md:max-xl:*', 'min-md:*'], motivo: 'no hay rangos: cada pantalla tiene su variante «desde» (`md:`) y su variante «hasta» (`max-md:`), pero no las dos a la vez en una clase' },
];

export const RAICES_TAILWIND: readonly string[] = [
    'accent', 'align', 'animate', 'appearance', 'aspect', 'auto', 'backdrop', 'backface', 'basis', 'bg', 'blur', 'border', 'bottom', 'box', 'break',
    'brightness', 'caret', 'clear', 'col', 'columns', 'content', 'contrast', 'cursor', 'decoration', 'delay', 'divide', 'drop', 'duration', 'ease', 'end',
    'fill', 'flex', 'float', 'font', 'from', 'gap', 'grayscale', 'grid', 'grow', 'h', 'hue', 'hyphens', 'indent', 'inset', 'invert', 'items', 'justify',
    'leading', 'left', 'line', 'list', 'm', 'mb', 'me', 'min', 'max', 'ml', 'mr', 'ms', 'mt', 'mx', 'my', 'object', 'opacity', 'order', 'origin', 'outline',
    'overflow', 'overscroll', 'p', 'pb', 'pe', 'perspective', 'pl', 'place', 'pointer', 'pr', 'ps', 'pt', 'px', 'py', 'resize', 'right', 'ring', 'rotate',
    'rounded', 'row', 'saturate', 'scale', 'scroll', 'select', 'self', 'sepia', 'shadow', 'shrink', 'size', 'skew', 'snap', 'space', 'sr', 'start',
    'stroke', 'table', 'text', 'to', 'top', 'touch', 'tracking', 'transition', 'translate', 'via', 'w', 'whitespace', 'will', 'wrap', 'z',
];

export const PALABRAS_SUELTAS_TAILWIND: readonly string[] = [
    'block', 'inline', 'inline-block', 'inline-flex', 'inline-grid', 'flex', 'grid', 'table', 'contents', 'hidden', 'flow-root', 'static', 'fixed', 'absolute',
    'relative', 'sticky', 'visible', 'invisible', 'collapse', 'container', 'grow', 'shrink', 'truncate', 'underline', 'overline', 'line-through', 'no-underline',
    'uppercase', 'lowercase', 'capitalize', 'normal-case', 'italic', 'not-italic', 'antialiased', 'subpixel-antialiased', 'isolate', 'border', 'rounded',
    'shadow', 'ring', 'outline', 'blur', 'transition', 'transform', 'filter', 'resize', 'sr-only', 'not-sr-only', 'grayscale', 'invert', 'sepia', 'ordinal',
];

function px(v: string | number): number | null {
    if (typeof v === 'number') return v;
    const m = /^var\(--ts-sizing-(\d+)\)$/.exec(v) ?? /^(\d+)px$/.exec(v);
    return m ? Number(m[1]) : null;
}

export function construirMapa(entrada: EntradaMapa): MapaTailwind {
    const { vigentes, esc, familias } = entrada;
    const filas: Fila[] = [];
    const faltan = new Map<string, string[]>();

    const sin = (motivo: string, ...clases: string[]) => {
        const lista = faltan.get(motivo) ?? [];
        lista.push(...clases);
        faltan.set(motivo, lista);
    };
    const sirve = (taisho: string): string | null => {
        if (!vigentes.has(taisho)) return 'no está emitida';
        const v = validarAtomico(taisho, esc, familias);
        return v.length ? v.map((x) => x.detalle).join('; ') : null;
    };
    const fila = (tailwind: string, taisho: string, familia: string, exacta: boolean, nota?: string, motivoSi?: string, valorPx?: number) => {
        const error = sirve(taisho);
        if (error) return sin(motivoSi ?? `la clase de TaishoDS ${error}`, tailwind);
        filas.push({ tailwind, taisho, scope: taisho.slice(3), familia, exacta, ...(valorPx !== undefined ? { px: valorPx } : {}), ...(nota ? { nota } : {}) });
    };

    for (const paso of PASOS) {
        const valor = pasoPx(paso);
        for (const [twPref, tsPref, nota] of PREFIJOS_MEDIDA) {
            const clase = `${twPref}-${paso}`;
            if (!(String(valor) in sizing)) {
                sin(`${valor}px no está en la escala de medidas (sizing)`, clase);
                continue;
            }
            if (sirve(`ts-${tsPref}-${valor}`) === null) {
                fila(clase, `ts-${tsPref}-${valor}`, 'medidas', true, nota, undefined, valor);
                continue;
            }
            const pasoRitmo = Object.keys(gaps).find((k) => px(gaps[k]) === valor);
            const palabra = pasoRitmo && `ts-${tsPref}-${pasoRitmo}`;
            if (palabra && sirve(palabra) === null) {
                const densidad = pasoRitmo === 'none' ? undefined : 'palabra de ritmo: baja con `compact` (para este prefijo no hay clase en px)';
                fila(clase, palabra, 'medidas', pasoRitmo === 'none', [nota, densidad].filter(Boolean).join('. ') || undefined, undefined, valor);
            } else {
                const pasos = Object.keys(gaps).filter((k) => sirve(`ts-${tsPref}-${k}`) === null).map((k) => `${k} ${px(gaps[k])}px`);
                sin(pasos.length
                    ? `${tsPref}: no hay clase en px; sólo los pasos de ritmo (${pasos.join(', ')}), y ninguno vale lo mismo que ese paso de Tailwind`
                    : `${tsPref}: no hay clase en px ni paso de ritmo para este prefijo`, clase);
            }
        }
    }
    // Márgenes negativos: `-m-4` → `ms-neg-…`; mismo criterio que los positivos (px de la escala primero, palabra de ritmo si coincide).
    for (const paso of PASOS) {
        if (paso === '0') continue;
        const valor = pasoPx(paso);
        for (const [twPref, tsPref, nota] of PREFIJOS_MEDIDA.filter(([prefijo]) => /^m[xytbselr]?$/.test(prefijo))) {
            const clase = `-${twPref}-${paso}`;
            const negPref = `${tsPref}-neg`;
            if (!(String(valor) in sizing)) {
                sin(`${valor}px no está en la escala de medidas (sizing)`, clase);
                continue;
            }
            if (sirve(`ts-${negPref}-${valor}`) === null) {
                fila(clase, `ts-${negPref}-${valor}`, 'medidas', true, nota, undefined, valor);
                continue;
            }
            const pasoRitmo = Object.keys(gaps).find((k) => k !== 'none' && px(gaps[k]) === valor);
            const palabra = pasoRitmo && `ts-${negPref}-${pasoRitmo}`;
            if (palabra && sirve(palabra) === null) {
                fila(clase, palabra, 'medidas', true, [nota, 'palabra de ritmo: baja con `compact` (para este prefijo no hay clase en px)'].filter(Boolean).join('. '), undefined, valor);
            } else {
                sin(`${negPref}: no hay clase en px ni paso de ritmo para este prefijo`, clase);
            }
        }
    }

    for (const [nombre, valor] of Object.entries(RADIOS)) {
        const clave = Object.keys(radius).find((k) => px(radius[k]) === valor);
        if (clave) {
            if (nombre === 'full') fila(`rounded-${nombre}`, `ts-radius-${clave}`, 'radio', false, 'el mismo resultado visual (una píldora o un círculo), otro valor: Tailwind usa `calc(infinity * 1px)` y TaishoDS 9999px');
            else fila(`rounded-${nombre}`, `ts-radius-${clave}`, 'radio', true, nombre === clave ? undefined : `el nombre cambia: ${nombre} es ${valor}px y en TaishoDS es ${clave}`);
        }
        else sin(`${valor}px no está en la escala de radios`, `rounded-${nombre}`);
    }
    const claveRounded = Object.keys(radius).find((k) => px(radius[k]) === RADIOS.sm);
    if (claveRounded) fila('rounded', `ts-radius-${claveRounded}`, 'radio', true, `el nombre cambia: rounded es ${RADIOS.sm}px y en TaishoDS es ${claveRounded}`);
    else sin(`${RADIOS.sm}px no está en la escala de radios`, 'rounded');

    for (const [nombre, valor] of Object.entries(TEXTOS)) {
        const cruda = fontSizes[String(valor)];
        if (cruda === undefined) {
            sin(`${valor}px no está en la escala de texto (${Object.keys(fontSizes).join(', ')})`, `text-${nombre}`);
            continue;
        }
        const fijo = px(cruda) === valor;
        const nota = 'Tailwind fija también el interlineado; en TaishoDS es `ts-leading-*` o el compuesto `ts-type-copy-N`';
        fila(`text-${nombre}`, `ts-text-${valor}`, 'tamaño de texto', false, fijo ? nota : `fluido: crece con el viewport hasta ${valor}px. ${nota}`);
    }

    for (const [nombre, valor] of Object.entries(PESOS)) {
        const clave = Object.keys(fontWeights).find((k) => Number(fontWeights[k]) === valor);
        if (clave) fila(`font-${nombre}`, `ts-weight-${clave}`, 'peso', true);
        else sin(`peso ${valor} no está en la escala`, `font-${nombre}`);
    }
    for (const [nombre, valor] of Object.entries(TRACKING)) {
        const clave = Object.keys(letterSpacing).find((k) => letterSpacing[k] === valor);
        if (clave) fila(`tracking-${nombre}`, `ts-tracking-${clave}`, 'tracking', true);
        else sin(`${valor} no está en la escala de tracking`, `tracking-${nombre}`);
    }
    for (const paso of LEADING_PX) {
        const valor = pasoPx(paso);
        const clave = Object.keys(lineHeights).find((k) => px(lineHeights[k]) === valor);
        if (clave) fila(`leading-${paso}`, `ts-leading-${clave}`, 'interlineado', true, `en TaishoDS el número es el tamaño de texto al que acompaña (${clave}), no los px: el interlineado es ${valor}px`);
        else sin(`interlineado de ${valor}px no está en la escala`, `leading-${paso}`);
    }
    for (const [nombre, valor] of Object.entries(LEADING_SIN_UNIDAD)) {
        if (['none', 'tight'].includes(nombre)) fila(`leading-${nombre}`, `ts-leading-${nombre}`, 'interlineado', true, `${valor} sin unidad`);
        else sin('interlineado sin unidad: sólo existen `none` y `tight`', `leading-${nombre}`);
    }
    for (const n of OPACIDADES) {
        const clave = Object.keys(opacities).find((k) => Number(opacities[k]) === Number(n) / 100);
        if (clave) fila(`opacity-${n}`, `ts-opacity-${clave}`, 'opacidad', true);
        else sin(`opacidad ${n} no está en la escala (${Object.keys(opacities).filter((k) => /^\d+$/.test(k)).join(', ')})`, `opacity-${n}`);
    }
    for (const z of ZINDEX) fila(`z-${z}`, `ts-z-${z}`, 'z-index', true);
    for (const ms of DURACIONES) {
        const clave = Object.keys(durations).find((k) => durations[k] === `${ms}ms`);
        if (clave) fila(`duration-${ms}`, `ts-duration-${clave}`, 'movimiento', true, `el nombre cambia: ${ms}ms es ${clave}`);
        else sin(`${ms}ms no está en la escala de duraciones`, `duration-${ms}`);
    }
    for (const [nombre, valor] of Object.entries(EASINGS)) {
        const clave = Object.keys(easings).find((k) => easings[k] === valor);
        if (clave) fila(`ease-${nombre}`, `ts-ease-${clave}`, 'movimiento', true);
        else sin('esa curva de easing no está en la escala', `ease-${nombre}`);
    }
    for (const [nombre, valor] of Object.entries(BLURS)) {
        const clave = Object.keys(blurs).find((k) => px(blurs[k]) === valor);
        if (clave) {
            const nota = nombre === clave ? undefined : `el nombre cambia: blur-${nombre} es ${valor}px y en TaishoDS es ${clave}`;
            fila(`blur-${nombre}`, `ts-blur-${clave}`, 'blur', true, nota);
            fila(`backdrop-blur-${nombre}`, `ts-backdrop-blur-${clave}`, 'blur', true, nota);
        } else sin(`blur de ${valor}px no está en la escala`, `blur-${nombre}`, `backdrop-blur-${nombre}`);
    }
    fila('shadow-none', 'ts-shadow-none', 'sombra', true);
    for (const nombre of SOMBRAS) {
        if (nombre in shadows) fila(`shadow-${nombre}`, `ts-shadow-${nombre}`, 'sombra', false, 'misma intención, otra sombra: la de TaishoDS incluye el anillo de 1px del material');
        else sin('esa sombra no existe en la escala de TaishoDS (sm, md, lg, xl)', `shadow-${nombre}`);
    }

    for (const [tailwind, taisho, familia, nota, exacta = true] of PALABRAS) fila(tailwind, `ts-${taisho}`, familia, exacta, nota, 'la clase de TaishoDS no está emitida (su vocabulario es más corto que el de Tailwind)');

    for (const c of COLORES_SUELTOS) {
        if (sirve(`ts-bg-${c}`) === null) {
            fila(`bg-${c}`, `ts-bg-${c}`, 'color', true);
            if (sirve(`ts-color-${c}`) === null) fila(`text-${c}`, `ts-color-${c}`, 'color', true);
        } else sin('current e inherit no son colores del tema (el color sale de las semillas): para una superficie, `bg-background-100` o un gris de la escala (`bg-gray-100`…`bg-gray-1000`); para el texto, `color-gray-1000` o el color del tema', `bg-${c}`, `text-${c}`);
    }

    const variantes: Variante[] = [];
    for (const [nombre, valor] of Object.entries(PANTALLAS)) {
        if (px(screens[nombre] ?? '') === valor) variantes.push({ tailwind: `${nombre}:`, taisho: `${nombre}:`, px: valor });
        else sin(`el corte ${nombre} no está en las pantallas del Core; se agrega con extend.screens`, `${nombre}:*`);
    }

    const escalonesTaisho = [...new Set([...vigentes].flatMap((n) => /^ts-bg-[a-z]+-(\d+)$/.exec(n)?.[1] ?? []))];
    const familiasCompartidas = FAMILIAS_TAILWIND.filter((f) => familias.includes(f));
    const escalonesCompartidos = ESCALONES_TAILWIND.filter((e) => escalonesTaisho.includes(e));
    for (const p of PREFIJOS_COLOR) {
        for (const f of familiasCompartidas) {
            for (const e of escalonesCompartidos) {
                const nombre = `ts-${p.taisho}-${f}-${e}`;
                const error = sirve(nombre);
                if (error) throw new Error(`tailwind-map: ${p.tailwind}-${f}-${e} → ${nombre} ${error}`);
            }
        }
    }

    const mapa: Omit<MapaTailwind, 'en'> = {
        tailwind: TAILWIND_VERSION,
        unidades: `En Tailwind el número de una medida es un paso de ${pasoPx('1')}px (w-64 = 16rem = ${64 * 4}px con 1rem = ${REM_PX}px); en TaishoDS es el valor en px (ts-w-64 = 64px). Por eso la tabla se arma por el valor en px y no por el número, y la columna \`nota\` de cada medida dice los dos.`,
        columnas: {
            tailwind: 'Clase de Tailwind, sin variante',
            taisho: 'Clase de TaishoDS con el prefijo ts-',
            scope: 'La misma, con la llave ts (sin prefijo)',
            familia: 'Familia de la tabla',
            px: 'Sólo en medidas: valor en px, el mismo de las dos clases',
            exacta: 'true si el valor CSS es el mismo; false si es la misma intención con otro valor (ver nota)',
            nota: 'Lo que cambia: valor de cada lado, lado lógico, fluido',
        },
        filas,
        variantes,
        colores: {
            prefijos: PREFIJOS_COLOR,
            familiasCompartidas,
            familiasSoloTailwind: FAMILIAS_TAILWIND.filter((f) => !familias.includes(f)),
            familiasSoloTaisho: familias.filter((f) => !FAMILIAS_TAILWIND.includes(f)),
            escalonesCompartidos,
            escalonesSoloTailwind: ESCALONES_TAILWIND.filter((e) => !escalonesTaisho.includes(e)),
            escalonesSoloTaisho: escalonesTaisho.filter((e) => !ESCALONES_TAILWIND.includes(e)),
            nota: 'El nombre coincide, el color no: la paleta de TaishoDS sale de las semillas de tu tema (OKLCH), no de la de Tailwind. Conviene revisar el resultado a ojo.',
        },
        sinEquivalente: [...[...faltan].map(([motivo, clases]) => ({ clases, motivo })), ...NO_CUBIERTO],
    };
    return { ...mapa, en: inglesDelMapa(mapa) };
}
