// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { P } from './dom';
import { textoDe } from './textos';

const TEXTOS = {
    es: { buttonLoading: 'Cargando' },
    en: { buttonLoading: 'Loading' },
};

/**
 * Un botón con `aria-disabled="true"` (el que está cargando) sigue enfocable, pero no se activa: ni su click, ni Enter o
 * Espacio, ni lo que se le haya escuchado. En captura, para llegar antes que quien escucha en el propio botón.
 */
export function alClickInactivo(e: Event): void {
    const boton = (e.target as Element | null)?.closest?.('.button[aria-disabled="true"]');
    if (!boton) return;
    e.preventDefault();
    e.stopImmediatePropagation();
}

const previo = new WeakMap<HTMLElement, string | null>();

/**
 * Marca el botón (o el enlace con aspecto de botón) como cargando o no: `is-loading`, `aria-busy`, `aria-disabled` (sigue
 * enfocable, pero no se activa) y el texto «Cargando» para el lector de pantalla, que sale del idioma de la página.
 */
export function cargando(boton: HTMLElement, loading: boolean): void {
    const veniaCargando = boton.classList.contains('is-loading');
    boton.classList.toggle('is-loading', loading);
    if (loading) {
        // El aria-disabled que ya tenía (no el que pone la carga) se guarda una sola vez, aunque se llame varias veces con `true`.
        if (!previo.has(boton)) previo.set(boton, boton.getAttribute('aria-disabled'));
        boton.setAttribute('aria-busy', 'true');
        boton.setAttribute('aria-disabled', 'true');
    } else {
        boton.removeAttribute('aria-busy');
        if (previo.has(boton)) {
            const antes = previo.get(boton);
            previo.delete(boton);
            if (antes === null || antes === undefined) boton.removeAttribute('aria-disabled');
            else boton.setAttribute('aria-disabled', antes);
        } else if (veniaCargando) boton.removeAttribute('aria-disabled');
    }
    const marca = boton.querySelector<HTMLElement>('.spinner')?.parentElement;
    if (!marca) return;
    marca.querySelector(`[${P}loading-text]`)?.remove();
    if (!loading) return;
    const texto = document.createElement('span');
    texto.className = 'ts sr-only';
    texto.setAttribute(`${P}loading-text`, '');
    texto.textContent = textoDe(boton, TEXTOS, 'buttonLoading');
    marca.appendChild(texto);
}

export const ficha = {
    alClickInactivo,
};
