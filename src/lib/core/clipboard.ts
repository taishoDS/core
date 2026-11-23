// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { COPY_ACK_MS } from './logica/code';
import { P, avisar } from './dom';

interface Acuse {
    temporizador: ReturnType<typeof setTimeout>;
    etiqueta: string | null;
    icono: Element | null;
}
const acuses = new WeakMap<HTMLElement, Acuse>();

function terminarAcuse(boton: HTMLElement): void {
    const acuse = acuses.get(boton);
    if (!acuse) return;
    clearTimeout(acuse.temporizador);
    acuses.delete(boton);
    if (acuse.etiqueta === null) boton.removeAttribute('aria-label');
    else boton.setAttribute('aria-label', acuse.etiqueta);
    const tilde = boton.querySelector('svg');
    if (acuse.icono && tilde && tilde !== acuse.icono) tilde.replaceWith(acuse.icono);
    boton.classList.remove('is-copied');
    boton.removeAttribute(`${P}copied`);
    estado(boton)?.replaceChildren();
}

/** Región viva hermana del botón: el lector anuncia el acuse aunque el foco no se mueva. */
function estado(boton: HTMLElement): Element | null {
    return boton.parentElement?.querySelector(`:scope > [${P}copy-status]`) ?? null;
}

function acusar(boton: HTMLElement): void {
    const previo = acuses.get(boton);
    const etiqueta = previo ? previo.etiqueta : boton.getAttribute('aria-label');
    const icono = previo ? previo.icono : boton.querySelector('svg');
    if (previo) clearTimeout(previo.temporizador);

    const nombre = boton.getAttribute(`${P}copied-label`);
    if (nombre) boton.setAttribute('aria-label', nombre);
    const tilde = boton.querySelector<HTMLTemplateElement>(`template[${P}copied-icon]`)?.content.firstElementChild;
    const actual = boton.querySelector('svg');
    if (tilde && actual && !previo) actual.replaceWith(tilde.cloneNode(true));
    boton.classList.add('is-copied');
    boton.setAttribute(`${P}copied`, '');
    if (nombre) estado(boton)?.replaceChildren(nombre);

    const temporizador = setTimeout(() => terminarAcuse(boton), COPY_ACK_MS);
    acuses.set(boton, { temporizador, etiqueta, icono });
}

function textoACopiar(boton: HTMLElement): string | null {
    const selector = boton.getAttribute(`${P}copy`);
    const fuente = selector
        ? document.querySelector<HTMLElement>(selector)
        : boton.closest('div')?.querySelector<HTMLElement>('pre, code');
    return fuente?.textContent ?? null;
}

export function alHacerClick(destino: Element): boolean {
    const boton = destino.closest<HTMLElement>(`[${P}copy]`);
    if (!boton) return false;

    const texto = textoACopiar(boton);
    if (texto === null) return false;
    if (!avisar(boton, { component: 'copy', text: texto })) return true;

    void navigator.clipboard?.writeText(texto).then(
        () => acusar(boton),
        () => {
        },
    );
    return true;
}

export const ficha = {
    alHacerClick,
};
