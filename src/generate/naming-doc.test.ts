// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { aplicarBloques } from './naming-doc';
import { leerEmitidos } from './naming-emitidos';
import { escalasDe, validarAtomico, validarComponente } from './naming-table';
import { renombrar } from './naming-renames';
import { buildVocabularyColors } from '../config/scales';
import { userColors, userStates, userGridMins } from '../config/taisho.user';

const md = fs.readFileSync(path.join(process.cwd(), 'NAMING.md'), 'utf8');

describe('NAMING.md', () => {
    it('las secciones generadas están al día (si falla: npm run generate:naming)', () => {
        expect(aplicarBloques(md, leerEmitidos().todos)).toBe(md);
    });

    it('no miente: todo ejemplo `ts-…` es un nombre viejo con sucesor, un atómico válido o un componente válido', () => {
        const esc = escalasDe({ gridMins: Object.keys(userGridMins) });
        const fam = Object.keys(buildVocabularyColors(userColors, userStates));
        const ejemplos = [...new Set(md.match(/(?<![A-Za-z0-9-])ts-[A-Za-z0-9/-]*[A-Za-z0-9](?![-A-Za-z0-9*<>/])/g) ?? [])];
        expect(ejemplos.length).toBeGreaterThan(50);
        const mentiras = ejemplos.filter(
            (n) => renombrar(n) === null && validarAtomico(n, esc, fam).length > 0 && validarComponente(n).length > 0,
        );
        expect(mentiras).toEqual([]);
    });
});
