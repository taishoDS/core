// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { computeVirtualWindow, getNextSortDir, sortBy } from './logica/table';
import { numeroLocalizado } from './grid-logic';
import { setVars } from './vars';
import { P, avisar } from './dom';

const cuerpo = (raiz: HTMLElement) => raiz.querySelector<HTMLElement>(`[${P}table-body]`);
const filas = (raiz: HTMLElement) => [...(cuerpo(raiz)?.querySelectorAll<HTMLElement>(`[${P}row]`) ?? [])];

function valorDe(fila: HTMLElement, clave: string): { v: string; explicito: boolean } {
    const celda = fila.querySelector<HTMLElement>(`[${P}cell="${CSS.escape(clave)}"]`);
    const explicito = celda?.getAttribute(`${P}sort-value`);
    return explicito != null ? { v: explicito, explicito: true } : { v: (celda?.textContent ?? '').trim(), explicito: false };
}

function valorOrden(fila: HTMLElement, clave: string): string | number {
    const { v, explicito } = valorDe(fila, clave);
    if (!explicito) {
        const lang = fila.closest('[lang]')?.getAttribute('lang') ?? undefined;
        const local = numeroLocalizado(v, lang);
        if (local !== null) return local;
    }
    const n = Number(v);
    return v !== '' && Number.isFinite(n) ? n : v;
}

const ordenOriginal = new WeakMap<HTMLElement, HTMLElement[]>();

function filasEnOrdenOriginal(raiz: HTMLElement): HTMLElement[] {
    const actuales = filas(raiz);
    const previo = ordenOriginal.get(raiz);
    if (!previo) {
        ordenOriginal.set(raiz, actuales);
        return actuales;
    }
    const presentes = new Set(actuales);
    const conocidas = new Set(previo);
    const base = [...previo.filter((f) => presentes.has(f)), ...actuales.filter((f) => !conocidas.has(f))];
    ordenOriginal.set(raiz, base);
    return base;
}

function marcarOrden(raiz: HTMLElement, clave: string, dir: 'asc' | 'desc'): void {
    raiz.setAttribute(`${P}sort-key`, clave);
    raiz.setAttribute(`${P}sort-dir`, dir);
    for (const th of raiz.querySelectorAll<HTMLElement>(`[${P}th]`)) {
        const suya = th.getAttribute(`${P}key`) === clave;
        th.setAttribute('aria-sort', suya ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
        th.classList.toggle('is-sorted', suya);
    }
}

export function ordenar(raiz: HTMLElement, clave: string, dir: 'asc' | 'desc'): void {
    const tbody = cuerpo(raiz);
    if (!tbody) return;

    const ordenadas = sortBy(filasEnOrdenOriginal(raiz), (fila) => valorOrden(fila, clave), dir);
    tbody.replaceChildren(...ordenadas);

    marcarOrden(raiz, clave, dir);
    virtualizar(raiz);
}

export function virtualizar(raiz: HTMLElement): void {
    const alto = Number(raiz.getAttribute(`${P}row-height`) ?? 0);
    const scroller = raiz.querySelector<HTMLElement>(`[${P}table-scroll]`);
    const tbody = cuerpo(raiz);
    if (!alto || !scroller || !tbody) return;

    const todas = filas(raiz);
    const { start, end, padTop, padBottom } = computeVirtualWindow(
        scroller.scrollTop,
        scroller.clientHeight,
        alto,
        todas.length,
    );
    todas.forEach((f, i) => {
        f.hidden = i < start || i >= end;
    });
    tbody.classList.add('is-padded');
    setVars(tbody, { '--ts-table-pad-start': `${padTop}px`, '--ts-table-pad-end': `${padBottom}px` });
}

export function alHacerClick(destino: Element): boolean {
    const th = destino.closest<HTMLElement>(`[${P}th]`);
    if (!th) return false;
    const raiz = th.closest<HTMLElement>(`[${P}table]`);
    const clave = th.getAttribute(`${P}key`);
    if (!raiz || !clave) return false;

    const dir = getNextSortDir(
        raiz.getAttribute(`${P}sort-key`) ?? '',
        clave,
        (raiz.getAttribute(`${P}sort-dir`) as 'asc' | 'desc') ?? 'asc',
    );
    if (avisar(raiz, { component: 'table', key: clave, direction: dir })) ordenar(raiz, clave, dir);
    else marcarOrden(raiz, clave, dir);
    return true;
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    if (tecla !== 'Enter' && tecla !== ' ') return false;
    return destino.closest(`[${P}th]`) ? alHacerClick(destino) : false;
}

export function alDesplazar(destino: Element): boolean {
    const scroller = (destino as HTMLElement).closest?.(`[${P}table-scroll]`);
    const raiz = scroller?.closest<HTMLElement>(`[${P}table]`);
    if (!raiz) return false;
    virtualizar(raiz);
    return true;
}

export const ficha = {
    alDesplazar,
    alHacerClick,
    alPresionarTecla,
    virtualizar,
};
