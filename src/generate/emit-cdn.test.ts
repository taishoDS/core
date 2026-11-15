// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { partirFull, separarItems, ORDEN_CAPAS } from './emit-cdn';
import { BLOQUES_COMPARTIDOS, type ComponentManifest } from './emit-manifest';
import { compile } from './compile';
import { SLUGS_DEL_CORE } from './slugs-core';
import { buildRepoConfig } from '../config/pipeline';

const raiz = path.resolve(__dirname, '../..');
const full = compile(buildRepoConfig(), []).css;
const manifiesto: ComponentManifest = JSON.parse(fs.readFileSync(path.join(raiz, 'src/lib/css/manifiesto-componentes.json'), 'utf8'));
const core = [...SLUGS_DEL_CORE];
const partes = partirFull(full, manifiesto, core);

const capas = (css: string) =>
    separarItems(css).flatMap((capa) => {
        const m = /^@layer ([\w-]+) \{\n/.exec(capa);
        return m && m[1] !== 'base' ? [{ nombre: m[1], items: separarItems(capa.slice(m[0].length, capa.lastIndexOf('\n}'))) }] : [];
    });
const items = (css: string) => capas(css).flatMap((c) => c.items);
const bloqueDe = (item: string) => /^:where\(\.ts\)\.((?:[^\s,{:.[>+~\\]|\\.)*)\s*[,{]/.exec(item)?.[1].replaceAll('\\', '') ?? null;
const duenoDe = new Map(Object.entries(manifiesto.componentes).flatMap(([s, c]) => c.bloques.map((b) => [b, s] as const)));

describe('CDN sin componentes — partir taisho.full.css', () => {
    it('el manifiesto lista sólo los componentes del Core, y se reparten', () => {
        expect(Object.keys(manifiesto.componentes).sort()).toEqual([...core].sort());
        expect(Object.keys(partes.porComponente).length + partes.sinBloques.length).toBe(core.length);
        expect(partes.sinBloques.sort()).toEqual(['alert-dialog', 'container', 'field', 'stack', 'visually-hidden']);
    });

    it('base ∪ components cubre todas las reglas del full', () => {
        const delFull = items(full);
        const salida = [...items(partes.base), ...items(partes.components)];
        expect([...salida].sort()).toEqual([...delFull].sort());
    });

    it('la base conserva el orden del full y no tiene ningún bloque de componente', () => {
        const delFull = items(full);
        const base = items(partes.base);
        expect(delFull.filter((i) => base.includes(i))).toEqual(base);
        for (const i of base) expect(duenoDe.has(bloqueDe(i) ?? ''), bloqueDe(i) ?? '').toBe(false);
        expect(partes.base).toContain(ORDEN_CAPAS);
        expect(partes.base).toContain('box-sizing: border-box');
    });

    it('ningún bloque aparece en dos archivos de componente (salvo los compartidos), y cada archivo sólo tiene los de su componente', () => {
        const vistos = new Map<string, string>();
        for (const [slug, css] of Object.entries(partes.porComponente)) {
            for (const { nombre: capa, items: lista } of capas(css)) {
                for (const i of lista) {
                    const b = bloqueDe(i)!;
                    if (BLOQUES_COMPARTIDOS[b]) {
                        expect(BLOQUES_COMPARTIDOS[b], `${slug}: ${b}`).toContain(slug);
                        continue;
                    }
                    expect(duenoDe.get(b), `${slug}: ${b}`).toBe(slug);
                    expect(vistos.get(`${capa}:${b}`), `${b} repetido`).toBeUndefined();
                    vistos.set(`${capa}:${b}`, slug);
                }
            }
            expect(css).toContain(ORDEN_CAPAS);
        }
    });

    it('components.css es la unión de los archivos de componente, en el orden del full', () => {
        const unidos = [...new Set(Object.values(partes.porComponente).flatMap(items))];
        const todos = items(partes.components);
        expect([...todos].sort()).toEqual([...unidos].sort());
        expect(items(full).filter((i) => todos.includes(i))).toEqual(todos);
    });

    it('un bloque compartido (`required-proxy`) va entero a cada componente que lo usa, una vez a components y nunca a la base', () => {
        for (const [bloque, slugs] of Object.entries(BLOQUES_COMPARTIDOS)) {
            const reglas = slugs.map((s) => items(partes.porComponente[s]).find((i) => bloqueDe(i) === bloque));
            expect(reglas.every((r) => r !== undefined), bloque).toBe(true);
            expect(new Set(reglas).size).toBe(1);
            expect(items(partes.components).filter((i) => bloqueDe(i) === bloque)).toEqual([reglas[0]]);
            expect(items(partes.base).some((i) => bloqueDe(i) === bloque)).toBe(false);
            expect(duenoDe.has(bloque)).toBe(false);
        }
    });

    it('no pierde las reglas con selectores escapados ni los @keyframes (quedan en la base)', () => {
        expect(partes.base).toContain('@keyframes ts-spin');
        expect(partes.porComponente['button']).toContain(':where(.ts).button');
    });
});

describe('Capas: base, components, utilities, states, utility-states', () => {
    const delComponente = (b: string | null) => b !== null && (duenoDe.has(b) || b in BLOQUES_COMPARTIDOS);
    const aDemanda = compile(buildRepoConfig(), [{ file: 'a.html', content: '<button class="ts button bg-danger-700 hover:bg-success-500 md:flex print:hidden">x</button><div class="ts tabs"></div>' }], { onDemand: true }).css;
    const archivos = { full, aDemanda, 'CDN base': partes.base, 'CDN components': partes.components, 'CDN button': partes.porComponente['button'] };

    for (const [nombre, css] of Object.entries(archivos)) {
        it(`${nombre}: declara el orden de las cinco capas antes que cualquier regla`, () => {
            expect(css.indexOf(ORDEN_CAPAS)).toBeGreaterThan(-1);
            expect(css.slice(0, css.indexOf(ORDEN_CAPAS))).not.toMatch(/@layer|[{}]/);
            expect(css.match(/@layer [\w, -]+;/g)).toEqual([ORDEN_CAPAS]);
        });

        it(`${nombre}: ninguna utilidad en components ni en states, ningún componente en utilities ni en utility-states`, () => {
            for (const { nombre: capa, items: lista } of capas(css)) {
                const deComponente = capa === 'components' || capa === 'states';
                for (const i of lista) {
                    const b = bloqueDe(i);
                    if (deComponente) expect(delComponente(b), `${capa}: ${i.slice(0, 60)}`).toBe(true);
                    else expect(delComponente(b), `${capa}: ${b}`).toBe(false);
                }
            }
        });
    }

    it('el full y el CDN parten cada componente con estados en dos capas, con las mismas reglas', () => {
        const nombres = (css: string) => capas(css).map((c) => c.nombre);
        expect(nombres(full)).toEqual(['components', 'utilities', 'states', 'utility-states', 'print']);
        expect(nombres(partes.base)).toEqual(['utilities', 'utility-states', 'print']);
        expect(nombres(partes.porComponente['button'])).toEqual(['components', 'states']);
        expect(nombres(aDemanda)).toEqual(['components', 'utilities', 'states', 'utility-states', 'print']);
    });

    it('las utilidades con variante de estado van a utility-states, print: a su propia capa final y md: se queda en utilities', () => {
        const [, utilidades, , conEstado, impresion] = capas(aDemanda);
        expect(conEstado.items.join('\n')).toContain('hover\\:bg-success-500');
        expect(utilidades.items.join('\n')).not.toContain('hover\\:');
        expect(utilidades.items.join('\n')).not.toContain('print');
        expect(impresion.items.join('\n')).toContain('print\\:hidden');
        expect(utilidades.items.join('\n')).toContain('(width >= ');
    });
});
