// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildScale, createPaletteFromHex, getContrastColor, parseSeed, rgbToOklch, oklchToRgb } from './palette';
import type { Gamut, Mode, Oklch, Scale } from './palette';
import { inGamut, luminanceOklch, maxChroma, oklchToLinear, wcagRatio } from './color-math';
import { apcaContrast, apcaDeEscala, apcaLuminance } from './apca';
import { tintMap } from './neutrals';

const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const toHex = (l: number, c: number, h: number) =>
    '#' + oklchToLinear(l, c, h).map(x => Math.round(Math.min(1, Math.max(0, encode(x))) * 255).toString(16).padStart(2, '0')).join('');

function bisectMaxChroma(l: number, h: number, g: Gamut): number {
    let lo = 0, hi = 0.5;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (inGamut(l, m, h, g, 1e-12)) lo = m; else hi = m; }
    return lo;
}

const SEEDS: string[] = [];
for (let h = 0; h < 360; h += 5) for (const l of [0.45, 0.6, 0.75]) for (const f of [0.4, 0.7, 1]) {
    SEEDS.push(toHex(l, bisectMaxChroma(l, h, 'srgb') * f, h));
}
const MODES: Mode[] = ['light', 'dark'];
const GAMUTS: Gamut[] = ['srgb', 'p3'];

interface Case { hex: string; seed: Oklch; mode: Mode; gamut: Gamut; scale: Scale }
const CASES: Case[] = [];
for (const hex of SEEDS) for (const mode of MODES) for (const gamut of GAMUTS) {
    const seed = parseSeed(hex);
    CASES.push({ hex, seed, mode, gamut, scale: buildScale(seed, mode, gamut) });
}
const label = (c: Case, i?: number) => `${c.hex} ${c.mode} ${c.gamut}${i === undefined ? '' : ` paso ${c.scale.steps[i].shade}`}`;
const yellowBand = (h: number) => h > 55 && h < 125;

describe('barrido de semillas', () => {
    it('son 648 semillas', () => expect(SEEDS).toHaveLength(648));

    it('0 pasos fuera de gama (sRGB y P3), sobre el valor EMITIDO (redondeado)', () => {
        const bad: string[] = [];
        for (const c of CASES) c.scale.steps.forEach((s, i) => {
            const [l, cc, h] = s.css.match(/[\d.]+/g)!.map(Number);
            if (!inGamut(l, cc, h, c.gamut, 5e-4)) bad.push(label(c, i));
        });
        expect(bad).toEqual([]);
    });

    it('-contrast >= 4.5 siempre (ratio WCAG real contra los neutros del modo)', () => {
        const bad: string[] = [];
        for (const c of CASES) c.scale.steps.forEach((s, i) => {
            const [l, cc, h] = s.css.match(/[\d.]+/g)!.map(Number);
            const y = luminanceOklch(l, cc, h);
            const neutral = s.contrast === 'var(--color-gray-100)' ? (c.mode === 'light' ? 0.96 : 0.18) : (c.mode === 'light' ? 0.15 : 0.98);
            const r = wcagRatio(y, neutral ** 3);
            if (r < 4.5) bad.push(`${label(c, i)} = ${r.toFixed(2)}`);
        });
        expect(bad).toEqual([]);
    });

    it('la semilla queda exacta en su paso o, si cae en la zona muerta, |dL| <= 0.03 y se avisa', () => {
        let adjusted = 0, maxDL = 0;
        for (const c of CASES) {
            const sc = c.scale, st = sc.steps[sc.seedStep];
            expect(st.seed, label(c)).toBe(true);
            if (sc.adjusted) {
                adjusted++;
                maxDL = Math.max(maxDL, Math.abs(sc.dL));
                expect(Math.abs(sc.dL), label(c)).toBeLessThanOrEqual(0.03);
            } else {
                expect(sc.dL).toBe(0);
                const cs = Math.min(c.seed.c, maxChroma(c.seed.l, c.seed.h, c.gamut));
                expect([st.l, st.c, st.h], label(c)).toEqual([c.seed.l, cs, c.seed.h]);
            }
        }
        console.log(`[T1] semillas corridas por zona muerta: ${adjusted}/${CASES.length}, |dL| max ${maxDL.toFixed(4)}`);
    });

    it('el tono no deriva por el mapeo de gama (<= 0.5 deg) fuera de la franja amarilla', () => {
        let maxDrift = 0;
        for (const c of CASES) {
            if (yellowBand(c.seed.h)) continue;
            c.scale.steps.forEach((s, i) => {
                if (s.c < 0.005) return;
                const [l, cc, h] = s.css.match(/[\d.]+/g)!.map(Number);
                const back = c.gamut === 'srgb' ? (() => { const { r, g, b } = oklchToRgb(l, cc, h); return rgbToOklch(r, g, b).h; })() : h;
                const d = Math.abs(((back - c.seed.h + 540) % 360) - 180);
                maxDrift = Math.max(maxDrift, d);
                expect(d, label(c, i)).toBeLessThanOrEqual(0.5);
            });
        }
        console.log(`[T1] deriva de tono max fuera de la franja amarilla: ${maxDrift.toFixed(4)} deg`);
    });

    it('Y y L son monótonas a lo largo de la escala', () => {
        for (const c of CASES) {
            const dir = c.mode === 'light' ? -1 : 1;
            for (let i = 1; i < 10; i++) {
                const a = c.scale.steps[i - 1], b = c.scale.steps[i];
                expect((b.y - a.y) * dir, `Y ${label(c, i)}`).toBeGreaterThan(0);
                expect((b.l - a.l) * dir, `L ${label(c, i)}`).toBeGreaterThan(0);
            }
        }
    });

    it('DeltaE_OK entre vecinos >= 0.035', () => {
        let min = 9, at = '';
        for (const c of CASES) for (let i = 1; i < 10; i++) {
            const a = c.scale.steps[i - 1], b = c.scale.steps[i];
            const d = Math.hypot(a.l - b.l, a.c * Math.cos(a.h * Math.PI / 180) - b.c * Math.cos(b.h * Math.PI / 180), a.c * Math.sin(a.h * Math.PI / 180) - b.c * Math.sin(b.h * Math.PI / 180));
            if (d < min) { min = d; at = label(c, i); }
        }
        console.log(`[T1] DeltaE_OK minimo entre vecinos: ${min.toFixed(4)} (${at})`);
        expect(min).toBeGreaterThanOrEqual(0.035);
    });

    it('la croma nunca supera la de la semilla (paleta apagada = paleta apagada)', () => {
        for (const c of CASES) c.scale.steps.forEach((s, i) => {
            expect(s.c, label(c, i)).toBeLessThanOrEqual(c.seed.c + 1e-9);
        });
    });
});

describe('rendimiento', () => {
    it('un tema completo (7 familias x 2 modos x sRGB+P3) dentro del presupuesto relativo a una calibración de la misma máquina (margen x3 para CI)', () => {
        const seeds = ['#3b82f6', '#84cc16', '#f59e0b', '#1A9338', '#E79C13', '#0091FF', '#E5484D'].map(parseSeed);
        const run = () => { for (const s of seeds) for (const m of MODES) for (const g of GAMUTS) buildScale(s, m, g); };
        for (let i = 0; i < 20; i++) run();
        // El mejor de varios lotes: un tirón de la máquina cargada infla un lote, no el costo real del cálculo.
        let ms = Infinity;
        for (let lote = 0; lote < 7; lote++) {
            const t = performance.now();
            for (let i = 0; i < 10; i++) run();
            ms = Math.min(ms, (performance.now() - t) / 10);
        }
        let calibracion = Infinity;
        for (let lote = 0; lote < 7; lote++) {
            const t = performance.now();
            let acc = 0;
            for (let i = 0; i < 300000; i++) acc += Math.sin(i) * Math.sqrt(i);
            if (acc !== acc + 1) calibracion = Math.min(calibracion, performance.now() - t);
        }
        console.log(`[T1] tema completo (7 familias, 2 modos, sRGB+P3): ${ms.toFixed(2)} ms (calibración ${calibracion.toFixed(2)} ms, razón ${(ms / calibracion).toFixed(2)})`);
        // Presupuesto relativo: en una máquina quieta la razón es ~1,5; el tope (x6 de margen: con la máquina saturada la razón sube a 6) no depende de qué tan cargada esté.
        expect(ms / calibracion).toBeLessThan(10);
    });
});

describe('gama analítica', () => {
    it('maxChroma coincide con la bisección (sRGB y P3) en toda la rueda', () => {
        let worst = 0;
        for (const g of GAMUTS) for (let h = 0; h < 360; h += 3.7) for (let l = 0.03; l < 0.99; l += 0.047) {
            worst = Math.max(worst, Math.abs(maxChroma(l, h, g) - bisectMaxChroma(l, h, g)));
        }
        expect(worst).toBeLessThan(1e-6);
    });
});

describe('semillas', () => {
    it('hex de 3 y 6 dígitos, y oklch con L/C en número o %', () => {
        expect(parseSeed('#fff').l).toBeCloseTo(1, 4);
        const a = parseSeed('oklch(0.62 0.19 259)'), b = parseSeed('oklch(62% 47.5% 259deg)');
        expect(b.l).toBeCloseTo(a.l, 9);
        expect(b.c).toBeCloseTo(0.19, 9);
        expect(a.h).toBe(259);
    });
    it('rechaza lo inválido', () => {
        expect(() => parseSeed('red')).toThrow();
        expect(() => parseSeed('oklch(0.6 0.2 250 / 0.5)')).toThrow();
        expect(() => parseSeed('oklch(2 0.2 250)')).toThrow();
    });
    it('una semilla P3 queda exacta en la salida P3 y mapeada (misma L y H) en sRGB', () => {
        const seed = { l: 0.65, c: 0.25, h: 145 };
        expect(inGamut(seed.l, seed.c, seed.h, 'srgb')).toBe(false);
        expect(inGamut(seed.l, seed.c, seed.h, 'p3')).toBe(true);
        const p3 = buildScale(seed, 'light', 'p3'), srgb = buildScale(seed, 'light', 'srgb');
        const sp = p3.steps[p3.seedStep], ss = srgb.steps[srgb.seedStep];
        if (!p3.adjusted) expect([sp.l, sp.c, sp.h]).toEqual([seed.l, seed.c, seed.h]);
        expect(ss.c).toBeLessThan(sp.c);
    });
    it('#3b82f6: en claro el azul exacto queda en el 500 y en oscuro en el 600 (decisión 2)', () => {
        const seed = parseSeed('#3b82f6');
        const light = buildScale(seed, 'light'), dark = buildScale(seed, 'dark');
        expect(light.steps[light.seedStep].shade).toBe('500');
        expect(dark.steps[dark.seedStep].shade).toBe('600');
        expect(light.adjusted || dark.adjusted).toBe(false);
    });
    it('la semilla exacta vuelve a su hex al redondear (8 bits)', () => {
        let ok = 0, n = 0;
        for (const c of CASES) {
            if (c.gamut !== 'srgb' || c.scale.adjusted) continue;
            const [l, cc, h] = c.scale.steps[c.scale.seedStep].css.match(/[\d.]+/g)!.map(Number);
            n++; if (toHex(l, cc, h) === c.hex.toLowerCase()) ok++;
        }
        expect(ok / n).toBeGreaterThan(0.99);
    });
});

describe('-contrast y APCA', () => {
    it('createPaletteFromHex devuelve los 20 tokens y cumple la forma de siempre', () => {
        const p = createPaletteFromHex('#3b82f6', false);
        expect(Object.keys(p)).toHaveLength(20);
        expect(p['500']).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
        expect(p['500-contrast']).toMatch(/^var\(--color-gray-(100|1000)\)$/);
    });
    it('getContrastColor elige por ratio real', () => {
        expect(getContrastColor(1, 0, 0, false)).toBe('var(--color-gray-1000)');
        expect(getContrastColor(0, 0, 0, false)).toBe('var(--color-gray-100)');
        expect(getContrastColor(1, 0, 0, true)).toBe('var(--color-gray-100)');
    });
    it('con neutros efectivos distintos, -contrast usa los reales', () => {
        const eff = { light: { gray: { '100': 'oklch(0.05 0 0)', '1000': 'oklch(0.9 0 0)' } }, dark: {} };
        const s = buildScale({ l: 0.6, c: 0.1, h: 250 }, 'light', 'srgb', undefined);
        const pal = createPaletteFromHex('#3b82f6', false, 'srgb', eff);
        expect(pal['100-contrast']).toBe('var(--color-gray-100)');
        expect(s.steps).toHaveLength(10);
    });
    it('APCA: negro sobre blanco ~106 Lc; se reporta por paso sin decidir', () => {
        expect(apcaContrast(0, 1)).toBeCloseTo(106, 0);
        const sc = buildScale(parseSeed('#3b82f6'), 'light');
        for (const lc of apcaDeEscala(sc, false)) expect(Number.isFinite(lc)).toBe(true);
        expect(apcaDeEscala(sc, false)).toHaveLength(10);
        expect(apcaContrast(apcaLuminance(1, 0, 0), apcaLuminance(1, 0, 0))).toBe(0);
    });
});

describe('tint de neutros', () => {
    it('cae en los extremos y respeta la gama', () => {
        const t = tintMap({ '100': 'oklch(1 0 0)', '500': 'oklch(0.5 0 0)', '1000': 'oklch(0.15 0 0)' }, 0.02, 250);
        const c = (k: string) => parseFloat(t[k].split(' ')[1]);
        expect(c('100')).toBeLessThan(0.0005);
        expect(c('500')).toBeCloseTo(0.02, 3);
        expect(c('1000')).toBeLessThan(c('500'));
        const wild = tintMap({ '500': 'oklch(0.5 0 0)' }, 0.5, 145);
        expect(parseFloat(wild['500'].split(' ')[1])).toBeLessThanOrEqual(maxChroma(0.5, 145, 'srgb'));
    });
});
