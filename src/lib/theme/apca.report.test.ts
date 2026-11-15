// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildThemeCss } from './createTheme';
import { defaultStates } from '../../config/taisho.user';
import taisho from '../../config/themes/taisho';
import { SHADES, apca, apcaY, families, parseThemeCss, resolveColor, sweepSeeds } from './color-oracle.test.helper';
import type { Mode, Vars } from './color-oracle.test.helper';
import type { ThemeDef } from '../../config/taisho.types';

function lcDe(vars: Vars, mode: Mode, fam: string, shade: string): number {
    const bg = resolveColor(`--color-${fam}-${shade}`, vars, mode)!;
    const fg = resolveColor(`--color-${fam}-${shade}-contrast`, vars, mode)!;
    return apca(apcaY(fg), apcaY(bg));
}

const pad = (s: string | number, n: number) => String(s).padStart(n);

describe('Reporte APCA (informativo, no bloquea)', () => {
    it('Lc de cada par paso/-contrast: taisho + estados por defecto', () => {
        const parsed = parseThemeCss(buildThemeCss({ ...taisho, states: defaultStates }));
        const lineas: string[] = [];
        for (const mode of ['light', 'dark'] as const) {
            const vars = parsed.srgb[mode];
            lineas.push(`\n  Lc APCA del -contrast sobre cada paso (${mode})`, `  ${'familia'.padEnd(18)}${SHADES.map(s => pad(s, 6)).join('')}`);
            for (const fam of families(vars)) {
                const lcs = SHADES.map(s => lcDe(vars, mode, fam, s));
                for (const lc of lcs) expect(Number.isFinite(lc)).toBe(true);
                lineas.push(`  ${fam.padEnd(18)}${lcs.map(lc => pad(lc.toFixed(0), 6)).join('')}`);
            }
        }
        console.log(lineas.join('\n'));
    });

    it('Lc del barrido de 648 semillas: peor caso por paso (|Lc| mínimo)', () => {
        const parsed = parseThemeCss(buildThemeCss({ colors: sweepSeeds() as ThemeDef['colors'] }));
        const lineas: string[] = [];
        for (const mode of ['light', 'dark'] as const) {
            const vars = parsed.srgb[mode];
            const fams = families(vars);
            const fila = SHADES.map(s => {
                const abs = fams.map(f => Math.abs(lcDe(vars, mode, f, s)));
                return { min: Math.min(...abs), bajo60: abs.filter(a => a < 60).length };
            });
            lineas.push(
                `\n  Barrido ${fams.length} semillas (${mode}) — paso:        ${SHADES.map(s => pad(s, 6)).join('')}`,
                `  |Lc| mínimo:                                ${fila.map(f => pad(f.min.toFixed(0), 6)).join('')}`,
                `  semillas con |Lc| < 60:                     ${fila.map(f => pad(f.bajo60, 6)).join('')}`,
            );
            for (const f of fila) expect(Number.isFinite(f.min)).toBe(true);
        }
        console.log(lineas.join('\n'));
    });
});
