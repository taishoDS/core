// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { confirmTextMatches } from './logica/alert-dialog';
import { P } from './dom';

function dialogoDe(el: Element): HTMLDialogElement | null {
    return el.closest<HTMLDialogElement>(`[${P}confirm-text]`);
}

export function sincronizar(dialogo: HTMLElement): void {
    const campo = dialogo.querySelector<HTMLInputElement>(`[${P}confirm-input]`);
    const boton = dialogo.querySelector<HTMLButtonElement>(`[${P}confirm]`);
    if (!campo || !boton) return;
    boton.disabled = !confirmTextMatches(campo.value, dialogo.getAttribute(`${P}confirm-text`) ?? '');
}

export function alEscribir(destino: Element): boolean {
    if (!destino.matches(`[${P}confirm-input]`)) return false;
    const dialogo = dialogoDe(destino);
    if (!dialogo) return false;
    sincronizar(dialogo);
    return true;
}

export function alCerrar(destino: Element): void {
    const dialogo = dialogoDe(destino);
    if (!dialogo || dialogo !== destino) return;
    const campo = dialogo.querySelector<HTMLInputElement>(`[${P}confirm-input]`);
    if (campo) campo.value = '';
    sincronizar(dialogo);
}

export function sincronizarTodos(raiz: Document | HTMLElement): void {
    for (const d of raiz.querySelectorAll<HTMLElement>(`[${P}confirm-text]`)) sincronizar(d);
}

export const ficha = {
    alCerrar,
    alEscribir,
    sincronizarTodos,
};
