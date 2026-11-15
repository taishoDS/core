// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { buildRepoConfig } from '../config/pipeline';
import type { TaishoConfig } from './vocabulary';
import { separarItems } from './emit-cdn';

const config: TaishoConfig = buildRepoConfig();
const demanda = (html: string, extra: Partial<TaishoConfig> = {}) =>
    compile({ ...config, ...extra }, [{ file: 'a.html', content: html }], { onDemand: true }).css;
const capa = (css: string, nombre: string) => separarItems(css).find((i) => i.startsWith(`@layer ${nombre} {`)) ?? '';
const tonosEn = (css: string) => [...css.matchAll(/^ {2}&\.(variant-[A-Za-z0-9-]+?-\d+) \{$/gm)].map((m) => m[1]);
const tonosDe = (css: string) => tonosEn(capa(css, 'components'));
const BOTON = '<button class="ts button variant-primary">';
const TODOS = demanda(BOTON, { safelist: ['variant-*'] });

describe('Button: los tonos a demanda', () => {
    it('sin ningún tono en el código no sale ninguno; el archivo completo los trae todos', () => {
        expect(tonosDe(demanda(BOTON))).toEqual([]);
        expect(tonosDe(TODOS)).toHaveLength(70);
        expect(tonosDe(compile(config, []).css)).toHaveLength(70);
    });

    it('la cascada de lo que se usa queda igual: la salida es la completa menos los tonos que nadie nombra', () => {
        const html = '<button class="ts button variant-danger-300"></button><button class="ts button variant-brand-1000">';
        const podado = demanda(html);
        expect(tonosDe(podado)).toEqual(['variant-danger-300', 'variant-brand-1000'].sort((a, b) => tonosDe(TODOS).indexOf(a) - tonosDe(TODOS).indexOf(b)));
        const completo = demanda(html, { safelist: ['variant-*'] });
        const sinNoUsados = completo.replace(/(?<=\n) {2}&\.variant-([A-Za-z0-9-]+?-\d+) \{\n[\s\S]*?\n {2}\}\n\n/g, (r, t) => (['danger-300', 'brand-1000'].includes(t) ? r : ''));
        expect(podado.length).toBeLessThan(completo.length);
        expect(capa(podado, 'components')).toBe(capa(sinNoUsados, 'components'));
        expect(tonosEn(capa(podado, 'states'))).toEqual(tonosDe(podado));
        expect(tonosEn(capa(completo, 'states'))).toEqual(tonosDe(completo));
    });

    it('el valor de la prop (`variant="brand-500"`) cuenta como nombrar el tono', () => {
        expect(tonosDe(demanda('<Button variant="brand-500">'))).toEqual([]);
        expect(tonosDe(demanda('<button class="ts button" data-x="brand-500">'))).toEqual(['variant-brand-500']);
    });

    it('el `safelist` pide un tono, una familia o todos', () => {
        expect(tonosDe(demanda(BOTON, { safelist: ['variant-success-200'] }))).toEqual(['variant-success-200']);
        expect(tonosDe(demanda(BOTON, { safelist: ['variant-danger-*'] }))).toHaveLength(10);
        expect(tonosDe(demanda(BOTON, { safelist: ['variant-*'] }))).toHaveLength(70);
    });

    it('un tono que no existe en el `safelist` es un error con sugerencia', () => {
        expect(() => demanda(BOTON, { safelist: ['variant-brand-550'] })).toThrow(/variant-brand-550.*no existe/);
    });

    it('un fragmento armado en runtime (`variant-${x}`) deja todos los tonos', () => {
        expect(tonosDe(demanda('<button class="ts button variant-${v}">'))).toHaveLength(70);
        expect(tonosDe(demanda('<button class="ts button variant-{v}">'))).toHaveLength(70);
    });

    it('sólo se poda el Button: el resto de los componentes no cambia', () => {
        const html = '<div class="ts badge"></div><button class="ts button variant-primary">';
        const a = demanda(html);
        const b = demanda(html, { safelist: ['variant-*'] });
        const sinTonos = b.replace(/(?<=\n) {2}&\.variant-([A-Za-z0-9-]+?-\d+) \{\n[\s\S]*?\n {2}\}\n\n/g, '');
        expect(capa(a, 'components')).toBe(capa(sinTonos, 'components'));
        expect(capa(a, 'utilities')).toBe(capa(b, 'utilities'));
        expect(tonosEn(capa(a, 'states'))).toEqual([]);
    });
});
