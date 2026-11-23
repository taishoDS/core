// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { computeFloatingPosition, floatingGap, type FloatingPlacement } from './floating';
import { m } from './registro';
import { P } from './dom';
import { setVars } from './vars';
import { apagarCampos, encenderCampos, esPanelPopover } from './popover-campos';

const RETARDO_MS = 150;
const SALIDA_MS = 100;

const ENFOCABLE =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"]';

const temporizadores = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function panel(raiz: HTMLElement): HTMLElement | null {
    return raiz.querySelector<HTMLElement>(`[${P}tooltip]`);
}

function disparador(raiz: HTMLElement): HTMLElement {
    for (const el of raiz.querySelectorAll<HTMLElement>(ENFOCABLE)) {
        if (el.closest(`[${P}tooltip]`) || el.matches(':disabled, [tabindex="-1"]')) continue;
        return el;
    }
    return raiz;
}

export function preparar(raiz: HTMLElement): void {
    const id = panel(raiz)?.id;
    if (!id) return;
    const destino = disparador(raiz);
    const ids = (el: HTMLElement) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    if (destino !== raiz && ids(raiz).includes(id)) {
        const resto = ids(raiz).filter((x) => x !== id);
        if (resto.length) raiz.setAttribute('aria-describedby', resto.join(' '));
        else raiz.removeAttribute('aria-describedby');
    }
    if (!ids(destino).includes(id)) destino.setAttribute('aria-describedby', [...ids(destino), id].join(' '));
}

function colocar(disparador: HTMLElement, flotante: HTMLElement): void {
    const preferido = (flotante.getAttribute(`${P}placement`) ?? 'top') as FloatingPlacement;
    const gap = floatingGap(disparador);
    const { x, y, placement } = computeFloatingPosition(disparador, flotante, preferido, gap, gap);
    flotante.classList.add('is-placed');
    setVars(flotante, { '--ts-overlay-x': `${x}px`, '--ts-overlay-y': `${y}px` });
    flotante.className = flotante.className.replace(/placement-\S+/g, '') + ` placement-${placement}`;
}

function mostrar(raiz: HTMLElement, inmediato: boolean): void {
    const flotante = panel(raiz);
    if (!flotante) return;
    clearTimeout(temporizadores.get(raiz));
    if (flotante.classList.contains('is-visible')) return;

    const abrir = () => {
        try {
            flotante.showPopover?.();
        } catch {
        }
        flotante.classList.add('is-visible');
        colocar(raiz, flotante);
    };
    if (inmediato) abrir();
    else temporizadores.set(raiz, setTimeout(abrir, RETARDO_MS));
}

function ocultar(raiz: HTMLElement, demorar = false): void {
    const flotante = panel(raiz);
    if (!flotante) return;
    clearTimeout(temporizadores.get(raiz));
    const cerrar = () => {
        flotante.classList.remove('is-visible');
        try {
            flotante.hidePopover?.();
        } catch {
        }
    };
    if (demorar) temporizadores.set(raiz, setTimeout(cerrar, SALIDA_MS));
    else cerrar();
}

export function alApuntar(destino: Element, entrar: boolean, porTeclado = false): boolean {
    const raiz = destino.closest<HTMLElement>(`[${P}tooltip-root]`);
    if (!raiz) return false;
    if (entrar) mostrar(raiz, porTeclado);
    else ocultar(raiz, !porTeclado);
    return true;
}

export function alPresionarTecla(_destino: Element, tecla: string): boolean {
    if (tecla !== 'Escape') return false;
    let cerrado = false;
    for (const flotante of document.querySelectorAll<HTMLElement>(`[${P}tooltip].is-visible`)) {
        const raiz = flotante.closest<HTMLElement>(`[${P}tooltip-root]`);
        if (raiz) {
            ocultar(raiz);
            cerrado = true;
        }
    }
    return cerrado;
}

export function apagarPopoversCerrados(raiz: Document | HTMLElement): void {
    for (const panel of raiz.querySelectorAll<HTMLElement>('.ts.popover[popover]')) {
        let abierto = false;
        try {
            abierto = panel.matches(':popover-open');
        } catch {
        }
        if (!abierto) apagarCampos(panel);
    }
}

export function alAntesDeAlternarPopover(e: Event): void {
    const panel = e.target as HTMLElement | null;
    if (!esPanelPopover(panel)) return;
    if ((e as Event & { newState?: string }).newState === 'open') encenderCampos(panel);
    else apagarCampos(panel);
}

export function alAlternarPopover(e: Event): void {
    const nuevo = (e as Event & { newState?: string }).newState;
    const panel = e.target as HTMLElement | null;
    if (!panel?.id || !panel.hasAttribute('popover')) return;
    const disparador = document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(panel.id)}"]`);
    m.datePicker?.alAlternarPopover(panel, disparador, nuevo === 'open');
    if (!disparador) return;
    if (esPanelPopover(panel) && disparador.hasAttribute('aria-expanded')) {
        disparador.setAttribute('aria-expanded', String(nuevo === 'open'));
    }

    if (nuevo === 'open') {
        const destino =
            panel.querySelector<HTMLElement>(`[${P}autofocus]`) ??
            panel.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        destino?.focus();
    } else if (nuevo === 'closed') {
        const activo = document.activeElement;
        // WebKit no enfoca un `<button>` al hacerle clic, así que la restitución nativa no tiene a qué volver: el foco
        // queda en `body` o todavía dentro del panel ya cerrado. En los dos casos pasa al disparador.
        if (!activo || activo === document.body || panel.contains(activo)) disparador.focus();
    }
}

export const ficha = {
    alAlternarPopover,
    alAntesDeAlternarPopover,
    alApuntar,
    alPresionarTecla,
    apagarPopoversCerrados,
    preparar,
};
