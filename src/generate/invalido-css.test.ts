// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { compile } from './compile';
import { buildRepoConfig } from '../config/pipeline';

const leer = (f: string) => fs.readFileSync(path.resolve(__dirname, '../lib/css', f), 'utf8');
const atomic = leer('atomic.css');
const components = leer('components.css');
const bloque = (css: string, nombre: string) => css.match(new RegExp(`@utility ts-${nombre} \\{[\\s\\S]*?\\n\\}\\n|@utility ts-${nombre} \\{.*\\}\\n`))?.[0] ?? '';

describe('el error de un campo sale de aria-invalid', () => {
    it.each(['field-box', 'field-box-trigger'])('%s lo define con el tono danger', (nombre) => {
        const css = bloque(atomic, nombre);
        expect(css).toContain('&[class]:is([aria-invalid="true"], :has([aria-invalid="true"]))');
        expect(css).toContain('--_f-ring: var(--color-danger-500); --_f-ring-hover: var(--color-danger-600); @apply ts-focus-ring-danger;');
    });

    it.each(['input', 'textarea', 'select', 'combobox-control', 'number-input', 'datepicker-trigger', 'datepicker-field'])('%s lo hereda de la caja, sin repetirlo', (nombre) => {
        const css = bloque(components, nombre);
        expect(css).toMatch(/@apply ts-field-box(-trigger)?;/);
        expect(css).not.toContain('aria-invalid');
    });

    const ELECCION = ':has(> input[aria-invalid="true"]), [role="radiogroup"][aria-invalid="true"] *';

    it.each(['checkbox', 'radio'])('%s: aria-invalid alcanza para el anillo y el relleno, y las clases siguen', (nombre) => {
        const css = bloque(components, nombre);
        expect(css).toContain(`&:is(.is-invalid, ${ELECCION}):not(.is-checked)`);
        expect(css).toContain(`&:is(.variant-danger, ${ELECCION}) {`);
    });

    it('toggle: aria-invalid pinta lo que variant-danger', () => {
        expect(bloque(components, 'toggle')).toContain(`&:is(.variant-danger, ${ELECCION}) {`);
    });

    it('sólo danger: una variante de color no se activa con el error', () => {
        expect(components).toContain('&.variant-success {');
        expect(components).not.toContain(':is(.variant-success');
    });
});

describe('markInvalid a demanda', () => {
    const config = buildRepoConfig();
    const compilar = (content: string) => compile(config, [{ file: 'app.js', content }], { onDemand: true }).css;

    it('quien llama a markInvalid recibe el hint y el footer que crea el JS', () => {
        const css = compilar(`import { markInvalid } from 'x'; markInvalid(el, 'Mal');`);
        for (const c of ['.input-hint', '.input-footer', '.icon-14']) expect(css).toContain(c);
    });

    it('el nombre en español (alias) recibe lo mismo', () => {
        const css = compilar(`import { markInvalid } from 'x'; markInvalid(el, 'Mal');`);
        for (const c of ['.input-hint', '.input-footer', '.icon-14']) expect(css).toContain(c);
    });

    it('quien no la usa no los paga', () => {
        const css = compilar(`const a = 1;`);
        for (const c of ['.input-hint', '.input-footer']) expect(css).not.toContain(c);
    });
});
