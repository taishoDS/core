// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).

export function soportado(): boolean {
    return typeof HTMLButtonElement !== 'undefined' && 'command' in HTMLButtonElement.prototype;
}

function comandoEvento(comando: string, fuente: Element): Event {
    const evento = new Event('command', { cancelable: true });
    Object.defineProperties(evento, { command: { value: comando }, source: { value: fuente } });
    return evento;
}

function abrir(dialogo: HTMLDialogElement, disparador: HTMLElement): void {
    if (dialogo.open) return;
    dialogo.showModal();
    dialogo.addEventListener('close', () => { if (disparador.isConnected) disparador.focus(); }, { once: true });
}

function pedirCierre(dialogo: HTMLDialogElement): void {
    if (!dialogo.open) return;
    if (typeof dialogo.requestClose === 'function') dialogo.requestClose();
    else if (dialogo.dispatchEvent(new Event('cancel', { cancelable: true }))) dialogo.close();
}

export function alHacerClick(destino: Element, evento?: Event): boolean {
    if (soportado()) return false;
    const boton = destino.closest<HTMLButtonElement>('button[commandfor]');
    if (!boton || boton.disabled || evento?.defaultPrevented) return false;
    const comando = (boton.getAttribute('command') ?? '').trim();
    if (!comando) return false;
    const id = boton.getAttribute('commandfor') ?? '';
    const objetivo = (boton.getRootNode() as Document | ShadowRoot).getElementById?.(id);
    if (!objetivo) return false;
    const nombre = comando.startsWith('--') ? comando : comando.toLowerCase();
    if (!objetivo.dispatchEvent(comandoEvento(nombre, boton))) return true;
    if (!(objetivo instanceof HTMLDialogElement)) return true;
    if (nombre === 'show-modal') abrir(objetivo, boton);
    else if (nombre === 'close') objetivo.close();
    else if (nombre === 'request-close') pedirCierre(objetivo);
    return true;
}

export function cierrePorFondoSoportado(): boolean {
    return typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;
}

let fondoPresionado: HTMLDialogElement | null = null;

function modalAbierto(raiz: Document | ShadowRoot): HTMLDialogElement | null {
    const abiertos = [...raiz.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter((d) => d.matches(':modal'));
    return abiertos[abiertos.length - 1] ?? null;
}

function cierraConFondo(dialogo: HTMLDialogElement): boolean {
    return (dialogo.getAttribute('closedby') ?? '').trim().toLowerCase() === 'any';
}

function cayoAfuera(dialogo: HTMLDialogElement, destino: Element, evento: MouseEvent): boolean {
    if (destino === dialogo) {
        const r = dialogo.getBoundingClientRect();
        return evento.clientX < r.left || evento.clientX > r.right || evento.clientY < r.top || evento.clientY > r.bottom;
    }
    return !dialogo.contains(destino);
}

export function alPresionarFondo(destino: Element, evento: MouseEvent): void {
    fondoPresionado = null;
    if (cierrePorFondoSoportado()) return;
    const dialogo = modalAbierto(destino.getRootNode() as Document | ShadowRoot);
    if (dialogo && cierraConFondo(dialogo) && cayoAfuera(dialogo, destino, evento)) fondoPresionado = dialogo;
}

export function alHacerClickFondo(destino: Element, evento: MouseEvent): void {
    const dialogo = fondoPresionado;
    fondoPresionado = null;
    if (!dialogo || cierrePorFondoSoportado() || !dialogo.open || !cierraConFondo(dialogo)) return;
    if (cayoAfuera(dialogo, destino, evento)) pedirCierre(dialogo);
}

function noDescartable(dialogo: Element | null): boolean {
    return (dialogo?.getAttribute('closedby') ?? '').trim().toLowerCase() === 'none';
}

export function alCancelar(evento: Event): void {
    if (noDescartable(evento.target as Element) && evento.cancelable) evento.preventDefault();
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    if (tecla !== 'Escape') return false;
    const dialogo = destino.closest<HTMLDialogElement>('dialog');
    return !!dialogo && dialogo.matches(':modal') && noDescartable(dialogo);
}

const sinNombre = new WeakSet<Element>();

function esDeDesarrollo(doc: Document): boolean {
    return ['localhost', '127.0.0.1', '[::1]'].includes(doc.location?.hostname ?? '');
}

export function revisarNombres(raiz: Document | HTMLElement): void {
    const doc = raiz.ownerDocument ?? (raiz as Document);
    if (!esDeDesarrollo(doc)) return;
    for (const dialogo of raiz.querySelectorAll<HTMLElement>('dialog.ts')) {
        if (sinNombre.has(dialogo) || dialogo.hasAttribute('aria-label') || dialogo.hasAttribute('aria-labelledby') || dialogo.hasAttribute('title')) continue;
        sinNombre.add(dialogo);
        const en = doc.documentElement.lang.toLowerCase().startsWith('en');
        console.warn(
            en
                ? 'TaishoDS Core: a dialog has no accessible name. It needs aria-labelledby (pointing to its title) or aria-label.'
                : 'TaishoDS Core: un diálogo no tiene nombre accesible. Falta aria-labelledby (que apunte a su título) o aria-label.',
            dialogo,
        );
    }
}

export const ficha = {
    alCancelar,
    alHacerClick,
    alHacerClickFondo,
    alPresionarFondo,
    alPresionarTecla,
    revisarNombres,
};
