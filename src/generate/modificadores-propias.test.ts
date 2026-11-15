// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';

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

const BOTON = {
    'mi-button': ['p-half', 'bg-brand-700', 'hover:bg-brand-800'],
    'mi-button.destructive': ['bg-danger-700', 'hover:bg-danger-800'],
    'mi-button.outlined': ['bg-transparent', 'color-brand-700'],
    'mi-button.destructive.outlined': ['bg-transparent', 'color-danger-700', 'hover:bg-danger-100'],
};

describe('modificadores de propias: lo que se emite', () => {
    const css = plano(demanda(con(BOTON), 'ts mi-button destructive outlined').css);

    it('cada modificador sale en un :where() pegado a la clase', () => {
        expect(css).toContain('.mi-button:where(.destructive) { background-color: var(--color-danger-700); }');
        expect(css).toContain('.mi-button:where(.outlined) {');
        expect(css).toContain('.mi-button:where(.destructive.outlined) {');
    });
    it('el orden: base, simples, compuestos', () => {
        const pos = ['.mi-button {', ':where(.destructive) {', ':where(.outlined) {', ':where(.destructive.outlined) {'].map((x) => css.indexOf(x));
        expect(pos.every((p) => p > 0)).toBe(true);
        expect(pos).toEqual([...pos].sort((a, b) => a - b));
    });
    it('los estados de cada modificador llevan el :where antes del pseudo y salen después de los de la base', () => {
        expect(css).toContain('.mi-button:where(.destructive):hover { background-color: var(--color-danger-800); }');
        expect(css).toContain('.mi-button:where(.destructive.outlined):hover { background-color: var(--color-danger-100); }');
        const pos = ['.mi-button:hover', '.mi-button:where(.destructive):hover', '.mi-button:where(.destructive.outlined):hover'].map((x) => css.indexOf(x));
        expect(pos.every((p) => p > 0)).toBe(true);
        expect(pos).toEqual([...pos].sort((a, b) => a - b));
    });
    it('el modificador va pegado a su base aunque tenga más declaraciones que ella', () => {
        const largo = plano(demanda(con({ chico: ['p-half'], 'chico.grande': ['p-double', 'radius-full', 'bg-brand-700', 'color-brand-100'] }), 'chico grande').css);
        expect(largo.indexOf('.chico {')).toBeLessThan(largo.indexOf('.chico:where(.grande) {'));
    });
    it('el orden es (propia, nº de modificadores, declaración) y no depende de dónde cayó la clave en la config', () => {
        const alReves = plano(demanda(con(Object.fromEntries(Object.entries(BOTON).reverse())), 'ts mi-button destructive outlined').css);
        const pos = ['.mi-button {', ':where(.outlined) {', ':where(.destructive) {', ':where(.destructive.outlined) {'].map((x) => alReves.indexOf(x));
        expect(pos.every((p) => p > 0)).toBe(true);
        expect(pos).toEqual([...pos].sort((a, b) => a - b));
    });
    it('un prefijo del uso se aplica al modificador (md:mi-button destructive)', () => {
        const r = plano(demanda(con(BOTON), 'md:mi-button destructive').css);
        expect(r).toContain('.md\\:mi-button:where(.destructive) { background-color: var(--color-danger-700); }');
        expect(r.indexOf('.md\\:mi-button {')).toBeLessThan(r.indexOf('.md\\:mi-button:where(.destructive) {'));
    });
    it('group-hover: el :where va antes del pseudo', () => {
        const r = plano(demanda(con(BOTON), 'group-hover:mi-button destructive').css);
        expect(r).toContain('.group-hover\\:mi-button:where(.destructive):is(:where(.ts.group):hover *) {');
    });
});

describe('modificadores de propias: snapshot', () => {
    it('los niveles: base, contexto, estados, group-hover y md:, con un modificador compuesto', () => {
        const css = demanda(
            con(BOTON),
            'ts mi-button destructive outlined md:mi-button destructive group-hover:mi-button outlined',
        ).css;
        expect(css.slice(css.indexOf('.mi-button {'))).toMatchSnapshot();
    });
});

describe('modificadores de propias: a demanda', () => {
    it('sin usar el modificador, no sale (0 B)', () => {
        const css = demanda(con(BOTON), 'ts mi-button').css;
        expect(css).not.toContain(':where(.destructive');
        expect(css).not.toContain(':where(.outlined');
    });
    it('un compuesto necesita los dos modificadores', () => {
        const css = demanda(con(BOTON), 'mi-button destructive').css;
        expect(css).toContain(':where(.destructive)');
        expect(css).not.toContain(':where(.destructive.outlined)');
        expect(css).not.toContain(':where(.outlined)');
    });
    it('sin la propia en el código, el modificador tampoco sale', () => {
        expect(demanda(con(BOTON), 'destructive outlined').css).not.toContain('mi-button');
    });
    it('una config sin modificadores da el CSS de siempre aunque el código nombre uno', () => {
        const sin = { 'mi-button': BOTON['mi-button'] };
        expect(demanda(con(sin), 'mi-button destructive').css.replace(/destructive/g, '')).toBe(demanda(con(sin), 'mi-button').css.replace(/destructive/g, ''));
    });
});

describe('modificadores de propias: errores (juntos, uno por clave)', () => {
    it('el componente no está en utilities', () => {
        expect(falla({ 'mi-button.destructive': ['p-half'] })).toBe('taisho config: utilities.mi-button.destructive el componente "mi-button" no está en utilities: declaralo antes, sin modificadores.');
    });
    it('un modificador con nombre inválido', () => {
        expect(falla({ x: ['p-half'], 'x.Grande': ['p-half'] })).toContain('modificador inválido ("Grande")');
        expect(falla({ x: ['p-half'], 'x.': ['p-half'] })).toContain('modificador inválido ("")');
    });
    it('un modificador con prefijo ts-', () => {
        expect(falla({ x: ['p-half'], 'x.ts-a': ['p-half'] })).toContain('no puede empezar con "ts-"');
    });
    it('un modificador que es la llave o una clase de tema', () => {
        expect(falla({ x: ['p-half'], 'x.ts': ['p-half'] })).toContain('llave del modo scope');
        expect(falla({ x: ['p-half'], 'x.dark': ['p-half'] })).toContain('clase de tema');
    });
    it('un modificador que choca con un nombre corto del DS', () => {
        expect(falla({ x: ['p-half'], 'x.color-danger': ['p-half'] })).toContain('choca con un nombre corto del DS');
        expect(falla({ x: ['p-half'], 'x.link': ['p-half'] })).toContain('choca con un nombre corto del DS');
    });
    it('un modificador del Core (variant-link) vale: sin su componente es inerte', () => {
        expect(falla({ x: ['p-half'], 'x.variant-link': ['p-half'] })).toBe('(no falló)');
    });
    it('un modificador que es el nombre de otra propia', () => {
        expect(falla({ x: ['p-half'], 'card-hero': ['p-half'], 'x.card-hero': ['p-half'] })).toContain('es el nombre de otra utilidad propia');
    });
    it('un modificador repetido', () => {
        expect(falla({ x: ['p-half'], 'x.a.a': ['p-half'] })).toContain('repite un modificador');
    });
    it('una permutación repetida', () => {
        expect(falla({ x: ['p-half'], 'x.a.b': ['p-half'], 'x.b.a': ['p-half'] })).toBe('taisho config: utilities.x.b.a repite la combinación de utilities.x.a.b: el orden de los modificadores no importa.');
    });
    it('un compuesto vale sin declarar los simples', () => {
        expect(falla({ x: ['p-half'], 'x.a.b': ['p-half'] })).toBe('(no falló)');
    });
    it('lista vacía', () => {
        expect(falla({ x: ['p-half'], 'x.a': [] })).toContain('utilities.x.a tiene una lista de clases vacía');
    });
    it('las entradas se validan como las de una propia', () => {
        expect(falla({ x: ['p-half'], 'x.a': ['no-existe'] })).toContain('compone "no-existe", que no existe');
        expect(falla({ x: ['p-half'], 'x.a': ['pepe:p-half'] })).toContain('el prefijo "pepe:" no existe');
        expect(falla({ x: ['p-half'], 'x.a': ['hover:button'] })).toContain('las variantes aplican sólo a utilidades');
    });
    it('un modificador no se compone', () => {
        expect(falla({ x: ['p-half'], 'x.a': ['p-double'], y: ['x.a'] })).toContain('utilities.y compone "x.a": un modificador no es una utilidad');
        expect(falla({ x: ['p-half'], 'x.a': ['p-double'], y: ['hover:x.a'] })).toContain('un modificador no es una utilidad');
    });
    it('los errores se juntan, uno por clave y en el orden de la config', () => {
        const m = falla({ x: ['p-half'], 'x.A': ['p-half'], 'z.a': ['p-half'], 'x.b': [] }).split('\n');
        expect(m).toHaveLength(3);
        expect(m[0]).toContain('utilities.x.A');
        expect(m[1]).toContain('utilities.z.a');
        expect(m[2]).toContain('utilities.x.b');
    });
});
