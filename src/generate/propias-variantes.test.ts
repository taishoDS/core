// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile, derivarVocabulario } from './compile';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { avisosEstructuradosDeMarkup } from './avisos-clases';
import { buildRepoConfig } from '../config/pipeline';
import { warningLine } from '../generate-cli/mensajes-avisos';
import type { EngineWarning } from './avisos-tipos';

const es = (ws: EngineWarning[]) => ws.map((w) => warningLine(w, 'es'));
const avisosDeMarkup = (...args: Parameters<typeof avisosEstructuradosDeMarkup>) => es(avisosEstructuradosDeMarkup(...args));

const repo = buildRepoConfig();
const con = (utilities: Record<string, string[]>): TaishoConfig => ({ ...repo, utilities });
const plano = (css: string) => css.replace(/\s+/g, ' ');
const demanda = (cfg: TaishoConfig, content: string) => compile(cfg, [{ file: 'a.html', content }], { onDemand: true });
const falla = (utilities: Record<string, string[]>) => {
    try {
        deriveThemeVocabulary(con(utilities));
    } catch (e) {
        return (e as Error).message;
    }
    return '(no falló)';
};

const BOTON = ['p-half', 'radius-full', 'bg-brand-700', 'hover:bg-brand-800', 'focus-visible:outline-brand-500', 'disabled:opacity-50', 'md:p-base'];

describe('propias con variantes: lo que se emite', () => {
    const css = plano(demanda(con({ 'mi-boton': BOTON }), 'mi-boton').css);

    it('la base sale como siempre, sin las entradas con variante', () => {
        expect(css).toContain('.mi-boton { border-radius: var(--ts-radius-full); corner-shape: round; padding: var(--ts-space-half); background-color: var(--color-brand-700); }');
    });
    it('un contexto va en su @media con el selector de la propia', () => {
        expect(css).toContain('@media (width >= 48rem) { .mi-boton { padding: var(--ts-space-base); } }');
    });
    it('hover va dentro de @media (hover: hover)', () => {
        expect(css).toContain('@media (hover: hover) { .mi-boton:hover { background-color: var(--color-brand-800); } }');
    });
    it('focus-visible', () => {
        expect(css).toContain('.mi-boton:focus-visible { outline: var(--ts-border-width-2) solid var(--color-brand-500); }');
    });
    it('disabled cubre aria-disabled', () => {
        expect(css).toContain('.mi-boton:is(:disabled, [aria-disabled="true"]) { opacity: var(--ts-opacity-50); }');
    });
    it('el orden: base, contexto, estados (hover, focus-visible, disabled)', () => {
        const pos = ['.mi-boton {', '(width >= 48rem)', '.mi-boton:hover', '.mi-boton:focus-visible', '.mi-boton:is(:disabled'].map((x) => css.indexOf(x));
        expect(pos.every((p) => p > 0)).toBe(true);
        expect(pos).toEqual([...pos].sort((a, b) => a - b));
    });

    const cfg = con({ 'mi-hover': ['p-half', 'hover:bg-brand-800'], 'mi-ctx': ['p-half', 'md:p-base', 'md:hover:bg-brand-800'] });
    it('el prefijo del uso se compone con la cadena de adentro (md:mi-hover -> md:hover)', () => {
        const r = demanda(cfg, 'md:mi-hover');
        expect(r.warnings).toEqual([]);
        expect(plano(r.css)).toContain('@media (width >= 48rem) { .md\\:mi-hover { padding: var(--ts-space-half); } }');
        expect(plano(r.css)).toContain('@media (width >= 48rem) and (hover: hover) { .md\\:mi-hover:hover { background-color: var(--color-brand-800); } }');
    });
    it('una cadena de adentro de dos segmentos (md:hover) sale en una sola envoltura', () => {
        const r = demanda(cfg, 'mi-ctx');
        expect(plano(r.css)).toContain('@media (width >= 48rem) and (hover: hover) { .mi-ctx:hover { background-color: var(--color-brand-800); } }');
        expect(plano(r.css)).toContain('@media (width >= 48rem) { .mi-ctx { padding: var(--ts-space-base); } }');
    });
    it('un group de afuera se compone con el estado de adentro (group-hover:mi-foco -> group-hover:focus)', () => {
        const r = demanda(con({ 'mi-foco': ['p-half', 'focus:bg-brand-800'] }), 'group-hover:mi-foco');
        expect(r.warnings).toEqual([]);
        expect(plano(r.css)).toContain(
            '@media (hover: hover) { .group-hover\\:mi-foco:is(:where(.ts.group):hover *) { padding: var(--ts-space-half); } ' +
            '.group-hover\\:mi-foco:is(:where(.ts.group):hover *):focus { background-color: var(--color-brand-800); } }',
        );
    });
    it('una propia que compone otra hereda sus variantes', () => {
        const r = demanda(con({ base: ['p-half', 'hover:bg-brand-800'], 'sobre-base': ['base', 'radius-full'] }), 'sobre-base');
        expect(plano(r.css)).toContain('.sobre-base:hover { background-color: var(--color-brand-800); }');
    });
    it('un prefijo sobre otra propia vale si la cadena compuesta valida', () => {
        const cfg2 = con({ base: ['p-half', 'hover:bg-brand-800'], 'sobre-base': ['md:base'] });
        expect(falla({ base: ['p-half', 'hover:bg-brand-800'], 'sobre-base': ['md:base'] })).toBe('(no falló)');
        const r = demanda(cfg2, 'sobre-base');
        expect(plano(r.css)).toContain('@media (width >= 48rem) { .sobre-base { padding: var(--ts-space-half); } }');
        expect(plano(r.css)).toContain('@media (width >= 48rem) and (hover: hover) { .sobre-base:hover { background-color: var(--color-brand-800); } }');
    });
    it('el archivo completo (sin content) saca los screens de la propia con variantes', () => {
        const r = compile(con({ 'mi-hover': ['p-half', 'hover:bg-brand-800'] }), []);
        expect(plano(r.css)).toContain('@media (width >= 48rem) and (hover: hover) { .md\\:mi-hover:hover {');
    });
});

describe('propias con variantes: composición en el uso', () => {
    const cfg = con({ 'mi-boton': BOTON });
    it('md:mi-boton con md: adentro avisa y no se emite', () => {
        const r = demanda(cfg, 'md:mi-boton');
        expect(r.css).not.toContain('md\\:mi-boton');
        expect(es(r.warnings)).toEqual([
            'a.html: "md:mi-boton" no se emite: "mi-boton" lleva "md:p-base" y con "md:" queda "md:md:p-base", que no es una cadena válida: admite a lo sumo un contexto, un print, un group o peer y un estado, en ese orden, y 3 segmentos.',
        ]);
    });
    it('md:mi-boton con lg: adentro avisa y no se emite', () => {
        const r = demanda(con({ 'mi-lg': ['p-half', 'lg:p-base'] }), 'md:mi-lg');
        expect(r.css).not.toContain('mi-lg');
        expect(r.warnings).toHaveLength(1);
        expect(es(r.warnings)[0]).toContain('"md:mi-lg" no se emite: "mi-lg" lleva "lg:p-base" y con "md:" queda "md:lg:p-base"');
    });
    it('hover:mi-boton con hover: adentro avisa', () => {
        const r = demanda(cfg, 'hover:mi-boton');
        expect(r.warnings.length).toBeGreaterThan(0);
        expect(r.css).not.toContain('hover\\:mi-boton');
    });
    it('una propia sin uso cuesta 0 B a demanda', () => {
        const r = demanda(cfg, 'p-base');
        expect(r.css).not.toContain('mi-boton');
    });
    it('`taisho check` acepta hover:mi-hover y avisa la composición inválida', () => {
        const v = derivarVocabulario(con({ 'mi-hover': ['p-half', 'hover:bg-brand-800'], 'mi-lg': ['p-half', 'lg:p-base'] }));
        expect(avisosDeMarkup([{ file: 'a.html', content: '<div class="ts md:mi-hover mi-lg"></div>' }], v)).toEqual([]);
        const malos = avisosDeMarkup([{ file: 'a.html', content: '<div class="ts md:mi-lg"></div>' }], v);
        expect(malos).toHaveLength(1);
        expect(malos[0]).toContain('"md:mi-lg" no se emite: "mi-lg" lleva "lg:p-base" y con "md:" queda "md:lg:p-base"');
    });
});

describe('propias con variantes: la cascada', () => {
    it('en el mismo nivel la propia va antes que una atómica del markup, aunque el markup la nombre primero', () => {
        const css = demanda(con({ 'mi-hover': ['p-half', 'hover:p-base'] }), 'hover:p-double mi-hover').css;
        expect(css.indexOf('.mi-hover:hover')).toBeGreaterThan(0);
        expect(css.indexOf('.mi-hover:hover')).toBeLessThan(css.indexOf('hover\\:p-double'));
    });
    it('en un contexto, la propia va antes que una atómica del mismo @media', () => {
        const css = demanda(con({ 'mi-md': ['p-half', 'md:p-base'] }), 'md:p-double mi-md').css;
        expect(css.indexOf('.mi-md {', css.indexOf('(width >= 48rem)'))).toBeLessThan(css.indexOf('md\\:p-double'));
    });
    it('entre propias: primero la que se compone (orden topológico), aunque se declare después', () => {
        const css = demanda(con({ b: ['a', 'hover:p-double'], a: ['hover:p-half'] }), 'b a').css;
        expect(css.indexOf('.a:hover')).toBeGreaterThan(0);
        expect(css.indexOf('.a:hover')).toBeLessThan(css.indexOf('.b:hover'));
    });
    it('entre propias independientes: el orden de declaración', () => {
        const css = demanda(con({ x: ['hover:p-half'], y: ['hover:p-base'] }), 'y x').css;
        expect(css.indexOf('.x:hover')).toBeLessThan(css.indexOf('.y:hover'));
    });
});

describe('propias con variantes: sin ":" no cambia nada', () => {
    it('una config sin ":" da la misma regla de siempre, con screens y estados del uso', () => {
        const r = demanda(con({ 'card-hero': ['p-double', 'radius-lg'] }), 'card-hero md:card-hero hover:card-hero');
        expect(r.warnings).toEqual([]);
        const css = plano(r.css);
        expect(css).toContain('.card-hero { border-radius: var(--ts-radius-lg); corner-shape: var(--ts-corner-shape); padding: var(--ts-space-double); }');
        expect(css).toContain('@media (width >= 48rem) { .md\\:card-hero { border-radius: var(--ts-radius-lg); corner-shape: var(--ts-corner-shape); padding: var(--ts-space-double); } }');
        expect(css).toContain('@media (hover: hover) { .hover\\:card-hero:hover { border-radius: var(--ts-radius-lg); corner-shape: var(--ts-corner-shape); padding: var(--ts-space-double); } }');
    });
});

describe('propias con variantes: errores de config', () => {
    const PREFIJO = 'taisho config: utilities.mi-boton';
    it('prefijo desconocido, con sugerencia', () => {
        expect(falla({ 'mi-boton': ['hovr:bg-brand-700'] })).toBe(`${PREFIJO} compone "hovr:bg-brand-700": el prefijo "hovr:" no existe. ¿Se quiso decir "hover:"?`);
    });
    it('fuera de orden, con la cadena canónica', () => {
        expect(falla({ 'mi-boton': ['hover:md:p-base'] })).toBe(`${PREFIJO} compone "hover:md:p-base": la cadena está fuera de orden. ¿Se quiso decir "md:hover:p-base"?`);
    });
    it('cadena que no admite la gramática (dos contextos)', () => {
        expect(falla({ 'mi-boton': ['md:lg:p-base'] })).toBe(
            `${PREFIJO} compone "md:lg:p-base": la cadena no es válida, admite a lo sumo un contexto, un print, un group o peer y un estado, en ese orden, y 3 segmentos.`,
        );
    });
    it('data-ts-* está prohibido', () => {
        expect(falla({ 'mi-boton': ['data-ts-accordion:p-base'] })).toBe(
            `${PREFIJO} compone "data-ts-accordion:p-base": \`data-ts-*\` es el gancho de los componentes, no una variante. Los \`data-<nombre>:\` propios sí valen.`,
        );
    });
    it('variante sobre un componente', () => {
        expect(falla({ 'mi-boton': ['hover:button'] })).toBe(
            `${PREFIJO} compone "hover:button": las variantes aplican sólo a utilidades, y "button" es de un componente o un modificador. Sus estados son \`is-*\`, \`aria\` y los internos.`,
        );
    });
    it('variante sobre un modificador', () => {
        expect(falla({ 'mi-boton': ['md:variant-primary'] })).toBe(
            `${PREFIJO} compone "md:variant-primary": las variantes aplican sólo a utilidades, y "variant-primary" es de un componente o un modificador. Sus estados son \`is-*\`, \`aria\` y los internos.`,
        );
    });
    it('base inexistente tras una cadena válida', () => {
        expect(falla({ 'mi-boton': ['hover:bg-brnd-700'] })).toMatch(
            /^taisho config: utilities\.mi-boton compone "hover:bg-brnd-700", que no existe en el DS \(los nombres no llevan "ts-" y los viejos no existen\) ni entre tus utilities\./,
        );
    });
    it('prefijo sobre otra propia: se rechaza si la cadena compuesta no valida', () => {
        expect(falla({ a: ['lg:p-base'], 'mi-boton': ['md:a'] })).toBe(
            `${PREFIJO} compone "md:a": "a" lleva "lg:p-base" y con "md:" queda "md:lg:p-base", que no es una cadena válida: admite a lo sumo un contexto, un print, un group o peer y un estado, en ese orden, y 3 segmentos.`,
        );
    });
    it('prefijo sobre otra propia que lleva un componente', () => {
        expect(falla({ a: ['button'], 'mi-boton': ['hover:a'] })).toBe(
            `${PREFIJO} compone "hover:a": las variantes aplican sólo a utilidades, y "a" lleva "button", que es de un componente o un modificador.`,
        );
    });
    it('los errores se juntan en un solo Error, uno por utilidad', () => {
        const msg = falla({ 'mi-boton': ['hovr:p-base'], otra: ['hover:md:p-base'] });
        expect(msg.split('\n')).toHaveLength(2);
        expect(msg).toContain('utilities.mi-boton');
        expect(msg).toContain('utilities.otra');
    });
});
