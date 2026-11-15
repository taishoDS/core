// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { conRespaldo, buildFontsCSS } from './emit-fonts';
import { respaldosDeFuentes, validarEstilosDeFuentes } from './respaldo-fuentes';
import { ConfigError } from './errores-config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('respaldo ajustado de las fuentes', () => {
    const faces = [
        { source: '@fontsource/geist-sans', subsets: ['latin'], weights: [300, 400, 500] },
        { source: '@fontsource/geist-mono', subsets: ['latin'], weights: [400] },
    ];

    it('lee las métricas del .woff instalado y ajusta Arial y Courier New', () => {
        const [sans, mono] = respaldosDeFuentes(faces, process.cwd());
        expect(sans).toMatchObject({ familia: 'Geist Sans', local: 'Arial', sizeAdjust: '106.48%', ascent: '86.40%', descent: '20.66%' });
        expect(mono).toMatchObject({ familia: 'Geist Mono', local: 'Courier New' });
        expect(sans.unicodeRange).toMatch(/^U\+0000-00FF/);
        expect(buildFontsCSS(faces, [sans])).toContain('@font-face { font-family: "Geist Sans Fallback"; src: local("Arial"); size-adjust: 106.48%;');
    });

    it('un paquete que no está se saltea sin cortar la generación', () => {
        expect(respaldosDeFuentes([{ source: '@fontsource/no-existe', subsets: ['latin'], weights: [400] }], process.cwd())).toEqual([]);
    });

    it('la pila nombra el respaldo después de su primera familia, y sólo una vez', () => {
        expect(conRespaldo('"Geist Sans", ui-sans-serif, sans-serif')).toBe('"Geist Sans", "Geist Sans Fallback", ui-sans-serif, sans-serif');
        expect(conRespaldo("'Inter', sans-serif")).toBe(`'Inter', "Inter Fallback", sans-serif`);
        expect(conRespaldo('system-ui, sans-serif')).toBe('system-ui, sans-serif');
        const una = conRespaldo('"Geist Sans", sans-serif');
        expect(conRespaldo(una)).toBe(una);
    });
});

describe('fuentes itálicas', () => {
    const woff = fs.readFileSync(path.resolve('node_modules/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff'));
    const proyecto = (conItalica: boolean) => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-italica-'));
        const pkg = path.join(dir, 'node_modules/@fontsource/serif-falsa');
        fs.mkdirSync(path.join(pkg, 'files'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'package.json'), '{}');
        fs.writeFileSync(path.join(pkg, 'package.json'), '{"name":"@fontsource/serif-falsa","version":"1.0.0"}');
        for (const estilo of conItalica ? ['normal', 'italic'] : ['normal']) {
            const suf = estilo === 'italic' ? '-italic' : '';
            fs.writeFileSync(path.join(pkg, `files/serif-latin-400-${estilo}.woff`), woff);
            const css = (n: string) => `/* serif-${n}-400-${estilo} */\n@font-face {\n  font-family: 'Serif Falsa';\n  font-style: ${estilo};\n  font-weight: 400;\n  src: url(./files/serif-latin-400-${estilo}.woff) format('woff');\n  unicode-range: U+0000-00FF;\n}\n`;
            fs.writeFileSync(path.join(pkg, `latin-400${suf}.css`), css('latin'));
            fs.writeFileSync(path.join(pkg, `400${suf}.css`), css('latin'));
        }
        return dir;
    };
    const face = (styles?: ('normal' | 'italic')[]) => [{ source: '@fontsource/serif-falsa', subsets: ['latin'], weights: [400], styles }];

    it('sin `styles` la salida es la de siempre', () => {
        expect(buildFontsCSS(face(), [])).toBe(buildFontsCSS(face(['normal']), []));
        expect(buildFontsCSS(face(), [])).not.toContain('italic');
    });

    it('con italic importa el CSS itálico por cada peso y alfabeto', () => {
        const css = buildFontsCSS(face(['normal', 'italic']), []);
        expect(css).toContain('@import "@fontsource/serif-falsa/latin-400.css";\n@import "@fontsource/serif-falsa/latin-400-italic.css";');
    });

    it('el respaldo de la itálica lleva font-style y el mismo unicode-range', () => {
        const dir = proyecto(true);
        try {
            const [normal, italica] = respaldosDeFuentes(face(['normal', 'italic']), dir);
            expect(normal.estilo).toBeUndefined();
            expect(italica).toMatchObject({ familia: 'Serif Falsa', local: 'Arial Italic', estilo: 'italic', unicodeRange: 'U+0000-00FF' });
            const css = buildFontsCSS(face(['normal', 'italic']), [normal, italica]);
            expect(css).toContain('src: local("Arial"); size-adjust');
            expect(css).toContain('src: local("Arial Italic"); font-style: italic; size-adjust');
            expect(respaldosDeFuentes(face(['italic']), dir).map((r) => r.estilo)).toEqual(['italic']);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('un paquete sin itálica corta con un error que nombra el paquete y el archivo', () => {
        const dir = proyecto(false);
        try {
            expect(() => validarEstilosDeFuentes(face(['normal']), dir)).not.toThrow();
            const err = (() => { try { validarEstilosDeFuentes(face(['italic']), dir); } catch (e) { return e; } })();
            expect(err).toBeInstanceOf(ConfigError);
            expect((err as ConfigError).message).toContain('fontFaces[0].styles');
            expect((err as ConfigError).message).toContain('@fontsource/serif-falsa no trae latin-400-italic.css');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('un `styles` inválido es un error de config', async () => {
        const { deriveThemeVocabulary } = await import('./vocabulary');
        const cfg = { themes: { p: { colors: { brand: '#4F46E5' } } }, fontFaces: [{ ...face()[0], styles: ['oblique'] as never }] };
        expect(() => deriveThemeVocabulary(cfg)).toThrow(/fontFaces\[0\]\.styles tiene un valor inválido/);
    });
});
