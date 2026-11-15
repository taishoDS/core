// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).

/**
 * Lista cerrada de marcas de estado: una regla de componente cuyo selector lleva alguna va a la capa `states`.
 * Es lo que decide qué es «reposo» (una utilidad lo pisa) y qué es «estado» (la utilidad no lo pisa).
 * Las marcas dentro de `:not()` no cuentan: `&:not(:disabled)` es reposo.
 */
const PSEUDOS = ['hover', 'active', 'focus-visible', 'focus-within', 'focus', 'disabled', 'checked', 'indeterminate', 'invalid', 'user-invalid', 'read-only', 'popover-open', 'modal', 'open'];
const ARIA = ['disabled', 'invalid', 'checked', 'selected', 'pressed', 'expanded', 'current', 'busy'];
const CLASES_IS = [
    'disabled', 'checked', 'indeterminate', 'open', 'active', 'selected', 'current', 'focused', 'readonly', 'invalid', 'error', 'loading', 'today',
    'in-range', 'range(?:-[a-z]+)?', 'dragging', 'over', 'moving', 'editing', 'committing', 'unsaved-[a-z]+', 'collapsed',
];

const MARCA_ESTADO = new RegExp(
    `:(?:${PSEUDOS.join('|')})(?![\\w-])|\\[open\\]|\\[aria-(?:${ARIA.join('|')})|\\.is-(?:${CLASES_IS.join('|')})(?![\\w-])`,
);

export const sinNot = (selector: string): string => {
    let out = '';
    for (let i = 0; i < selector.length; i++) {
        if (selector.startsWith(':not(', i)) {
            let prof = 0;
            for (; i < selector.length; i++) {
                if (selector[i] === '(') prof++;
                else if (selector[i] === ')' && --prof === 0) break;
            }
            continue;
        }
        out += selector[i];
    }
    return out;
};

export const tieneMarcaDeEstado = (selector: string): boolean => MARCA_ESTADO.test(sinNot(selector));

export type TipoDeEstado = 'hover' | 'active' | 'otro';

export const tipoDeEstado = (selector: string): TipoDeEstado => {
    const s = sinNot(selector);
    return /:hover(?![\w-])/.test(s) ? 'hover' : /:active(?![\w-])/.test(s) ? 'active' : 'otro';
};

const PERSISTENTE = new RegExp(
    `:(?:disabled|checked|indeterminate|invalid|user-invalid|popover-open|open)(?![\\w-])|\\[open\\]|\\[aria-(?:disabled|invalid|checked|selected|pressed|expanded|current)|\\.is-(?:disabled|checked|indeterminate|open|active|selected|current|invalid|error|collapsed)(?![\\w-])`,
);

/** El selector lleva un estado que dura (disabled, checked, selected, invalid, open…): ahí manda el estado, no el color que pidió el autor. */
export const esEstadoPersistente = (selector: string): boolean => PERSISTENTE.test(sinNot(selector));
