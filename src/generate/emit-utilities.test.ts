// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildUtilitiesCSS } from './emit-utilities';
import { fontSizes, shadows, matDrop } from '../config/scales';
import { neutrals } from '../lib/theme/neutrals';
import { oklchToRgb, getLuminance } from '../lib/theme/palette';

const css = buildUtilitiesCSS();

function utility(name: string): string | null {
    const m = css.match(new RegExp(`@utility ${name}\\s+\\{(.+?)\\}\\n`, 's'));
    return m ? m[1].trim().replace(/ {2,}/g, ' ') : null;
}

describe('buildUtilitiesCSS', () => {
    it('es una función pura (misma entrada → misma salida)', () => {
        expect(buildUtilitiesCSS()).toBe(css);
    });

    it('el entry base es token-agnóstico: importa atomic + components, ningún tema', () => {
        expect(css).toContain('@import "./atomic.css";');
        expect(css).toContain('@import "./components.css";');
        expect(css).not.toContain('tokens/');
    });

    it('cada color semántico es un token tematizable con fallback a la paleta', () => {
        for (const role of ['heading', 'copy', 'subtle', 'label', 'btn']) {
            expect(utility(`ts-color-${role}`)).toMatch(
                new RegExp(`^color: var\\(--ts-color-${role}, var\\(--color-gray-\\d+\\)\\);$`),
            );
        }
        for (const state of ['success', 'warning', 'info', 'danger']) {
            expect(utility(`ts-color-${state}`)).toBe(
                `color: var(--ts-color-${state}, var(--color-${state}-500));`,
            );
        }
    });

    it('emite heading ≥14 y copy 12–24 desde la escala de fontSizes', () => {
        const sizes = Object.keys(fontSizes).map(Number);
        for (const s of sizes) {
            expect(css.includes(`@utility ts-text-heading-${s} `)).toBe(s >= 14);
            expect(css.includes(`@utility ts-text-copy-${s} `)).toBe(s >= 12 && s <= 24);
        }
    });

    it('emite surface/floating por cada shadow de la escala', () => {
        for (const key of Object.keys(shadows)) {
            expect(utility(`ts-surface-${key}`)).toContain(`ts-shadow-${key}`);
            expect(utility(`ts-floating-${key}`)).toContain(`ts-shadow-${key}`);
        }
    });

    it('los materiales semánticos usan la escala de elevación y son tematizables', () => {
        const materials: Record<string, keyof typeof matDrop> = {
            'ts-material-base': 'sm', 'ts-material-small': 'sm',
            'ts-material-medium': 'md', 'ts-material-large': 'lg',
            'ts-material-tooltip': 'sm', 'ts-material-menu': 'md',
            'ts-material-modal': 'lg', 'ts-material-fullscreen': 'xl',
        };
        for (const [name, drop] of Object.entries(materials)) {
            const body = utility(name)!;
            expect(body).toContain('background-color: var(--ts-material-bg, var(--color-background-100));');
            expect(body).toContain('0 0 0 var(--ts-border-width-1) var(--ts-material-border, var(--color-grayAlpha-200))');
            expect(body).toContain(matDrop[drop]);
        }
    });
});

describe('ts-color-subtle — contrato WCAG AA', () => {
    const AA = 4.5;
    const SURFACES = ['background-100', 'background-200', 'gray-100'];

    function lum(mode: 'light' | 'dark', token: string): number {
        const [group, shade] = token.split(/-(?=\d+$)/);
        const m = neutrals[mode][group][shade].match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/)!;
        const { r, g, b } = oklchToRgb(+m[1], +m[2], +m[3]);
        return getLuminance(r, g, b);
    }

    function ratio(mode: 'light' | 'dark', fg: string, bg: string): number {
        const [hi, lo] = [lum(mode, fg), lum(mode, bg)].sort((a, b) => b - a);
        return (hi + 0.05) / (lo + 0.05);
    }

    it('el fallback emitido es gray-700', () => {
        expect(utility('ts-color-subtle')).toBe('color: var(--ts-color-subtle, var(--color-gray-700));');
    });

    for (const mode of ['light', 'dark'] as const) {
        it(`gray-700 cumple AA sobre las superficies base en ${mode}`, () => {
            for (const bg of SURFACES) {
                expect(ratio(mode, 'gray-700', bg), `gray-700 sobre ${bg} (${mode})`).toBeGreaterThanOrEqual(AA);
            }
        });

        it(`gray-600 NO alcanza AA en ${mode} (por eso el fallback es 700)`, () => {
            const worst = Math.min(...SURFACES.map((bg) => ratio(mode, 'gray-600', bg)));
            expect(worst).toBeLessThan(AA);
        });
    }
});
