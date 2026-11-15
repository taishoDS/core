// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).

/** Los textos que el JS del Core escribe en la página. Los que vienen en tu HTML no pasan por acá. */
export interface CoreTexts {
    /** Button: lo que el lector de pantalla oye mientras carga (`setButtonLoading`). */
    buttonLoading: string;
    /** Toast: nombre accesible del botón de cerrar. */
    closeNotification: string;
    /** Select y Combobox múltiples: lo que sigue al conteo («3 seleccionados»). */
    selectedCount: string;
    /** Pagination: plantilla del rótulo de rango, con `{from}`, `{to}` y `{total}`. */
    pageRangeTemplate: string;
    /** Pagination: rótulo cuando no hay ítems. */
    pageRangeEmpty: string;
    /** FileUpload: error de un archivo que supera el tamaño máximo; `max` ya viene formateado («1.0 MB»). */
    fileTooLarge: (max: string) => string;
    /** FileUpload: error de un archivo cuyo tipo no está permitido. */
    fileTypeNotAllowed: string;
}

export type TextosPorIdioma = Record<string, Partial<CoreTexts>>;

const CLAVE = Symbol.for('taisho.core.textos');
const almacen = (): TextosPorIdioma => ((globalThis as Record<symbol, TextosPorIdioma>)[CLAVE] ??= {});

/**
 * Permite cambiar textos del Core o sumar un idioma. El idioma se elige con su etiqueta (`'fr'`, `'pt-BR'`) y se pasan sólo los textos
 * que cambian: los demás siguen siendo los del Core en ese idioma, o los del inglés si el Core no lo trae.
 *
 * El Core elige el idioma con el `lang` más cercano al componente (o el del `<html>`). Con `lang="es-AR"` busca `es-ar`,
 * después `es` y por último `en`. Lo que se escribe en tu HTML (`data-ts-*`) gana sobre estos textos.
 * Se puede llamar antes o después de `init()`. Vale para lo que se muestre desde ese momento.
 *
 * @example
 * setTexts('fr', { closeNotification: 'Fermer la notification', selectedCount: 'sélectionnés' });
 * setTexts('es', { fileTypeNotAllowed: 'Ese formato no se puede subir' });
 */
export function setTexts(locale: string, texts: Partial<CoreTexts>): void {
    const clave = locale.trim().toLowerCase();
    const todos = almacen();
    todos[clave] = { ...todos[clave], ...texts };
}

export function idiomaDe(el: Element): string {
    return (el.closest('[lang]')?.getAttribute('lang') || el.ownerDocument.documentElement.lang || '').trim();
}

export function localeDe(el: Element): string {
    const idioma = idiomaDe(el);
    try {
        return Intl.getCanonicalLocales(idioma)[0] ?? 'en';
    } catch {
        return 'en';
    }
}

export function textoDe<K extends keyof CoreTexts>(el: Element, propios: TextosPorIdioma, clave: K): CoreTexts[K] {
    const idioma = idiomaDe(el).toLowerCase();
    const todos = almacen();
    for (const i of [idioma, idioma.split('-')[0], 'en']) {
        const valor = todos[i]?.[clave] ?? propios[i]?.[clave];
        if (valor !== undefined) return valor as CoreTexts[K];
    }
    return propios.en[clave] as CoreTexts[K];
}
