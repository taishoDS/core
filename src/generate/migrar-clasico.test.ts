// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { migrarAScope, vocabularioClasico } from './migrar-clasico';
import { clasesSinLlave } from './llave-scope';
import { compile } from './compile';
import { buildRepoConfig } from '../config/pipeline';

const vocabulario = vocabularioClasico(buildRepoConfig());
const migrar = (t: string, esCss = false) => migrarAScope(t, { vocabulario, esCss });
const tipos = (t: string, esCss = false) => migrar(t, esCss).noConvertidos.map((n) => `${n.línea}:${n.token}:${n.tipo}`);

const CASOS: Array<[string, string, string]> = [
    ['class="…"', '<div class="ts-flex ts-gap-base mi-clase">', '<div class="ts flex gap-base mi-clase">'],
    ['variantes', '<p class="md:ts-flex @md:ts-grid-cols-2 2xl:ts-hidden">', '<p class="ts md:flex @md:grid-cols-2 2xl:hidden">'],
    ['la llave una sola vez, aunque ya esté', '<p class="ts ts-flex">', '<p class="ts flex">'],
    ['modificadores y utilidades propias quedan', '<button class="ts-button size-md variant-primary card-hero">', '<button class="ts button size-md variant-primary card-hero">'],
    ['un class sin clases del DS no se toca', '<div class="mi-clase is-active">', '<div class="mi-clase is-active">'],
    ['contexto', '<html class="ts-compact">', '<html class="ts compact">'],
    ['atributo con expresión', '<div class="ts-flex {abierto ? \'ts-hidden\' : \'\'} x">', '<div class="ts flex {abierto ? \'hidden\' : \'\'} x">'],
    ['expresión sin parte estática del DS', '<div class={c ? \'ts-flex\' : \'ts-hidden\'}>', '<div class={c ? \'ts flex\' : \'ts hidden\'}>'],
    ['string de TS', "const clases = ['ts-button', 'size-md'];", "const clases = ['ts button', 'size-md'];"],
    ['template literal', 'const c = `ts-flex ts-gap-${gap}`;', 'const c = `ts flex ts-gap-${gap}`;'],
    ['componente: sin llave', '<Button class="ts-mt-base ts-w-full">', '<Button class="mt-base w-full">'],
    ['componente con punto', '<Foo.Bar class="ts-flex">', '<Foo.Bar class="flex">'],
    ['class: directiva', '<div class="ts-flex" class:ts-hidden={c}>', '<div class="ts flex" class:hidden={c}>'],
    ['class: en un componente', '<Button class:ts-hidden={c}>', '<Button class:hidden={c}>'],
    ['renombre de SU3 + scope', '<p class="ts-ml-half ts-text-left">', '<p class="ts ms-half align-start">'],
    ['HTML dentro de un template (code=)', 'const code = `<div class="ts-flex"><span class="ts-hidden"></span></div>`;', 'const code = `<div class="ts flex"><span class="ts hidden"></span></div>`;'],
    ['classList: sin llave', "el.classList.contains('ts-popover');", "el.classList.contains('popover');"],
    ['multilínea', '<div class="\n  ts-flex\n  ts-gap-base\n">', '<div class="\n  ts flex\n  gap-base\n">'],
];

describe('migrarAScope: tabla de casos', () => {
    it.each(CASOS)('%s', (_forma, entrada, salida) => {
        expect(migrar(entrada).texto).toBe(salida);
    });
    it('no toca --ts-*, data-ts-*, ids ni el sprite', () => {
        const t = '<svg style="--ts-x: 1"><use href="a.svg#ts-sun"></use></svg><div data-ts-modal id="ts-modal-${uid}" aria-labelledby="ts-modal-${uid}">';
        const r = migrar(t);
        expect(r.texto).toBe(t);
        expect(r.noConvertidos).toEqual([]);
    });
    it('no toca el productor ni una región taisho:nombres-viejos', () => {
        const t = '@utility ts-flex { display: flex }\n<!-- taisho:nombres-viejos --><p class="ts-ml-half"><!-- /taisho:nombres-viejos -->';
        expect(migrar(t).texto).toBe(t);
    });
});

describe('migrarAScope: lo que se reporta sin tocar (con línea)', () => {
    it('fragmentos', () => {
        const t = 'const a = 1;\nconst c = `ts-grid-cols-${n}`;\nconst d = `${p}ts-flex`;';
        const r = migrar(t);
        expect(r.texto).toBe(t);
        expect(tipos(t)).toEqual(['2:ts-grid-cols-${:fragment', '3:ts-flex:fragment']);
    });
    it('@apply y selectores del CSS del consumidor', () => {
        const css = '.tarjeta {\n  @apply ts-flex ts-gap-base;\n}\n.ts-button:hover { color: red }\n.md\\:ts-flex { }';
        const r = migrar(css, true);
        expect(r.texto).toBe(css);
        expect(tipos(css, true)).toEqual(['2:ts-flex:apply', '2:ts-gap-base:apply', '4:ts-button:selector', '5:ts-flex:selector']);
    });
    it('<style> de un .svelte', () => {
        const t = '<div class="ts-flex"></div>\n<style>\n  .x { @apply ts-p-base; }\n</style>';
        const r = migrar(t);
        expect(r.texto).toBe('<div class="ts flex"></div>\n<style>\n  .x { @apply ts-p-base; }\n</style>');
        expect(tipos(t)).toEqual(['3:ts-p-base:apply']);
    });
    it('selectores en JS', () => {
        expect(tipos("el.querySelector('.ts-calendar-day-mark');")).toEqual(['1:ts-calendar-day-mark:selector']);
    });
    it('class: sin ts estático en el elemento (convertido y reportado), no en componentes', () => {
        const r = migrar('<div class:ts-hidden={c}></div>\n<Button class:ts-hidden={c} />');
        expect(r.texto).toBe('<div class:hidden={c}></div>\n<Button class:hidden={c} />');
        expect(r.noConvertidos).toEqual([{ línea: 1, token: 'class:hidden', tipo: 'missing-ts' }]);
    });
    it('classList.add: convertido y avisado', () => {
        expect(tipos("el.classList.add('ts-hidden');")).toEqual(['1:ts-hidden:classlist']);
    });
    it('sin sucesor, desconocidas y prosa', () => {
        expect(tipos('<p class="ts-color-btn">')).toEqual(['1:ts-color-btn:no-replacement']);
        expect(tipos('<p class="ts-flex ts-no-existe">')).toEqual(['1:ts-no-existe:unknown-class']);
        expect(tipos('<p>Se usa ts-flex para centrar</p>')).toEqual(['1:ts-flex:outside-string']);
    });
    it('un id con interpolación no es un fragmento', () => {
        expect(tipos('<div id="ts-modal-${uid}">')).toEqual([]);
    });
});

describe('migrarAScope: invariantes', () => {
    const MUESTRA = CASOS.map((c) => c[1]).join('\n');
    it('idempotente: la segunda pasada da 0 cambios', () => {
        const uno = migrar(MUESTRA);
        const dos = migrar(uno.texto);
        expect(dos.texto).toBe(uno.texto);
        expect([dos.convertidos, dos.renombres, dos.llaves]).toEqual([0, 0, 0]);
    });
    it('cuenta convertidos, renombres y llaves', () => {
        const r = migrar('<p class="ts-ml-half ts-flex"><Button class="ts-mt-base">');
        expect([r.convertidos, r.renombres, r.llaves]).toEqual([3, 1, 1]);
    });
    it('lo que produce no tiene hallazgos de llave (los componentes tampoco)', () => {
        const r = migrar('<div class="ts-flex md:ts-hidden"><Button class="ts-mt-base"></Button></div>');
        expect(clasesSinLlave(r.texto, new Set(['flex', 'hidden', 'mt-base']))).toEqual([]);
    });
});

describe('clasesSinLlave: componentes (H8)', () => {
    const cortos = new Set(['mt-base', 'hidden']);
    it('<Button class="mt-base"> no es un error; <div class="mt-base"> sí', () => {
        expect(clasesSinLlave('<Button class="mt-base">', cortos)).toEqual([]);
        expect(clasesSinLlave('<div class="mt-base">', cortos)).toEqual([{ clase: 'mt-base', línea: 1 }]);
    });
    it('un genérico de TS antes no confunde', () => {
        expect(clasesSinLlave('const x: Array<Foo> = [];\n<div class="hidden">', cortos)).toEqual([{ clase: 'hidden', línea: 2 }]);
    });
});


describe('migrarAScope: colores del tema', () => {
    const sinConfig = vocabularioClasico({ themes: {}, fontFaces: [] });
    const sin = (t: string) => migrarAScope(t, { vocabulario: sinConfig });
    it('sin config conoce accent, estados y brand: convierte y pone la llave', () => {
        expect(sin('<a class="ts-color-accent-600 hl">').texto).toBe('<a class="ts color-accent-600 hl">');
        expect(sin('<i class="ts-bg-success-100 ts-color-accent-500-contrast">').texto).toBe('<i class="ts bg-success-100 color-accent-500-contrast">');
        expect(sin('<i class="ts-bg-danger-100 ts-bg-warning-100 ts-bg-info-100 ts-bg-accent-500">').noConvertidos).toEqual([]);
    });
    it('con la config de otro tema también', () => {
        expect(migrar('<i class="ts-bg-accent-100">').texto).toBe('<i class="ts bg-accent-100">');
    });
    it('«unknown-class» imposible para algo que taisho.full.css emite', () => {
        const css = compile(buildRepoConfig(), []).css;
        const emitidos = new Set([...css.matchAll(/:where\(\.ts\)\.((?:\\.|[A-Za-z0-9_-])+)/g)].map((m) => m[1].replaceAll('\\', '').split(':').pop()!));
        const faltan = [...emitidos].filter((n) => !sinConfig.nombres.has(`ts-${n}`) && !sinConfig.nombres.has(n));
        expect(faltan).toEqual([]);
    });
});

describe('migrarAScope: <style> en comentarios', () => {
    it('un comentario que nombra <style> no vuelve CSS el markup', () => {
        const t = '<!-- ver el bloque <style> -->\n<div class="ts-flex"></div>\n<style>\n.ts-card { color: red; }\n</style>\n';
        const r = migrar(t);
        expect(r.texto).toContain('<div class="ts flex">');
        expect(r.noConvertidos.map((n) => `${n.línea}:${n.token}:${n.tipo}`)).toEqual(['4:ts-card:selector']);
    });
    it('un <style> en un <script> tampoco abre bloque', () => {
        const r = migrar("<script>const s = '<style>';</script>\n<div class=\"ts-flex\"></div>\n");
        expect(r.texto).toContain('class="ts flex"');
    });
});
