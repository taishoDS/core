// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
const SELECTOR = 'input.ts.checkbox-input, input.ts.radio-input, input.ts.toggle-input';
const ETIQUETA = '.ts.checkbox, .ts.radio, .ts.toggle';
const RADIO = 'input.ts.radio-input';

const sincronizar = (input: HTMLInputElement): void => {
    input.closest(ETIQUETA)?.classList.toggle('is-checked', input.checked);
    if (!input.indeterminate && input.hasAttribute('indeterminate')) {
        input.removeAttribute('indeterminate');
        input.closest(ETIQUETA)?.classList.remove('is-indeterminate');
    }
    if (input.getAttribute('role') === 'switch') input.setAttribute('aria-checked', String(input.checked));
};

const GRUPO = '[data-ts-checkbox-group]';
const MAESTRA = '[data-ts-select-all]';

function partesDelGrupo(grupo: Element): { maestra: HTMLInputElement | null; items: HTMLInputElement[] } {
    const maestra = grupo.querySelector<HTMLInputElement>(`${MAESTRA} input[type="checkbox"]`);
    const items = [...grupo.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].filter((i) => i !== maestra);
    return { maestra, items };
}

export function sincronizarGrupo(grupo: Element): void {
    const { maestra, items } = partesDelGrupo(grupo);
    if (!maestra) return;
    const marcados = items.filter((i) => i.checked).length;
    const todos = items.length > 0 && marcados === items.length;
    const mixto = marcados > 0 && !todos;
    maestra.checked = todos;
    maestra.indeterminate = mixto;
    const etiqueta = maestra.closest(ETIQUETA);
    etiqueta?.classList.toggle('is-checked', todos);
    etiqueta?.classList.toggle('is-indeterminate', mixto);
}

/** El `indeterminate=""` del marcado es una declaración: el navegador sólo lo lee como propiedad, así que se lleva a ella al preparar. */
export function sincronizarMixtas(raiz: ParentNode): void {
    for (const i of raiz.querySelectorAll<HTMLInputElement>('input.ts.checkbox-input[indeterminate]')) i.indeterminate = true;
}

export function alCambiar(destino: Element): void {
    const input = destino.closest<HTMLInputElement>(SELECTOR);
    if (!input) return;
    sincronizar(input);
    const grupo = input.closest(GRUPO);
    if (grupo) {
        const { maestra, items } = partesDelGrupo(grupo);
        if (input === maestra) {
            for (const i of items) {
                i.checked = input.checked;
                sincronizar(i);
            }
        }
        sincronizarGrupo(grupo);
    }
    if (input.type !== 'radio' || !input.name) return;
    const raiz = input.form ?? (input.getRootNode() as ParentNode);
    for (const otro of raiz.querySelectorAll<HTMLInputElement>(RADIO)) {
        if (otro !== input && otro.name === input.name && otro.form === input.form) sincronizar(otro);
    }
}

export const ficha = {
    alCambiar,
    sincronizarGrupo,
    sincronizarMixtas,
};
