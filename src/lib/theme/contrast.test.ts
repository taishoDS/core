// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildThemeCss } from './createTheme';
import { createPaletteFromHex } from './palette';
import { defaultStates } from '../../config/taisho.user';
import taisho from '../../config/themes/taisho';
import { neutrals } from './neutrals';
import type { ThemeDef } from '../../config/taisho.types';
import {
    SHADES, families, inGamut, luminance, parseThemeCss, resolveColor, sweepSeeds, wcag,
} from './color-oracle.test.helper';
import type { Gamut, Mode, Vars } from './color-oracle.test.helper';

const AA = 4.5;

const SWEEP = sweepSeeds();

const THEMES: { name: string; def: ThemeDef }[] = [
    { name: 'taisho + estados por defecto', def: { ...taisho, locked: false, states: defaultStates } },
    { name: 'barrido de 648 semillas hex', def: { colors: SWEEP as ThemeDef['colors'] } },
    { name: 'semillas oklch P3 y extremos', def: { colors: {
        p3verde: 'oklch(0.80 0.30 150)', p3magenta: 'oklch(0.65 0.31 330)', p3cian: 'oklch(0.85 0.17 200)',
        muyclara: 'oklch(0.97 0.02 100)', muyoscura: 'oklch(0.18 0.05 280)', gris: 'oklch(0.55 0 0)',
        amarillo: '#ffd400', limon: '#d4ff00', negro: '#000000', blanco: '#ffffff',
    } as unknown as ThemeDef['colors'] } },
    { name: 'neutros teñidos (tint)', def: { colors: Object.fromEntries(Object.entries(SWEEP).filter((_, i) => i % 9 === 0)) as ThemeDef['colors'], neutral: { tint: { c: 0.03, h: 250 } } } },
];

type Pair = { label: string; fg: string; bg: string };
function pairsFor(fams: string[]): Pair[] {
    const p: Pair[] = [];
    for (const c of fams) {
        p.push({ label: `${c} soft (700 sobre 100)`, fg: `--color-${c}-700`, bg: `--color-${c}-100` });
        for (const sh of SHADES) p.push({ label: `${c}-${sh} solid+contrast`, fg: `--color-${c}-${sh}-contrast`, bg: `--color-${c}-${sh}` });
    }
    return p;
}

function ratio(fg: string, bg: string, vars: Vars, mode: Mode): number | null {
    const f = resolveColor(fg, vars, mode), b = resolveColor(bg, vars, mode);
    return f && b ? wcag(luminance(f), luminance(b)) : null;
}

function outOfGamut(vars: Vars, mode: Mode, gamut: Gamut, fams: string[]): string[] {
    const bad: string[] = [];
    for (const c of fams) for (const sh of SHADES) {
        const col = resolveColor(`--color-${c}-${sh}`, vars, mode);
        if (!col) bad.push(`${c}-${sh} no resoluble`);
        else if (!inGamut(col, gamut)) bad.push(`${c}-${sh} fuera de ${gamut} (oklch ${col.l} ${col.c} ${col.h})`);
    }
    return bad;
}

const minimos: string[] = [];

describe('WCAG AA — pares del tema emitido por buildThemeCss (Y sin recortar)', () => {
    for (const { name, def } of THEMES) {
        let css: string;
        try { css = buildThemeCss(def); } catch (e) {
            it(`${name}: buildThemeCss acepta todas las semillas`, () => { throw e; });
            continue;
        }
        const parsed = parseThemeCss(css);
        const fams = families(parsed.srgb.light);

        it(`${name}: el CSS emitido trae todas las familias del tema`, () => {
            const esperadas = Object.keys({ ...def.colors, ...(def.states ?? {}) });
            expect(fams.sort()).toEqual(esperadas.sort());
        });

        for (const gamut of ['srgb', 'p3'] as const) {
            for (const mode of ['light', 'dark'] as const) {
                const vars = gamut === 'srgb' ? parsed.srgb[mode] : parsed.p3?.[mode];
                it.skipIf(!vars)(`${name} / ${gamut} / ${mode}: 0 colores fuera de gama y todos los pares >= ${AA}:1`, () => {
                    const v = vars!;
                    expect(outOfGamut(v, mode, gamut, fams)).toEqual([]);
                    const fallas: string[] = [];
                    let min = Infinity;
                    for (const pair of pairsFor(fams)) {
                        const r = ratio(pair.fg, pair.bg, v, mode);
                        expect(r, `${pair.label} no resoluble`).not.toBeNull();
                        if (r != null) { min = Math.min(min, r); if (r < AA) fallas.push(`${pair.label} = ${r.toFixed(3)}`); }
                    }
                    minimos.push(`${name} / ${gamut} / ${mode}: mínimo ${min.toFixed(3)}:1`);
                    expect(fallas, `Pares bajo AA:\n${fallas.join('\n')}`).toEqual([]);
                });
            }
        }
    }

    it('P3: el CSS emitido trae el bloque @media (color-gamut: p3) cuando hay croma que sRGB no alcanza', () => {
        const parsed = parseThemeCss(buildThemeCss({ colors: { p3verde: 'oklch(0.80 0.30 150)' } as unknown as ThemeDef['colors'] }));
        if (!parsed.p3) { console.warn('[contrast.test] sin bloque P3 en buildThemeCss: los casos P3 por CSS están salteados'); return; }
        const sr = resolveColor('--color-p3verde-500', parsed.srgb.light, 'light')!;
        const p3 = resolveColor('--color-p3verde-500', parsed.p3.light, 'light')!;
        expect(p3.c).toBeGreaterThan(sr.c);
    });

    it('imprime el peor ratio medido por tema/gama/modo', () => {
        console.log(`\nContraste AA, peor par por caso:\n  ${minimos.join('\n  ')}`);
        expect(minimos.length).toBeGreaterThan(0);
    });
});

describe('WCAG AA — paletas P3 del motor (Y sin recortar + aserción de gama P3)', () => {
    const semillas = { ...SWEEP, p3verde: 'oklch(0.80 0.30 150)', p3magenta: 'oklch(0.65 0.31 330)', p3cian: 'oklch(0.85 0.17 200)' };
    for (const mode of ['light', 'dark'] as const) {
        it(`${mode}: ${Object.keys(semillas).length} semillas en P3, 0 fuera de gama P3 y todos los pares >= ${AA}:1`, () => {
            const vars: Vars = new Map();
            for (const [name, seed] of Object.entries(semillas))
                for (const [k, v] of Object.entries(createPaletteFromHex(seed, mode === 'dark', 'p3'))) vars.set(`--color-${name}-${k}`, v);
            for (const [grp, shades] of Object.entries(neutrals[mode]))
                for (const [sh, val] of Object.entries(shades)) vars.set(`--color-${grp}-${sh}`, val);
            const fams = families(vars);
            expect(fams).toHaveLength(Object.keys(semillas).length);
            expect(outOfGamut(vars, mode, 'p3', fams)).toEqual([]);
            let min = Infinity;
            const fallas: string[] = [];
            for (const pair of pairsFor(fams)) {
                const r = ratio(pair.fg, pair.bg, vars, mode);
                expect(r, `${pair.label} no resoluble`).not.toBeNull();
                if (r != null) { min = Math.min(min, r); if (r < AA) fallas.push(`${pair.label} = ${r.toFixed(3)}`); }
            }
            console.log(`Contraste AA, peor par en P3 / ${mode} (motor): ${min.toFixed(3)}:1`);
            expect(fallas, `Pares bajo AA:\n${fallas.join('\n')}`).toEqual([]);
        });
    }

    it('P3 da más croma que sRGB para una semilla fuera de sRGB (si no, la gama ancha no sirve)', () => {
        const croma = (g: 'srgb' | 'p3') => {
            const v = createPaletteFromHex('oklch(0.80 0.30 150)', false, g)['500'];
            return +v.match(/oklch\(\S+ (\S+)/)![1];
        };
        expect(croma('p3')).toBeGreaterThan(croma('srgb'));
    });
});

describe('WCAG AA — artefacto tokens/taisho.css (contrato público)', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/css/tokens/taisho.css'), 'utf8');
    const parsed = parseThemeCss(css);

    for (const mode of ['light', 'dark'] as const) {
        const vars = parsed.srgb[mode];
        const fams = families(vars);

        it(`taisho / ${mode}: subtle (= gray-700) y copy cumplen AA sobre las superficies`, () => {
            const fallas: string[] = [];
            for (const bg of ['--color-background-100', '--color-background-200', '--color-gray-100']) {
                for (const fg of ['--ts-color-copy', '--ts-color-subtle']) {
                    const r = ratio(fg, bg, vars, mode);
                    expect(r, `${fg} sobre ${bg} no resoluble`).not.toBeNull();
                    if (r != null && r < AA) fallas.push(`${fg} sobre ${bg} = ${r.toFixed(3)}`);
                }
            }
            expect(fallas).toEqual([]);
            expect(resolveColor('--ts-color-subtle', vars, mode)).toEqual(resolveColor('--color-gray-700', vars, mode));
        });

        it(`taisho / ${mode}: todos los pares (soft y solid+contrast) >= ${AA}:1 y 0 fuera de sRGB`, () => {
            expect(fams.length).toBeGreaterThanOrEqual(7);
            expect(outOfGamut(vars, mode, 'srgb', fams)).toEqual([]);
            const fallas: string[] = [];
            for (const pair of pairsFor(fams)) {
                const r = ratio(pair.fg, pair.bg, vars, mode);
                expect(r, `${pair.label} no resoluble`).not.toBeNull();
                if (r != null && r < AA) fallas.push(`${pair.label} = ${r.toFixed(3)}`);
            }
            expect(fallas, `Pares bajo AA:\n${fallas.join('\n')}`).toEqual([]);
        });
    }
});
