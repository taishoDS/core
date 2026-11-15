// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { isAtBottom, pickActiveId } from './logica/toc';
import { P } from './dom';

const OFFSET_DEFECTO = 80;
const MARGEN_FONDO = 2;

function actualizar(nav: HTMLElement): void {
    const offset = Number(nav.getAttribute(`${P}offset`) ?? OFFSET_DEFECTO);
    const enlaces = [...nav.querySelectorAll<HTMLAnchorElement>(`[${P}scrollspy-link]`)];

    const tops = enlaces
        .map((a) => {
            const id = a.getAttribute('href')?.slice(1) ?? '';
            const destino = id ? document.getElementById(id) : null;
            return destino ? { id, top: destino.getBoundingClientRect().top } : null;
        })
        .filter((x): x is { id: string; top: number } => x !== null);

    const alFondo = isAtBottom(window.innerHeight, window.scrollY, document.documentElement.scrollHeight, MARGEN_FONDO);
    const activo = pickActiveId(tops, offset, alFondo);

    for (const a of enlaces) {
        const esActivo = a.getAttribute('href') === `#${activo}`;
        a.classList.toggle('is-active', esActivo);
        if (esActivo) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
    }
}

export function alDesplazar(root: Document | HTMLElement): void {
    for (const nav of root.querySelectorAll<HTMLElement>(`[${P}scrollspy]`)) actualizar(nav);
}

export const ficha = {
    alDesplazar,
};
