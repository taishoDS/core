// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { getInitials } from './logica/avatar';
import { P, avisar } from './dom';

function aplicarRespaldo(raiz: HTMLElement, imagen: HTMLImageElement): boolean {
    const nombre = raiz.getAttribute(`${P}name`) ?? imagen.getAttribute('alt') ?? '';
    if (!avisar(raiz, { component: 'avatar', failed: true, name: nombre })) return false;

    const etiqueta = imagen.getAttribute('alt') ?? nombre;
    const medios = raiz.querySelector<HTMLElement>('[data-avatar-media]') ?? raiz;
    imagen.remove();
    if (etiqueta) {
        medios.setAttribute('role', 'img');
        medios.setAttribute('aria-label', etiqueta);
    }
    if (!raiz.querySelector(`[${P}avatar-initials]`)) {
        const span = document.createElement('span');
        span.setAttribute(`${P}avatar-initials`, '');
        span.setAttribute('aria-hidden', 'true');
        span.textContent = getInitials(nombre);
        medios.appendChild(span);
    }
    return true;
}

export function alFallarImagen(destino: Element): boolean {
    if (!(destino instanceof HTMLImageElement)) return false;
    const raiz = destino.closest<HTMLElement>(`[${P}avatar]`);
    if (!raiz) return false;
    aplicarRespaldo(raiz, destino);
    return true;
}

export function revisarRotas(root: Document | HTMLElement): void {
    for (const imagen of root.querySelectorAll<HTMLImageElement>(`[${P}avatar] img`)) {
        if (imagen.getAttribute('src') && imagen.complete && imagen.naturalWidth === 0) {
            alFallarImagen(imagen);
        }
    }
}

export const ficha = {
    alFallarImagen,
    revisarRotas,
};
