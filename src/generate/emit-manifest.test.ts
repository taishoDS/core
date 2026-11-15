// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildComponentManifest, buildManifestJSON, nombresDeBloque, BLOQUES_SUELTOS, PREFIJOS_EXTRA } from './emit-manifest';
import { leerFuentesManifiesto } from './manifest-fuentes';
import { derivarVocabulario } from './compile';
import { buildRepoConfig } from '../config/pipeline';

const raiz = path.resolve(__dirname, '../..');
const css = derivarVocabulario(buildRepoConfig()).components;
const fuentes = leerFuentesManifiesto(raiz);
const manifiesto = buildComponentManifest({ css, ...fuentes });

describe('manifiesto componente → bloques — datos reales', () => {
    it('cada @utility de components.css pertenece a exactamente un componente (o es un suelto declarado)', () => {
        const bloques = [...new Set(nombresDeBloque(css))];
        const asignados = Object.values(manifiesto.componentes).flatMap((c) => c.bloques);
        expect(new Set(asignados).size).toBe(asignados.length);
        expect([...asignados, ...manifiesto.sueltos].sort()).toEqual([...bloques].sort());
        expect(manifiesto.sueltos).toEqual([...BLOQUES_SUELTOS]);
    });

    it('los prefijos extra apuntan a componentes que existen', () => {
        for (const slug of Object.values(PREFIJOS_EXTRA)) expect(fuentes.slugs).toContain(slug);
    });

    it('todo claseDS(\'…\') literal de src/lib/core está cubierto por el manifiesto', () => {
        expect(fuentes.claseDS.length).toBeGreaterThan(0);
        const runtime = new Set(Object.values(manifiesto.componentes).flatMap((c) => c.runtime));
        for (const c of fuentes.claseDS) expect(runtime.has(c), `claseDS('${c}')`).toBe(true);
    });

    it('lo que crea el JS cae en el componente que lo dibuja', () => {
        expect(manifiesto.componentes['date-picker'].runtime).toEqual(expect.arrayContaining(['calendar-day', 'calendar-day-mark']));
        expect(manifiesto.componentes['date-picker'].bloques).toContain('calendar-day');
        expect(manifiesto.componentes['toast'].bloques).toEqual(expect.arrayContaining(['toast', 'toaster']));
        expect(manifiesto.componentes['date-picker'].gancho).toBe('data-ts-date-picker');
    });

    it('es estable: el JSON emitido coincide con el del disco (lo vigila también check:drift)', () => {
        const disco = fs.readFileSync(path.join(raiz, 'src/lib/css/manifiesto-componentes.json'), 'utf8');
        expect(buildManifestJSON(manifiesto)).toBe(disco);
    });
});

describe('manifiesto componente → bloques — falla fuerte', () => {
    const base = { slugs: ['button', 'date-picker'], claseDS: [], hooks: [] };

    it('un bloque huérfano rompe la emisión', () => {
        expect(() => buildComponentManifest({ ...base, css: '@utility ts-button {\n}\n@utility ts-huerfano {\n}\n' })).toThrow(/sin componente: huerfano/);
    });

    it('un bloque reclamado por dos componentes rompe la emisión', () => {
        expect(() => buildComponentManifest({ ...base, slugs: ['date-picker', 'datepicker'], css: '@utility ts-datepicker-field {\n}\n' })).toThrow(/más de un componente/);
    });

    it('un claseDS que no existe en el CSS rompe la emisión', () => {
        expect(() => buildComponentManifest({ ...base, css: '@utility ts-button {\n}\n', claseDS: ['button-fantasma'] })).toThrow(/no existe en components.css/);
    });

    it('gana el prefijo más largo y los anidados se asignan al dueño del bloque', () => {
        const m = buildComponentManifest({
            ...base,
            slugs: ['button', 'button-group'],
            css: '@utility ts-button {\n  & .ts-button-mark {}\n}\n@utility ts-button-group {\n}\n',
            claseDS: ['button-mark'],
        });
        expect(m.componentes['button-group'].bloques).toEqual(['button-group']);
        expect(m.componentes['button'].runtime).toEqual(['button-mark']);
    });
});
