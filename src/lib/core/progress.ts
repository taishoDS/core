// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { setVars } from './vars';
import { P } from './dom';

export const RELLENO = '[data-progress-fill]';

export function pintar(relleno: HTMLElement): void {
    const v = relleno.getAttribute(`${P}value`);
    setVars(relleno, { '--ts-progress-value': v === null || v === '' ? null : `${v}%` });
}

export const ficha = {
    RELLENO,
    pintar,
};
