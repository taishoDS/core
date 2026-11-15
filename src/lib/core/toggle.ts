// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { firstRevealedLink } from './logica/breadcrumbs';
import { cierraConClickAfuera, cierraConEscape } from './logica/nav-bar';
import { P, avisar, mostrar } from './dom';

function aplicar(boton: HTMLElement, nombre: string, objetivos: HTMLElement[], abierto: boolean): boolean {
    if (!avisar(boton, { component: 'toggle', name: nombre, open: abierto })) return false;
    boton.setAttribute('aria-expanded', String(abierto));
    boton.classList.toggle('is-open', abierto);
    for (const o of objetivos) mostrar(o, abierto);
    return true;
}

const destinosDe = (nombre: string): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>(`[${P}toggle-target="${CSS.escape(nombre)}"]`),
];

export function alHacerClick(destino: Element): boolean {
    const boton = destino.closest<HTMLElement>(`[${P}toggle]`);
    if (!boton || boton.hasAttribute('disabled')) return false;

    const nombre = boton.getAttribute(`${P}toggle`);
    if (!nombre) return false;

    const objetivos = destinosDe(nombre);
    if (objetivos.length === 0) return false;

    const abierto = boton.getAttribute('aria-expanded') !== 'true';
    if (!aplicar(boton, nombre, objetivos, abierto)) return true;

    const reemplazados = [...document.querySelectorAll<HTMLElement>(`[${P}toggle-hide="${CSS.escape(nombre)}"]`)];
    if (abierto && reemplazados.length > 0) {
        const conFoco = boton.contains(document.activeElement) || document.activeElement === boton;
        for (const r of reemplazados) mostrar(r, false);
        if (conFoco) firstRevealedLink(objetivos)?.focus();
    }
    return true;
}

export function alPresionarTecla(_destino: Element, tecla: string): boolean {
    if (!cierraConEscape(tecla, true)) return false;
    let cerro = false;
    const botones = document.querySelectorAll<HTMLElement>(
        `[${P}toggle][${P}toggle-escape][aria-expanded="true"]`,
    );
    for (const boton of botones) {
        const nombre = boton.getAttribute(`${P}toggle`);
        const objetivos = nombre ? destinosDe(nombre) : [];
        if (!nombre || objetivos.length === 0) continue;
        const conFocoAdentro = objetivos.some((o) => o.contains(document.activeElement));
        if (!aplicar(boton, nombre, objetivos, false)) continue;
        if (conFocoAdentro) boton.focus();
        cerro = true;
    }
    return cerro;
}

export function alPresionarAfuera(destino: Element): boolean {
    let cerro = false;
    const botones = document.querySelectorAll<HTMLElement>(
        `[${P}toggle][${P}toggle-outside][aria-expanded="true"]`,
    );
    for (const boton of botones) {
        const nombre = boton.getAttribute(`${P}toggle`);
        const objetivos = nombre ? destinosDe(nombre) : [];
        if (!nombre || objetivos.length === 0) continue;
        const raiz = boton.closest<HTMLElement>(`[${P}toggle-root]`) ?? boton.parentElement;
        if (!cierraConClickAfuera(true, !!raiz?.contains(destino))) continue;
        if (aplicar(boton, nombre, objetivos, false)) cerro = true;
    }
    return cerro;
}

export const ficha = {
    alHacerClick,
    alPresionarAfuera,
    alPresionarTecla,
};
