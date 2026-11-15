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

describe('Opción activa de listbox: CSS emitido', () => {
    it.each(['ts-select-option', 'ts-combobox-option', 'ts-command-item'])('%s estiliza .is-focused con fondo', (name) => {
        expect(utility(name)).toMatch(/\.is-focused[^{]*\{[^}]*@apply ts-bg-highlight;/);
    });

    it('nadie estiliza .is-active en una opción de listbox (Core no la emite)', () => {
        for (const name of ['ts-select-option', 'ts-combobox-option', 'ts-command-item']) {
            expect(utility(name)).not.toContain('.is-active');
        }
    });
});

describe('Item de Menu: foco de teclado visible', () => {
    it('ts-menu-item pinta :focus-visible con el mismo fondo que :hover', () => {
        expect(utility('ts-menu-item')).toMatch(/&:hover, &:focus-visible, &\.is-focused \{ @apply ts-bg-highlight; \}/);
        expect(utility('ts-menu-item')).toMatch(/&:hover, &:focus-visible, &\.is-focused \{ background-color: var\(--ts-color-danger-bg\); \}/);
    });
});
