// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { P, avisar } from './dom';
import { edgeIndex, formValues, requiredProxyValue, toggleValue } from './logica/select';

const TYPEAHEAD_MS = 500;

const buffers = new WeakMap<HTMLElement, { texto: string; t: ReturnType<typeof setTimeout> }>();

export function opciones(panel: HTMLElement): HTMLElement[] {
    return [...panel.querySelectorAll<HTMLElement>('[role="option"]')].filter(
        (o) => o.getAttribute('aria-disabled') !== 'true' && !o.hidden,
    );
}

export function etiquetaDe(opcion: HTMLElement): string {
    const etiqueta = opcion.querySelector<HTMLElement>('[data-select-option-label]');
    return (etiqueta ?? opcion).textContent?.trim() ?? '';
}

export function activa(raiz: HTMLElement, panel: HTMLElement): HTMLElement | null {
    const id = disparador(raiz)?.getAttribute('aria-activedescendant');
    const el = id ? panel.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null;
    return el && !el.hidden ? el : null;
}

export function disparador(raiz: HTMLElement): HTMLElement | null {
    return raiz.querySelector<HTMLElement>(`[${P}listbox-input], [${P}listbox-trigger]`);
}

export function sincronizarEnvio(raiz: HTMLElement): void {
    const disp = disparador(raiz) as HTMLButtonElement | HTMLInputElement | null;
    if (!disp) return;
    sincronizarRequerido(raiz, disp.disabled);
    for (const campo of raiz.querySelectorAll<HTMLInputElement>(`[${P}listbox-value]`)) {
        if (campo.disabled !== disp.disabled) campo.disabled = disp.disabled;
    }
}

function sincronizarRequerido(raiz: HTMLElement, deshabilitado: boolean): void {
    const proxy = raiz.querySelector<HTMLInputElement>(`[${P}required-proxy]`);
    if (!proxy) return;
    if (proxy.disabled !== deshabilitado) proxy.disabled = deshabilitado;
    proxy.value = proxy.defaultValue = requiredProxyValue(
        [...raiz.querySelectorAll<HTMLElement>('[role="option"][aria-selected="true"]')].map((o) => o.getAttribute(`${P}value`) ?? ''),
    );
}

export function panelDe(raiz: HTMLElement): HTMLElement | null {
    return raiz.querySelector<HTMLElement>(`[${P}listbox-panel]`);
}

let contadorIds = 0;

/** Id de opción que no se repite: contador de módulo, y salta los que el documento ya use (otro bundle del Core, marcado a mano). */
export function idNuevo(doc: Document): string {
    let id: string;
    do id = `ts-op-${++contadorIds}`;
    while (doc.getElementById(id));
    return id;
}

export function activar(raiz: HTMLElement, opcion: HTMLElement | null): void {
    const panel = panelDe(raiz);
    const disp = disparador(raiz);
    if (!panel || !disp) return;

    for (const o of panel.querySelectorAll<HTMLElement>('[role="option"]')) {
        o.classList.toggle('is-focused', o === opcion);
    }
    if (opcion) {
        if (!opcion.id) opcion.id = idNuevo(opcion.ownerDocument);
        disp.setAttribute('aria-activedescendant', opcion.id);
        opcion.scrollIntoView({ block: 'nearest' });
    } else {
        disp.removeAttribute('aria-activedescendant');
    }
}

export function alApuntarOpcion(destino: Element): boolean {
    const opcion = destino.closest<HTMLElement>('[role="option"]');
    const raiz = opcion?.closest<HTMLElement>(`[${P}listbox]`);
    const tipo = raiz?.getAttribute(`${P}listbox`);
    if (!opcion || !raiz || (tipo !== 'combobox' && tipo !== 'command')) return false;
    const panel = panelDe(raiz);
    if (!panel || !estaAbierto(raiz) || opcion.getAttribute('aria-disabled') === 'true' || opcion.hidden) return false;
    if (activa(raiz, panel) === opcion) return false;
    activar(raiz, opcion);
    return true;
}

export function abrir(raiz: HTMLElement, abierto: boolean): void {
    const panel = panelDe(raiz);
    const disp = disparador(raiz);
    if (!panel || !disp) return;

    panel.hidden = !abierto;
    if (panel.hasAttribute('popover')) {
        try {
            if (abierto) panel.showPopover?.();
            else panel.hidePopover?.();
        } catch {
        }
    }
    disp.setAttribute('aria-expanded', String(abierto));
    raiz.classList.toggle('is-open', abierto);
    if (abierto) {
        const ops = opciones(panel);
        const sel = ops.find((o) => o.getAttribute('aria-selected') === 'true');
        activar(raiz, sel ?? ops[0] ?? null);
    } else {
        activar(raiz, null);
    }
}

export function estaAbierto(raiz: HTMLElement): boolean {
    return disparador(raiz)?.getAttribute('aria-expanded') === 'true';
}

export function navegar(raiz: HTMLElement, tecla: string): boolean {
    const panel = panelDe(raiz);
    if (!panel) return false;
    const ops = opciones(panel);
    if (ops.length === 0) return false;

    const idx = ops.indexOf(activa(raiz, panel) as HTMLElement);
    let destino: number;
    switch (tecla) {
        case 'ArrowDown':
            destino = idx < 0 ? 0 : (idx + 1) % ops.length;
            break;
        case 'ArrowUp':
            destino = idx < 0 ? ops.length - 1 : (idx - 1 + ops.length) % ops.length;
            break;
        default: {
            const borde = edgeIndex(tecla, ops.length);
            if (borde === null) return false;
            destino = borde;
        }
    }
    activar(raiz, ops[destino]);
    return true;
}

export function tipear(raiz: HTMLElement, tecla: string): boolean {
    if (tecla.length !== 1 || tecla === ' ') return false;
    const panel = panelDe(raiz);
    if (!panel) return false;

    const previo = buffers.get(raiz);
    if (previo) clearTimeout(previo.t);
    const texto = (previo?.texto ?? '') + tecla.toLowerCase();
    buffers.set(raiz, { texto, t: setTimeout(() => buffers.delete(raiz), TYPEAHEAD_MS) });

    const match = opciones(panel).find((o) => etiquetaDe(o).toLowerCase().startsWith(texto));
    if (match) activar(raiz, match);
    return match !== undefined;
}

export function seleccionar(raiz: HTMLElement, opcion: HTMLElement, multiple: boolean): void {
    const panel = panelDe(raiz);
    if (!panel) return;
    const valor = opcion.getAttribute(`${P}value`) ?? '';

    const actuales = raiz.querySelector(`[${P}listbox-template]`)
        ? [...raiz.querySelectorAll<HTMLInputElement>(`[${P}listbox-value]`)].map((c) => c.value)
        : opciones(panel)
              .filter((o) => o.getAttribute('aria-selected') === 'true')
              .map((o) => o.getAttribute(`${P}value`) ?? '');
    const seleccion = multiple ? toggleValue(actuales, valor) : [valor];

    aplicar(raiz, panel, valor, seleccion);
}

export function fijarValor(raiz: HTMLElement, valor: string): void {
    const panel = panelDe(raiz);
    if (panel) aplicar(raiz, panel, valor, [valor]);
}

export function fijarSeleccion(raiz: HTMLElement, valor: string, seleccion: string[]): boolean {
    const panel = panelDe(raiz);
    return !!panel && aplicar(raiz, panel, valor, seleccion);
}

export function limpiar(raiz: HTMLElement): boolean {
    const panel = panelDe(raiz);
    return !!panel && aplicar(raiz, panel, '', []);
}

function aplicar(raiz: HTMLElement, panel: HTMLElement, valor: string, seleccion: string[]): boolean {
    if (!avisar(raiz, { component: raiz.getAttribute(`${P}listbox`) || 'listbox', value: valor, selection: seleccion })) return false;
    pintar(raiz, panel, seleccion);
    return true;
}

export function restaurar(raiz: HTMLElement, valor: string | string[]): void {
    const panel = panelDe(raiz);
    if (panel) pintar(raiz, panel, Array.isArray(valor) ? valor : valor ? [valor] : []);
}

const inicial = new WeakMap<HTMLElement, string[]>();

export function restaurarInicial(raiz: HTMLElement): void {
    const panel = panelDe(raiz);
    const seleccion = inicial.get(raiz);
    if (panel && seleccion) pintar(raiz, panel, seleccion);
}

function pintar(raiz: HTMLElement, panel: HTMLElement, seleccion: string[]): void {
    if (!inicial.has(raiz)) {
        inicial.set(
            raiz,
            [...panel.querySelectorAll<HTMLElement>('[role="option"][aria-selected="true"]')].map((o) => o.getAttribute(`${P}value`) ?? ''),
        );
    }
    for (const o of panel.querySelectorAll<HTMLElement>('[role="option"]')) {
        const sel = seleccion.includes(o.getAttribute(`${P}value`) ?? '');
        o.setAttribute('aria-selected', String(sel));
        o.classList.toggle('is-selected', sel);
        o.querySelector('.checkbox')?.classList.toggle('is-checked', sel);
    }
    sincronizarRequerido(raiz, !!(disparador(raiz) as HTMLButtonElement | null)?.disabled);
    const multiple = raiz.hasAttribute(`${P}multiple`);
    const molde = raiz.querySelector<HTMLInputElement>(`[${P}listbox-template]`);
    if (multiple && molde) {
        for (const campo of raiz.querySelectorAll(`[${P}listbox-value]`)) campo.remove();
        for (const v of formValues(true, seleccion)) {
            const campo = molde.cloneNode() as HTMLInputElement;
            campo.removeAttribute(`${P}listbox-template`);
            campo.disabled = !!(disparador(raiz) as HTMLButtonElement | HTMLInputElement | null)?.disabled;
            campo.setAttribute(`${P}listbox-value`, '');
            campo.value = v;
            molde.before(campo);
        }
        return;
    }
    const campo = raiz.querySelector<HTMLInputElement>(`[${P}listbox-value]`);
    if (campo) campo.value = formValues(false, seleccion)[0];
}

export const ficha = {
    alApuntarOpcion,
    sincronizarEnvio,
};
