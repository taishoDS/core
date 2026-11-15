// ARCHIVO AUTO-GENERADO — NO editar a mano.
//
// Qué atributos `data-ts-*` usa cada componente en el Core. Es la INTERSECCIÓN
// entre lo que emite el artefacto y lo que el Core consulta: un atributo que el
// componente escribe para su uso interno no es contrato y no aparece acá.

export interface ContratoCore {
    /** Los ganchos que el Core mira en este componente. Vacío = no necesita JS. */
    atributos: string[];
    /** Tamaño del markup emitido, sin los SVG. Para decir "son N bytes" sin estimar. */
    bytes: number;
}

export const contratoCore: Record<string, ContratoCore> = {
    'accordion': { atributos: ['data-ts-accordion', 'data-ts-accordion-item', 'data-ts-accordion-trigger', 'data-ts-value'], bytes: 1012 },
    'alert-dialog': { atributos: ['data-ts-confirm', 'data-ts-confirm-input', 'data-ts-confirm-text', 'data-ts-field-spinner', 'data-ts-input'], bytes: 4157 },
    'aspect-ratio': { atributos: ['data-ts-ratio'], bytes: 250 },
    'avatar': { atributos: ['data-ts-avatar', 'data-ts-name'], bytes: 1437 },
    'badge': { atributos: [], bytes: 398 },
    'banner': { atributos: ['data-ts-dismiss', 'data-ts-dismissible'], bytes: 560 },
    'breadcrumbs': { atributos: ['data-ts-toggle', 'data-ts-toggle-hide', 'data-ts-toggle-target'], bytes: 1590 },
    'button': { atributos: [], bytes: 916 },
    'card': { atributos: ['data-ts-spotlight'], bytes: 288 },
    'checkbox': { atributos: [], bytes: 4864 },
    'code': { atributos: ['data-ts-copied-icon', 'data-ts-copied-label', 'data-ts-copy', 'data-ts-tabs', 'data-ts-tabs-panel', 'data-ts-tabs-tab', 'data-ts-value'], bytes: 2192 },
    'collapsible': { atributos: ['data-ts-accordion', 'data-ts-accordion-item', 'data-ts-accordion-trigger', 'data-ts-value'], bytes: 544 },
    'combobox': { atributos: ['data-ts-async', 'data-ts-clear', 'data-ts-combobox', 'data-ts-dismiss', 'data-ts-dismissible', 'data-ts-listbox', 'data-ts-listbox-empty', 'data-ts-listbox-input', 'data-ts-listbox-live', 'data-ts-listbox-loading', 'data-ts-listbox-panel', 'data-ts-listbox-spinner', 'data-ts-listbox-tag-template', 'data-ts-listbox-tags', 'data-ts-listbox-template', 'data-ts-listbox-toggle', 'data-ts-listbox-value', 'data-ts-multiple', 'data-ts-placeholder', 'data-ts-value'], bytes: 26264 },
    'command-palette': { atributos: ['data-ts-command-dialog', 'data-ts-command-open', 'data-ts-command-palette', 'data-ts-empty-for', 'data-ts-field-spinner', 'data-ts-input', 'data-ts-keywords', 'data-ts-listbox', 'data-ts-listbox-empty', 'data-ts-listbox-input', 'data-ts-listbox-panel', 'data-ts-shortcut', 'data-ts-value'], bytes: 2929 },
    'container': { atributos: [], bytes: 193 },
    'context-menu': { atributos: ['data-ts-context-menu', 'data-ts-menu', 'data-ts-menu-panel', 'data-ts-value'], bytes: 464 },
    'date-picker': { atributos: ['data-ts-clear', 'data-ts-count-suffix', 'data-ts-date-caption', 'data-ts-date-grid', 'data-ts-date-input', 'data-ts-date-months', 'data-ts-date-next', 'data-ts-date-picker', 'data-ts-date-preset', 'data-ts-date-prev', 'data-ts-date-spinner', 'data-ts-date-status', 'data-ts-date-text', 'data-ts-date-time', 'data-ts-date-title', 'data-ts-date-weekdays', 'data-ts-day-marks', 'data-ts-disabled-dates', 'data-ts-disabled-weekdays', 'data-ts-end-text', 'data-ts-granularity', 'data-ts-hour-cycle', 'data-ts-listbox', 'data-ts-listbox-label', 'data-ts-listbox-loading', 'data-ts-listbox-native', 'data-ts-listbox-panel', 'data-ts-listbox-spinner', 'data-ts-listbox-trigger', 'data-ts-locale', 'data-ts-month', 'data-ts-number', 'data-ts-number-field', 'data-ts-number-format', 'data-ts-number-raw', 'data-ts-number-spinner', 'data-ts-number-step', 'data-ts-placeholder', 'data-ts-range', 'data-ts-required-proxy', 'data-ts-value', 'data-ts-visible-months', 'data-ts-week-column', 'data-ts-week-numbers', 'data-ts-week-short'], bytes: 98956 },
    'drawer': { atributos: [], bytes: 1456 },
    'empty-state': { atributos: [], bytes: 505 },
    'field': { atributos: ['data-ts-field-spinner', 'data-ts-input'], bytes: 849 },
    'file-upload': { atributos: ['data-ts-file-error-icon', 'data-ts-file-error-size', 'data-ts-file-input', 'data-ts-file-list', 'data-ts-file-template', 'data-ts-file-trigger', 'data-ts-file-upload', 'data-ts-max-size'], bytes: 1439 },
    'grid': { atributos: [], bytes: 331 },
    'icon': { atributos: [], bytes: 80 },
    'inline-code': { atributos: [], bytes: 115 },
    'input': { atributos: ['data-ts-clear', 'data-ts-debounce', 'data-ts-field-spinner', 'data-ts-input'], bytes: 4771 },
    'kbd': { atributos: [], bytes: 156 },
    'link': { atributos: [], bytes: 298 },
    'loading-dots': { atributos: [], bytes: 165 },
    'menu': { atributos: ['data-ts-menu', 'data-ts-menu-panel', 'data-ts-menu-trigger', 'data-ts-value'], bytes: 804 },
    'modal': { atributos: [], bytes: 3752 },
    'nav-bar': { atributos: ['data-ts-toggle', 'data-ts-toggle-escape', 'data-ts-toggle-outside', 'data-ts-toggle-root', 'data-ts-toggle-target'], bytes: 1101 },
    'note': { atributos: ['data-ts-dismiss', 'data-ts-dismissible'], bytes: 1135 },
    'number-input': { atributos: ['data-ts-allow-wheel', 'data-ts-clear', 'data-ts-large-step', 'data-ts-locale', 'data-ts-number', 'data-ts-number-field', 'data-ts-number-format', 'data-ts-number-raw', 'data-ts-number-spinner', 'data-ts-number-step'], bytes: 16115 },
    'pager': { atributos: [], bytes: 492 },
    'pagination': { atributos: ['data-ts-items', 'data-ts-label-empty', 'data-ts-label-template', 'data-ts-page', 'data-ts-page-ellipsis', 'data-ts-page-item', 'data-ts-page-next', 'data-ts-page-prev', 'data-ts-page-size', 'data-ts-pagination', 'data-ts-pagination-list', 'data-ts-total', 'data-ts-value'], bytes: 1878 },
    'popover': { atributos: [], bytes: 451 },
    'progress': { atributos: ['data-ts-value'], bytes: 1626 },
    'radio': { atributos: [], bytes: 5123 },
    'scroll-area': { atributos: ['data-ts-max-height'], bytes: 640 },
    'segmented-control': { atributos: ['data-ts-segmented', 'data-ts-segmented-option', 'data-ts-value'], bytes: 1021 },
    'select': { atributos: ['data-ts-clear', 'data-ts-count-suffix', 'data-ts-listbox', 'data-ts-listbox-label', 'data-ts-listbox-loading', 'data-ts-listbox-native', 'data-ts-listbox-panel', 'data-ts-listbox-spinner', 'data-ts-listbox-template', 'data-ts-listbox-trigger', 'data-ts-listbox-value', 'data-ts-multiple', 'data-ts-placeholder', 'data-ts-required-proxy', 'data-ts-value'], bytes: 23171 },
    'separator': { atributos: [], bytes: 446 },
    'sidebar': { atributos: ['data-ts-breakpoint', 'data-ts-persist-key', 'data-ts-sidebar', 'data-ts-sidebar-collapsible', 'data-ts-sidebar-drawer', 'data-ts-sidebar-group', 'data-ts-sidebar-group-items', 'data-ts-sidebar-group-toggle', 'data-ts-sidebar-id', 'data-ts-sidebar-item', 'data-ts-sidebar-toggle', 'data-ts-sidebar-trigger'], bytes: 5195 },
    'skeleton': { atributos: [], bytes: 263 },
    'slider': { atributos: ['data-ts-slider', 'data-ts-slider-format', 'data-ts-slider-rail', 'data-ts-slider-range', 'data-ts-slider-value', 'data-ts-slider-values', 'data-ts-slider-valuetexts'], bytes: 4336 },
    'spinner': { atributos: [], bytes: 282 },
    'stack': { atributos: [], bytes: 271 },
    'table': { atributos: ['data-ts-cell', 'data-ts-key', 'data-ts-row', 'data-ts-sort-value', 'data-ts-table', 'data-ts-table-body', 'data-ts-th'], bytes: 3765 },
    'tabs': { atributos: ['data-ts-tabs', 'data-ts-tabs-panel', 'data-ts-tabs-tab', 'data-ts-value'], bytes: 1486 },
    'tag': { atributos: ['data-ts-dismiss', 'data-ts-dismissible'], bytes: 1028 },
    'textarea': { atributos: ['data-ts-clear', 'data-ts-debounce', 'data-ts-field-spinner', 'data-ts-textarea'], bytes: 3061 },
    'toast': { atributos: ['data-ts-toast-container', 'data-ts-toast-dismiss-label', 'data-ts-toast-icon', 'data-ts-toast-region', 'data-ts-toast-trigger', 'data-ts-toast-variant'], bytes: 1136 },
    'toc': { atributos: ['data-ts-offset', 'data-ts-scrollspy', 'data-ts-scrollspy-link'], bytes: 1049 },
    'toggle': { atributos: [], bytes: 1412 },
    'tooltip': { atributos: ['data-ts-placement', 'data-ts-tooltip', 'data-ts-tooltip-root'], bytes: 437 },
    'visually-hidden': { atributos: [], bytes: 122 },
};
