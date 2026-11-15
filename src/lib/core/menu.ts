// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { clampMenuPosition } from './logica/context-menu';
import { menuKeyAction } from './logica/menu';
import { P, avisar } from './dom';
import { setVars } from './vars';

const raizDe = (el: Element) => el.closest<HTMLElement>(`[${P}menu]`);
const focoPrevio = new WeakMap<HTMLElement, HTMLElement>();
const panelDe = (raiz: HTMLElement) => raiz.querySelector<HTMLElement>(`[${P}menu-panel]`);

function items(raiz: HTMLElement): HTMLElement[] {
    const panel = panelDe(raiz);
    return panel
        ? [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(
              (i) => !i.hasAttribute('disabled') && i.getAttribute('aria-disabled') !== 'true',
          )
        : [];
}

export function abrir(raiz: HTMLElement, abierto: boolean, en?: { x: number; y: number }, devolverFoco = true): void {
    const panel = panelDe(raiz);
    const trigger = raiz.querySelector<HTMLElement>(`[${P}menu-trigger]`);
    if (!panel) return;

    panel.hidden = !abierto;
    if (panel.hasAttribute('popover')) {
        try {
            if (abierto) panel.showPopover?.();
            else panel.hidePopover?.();
        } catch {
        }
    }
    trigger?.setAttribute('aria-expanded', String(abierto));
    raiz.classList.toggle('is-open', abierto);

    if (abierto) {
        if (!trigger && document.activeElement instanceof HTMLElement) focoPrevio.set(raiz, document.activeElement);
        if (en) {
            const r = panel.getBoundingClientRect();
            const { x, y } = clampMenuPosition(
                en.x,
                en.y,
                { width: r.width, height: r.height },
                { width: window.innerWidth, height: window.innerHeight },
            );
            panel.classList.add('is-placed');
            setVars(panel, { '--ts-overlay-x': `${x}px`, '--ts-overlay-y': `${y}px` });
        }
        items(raiz)[0]?.focus();
    } else if (devolverFoco) {
        (trigger ?? focoPrevio.get(raiz))?.focus();
    }
}

export function preparar(raiz: HTMLElement): void {
    const panel = panelDe(raiz);
    if (!panel) return;
    for (const item of panel.querySelectorAll('[role="menuitem"]')) item.setAttribute('tabindex', '-1');
    const trigger = raiz.querySelector<HTMLElement>(`[${P}menu-trigger][popovertarget]`);
    if (!trigger) return;
    trigger.removeAttribute('popovertarget');
    trigger.setAttribute('aria-expanded', 'false');
    panel.setAttribute('popover', 'manual');
    panel.hidden = true;
}

export function alHacerClick(destino: Element): boolean {
    const raiz = raizDe(destino);
    if (!raiz) return false;

    const item = destino.closest<HTMLElement>('[role="menuitem"]');
    if (item && !item.hasAttribute('disabled')) {
        const valor = item.getAttribute(`${P}value`) ?? '';
        if (avisar(raiz, { component: 'menu', value: valor })) abrir(raiz, false);
        return true;
    }
    if (destino.closest(`[${P}menu-trigger]`)) {
        abrir(raiz, panelDe(raiz)?.hidden !== false);
        return true;
    }
    return false;
}

export function alMenuContextual(destino: Element, x: number, y: number): boolean {
    const raiz = destino.closest<HTMLElement>(`[${P}context-menu]`);
    if (!raiz) return false;
    abrir(raiz, true, { x, y });
    return true;
}

export function alAbrirContextualConTeclado(destino: Element, tecla: string, mayus: boolean): boolean {
    if (tecla !== 'ContextMenu' && !(mayus && tecla === 'F10')) return false;
    const raiz = destino.closest<HTMLElement>(`[${P}context-menu]`);
    if (!raiz || destino.closest(`[${P}menu-panel]`)) return false;
    const r = raiz.getBoundingClientRect();
    abrir(raiz, true, { x: r.left, y: r.bottom });
    return true;
}

export function alHacerClickAfuera(destino: Element): void {
    const propio = raizDe(destino);
    for (const raiz of document.querySelectorAll<HTMLElement>(`[${P}menu]`)) {
        if (raiz !== propio && panelDe(raiz)?.hidden === false) abrir(raiz, false, undefined, false);
    }
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    const raiz = raizDe(destino);
    if (!raiz) return false;
    const abiertoAhora = panelDe(raiz)?.hidden === false;

    if (tecla === 'Escape' && abiertoAhora) {
        abrir(raiz, false);
        return true;
    }
    if (!abiertoAhora) {
        if (tecla === 'ArrowDown' || tecla === 'Enter' || tecla === ' ') {
            abrir(raiz, true);
            return true;
        }
        return false;
    }

    if (!destino.closest(`[${P}menu-panel]`)) return false;
    const lista = items(raiz);
    const idx = lista.indexOf(destino.closest<HTMLElement>('[role="menuitem"]') as HTMLElement);
    const accion = menuKeyAction(tecla, idx, lista.length);
    if (accion === null) return false;
    if (accion.type === 'close') {
        abrir(raiz, false, undefined, false);
        return false;
    }
    lista[accion.index].focus();
    return true;
}

export const ficha = {
    alAbrirContextualConTeclado,
    alHacerClick,
    alHacerClickAfuera,
    alMenuContextual,
    alPresionarTecla,
    preparar,
};
