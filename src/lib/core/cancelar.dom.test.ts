// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { init } from './index';

// Frenar un ts:change que avisa una acción del usuario evita que el Core la aplique.

const DIR = path.resolve(__dirname, '../../core-datos/html');
const primero = (slug: string, sel: string) => {
    document.body.innerHTML = readFileSync(path.join(DIR, `${slug}.html`), 'utf8');
    init(document);
    return document.querySelector<HTMLElement>(sel)!;
};
const frenando = (componente: string, accion: () => void) => {
    const frenar = (e: Event) => { if ((e as CustomEvent).detail?.component === componente) e.preventDefault(); };
    document.addEventListener('ts:change', frenar);
    try { accion(); } finally { document.removeEventListener('ts:change', frenar); }
};

beforeEach(() => { document.body.innerHTML = ''; });

describe('ts:change frenado', () => {
    it('Combobox: al escribir, el filtrado queda a cargo del código', () => {
        const raiz = primero('combobox', '[data-ts-combobox]');
        const input = raiz.querySelector<HTMLInputElement>('[data-ts-listbox-input]')!;
        const visibles = () => [...raiz.querySelectorAll<HTMLElement>('[role="option"]')].filter((o) => !o.hidden).length;
        const antes = visibles();
        frenando('combobox', () => { input.value = 'zzzz'; input.dispatchEvent(new Event('input', { bubbles: true })); });
        expect(antes).toBeGreaterThan(0);
        expect(visibles()).toBe(antes);
        input.value = 'zzzz';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(visibles()).toBe(0);
    });

    it('NumberInput: al salir con texto que no es un número, el texto queda como se escribió', () => {
        const raiz = primero('number-input', '[data-ts-number][data-ts-number-format]');
        const campo = raiz.querySelector<HTMLInputElement>('[data-ts-number-field]')!;
        campo.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        campo.value = 'abc';
        frenando('number', () => campo.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
        expect(campo.value).toBe('abc');
        campo.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        campo.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        expect(campo.value).not.toBe('abc');
    });
});
