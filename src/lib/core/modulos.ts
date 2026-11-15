// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface FichaModulo {
    pesado: boolean;
    slugs?: readonly string[];
    slugsSafelist?: readonly string[];
    ganchos?: readonly string[];
    raices?: readonly string[];
    funciones?: Readonly<Record<string, string>>;
    requiere?: readonly string[];
}

export const MODULOS = {
    accordion: { pesado: false, slugs: ['accordion', 'collapsible'], ganchos: ['data-ts-accordion'] },
    alertDialog: { pesado: false, slugs: ['alert-dialog'], ganchos: ['data-ts-confirm'] },
    avatar: { pesado: false, slugs: ['avatar'], ganchos: ['data-ts-avatar'] },
    button: { pesado: false, slugs: ['button'], funciones: { setButtonLoading: 'cargando' } },
    campo: { pesado: false, slugs: ['input', 'textarea', 'field'], ganchos: ['data-ts-input', 'data-ts-textarea', 'data-ts-debounce', 'data-ts-field-spinner'], funciones: { setInputLoading: 'cargando', setTextareaLoading: 'cargando' } },
    clear: { pesado: false, ganchos: ['data-ts-clear'] },
    clipboard: { pesado: false, ganchos: ['data-ts-copy', 'data-ts-copied'] },
    commandPalette: { pesado: true, slugs: ['command-palette'], ganchos: ['data-ts-command', 'data-ts-empty-for', 'data-ts-keywords', 'data-ts-shortcut'], raices: ['data-ts-command-palette', 'data-ts-command-open'], requiere: ['listbox'] },
    datePicker: {
        pesado: true,
        slugs: ['date-picker'],
        ganchos: ['data-ts-date', 'data-ts-day-marks', 'data-ts-disabled-dates', 'data-ts-disabled-weekdays', 'data-ts-granularity', 'data-ts-hour-cycle', 'data-ts-visible-months', 'data-ts-week', 'data-ts-end-text'],
        raices: ['data-ts-date-picker'],
        funciones: { setDatePickerLoading: 'cargando', setDatePickerDisabledDate: 'deshabilitar' },
        requiere: ['overlays'],
    },
    dismiss: { pesado: false, slugs: ['tag'], ganchos: ['data-ts-dismiss'] },
    fileUpload: { pesado: true, slugs: ['file-upload'], ganchos: ['data-ts-file', 'data-ts-max-size'], raices: ['data-ts-file-upload'] },
    invokers: { pesado: false, slugs: ['modal', 'drawer', 'alert-dialog'], ganchos: ['commandfor', 'closedby'] },
    invalid: { pesado: true, slugsSafelist: ['field'], funciones: { markInvalid: 'markInvalid', clearInvalid: 'clearInvalid' } },
    listbox: { pesado: true },
    medidas: { pesado: false, slugs: ['aspect-ratio', 'scroll-area'], ganchos: ['data-ts-ratio', 'data-ts-max-height', 'data-ts-max-width'] },
    menu: { pesado: false, slugs: ['menu', 'context-menu'], ganchos: ['data-ts-menu', 'data-ts-context-menu'] },
    numberInput: { pesado: true, slugs: ['number-input'], ganchos: ['data-ts-number', 'data-ts-allow-wheel', 'data-ts-large-step'], raices: ['data-ts-number'], funciones: { setNumberInputLoading: 'cargando' } },
    opcion: { pesado: false, slugs: ['checkbox', 'radio', 'toggle'], ganchos: ['data-ts-checkbox-group', 'data-ts-select-all'] },
    overlays: { pesado: false, slugs: ['popover', 'tooltip'], ganchos: ['data-ts-tooltip', 'data-ts-placement', 'data-ts-autofocus'] },
    pagination: { pesado: true, slugs: ['pagination', 'pager'], ganchos: ['data-ts-pagination', 'data-ts-page', 'data-ts-total', 'data-ts-items', 'data-ts-siblings', 'data-ts-boundaries', 'data-ts-label'], raices: ['data-ts-pagination'] },
    progress: { pesado: false, slugs: ['progress'], ganchos: ['data-progress-fill'] },
    scrollspy: { pesado: false, slugs: ['toc'], ganchos: ['data-ts-scrollspy', 'data-ts-offset'] },
    segmented: { pesado: false, slugs: ['segmented-control'], ganchos: ['data-ts-segmented'] },
    select: {
        pesado: true,
        slugs: ['select', 'combobox'],
        ganchos: ['data-ts-select', 'data-ts-combobox', 'data-ts-listbox', 'data-ts-async', 'data-ts-allow-custom', 'data-ts-required-proxy', 'data-ts-count-suffix', 'data-ts-listbox-native'],
        raices: ['data-ts-listbox', 'data-ts-combobox'],
        funciones: { setComboboxLoading: 'cargando', setSelectLoading: 'cargando' },
        requiere: ['listbox'],
    },
    sidebar: { pesado: false, slugs: ['sidebar'], ganchos: ['data-ts-sidebar', 'data-ts-breakpoint', 'data-ts-persist-key'] },
    slider: { pesado: true, slugs: ['slider'], ganchos: ['data-ts-slider'], raices: ['data-ts-slider'] },
    spotlight: { pesado: false, ganchos: ['data-ts-spotlight'] },
    table: { pesado: true, slugs: ['table'], ganchos: ['data-ts-table', 'data-ts-cell', 'data-ts-key', 'data-ts-row', 'data-ts-th', 'data-ts-sort'], raices: ['data-ts-table'] },
    tabs: { pesado: false, slugs: ['tabs'], ganchos: ['data-ts-tabs'] },
    toast: { pesado: false, slugs: ['toast'], ganchos: ['data-ts-toast'], funciones: { toast: 'toast', updateToast: 'updateToast', clearToasts: 'clearToasts' } },
    toggle: { pesado: false, slugs: ['nav-bar', 'breadcrumbs'], ganchos: ['data-ts-toggle'] },
} as const satisfies Record<string, FichaModulo>;

export type NombreModulo = keyof typeof MODULOS;

export const GANCHOS_GENERICOS: readonly string[] = [
    'data-ts-value',
    'data-ts-multiple',
    'data-ts-placeholder',
    'data-ts-locale',
    'data-ts-name',
    'data-ts-month',
    'data-ts-range',
    'data-ts-dismissible',
];

const nombres = Object.keys(MODULOS) as NombreModulo[];

export const archivoDe = (n: NombreModulo): string => n.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const ficha = (n: NombreModulo): FichaModulo => MODULOS[n];

const coincide = (token: string, g: string): boolean => token === g || token.startsWith(`${g}-`);

export function modulosDeGancho(atributo: string): NombreModulo[] {
    return nombres.filter((n) => ficha(n).ganchos?.some((g) => coincide(atributo, g)));
}

export function conRequeridos(base: Iterable<NombreModulo>): NombreModulo[] {
    const todos = new Set(base);
    for (const n of todos) for (const r of ficha(n).requiere ?? []) todos.add(r as NombreModulo);
    return nombres.filter((n) => todos.has(n));
}

export function modulosDeArchivo(tokens: readonly string[], slugs: readonly string[], texto: string): NombreModulo[] {
    const elegidos = new Set<NombreModulo>(modulosDeSlugs(slugs));
    for (const t of tokens) if (t.startsWith('data-ts-')) for (const n of modulosDeGancho(t)) elegidos.add(n);
    for (const n of nombres) {
        const f = ficha(n);
        if (f.funciones && Object.keys(f.funciones).some((fn) => llamada(texto, fn))) elegidos.add(n);
        if (f.ganchos?.some((g) => !g.startsWith('data-ts-') && texto.includes(g))) elegidos.add(n);
    }
    return [...elegidos];
}

export function modulosDeSlugs(slugs: Iterable<string>, deSafelist = false): NombreModulo[] {
    const dados = new Set(slugs);
    return nombres.filter((n) => ficha(n).slugs?.some((s) => dados.has(s)) || (deSafelist && ficha(n).slugsSafelist?.some((s) => dados.has(s))));
}

function llamada(texto: string, fn: string): boolean {
    return new RegExp(`(?<![\\w$.-])${fn}(?![\\w$-])\\s*(?:\\(|\\.|,|\\}|as\\s)|\\.${fn}(?![\\w$-])|['"\`]${fn}['"\`]`).test(texto);
}

export const PESADOS: readonly { modulo: NombreModulo; raices: readonly string[] }[] = nombres
    .filter((n) => ficha(n).pesado && ficha(n).raices)
    .map((n) => ({ modulo: n, raices: ficha(n).raices! }));
