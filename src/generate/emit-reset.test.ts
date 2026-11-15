// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { RESET_FOCO } from './foco';
import { describe, it, expect } from 'vitest';
import { buildResetCSS } from './emit-reset';

const css = buildResetCSS();

describe('buildResetCSS', () => {
    it('es una función pura (misma entrada → misma salida)', () => {
        expect(buildResetCSS()).toBe(css);
    });

    it('cubre lo que reemplaza del Preflight de Tailwind', () => {
        expect(css).toContain('*, *::before, *::after { box-sizing: border-box; }');
        expect(css).toContain('* { margin: 0; }');
        expect(css).toContain('h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; }');
        expect(css).toContain('ul, ol { list-style: none; padding: 0; }');
        expect(css).toContain('table { border-collapse: collapse; border-spacing: 0; }');
        expect(css).toContain('a { color: inherit; text-decoration: inherit; }');
        expect(css).toContain('input, button, textarea, select { font: inherit;');
        expect(css).toContain('[hidden] { display: none !important; }');
    });

    it('es theme-agnóstico: todo color sale de un token, ningún literal', () => {
        expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(css).not.toMatch(/\b(rgba?|hsla?|oklch)\(/);
        expect(css).toContain('background-color: var(--color-background-200);');
        expect(css).toContain('color: var(--color-gray-1000);');
    });

    it('declara los dos color-scheme (base del light-dark() de los tokens)', () => {
        expect(css).toContain(':root { color-scheme: light; }');
        expect(css).toContain('.dark { color-scheme: dark; }');
    });

    it('graba la versión del Core en `--ts-version` (la lee el JS para avisar si no coincide)', () => {
        expect(buildResetCSS('class', undefined, '1.2.3')).toContain(':root { --ts-version: "1.2.3"; }');
        expect(buildResetCSS('class', undefined, '')).not.toContain('--ts-version');
        expect(css).toMatch(/:root \{ --ts-version: "\d+\.\d+\.\d+[^"]*"; \}/);
    });

    it('el aro (box-shadow) del reset no alcanza a los elementos del DS: `outline: none` no lo apagaría (el <input> de un campo tendría dos aros)', () => {
        expect(RESET_FOCO).toMatch(/^:focus-visible:where\(:not\(\.ts\)\) \{[^}]*box-shadow/);
        const respaldo = RESET_FOCO.slice(RESET_FOCO.indexOf(':where(.ts):focus-visible'));
        expect(respaldo).toContain('outline:');
        expect(respaldo).not.toContain('box-shadow');
    });

    it('el foco visible es el del DS (`foco.ts`), y solo en :focus-visible', () => {
        expect(css).toContain(':focus { outline: none; }');
        expect(css).toContain(RESET_FOCO);
    });

    it('respeta prefers-reduced-motion para el scroll suave', () => {
        expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\n\s+html \{ scroll-behavior: smooth; \}/);
    });

    it('árabe, persa, urdu y hebreo: sin tracking y con interlineado de al menos 1,35, en una sola regla', () => {
        const reglas = css.split('\n').filter((l) => l.includes(':lang('));
        expect(reglas).toHaveLength(1);
        for (const lang of ['ar', 'fa', 'ur', 'he']) expect(reglas[0]).toContain(`:lang(${lang})`);
        expect(reglas[0]).not.toMatch(/:lang\([^)]*,/);
        expect(reglas[0]).toContain('--ts-ls-tighter: 0em;');
        expect(reglas[0]).toContain('--ts-lh-16: max(1.35em, 24px);');
        expect(reglas[0]).not.toContain('var(');
    });
});
