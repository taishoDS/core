// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildRepoConfig } from '../config/pipeline';
import { derivarVocabulario } from './compile';
import { escribirPartes, leerPartes, partirEstados, selectoresDeLista, type Parte } from './capa-estados';
import { prepararFlat } from './emit-flat';
import { tieneMarcaDeEstado } from './estados';

const v = derivarVocabulario(buildRepoConfig());
const p = prepararFlat({ reset: v.reset, atomic: v.atomic, utilities: v.utilities, components: v.components, scales: v.userScales, userUtilities: v.userUtilities });
const reglasDeComponentes = p.bloques.filter((b) => p.componentes.has(b.name)).map((b) => ({ nombre: b.name, css: p.reglaDe(b).css }));

/** Cada declaración con su cadena de selectores y de at-rules: lo único que decide la cascada, sin formato ni anidado. */
function hojas(partes: readonly Parte[], selectores: string[] = [], ats: string[] = []): Array<{ ats: string; selector: string; decl: string }> {
    const norm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    return partes.flatMap((x) => {
        if ('texto' in x) {
            const d = norm(x.texto);
            return d ? [{ ats: ats.join('|'), selector: selectores.join(' > '), decl: d }] : [];
        }
        const pre = norm(x.prelude);
        if (pre.startsWith('@')) return hojas(x.cuerpo, selectores, [...ats, pre]);
        return selectoresDeLista(pre).flatMap((alternativa) => hojas(x.cuerpo, [...selectores, alternativa], ats));
    });
}

describe('capa-estados: partir un componente en reposo y estados', () => {
    it('lee y vuelve a escribir sin perder un byte', () => {
        for (const { nombre, css } of reglasDeComponentes) expect(escribirPartes(leerPartes(css)), nombre).toBe(css);
    });

    it('los estados conservan el envoltorio, el orden y las reglas anidadas', () => {
        const r = partirEstados(':where(.ts).x {\n  color: red;\n  &.a { color: blue; &:hover { color: green; } &.b { top: 0; } }\n  @media (m) { &:disabled { color: gray; } &.c { left: 0; } }\n  &:focus-visible { outline: none; }\n}');
        expect(r.reposo.replace(/\s+/g, ' ')).toBe(':where(.ts).x { color: red; &.a { color: blue; &.b { top: 0; } } @media (m) { &.c { left: 0; } } }');
        expect(r.estados.replace(/\s+/g, ' ')).toBe(':where(.ts).x { &.a { &:hover { color: green; } } @media (m) { &:disabled { color: gray; } } &:focus-visible { outline: none; } }');
    });

    it('una lista de selectores mezclada reparte cada selector en su capa, con el mismo cuerpo', () => {
        const r = partirEstados(':where(.ts).x {\n  &.v, &.v:focus-within { outline: none; }\n}');
        expect(r.reposo.replace(/\s+/g, ' ')).toBe(':where(.ts).x { &.v { outline: none; } }');
        expect(r.estados.replace(/\s+/g, ' ')).toBe(':where(.ts).x { &.v:focus-within { outline: none; } }');
    });

    it('sin estados, el reposo es la regla entera y los estados quedan vacíos', () => {
        const css = ':where(.ts).x {\n  color: red;\n  &.a { top: 0; }\n}';
        expect(partirEstados(css)).toEqual({ reposo: css, estados: '' });
    });

    it('un componente de sólo estados no deja una regla vacía en reposo', () => {
        const r = partirEstados(':where(.ts).x {\n  &:hover { color: red; }\n}');
        expect(r.reposo).toBe('');
        expect(r.estados).toContain('&:hover');
    });

    it('invariante sobre todos los componentes: las mismas declaraciones, ninguna de estado en reposo, todas con estado en estados', () => {
        let conEstados = 0;
        for (const { nombre, css } of reglasDeComponentes) {
            const r = partirEstados(css);
            const antes = hojas(leerPartes(css));
            const reposo = hojas(leerPartes(r.reposo));
            const estados = hojas(leerPartes(r.estados));
            expect([...reposo, ...estados].map((h) => JSON.stringify(h)).sort(), nombre).toEqual(antes.map((h) => JSON.stringify(h)).sort());
            const subsecuencia = (sub: typeof antes) => {
                let i = 0;
                for (const h of antes) if (i < sub.length && JSON.stringify(h) === JSON.stringify(sub[i])) i++;
                return i === sub.length;
            };
            expect(subsecuencia(reposo), `${nombre}: orden del reposo`).toBe(true);
            expect(subsecuencia(estados), `${nombre}: orden de los estados`).toBe(true);
            for (const h of reposo) expect(tieneMarcaDeEstado(h.selector), `${nombre}: ${h.selector}`).toBe(false);
            for (const h of estados) expect(tieneMarcaDeEstado(h.selector), `${nombre}: ${h.selector}`).toBe(true);
            if (estados.length) conEstados++;
        }
        expect(conEstados).toBeGreaterThan(40);
    });
});
