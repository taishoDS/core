// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { P, avisar, contenedor, mostrar, partes } from './dom';
import { nextIndex } from './roving';
import { setVars } from './vars';

const observadores = new WeakMap<HTMLElement, ResizeObserver>();
const escuchadas = new WeakSet<HTMLElement>();
const prefijos = new WeakMap<HTMLElement, string>();
let grupos = 0;

function escala(lista: HTMLElement, ancho: number): number {
    return lista.offsetWidth > 0 && Math.abs(ancho - lista.offsetWidth) >= 1 ? ancho / lista.offsetWidth : 1;
}

function geometria(lista: HTMLElement, tab: HTMLElement): Record<`--ts-tabs-${string}`, string> {
    const caja = lista.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    const e = escala(lista, caja.width);
    if (lista.getAttribute('aria-orientation') === 'vertical') {
        const origen = caja.top + lista.clientTop * e;
        return {
            '--ts-tabs-y': `${(t.top - origen) / e + lista.scrollTop}px`,
            '--ts-tabs-h': String(t.height / e),
        };
    }
    const rtl = getComputedStyle(lista).direction === 'rtl';
    const origen = caja.left + (lista.clientLeft + (rtl ? lista.clientWidth : 0)) * e;
    return {
        '--ts-tabs-x': `${((rtl ? t.right : t.left) - origen) / e + lista.scrollLeft}px`,
        '--ts-tabs-w': String(t.width / e),
    };
}

function medir(lista: HTMLElement, mover: boolean): void {
    const activa = lista.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!activa || lista.offsetWidth === 0 || lista.offsetHeight === 0) {
        lista.classList.remove('has-indicator', 'is-moving');
        return;
    }
    const vars = geometria(lista, activa);
    const sinCambio = Object.entries(vars).every(([k, v]) => lista.style.getPropertyValue(k) === v);
    const visible = lista.classList.contains('has-indicator');
    if (sinCambio && visible) return;
    if (mover && visible) lista.classList.add('is-moving');
    setVars(lista, vars);
    lista.classList.add('has-indicator');
}

function seguir(raiz: HTMLElement): void {
    const lista = raiz.querySelector<HTMLElement>('[role="tablist"]');
    if (!lista) return;
    if (!escuchadas.has(lista)) {
        escuchadas.add(lista);
        lista.addEventListener('transitionend', (e) => {
            if (e.target === lista && (e.pseudoElement === '::after' || e.pseudoElement === '::before')) lista.classList.remove('is-moving');
        });
    }
    if (typeof ResizeObserver !== 'undefined') {
        let ro = observadores.get(lista);
        if (!ro) observadores.set(lista, (ro = new ResizeObserver(() => medir(lista, false))));
        ro.observe(lista);
        for (const tab of partes(raiz, 'tabs', 'tab')) ro.observe(tab);
    }
    medir(lista, false);
}

function navegables(raiz: HTMLElement): HTMLElement[] {
    return partes(raiz, 'tabs', 'tab').filter((t) => !t.hasAttribute('disabled'));
}

function activar(raiz: HTMLElement, valor: string): void {
    if (!avisar(raiz, { component: 'tabs', value: valor })) return;

    const lista = raiz.querySelector<HTMLElement>('[role="tablist"]');
    if (lista) medir(lista, false);
    for (const tab of partes(raiz, 'tabs', 'tab')) {
        const activa = tab.getAttribute(`${P}value`) === valor;
        tab.setAttribute('aria-selected', String(activa));
        tab.tabIndex = activa ? 0 : -1;
        tab.classList.toggle('is-active', activa);
        const contador = tab.querySelector(`[${P}tabs-count]`);
        contador?.classList.toggle('fill-solid', activa);
        contador?.classList.toggle('fill-subtle', !activa);
    }
    if (lista) medir(lista, true);
    for (const panel of partes(raiz, 'tabs', 'panel')) {
        mostrar(panel, panel.getAttribute(`${P}value`) === valor);
    }
}

/**
 * Vincula cada pestaña con su panel (por `data-ts-value`): `id` + `aria-controls` en la pestaña, `aria-labelledby` y
 * `tabindex="0"` en el panel. Genera lo que falta y respeta lo que el autor ya escribió. Sin panel para una
 * pestaña, no hay `aria-controls` (apuntaría a la nada).
 */
function vincular(raiz: HTMLElement): void {
    let prefijo = prefijos.get(raiz);
    if (!prefijo) prefijos.set(raiz, (prefijo = raiz.id || `ts-tabs-${++grupos}`));
    const paneles = partes(raiz, 'tabs', 'panel');
    partes(raiz, 'tabs', 'tab').forEach((tab, i) => {
        const panel = paneles.find((p) => p.getAttribute(`${P}value`) === tab.getAttribute(`${P}value`));
        if (!tab.id) tab.id = `${prefijo}-tab-${i}`;
        if (!panel) return;
        if (!panel.id) panel.id = `${prefijo}-panel-${i}`;
        if (!tab.hasAttribute('aria-controls')) tab.setAttribute('aria-controls', panel.id);
        if (!panel.hasAttribute('aria-labelledby')) panel.setAttribute('aria-labelledby', tab.id);
        if (!panel.hasAttribute('tabindex')) panel.tabIndex = 0;
    });
}

export function preparar(raiz: HTMLElement): void {
    vincular(raiz);
    const activa = partes(raiz, 'tabs', 'tab').find((t) => t.getAttribute('aria-selected') === 'true');
    const valor = activa?.getAttribute(`${P}value`);
    if (valor == null) return;
    seguir(raiz);
    for (const panel of partes(raiz, 'tabs', 'panel')) {
        mostrar(panel, panel.getAttribute(`${P}value`) === valor);
    }
}

export function alHacerClick(destino: Element): boolean {
    const tab = destino.closest<HTMLElement>(`[${P}tabs-tab]`);
    if (!tab || tab.hasAttribute('disabled')) return false;
    const raiz = contenedor(tab, 'tabs');
    const valor = tab.getAttribute(`${P}value`);
    if (!raiz || valor === null) return false;
    activar(raiz, valor);
    return true;
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    const tab = destino.closest<HTMLElement>(`[${P}tabs-tab]`);
    if (!tab) return false;
    const raiz = contenedor(tab, 'tabs');
    if (!raiz) return false;

    const lista = tab.closest<HTMLElement>('[role="tablist"]');
    const orientation = lista?.getAttribute('aria-orientation') === 'vertical' ? 'vertical' : 'horizontal';
    const rtl = !!lista && getComputedStyle(lista).direction === 'rtl';
    const tabs = navegables(raiz);
    const idx = tabs.indexOf(tab);
    const destinoIdx = nextIndex(tecla, idx, tabs.length, { orientation, rtl });
    if (destinoIdx === null || idx < 0) return false;

    const siguiente = tabs[destinoIdx];
    siguiente.focus();
    const valor = siguiente.getAttribute(`${P}value`);
    if (valor !== null) activar(raiz, valor);
    return true;
}

export const ficha = {
    alHacerClick,
    alPresionarTecla,
    preparar,
};
