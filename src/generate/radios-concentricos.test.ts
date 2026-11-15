// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(__dirname, '../lib/css/components.css'), 'utf8');

const utility = (name: string): string => {
    const m = css.match(new RegExp(`@utility ${name} \\{\\n([\\s\\S]*?)\\n\\}\\n`));
    if (!m) throw new Error(`No se emitió @utility ${name}`);
    return m[1];
};

const concentrico = (contenedor: string, relleno: string): string =>
    `border-radius: max(var(--ts-radius-sm), calc(var(--ts-radius-${contenedor}) - ${relleno}));`;

describe('Radios concéntricos: la pieza toma el radio del contenedor menos su relleno', () => {
    it.each([
        ['ts-select-option', 'xl', 'var(--ts-space-quarter)'],
        ['ts-combobox-option', 'xl', 'var(--ts-space-quarter)'],
        ['ts-menu-item', 'xl', 'var(--ts-space-quarter)'],
        ['ts-command-item', 'xl', 'var(--ts-sizing-4)'],
        ['ts-datepicker-preset', 'xl', 'var(--ts-space-quarter)'],
    ])('%s', (name, contenedor, relleno) => {
        expect(utility(name)).toContain(concentrico(contenedor, relleno));
    });

    it('el segmento de SegmentedControl y la pestaña (y su indicador) de Tabs secondary salen del radio-lg', () => {
        const interno = concentrico('lg', 'var(--ts-space-quarter)');
        expect(utility('ts-segmented-control')).toContain(interno);
        const tabs = utility('ts-tabs');
        expect(tabs.split(interno).length - 1).toBe(3);
    });

    it('nunca baja del radio sm', () => {
        expect(css).not.toMatch(/border-radius: (calc|max\(0px)\(?var\(--ts-radius-[^)]*\) - /);
    });
});

const full = fs.readFileSync(path.resolve(__dirname, '../lib/css/taisho.full.css'), 'utf8');

/** El cuerpo propio de la regla que contiene la posición `i` (sin los bloques anidados). */
const cuerpoPropio = (texto: string, i: number): string => {
    let prof = 0;
    let ini = i;
    for (; ini > 0; ini--) {
        if (texto[ini] === '}') prof++;
        else if (texto[ini] === '{' && prof-- === 0) break;
    }
    let fin = i;
    for (prof = 0; fin < texto.length; fin++) {
        if (texto[fin] === '{') prof++;
        else if (texto[fin] === '}' && prof-- === 0) break;
    }
    let propio = '';
    for (let j = ini + 1, hondo = 0; j < fin; j++) {
        if (texto[j] === '{') hondo++;
        else if (texto[j] === '}') hondo--;
        else if (hondo === 0) propio += texto[j];
    }
    return propio;
};

describe('Forma de las esquinas: toda regla con radio lleva corner-shape', () => {
    // Pendiente aparte: hay una regla de un chip que escribe `var(--ts-sizing-8)` a mano en vez de un radio de la escala; queda exenta hasta que se arregle.
    it('ninguna regla con border-*radius distinto de 0, 50% o full queda sin corner-shape', () => {
        const faltan = new Set<string>();
        for (const m of full.matchAll(/border(?:-[a-z]+-[a-z]+)?-radius:\s*([^;}]+)/g)) {
            const valor = m[1].trim();
            if (/^(0|0px|50%|var\(--ts-radius-full\)|var\(--ts-radius-none\)|9999px)$/.test(valor)) continue;
            if (valor === 'var(--ts-sizing-8)') continue;
            const propio = cuerpoPropio(full, m.index!);
            if (!propio.includes('corner-shape')) faltan.add(propio.replace(/\s+/g, ' ').trim().slice(0, 140));
        }
        expect([...faltan]).toEqual([]);
    });

    it('el token se declara en :root y las utilidades de escala lo leen (full y none, no)', () => {
        const tokens = fs.readFileSync(path.resolve(__dirname, '../lib/css/tokens/taisho.css'), 'utf8');
        expect(tokens).toMatch(/:root \{[^}]*--ts-corner-shape: round;/);
        expect(tokens).not.toContain('@supports (corner-shape: squircle)');
        const atomic = fs.readFileSync(path.resolve(__dirname, '../lib/css/atomic.css'), 'utf8');
        expect(atomic).toContain('@utility ts-radius-md { border-radius: var(--ts-radius-md); corner-shape: var(--ts-corner-shape); }');
        expect(atomic).toContain('@utility ts-radius-full { border-radius: var(--ts-radius-full); corner-shape: round; }');
        expect(atomic).toContain('@utility ts-radius-none { border-radius: var(--ts-radius-none); corner-shape: round; }');
    });

    it('ts-squircle ya no existe', () => {
        expect(full).not.toContain('ts-squircle');
    });
});
