// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { init, toast, updateToast, clearToasts } from './index';
import { claseDS } from './dom';

const FRAGMENTOS = path.resolve(__dirname, '../../routes/_docs/core-html');

function montar(nombre: string): void {
    document.body.innerHTML = fs.readFileSync(path.join(FRAGMENTOS, `${nombre}.html`), 'utf8');
    init(document);
}

const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const qq = <T extends HTMLElement = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];
const clasicas = () => qq('[class]').flatMap((el) => [...el.classList].filter((c) => c.startsWith('ts-')));

const alternar = (panel: HTMLElement, nuevo: 'open' | 'closed') => {
    const e = new Event('toggle');
    Object.defineProperty(e, 'newState', { value: nuevo });
    panel.dispatchEvent(e);
};

beforeEach(() => {
    document.body.innerHTML = '';
    clearToasts();
    document.querySelector('[data-ts-toast-container]')?.remove();
});

describe('helpers', () => {
    it('claseDS crea siempre en scope, con la llave', () => {
        expect(claseDS('toast')).toBe('ts toast');
    });
});

describe('DatePicker en scope', () => {
    const disparadores = () => qq('.ts.datepicker-trigger');
    const panelDe = (d: HTMLElement) => document.getElementById(d.getAttribute('popovertarget')!)!;

    it('el fixture está en scope de verdad: ninguna clase ts-* antes de cablear', () => {
        document.body.innerHTML = fs.readFileSync(path.join(FRAGMENTOS, 'date-picker.html'), 'utf8');
        expect(clasicas()).toEqual([]);
    });

    it('lo que dibuja el Core sale en scope: días, semanas, cabecera y marcas', () => {
        montar('date-picker');
        const suelto = q('[data-ts-date-picker]');
        expect(suelto.querySelectorAll('.ts.calendar-week').length).toBeGreaterThan(3);
        expect(suelto.querySelectorAll('.ts.calendar-dow')).toHaveLength(7);
        const dias = [...suelto.querySelectorAll<HTMLElement>('[data-ts-date-day]')];
        expect(dias.every((d) => d.classList.contains('ts') && d.classList.contains('calendar-day'))).toBe(true);
        expect(qq('.ts.calendar-day-mark').length).toBeGreaterThan(0);
        expect(clasicas()).toEqual([]);
    });

    it('elegir un día escribe el texto del disparador, el hidden y cierra (aria-expanded e is-open)', () => {
        montar('date-picker');
        const disp = disparadores()[0];
        const panel = panelDe(disp);
        (panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
        alternar(panel, 'open');
        expect(disp.classList.contains('is-open')).toBe(true);

        panel.querySelector<HTMLElement>('[data-ts-date-day][data-ts-value="2026-07-20"]')!.click();

        expect(q<HTMLInputElement>('input[name="fecha-despliegue"]').value).toBe('2026-07-20');
        expect(disp.querySelector('.ts.datepicker-value')!.textContent).toBe(
            new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(2026, 6, 20)),
        );
        expect(disp.classList.contains('is-open')).toBe(false);
        expect(clasicas()).toEqual([]);
    });

    it('limpiar: el botón de la fecha vacía el DatePicker (no otro campo) y vuelve al placeholder', () => {
        montar('date-picker');
        const d = disparadores().find((x) => x.querySelector('.ts.datepicker-value')?.textContent?.trim() && x.parentElement!.querySelector('[data-ts-clear]:not([hidden])'))!;
        const boton = d.parentElement!.querySelector<HTMLButtonElement>('[data-ts-clear]')!;
        const panel = panelDe(d);
        (panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
        expect(panel.querySelector('[data-ts-date-picker]')!.hasAttribute('data-ts-value')).toBe(true);

        boton.click();

        expect(panel.querySelector('[data-ts-date-picker]')!.hasAttribute('data-ts-value')).toBe(false);
        expect(d.classList.contains('is-placeholder')).toBe(true);
        expect(boton.hidden).toBe(true);
    });
});

describe('Checkbox y Radio en scope', () => {
    it('checkbox: is-checked sigue al input', () => {
        montar('checkbox');
        const input = qq<HTMLInputElement>('input.ts.checkbox-input').find((i) => !i.disabled && !i.checked)!;
        const etiqueta = input.closest('.ts.checkbox')!;
        input.click();
        expect(etiqueta.classList.contains('is-checked')).toBe(true);
        input.click();
        expect(etiqueta.classList.contains('is-checked')).toBe(false);
    });

    it('radio: al elegir uno se apaga el anterior del grupo', () => {
        montar('radio');
        const marcado = qq<HTMLInputElement>('input.ts.radio-input').find((i) => i.checked && i.name)!;
        const otro = qq<HTMLInputElement>('input.ts.radio-input').find((i) => i.name === marcado.name && i !== marcado && !i.disabled)!;
        otro.click();
        expect(otro.closest('.ts.radio')!.classList.contains('is-checked')).toBe(true);
        expect(marcado.closest('.ts.radio')!.classList.contains('is-checked')).toBe(false);
    });
});

describe('Popover en scope', () => {
    it('init apaga los campos de un panel cerrado', () => {
        document.body.innerHTML = `<form id="f"><div class="ts popover" popover="auto"><input name="dentro" value="d"></div></form>`;
        init(document);
        expect([...new FormData(q<HTMLFormElement>('#f')).keys()]).toEqual([]);
    });
});

describe('Toast en scope', () => {
    it('en una página con la llave ts, el contenedor y el toast se crean en scope', () => {
        montar('toast');
        const el = toast('Guardado', { variant: 'success' });
        expect(q('[data-ts-toast-container]').className).toBe('ts toaster position-bottom-right');
        expect(el.className).toBe('ts toast variant-success');
    });

    it('updateToast cambia la variante sin perder el modo', () => {
        montar('toast');
        const el = toast('Desplegando…');
        updateToast(el, { variant: 'danger' });
        expect(el.className).toBe('ts toast variant-danger');
    });

    it('un contenedor que ya está en el HTML se reutiliza', () => {
        document.body.innerHTML = `<div data-ts-toast-container class="ts toaster position-top-right"></div>`;
        const el = toast('Hola');
        expect(el.className).toBe('ts toast variant-default');
        expect(q('[data-ts-toast-container]').className).toBe('ts toaster position-top-right');
        expect(qq('[data-ts-toast-container]')).toHaveLength(1);
    });

    it('sin llave ts en la página, el contenedor y el toast igual se crean en scope', () => {
        document.body.innerHTML = `<p>x</p>`;
        const el = toast('Hola');
        expect(q('[data-ts-toast-container]').className).toBe('ts toaster position-bottom-right');
        expect(el.className).toBe('ts toast variant-default');
    });
});
