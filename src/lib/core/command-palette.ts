// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { commandKeyAction, filterItems } from './logica/command-palette';
import { P, avisar } from './dom';
import * as lb from './listbox';

const dialogoDe = (raiz: HTMLElement) => raiz.querySelector<HTMLDialogElement>(`[${P}command-dialog]`);

function filtrar(raiz: HTMLElement, query: string): void {
    const panel = lb.panelDe(raiz);
    if (!panel) return;
    const todas = [...panel.querySelectorAll<HTMLElement>('[role="option"]')];

    const visibles = new Set(
        filterItems(
            todas.map((o) => ({
                id: o.getAttribute(`${P}value`) ?? '',
                label: (o.textContent ?? '').trim(),
                keywords: (o.getAttribute(`${P}keywords`) ?? '').split(/\s+/).filter(Boolean),
                action: () => {},
            })),
            query,
        ).map((i) => i.id),
    );
    for (const o of todas) o.hidden = !visibles.has(o.getAttribute(`${P}value`) ?? '');

    for (const g of panel.querySelectorAll<HTMLElement>(`[${P}command-group]`)) {
        g.hidden = !g.querySelector('[role="option"]:not([hidden])');
    }
    const vacio = raiz.querySelector<HTMLElement>(`[${P}listbox-empty]`);
    if (vacio) {
        vacio.hidden = visibles.size > 0;
        vacio.dataset.tsEmptyDefault ??= vacio.textContent ?? '';
        const plantilla = vacio.getAttribute(`${P}empty-for`);
        vacio.textContent = query && plantilla ? plantilla.replace('{q}', () => query) : vacio.dataset.tsEmptyDefault;
    }
    lb.activar(raiz, lb.opciones(panel)[0] ?? null);
}

export function abrir(raiz: HTMLElement, abierto: boolean): void {
    const dlg = dialogoDe(raiz);
    if (!dlg) return;
    if (abierto) {
        dlg.showModal();
        const input = raiz.querySelector<HTMLInputElement>(`[${P}listbox-input]`);
        if (input) {
            input.value = '';
            input.focus();
        }
        filtrar(raiz, '');
    } else {
        dlg.close();
    }
}

export function alPresionarTeclaGlobal(tecla: string, meta: boolean, ctrl: boolean): boolean {
    if (!(meta || ctrl)) return false;
    for (const raiz of document.querySelectorAll<HTMLElement>(`[${P}command-palette]`)) {
        const atajo = raiz.getAttribute(`${P}shortcut`) ?? 'k';
        if (tecla.toLowerCase() !== atajo.toLowerCase()) continue;
        const dlg = dialogoDe(raiz);
        abrir(raiz, !dlg?.open);
        return true;
    }
    return false;
}

export function alHacerClick(destino: Element): boolean {
    const abridor = destino.closest<HTMLElement>(`[${P}command-open]`);
    if (abridor) {
        const id = abridor.getAttribute(`${P}command-open`);
        const raiz = id
            ? document.getElementById(id)
            : document.querySelector<HTMLElement>(`[${P}command-palette]`);
        if (raiz) {
            abrir(raiz, true);
            return true;
        }
    }

    const raiz = destino.closest<HTMLElement>(`[${P}command-palette]`);
    if (!raiz) return false;
    const opcion = destino.closest<HTMLElement>('[role="option"]');
    if (!opcion) return false;

    const valor = opcion.getAttribute(`${P}value`) ?? '';
    if (avisar(raiz, { component: 'command-palette', value: valor })) abrir(raiz, false);
    return true;
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    const raiz = destino.closest<HTMLElement>(`[${P}command-palette]`);
    if (!raiz) return false;

    const accion = commandKeyAction(tecla);
    if (accion === 'choose') {
        const panel = lb.panelDe(raiz);
        const op = panel ? lb.activa(raiz, panel) : null;
        if (!op) return false;
        const valor = op.getAttribute(`${P}value`) ?? '';
        if (avisar(raiz, { component: 'command-palette', value: valor })) abrir(raiz, false);
        return true;
    }
    return accion === 'next' || accion === 'prev' ? lb.navegar(raiz, tecla) : false;
}

export function alEscribir(destino: Element): boolean {
    if (!(destino instanceof HTMLInputElement)) return false;
    const raiz = destino.closest<HTMLElement>(`[${P}command-palette]`);
    if (!raiz) return false;
    filtrar(raiz, destino.value);
    return true;
}

export const ficha = {
    alEscribir,
    alHacerClick,
    alPresionarTecla,
    alPresionarTeclaGlobal,
};
