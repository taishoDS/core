// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import {
    fontSizes, lineHeights, letterSpacing, fontWeights, shadows, durations, easings, blurs, opacities,
    zIndex, radius, screens, borderWidths, gaps, spaces, sizing,
} from '../config/scales';

export type EscalaId =
    | 'radius' | 'blurs' | 'shadows' | 'screens' | 'gridMins' | 'fontSizes' | 'lineHeights'
    | 'letterSpacing' | 'fontWeights' | 'durations' | 'easings' | 'opacities' | 'zIndex' | 'borderWidths';
export type Escalas = Record<EscalaId, readonly string[]> & { ritmo: readonly string[]; sizing: readonly string[] };

export type Valor =
    | { t: 'espaciado'; auto?: boolean; neg?: boolean; safe?: boolean }
    | { t: 'escala'; de: EscalaId; extra?: readonly string[] }
    | { t: 'px'; extra?: readonly string[]; patron?: RegExp }
    | { t: 'conteo'; extra?: readonly string[]; patron?: RegExp }
    | { t: 'palabras'; lista: readonly string[]; patron?: RegExp }
    | { t: 'color'; extra?: readonly string[]; ancho?: boolean; anchoSolo?: boolean }
    | { t: 'ring-shadow' }
    | { t: 'familia'; extra?: readonly string[] };

export interface Prefijo {
    prop: string;
    valor: Valor;
    legado?: { regla: 'fisico' | 'texto' | 'alias'; sucesor: string };
}

const ESP: Valor = { t: 'espaciado' };
const ESPS: Valor = { t: 'espaciado', safe: true };
const ESPN: Valor = { t: 'espaciado', neg: true, auto: true };
const PX: Valor = { t: 'px' };
const COLB: Valor = { t: 'color', ancho: true, anchoSolo: true, extra: ['none', 'transparent', '0'] };
const fis = (sucesor: string): Prefijo['legado'] => ({ regla: 'fisico', sucesor });

export const PREFIJOS: Record<string, Prefijo> = {
    m: { prop: 'margin', valor: ESPN },
    mx: { prop: 'margin-inline', valor: ESPN },
    my: { prop: 'margin-top + margin-bottom', valor: ESPN },
    mt: { prop: 'margin-top', valor: ESPN },
    mb: { prop: 'margin-bottom', valor: ESPN },
    ms: { prop: 'margin-inline-start', valor: ESPN },
    me: { prop: 'margin-inline-end', valor: ESPN },
    ml: { prop: 'margin-left', valor: ESPN, legado: fis('ms') },
    mr: { prop: 'margin-right', valor: ESPN, legado: fis('me') },
    p: { prop: 'padding', valor: ESP },
    px: { prop: 'padding-inline', valor: ESP },
    py: { prop: 'padding-top + padding-bottom', valor: ESP },
    pt: { prop: 'padding-top', valor: ESPS },
    pb: { prop: 'padding-bottom', valor: ESPS },
    ps: { prop: 'padding-inline-start', valor: ESPS },
    pe: { prop: 'padding-inline-end', valor: ESPS },
    pl: { prop: 'padding-left', valor: ESPS, legado: fis('ps') },
    pr: { prop: 'padding-right', valor: ESPS, legado: fis('pe') },
    gap: { prop: 'gap', valor: ESP },
    'gap-x': { prop: 'column-gap', valor: ESP },
    'gap-y': { prop: 'row-gap', valor: ESP },
    inset: { prop: 'inset', valor: PX },
    'inset-x': { prop: 'inset-inline', valor: ESP },
    'inset-y': { prop: 'top + bottom', valor: ESP },
    top: { prop: 'top', valor: ESP },
    bottom: { prop: 'bottom', valor: ESP },
    start: { prop: 'inset-inline-start', valor: ESP },
    end: { prop: 'inset-inline-end', valor: ESP },
    left: { prop: 'left', valor: ESP, legado: fis('start') },
    right: { prop: 'right', valor: ESP, legado: fis('end') },
    w: { prop: 'width', valor: { t: 'px', extra: ['full', 'auto', 'screen', 'fit'], patron: /^\d+\/\d+$/ } },
    h: { prop: 'height', valor: { t: 'px', extra: ['full', 'auto', 'screen', 'fit'] } },
    size: { prop: 'width + height', valor: PX },
    'min-w': { prop: 'min-width', valor: { t: 'px', extra: ['full'] } },
    'min-h': { prop: 'min-height', valor: { t: 'px', extra: ['full', 'screen'] } },
    'max-w': { prop: 'max-width', valor: { t: 'px', extra: ['full'], patron: /^(modal|screen)-(sm|md|lg|xl|2xl)$/ } },
    'max-h': { prop: 'max-height', valor: { t: 'px', extra: ['full'] } },
    'translate-x': { prop: 'transform: translateX', valor: PX },
    'translate-y': { prop: 'transform: translateY', valor: PX },
    text: { prop: 'font-size', valor: { t: 'escala', de: 'fontSizes' } },
    align: { prop: 'text-align', valor: { t: 'palabras', lista: ['start', 'center', 'end'] } },
    wrap: { prop: 'text-wrap', valor: { t: 'palabras', lista: ['balance', 'pretty', 'nowrap'] } },
    type: {
        prop: 'font + line-height + letter-spacing (compuesto)',
        valor: { t: 'palabras', lista: [], patron: /^(heading|copy|label|button)-\d+(-(mono|strong))?$/ },
    },
    leading: { prop: 'line-height', valor: { t: 'escala', de: 'lineHeights', extra: ['none', 'tight'] } },
    tracking: { prop: 'letter-spacing', valor: { t: 'escala', de: 'letterSpacing' } },
    weight: { prop: 'font-weight', valor: { t: 'escala', de: 'fontWeights' } },
    font: { prop: 'font-family', valor: { t: 'palabras', lista: ['sans', 'mono', 'display', 'inherit'] } },
    whitespace: { prop: 'white-space', valor: { t: 'palabras', lista: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap'] } },
    break: { prop: 'overflow-wrap / word-break', valor: { t: 'palabras', lista: ['words', 'all', 'normal'] } },
    'line-clamp': { prop: 'line-clamp', valor: { t: 'conteo', extra: ['none'] } },
    valign: { prop: 'vertical-align', valor: { t: 'palabras', lista: ['baseline', 'top', 'middle', 'bottom'] } },
    color: { prop: 'color', valor: { t: 'color', extra: ['white', 'black'] } },
    bg: { prop: 'background-color', valor: { t: 'color', extra: ['white', 'black', 'transparent', 'glow-brand', 'glow-accent', 'highlight', 'highlight-strong'] } },
    accent: { prop: 'accent-color', valor: { t: 'palabras', lista: ['brand', 'accent', 'auto'] } },
    border: { prop: 'border', valor: { t: 'color', ancho: true, anchoSolo: true, extra: ['none', 'transparent', 'separator'] } },
    'border-t': { prop: 'border-top', valor: COLB },
    'border-b': { prop: 'border-bottom', valor: COLB },
    'border-s': { prop: 'border-inline-start', valor: COLB },
    'border-e': { prop: 'border-inline-end', valor: COLB },
    'border-r': { prop: 'border-right', valor: COLB, legado: fis('border-e') },
    'border-l': { prop: 'border-left', valor: COLB, legado: fis('border-s') },
    outline: { prop: 'outline', valor: { t: 'color', ancho: true, extra: ['none', 'transparent'] } },
    'outline-offset': { prop: 'outline-offset', valor: PX },
    'outline-focus': { prop: 'outline', valor: COLB, legado: { regla: 'alias', sucesor: 'outline' } },
    ring: { prop: 'box-shadow', valor: { t: 'color', anchoSolo: true } },
    'ring-shadow': { prop: 'box-shadow', valor: { t: 'ring-shadow' } },
    'focus-ring': { prop: 'color del foco', valor: { t: 'familia', extra: ['primary'] } },
    divide: { prop: 'border-width (hijos)', valor: { t: 'palabras', lista: ['x', 'y'] } },
    radius: { prop: 'border-radius', valor: { t: 'escala', de: 'radius' } },
    ...Object.fromEntries(
        (['ss', 'se', 'es', 'ee', 's', 'e'] as const).map((l) => [`radius-${l}`, { prop: 'border-radius (esquina lógica)', valor: { t: 'palabras', lista: ['inherit'] } } as Prefijo]),
    ),
    ...Object.fromEntries(
        Object.entries({ tl: 'ss', tr: 'se', bl: 'es', br: 'ee', l: 's', r: 'e' }).map(([f, l]) => [
            `radius-${f}`, { prop: 'border-radius (esquina física)', valor: { t: 'palabras', lista: ['inherit'] }, legado: fis(`radius-${l}`) } as Prefijo,
        ]),
    ),
    shadow: { prop: 'box-shadow', valor: { t: 'escala', de: 'shadows', extra: ['none'] } },
    blur: { prop: 'filter: blur', valor: { t: 'escala', de: 'blurs' } },
    'backdrop-blur': { prop: 'backdrop-filter: blur', valor: { t: 'escala', de: 'blurs' } },
    opacity: { prop: 'opacity', valor: { t: 'escala', de: 'opacities' } },
    z: { prop: 'z-index', valor: { t: 'conteo', extra: ['auto'] } },
    material: { prop: 'material (compuesto)', valor: { t: 'palabras', lista: ['base', 'small', 'medium', 'large', 'tooltip', 'menu', 'modal', 'fullscreen'] } },
    surface: { prop: 'material de superficie', valor: { t: 'escala', de: 'radius' } },
    floating: { prop: 'material flotante', valor: { t: 'escala', de: 'radius' } },
    flex: { prop: 'flex', valor: { t: 'palabras', lista: ['row', 'col', 'row-reverse', 'col-reverse', 'wrap', 'nowrap', 'grow', 'shrink', 'none'], patron: /^((grow|shrink)-)?\d+$/ } },
    items: { prop: 'align-items', valor: { t: 'palabras', lista: ['start', 'center', 'end', 'baseline', 'stretch'] } },
    justify: { prop: 'justify-content', valor: { t: 'palabras', lista: ['start', 'center', 'end', 'between', 'around', 'evenly', 'stretch'] } },
    'justify-self': { prop: 'justify-self', valor: { t: 'palabras', lista: ['auto', 'start', 'center', 'end', 'stretch'] } },
    self: { prop: 'align-self', valor: { t: 'palabras', lista: ['auto', 'start', 'center', 'end', 'baseline', 'stretch'] } },
    'place-content': { prop: 'place-content', valor: { t: 'palabras', lista: ['start', 'center', 'end', 'between', 'around', 'evenly', 'stretch'] } },
    'place-items': { prop: 'place-items', valor: { t: 'palabras', lista: ['start', 'center', 'end', 'stretch'] } },
    'place-self': { prop: 'place-self', valor: { t: 'palabras', lista: ['auto', 'start', 'center', 'end', 'stretch'] } },
    order: { prop: 'order', valor: { t: 'conteo', extra: ['first', 'last', 'none'] } },
    'grid-cols': { prop: 'grid-template-columns', valor: { t: 'conteo' } },
    'grid-rows': { prop: 'grid-template-rows', valor: { t: 'conteo' } },
    'grid-flow': { prop: 'grid-auto-flow', valor: { t: 'palabras', lista: ['row', 'col', 'dense'] } },
    'grid-min': { prop: '--ts-grid-min', valor: { t: 'escala', de: 'gridMins' } },
    'col-span': { prop: 'grid-column', valor: { t: 'conteo', extra: ['full', 'auto'] } },
    'col-start': { prop: 'grid-column-start', valor: { t: 'palabras', lista: ['auto'] } },
    'row-span': { prop: 'grid-row', valor: { t: 'conteo', extra: ['full'] } },
    columns: { prop: 'columns', valor: { t: 'conteo' } },
    aspect: { prop: 'aspect-ratio', valor: { t: 'palabras', lista: ['square', 'video', 'auto'] } },
    overflow: { prop: 'overflow', valor: { t: 'palabras', lista: ['auto', 'hidden', 'scroll', 'visible'] } },
    'overflow-x': { prop: 'overflow-x', valor: { t: 'palabras', lista: ['auto', 'hidden'] } },
    'overflow-y': { prop: 'overflow-y', valor: { t: 'palabras', lista: ['auto', 'hidden'] } },
    object: { prop: 'object-fit', valor: { t: 'palabras', lista: ['cover', 'contain'] } },
    cursor: { prop: 'cursor', valor: { t: 'palabras', lista: ['pointer', 'not-allowed', 'default', 'wait', 'grab', 'grabbing', 'col-resize', 'row-resize', 'ew-resize', 'ns-resize', 'nwse-resize', 'nesw-resize', 'cell'] } },
    select: { prop: 'user-select', valor: { t: 'palabras', lista: ['none', 'text', 'all', 'auto'] } },
    'pointer-events': { prop: 'pointer-events', valor: { t: 'palabras', lista: ['none', 'auto'] } },
    snap: { prop: 'scroll-snap-*', valor: { t: 'palabras', lista: ['x', 'y', 'both', 'none', 'start', 'center', 'end', 'align-none'] } },
    appearance: { prop: 'appearance', valor: { t: 'palabras', lista: ['none'] } },
    scheme: { prop: 'color-scheme + color', valor: { t: 'palabras', lista: ['dark', 'light'] } },
    isolation: { prop: 'isolation', valor: { t: 'palabras', lista: ['auto'] } },
    list: { prop: 'list-style', valor: { t: 'palabras', lista: ['none', 'disc'] } },
    box: { prop: 'box-sizing', valor: { t: 'palabras', lista: ['border'] } },
    'will-change': { prop: 'will-change', valor: { t: 'palabras', lista: ['auto', 'transform', 'scroll'] } },
    duration: { prop: 'transition-duration', valor: { t: 'escala', de: 'durations' } },
    ease: { prop: 'transition-timing-function', valor: { t: 'escala', de: 'easings' } },
    transition: { prop: 'transition', valor: { t: 'palabras', lista: ['all', 'colors', 'input', 'none', 'opacity', 'option', 'shadow', 'transform', 'width'] } },
    animate: { prop: 'animation', valor: { t: 'palabras', lista: ['spin'] } },
    scale: { prop: 'transform: scale', valor: { t: 'conteo', extra: ['var'] } },
    origin: { prop: 'transform-origin', valor: { t: 'palabras', lista: ['top-left'] } },
    rotate: { prop: 'transform: rotate', valor: { t: 'conteo' } },
};

export const TEXTO_LEGADO: { patron: RegExp; sucesor: (v: string) => string }[] = [
    { patron: /^(left|center|right)$/, sucesor: (v) => `align-${{ left: 'start', center: 'center', right: 'end' }[v]}` },
    { patron: /^(balance|pretty|nowrap)$/, sucesor: (v) => `wrap-${v}` },
    { patron: /^(heading|copy|label|button)-/, sucesor: (v) => `type-${v}` },
];

export const PALABRAS_SOLAS: Record<string, string> = {
    block: 'display', flex: 'display', grid: 'display', hidden: 'display', contents: 'display', inline: 'display',
    'inline-block': 'display', 'inline-flex': 'display', 'inline-grid': 'display',
    absolute: 'position', fixed: 'position', relative: 'position', sticky: 'position',
    visible: 'visibility', invisible: 'visibility',
    underline: 'text-decoration', 'no-underline': 'text-decoration', 'line-through': 'text-decoration',
    uppercase: 'text-transform', lowercase: 'text-transform', capitalize: 'text-transform', 'normal-case': 'text-transform',
    italic: 'font-style', 'not-italic': 'font-style',
    truncate: 'overflow + text-overflow', antialiased: 'font-smoothing', isolate: 'isolation',
    'tabular-nums': 'font-variant-numeric', 'sr-only': 'visualmente oculto', 'not-sr-only': 'deshace sr-only',
    'grid-auto': 'grid-template-columns (auto-fit)', 'grid-auto-fill': 'grid-template-columns (auto-fill)',
    'tap-highlight-none': '-webkit-tap-highlight-color',
};

export const UTILIDADES_PROPIAS: readonly string[] = [
    'disabled', 'disabled-flat', 'focus-ring', 'focus-ring-thumb', 'focus-ring-inset', 'field-box', 'field-box-trigger', 'option-row', 'popover-reset', 'required-indicator',
    'cq', 'cq-normal',
    'color-heading', 'color-copy', 'color-subtle', 'color-label', 'color-success', 'color-warning', 'color-info', 'color-danger',
    'color-btn',
];

export const CONTEXTOS: readonly string[] = ['compact'];

export const MARCADORES: readonly string[] = ['group', 'peer'];

export const COMPONENTES: readonly string[] = [
    'icon', 'button', 'badge', 'calendar', 'card', 'checkbox', 'combobox', 'command',
    'datepicker', 'drawer', 'empty', 'input', 'menu', 'modal', 'nav', 'note', 'number', 'pager', 'pagination',
    'radio', 'segmented', 'select', 'sidebar', 'slider', 'table', 'tabs', 'textarea', 'toc', 'toggle',
    'tooltip', 'popover', 'toaster', 'toast', 'spinner', 'avatar', 'accordion', 'progress', 'skeleton', 'kbd', 'tag',
    'banner', 'link', 'collapsible', 'context', 'breadcrumbs', 'separator', 'code', 'inline-code', 'loading-dots',
    'file-upload', 'scroll-area', 'aspect-ratio', 'grid-container', 'required-proxy',
];

export function escalasDe(opts: { gridMins?: readonly string[]; gaps?: readonly string[]; spaces?: readonly string[] } = {}): Escalas {
    const k = (o: Record<string, unknown>) => Object.keys(o);
    return {
        radius: [...k(radius), 'full'], blurs: k(blurs), shadows: k(shadows), screens: k(screens),
        gridMins: opts.gridMins ?? [], fontSizes: k(fontSizes), lineHeights: k(lineHeights),
        letterSpacing: k(letterSpacing), fontWeights: k(fontWeights), durations: k(durations), easings: k(easings),
        opacities: k(opacities), zIndex: k(zIndex), borderWidths: k(borderWidths),
        ritmo: [...new Set([...(opts.gaps ?? k(gaps)), ...(opts.spaces ?? k(spaces))])],
        sizing: k(sizing),
    };
}

export type ReglaId =
    | 'prefijo' | 'valor' | 'unicidad' | 'negative' | 'important' | 'fisico' | 'texto' | 'ascii' | 'alias';

export interface Violacion { regla: ReglaId; detalle: string }

export function prefijoMasLargo(resto: string): string | undefined {
    let mejor: string | undefined;
    for (const p of Object.keys(PREFIJOS)) {
        if ((resto === p || resto.startsWith(p + '-')) && (!mejor || p.length > mejor.length)) mejor = p;
    }
    return mejor;
}

export function raizComponente(resto: string, raices: readonly string[] = COMPONENTES): string | undefined {
    let mejor: string | undefined;
    for (const r of raices) {
        if ((resto === r || resto.startsWith(r + '-')) && (!mejor || r.length > mejor.length)) mejor = r;
    }
    return mejor;
}

export function esColor(v: string, familias: readonly string[], extra: readonly string[] = []): boolean {
    if (extra.includes(v)) return true;
    if (/^primary-solid(?:-hover|-active)?(?:-contrast)?$/.test(v)) return true;
    const m = v.match(/^(.+)-(\d+)(-contrast)?$/) ?? v.match(/^(.+)-solid(?:-hover|-active)?(?:-contrast)?$/);
    return !!m && familias.includes(m[1]);
}

export function valorValido(valor: Valor, v: string, esc: Escalas, familias: readonly string[]): boolean {
    switch (valor.t) {
        case 'espaciado':
            return esc.ritmo.includes(v) || esc.sizing.includes(v) || (!!valor.auto && v === 'auto') || (!!valor.safe && v === 'safe');
        case 'escala':
            return esc[valor.de].includes(v) || (valor.extra?.includes(v) ?? false) || (valor.de === 'radius' && v === 'none');
        case 'px':
            return esc.sizing.includes(v) || (valor.extra?.includes(v) ?? false) || (valor.patron?.test(v) ?? false);
        case 'conteo':
            return /^\d+$/.test(v) || (valor.extra?.includes(v) ?? false) || (valor.patron?.test(v) ?? false);
        case 'palabras':
            return valor.lista.includes(v) || (valor.patron?.test(v) ?? false);
        case 'familia':
            return familias.includes(v) || (valor.extra?.includes(v) ?? false);
        case 'color': {
            if (esColor(v, familias, valor.extra)) return true;
            if (valor.anchoSolo && esc.borderWidths.includes(v)) return true;
            if (!valor.ancho) return false;
            const m = v.match(/^(\d+)-(.+)$/);
            return !!m && esc.borderWidths.includes(m[1]) && esColor(m[2], familias, ['transparent']);
        }
        case 'ring-shadow': {
            const m = v.match(/^([a-z0-9]+)-(.+)$/);
            return !!m && esc.shadows.includes(m[1]) && esColor(m[2], familias);
        }
    }
}

export function validarAtomico(nombre: string, esc: Escalas, familias: readonly string[]): Violacion[] {
    const out: Violacion[] = [];
    if (!/^ts-[A-Za-z0-9/-]+$/.test(nombre)) out.push({ regla: 'ascii', detalle: 'caracteres fuera de [A-Za-z0-9/-]' });
    const resto = nombre.replace(/^ts-/, '');
    if (/-negative$/.test(resto)) out.push({ regla: 'negative', detalle: 'sufijo -negative; va neg- como prefijo del valor' });
    if (/-important$/.test(resto)) out.push({ regla: 'important', detalle: 'sufijo -important; no va en un nombre público' });
    if (resto in PALABRAS_SOLAS || UTILIDADES_PROPIAS.includes(resto)) return out;
    const p = prefijoMasLargo(resto);
    if (!p) {
        out.push({ regla: 'prefijo', detalle: 'prefijo fuera de la lista cerrada' });
        return out;
    }
    const def = PREFIJOS[p];
    if (def.legado) out.push({ regla: def.legado.regla, detalle: `${p} → ${def.legado.sucesor}` });
    let v = resto.slice(p.length + 1);
    if (p === 'text') {
        const viejo = TEXTO_LEGADO.find((l) => l.patron.test(v));
        if (viejo) {
            out.push({ regla: 'texto', detalle: `text-${v} → ${viejo.sucesor(v)}` });
            return out;
        }
    }
    v = v.replace(/-(negative|important)$/, '');
    const neg = v.startsWith('neg-');
    if (neg) {
        if (def.valor.t === 'espaciado' && def.valor.neg) {
            v = v.slice(4);
            if (['auto', 'none', '0'].includes(v)) out.push({ regla: 'valor', detalle: `neg-${v} no tiene sentido; se escribe ${v}` });
        } else out.push({ regla: 'valor', detalle: `neg- no corresponde a ${p}` });
    }
    if (v === '') {
        out.push({ regla: 'valor', detalle: `${p} sin valor` });
    } else if (!valorValido(def.valor, v, esc, familias)) {
        if (!out.length) out.push({ regla: 'valor', detalle: `${v} no es un valor válido (${def.valor.t}) para ${p}` });
    }
    return out;
}

export function validarComponente(nombre: string, raices: readonly string[] = COMPONENTES): Violacion[] {
    const out: Violacion[] = [];
    if (!/^ts-[A-Za-z0-9-]+$/.test(nombre)) out.push({ regla: 'ascii', detalle: 'caracteres fuera de [A-Za-z0-9-]' });
    const resto = nombre.replace(/^ts-/, '');
    if (/-negative$/.test(resto)) out.push({ regla: 'negative', detalle: 'sufijo -negative' });
    if (/-important$/.test(resto)) out.push({ regla: 'important', detalle: 'sufijo -important' });
    if (!raizComponente(resto, raices) && !CONTEXTOS.includes(resto) && !MARCADORES.includes(resto)) out.push({ regla: 'prefijo', detalle: 'raíz fuera de la lista de componentes' });
    return out;
}

export function duplicados(nombres: readonly string[]): { nombre: string; veces: number }[] {
    const c = new Map<string, number>();
    for (const n of nombres) c.set(n, (c.get(n) ?? 0) + 1);
    return [...c].filter(([, v]) => v > 1).map(([nombre, veces]) => ({ nombre, veces }));
}

export const MODIFICADORES = {
    prefijos: [
        'is', 'has', 'variant', 'size', 'side', 'shape', 'orientation', 'resize', 'placement', 'density', 'collapsible',
        'padding', 'align', 'position', 'status', 'fill', 'contrast', 'tone', 'hide', 'direction', 'level', 'aspect', 'icon',
    ],
    palabras: ['auto-resize', 'responsive-sheet', 'vertical'],
} as const;

export const CLASES_DE_TEMA = ['dark'] as const;

export const esModificador = (c: string) =>
    (MODIFICADORES.palabras as readonly string[]).includes(c) || MODIFICADORES.prefijos.some((p) => c.startsWith(p + '-'));

export function cortosIgualesAModificadores(vigentes: Iterable<string>, componentsCss: string): string[] {
    const usados = new Set<string>();
    for (const m of componentsCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
        if (!m[1].startsWith('ts-') && esModificador(m[1])) usados.add(m[1]);
    }
    return [...new Set([...vigentes].map((n) => n.replace(/^ts-/, '')))].filter((c) => usados.has(c)).sort();
}

export interface ModificadorSuelto {
    selector: string;
    utility: string;
    linea: number;
    motivo: 'suelto' | 'desconocido';
}

function compuestos(selector: string): string[][] {
    const alts: string[][] = [[]];
    let depth = 0;
    let cur = '';
    const cerrar = () => { if (cur.trim()) alts[alts.length - 1].push(cur.trim()); cur = ''; };
    for (const ch of selector) {
        if (ch === '(' || ch === '[') depth++;
        if (ch === ')' || ch === ']') depth--;
        if (depth === 0 && ch === ',') { cerrar(); alts.push([]); } else if (depth === 0 && /[\s>+~]/.test(ch)) cerrar();
        else cur += ch;
    }
    cerrar();
    return alts;
}

function sinNot(s: string): string {
    for (let i = s.indexOf(':not('); i !== -1; i = s.indexOf(':not(')) {
        let depth = 0;
        let j = i + 4;
        for (; j < s.length; j++) {
            if (s[j] === '(') depth++;
            if (s[j] === ')' && --depth === 0) break;
        }
        s = s.slice(0, i) + s.slice(j + 1);
    }
    return s;
}

export function modificadoresSueltos(css: string, componentes: readonly string[] = COMPONENTES): ModificadorSuelto[] {
    const limpio = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    const raices = componentes.map((r) => r.replace(/-/g, '\\-')).join('|');
    const base = new RegExp(`&|\\.ts-|\\[data-(?:${raices})(?:[-\\]=~|^$*])`);
    const out: ModificadorSuelto[] = [];
    for (const m of limpio.matchAll(/(^|[;{}])\s*([^;{}@]+?)\s*\{/g)) {
        const selector = m[2].trim();
        const pos = m.index! + m[0].indexOf(m[2]);
        const linea = limpio.slice(0, pos).split('\n').length;
        const utility = [...limpio.slice(0, pos).matchAll(/^@utility (\S+)/gm)].pop()?.[1] ?? '(fuera de un @utility)';
        for (const alt of compuestos(selector)) {
            for (const comp of alt) {
                for (const t of comp.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
                    const c = t[1];
                    if (c.startsWith('ts-') || (CLASES_DE_TEMA as readonly string[]).includes(c)) continue;
                    if (!esModificador(c)) out.push({ selector: selector.replace(/\s+/g, ' '), utility, linea, motivo: 'desconocido' });
                }
                const sinN = sinNot(comp);
                const mods = [...sinN.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((t) => t[1]).filter(esModificador);
                if (mods.length && !base.test(sinN)) out.push({ selector: selector.replace(/\s+/g, ' '), utility, linea, motivo: 'suelto' });
            }
        }
    }
    return out;
}

/** Los modificadores que escribe el CSS de los componentes (`icon-16`, `size-md`…), sin los de estado (`is-*`, `has-*`). */
export function modificadoresDeComponentes(components: string): Set<string> {
    const modificadores = new Set<string>();
    for (const m of components.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
        if (!m[1].startsWith('ts-') && esModificador(m[1]) && !/^(is|has)-/.test(m[1])) modificadores.add(m[1]);
    }
    return modificadores;
}
