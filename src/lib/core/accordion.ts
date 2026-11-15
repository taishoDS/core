// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { toggleOpen } from './logica/accordion';
import { P, avisar, contenedor, partes } from './dom';

const TRIGGER = `summary[${P}accordion-trigger]`;

function valorDe(item: HTMLElement): string {
    return item.getAttribute(`${P}value`) ?? '';
}

function abiertos(raiz: HTMLElement): string[] {
    return partes(raiz, 'accordion', 'item')
        .filter((item) => (item as HTMLDetailsElement).open)
        .map(valorDe);
}

function pintar(raiz: HTMLElement, valores: string[]): void {
    for (const item of partes(raiz, 'accordion', 'item') as HTMLDetailsElement[]) {
        const abierto = valores.includes(valorDe(item));
        if (item.open !== abierto) item.open = abierto;
    }
}

function soloUno(raiz: HTMLElement, preferido?: string): void {
    if (raiz.hasAttribute(`${P}multiple`)) return;
    const valores = abiertos(raiz);
    if (valores.length > 1) pintar(raiz, preferido !== undefined && valores.includes(preferido) ? [preferido] : valores.slice(0, 1));
}

export function preparar(raiz: HTMLElement): void {
    soloUno(raiz);
}

export function alHacerClick(destino: Element, evento?: Event): boolean {
    const trigger = destino.closest<HTMLElement>(TRIGGER);
    if (!trigger) return false;
    evento?.preventDefault();
    if (trigger.getAttribute('aria-disabled') === 'true') return true;

    const raiz = contenedor(trigger, 'accordion');
    const item = contenedor(trigger, 'accordion-item');
    if (!raiz || !item) return false;

    const valor = valorDe(item);
    const nuevos = toggleOpen(abiertos(raiz), valor, raiz.hasAttribute(`${P}multiple`));

    if (!avisar(raiz, { component: 'accordion', value: valor, openItems: nuevos })) return true;

    pintar(raiz, nuevos);
    return true;
}

export function alCambiarExpandido(destinos: Element[]): void {
    const vistos = new Set<HTMLElement>();
    for (const destino of [...destinos].reverse()) {
        if (!destino.matches(`details[${P}accordion-item]`)) continue;
        const raiz = contenedor(destino, 'accordion');
        if (!raiz || vistos.has(raiz)) continue;
        vistos.add(raiz);
        soloUno(raiz, destino.hasAttribute('open') ? valorDe(destino as HTMLElement) : undefined);
    }
}

export const ficha = {
    alCambiarExpandido,
    alHacerClick,
    preparar,
};
