// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { buildRepoConfig } from '../config/pipeline';

const config = buildRepoConfig();
const css = (clases: string) => compile(config, [{ file: 'a.html', content: `<div class="ts ${clases}">` }], { onDemand: true }).css;
const regla = (hoja: string, clase: string) => hoja.match(new RegExp(`:where\\(\\.ts\\)\\.${clase.replace(/[:]/g, '\\\\:')} \\{([^}]*)\\}`))?.[1].replace(/\s+/g, ' ').trim();

describe('auto: mt-auto, mb-auto, col-span-auto, col-start-auto', () => {
    const hoja = css('mt-auto mb-auto col-span-auto col-start-auto md:col-span-auto');
    it('emite la declaración exacta de cada una', () => {
        expect(regla(hoja, 'mt-auto')).toBe('margin-top: auto;');
        expect(regla(hoja, 'mb-auto')).toBe('margin-bottom: auto;');
        expect(regla(hoja, 'col-span-auto')).toBe('grid-column: auto;');
        expect(regla(hoja, 'col-start-auto')).toBe('grid-column-start: auto;');
    });
    it('a demanda, quien no las usa no las paga', () => {
        const sin = css('mx-auto');
        for (const c of ['mt-auto', 'mb-auto', 'col-span-auto', 'col-start-auto']) expect(sin).not.toContain(`.${c}`);
    });
    it('las variantes salen solas', () => {
        expect(hoja).toMatch(/\.md\\:col-span-auto/);
    });
});

describe('safe: pt-safe, pb-safe, ps-safe, pe-safe (sólo el área segura, propiedades lógicas)', () => {
    const hoja = css('pt-safe pb-safe ps-safe pe-safe');
    it('emite la declaración exacta de cada una', () => {
        expect(regla(hoja, 'pt-safe')).toBe('padding-top: env(safe-area-inset-top, 0px);');
        expect(regla(hoja, 'pb-safe')).toBe('padding-bottom: env(safe-area-inset-bottom, 0px);');
    });
    const plano = hoja.replace(/\s+/g, ' ');
    it('ps-safe y pe-safe: inset izquierdo/derecho en LTR, intercambiados en RTL (las áreas seguras son físicas)', () => {
        expect(plano).toContain(':where(.ts).ps-safe { padding-inline-start: env(safe-area-inset-left, 0px); &:where(:dir(rtl)) { padding-inline-start: env(safe-area-inset-right, 0px); } }');
        expect(plano).toContain(':where(.ts).pe-safe { padding-inline-end: env(safe-area-inset-right, 0px); &:where(:dir(rtl)) { padding-inline-end: env(safe-area-inset-left, 0px); } }');
    });
    it('quien no las usa no las paga', () => {
        expect(css('p-base')).not.toContain('safe-area');
    });
});
