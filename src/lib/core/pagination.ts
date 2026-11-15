// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { buildPages, getPageLabel, pageLabelFrom } from './logica/pagination';
import { P, avisar, contenedor } from './dom';
import { textoDe } from './textos';

const TEXTOS = {
    es: { pageRangeTemplate: '{from}–{to} de {total}', pageRangeEmpty: '0 resultados' },
    en: { pageRangeTemplate: '{from}–{to} of {total}', pageRangeEmpty: 'No results' },
};

const num = (el: HTMLElement, attr: string, def: number): number => {
    const v = Number(el.getAttribute(P + attr));
    return Number.isFinite(v) && v > 0 ? v : def;
};

export function pintar(raiz: HTMLElement): void {
    const lista = raiz.querySelector<HTMLElement>(`[${P}pagination-list]`);
    if (!lista) return;

    const total = num(raiz, 'total', 1);
    const actual = num(raiz, 'page', 1);
    const paginas = buildPages(actual, total, num(raiz, 'siblings', 1), num(raiz, 'boundaries', 1));

    const modeloItem = lista.querySelector<HTMLElement>(`[${P}page-item]`);
    const modeloPuntos = lista.querySelector<HTMLElement>(`[${P}page-ellipsis]`);
    if (!modeloItem) return;

    const modeloValor = Number(modeloItem.getAttribute(`${P}value`));
    const modeloNombre = modeloItem.getAttribute('aria-label');

    const nuevos = paginas.map((p) => {
        if (p === 'ellipsis') {
            const el = modeloPuntos
                ? (modeloPuntos.cloneNode(true) as HTMLElement)
                : document.createElement('span');
            el.setAttribute(`${P}page-ellipsis`, '');
            el.setAttribute('aria-hidden', 'true');
            if (!modeloPuntos) el.textContent = '…';
            return el;
        }
        const el = modeloItem.cloneNode(true) as HTMLElement;
        el.setAttribute(`${P}value`, String(p));
        (el.querySelector('[data-ts-content]') ?? el).textContent = String(p);
        if (modeloNombre) el.setAttribute('aria-label', pageLabelFrom(modeloNombre, modeloValor, p));
        el.classList.toggle('is-active', p === actual);
        if (p === actual) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
        return el;
    });

    const conFoco = lista.contains(document.activeElement);
    lista.replaceChildren(...nuevos);
    // Los botones son clones nuevos: si el foco estaba en uno, pasa a la página activa (WCAG 2.4.3).
    if (conFoco) lista.querySelector<HTMLElement>('[aria-current="page"]')?.focus();

    const prev = raiz.querySelector<HTMLButtonElement>(`[${P}page-prev]`);
    const next = raiz.querySelector<HTMLButtonElement>(`[${P}page-next]`);
    if (prev) prev.disabled = actual <= 1;
    if (next) next.disabled = actual >= total;
    const primera = raiz.querySelector<HTMLButtonElement>(`[${P}page-first]`);
    const ultima = raiz.querySelector<HTMLButtonElement>(`[${P}page-last]`);
    if (primera) primera.disabled = actual <= 1;
    if (ultima) ultima.disabled = actual >= total;

    const etiqueta = raiz.querySelector<HTMLElement>(`[${P}page-label]`);
    if (etiqueta && raiz.hasAttribute(`${P}items`)) {
        const items = Number(raiz.getAttribute(`${P}items`));
        etiqueta.textContent = getPageLabel(
            actual,
            num(raiz, 'page-size', 10),
            Number.isFinite(items) ? items : 0,
            raiz.getAttribute(`${P}label-template`) ?? textoDe(raiz, TEXTOS, 'pageRangeTemplate'),
            raiz.getAttribute(`${P}label-empty`) ?? textoDe(raiz, TEXTOS, 'pageRangeEmpty'),
        );
    }
}

function irA(raiz: HTMLElement, pagina: number): void {
    const total = num(raiz, 'total', 1);
    const destino = Math.max(1, Math.min(pagina, total));
    if (destino === num(raiz, 'page', 1)) return;
    if (!avisar(raiz, { component: 'pagination', page: destino })) return;
    raiz.setAttribute(`${P}page`, String(destino));
    pintar(raiz);
}

export function alHacerClick(destino: Element): boolean {
    const boton = destino.closest<HTMLElement>(
        `[${P}page-item], [${P}page-prev], [${P}page-next], [${P}page-first], [${P}page-last]`,
    );
    if (!boton || boton.hasAttribute('disabled')) return false;
    const raiz = contenedor(boton, 'pagination');
    if (!raiz) return false;

    const actual = num(raiz, 'page', 1);
    if (boton.hasAttribute(`${P}page-prev`)) irA(raiz, actual - 1);
    else if (boton.hasAttribute(`${P}page-next`)) irA(raiz, actual + 1);
    else if (boton.hasAttribute(`${P}page-first`)) irA(raiz, 1);
    else if (boton.hasAttribute(`${P}page-last`)) irA(raiz, num(raiz, 'total', 1));
    else irA(raiz, Number(boton.getAttribute(`${P}value`)));
    return true;
}

export function alCambiarTamano(e: Event): void {
    const destino = e.target as Element | null;
    const detalle = (e as CustomEvent).detail as { component?: string; value?: string } | undefined;
    if (!destino?.closest || detalle?.component === 'pagination') return;
    if (!destino.closest(`[${P}page-size-control]`)) return;
    const raiz = contenedor(destino, 'pagination');
    if (!raiz) return;
    const tamano = Number(detalle?.value);
    if (!Number.isFinite(tamano) || tamano <= 0 || tamano === num(raiz, 'page-size', 10)) return;
    raiz.setAttribute(`${P}page-size`, String(tamano));
    raiz.setAttribute(`${P}total`, String(Math.max(1, Math.ceil(num(raiz, 'items', 0) / tamano))));
    raiz.setAttribute(`${P}page`, '1');
    avisar(raiz, { component: 'pagination', page: 1, pageSize: tamano });
    pintar(raiz);
}

export const ficha = {
    alCambiarTamano,
    alHacerClick,
    pintar,
};
