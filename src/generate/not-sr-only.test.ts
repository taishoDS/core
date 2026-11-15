// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { buildRepoConfig } from '../config/pipeline';

const config = buildRepoConfig();
const css = (clases: string) => compile(config, [{ file: 'a.html', content: `<a class="ts ${clases}">` }], { onDemand: true }).css;

/** Posición de una regla dentro de la capa, o -1. */
function capaDe(hoja: string, selector: string): { capa: string; pos: number } {
    const pos = hoja.indexOf(selector);
    const capa = [...hoja.slice(0, pos).matchAll(/@layer ([\w-]+) \{/g)].pop()?.[1] ?? '';
    return { capa, pos };
}

describe('not-sr-only: deshace sr-only para componer con focus:', () => {
    it('emite exactamente las 8 declaraciones que anulan a sr-only (sin border)', () => {
        const regla = css('not-sr-only').match(/:where\(\.ts\)\.not-sr-only \{([^}]*)\}/)?.[1] ?? '';
        const decl = regla.split(';').map((d) => d.replace(/\s+/g, ' ').trim()).filter(Boolean);
        expect(decl).toEqual([
            'position: static', 'width: auto', 'height: auto', 'padding: 0', 'margin: 0',
            'overflow: visible', 'clip: auto', 'white-space: normal',
        ]);
    });

    it('focus:not-sr-only cae en utility-states y se emite antes que focus:fixed y focus:p-half', () => {
        const hoja = css('sr-only focus:not-sr-only focus:fixed focus:p-half');
        const base = capaDe(hoja, '.focus\\:not-sr-only');
        const fixed = capaDe(hoja, '.focus\\:fixed');
        const pad = capaDe(hoja, '.focus\\:p-half');
        expect(base.capa).toBe('utility-states');
        expect(fixed.capa).toBe('utility-states');
        expect(pad.capa).toBe('utility-states');
        expect(base.pos).toBeGreaterThan(-1);
        expect(base.pos).toBeLessThan(fixed.pos);
        expect(base.pos).toBeLessThan(pad.pos);
    });
});
