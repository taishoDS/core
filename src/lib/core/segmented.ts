// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { P, avisar, contenedor, partes } from './dom';
import { nextIndex } from './roving';

function habilitados(raiz: HTMLElement): HTMLElement[] {
    return partes(raiz, 'segmented', 'option').filter((o) => !o.hasAttribute('disabled'));
}

function seleccionar(raiz: HTMLElement, valor: string): void {
    if (!avisar(raiz, { component: 'segmented', value: valor })) return;
    for (const op of partes(raiz, 'segmented', 'option')) {
        const activa = op.getAttribute(`${P}value`) === valor;
        op.setAttribute('aria-checked', String(activa));
        op.tabIndex = activa ? 0 : -1;
        op.classList.toggle('is-selected', activa);
        op.classList.toggle('variant-secondary', activa);
        op.classList.toggle('variant-tertiary', !activa);
    }
}

export function alHacerClick(destino: Element): boolean {
    const op = destino.closest<HTMLElement>(`[${P}segmented-option]`);
    if (!op || op.hasAttribute('disabled')) return false;
    const raiz = contenedor(op, 'segmented');
    const valor = op.getAttribute(`${P}value`);
    if (!raiz || valor === null) return false;
    seleccionar(raiz, valor);
    return true;
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    const op = destino.closest<HTMLElement>(`[${P}segmented-option]`);
    if (!op) return false;
    const raiz = contenedor(op, 'segmented');
    if (!raiz) return false;

    const opciones = habilitados(raiz);
    const idx = opciones.indexOf(op);
    const rtl = getComputedStyle(raiz).direction === 'rtl';
    const destinoIdx = nextIndex(tecla, idx, opciones.length, { rtl });
    if (destinoIdx === null || idx < 0) return false;

    const siguiente = opciones[destinoIdx];
    siguiente.focus();
    const valor = siguiente.getAttribute(`${P}value`);
    if (valor !== null) seleccionar(raiz, valor);
    return true;
}

export const ficha = {
    alHacerClick,
    alPresionarTecla,
};
