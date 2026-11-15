// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildThemeCss } from './createTheme';
import { defaultStates } from '../../config/taisho.user';
import { CVD_KINDS, deltaEOk, families, parseThemeCss, resolveColor } from './color-oracle.test.helper';
import type { Mode } from './color-oracle.test.helper';
import type { ThemeDef } from '../../config/taisho.types';

const UMBRAL = 0.02;
const ESTADOS = Object.keys(defaultStates);
const PARES = ESTADOS.flatMap((a, i) => ESTADOS.slice(i + 1).map(b => [a, b] as const));
const parsed = parseThemeCss(buildThemeCss({ colors: {} as ThemeDef['colors'], states: defaultStates }));

describe('CVD — los estados por defecto se distinguen', () => {
    it('hay 4 estados y 6 pares', () => {
        expect(ESTADOS).toEqual(['success', 'warning', 'info', 'danger']);
        expect(families(parsed.srgb.light).sort()).toEqual([...ESTADOS].sort());
        expect(PARES).toHaveLength(6);
    });

    const medidos: string[] = [];
    for (const mode of ['light', 'dark'] as Mode[]) {
        for (const paso of ['500', '600']) {
            for (const kind of CVD_KINDS) {
                it(`${kind} / ${mode} / ${paso}: ΔE_OK >= ${UMBRAL} entre los 4 estados`, () => {
                    const vars = parsed.srgb[mode];
                    const fallas: string[] = [];
                    let min = Infinity, cual = '';
                    for (const [a, b] of PARES) {
                        const ca = resolveColor(`--color-${a}-${paso}`, vars, mode)!;
                        const cb = resolveColor(`--color-${b}-${paso}`, vars, mode)!;
                        expect(ca && cb, `${a}/${b}-${paso} no resoluble`).toBeTruthy();
                        const d = deltaEOk(ca, cb, kind);
                        if (d < min) { min = d; cual = `${a}/${b}`; }
                        if (d < UMBRAL) fallas.push(`${a} vs ${b} = ${d.toFixed(4)}`);
                    }
                    medidos.push(`${kind.padEnd(7)} ${mode.padEnd(5)} ${paso}: ΔE_OK mínimo ${min.toFixed(4)} (${cual})`);
                    expect(fallas, `Pares confundibles bajo ${kind}:\n${fallas.join('\n')}`).toEqual([]);
                });
            }
        }
    }

    it('imprime el peor par por simulación', () => {
        console.log(`\nΔE_OK mínimo entre estados (umbral ${UMBRAL}):\n  ${medidos.join('\n  ')}`);
        expect(medidos.length).toBeGreaterThan(0);
    });
});
