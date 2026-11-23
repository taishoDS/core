// ARCHIVO AUTO-GENERADO — NO editar a mano.
//
// Qué atributos `data-ts-*` usa cada componente en el Core. Es la INTERSECCIÓN
// entre lo que emite el artefacto y lo que el Core consulta: un atributo que el
// componente escribe para su uso interno no es contrato y no aparece acá.

export interface ContratoCore {
    /** Los ganchos `data-ts-*` que el Core mira en este componente. Vacío NO quiere decir «sin JS»: eso lo dice `js`. */
    atributos: string[];
    /**
     * Si el componente usa el JS del Core: `none` = nada; `native` = lo hace el navegador y el Core lo completa donde
     * el navegador no llega; `core` = lo necesita. Sale del tier de `core-status.ts`.
     */
    js: 'none' | 'native' | 'core';
    /** Tamaño del markup emitido, sin los SVG. Para decir "son N bytes" sin estimar. */
    bytes: number;
    /**
     * Lo que el JS del Core necesita de la estructura, para que `check` y `validate_markup` avisen cuando falta. Lo declarado y
     * verificado sale de `core-status.ts`; `clase` y `en` salen de los ejemplos. `raiz`: el gancho con que el Core
     * encuentra el componente; `clase`: la clase con que se escribe la raíz (falta si ningún ejemplo la lleva); `piezas`: los
     * ganchos que tienen que existir adentro de la raíz, `clase` la que identifica a una pieza opcional (se avisa si el elemento con esa clase no trae el atributo) y `en` la etiqueta donde van, si es la misma en todos los ejemplos.
     */
    estructura?: { raiz: string; clase?: string; fuera?: string[]; piezas: { atributo: string; clase?: string; en?: string; o?: string[]; si?: string }[] };
}

export const contratoCore: Record<string, ContratoCore> = {
    'accordion': { atributos: ['data-ts-accordion', 'data-ts-accordion-item', 'data-ts-accordion-trigger', 'data-ts-value'], js: 'core', bytes: 1012, estructura: { raiz: 'data-ts-accordion', clase: 'accordion', piezas: [{ atributo: 'data-ts-accordion-item', en: 'details' }, { atributo: 'data-ts-accordion-trigger', en: 'summary' }] } },
    'alert-dialog': { atributos: ['data-ts-confirm', 'data-ts-confirm-input', 'data-ts-confirm-text', 'data-ts-field-spinner', 'data-ts-input'], js: 'core', bytes: 4157 },
    'aspect-ratio': { atributos: ['data-ts-ratio'], js: 'core', bytes: 250 },
    'avatar': { atributos: ['data-ts-avatar', 'data-ts-name'], js: 'core', bytes: 1437 },
    'badge': { atributos: [], js: 'none', bytes: 398 },
    'banner': { atributos: ['data-ts-dismiss', 'data-ts-dismissible'], js: 'core', bytes: 560 },
    'breadcrumbs': { atributos: ['data-ts-toggle', 'data-ts-toggle-hide', 'data-ts-toggle-target'], js: 'core', bytes: 1590 },
    'button': { atributos: [], js: 'none', bytes: 916 },
    'card': { atributos: ['data-ts-spotlight'], js: 'core', bytes: 288 },
    'checkbox': { atributos: [], js: 'core', bytes: 4864 },
    'code': { atributos: ['data-ts-copied-icon', 'data-ts-copied-label', 'data-ts-copy', 'data-ts-copy-status', 'data-ts-tabs', 'data-ts-tabs-panel', 'data-ts-tabs-tab', 'data-ts-value'], js: 'core', bytes: 2370 },
    'collapsible': { atributos: ['data-ts-accordion', 'data-ts-accordion-item', 'data-ts-accordion-trigger', 'data-ts-value'], js: 'core', bytes: 544, estructura: { raiz: 'data-ts-accordion', clase: 'collapsible', piezas: [{ atributo: 'data-ts-accordion-item', en: 'details' }, { atributo: 'data-ts-accordion-trigger', en: 'summary' }] } },
    'combobox': { atributos: ['data-ts-async', 'data-ts-clear', 'data-ts-combobox', 'data-ts-dismiss', 'data-ts-dismissible', 'data-ts-listbox', 'data-ts-listbox-empty', 'data-ts-listbox-input', 'data-ts-listbox-live', 'data-ts-listbox-loading', 'data-ts-listbox-panel', 'data-ts-listbox-spinner', 'data-ts-listbox-tag-template', 'data-ts-listbox-tags', 'data-ts-listbox-template', 'data-ts-listbox-toggle', 'data-ts-listbox-value', 'data-ts-multiple', 'data-ts-placeholder', 'data-ts-value'], js: 'core', bytes: 26264, estructura: { raiz: 'data-ts-combobox', clase: 'combobox', piezas: [{ atributo: 'data-ts-listbox-input', en: 'input' }, { atributo: 'data-ts-listbox-panel', en: 'div' }] } },
    'command-palette': { atributos: ['data-ts-command-dialog', 'data-ts-command-open', 'data-ts-command-palette', 'data-ts-empty-for', 'data-ts-field-spinner', 'data-ts-input', 'data-ts-keywords', 'data-ts-listbox', 'data-ts-listbox-empty', 'data-ts-listbox-input', 'data-ts-listbox-panel', 'data-ts-shortcut', 'data-ts-value'], js: 'core', bytes: 2929, estructura: { raiz: 'data-ts-command-palette', piezas: [{ atributo: 'data-ts-command-dialog', en: 'dialog' }, { atributo: 'data-ts-listbox-input', en: 'input' }, { atributo: 'data-ts-listbox-panel', en: 'div' }] } },
    'container': { atributos: [], js: 'none', bytes: 193 },
    'context-menu': { atributos: ['data-ts-context-menu', 'data-ts-menu', 'data-ts-menu-panel', 'data-ts-value'], js: 'core', bytes: 464, estructura: { raiz: 'data-ts-context-menu', piezas: [{ atributo: 'data-ts-menu-panel', en: 'div' }] } },
    'date-picker': { atributos: ['data-ts-clear', 'data-ts-count-suffix', 'data-ts-date-caption', 'data-ts-date-grid', 'data-ts-date-input', 'data-ts-date-months', 'data-ts-date-next', 'data-ts-date-picker', 'data-ts-date-preset', 'data-ts-date-prev', 'data-ts-date-spinner', 'data-ts-date-status', 'data-ts-date-text', 'data-ts-date-time', 'data-ts-date-title', 'data-ts-date-weekdays', 'data-ts-day-marks', 'data-ts-disabled-dates', 'data-ts-disabled-weekdays', 'data-ts-end-text', 'data-ts-granularity', 'data-ts-hour-cycle', 'data-ts-listbox', 'data-ts-listbox-label', 'data-ts-listbox-loading', 'data-ts-listbox-native', 'data-ts-listbox-panel', 'data-ts-listbox-spinner', 'data-ts-listbox-trigger', 'data-ts-locale', 'data-ts-month', 'data-ts-number', 'data-ts-number-field', 'data-ts-number-format', 'data-ts-number-raw', 'data-ts-number-spinner', 'data-ts-number-step', 'data-ts-placeholder', 'data-ts-range', 'data-ts-required-proxy', 'data-ts-value', 'data-ts-visible-months', 'data-ts-week-column', 'data-ts-week-numbers', 'data-ts-week-short'], js: 'core', bytes: 99028, estructura: { raiz: 'data-ts-date-picker', clase: 'calendar', piezas: [{ atributo: 'data-ts-date-grid', en: 'div', o: ['data-ts-date-months'] }] } },
    'drawer': { atributos: [], js: 'native', bytes: 1456 },
    'empty-state': { atributos: [], js: 'none', bytes: 505 },
    'field': { atributos: ['data-ts-field-spinner', 'data-ts-input'], js: 'core', bytes: 849 },
    'file-upload': { atributos: ['data-ts-file-error-icon', 'data-ts-file-error-size', 'data-ts-file-input', 'data-ts-file-list', 'data-ts-file-template', 'data-ts-file-trigger', 'data-ts-file-upload', 'data-ts-max-size'], js: 'core', bytes: 1439, estructura: { raiz: 'data-ts-file-upload', clase: 'file-upload', piezas: [{ atributo: 'data-ts-file-input', en: 'input' }] } },
    'grid': { atributos: [], js: 'none', bytes: 331 },
    'icon': { atributos: [], js: 'none', bytes: 80 },
    'inline-code': { atributos: [], js: 'none', bytes: 115 },
    'input': { atributos: ['data-ts-clear', 'data-ts-debounce', 'data-ts-field-spinner', 'data-ts-input'], js: 'core', bytes: 4771 },
    'kbd': { atributos: [], js: 'none', bytes: 156 },
    'link': { atributos: [], js: 'none', bytes: 614 },
    'loading-dots': { atributos: [], js: 'none', bytes: 165 },
    'menu': { atributos: ['data-ts-menu', 'data-ts-menu-panel', 'data-ts-menu-trigger', 'data-ts-value'], js: 'core', bytes: 804, estructura: { raiz: 'data-ts-menu', clase: 'menu-root', piezas: [{ atributo: 'data-ts-menu-panel', en: 'div' }] } },
    'modal': { atributos: [], js: 'native', bytes: 3752 },
    'nav-bar': { atributos: ['data-ts-toggle', 'data-ts-toggle-escape', 'data-ts-toggle-outside', 'data-ts-toggle-root', 'data-ts-toggle-target'], js: 'core', bytes: 1101 },
    'note': { atributos: ['data-ts-dismiss', 'data-ts-dismissible'], js: 'core', bytes: 1135 },
    'number-input': { atributos: ['data-ts-allow-wheel', 'data-ts-clear', 'data-ts-large-step', 'data-ts-locale', 'data-ts-number', 'data-ts-number-field', 'data-ts-number-format', 'data-ts-number-raw', 'data-ts-number-spinner', 'data-ts-number-step'], js: 'core', bytes: 16547, estructura: { raiz: 'data-ts-number', clase: 'number-input', piezas: [{ atributo: 'data-ts-number-field', en: 'input' }, { atributo: 'data-ts-number-step', clase: 'number-input-step', en: 'button' }] } },
    'pager': { atributos: [], js: 'none', bytes: 492 },
    'pagination': { atributos: ['data-ts-items', 'data-ts-label-empty', 'data-ts-label-template', 'data-ts-page', 'data-ts-page-ellipsis', 'data-ts-page-item', 'data-ts-page-next', 'data-ts-page-prev', 'data-ts-page-size', 'data-ts-pagination', 'data-ts-pagination-list', 'data-ts-total', 'data-ts-value'], js: 'core', bytes: 1878, estructura: { raiz: 'data-ts-pagination', clase: 'pagination', piezas: [{ atributo: 'data-ts-pagination-list', en: 'div' }, { atributo: 'data-ts-page-item', en: 'button' }] } },
    'popover': { atributos: [], js: 'core', bytes: 451 },
    'progress': { atributos: ['data-ts-value'], js: 'core', bytes: 1626 },
    'radio': { atributos: [], js: 'core', bytes: 5659 },
    'scroll-area': { atributos: ['data-ts-max-height'], js: 'core', bytes: 640 },
    'segmented-control': { atributos: ['data-ts-segmented', 'data-ts-segmented-option', 'data-ts-value'], js: 'core', bytes: 1021, estructura: { raiz: 'data-ts-segmented', clase: 'segmented-control', piezas: [{ atributo: 'data-ts-segmented-option', en: 'button' }] } },
    'select': { atributos: ['data-ts-clear', 'data-ts-count-suffix', 'data-ts-listbox', 'data-ts-listbox-label', 'data-ts-listbox-loading', 'data-ts-listbox-native', 'data-ts-listbox-panel', 'data-ts-listbox-spinner', 'data-ts-listbox-template', 'data-ts-listbox-trigger', 'data-ts-listbox-value', 'data-ts-multiple', 'data-ts-placeholder', 'data-ts-required-proxy', 'data-ts-value'], js: 'core', bytes: 23171, estructura: { raiz: 'data-ts-listbox', clase: 'select', fuera: ['data-ts-combobox', 'data-ts-listbox="command"'], piezas: [{ atributo: 'data-ts-listbox-panel', en: 'div' }, { atributo: 'data-ts-listbox-trigger', en: 'button' }] } },
    'separator': { atributos: [], js: 'none', bytes: 446 },
    'sidebar': { atributos: ['data-ts-breakpoint', 'data-ts-persist-key', 'data-ts-sidebar', 'data-ts-sidebar-collapsible', 'data-ts-sidebar-drawer', 'data-ts-sidebar-group', 'data-ts-sidebar-group-items', 'data-ts-sidebar-group-toggle', 'data-ts-sidebar-id', 'data-ts-sidebar-item', 'data-ts-sidebar-toggle', 'data-ts-sidebar-trigger'], js: 'core', bytes: 5195 },
    'skeleton': { atributos: [], js: 'none', bytes: 263 },
    'slider': { atributos: ['data-ts-slider', 'data-ts-slider-format', 'data-ts-slider-rail', 'data-ts-slider-range', 'data-ts-slider-value', 'data-ts-slider-values', 'data-ts-slider-valuetexts'], js: 'core', bytes: 4336, estructura: { raiz: 'data-ts-slider', clase: 'slider', piezas: [{ atributo: 'data-ts-slider-rail', en: 'div', si: 'data-ts-slider-range' }] } },
    'spinner': { atributos: [], js: 'none', bytes: 282 },
    'stack': { atributos: [], js: 'none', bytes: 271 },
    'table': { atributos: ['data-ts-cell', 'data-ts-key', 'data-ts-row', 'data-ts-sort-value', 'data-ts-table', 'data-ts-table-body', 'data-ts-th'], js: 'core', bytes: 3765 },
    'tabs': { atributos: ['data-ts-tabs', 'data-ts-tabs-panel', 'data-ts-tabs-tab', 'data-ts-value'], js: 'core', bytes: 1486, estructura: { raiz: 'data-ts-tabs', piezas: [{ atributo: 'data-ts-tabs-tab', en: 'button' }] } },
    'tag': { atributos: ['data-ts-dismiss', 'data-ts-dismissible'], js: 'core', bytes: 1028 },
    'textarea': { atributos: ['data-ts-clear', 'data-ts-debounce', 'data-ts-field-spinner', 'data-ts-textarea'], js: 'core', bytes: 3061 },
    'toast': { atributos: ['data-ts-toast-container', 'data-ts-toast-dismiss-label', 'data-ts-toast-icon', 'data-ts-toast-region', 'data-ts-toast-trigger', 'data-ts-toast-variant'], js: 'core', bytes: 1136 },
    'toc': { atributos: ['data-ts-offset', 'data-ts-scrollspy', 'data-ts-scrollspy-link'], js: 'core', bytes: 1049 },
    'toggle': { atributos: [], js: 'core', bytes: 1412 },
    'tooltip': { atributos: ['data-ts-placement', 'data-ts-tooltip', 'data-ts-tooltip-root'], js: 'core', bytes: 437, estructura: { raiz: 'data-ts-tooltip-root', clase: 'tooltip-root', piezas: [{ atributo: 'data-ts-tooltip', en: 'span' }] } },
    'visually-hidden': { atributos: [], js: 'none', bytes: 122 },
};
