// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildClassTypes, buildClassTypesExtension } from './emit-classes';
import { derivarVocabulario } from './compile';
import { parseUtilities } from './emit-flat';
import { buildRepoConfig } from '../config/pipeline';
import { tablaRenombres } from './naming-renames';
import { leerEmitidos } from './naming-emitidos';

const miembros = (dts: string, _tipo: string) => {
    const cuerpo = dts.split('export interface TaishoClassRegistry {\n')[1].split('\n}\n')[0];
    return cuerpo.split('\n').map((l) => l.replace(/^\s*"|": true;$/g, ''));
};

describe('buildClassTypes', () => {
    it('vigentes = emitidos − viejos + nuevos, en nombre corto (sin `ts-`); no hay unión de deprecadas', () => {
        const nombres = ['ts-ml-half', 'ts-ms-half-x', 'ts-flex', 'ts-text-left', 'ts-w-1\\/4', 'ts-color-btn'];
        const dts = buildClassTypes(nombres, tablaRenombres(nombres));
        expect(miembros(dts, 'TaishoClass')).toEqual(['align-start', 'flex', 'ms-half', 'ms-half-x', 'w-1/4']);
        expect(dts).not.toContain('TaishoDeprecatedClass');
        expect(dts).not.toContain('@deprecated');
    });

    it('lo emitido: sin duplicados, ningún viejo en TaishoClass, todos los nuevos presentes, ninguno con `ts-`', () => {
        const { todos, aliases } = leerEmitidos();
        const dts = buildClassTypes(todos, tablaRenombres(todos));
        const vigentes = miembros(dts, 'TaishoClass');
        const viejos = tablaRenombres(todos).map((t) => t.viejo.slice(3));
        expect(new Set(vigentes).size).toBe(vigentes.length);
        expect(vigentes.filter((n) => viejos.includes(n) || n.startsWith('ts-'))).toEqual([]);
        for (const a of aliases) expect(vigentes).toContain(a.slice(3));
    });

    it('classes.d.ts del repo está al día (si falla: npm run generate) y es el del Core: sin los nombres de las extensiones', () => {
        const v = derivarVocabulario(buildRepoConfig());
        const todos = [v.atomic, v.utilities, v.components].flatMap((css) => parseUtilities(css).map((b) => b.name.replaceAll('\\', '')));
        const esperado = buildClassTypes(todos, tablaRenombres(todos));
        const real = fs.readFileSync(path.resolve(__dirname, '../lib/types/classes.d.ts'), 'utf8');
        expect(real.endsWith(esperado)).toBe(true);
    });
});

describe('buildClassTypesExtension', () => {
    it('es un aumento de TaishoClassRegistry con los nombres de la extensión, sin `ts-` ni escapes, ordenados', () => {
        const dts = buildClassTypesExtension(['ts-zeta', 'ts-acme-card', 'ts-w-1\\/4']);
        expect(dts).toContain("declare module '@taishods/core/classes' {\n  interface TaishoClassRegistry {\n");
        expect(dts.match(/^ {4}"(.+)": true;$/gm)).toEqual(['    "acme-card": true;', '    "w-1/4": true;', '    "zeta": true;']);
        expect(dts.trimEnd().endsWith('export {};')).toBe(true);
    });
});
