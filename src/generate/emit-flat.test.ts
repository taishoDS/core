// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildFlatCSS, contarDeclaraciones } from './emit-flat';
import { buildAtomicCSS } from './emit-atomic';
import { buildComponentsCSS } from './emit-components';
import { buildUtilitiesCSS } from './emit-utilities';
import { buildResetCSS } from './emit-reset';
import { buildVocabularyColors } from '../config/scales';
import { deriveThemeVocabulary } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';

const v = deriveThemeVocabulary(buildRepoConfig());
const atomic = buildAtomicCSS(buildVocabularyColors(v.userColors, v.userStates), v.userGridMins, v.userScales);
const utilities = buildUtilitiesCSS();
const components = buildComponentsCSS(v.userColors, v.userStates, v.userScales);
const entrada = {
    reset: buildResetCSS(), atomic, utilities, components,
    scales: v.userScales,
    variantesUsadas: new Set(['md:ps-half', 'md:pl-half']),
};
const css = buildFlatCSS(entrada);
const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('nombres vigentes en el CSS plano', () => {
    it('ningún selector de clase lleva `ts-`: todo es `:where(.ts).<nombre>`', () => {
        expect(sinComentarios.match(/\.ts-[A-Za-z0-9]/g) ?? []).toEqual([]);
        expect(css).toContain(':where(.ts).ps-half {');
    });

    it('el nombre viejo no tiene regla propia: la regla de `pl-half` es la de `ps-half`', () => {
        expect(css).not.toContain(':where(.ts).pl-half');
        expect(css.split(':where(.ts).md\\:ps-half {').length - 1).toBe(1);
    });

    it('el nombre nuevo se resuelve en @apply (y en una utilidad propia) como el viejo', () => {
        const demo = buildFlatCSS({ ...entrada, userUtilities: { demo: ['ps-half', 'align-center'] } });
        expect(demo).toMatch(/^\.demo \{\s*padding-inline-start: var\(--ts-space-half\);\s*text-align: center;/m);
    });
});

describe('contarDeclaraciones', () => {
    it('componer la base dentro de :where() no suma una declaración al preludio', () => {
        expect(contarDeclaraciones('.size-sm > & { padding-inline: 1px; }')).toBe(0);
        expect(contarDeclaraciones(':where(.a, .b).size-sm > & { padding-inline: 1px; }')).toBe(0);
    });
    it('un preludio anidado con `:` cuenta por herencia (&:hover)', () => {
        expect(contarDeclaraciones('&:hover { color: red; }')).toBe(1);
        expect(contarDeclaraciones('color: red;\n  &:hover { color: blue; }')).toBe(2);
    });
    it(':where() con paréntesis anidados tampoco cuenta', () => {
        expect(contarDeclaraciones(':where(:not(.x)).y > & { color: red; }')).toBe(0);
        expect(contarDeclaraciones('a: 1;\n  :where(:is(.x, :not(.z))).y > & { color: red; }')).toBe(1);
    });
});

describe('a demanda: el enganche de los bloques forzados', () => {
    it('`forzadas` suma bloques que el código no nombra (los componentes enteros de T3)', () => {
        const base = buildFlatCSS({ ...entrada, variantesUsadas: new Set(), usadas: new Set(['flex']) });
        expect(base).not.toContain(':where(.ts).button {');
        const con = buildFlatCSS({ ...entrada, variantesUsadas: new Set(), usadas: new Set(['flex']), forzadas: new Set(['ts-button']) });
        expect(con).toContain(':where(.ts).button {');
        expect(con).toContain(':where(.ts).flex {');
        expect(con).not.toContain(':where(.ts).grid {');
    });
});

describe('orden de las variantes: no depende del recorrido', () => {
    const a = { ...entrada, usadas: new Set<string>() };
    const pos = (texto: string, clase: string) => {
        const i = texto.indexOf(`${clase} {`);
        expect(i, clase).toBeGreaterThan(-1);
        return i;
    };
    const mediaMd = (texto: string) => texto.slice(texto.indexOf('@media (width >= 48rem) {'));
    const propias = { 'mi-tarjeta': ['p-base'], 'mi-boton': ['md:px-base', 'hover:bg-brand-800'] };
    const clases = [
        'md:p-double', 'md:px-base', 'md:inline-flex', 'md:hidden', 'md:flex', 'md:material-medium', 'md:radius-none', 'md:mi-tarjeta', 'md:mi-boton',
        '@md:flex', '@md:hidden', 'max-md:hidden', 'max-md:flex', 'hover:underline', 'hover:no-underline', 'hover:mi-tarjeta', 'aria-selected:underline', 'aria-expanded:underline',
        'group-hover:underline', 'group-hover/menu:underline', 'md:hover:underline', 'print:hidden', 'print:block',
    ];
    const armar = (lista: string[]) => buildFlatCSS({ ...a, userUtilities: propias, variantesUsadas: new Set(lista) });

    it('el mismo conjunto de clases, en cualquier orden, da CSS byte-idéntico', () => {
        const css = armar(clases);
        expect(armar([...clases].reverse())).toBe(css);
        for (let corte = 1; corte < clases.length; corte++) expect(armar([...clases.slice(corte), ...clases.slice(0, corte)])).toBe(css);
    });

    it('la propia va antes que las atómicas del mismo nivel, aunque el código nombre primero la atómica', () => {
        const uso = (lista: string[]) => armar(lista);
        for (const css of [uso(['md:flex', 'md:mi-tarjeta', 'hover:underline', 'hover:mi-tarjeta']), uso(['hover:mi-tarjeta', 'hover:underline', 'md:mi-tarjeta', 'md:flex'])]) {
            expect(pos(css, '.md\\:mi-tarjeta')).toBeLessThan(pos(css, ':where(.ts).md\\:flex'));
            expect(pos(css, '.hover\\:mi-tarjeta:hover')).toBeLessThan(pos(css, ':where(.ts).hover\\:underline:hover'));
        }
    });

    it('el radio va después de material: la compuesta sale antes que la de una sola propiedad', () => {
        for (const lista of [['md:radius-none', 'md:material-medium'], ['md:material-medium', 'md:radius-none']]) {
            const css = mediaMd(armar(lista));
            expect(pos(css, ':where(.ts).md\\:material-medium')).toBeLessThan(pos(css, ':where(.ts).md\\:radius-none'));
        }
    });

    it('una abreviada va antes que sus partes, sea cual sea su valor', () => {
        const pares = [['p-double', 'px-base'], ['p-base', 'px-double'], ['gap-double', 'gap-x-base'], ['gap-base', 'gap-x-double'], ['inset-0', 'top-none'], ['place-items-center', 'items-start']];
        for (const [abreviada, parte] of pares) {
            const css = mediaMd(armar([`md:${parte}`, `md:${abreviada}`]));
            expect(pos(css, `:where(.ts).md\\:${abreviada}`), `${abreviada} antes que ${parte}`).toBeLessThan(pos(css, `:where(.ts).md\\:${parte}`));
        }
    });

    it('dentro de una misma propiedad decide el nombre', () => {
        const css = mediaMd(armar(['md:hidden', 'md:flex', 'md:block']));
        expect(pos(css, ':where(.ts).md\\:block')).toBeLessThan(pos(css, ':where(.ts).md\\:flex'));
        expect(pos(css, ':where(.ts).md\\:flex')).toBeLessThan(pos(css, ':where(.ts).md\\:hidden'));
    });
});

describe('orden de la base: la más específica gana', () => {
    const pos = (texto: string, clase: string) => {
        const i = texto.indexOf(`:where(.ts).${clase} {`);
        expect(i, clase).toBeGreaterThan(-1);
        return i;
    };
    const completo = css;
    const aDemanda = (clases: string[]) => buildFlatCSS({ ...entrada, usadas: new Set(clases), variantesUsadas: new Set<string>() });

    it('la abreviada va antes que sus partes: de un lado, de un eje y de la familia', () => {
        const pares = [
            ['p-double', 'px-half'], ['p-double', 'pt-half'], ['px-double', 'ps-half'], ['m-double', 'mx-half'], ['mx-double', 'me-half'],
            ['inset-0', 'top-half'], ['inset-x-0', 'start-half'], ['gap-double', 'gap-x-half'], ['gap-double', 'gap-y-half'],
            ['border-background-100', 'border-t-2'], ['border-t-background-100', 'border-t-2'], ['place-items-center', 'items-start'], ['overflow-hidden', 'overflow-x-auto'],
        ];
        for (const [abreviada, parte] of pares) {
            expect(pos(completo, abreviada), `completo: ${abreviada} antes que ${parte}`).toBeLessThan(pos(completo, parte));
            for (const orden of [[abreviada, parte], [parte, abreviada]]) {
                const css = aDemanda(orden);
                expect(pos(css, abreviada), `a demanda ${orden.join(' ')}`).toBeLessThan(pos(css, parte));
            }
        }
    });
});
