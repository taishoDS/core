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

// WebKit no enfoca un `<button>` al hacerle clic, así que `showModal()` recuerda `body` y el cierre
// le devuelve el foco ahí. Se guarda el disparador (el elemento del clic) por diálogo y, al cerrar, si el
// foco quedó en `body`, vuelve a él.
const DISPARADOR = 'button, a[href], summary, [role="button"], [tabindex]';
const disparadores = new WeakMap<HTMLDialogElement, HTMLElement>();

// Asignación pendiente del último clic. Si llega otro clic antes de que corra (dos aperturas en el mismo turno),
// se resuelve primero: así cada diálogo queda con el disparador del clic que lo abrió.
let pendiente: (() => void) | null = null;
let temporizador: ReturnType<typeof setTimeout> | undefined;

export function alPresionarDisparador(destino: Element): void {
    pendiente?.();
    const candidato = destino.closest<HTMLElement>(DISPARADOR);
    if (!candidato) return;
    const doc = candidato.ownerDocument;
    // Los que ya estaban abiertos no los abrió este clic: sólo se asigna a los que aparecen después.
    const antes = new Set(doc.querySelectorAll<HTMLDialogElement>('dialog[open]'));
    const asignar = () => {
        clearTimeout(temporizador);
        pendiente = null;
        for (const d of doc.querySelectorAll<HTMLDialogElement>('dialog[open]')) {
            // Un botón dentro de un diálogo sólo es disparador de OTRO diálogo, no del que lo contiene.
            if (!antes.has(d) && !disparadores.has(d) && !d.contains(candidato)) disparadores.set(d, candidato);
        }
    };
    pendiente = asignar;
    // `showModal()` corre en el mismo clic, después de este oyente: un turno después el diálogo ya está abierto.
    temporizador = setTimeout(asignar, 0);
}

export function alCerrarDialogo(destino: Element): void {
    if (!(destino instanceof HTMLDialogElement)) return;
    const volver = disparadores.get(destino);
    disparadores.delete(destino);
    const doc = destino.ownerDocument;
    // WebKit dispara `close` con el foco todavía sobre un hijo del diálogo ya cerrado, o, si éste se abrió desde
    // dentro de otro diálogo, sobre el diálogo exterior (que lo contiene): también cuenta como perdido.
    const activo = doc.activeElement;
    if (volver?.isConnected && (!activo || activo === doc.body || destino.contains(activo) || activo.contains(destino))) volver.focus();
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

export const ficha = {
    alCancelar,
    alHacerClick,
    alCerrarDialogo,
    alHacerClickFondo,
    alPresionarDisparador,
    alPresionarFondo,
    alPresionarTecla,
};
