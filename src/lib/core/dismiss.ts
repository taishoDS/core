// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { focusTargetAfterDismiss } from './logica/tag';
import { P, avisar, contenedor } from './dom';

const TECLAS_DESCARTE = new Set(['Backspace', 'Delete']);
// Un tag `is-clickable` es un `<span role="button">`: no lleva botón nativo porque puede contener el de quitar.
const TECLAS_ACTIVAR = new Set(['Enter', ' ']);
const ACCIONABLE = '.tag.is-clickable[role="button"]';

function descartar(raiz: HTMLElement): void {
    if (!avisar(raiz, { component: 'dismiss', dismissed: true })) return;
    const conFoco = raiz.contains(document.activeElement);
    raiz.hidden = true;
    if (conFoco) focusTargetAfterDismiss(raiz)?.focus();
}

export function alHacerClick(destino: Element): boolean {
    const boton = destino.closest<HTMLElement>(`[${P}dismiss]`);
    if (!boton || boton.hasAttribute('disabled')) return false;
    const raiz = contenedor(boton, 'dismissible');
    if (!raiz) return false;
    descartar(raiz);
    return true;
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    if (TECLAS_ACTIVAR.has(tecla)) {
        if (!destino.matches(ACCIONABLE) || destino.getAttribute('aria-disabled') === 'true') return false;
        (destino as HTMLElement).click();
        return true;
    }
    if (!TECLAS_DESCARTE.has(tecla)) return false;
    const raiz = destino.closest<HTMLElement>(`[${P}dismissible]`);
    if (!raiz || destino !== raiz) return false;
    descartar(raiz);
    return true;
}

export const ficha = {
    alHacerClick,
    alPresionarTecla,
};
