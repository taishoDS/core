// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { setVars } from './vars';
import { P } from './dom';

export const MEDIDAS = `[${P}ratio], [${P}max-height], [${P}max-width]`;

export function pintar(el: HTMLElement): void {
    const leer = (a: string) => el.getAttribute(`${P}${a}`) || null;
    setVars(el, {
        '--ts-aspect-ratio': leer('ratio'),
        '--ts-scroll-area-max-h': leer('max-height'),
        '--ts-scroll-area-max-w': leer('max-width'),
    });
}

export const ficha = {
    MEDIDAS,
    pintar,
};
