// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { buildRepoConfig } from '../config/pipeline';
import { BLOQUES_COMPARTIDOS, BLOQUES_SUELTOS } from './emit-manifest';
import { manifiestoDelCore } from './registro';

const config = buildRepoConfig();
const demanda = (html: string) => compile(config, [{ file: 'a.html', content: html }], { onDemand: true }).css;
const tiene = (css: string, bloque: string) => css.includes(`:where(.ts).${bloque} {`);

describe('required-proxy', () => {
    it('es un bloque compartido, de ningún componente', () => {
        expect(BLOQUES_COMPARTIDOS['required-proxy']).toEqual(['select', 'date-picker']);
        expect(BLOQUES_SUELTOS).toContain('required-proxy');
        for (const c of Object.values(manifiestoDelCore.componentes)) expect(c.bloques).not.toContain('required-proxy');
    });

    it('un Select con `required` no trae el calendario ni el DatePicker', () => {
        const css = demanda('<div class="ts select"><button class="ts select-field"></button><input class="ts required-proxy" required></div>');
        expect(tiene(css, 'required-proxy')).toBe(true);
        expect(tiene(css, 'select')).toBe(true);
        expect(css).not.toMatch(/\.(datepicker|calendar)/);
    });

    it('un DatePicker con `required` trae su regla pero no el Select', () => {
        const css = demanda('<div class="ts datepicker"><input class="ts required-proxy" required></div>');
        expect(tiene(css, 'required-proxy')).toBe(true);
        expect(tiene(css, 'datepicker')).toBe(true);
        expect(tiene(css, 'select')).toBe(false);
    });
});
