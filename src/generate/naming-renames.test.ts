// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { renombrar, tablaRenombres, esMecanico, type Renombre } from './naming-renames';

import { leerEmitidos } from './naming-emitidos';
import { validarAtomico, escalasDe } from './naming-table';
import { buildVocabularyColors } from '../config/scales';
import { userColors, userStates, userGridMins } from '../config/taisho.user';

const ESPERADO = { atomicas: 3093, utilities: 56, componentes: 201, extensionDelSitio: 75, mecanicos: 376 };

const E = leerEmitidos();
const manifiesto = JSON.parse(fs.readFileSync('src/lib/css/manifiesto-componentes.json', 'utf8')) as {
    componentes: Record<string, { bloques: string[] }>;
    sueltos: string[];
};
const delCore = new Set([...Object.values(manifiesto.componentes).flatMap((c) => c.bloques), ...manifiesto.sueltos].map((b) => `ts-${b}`));
const compCore = E.comp.filter((n) => delCore.has(n));
const extension = E.comp.length - compCore.length;
const ESPERADO_TOTAL = ESPERADO.atomicas + ESPERADO.utilities + ESPERADO.componentes + extension;
const emitidos = E.todos;
const tabla = tablaRenombres(emitidos);
const set = new Set(emitidos);
describe('tabla viejo→nuevo', () => {
    it('las cuentas de lo emitido coinciden con ESPERADO (ver el comentario de la constante)', () => {
        expect({ atomicas: E.atomic.length, utilities: E.utils.length, componentes: compCore.length }).toEqual({
            atomicas: ESPERADO.atomicas, utilities: ESPERADO.utilities, componentes: ESPERADO.componentes,
        });
        // Lo que no es del Core es la extensión del sitio: ninguna en el repo público, ESPERADO.extensionDelSitio en el del sitio.
        expect([0, ESPERADO.extensionDelSitio]).toContain(extension);
        expect(emitidos.length).toBe(ESPERADO_TOTAL);
    });

    it('tiene los renombres mecánicos de ESPERADO (lado físico inline + text-* + cursor-cell)', () => {
        expect(tabla.filter(esMecanico).length).toBe(ESPERADO.mecanicos);
    });

    it('invariante central: toda violación de validarAtomico sobre lo emitido tiene entrada en la tabla', () => {
        const esc = escalasDe({ gridMins: Object.keys(userGridMins) });
        const fam = Object.keys(buildVocabularyColors(userColors, userStates));
        const sinEntrada = [...E.atomic, ...E.utils].filter((n) => validarAtomico(n, esc, fam).length > 0 && renombrar(n) === null);
        expect(sinEntrada).toEqual([]);
    });

    it('ejemplos de cada regla', () => {
        expect(renombrar('ts-ml-quarter-negative')?.nuevo).toBe('ts-ms-neg-quarter');
        expect(renombrar('ts-mb-1-negative')?.nuevo).toBe('ts-mb-neg-1');
        expect(renombrar('ts-m-none-negative')).toMatchObject({ nuevo: 'ts-m-none', fusion: true });
        expect(renombrar('ts-pl-half')?.nuevo).toBe('ts-ps-half');
        expect(renombrar('ts-right-0')?.nuevo).toBe('ts-end-0');
        expect(renombrar('ts-text-left')?.nuevo).toBe('ts-align-start');
        expect(renombrar('ts-text-balance')?.nuevo).toBe('ts-wrap-balance');
        expect(renombrar('ts-text-heading-14')?.nuevo).toBe('ts-type-heading-14');
        expect(renombrar('ts-border-r-gray-100')?.nuevo).toBe('ts-border-e-gray-100');
        expect(renombrar('ts-border-l-gray-100')?.nuevo).toBe('ts-border-s-gray-100');
        expect(renombrar('ts-radius-tl-inherit')?.nuevo).toBe('ts-radius-ss-inherit');
        expect(renombrar('ts-outline-focus-gray-100')?.nuevo).toBe('ts-outline-gray-100');
        expect(renombrar('ts-cursor-cell-select')).toMatchObject({ nuevo: 'ts-cursor-cell', regla: 'valor-css' });
        expect(renombrar('ts-ml-none-negative')).toMatchObject({ nuevo: 'ts-ms-none', fusion: true });
        expect(renombrar('ts-ml-none')).toMatchObject({ nuevo: 'ts-ms-none' });
        expect(renombrar('ts-ml-none')?.fusion).toBeUndefined();
        expect(renombrar('ts-density-compact')).toMatchObject({ nuevo: 'ts-compact', regla: 'contexto' });
        expect(esMecanico(renombrar('ts-density-compact')!)).toBe(false);
        expect(renombrar('ts-color-btn')).toMatchObject({ nuevo: null, regla: 'color-btn' });
    });

    it('lo que no cambia, no está en la tabla', () => {
        for (const n of ['ts-mx-half', 'ts-py-section', 'ts-text-14', 'ts-top-0', 'ts-inset-x-0', 'ts-gap-x-half']) {
            expect(renombrar(n)).toBeNull();
        }
    });

    it('ningún nombre nuevo choca con uno emitido, salvo las fusiones declaradas (mismo CSS)', () => {
        const choques = tabla.filter((t) => t.nuevo && set.has(t.nuevo));
        expect(choques.length).toBeGreaterThan(0);
        expect(choques.every((t) => t.fusion)).toBe(true);
    });

    it('dos nombres viejos sólo comparten sucesor si es una fusión de `none`, y a lo sumo uno lleva selector de alias', () => {
        const porNuevo = new Map<string, Renombre[]>();
        for (const t of tabla) if (t.nuevo) porNuevo.set(t.nuevo, [...(porNuevo.get(t.nuevo) ?? []), t]);
        for (const [nuevo, ts] of porNuevo) {
            if (ts.length > 1) expect(nuevo).toMatch(/-none$/);
            expect(ts.filter((t) => !t.fusion).length, nuevo).toBeLessThanOrEqual(1);
        }
    });

    it('los sucesores cumplen la gramática: sin -negative ni lado físico', () => {
        for (const t of tabla) {
            if (!t.nuevo) continue;
            expect(t.nuevo).not.toMatch(/-negative$|-important$/);
            expect(t.nuevo).not.toMatch(/^ts-(ml|mr|pl|pr|left|right|border-r|border-l)-/);
        }
    });
});

describe('primary (rol, no paleta)', () => {
    const esc = escalasDe({ gridMins: Object.keys(userGridMins) });
    const fam = Object.keys(buildVocabularyColors(userColors, userStates));
    it('acepta sólo la forma -solid', () => {
        for (const n of ['ts-bg-primary-solid', 'ts-bg-primary-solid-hover', 'ts-color-primary-solid-active-contrast', 'ts-outline-primary-solid'])
            expect(validarAtomico(n, esc, fam)).toEqual([]);
        expect(validarAtomico('ts-bg-primary-500', esc, fam).length).toBeGreaterThan(0);
    });
});
