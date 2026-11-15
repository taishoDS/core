// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile, type ContentFile, type CompileCache } from './compile';
import { extraerVariantes, pares, tokenizar } from './emit-flat';
import { tablaPrefijos, validarCadena } from './variantes';
import { buildClassTypes } from './emit-classes';
import { MARCADORES, validarComponente } from './naming-table';
import { buildRepoConfig } from '../config/pipeline';
import { leerEmitidos } from './naming-emitidos';
import { warningLine } from '../generate-cli/mensajes-avisos';
import type { EngineWarning } from './avisos-tipos';

const es = (ws: EngineWarning[]) => ws.map((w) => warningLine(w, 'es'));

const config = buildRepoConfig();
const f = (content: string, file = 'a.html'): ContentFile => ({ file, content });
const demanda = (content: string) => compile(config, [f(content)], { onDemand: true });
const tabla = tablaPrefijos({ sm: '640px', md: '768px', lg: '1024px', xl: '1280px' });
const prefijos = (...p: string[]) => validarCadena(p, tabla);

const plano = (css: string) => css.replace(/\s+/g, ' ');

describe('variantes · tabla de prefijos y cadenas', () => {
    it('cada prefijo del vocabulario cerrado existe', () => {
        for (const p of [
            'hover:', 'focus:', 'focus-visible:', 'active:', 'disabled:', 'checked:', 'invalid:', 'print:',
            'aria-busy:', 'aria-checked:', 'aria-disabled:', 'aria-expanded:', 'aria-hidden:', 'aria-pressed:',
            'aria-readonly:', 'aria-required:', 'aria-selected:', 'aria-invalid:',
            'data-open:', 'group-hover:', 'peer-checked:', 'group-hover/menu:', 'peer-invalid/campo:', 'group-data-open:',
            'max-sm:', 'max-md:', 'max-lg:', 'max-xl:',
            '@sm:', '@md:', '@lg:', '@xl:', '@2xl:', '@3xl:', '@4xl:', '@5xl:', '@6xl:', '@7xl:', 'md:',
        ]) expect(prefijos(p).ok, p).toBe(true);
    });

    it('fuera del vocabulario: dark:, aria-<valor arbitrario>, grupos con nombre inválido', () => {
        for (const p of ['dark:', 'aria-foo:', 'group:', 'group-foo:', 'group-hover/Menu:', 'group-print:', 'group-md:', 'first:']) {
            expect(prefijos(p), p).toEqual({ ok: false, motivo: 'desconocido', prefijo: p });
        }
    });

    it('`data-ts-*` se rechaza: es el gancho de los componentes', () => {
        expect(prefijos('data-ts-accordion:')).toEqual({ ok: false, motivo: 'data-ts', prefijo: 'data-ts-accordion:' });
    });

    it('el orden canónico es [screen|@container][print][group|peer][estado], hasta 3 segmentos', () => {
        expect(prefijos('md:', 'hover:').ok).toBe(true);
        expect(prefijos('@md:', 'group-hover/menu:', 'focus:').ok).toBe(true);
        expect(prefijos('md:', 'print:', 'hover:').ok).toBe(true);
        expect(prefijos('hover:', 'md:')).toEqual({ ok: false, motivo: 'orden', canonica: ['md:', 'hover:'] });
        expect(prefijos('hover:', 'group-hover:', 'print:', 'md:')).toEqual({ ok: false, motivo: 'orden' });
        expect(prefijos('md:', 'lg:')).toEqual({ ok: false, motivo: 'orden' });
        expect(prefijos('max-md:', 'hover:').ok).toBe(true);
        expect(prefijos('hover:', 'max-md:')).toEqual({ ok: false, motivo: 'orden', canonica: ['max-md:', 'hover:'] });
        expect(prefijos('md:', 'max-xl:')).toEqual({ ok: false, motivo: 'orden' });
        expect(prefijos('max-md:', '@md:')).toEqual({ ok: false, motivo: 'orden' });
        expect(prefijos('hover:', 'focus:')).toEqual({ ok: false, motivo: 'orden' });
    });

    it('el extractor devuelve la cadena entera y la base', () => {
        const p = (s: string, completo = true) => pares(tokenizar(s), completo);
        expect(p('md:hover:ts-x')).toEqual([{ variantes: ['md:', 'hover:'], base: 'ts-x' }]);
        expect(p('group-hover/menu:w-1/4')).toEqual([{ variantes: ['group-hover/menu:'], base: 'w-1/4' }]);
        expect(p('@md:p-0.5')).toEqual([{ variantes: ['@md:'], base: 'p-0.5' }]);
        expect(p('foo.md:flex')).toEqual([{ variantes: ['md:'], base: 'flex' }]);
        expect(p('flex')).toEqual([]);
        expect(extraerVariantes('md:hover:ts-x hover:ts-y')).toEqual(['md:hover:ts-x', 'hover:ts-y']);
    });
});

describe('variantes · avisos y errores', () => {
    it('fuera de orden: aviso con «¿Se quiso decir…?» y no se emite', () => {
        const r = demanda('<p class="hover:md:p-double">');
        expect(es(r.warnings)).toEqual(['a.html: "hover:md:p-double" está fuera de orden y no se emite. ¿Se quiso decir "md:hover:p-double"?']);
        expect(r.css).not.toContain('hover\\:md');
        expect(r.css).not.toContain('md\\:hover');
        expect(r.variants).toEqual([]);
    });

    it('cadena demasiado larga o con dos del mismo tipo: aviso, no se emite', () => {
        const r = demanda('md:print:group-hover:hover:p-double md:lg:p-double');
        expect(r.warnings).toHaveLength(2);
        expect(es(r.warnings)[0]).toMatch(/"md:print:group-hover:hover:p-double" no se emite: la cadena admite a lo sumo/);
        expect(r.variants).toEqual([]);
    });

    it('`data-ts-x:` se rechaza con aviso y no se emite', () => {
        const r = demanda('<p class="data-ts-accordion:p-double">');
        expect(es(r.warnings)).toEqual([expect.stringContaining('"data-ts-accordion:p-double" se rechaza y no se emite')]);
        expect(r.css).not.toContain('data-ts-accordion');
    });

    it('un prefijo desconocido en una cadena avisa con sugerencia', () => {
        const r = demanda('<p class="md:hovr:p-double">');
        expect(es(r.warnings)).toEqual(['a.html: el prefijo "hovr:" no existe (en "md:hovr:p-double"). ¿Se quiso decir "hover:"?']);
    });

    it('una variante sobre un componente avisa y no se emite (no corta el build)', () => {
        const r = demanda('<button class="ts hover:button">');
        expect(es(r.warnings)).toEqual([
            'a.html: "hover:button" no se emite: las variantes (hover:) aplican sólo a utilidades, y "button" es de un componente. Sus estados son `is-*`, `aria` y los internos.',
        ]);
        expect(r.css).not.toContain('hover\\:button');
        expect(es(demanda('md:variant-primary').warnings)[0]).toMatch(/"md:variant-primary" no se emite: las variantes \(md:\) aplican sólo a utilidades/);
        expect(es(demanda('md:hover:card').warnings)[0]).toMatch(/"md:hover:card" no se emite/);
    });

    it('un prefijo que no existe sobre un componente no es error (es prosa)', () => {
        expect(() => demanda('foo:button')).not.toThrow();
    });

    it('la caché guarda lo mismo con cadenas: con y sin caché da el mismo resultado', () => {
        const files = [{ ...f('md:hover:p-double group-hover/menu:flex hover:md:flex'), hash: 'h1' }];
        const cache: CompileCache = new Map();
        const a = compile(config, files, { onDemand: true, cache });
        const b = compile(config, files, { onDemand: true, cache });
        expect(b).toEqual(a);
        expect(a).toEqual(compile(config, files, { onDemand: true }));
        expect(cache.get('h1')).toEqual(tokenizar(files[0].content));
    });
});

const D = 'padding: var(--ts-space-double);';
describe('variantes · una regla por familia, contra el CSS escrito a mano', () => {
    const casos: Array<[string, string, string]> = [
        ['hover', 'hover:p-double', `@media (hover: hover) { :where(.ts).hover\\:p-double:hover { ${D} } }`],
        ['focus', 'focus:p-double', `:where(.ts).focus\\:p-double:focus { ${D} }`],
        ['focus-visible', 'focus-visible:p-double', `:where(.ts).focus-visible\\:p-double:focus-visible { ${D} }`],
        ['active', 'active:p-double', `:where(.ts).active\\:p-double:active { ${D} }`],
        ['disabled', 'disabled:p-double', `:where(.ts).disabled\\:p-double:is(:disabled, [aria-disabled="true"]) { ${D} }`],
        ['checked', 'checked:p-double', `:where(.ts).checked\\:p-double:checked { ${D} }`],
        ['invalid', 'invalid:p-double', `:where(.ts).invalid\\:p-double:invalid { ${D} }`],
        ['aria', 'aria-busy:p-double', `:where(.ts).aria-busy\\:p-double[aria-busy="true"] { ${D} }`],
        ['aria-pressed', 'aria-pressed:p-double', `:where(.ts).aria-pressed\\:p-double[aria-pressed="true"] { ${D} }`],
        ['aria-selected', 'aria-selected:p-double', `:where(.ts).aria-selected\\:p-double[aria-selected="true"] { ${D} }`],
        ['aria-invalid', 'aria-invalid:p-double', `:where(.ts).aria-invalid\\:p-double[aria-invalid="true"] { ${D} }`],
        ['data', 'data-open:p-double', `:where(.ts).data-open\\:p-double[data-open] { ${D} }`],
        ['print', 'print:p-double', `@media print { :where(.ts).print\\:p-double { ${D} } }`],
        ['@container', '@2xl:p-double', `@container (width >= 42rem) { :where(.ts).\\@2xl\\:p-double { ${D} } }`],
        ['@7xl', '@7xl:p-double', `@container (width >= 80rem) { :where(.ts).\\@7xl\\:p-double { ${D} } }`],
        ['group', 'group-focus:p-double', `:where(.ts).group-focus\\:p-double:is(:where(.ts.group):focus *) { ${D} }`],
        ['group hover', 'group-hover:p-double', `@media (hover: hover) { :where(.ts).group-hover\\:p-double:is(:where(.ts.group):hover *) { ${D} } }`],
        ['group con nombre', 'group-hover/menu:p-double', `@media (hover: hover) { :where(.ts).group-hover\\/menu\\:p-double:is(:where(.ts.group\\/menu):hover *) { ${D} } }`],
        ['peer', 'peer-checked:p-double', `:where(.ts).peer-checked\\:p-double:is(:where(.ts.peer):checked ~ *) { ${D} }`],
        ['peer con nombre', 'peer-invalid/campo:p-double', `:where(.ts).peer-invalid\\/campo\\:p-double:is(:where(.ts.peer\\/campo):invalid ~ *) { ${D} }`],
        ['group + data', 'group-data-open:p-double', `:where(.ts).group-data-open\\:p-double:is(:where(.ts.group)[data-open] *) { ${D} }`],
        ['screen × estado', 'md:focus:p-double', `:where(.ts).md\\:focus\\:p-double:focus { ${D} }`],
        ['screen × hover', 'md:hover:p-double', `@media (width >= 48rem) and (hover: hover) { :where(.ts).md\\:hover\\:p-double:hover { ${D} } }`],
        ['container × estado', '@md:focus:p-double', `@container (width >= 28rem) { :where(.ts).\\@md\\:focus\\:p-double:focus { ${D} } }`],
        ['container × hover', '@md:hover:p-double', `@container (width >= 28rem) { @media (hover: hover) { :where(.ts).\\@md\\:hover\\:p-double:hover { ${D} } } }`],
        ['screen × group × estado', 'md:group-hover:focus:p-double', `@media (width >= 48rem) and (hover: hover) { :where(.ts).md\\:group-hover\\:focus\\:p-double:is(:where(.ts.group):hover *):focus { ${D} } }`],
        ['max', 'max-md:p-double', `@media (width < 48rem) { :where(.ts).max-md\\:p-double { ${D} } }`],
        ['max × hover', 'max-md:hover:p-double', `@media (width < 48rem) and (hover: hover) { :where(.ts).max-md\\:hover\\:p-double:hover { ${D} } }`],
        ['print × screen', 'md:print:p-double', `@media print and (width >= 48rem) { :where(.ts).md\\:print\\:p-double { ${D} } }`],
    ];
    for (const [familia, clase, esperado] of casos) {
        it(familia, () => {
            const r = demanda(clase);
            expect(r.warnings).toEqual([]);
            expect(plano(r.css)).toContain(plano(esperado));
        });
    }

    it('una utilidad propia (`utilities`) recibe estados sin :where(.ts)', () => {
        const cfg = { ...config, utilities: { 'card-hero': ['p-double'] } };
        const r = compile(cfg, [f('hover:card-hero md:focus:card-hero')], { onDemand: true });
        expect(plano(r.css)).toContain(plano(`@media (hover: hover) { .hover\\:card-hero:hover { ${D} } }`));
        expect(plano(r.css)).toContain(plano(`.md\\:focus\\:card-hero:focus { ${D} }`));
    });

    it('una variante sin uso no cuesta nada: a demanda no sale ninguna regla de estado', () => {
        const r = demanda('p-double md:p-double');
        expect(r.css).not.toMatch(/(?:hover|focus|focus-visible|active|disabled|checked|invalid|print|aria-[a-z]+|data-[a-z]+|(?:group|peer)-[a-z]+)\\:/);
    });
});

describe('max-<screen>: topes por pantalla', () => {
    it('max-* de mayor a menor, entre los screens y los containers', () => {
        const r = demanda('@md:p-double max-sm:p-double max-lg:p-double md:p-double max-md:p-double');
        expect(r.warnings).toEqual([]);
        const pos = ['md:p-double', 'max-lg:p-double', 'max-md:p-double', 'max-sm:p-double', '@md:p-double']
            .map((c) => r.css.indexOf('.' + c.replaceAll(':', '\\:').replaceAll('@', '\\@')));
        expect(pos.every((p) => p > 0)).toBe(true);
        expect(pos).toEqual([...pos].sort((a, b) => a - b));
    });

    it('un screen de extend.screens también tiene su max-*', () => {
        const cfg = { ...config, extend: { ...config.extend, screens: { '2xl': '1536px' } } };
        const r = compile(cfg, [f('max-2xl:p-double')], { onDemand: true });
        expect(r.warnings).toEqual([]);
        expect(plano(r.css)).toContain(plano(`@media (width < 96rem) { :where(.ts).max-2xl\\:p-double { ${D} } }`));
    });

    it('un rango (md:max-xl:) no se emite y avisa', () => {
        const r = demanda('md:max-xl:p-double');
        expect(r.css).not.toContain('max-xl');
        expect(es(r.warnings)[0]).toMatch(/md:max-xl:p-double/);
    });

    it('sin uso no cuesta nada: a demanda no sale ninguna regla max-*', () => {
        expect(demanda('p-double md:p-double').css).not.toMatch(/max-[a-z0-9]+\\:/);
    });
});

describe('variantes · orden en la cascada', () => {
    const orden = (css: string, clases: string[]) => clases.map((c) => css.indexOf('.' + c.replaceAll(':', '\\:').replaceAll('/', '\\/').replaceAll('@', '\\@')));
    it('base, screens, containers (capa utilities); estados, screen × estado, container × estado (utility-states); print (capa print, la última)', () => {
        const clases = [
            'p-double', 'md:p-double', '@md:p-double', 'group-hover:p-double', 'peer-checked:p-double', 'hover:p-double', 'focus:p-double',
            'focus-visible:p-double', 'active:p-double', 'aria-busy:p-double', 'data-open:p-double', 'checked:p-double', 'invalid:p-double',
            'disabled:p-double', 'md:hover:p-double', '@md:focus:p-double', 'print:p-double',
        ];
        const r = demanda([...clases].reverse().join(' '));
        const pos = orden(r.css, clases);
        expect(pos.every((p) => p > 0)).toBe(true);
        expect(pos).toEqual([...pos].sort((a, b) => a - b));
    });
});

describe('variantes · tipos y nombres', () => {
    it('TaishoVariant lista cada prefijo de la tabla y los abiertos', () => {
        const dts = buildClassTypes(['ts-flex'], [], tabla);
        for (const [k] of tabla) expect(dts).toContain(`"${k}"`);
        expect(dts).toContain('`data-${string}:`');
        expect(dts).toContain('`group-${StateName}${"" | `/${string}`}:`');
        expect(dts).toContain('`peer-${StateName}${"" | `/${string}`}:`');
    });

    it('`group` y `peer` están registrados como marcadores y no rompen la gramática de componentes', () => {
        expect(MARCADORES).toEqual(['group', 'peer']);
        expect(validarComponente('ts-group')).toEqual([]);
        expect(validarComponente('ts-peer')).toEqual([]);
    });
});

describe('variantes · curaduría del archivo estático', () => {
    const completo = compile(config, []).css;
    it('trae hover: sobre colores de escala, semánticos, subrayado y opacidad, más print:hidden y print:block', () => {
        for (const c of ['bg-brand-500', 'color-gray-700', 'border-danger-500', 'ring-brand-300', 'color-heading', 'color-danger', 'underline', 'no-underline', 'opacity-50']) {
            expect(plano(completo), c).toContain(plano(`:where(.ts).hover\\:${c}:hover {`));
        }
        expect(plano(completo)).toContain('@media (hover: hover) {');
        expect(plano(completo)).toContain('@media print { :where(.ts).print\\:block { display: block; } :where(.ts).print\\:hidden { display: none; } }');
    });

    it('lo demás queda fuera del estático: focus, active, disabled, aria, data, group, peer, cadenas', () => {
        expect(completo).not.toMatch(/\.(?:focus|focus-visible|active|disabled|checked|invalid|aria-[a-z]+|data-[a-z]+|group-[a-z]+|peer-[a-z]+)\\:/);
        expect(completo).not.toMatch(/\.md\\:hover\\:/);
        expect(completo).not.toContain('hover\\:border-t-');
    });

    it('a demanda no hay curaduría: la base no trae ningún estado', () => {
        expect(compile(config, [], { onDemand: true }).css).not.toContain('hover\\:');
    });
});

describe('variantes · ninguna utilidad del DS se confunde con un componente o un modificador', () => {
    it('`md:` sobre cada utilidad atómica y semántica emitida no da error (p. ej. `md:align-start`)', () => {
        const { atomic, utils } = leerEmitidos();
        const nombres = [...atomic, ...utils].map((n) => n.slice(3));
        const r = compile(config, [f(nombres.map((n) => `md:${n}`).join(' '))], { onDemand: true });
        expect(r.warnings).toEqual([]);
        expect(r.variants.length).toBeGreaterThan(2000);
    });
});
