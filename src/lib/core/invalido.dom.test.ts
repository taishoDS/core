// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach } from 'vitest';
import axe from 'axe-core';
import { markInvalid, clearInvalid } from './index';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const hints = () => document.querySelectorAll('.input-hint');

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('markInvalid en un campo sin envoltura', () => {
    beforeEach(() => {
        document.body.innerHTML = '<label for="c">Email</label><div class="ts input size-md" id="caja"><input id="c" class="ts input-field"></div>';
    });

    it('acepta la raíz: marca el control, crea hint y footer después de la caja y los enlaza', () => {
        markInvalid($('#caja'), 'Ya está tomado.');
        const input = $('#c');
        const hint = $('.input-hint');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(hint.className).toBe('ts input-hint variant-danger');
        expect(hint.getAttribute('aria-live')).toBe('polite');
        expect(hint.querySelector('span')!.textContent).toBe('Ya está tomado.');
        expect(hint.querySelector('svg'), 'el error nunca se distingue sólo por el color').not.toBeNull();
        expect(input.getAttribute('aria-describedby')).toBe(hint.id);
        expect(hint.parentElement!.className).toBe('ts input-footer');
        expect($('#caja').nextElementSibling).toBe(hint.parentElement);
    });

    it('acepta el control y deja el mismo resultado', () => {
        markInvalid($('#c'), 'Falta el dominio.');
        expect($('#caja').nextElementSibling!.classList.contains('input-footer')).toBe(true);
    });

    it('llamarlo otra vez cambia el mensaje, no duplica', () => {
        markInvalid($('#c'), 'Uno');
        markInvalid($('#c'), 'Dos');
        expect(hints()).toHaveLength(1);
        expect($('.input-hint span').textContent).toBe('Dos');
        expect($('#c').getAttribute('aria-describedby')!.split(' ')).toHaveLength(1);
    });

    it('el mensaje entra como texto, no como HTML', () => {
        markInvalid($('#c'), '<img src=x>');
        expect($('.input-hint img')).toBeNull();
        expect($('.input-hint span').textContent).toBe('<img src=x>');
    });

    it('clearInvalid deja el DOM como estaba', () => {
        const antes = document.body.innerHTML;
        markInvalid($('#c'), 'Error');
        clearInvalid($('#c'));
        expect(document.body.innerHTML).toBe(antes);
    });

    it('sin violaciones de axe con el error puesto', async () => {
        markInvalid($('#c'), 'Error');
        const r = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
        expect(r.violations).toEqual([]);
    });
});

describe('con ayuda o contador', () => {
    const conAyuda = `<div class="ts input-wrapper">
        <div class="ts input"><input id="c" class="ts input-field" aria-describedby="otro c-hint"></div>
        <div class="ts input-footer"><div id="c-hint" class="ts input-hint variant-default mi-clase"><span>Tu email de trabajo.</span></div><span class="ts input-count">3/40</span></div>
    </div><span id="otro">x</span>`;

    it('el error reemplaza la ayuda y limpiar la devuelve tal cual', () => {
        document.body.innerHTML = conAyuda;
        const antes = document.body.innerHTML;
        markInvalid($('#c'), 'Inválido');
        expect(hints()).toHaveLength(1);
        expect($('#c-hint').className).toBe('ts input-hint mi-clase variant-danger');
        expect($('#c-hint span').textContent).toBe('Inválido');
        clearInvalid($('#c'));
        expect(document.body.innerHTML).toBe(antes);
    });

    it('sin hint, el nuevo entra en el footer que ya está y antes del contador', () => {
        document.body.innerHTML = `<div class="ts input-wrapper"><div class="ts input"><input id="c" class="ts input-field"></div><div class="ts input-footer"><span class="ts input-count">3/40</span></div></div>`;
        markInvalid($('#c'), 'Inválido');
        expect($('.input-footer').firstElementChild).toBe($('.input-hint'));
        clearInvalid($('#c'));
        expect(hints()).toHaveLength(0);
        expect($('.input-footer .input-count')).not.toBeNull();
    });

    it('enlaza una ayuda que no estaba enlazada y al limpiar la desenlaza', () => {
        document.body.innerHTML = `<div class="ts input-wrapper"><div class="ts input"><input id="c" class="ts input-field"></div><div class="ts input-footer"><div id="h" class="ts input-hint variant-default"><span>Ayuda</span></div></div></div>`;
        markInvalid($('#c'), 'Inválido');
        expect($('#c').getAttribute('aria-describedby')).toBe('h');
        clearInvalid($('#c'));
        expect($('#c').hasAttribute('aria-describedby')).toBe(false);
    });

    it('limpia un error que llegó escrito en el HTML, y su footer si queda vacío', () => {
        document.body.innerHTML = `<div class="ts input-wrapper"><div class="ts input"><input id="c" class="ts input-field" aria-invalid="true" aria-describedby="h"></div><div class="ts input-footer"><div id="h" class="ts input-hint variant-danger"><span>Mal</span></div></div></div>`;
        clearInvalid($('#c'));
        expect($('#c').hasAttribute('aria-invalid')).toBe(false);
        expect($('#c').hasAttribute('aria-describedby')).toBe(false);
        expect($('.input-footer')).toBeNull();
    });

    it('limpiar un campo sin error no borra su ayuda', () => {
        document.body.innerHTML = conAyuda;
        const antes = document.body.innerHTML;
        clearInvalid($('#c'));
        expect(document.body.innerHTML).toBe(antes);
    });
});

describe('cada control de la familia', () => {
    it('Select: marca el disparador, no el input de validación; el footer va en su envoltura', () => {
        document.body.innerHTML = `<div class="ts select-wrapper" id="r"><div class="ts select"><input data-ts-required-proxy required><button class="ts select-field" role="combobox" aria-haspopup="listbox" aria-label="Plan"></button></div></div>`;
        markInvalid($('#r'), 'Elegí un plan.');
        expect($('[role="combobox"]').getAttribute('aria-invalid')).toBe('true');
        expect($('[data-ts-required-proxy]').hasAttribute('aria-invalid')).toBe(false);
        expect($('#r').lastElementChild!.className).toBe('ts input-footer');
    });

    it('DatePicker: marca el disparador', () => {
        document.body.innerHTML = `<div class="ts datepicker" id="r"><button type="button" class="ts datepicker-trigger">Fecha</button></div>`;
        markInvalid($('#r'), 'Elegir una fecha.');
        expect($('button').getAttribute('aria-invalid')).toBe('true');
        expect($('#r').nextElementSibling!.classList.contains('input-footer')).toBe(true);
    });

    it('DatePicker de rango: marca y describe los dos inputs', () => {
        document.body.innerHTML = `<div class="ts datepicker" id="r"><div class="ts datepicker-range"><input aria-label="Desde"><input aria-label="Hasta"></div></div>`;
        markInvalid($('#r'), 'Rango inválido.');
        const [a, b] = document.querySelectorAll('input');
        const id = $('.input-hint').id;
        for (const i of [a, b]) {
            expect(i.getAttribute('aria-invalid')).toBe('true');
            expect(i.getAttribute('aria-describedby')).toBe(id);
        }
        clearInvalid($('#r'));
        expect(a.hasAttribute('aria-invalid')).toBe(false);
        expect(b.hasAttribute('aria-describedby')).toBe(false);
        expect(hints()).toHaveLength(0);
    });

    it('NumberInput: salta el campo oculto y los botones', () => {
        document.body.innerHTML = `<div class="ts number-input" id="r"><button type="button">-</button><input class="ts number-input-field" aria-label="Asientos"><input type="hidden" data-ts-number-raw></div>`;
        markInvalid($('#r'), 'Mínimo 1.');
        expect($('.number-input-field').getAttribute('aria-invalid')).toBe('true');
    });

    it('Checkbox: alcanza con aria-invalid, sin clases', () => {
        document.body.innerHTML = `<label class="ts checkbox" id="r"><input type="checkbox" class="ts checkbox-input"><span class="ts checkbox-box"></span></label>`;
        markInvalid($('#r'), 'Aceptá el despliegue.');
        expect($('input').getAttribute('aria-invalid')).toBe('true');
        expect($('#r').className).toBe('ts checkbox');
    });

    it('Radio: aria-invalid va en el radiogroup, también si le pasás una opción', () => {
        document.body.innerHTML = `<div role="radiogroup" aria-label="Entorno" id="g"><label class="ts radio"><input type="radio" id="a" class="ts radio-input"></label></div>`;
        markInvalid($('#a'), 'Elegí un entorno.');
        expect($('#g').getAttribute('aria-invalid')).toBe('true');
        expect($('#a').hasAttribute('aria-invalid')).toBe(false);
        expect($('#g').getAttribute('aria-describedby')).toBe($('.input-hint').id);
        expect($('#g').nextElementSibling!.classList.contains('input-footer')).toBe(true);
    });

    it('Grupo de checkboxes: cada casilla inválida, el grupo descripto, el footer adentro', () => {
        document.body.innerHTML = `<div role="group" class="ts checkbox-group" id="g"><label class="ts checkbox"><input type="checkbox"></label><label class="ts checkbox"><input type="checkbox"></label></div>`;
        markInvalid($('#g'), 'Elegí al menos uno.');
        expect(document.querySelectorAll('input[aria-invalid="true"]')).toHaveLength(2);
        expect($('#g').getAttribute('aria-describedby')).toBe($('.input-hint').id);
        expect($('#g').lastElementChild!.classList.contains('input-footer')).toBe(true);
        clearInvalid($('#g'));
        expect(document.querySelectorAll('[aria-invalid]')).toHaveLength(0);
        expect(hints()).toHaveLength(0);
    });
});
