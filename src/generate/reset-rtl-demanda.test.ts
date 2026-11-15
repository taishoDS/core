// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import type { TaishoConfig } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';
import { podarReglaRtl, reglaRtl } from '../lib/theme/typography-scale';

const repo = buildRepoConfig();
const reglaDe = (css: string) => css.split(/\n|\}/).find((l) => l.includes(':lang(ar)')) ?? '';
const tokensDe = (regla: string) => new Set(regla.match(/--ts-(?:lh|ls)-[\w-]+(?=:)/g) ?? []);
const aDemanda = (config: TaishoConfig, ...archivos: string[]) =>
    compile(config, archivos.map((content, i) => ({ file: `f${i}.html`, content })), { onDemand: true }).css;

describe('regla RTL del reset a demanda', () => {
    const completa = reglaDe(compile(repo, []).css);

    it('el CSS completo la trae entera', () => {
        expect(tokensDe(completa).size).toBeGreaterThanOrEqual(20);
    });

    it('sin nada que lea interlineado ni tracking, la regla no sale', () => {
        expect(reglaDe(aDemanda(repo, '<div class="ts flex gap-base"></div>'))).toBe('');
    });

    it('un título redefine sus tokens, con el mismo valor que en el CSS completo', () => {
        const regla = reglaDe(aDemanda(repo, '<h1 class="ts type-heading-48">عنوان</h1>'));
        const tokens = tokensDe(regla);
        expect(tokens).toContain('--ts-lh-48');
        expect(tokens).not.toContain('--ts-lh-16');
        expect(tokens).not.toContain('--ts-ls-widest');
        expect(tokens.size).toBeLessThan(tokensDe(completa).size / 2);
        for (const d of regla.match(/--ts-[\w-]+: [^;]+;/g)!) expect(completa).toContain(d);
    });

    it('todo token de interlineado o tracking que el CSS de la selección lee queda redefinido', () => {
        const css = aDemanda(repo, '<label class="ts type-label-14">اسم</label><h2 class="ts type-heading-24">t</h2><p class="ts type-copy-16 tracking-wide leading-20">p</p><button class="ts button">b</button>');
        const resto = css.slice(css.indexOf('@layer utilities'));
        const leidos = new Set((resto.match(/var\(--ts-(?:lh|ls)-[\w-]+/g) ?? []).map((v) => v.slice(4)).filter((t) => t !== '--ts-ls-normal'));
        expect(leidos.size).toBeGreaterThan(0);
        const redefinidos = tokensDe(reglaDe(css));
        expect([...leidos].filter((t) => !redefinidos.has(t))).toEqual([]);
    });

    it('un token nombrado fuera de las clases (el CSS propio) también se conserva', () => {
        const css = aDemanda(repo, '<div class="ts flex"></div>', '.titulo { line-height: var(--ts-lh-16); letter-spacing: var(--ts-ls-wide); }');
        expect(tokensDe(reglaDe(css))).toEqual(new Set(['--ts-lh-16', '--ts-ls-wide']));
    });

    it('un nivel de extend sale con su interlineado si el proyecto lo usa', () => {
        const config: TaishoConfig = { ...repo, extend: { fontSizes: { '30': '30px' }, lineHeights: { '30': '36px' } } };
        expect(reglaDe(aDemanda(config, '<h1 class="ts type-heading-30">t</h1>'))).toContain('--ts-lh-30: max(1.35em, 36px);');
        expect(reglaDe(aDemanda(config, '<h1 class="ts type-heading-48">t</h1>'))).not.toContain('--ts-lh-30');
    });
});

describe('podarReglaRtl', () => {
    it('deja sólo las declaraciones vivas y el resto del CSS tal cual', () => {
        const css = `a { b: c; }\n${reglaRtl(['--ts-lh-16: max(1.35em, 24px);', '--ts-ls-tight: 0em;', '--ts-ls-wide: 0em;'])}\nz { y: x; }`;
        expect(podarReglaRtl(css, new Set(['--ts-lh-16', '--ts-ls-wide']))).toBe(`a { b: c; }\n${reglaRtl(['--ts-lh-16: max(1.35em, 24px);', '--ts-ls-wide: 0em;'])}\nz { y: x; }`);
    });
    it('sin vivas, quita la regla; sin regla, no toca nada', () => {
        const css = `a { b: c; }\n${reglaRtl(['--ts-ls-tight: 0em;'])}\nz { y: x; }`;
        expect(podarReglaRtl(css, new Set())).toBe('a { b: c; }\n\nz { y: x; }');
        expect(podarReglaRtl('a { b: c; }', new Set(['--ts-ls-tight']))).toBe('a { b: c; }');
    });
});
