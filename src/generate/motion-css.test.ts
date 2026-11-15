// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const tokens = read('../lib/css/tokens/taisho.css');
const atomic = read('../lib/css/atomic.css');
const components = read('../lib/css/components.css');
const reset = read('../lib/css/reset.css');

const STEPS = ['instant', 'fast', 'base', 'slow', 'slower'];
const EASES = ['standard', 'in', 'out', 'spring', 'in-out', 'linear'];
const LITERAL = /[0-9.]+m?s\b|cubic-bezier/;

describe('Motion — tokens', () => {
    it('existen las duraciones, los loops y las curvas', () => {
        for (const k of [...STEPS, 'spin', 'loop-fast', 'loop-base', 'loop-slow'])
            expect(tokens).toMatch(new RegExp(`--ts-duration-${k}: [0-9.]+m?s;`));
        for (const k of EASES) expect(tokens).toMatch(new RegExp(`--ts-ease-${k}: `));
    });

    it('prefers-reduced-motion baja las duraciones de transición, y sólo ésas, una sola vez', () => {
        const blocks = [...tokens.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)];
        expect(blocks).toHaveLength(1);
        const body = blocks[0]![1]!;
        for (const k of STEPS) expect(body).toContain(`--ts-duration-${k}: 1ms;`);
        expect(body).not.toMatch(/spin|loop-/);
        expect(body).toContain('--ts-iterations-loop: 0;');
        expect(tokens.indexOf('prefers-reduced-motion')).toBeGreaterThan(tokens.indexOf(':root {'));
    });

    it('--ts-iterations-loop es infinite por defecto y el skeleton y la barra indeterminada lo leen', () => {
        expect(tokens).toContain('--ts-iterations-loop: infinite;');
        expect(components).toMatch(/animation: ts-skeleton-wave [^;]*var\(--ts-iterations-loop\);/);
        expect(components).toMatch(/animation: ts-progress-indeterminate [^;]*var\(--ts-iterations-loop\);/);
    });

    it('con las iteraciones en 0 queda un estado fijo visible: la barra dentro de la pista, el skeleton con tono', () => {
        expect(components).toMatch(/is-indeterminate \[data-progress-fill\] \{[^}]*width: 40%;[^}]*inset-inline-start: 30%;/);
        expect(components).toMatch(/skeleton \{[^}]*background-position: 50% 0;/);
    });

    it('el spinner, los puntos y el giro del progreso circular siguen en infinite', () => {
        expect(components).toMatch(/animation: ts-spin [^;]*infinite/);
        expect(components).toMatch(/animation: ts-dot-bounce [^;]*infinite/);
        expect(components).not.toMatch(/ts-spin [^;]*var\(--ts-iterations-loop\)/);
    });

    it('ningún componente repite su propio @media reduced-motion de transición', () => {
        expect(components).not.toMatch(/prefers-reduced-motion/);
    });
});

describe('Motion — utilidades', () => {
    it('ts-duration-* y ts-ease-* leen los tokens', () => {
        for (const k of STEPS)
            expect(atomic).toContain(`@utility ts-duration-${k} { transition-duration: var(--ts-duration-${k}); }`);
        for (const k of EASES)
            expect(atomic).toContain(`@utility ts-ease-${k} { transition-timing-function: var(--ts-ease-${k}); }`);
    });

    it('ts-transition-* conserva sus nombres y usa los tokens', () => {
        const names = ['colors', 'all', 'opacity', 'shadow', 'transform', 'width', 'none', 'input', 'option'];
        for (const n of names) expect(atomic).toMatch(new RegExp(`@utility ts-transition-${n}\\s+\\{`));
        for (const n of names.filter((n) => n !== 'none')) {
            const line = atomic.match(new RegExp(`@utility ts-transition-${n}\\s+\\{[^\\n]*`))![0];
            expect(line).toMatch(/var\(--ts-duration-\w+\) var\(--ts-ease-[\w-]+\)/);
        }
    });

    it('Modal y Drawer comparten combinación: entrada slow/out, salida base/in', () => {
        const modal = components.match(/@utility ts-modal-dialog \{[\s\S]*?\n\}\n/)?.[0] ?? '';
        const drawer = components.match(/@utility ts-drawer-dialog \{[\s\S]*?\n\}\n/)?.[0] ?? '';
        expect(modal).toContain('opacity var(--ts-duration-slow) var(--ts-ease-out)');
        expect(drawer).toContain('transform var(--ts-duration-slow) var(--ts-ease-out)');
        expect(drawer).toContain('transform var(--ts-duration-base) var(--ts-ease-in)');
    });
});

describe('Motion — sin literales', () => {
    it('el CSS emitido no tiene duraciones ni curvas fuera de los tokens', () => {
        for (const [name, css] of Object.entries({ atomic, components, reset })) {
            const sinTokens = css.split('\n').filter((l) => LITERAL.test(l));
            expect({ name, lineas: sinTokens }).toEqual({ name, lineas: [] });
        }
    });

    it('los emisores no hardcodean motion (la única definición vive en config/scales.ts)', () => {
        for (const f of fs.readdirSync(__dirname).filter((f) => /^emit-.*\.ts$/.test(f))) {
            const src = read(f).split('\n').filter((l) => !/^\s*\/\//.test(l));
            expect({ f, lineas: src.filter((l) => LITERAL.test(l)) }).toEqual({ f, lineas: [] });
        }
    });
});
