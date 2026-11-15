// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// con granularity="minute" y sin fecha elegida, los controles de hora no emiten ni arman un valor inválido.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { init } from './index';

const HTML = fs.readFileSync(path.resolve(__dirname, '../../routes/_docs/core-html/date-picker.html'), 'utf8');

function montarSinFecha(): { picker: HTMLElement; detalles: unknown[] } {
	document.body.innerHTML = HTML;
	const picker = document.querySelector<HTMLElement>('[data-ts-date-picker][data-ts-granularity="minute"]')!;
	for (const a of ['data-ts-value', 'data-ts-min', 'data-ts-max']) picker.removeAttribute(a);
	const detalles: unknown[] = [];
	document.addEventListener('ts:change', (e) => detalles.push((e as CustomEvent).detail));
	init(document);
	return { picker, detalles };
}

beforeEach(() => {
	document.body.innerHTML = '';
	document.documentElement.lang = 'es';
});

describe('DatePicker emitido — hora sin fecha elegida', () => {
	it('los controles de hora arrancan deshabilitados', () => {
		const { picker } = montarSinFecha();
		const horas = picker.querySelector<HTMLInputElement>('input[data-ts-date-time="hour"]')!;
		expect(horas.disabled).toBe(true);
	});

	it('clickear los botones del NumberInput y las flechas no emite ts:change', () => {
		const { picker, detalles } = montarSinFecha();
		for (const boton of picker.querySelectorAll<HTMLButtonElement>('[data-ts-date-time], [data-ts-number] [data-ts-number-step]')) boton.click();
		for (const campo of picker.querySelectorAll<HTMLInputElement>('input[data-ts-date-time]')) {
			campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
			campo.dispatchEvent(new Event('change', { bubbles: true }));
		}
		expect(detalles).toEqual([]);
		expect(picker.hasAttribute('data-ts-value')).toBe(false);
	});

	it('aun con los controles habilitados a la fuerza no arma un valor inválido ni se realimenta', () => {
		const { picker, detalles } = montarSinFecha();
		for (const campo of picker.querySelectorAll<HTMLInputElement>('input[data-ts-date-time]')) campo.disabled = false;
		for (const boton of picker.querySelectorAll<HTMLButtonElement>('[data-ts-number-step]')) {
			boton.disabled = false;
			boton.click();
		}
		for (const campo of picker.querySelectorAll<HTMLInputElement>('input[data-ts-date-time]')) {
			campo.value = '7';
			campo.dispatchEvent(new Event('input', { bubbles: true }));
			campo.dispatchEvent(new Event('change', { bubbles: true }));
		}
		expect(detalles).toEqual([]);
		expect(JSON.stringify(detalles)).not.toContain('NaN');
	});
});
