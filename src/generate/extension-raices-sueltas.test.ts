// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary } from './vocabulary';
import { defineExtension, validateExtension, type TaishoExtension, type TaishoExtensions } from './extension';
import { configErrorLine } from './mensajes-errores';
import { ConfigError, type ConfigKeyError } from './errores-config';
import { cssDeExtensiones, manifiestoDe } from './registro';
import { acme, configMinima } from './extension-acme.fixture';

const P = '@acme/ui';
const RUTA = `extensions["${P}"]`;
const util = (nombre: string, cuerpo = 'display: flex;') => `@utility ${nombre} {\n${cuerpo}\n}\n`;
const sueltas = (roots: unknown, utilities = ''): TaishoExtension => ({ roots: roots as string[], utilities });
const codigos = (e: TaishoExtension) => validateExtension(e, P).map((x) => x.code);
const es = (e: ConfigKeyError) => configErrorLine(e, 'es');
const en = (e: ConfigKeyError) => configErrorLine(e, 'en');
const aDemanda = (clases: string, extensions: TaishoExtensions) => compile(configMinima(), [{ file: 'a.html', content: `<div class="${clases}"></div>` }], { onDemand: true, extensions });
const lanza = (extensions: TaishoExtensions): readonly ConfigKeyError[] => {
    try { deriveThemeVocabulary(configMinima(), extensions); } catch (e) { return (e as ConfigError).errors; }
    return [];
};

describe('raíces sueltas: lo que acepta', () => {
    it('una utilidad bajo una raíz suelta es válida', () => {
        expect(validateExtension(sueltas(['acme-glow'], util('ts-acme-glow')), P)).toEqual([]);
        expect(validateExtension(sueltas(['acme-glow'], util('ts-acme-glow') + util('ts-acme-glow-strong')), P)).toEqual([]);
    });
    it('sin raíz que la cubra, ext-utility-no-root (el mensaje nombra las raíces sueltas)', () => {
        const [e] = validateExtension(sueltas(['acme-glow'], util('ts-acme-otra')), P);
        expect(e).toEqual({ path: `${RUTA}.utilities`, code: 'ext-utility-no-root', params: { block: 'ts-acme-otra' } });
        expect(es(e)).toContain('ni de las raíces sueltas');
        expect(en(e)).toContain('or of its loose roots');
    });
    it('una raíz de componente sigue cubriendo utilidades sueltas', () => {
        expect(validateExtension({ components: { c: { roots: ['acme-c'], css: '' } }, utilities: util('ts-acme-c-x') }, P)).toEqual([]);
    });
    it('un bloque de un componente bajo una raíz suelta no es suyo', () => {
        const e = validateExtension({ roots: ['acme-glow'], components: { c: { roots: ['acme-c'], css: util('ts-acme-glow') } } }, P);
        expect(e.map((x) => x.code)).toEqual(['ext-block-not-owned']);
    });
    it('roots vacío es válido y no hace nada', () => {
        expect(validateExtension({ roots: [] }, P)).toEqual([]);
    });
});

describe('raíces sueltas: las mismas reglas que las de un componente', () => {
    it('forma: tiene que ser string[]', () => {
        for (const roots of ['acme-glow', [1], { 0: 'x' }, null]) {
            const [e] = validateExtension(sueltas(roots), P);
            expect(e, JSON.stringify(roots)).toEqual({ path: `${RUTA}.roots`, code: 'ext-shape', params: { expected: 'string[]' } });
        }
    });
    it('nombre inválido y claves prohibidas', () => {
        for (const raiz of ['Acme', 'acme_glow', '1acme', 'acme--x', '__proto__', 'constructor', 'prototype', 'toString']) {
            const e = validateExtension(sueltas([raiz]), P);
            expect(e.map((x) => x.code), raiz).toEqual(['ext-name-invalid']);
            expect(e[0].params).toEqual({ kind: 'root', name: raiz });
        }
    });
    it('reservadas por el primer segmento del Core', () => {
        for (const raiz of ['sizing', 'z', 'color', 'gap', 'font', 'radius', 'dark', 'button', 'flex']) {
            const e = validateExtension(sueltas([raiz]), P);
            expect(e.map((x) => x.code), raiz).toContain('ext-conflicts-core');
            expect(e.find((x) => x.code === 'ext-conflicts-core')!.params).toEqual({ kind: 'root', name: raiz });
        }
        expect(codigos(sueltas(['colorful'], util('ts-colorful')))).toEqual([]);
    });
    it('sin repetir: ni dentro de roots ni contra la de un componente', () => {
        const dentro = validateExtension(sueltas(['acme-glow', 'acme-glow']), P);
        expect(dentro[0]).toMatchObject({ code: 'ext-root-repeated', params: { root: 'acme-glow', other: '' } });
        expect(es(dentro[0])).toContain('raíces sueltas del paquete');
        expect(en(dentro[0])).toContain("package's loose roots");
        const contra = validateExtension({ roots: ['acme-card'], components: { c: { roots: ['acme-card'], css: '' } } }, P);
        expect(contra[0]).toMatchObject({ code: 'ext-root-repeated', params: { root: 'acme-card', other: 'c' } });
    });
    it('libres de prefijo contra las raíces de componentes de la misma extensión (en los dos sentidos)', () => {
        const c = { c: { roots: ['acme'], css: '' } };
        const [a] = validateExtension({ roots: ['acme-glow'], components: c }, P);
        expect(a).toEqual({ path: `${RUTA}.roots`, code: 'ext-roots-overlap', params: { root: 'acme-glow', other: 'acme', package: P, otherPackage: P } });
        const [b] = validateExtension({ roots: ['acme'], components: { c: { roots: ['acme-glow'], css: '' } } }, P);
        expect(b).toMatchObject({ code: 'ext-roots-overlap', params: { root: 'acme', other: 'acme-glow' } });
        expect(validateExtension({ roots: ['acmex'], components: c }, P)).toEqual([]);
    });
    it('libres de prefijo contra las de OTRAS extensiones, nombrando paquetes', () => {
        const a = defineExtension({ components: { a: { roots: ['acme'], css: '' } } });
        const b = defineExtension({ roots: ['acme-pro'] });
        const [e] = lanza({ '@a/ui': a, '@b/ui': b });
        expect(e).toMatchObject({ code: 'ext-roots-overlap', params: { root: 'acme-pro', other: 'acme', package: '@b/ui', otherPackage: '@a/ui' } });
        expect(es(e)).toContain('"@b/ui" y "@a/ui"');
        const [f] = lanza({ '@a/ui': defineExtension({ roots: ['acme'] }), '@b/ui': defineExtension({ components: { b: { roots: ['acme-pro'], css: '' } } }) });
        expect(f).toMatchObject({ code: 'ext-roots-overlap', params: { root: 'acme-pro', other: 'acme', package: '@b/ui', otherPackage: '@a/ui' } });
        expect(lanza({ '@a/ui': defineExtension({ roots: ['acme'] }), '@b/ui': defineExtension({ roots: ['acme'] }) }).map((x) => x.code)).toContain('ext-conflicts-extension');
    });
    it('el choque con el nombre de una utilidad del Core', () => {
        const e = validateExtension(sueltas(['acme-glow'], util('ts-flex')), P);
        expect(e.map((x) => x.code)).toEqual(expect.arrayContaining(['ext-conflicts-core', 'ext-utility-no-root']));
    });
    it('límite de cantidad', () => {
        const muchas = Array.from({ length: 17 }, (_, i) => `acme-r${i}`);
        const [e] = validateExtension(sueltas(muchas), P);
        expect(e).toEqual({ path: `${RUTA}.roots`, code: 'ext-limit', params: { what: 'roots', max: 16 } });
        expect(validateExtension(sueltas(muchas.slice(0, 16)), P)).toEqual([]);
    });
    it('no llevan tokens: una variable --ts-<raíz>-x que nadie define igual no es del Core', () => {
        const e = validateExtension(sueltas(['acme-glow'], util('ts-acme-glow', 'color: var(--color-gray-100);')), P);
        expect(e).toEqual([]);
        expect(Object.keys(manifiestoDe({ [P]: sueltas(['acme-glow'], util('ts-acme-glow')) }).componentes)).not.toContain('acme-glow');
    });
});

describe('raíces sueltas: @apply', () => {
    it('hacia el Core y hacia otra suelta del mismo paquete', () => {
        const css = util('ts-acme-glow', '@apply ts-flex ts-acme-glow-base;') + util('ts-acme-glow-base', 'gap: var(--ts-gap-half);');
        expect(validateExtension(sueltas(['acme-glow'], css), P)).toEqual([]);
    });
    it('hacia un bloque de un componente del paquete, no', () => {
        const e = validateExtension({ roots: ['acme-glow'], components: { c: { roots: ['acme-c'], css: util('ts-acme-c') } }, utilities: util('ts-acme-glow', '@apply ts-acme-c;') }, P);
        expect(e.map((x) => x.params)).toEqual([{ block: 'ts-acme-glow', target: 'ts-acme-c', reason: 'other-component' }]);
    });
    it('desde un componente hacia una suelta, no', () => {
        const e = validateExtension({ roots: ['acme-glow'], components: { c: { roots: ['acme-c'], css: util('ts-acme-c', '@apply ts-acme-glow;') } }, utilities: util('ts-acme-glow') }, P);
        expect(e.map((x) => x.params)).toEqual([{ block: 'ts-acme-c', target: 'ts-acme-glow', reason: 'other-component' }]);
    });
    it('hacia un componente del Core o hacia una suelta de otro paquete, no', () => {
        expect(validateExtension(sueltas(['acme-glow'], util('ts-acme-glow', '@apply ts-button;')), P)[0].params).toMatchObject({ reason: 'core-component' });
        const otro = defineExtension({ roots: ['otro-x'], utilities: util('ts-otro-x') });
        const e = lanza({ '@a/ui': otro, '@b/ui': sueltas(['acme-glow'], util('ts-acme-glow', '@apply ts-otro-x;')) });
        expect(e.find((x) => x.code === 'ext-apply-target')!.params).toMatchObject({ target: 'ts-otro-x', reason: 'other-component' });
    });
    it('ciclo y presupuesto, como en un componente', () => {
        const ciclo = util('ts-acme-glow', '@apply ts-acme-glow-b;') + util('ts-acme-glow-b', '@apply ts-acme-glow;');
        expect(validateExtension(sueltas(['acme-glow'], ciclo), P).map((x) => x.params)).toContainEqual(expect.objectContaining({ reason: 'cycle' }));
        const cadena = Array.from({ length: 12 }, (_, i) => util(`ts-acme-glow-${i}`, i < 11 ? `@apply ts-acme-glow-${i + 1};` : 'gap: 1px;')).join('');
        expect(validateExtension(sueltas(['acme-glow'], cadena), P).map((x) => x.code)).toContain('ext-apply-budget');
    });
});

describe('raíces sueltas: en la compilación', () => {
    const ext: TaishoExtensions = { [P]: acme };
    it('el fixture acme: ts-acme-glow vive bajo su raíz suelta, no bajo acme-card', () => {
        expect(acme.roots).toEqual(['acme-glow']);
        expect(acme.components!['acme-card'].roots).not.toContain('acme-glow');
        expect(validateExtension(acme, P)).toEqual([]);
    });
    it('entran a demanda por clase usada, con variantes, y sin arrastrar componentes', () => {
        expect(aDemanda('ts flex', ext).css).not.toContain('acme');
        const r = aDemanda('ts md:acme-glow hover:acme-glow', ext);
        expect(r.css).toContain('@media (width >= 48rem) {\n  :where(.ts).md\\:acme-glow {\n  box-shadow: var(--ts-shadow-md);');
        expect(r.css).toContain('@media (hover: hover) {\n  :where(.ts).hover\\:acme-glow:hover {\n  box-shadow: var(--ts-shadow-md);');
        expect(r.css).not.toContain(':where(.ts).acme-card');
        expect(aDemanda('ts acme-glow', ext).css).toContain(':where(.ts).acme-glow {\n  box-shadow: var(--ts-shadow-md);');
    });
    it('una suelta con @apply a otra suelta y al Core compila expandida', () => {
        const e: TaishoExtensions = { [P]: sueltas(['acme-glow'], util('ts-acme-glow', '@apply ts-acme-glow-base;\nbox-shadow: var(--ts-shadow-md);') + util('ts-acme-glow-base', 'gap: var(--ts-gap-half);')) };
        const css = aDemanda('ts acme-glow', e).css;
        expect(css).toContain(':where(.ts).acme-glow {');
        expect(css).toContain('gap: var(--ts-gap-half);');
    });
    it('no suman componentes al manifiesto ni CSS de componente', () => {
        expect(manifiestoDe(ext).componentes['acme-glow']).toBeUndefined();
        expect(cssDeExtensiones(ext).utilities).toContain('@utility ts-acme-glow');
        expect(cssDeExtensiones(ext).components).not.toContain('acme-glow');
    });
    it('un mapa sin prototipo: __proto__ como raíz suelta se rechaza y no ensucia nada', () => {
        expect(lanza({ [P]: sueltas(['__proto__']) }).map((x) => x.code)).toEqual(['ext-name-invalid']);
        expect(({} as Record<string, unknown>).roots).toBeUndefined();
    });
});
