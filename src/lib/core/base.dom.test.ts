// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as base from './base';
import * as completo from './index';
import { m } from './registro';

vi.mock('./pesados/file-upload', () => {
	throw new Error('sin red');
});

const CATALOGOS = path.resolve(__dirname, '../../routes/_docs/core-html');
const catalogo = (slug: string) => fs.readFileSync(path.join(CATALOGOS, `${slug}.html`), 'utf8');
// Plazo amplio: el módulo llega por `import()` y, con la máquina cargada, el segundo que da `vi.waitFor` por defecto no alcanza.
const esperar = (condicion: () => unknown) => vi.waitFor(() => expect(condicion()).toBeTruthy(), { timeout: 15_000 });

beforeEach(() => {
	document.body.innerHTML = '';
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('base del Modo directo', () => {
	it('exporta lo mismo que la versión completa', () => {
		expect(Object.keys(base).sort()).toEqual(Object.keys(completo).sort());
	});

	it('sin ganchos pesados, trae los livianos y no pide ningún módulo a pedido', async () => {
		document.body.innerHTML = catalogo('tabs');
		await base.init(document);
		expect(m.tabs).toBeDefined();
		expect(m.toast).toBeDefined();
		for (const pesado of ['datePicker', 'select', 'listbox', 'commandPalette', 'numberInput', 'slider', 'table', 'pagination', 'fileUpload'] as const) {
			expect(m[pesado], pesado).toBeUndefined();
		}
	});

	it('un gancho pesado en la página carga su módulo y lo pinta antes de que init() se cumpla', async () => {
		document.body.innerHTML = catalogo('slider');
		await base.init(document);
		expect(m.slider).toBeDefined();
		expect(document.body.innerHTML).toContain('--ts-');
	});

	it('el Select pide su listbox junto con él', async () => {
		document.body.innerHTML = catalogo('select');
		await base.init(document);
		expect(m.select).toBeDefined();
		expect(m.listbox).toBeDefined();
	});

	it('el HTML que llega después también carga su módulo', async () => {
		await base.init(document);
		expect(m.pagination).toBeUndefined();
		const nuevo = document.createElement('div');
		nuevo.innerHTML = catalogo('pagination');
		document.body.append(nuevo);
		await esperar(() => m.pagination);
	});

	it('una función de la app que llega antes que su módulo se encola y se aplica al llegar', async () => {
		document.body.innerHTML = catalogo('number-input');
		const raiz = document.querySelector<HTMLElement>('[data-ts-number]')!;
		base.setNumberInputLoading(raiz, true);
		expect(raiz.classList.contains('is-loading')).toBe(false);
		await esperar(() => raiz.classList.contains('is-loading'));
		base.setNumberInputLoading(raiz, false);
		expect(raiz.classList.contains('is-loading')).toBe(false);
	});

	it('el click que se adelanta al módulo se procesa cuando llega', async () => {
		document.body.innerHTML = catalogo('table');
		const pendiente = base.init(document);
		expect(m.table).toBeUndefined();
		const encabezado = document.querySelector<HTMLElement>('[data-ts-th][data-ts-key]')!;
		const raiz = encabezado.closest<HTMLElement>('[data-ts-table]')!;
		encabezado.click();
		expect(raiz.getAttribute('data-ts-sort-key')).toBeNull();
		await pendiente;
		expect(raiz.getAttribute('data-ts-sort-key')).toBe(encabezado.getAttribute('data-ts-key'));
	});

	it('si un módulo no carga: avisa con su nombre y vuelve a intentar en la próxima interacción', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		document.body.innerHTML = catalogo('file-upload');
		await base.init(document);
		expect(error).toHaveBeenCalledTimes(1);
		expect(String(error.mock.calls[0][0])).toContain('file-upload');
		expect(m.fileUpload).toBeUndefined();

		document.body.click();
		await esperar(() => error.mock.calls.length >= 2);
		expect(m.fileUpload).toBeUndefined();
	});
});
