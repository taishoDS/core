// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';
import { sizing } from '../config/scales';

const repo = buildRepoConfig();
const plano = (css: string) => css.replace(/\s+/g, ' ');
const demanda = (content: string, cfg: TaishoConfig = repo) => plano(compile(cfg, [{ file: 'a.html', content }], { onDemand: true }).css);

describe('gap-{n}: lo que se emite', () => {
    it('gap-16 y los ejes', () => {
        const css = demanda('gap-16 gap-x-8 gap-y-4');
        expect(css).toContain(':where(.ts).gap-16 { gap: var(--ts-sizing-16); }');
        expect(css).toContain(':where(.ts).gap-x-8 { column-gap: var(--ts-sizing-8); }');
        expect(css).toContain(':where(.ts).gap-y-4 { row-gap: var(--ts-sizing-4); }');
    });
    it('con variante de contexto y de contenedor', () => {
        expect(demanda('md:gap-16')).toMatch(/@media \(width >= 48rem\) \{ :where\(\.ts\)\.md\\:gap-16 \{ gap: var\(--ts-sizing-16\); \} \}/);
        expect(demanda('@md:gap-x-8')).toContain('@container (width >= 28rem)');
    });
    it('los semánticos siguen igual', () => {
        const css = demanda('gap-base gap-x-half gap-y-none');
        expect(css).toContain(':where(.ts).gap-base { gap: var(--ts-gap-base); }');
        expect(css).toContain(':where(.ts).gap-x-half { column-gap: var(--ts-gap-half); }');
        expect(css).toContain(':where(.ts).gap-y-none { row-gap: var(--ts-gap-none); }');
    });
    it('a demanda, sin usarlo no entra', () => {
        expect(demanda('gap-base')).not.toContain('gap-16');
    });
    it('hay un gap-{n} por cada paso de sizing', () => {
        for (const k of Object.keys(sizing)) expect(demanda(`gap-${k}`), k).toContain(`gap: var(--ts-sizing-${k})`);
    });
});

describe('gap-{n} como utilidad propia', () => {
    it('una propia acepta gap-16 y md:gap-32', () => {
        const cfg: TaishoConfig = { ...repo, utilities: { 'fila-ancha': ['gap-16', 'md:gap-x-32'] } };
        expect(() => deriveThemeVocabulary(cfg)).not.toThrow();
        const css = demanda('fila-ancha', cfg);
        expect(css).toContain('.fila-ancha { gap: var(--ts-sizing-16); }');
        expect(css).toContain('@media (width >= 48rem) { .fila-ancha { column-gap: var(--ts-sizing-32); } }');
    });
});
