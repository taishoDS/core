// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { setVars } from './vars';
import { P } from './dom';

export function alMoverPuntero(destino: Element, x: number, y: number): boolean {
    const card = destino.closest<HTMLElement>(`[${P}spotlight]`);
    if (!card) return false;

    const r = card.getBoundingClientRect();
    setVars(card, { '--ts-spotlight-x': `${x - r.left}px`, '--ts-spotlight-y': `${y - r.top}px` });
    return true;
}

export function alSalirPuntero(destino: Element): boolean {
    const card = destino.closest<HTMLElement>(`[${P}spotlight]`);
    if (!card) return false;
    setVars(card, { '--ts-spotlight-x': null, '--ts-spotlight-y': null });
    return true;
}

export const ficha = {
    alMoverPuntero,
    alSalirPuntero,
};
