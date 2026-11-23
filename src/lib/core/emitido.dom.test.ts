// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { axe } from 'vitest-axe';
import { getAllByRole, getByRole } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { init, toast, updateToast, clearToasts, setButtonLoading, setComboboxLoading, setSelectLoading } from './index';

const CATALOGO = path.resolve(__dirname, '../../core-datos/html');

function cuerpoDe(nombre: string): string {
	const archivo = path.join(CATALOGO, `${nombre}.html`);
	if (!fs.existsSync(archivo)) {
		throw new Error(`Falta ${archivo}: el catálogo HTML del Core no trae «${nombre}».`);
	}
	return fs.readFileSync(archivo, 'utf8');
}

function montar(nombre: string): void {
	document.body.innerHTML = cuerpoDe(nombre);
	init(document);
}

const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const tecla = (el: Element, key: string) =>
	el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const qq = <T extends HTMLElement = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];

beforeEach(() => {
	document.body.innerHTML = '';
	clearToasts();
});

describe('Accordion emitido', () => {
	const items = () => qq<HTMLDetailsElement>('details[data-ts-accordion-item]');

	it('cada ítem es un <details> con su <summary>, con el primero abierto', () => {
		montar('accordion');

		expect(items()).toHaveLength(2);
		expect(qq('summary[data-ts-accordion-trigger]')).toHaveLength(2);
		expect(items().map((d) => d.open)).toEqual([true, false]);
	});

	it('abre al hacer click, con el Core sobre el HTML emitido', () => {
		montar('accordion');
		qq('[data-ts-accordion-trigger]')[1].click();

		expect(items()[1].open).toBe(true);
	});

	it('sin data-ts-multiple, abrir uno cierra el otro', () => {
		montar('accordion');
		qq('[data-ts-accordion-trigger]')[1].click();

		expect(items()[0].open).toBe(false);
	});
});

describe('Tabs emitido', () => {
	it('el envoltorio y los paneles de las pestañas están en el artefacto', () => {
		montar('tabs');
		expect(q('[data-ts-tabs]')).not.toBeNull();
		expect(qq('[data-ts-tabs-panel]')).toHaveLength(3);
		expect(qq('[data-ts-tabs-tab]')).toHaveLength(3);
	});

	it('cambia de pestaña y de panel', () => {
		montar('tabs');
		const tab = qq('[data-ts-tabs-tab]')[1];
		tab.click();

		expect(tab.getAttribute('aria-selected')).toBe('true');
		expect(qq('[data-ts-tabs-panel]')[1].hidden).toBe(false);
		expect(qq('[data-ts-tabs-panel]')[0].hidden).toBe(true);
	});

	it('las flechas recorren las pestañas', () => {
		montar('tabs');
		const primera = qq('[data-ts-tabs-tab]')[0];
		primera.focus();
		primera.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

		expect(document.activeElement).toBe(qq('[data-ts-tabs-tab]')[1]);
	});
});

describe('Banner emitido', () => {
	it('es una región con nombre, no el landmark banner del encabezado de la página', () => {
		montar('banner');

		expect(q('[data-ts-dismissible]').getAttribute('role')).toBe('region');
		expect(q('[data-ts-dismissible]').getAttribute('aria-label')).toBe('Aviso');
		expect(document.querySelector('[role=banner]')).toBeNull();
	});

	it('el botón de cerrar del componente es el que engancha el Core', () => {
		montar('banner');
		q('[data-ts-dismiss]').click();

		expect(q('[data-ts-dismissible]').hidden).toBe(true);
	});
});

describe('SVG emitido', () => {
	it('ningún atributo de presentación lleva var() (inválido en SVG y marcado por Safari)', () => {
		const conVar: string[] = [];
		for (const archivo of fs.readdirSync(CATALOGO).filter((f) => f.endsWith('.html'))) {
			const html = fs.readFileSync(path.join(CATALOGO, archivo), 'utf8');
			for (const svg of html.match(/<svg\b[^>]*>/g) ?? []) {
				if (/\s[a-z-]+="[^"]*var\(/.test(svg)) conVar.push(`${archivo}: ${svg.slice(0, 90)}`);
			}
		}

		expect(conVar).toEqual([]);
	});

	it('el ícono lleva su tamaño en px y la clase icon-N del token', () => {
		montar('accordion');
		const icono = q('svg.ts.icon');

		expect(icono.getAttribute('width')).toBe('18');
		expect(icono.classList.contains('icon-18')).toBe(true);
	});
});

describe('Pagination emitido', () => {
	it('el Core dibuja la ventana sobre la plantilla que trae el HTML', () => {
		montar('pagination');
		const valores = qq('[data-ts-page-item]').map((b) => b.getAttribute('data-ts-value'));

		expect(valores[0]).toBe('1');
		expect(valores.at(-1)).toBe('20');
		expect(qq('[data-ts-page-item]').every((b) => b.getAttribute('aria-label') === `Página ${b.textContent?.trim()}`)).toBe(true);
	});

	it('avanza de página y re-dibuja clonando, conservando las clases del CSS', () => {
		montar('pagination');
		q('[data-ts-page-next]').click();

		expect(q('[data-ts-pagination]').getAttribute('data-ts-page')).toBe('2');
		expect(qq('[data-ts-page-item]').every((b) => b.classList.contains('pagination-btn'))).toBe(true);
	});
});

describe('Select emitido', () => {
	it('abre, elige con el teclado y refleja etiqueta y valor de formulario', () => {
		montar('select');
		const trigger = q('[data-ts-listbox-trigger]');
		trigger.click();
		expect(q('[data-ts-listbox-panel]').hidden).toBe(false);

		tecla(trigger, 'ArrowDown');
		tecla(trigger, 'Enter');

		expect(q('[data-ts-listbox-label]').textContent?.trim()).toBe('Lector');
		expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('lector');
		expect(q('[data-ts-listbox-panel]').hidden).toBe(true);
	});

	it('saltea la opción deshabilitada que trae el HTML', () => {
		montar('select');
		const trigger = q('[data-ts-listbox-trigger]');
		trigger.click();
		tecla(trigger, 'Home');

		const activa = q(`#${trigger.getAttribute('aria-activedescendant')}`);
		expect(activa.textContent?.trim()).toBe('Editor');
	});
});

describe('Select emitido: botón de limpiar', () => {
	it('el ejemplo con clearable trae la selección y el botón, y limpiar devuelve el foco al disparador', () => {
		montar('select');
		const boton = q<HTMLButtonElement>('[data-ts-clear]');
		const raiz = boton.closest<HTMLElement>('[data-ts-select]')!;
		const disparador = raiz.querySelector<HTMLElement>('[data-ts-listbox-trigger]')!;
		expect(boton.hidden).toBe(false);
		expect(disparador.contains(boton)).toBe(false);
		expect(raiz.querySelector('[data-ts-listbox-label]')?.textContent?.trim()).toBe('API de pagos');

		boton.click();
		expect(raiz.querySelector('[data-ts-listbox-label]')?.textContent?.trim()).toBe('Elegir un proyecto');
		expect(raiz.querySelector<HTMLInputElement>('[data-ts-listbox-value]')?.value).toBe('');
		expect(boton.hidden).toBe(true);
		expect(document.activeElement).toBe(disparador);
	});
});

describe('Select múltiple emitido: un <input hidden name> por valor', () => {
	const campos = () =>
		[...document.querySelectorAll<HTMLInputElement>('input[name="notificar"]')]
			.filter((e) => !e.disabled)
			.map((e) => e.value);
	const opcionDe = (texto: string) =>
		[...q<HTMLElement>('[data-ts-select][data-ts-multiple]:has([name="notificar"])').querySelectorAll<HTMLElement>('[role="option"]')].find((o) =>
			o.textContent?.includes(texto),
		)!;

	it('envía un campo por valor, en el orden en que se eligieron, y ninguno al deseleccionar todo', () => {
		montar('select');
		expect(campos()).toEqual(['ana', 'carla']);
		const raiz = q<HTMLElement>('[data-ts-select][data-ts-multiple]:has([name="notificar"])');
		raiz.querySelector<HTMLElement>('[data-ts-listbox-trigger]')!.click();
		opcionDe('Bruno Díaz').click();
		expect(campos()).toEqual(['ana', 'carla', 'bruno']);
		opcionDe('Ana Torres').click();
		expect(campos()).toEqual(['carla', 'bruno']);
		opcionDe('Carla Ruiz').click();
		opcionDe('Bruno Díaz').click();
		expect(campos()).toEqual([]);
		opcionDe('Diego Sosa').click();
		expect(campos()).toEqual(['diego']);
	});
});

describe('Select emitido: readonly, loading y opciones ricas', () => {
	const raizDe = (nombre: string) =>
		q<HTMLInputElement>(`[data-ts-listbox-value][name="${nombre}"]`).closest<HTMLElement>('[data-ts-select]')!;
	const disparadorDe = (raiz: HTMLElement) => raiz.querySelector<HTMLElement>('[data-ts-listbox-trigger]')!;

	it('readonly: el disparador trae aria-readonly, no abre y conserva el valor', () => {
		montar('select');
		const raiz = raizDe('entorno');
		const disparador = disparadorDe(raiz);
		expect(raiz.classList.contains('is-readonly')).toBe(true);
		expect(disparador.getAttribute('aria-readonly')).toBe('true');
		disparador.focus();
		disparador.click();
		tecla(disparador, 'ArrowDown');
		expect(disparador.getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).toBe(disparador);
		expect(raiz.querySelector('[data-ts-listbox-label]')?.textContent?.trim()).toBe('Staging');
	});

	it('loading: trae el Spinner y "Cargando…" visibles, y setSelectLoading los apaga', () => {
		montar('select');
		const raiz = raizDe('responsable');
		const disparador = disparadorDe(raiz);
		expect(raiz.classList.contains('is-loading')).toBe(true);
		expect(disparador.getAttribute('aria-busy')).toBe('true');
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-spinner]')!.hidden).toBe(false);
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-loading]')!.hidden).toBe(false);

		setSelectLoading(raiz, false);
		expect(disparador.hasAttribute('aria-busy')).toBe(false);
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-spinner]')!.hidden).toBe(true);
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-loading]')!.hidden).toBe(true);
	});

	it('sin loading, el Spinner y "Cargando…" van ocultos en el markup', () => {
		montar('select');
		const raiz = raizDe('invitar-como');
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-spinner]')!.hidden).toBe(true);
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-loading]')!.hidden).toBe(true);
		expect(disparadorDe(raiz).hasAttribute('aria-busy')).toBe(false);
	});

	it('opciones ricas: la descripción va por aria-describedby, el ícono es decorativo y elegir escribe sólo el label', () => {
		montar('select');
		const raiz = raizDe('plan');
		const pro = raiz.querySelector<HTMLElement>('[data-ts-value="pro"]')!;
		expect(pro.getAttribute('tabindex')).toBe('-1');
		const descripcion = document.getElementById(pro.getAttribute('aria-describedby')!)!;
		expect(descripcion.textContent?.trim()).toBe('Despliegues ilimitados para tu equipo.');
		expect(document.getElementById(pro.getAttribute('aria-labelledby')!)?.textContent?.trim()).toBe('Pro');
		expect(pro.querySelector('[data-select-option-icon]')?.getAttribute('aria-hidden')).toBe('true');

		const disparador = disparadorDe(raiz);
		disparador.click();
		pro.click();
		expect(raiz.querySelector('[data-ts-listbox-label]')?.textContent?.trim()).toBe('Pro');
		expect(disparador.classList.contains('is-placeholder')).toBe(false);
	});
});

describe('Combobox emitido', () => {
	it('filtra mientras se tipea', () => {
		montar('combobox');
		const input = q<HTMLInputElement>('[data-ts-listbox-input]');
		input.value = 'ana';
		input.dispatchEvent(new Event('input', { bubbles: true }));

		const visibles = [...input.closest('[data-ts-combobox]')!.querySelectorAll<HTMLElement>('[role="option"]')].filter((o) => !o.hidden);
		expect(visibles.map((o) => o.textContent?.trim())).toEqual(['Ana Torres']);
	});
});

describe('Combobox emitido: comportamiento', () => {
	it('el panel es popover manual (top-layer), las opciones no son tabulables y hay nodo "Sin resultados" oculto', () => {
		montar('combobox');
		expect(q('[data-ts-listbox-panel]').getAttribute('popover')).toBe('manual');
		expect(qq('[role="option"]').every((o) => o.getAttribute('tabindex') === '-1')).toBe(true);
		expect(q('[data-ts-listbox-empty]').hidden).toBe(true);
		expect(q('[data-ts-listbox-empty]').textContent?.trim()).toBe('Sin resultados');
	});

	it('Escape revierte el texto tipeado y cierra', () => {
		montar('combobox');
		const input = q<HTMLInputElement>('[data-ts-listbox-input]');
		input.focus();
		qq('[role="option"]')[0].click();
		input.dispatchEvent(new Event('focusin', { bubbles: true }));
		input.value = 'xx';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		tecla(input, 'Escape');
		expect(input.value).toBe('Ana Torres');
		expect(q('[data-ts-listbox-panel]').hidden).toBe(true);
	});
});

describe('Combobox emitido: density, prefix, grupos y carga', () => {
	const combo = (nombre: string) => q(`[data-ts-combobox] [name="${nombre}"]`).closest<HTMLElement>('[data-ts-combobox]')!;

	it('density-compact y el bloque de prefijo viajan en el markup', () => {
		montar('combobox');
		expect(combo('proyecto-compacto').querySelector('.ts.combobox-control')!.classList.contains('density-compact')).toBe(true);
		const pre = combo('proyecto-buscar').querySelector('.ts.combobox-control > .ts.combobox-prefix-block')!;
		expect(pre.nextElementSibling?.matches('[data-ts-listbox-input]')).toBe(true);
	});

	it('los grupos salen con role=group + aria-labelledby y el filtrado oculta el que queda vacío', () => {
		montar('combobox');
		const raiz = combo('responsable');
		const grupos = [...raiz.querySelectorAll<HTMLElement>('[role="group"]')];
		expect(grupos.map((g) => g.querySelector(`#${CSS.escape(g.getAttribute('aria-labelledby')!)}`)?.textContent)).toEqual(['Admin', 'Editor', 'Lector']);
		const input = raiz.querySelector<HTMLInputElement>('[data-ts-listbox-input]')!;
		input.value = 'ruiz';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		expect(grupos.map((g) => g.hidden)).toEqual([true, false, true]);
	});

	it('el ejemplo con loading sale cargando (aria-busy, spinner, "Cargando...") y sin filtrar en el cliente', () => {
		montar('combobox');
		const raiz = combo('proyecto-remoto');
		expect(raiz.hasAttribute('data-ts-async')).toBe(true);
		expect(raiz.querySelector('[data-ts-listbox-input]')!.getAttribute('aria-busy')).toBe('true');
		expect(raiz.querySelector('[data-ts-listbox-panel]')!.getAttribute('aria-busy')).toBe('true');
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-spinner]')!.hidden).toBe(false);
		const carga = raiz.querySelector<HTMLElement>('[data-ts-listbox-loading]')!;
		expect(carga.textContent?.trim()).toBe('Cargando...');
		expect(carga.querySelector('.ts.spinner')!.getAttribute('aria-hidden')).toBe('true');
		expect(raiz.querySelector('[data-ts-listbox-spinner] .ts.spinner')!.getAttribute('role')).toBe('status');
		setComboboxLoading(raiz, false);
		expect(raiz.querySelector('[data-ts-listbox-input]')!.hasAttribute('aria-busy')).toBe(false);
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-loading]')!.hidden).toBe(true);
	});

	it('sin violaciones axe con los grupos y el estado cargando', async () => {
		montar('combobox');
		expect(await axe(document.body, { rules: { region: { enabled: false }, 'color-contrast': { enabled: false } } })).toHaveNoViolations();
	});
});

describe('Catálogo emitido: ids únicos por página', () => {
	const slugs = fs
		.readdirSync(CATALOGO)
		.filter((f) => f.endsWith('.html'))
		.map((f) => f.replace('.html', ''));

	it.each(slugs)('%s: sin ids repetidos', (slug) => {
		const html = cuerpoDe(slug);
		const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
		expect(ids.filter((v, i) => ids.indexOf(v) !== i)).toEqual([]);
	});
});

describe('Clearable emitido (Input y Textarea)', () => {
	it('Input: el botón de limpiar vacía el campo y le devuelve el foco', () => {
		montar('input');
		const boton = q<HTMLButtonElement>('[data-ts-clear]');
		const campo = boton.closest('.ts.input')!.querySelector<HTMLInputElement>('input')!;
		expect(boton.hidden).toBe(false);

		boton.click();
		expect(campo.value).toBe('');
		expect(boton.hidden).toBe(true);
		expect(document.activeElement).toBe(campo);
	});

	it('Textarea: idem, y el wrapper ya trae has-clear porque el campo tiene contenido', () => {
		montar('textarea');
		const boton = q<HTMLButtonElement>('[data-ts-clear]');
		const caja = boton.closest('.ts.textarea')!;
		const campo = caja.querySelector('textarea')!;
		expect(caja.classList.contains('has-clear')).toBe(true);

		boton.click();
		expect(campo.value).toBe('');
		expect(boton.hidden).toBe(true);
		expect(document.activeElement).toBe(campo);
	});
});

describe('Input emitido: loading y debounce', () => {
	it('el Spinner sale oculto en todo Input y visible sólo en el que nace cargando', () => {
		montar('input');
		const cajas = qq('.ts.input[data-ts-input]');
		const cargando = cajas.find((c) => c.classList.contains('is-loading'))!;
		expect(cargando.querySelector('input')!.getAttribute('aria-busy')).toBe('true');
		expect(cargando.querySelector<HTMLElement>('[data-ts-field-spinner]')!.hidden).toBe(false);
		for (const c of cajas.filter((x) => x !== cargando)) {
			expect(c.querySelector<HTMLElement>('[data-ts-field-spinner]')!.hidden).toBe(true);
		}
	});

	it('el campo con ondebouncedinput declara el plazo y el Core avisa con ts:debouncedinput', () => {
		vi.useFakeTimers();
		try {
			montar('input');
			const campo = q<HTMLInputElement>('input[data-ts-debounce]');
			expect(campo.getAttribute('data-ts-debounce')).toBe('200');
			const vistos: string[] = [];
			document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
			campo.value = 'Ana Torres';
			campo.dispatchEvent(new Event('input', { bubbles: true }));
			vi.advanceTimersByTime(200);
			expect(vistos).toEqual(['Ana Torres']);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('Textarea emitido: loading, resize y debounce', () => {
	it('el Spinner sale oculto en todo textarea y visible sólo en el que nace cargando', () => {
		montar('textarea');
		const cajas = qq('.ts.textarea');
		const cargando = cajas.find((c) => c.classList.contains('is-loading'))!;
		expect(cargando.querySelector('textarea')!.getAttribute('aria-busy')).toBe('true');
		expect(cargando.querySelector<HTMLElement>('[data-ts-field-spinner]')!.hidden).toBe(false);
		for (const c of cajas.filter((x) => x !== cargando)) {
			expect(c.querySelector<HTMLElement>('[data-ts-field-spinner]')!.hidden).toBe(true);
		}
	});

	it('el resize sale como clase del wrapper', () => {
		montar('textarea');
		expect(qq('.ts.textarea').some((c) => c.classList.contains('resize-both'))).toBe(true);
	});

	it('el campo con ondebouncedinput declara el plazo y el Core avisa con ts:debouncedinput', () => {
		vi.useFakeTimers();
		try {
			montar('textarea');
			const campo = q<HTMLTextAreaElement>('textarea[data-ts-debounce]');
			expect(campo.getAttribute('data-ts-debounce')).toBe('200');
			const vistos: string[] = [];
			document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
			campo.value = 'Despliegue completado.';
			campo.dispatchEvent(new Event('input', { bubbles: true }));
			vi.advanceTimersByTime(200);
			expect(vistos).toEqual(['Despliegue completado.']);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('Combobox emitido: chevron, limpiar y readonly', () => {
	const combos = () => qq('[data-ts-combobox]');

	it('el chevron es un botón con aria-label fuera del orden de Tab y su click abre el panel', () => {
		montar('combobox');
		const [raiz] = combos();
		const chevron = raiz.querySelector<HTMLButtonElement>('[data-ts-listbox-toggle]')!;
		expect(chevron.tagName).toBe('BUTTON');
		expect(chevron.getAttribute('tabindex')).toBe('-1');
		expect(chevron.getAttribute('aria-label')).toBe('Mostrar opciones');
		chevron.click();
		expect(document.activeElement).toBe(raiz.querySelector('[data-ts-listbox-input]'));
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-panel]')!.hidden).toBe(false);
	});

	it('el ejemplo con clearable trae valor y botón; limpiar vacía el input y el hidden y deja el foco en el input', () => {
		montar('combobox');
		const boton = q<HTMLButtonElement>('[data-ts-clear]');
		const raiz = boton.closest<HTMLElement>('[data-ts-combobox]')!;
		const input = raiz.querySelector<HTMLInputElement>('[data-ts-listbox-input]')!;
		expect(boton.hidden).toBe(false);
		expect(input.value).toBe('API de pagos');

		boton.click();
		expect(input.value).toBe('');
		expect(raiz.querySelector<HTMLInputElement>('[data-ts-listbox-value]')!.value).toBe('');
		expect(boton.hidden).toBe(true);
		expect(document.activeElement).toBe(input);
	});

	it('el ejemplo readonly lleva is-readonly, no abre al enfocar y no muestra limpiar ni chevron', () => {
		montar('combobox');
		const input = q<HTMLInputElement>('[data-ts-listbox-input][readonly]');
		const raiz = input.closest<HTMLElement>('[data-ts-combobox]')!;
		expect(raiz.querySelector('.ts.combobox-control')!.classList.contains('is-readonly')).toBe(true);
		expect(input.value).toBe('Producción');
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-toggle]')!.hidden).toBe(true);
		input.focus();
		tecla(input, 'ArrowDown');
		expect(raiz.querySelector<HTMLElement>('[data-ts-listbox-panel]')!.hidden).toBe(true);
	});

	it('form.reset() devuelve el Combobox con valor inicial a ese valor', async () => {
		montar('combobox');
		const boton = q<HTMLButtonElement>('[data-ts-clear]');
		const raiz = boton.closest<HTMLElement>('[data-ts-combobox]')!;
		const form = document.createElement('form');
		raiz.replaceWith(form);
		form.append(raiz);
		boton.click();
		form.reset();
		await new Promise((r) => setTimeout(r, 5));
		expect(raiz.querySelector<HTMLInputElement>('[data-ts-listbox-input]')!.value).toBe('API de pagos');
		expect(raiz.querySelector<HTMLInputElement>('[data-ts-listbox-value]')!.value).toBe('api-pagos');
	});
});

describe('Combobox emitido: valor del formulario', () => {
	it('el form envía el value de la opción (input hidden), no el texto del input visible', () => {
		montar('combobox');
		const visible = q<HTMLInputElement>('[data-ts-listbox-input]');
		const oculto = q<HTMLInputElement>('[data-ts-listbox-value]');

		expect(oculto.type).toBe('hidden');
		expect(oculto.name).toBe('miembro');
		expect(visible.name).toBe('');

		const opcion = qq('[role="option"]')[0];
		opcion.click();
		expect(oculto.value).toBe(opcion.getAttribute('data-ts-value'));
	});
});

describe('Menu emitido', () => {
	it('abre y mueve el foco real al primer ítem', () => {
		montar('menu');
		q('[data-ts-menu-trigger]').click();

		expect(q('[data-ts-menu-panel]').hidden).toBe(false);
		expect(document.activeElement).toBe(qq('[role="menuitem"]')[0]);
	});

	it('elegir un ítem avisa con su valor y cierra', () => {
		montar('menu');
		const espia: string[] = [];
		document.addEventListener('ts:change', (e) => {
			espia.push((e as CustomEvent).detail.value);
		});
		q('[data-ts-menu-trigger]').click();
		qq('[role="menuitem"]')[2].click();

		expect(espia).toContain('borrar');
		expect(q('[data-ts-menu-panel]').hidden).toBe(true);
	});
});

describe('Menu emitido — teclado', () => {
	it('los ítems salen con tabindex -1, Tab cierra y ←/→ no mueven el foco', () => {
		montar('menu');
		for (const i of qq('[role="menuitem"]')) expect(i.getAttribute('tabindex')).toBe('-1');
		q('[data-ts-menu-trigger]').click();
		const primero = qq('[role="menuitem"]')[0];
		primero.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		expect(document.activeElement).toBe(primero);

		primero.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
		expect(q('[data-ts-menu-panel]').hidden).toBe(true);
	});
});

describe('ContextMenu emitido — teclado', () => {
	it('Shift+F10 sobre el contenido enfocado abre el menú', () => {
		montar('context-menu');
		const tarjeta = q('.ts.card');
		tarjeta.setAttribute('tabindex', '0');
		tarjeta.focus();
		tarjeta.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }));

		expect(q('[data-ts-menu-panel]').hidden).toBe(false);
		expect(document.activeElement).toBe(qq('[role="menuitem"]')[0]);
	});
});

describe('ContextMenu emitido', () => {
	it('el click derecho lo abre y suprime el menú del navegador', () => {
		montar('context-menu');
		const raiz = q('[data-ts-context-menu]');
		const e = new MouseEvent('contextmenu', {
			bubbles: true,
			cancelable: true,
			clientX: 10,
			clientY: 20,
		});
		raiz.dispatchEvent(e);

		expect(q('[data-ts-menu-panel]').hidden).toBe(false);
		expect(e.defaultPrevented).toBe(true);
	});
});

describe('Sidebar emitido', () => {
	it('colapsa a rail de íconos sin dejar nada inert y los grupos abren por su cuenta', () => {
		montar('sidebar');
		q('[data-ts-sidebar-toggle]').click();

		expect(q('[data-ts-sidebar]').classList.contains('is-collapsed')).toBe(true);
		expect(q('[data-ts-sidebar-collapsible]').inert).toBe(false);
		expect(q('[data-ts-sidebar-item]').getAttribute('title')).toBe('Inicio');
		q('[data-ts-sidebar-toggle]').click();
		expect(q('[data-ts-sidebar-item]').hasAttribute('title')).toBe(false);
		q('[data-ts-sidebar-toggle]').click();

		const grupo = qq('[data-ts-sidebar-group-toggle]')[1];
		const items = qq('[data-ts-sidebar-group-items]')[1];
		expect(items.hidden).toBe(true);
		grupo.click();
		expect(items.hidden).toBe(false);
	});
});

describe('Sidebar emitido: Drawer bajo el breakpoint', () => {
	it('trae la barra con la clase de corte, el Drawer con la navegación y el disparador', () => {
		montar('sidebar');
		const barra = q('[data-ts-sidebar]');
		expect(barra.getAttribute('data-ts-breakpoint')).toBe('lg');
		const drawer = document.getElementById(barra.getAttribute('data-ts-sidebar-drawer')!);
		expect(drawer?.tagName).toBe('DIALOG');
		expect(drawer?.querySelector('nav[aria-label]')).not.toBeNull();
		expect(q('[data-ts-sidebar-trigger]').getAttribute('aria-label')).toBe('Abrir menú');
	});

	it('al agrandar la ventana con el Drawer abierto, se cierra', () => {
		const ventana = (ancha: boolean) => {
			window.matchMedia = ((query: string) => ({ matches: ancha, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
		};
		HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.open = true; };
		HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.open = false; };
		ventana(false);
		montar('sidebar');
		const drawer = document.getElementById(q('[data-ts-sidebar]').getAttribute('data-ts-sidebar-drawer')!) as HTMLDialogElement;
		q('[data-ts-sidebar-trigger]').click();
		expect(drawer.open).toBe(true);

		ventana(true);
		window.dispatchEvent(new Event('resize'));
		expect(drawer.open).toBe(false);
	});
});

describe('Modal y Drawer emitidos: click en el fondo', () => {
	it.each(['modal', 'drawer'])('%s: el <dialog> declara closedby="any"', (nombre) => {
		montar(nombre);
		expect(q('dialog').getAttribute('closedby')).toBe('any');
	});

	it('AlertDialog: el fondo no cierra (no declara closedby)', () => {
		montar('alert-dialog');
		expect(q('dialog').hasAttribute('closedby')).toBe(false);
	});
});

describe('CommandPalette emitida', () => {
	it('monta sobre <dialog> nativo, que es lo que le da modal y foco gratis', () => {
		montar('command-palette');
		expect(q('[data-ts-command-dialog]').tagName).toBe('DIALOG');
		expect(qq('[role="option"]').length).toBe(3);
	});

	it('filtra por las palabras clave, no sólo por la etiqueta', () => {
		montar('command-palette');
		const input = q<HTMLInputElement>('[data-ts-listbox-input]');
		input.value = 'crear';
		input.dispatchEvent(new Event('input', { bubbles: true }));

		const visibles = qq('[role="option"]').filter((o) => !o.hidden);
		expect(visibles.map((o) => o.textContent?.trim())).toEqual(['Nuevo archivo']);
	});
});

describe('Opción activa por teclado emitida', () => {
	it.each(['select', 'combobox', 'command-palette'])('%s: la opción activa lleva is-focused', (slug) => {
		montar(slug);
		const disp = q('[data-ts-listbox-trigger], [data-ts-listbox-input]');
		disp.focus();
		tecla(disp, 'ArrowDown');
		tecla(disp, 'ArrowDown');

		const id = disp.getAttribute('aria-activedescendant');
		expect(id).toBeTruthy();
		const marcadas = qq('[role="option"].is-focused');
		expect(marcadas).toHaveLength(1);
		expect(marcadas[0].id).toBe(id);
	});
});

describe('Button emitido', () => {
	it('ningún botón del catálogo lleva role="button" ni un status dentro de aria-hidden', () => {
		montar('button');
		expect(qq('.button[role]')).toHaveLength(0);
		expect(qq('[aria-hidden="true"] [role="status"], [aria-hidden="true"][role="status"]')).toHaveLength(0);
	});

	it('el Core completa el estado de carga de un botón del ejemplo y lo deshace', () => {
		document.documentElement.lang = 'es';
		montar('button');
		const guardar = q('.button');
		setButtonLoading(guardar, true);
		expect(getAllByRole(document.body, 'button', { name: 'Cargando Guardar' })).toEqual([guardar]);
		const alClick = vi.fn();
		guardar.addEventListener('click', alClick);
		guardar.click();
		expect(alClick).not.toHaveBeenCalled();
		setButtonLoading(guardar, false);
		guardar.click();
		expect(alClick).toHaveBeenCalledTimes(1);
		document.documentElement.lang = '';
	});
});

describe('Link emitido', () => {
	it('los enlaces son <a href> y la acción es un <button type="button" class="ts link"> (rol y nombre calculados)', () => {
		montar('link');
		const enlaces = getAllByRole(document.body, 'link');
		expect(enlaces.map((a) => a.tagName)).toEqual(['A', 'A', 'A', 'A', 'A']);
		expect(enlaces.every((a) => a.hasAttribute('href'))).toBe(true);
		const accion = getByRole(document.body, 'button', { name: /Retry|Try again|Reintentar/ });
		expect(accion.tagName).toBe('BUTTON');
		expect(accion.getAttribute('type')).toBe('button');
		expect(accion.classList.contains('link')).toBe(true);
		expect(accion.hasAttribute('href')).toBe(false);
	});

	it('el botón-enlace recibe el foco con Tab y se activa con Enter y con Espacio', async () => {
		montar('link');
		const accion = getByRole(document.body, 'button', { name: /Retry|Try again|Reintentar/ });
		let veces = 0;
		accion.addEventListener('click', () => veces++);
		for (let i = 0; i < 5 && document.activeElement !== accion; i++) await userEvent.tab();
		expect(document.activeElement).toBe(accion);
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard(' ');
		expect(veces).toBe(2);
	});
});

describe('Toast emitido', () => {
	it('el Core reusa el contenedor del HTML en vez de crear otro', () => {
		montar('toast');
		toast('Guardado');

		expect(qq('[data-ts-toast-container]')).toHaveLength(1);
		expect(q('[data-ts-toast]').textContent).toContain('Guardado');
	});

	it('el contenedor lleva una clase que el CSS conoce', () => {
		montar('toast');
		expect(q('[data-ts-toast-container]').className).toContain('ts toaster');
	});

	it('acción, pausa y actualización por id andan sobre el contenedor emitido', () => {
		vi.useFakeTimers();
		montar('toast');
		const onclick = vi.fn();
		const el = toast('Proyecto movido a la papelera.', { duration: 1000, action: { label: 'Deshacer', onclick } });
		const cont = q('[data-ts-toast-container]');

		cont.dispatchEvent(new Event('pointerenter'));
		vi.advanceTimersByTime(5000);
		expect(qq('[data-ts-toast]')).toHaveLength(1);

		updateToast(el.getAttribute('data-ts-toast-id')!, { message: 'Despliegue completado.', variant: 'success' });
		expect(el.textContent).toContain('Despliegue completado.');

		q('[data-ts-toast-action]').click();
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(qq('[data-ts-toast]')).toHaveLength(0);
		vi.useRealTimers();
	});
});

describe('NavBar emitida', () => {
	it('trae las dos ramas y la clase que las corta por CSS', () => {
		montar('nav-bar');

		expect(q('[class*="nav-bar-bp-"]')).not.toBeNull();
		expect(q('.ts.nav-bar > .ts.nav-bar-items')).not.toBeNull();
		expect(q('.ts.nav-bar-toggle')).not.toBeNull();
		expect(q('.ts.nav-bar-menu').hidden).toBe(true);
	});

	it('la hamburguesa despliega el menú', () => {
		montar('nav-bar');
		q('[data-ts-toggle]').click();

		expect(q('.ts.nav-bar-menu').hidden).toBe(false);
		expect(q('[data-ts-toggle]').getAttribute('aria-expanded')).toBe('true');
	});

	it('Escape cierra el menú desplegado y, si el foco estaba adentro, vuelve a la hamburguesa', () => {
		montar('nav-bar');
		const boton = q('[data-ts-toggle]');
		boton.click();
		q('.ts.nav-bar-menu a').focus();
		tecla(document.activeElement as Element, 'Escape');

		expect(q('.ts.nav-bar-menu').hidden).toBe(true);
		expect(boton.getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).toBe(boton);
	});

	it('presionar fuera de la barra cierra el menú desplegado; adentro no', () => {
		montar('nav-bar');
		const boton = q('[data-ts-toggle]');
		boton.click();
		q('.ts.nav-bar-brand').dispatchEvent(new Event('pointerdown', { bubbles: true }));
		expect(q('.ts.nav-bar-menu').hidden).toBe(false);

		document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		expect(q('.ts.nav-bar-menu').hidden).toBe(true);
		expect(boton.getAttribute('aria-expanded')).toBe('false');
	});
});

describe('DatePicker emitido', () => {
	const suelto = () => q('[data-ts-date-picker]');
	const enSuelto = (sel: string) => [...suelto().querySelectorAll<HTMLElement>(sel)];

	it('el HTML trae el esqueleto y el Core dibuja el mes', () => {
		montar('date-picker');

		expect(qq('[data-ts-date-day]').length).toBeGreaterThanOrEqual(28);
		expect(q('[data-ts-date-title]').textContent?.toLowerCase()).toContain('julio');
	});

	it('lo generado usa las clases que el CSS conoce, no nombres inventados', () => {
		montar('date-picker');
		expect(enSuelto('.ts.calendar-week').length).toBeGreaterThan(3);
		expect(enSuelto('.ts.calendar-dow')).toHaveLength(7);
		expect(enSuelto('[data-ts-date-day]').every((d) => d.classList.contains('calendar-day'))).toBe(true);
	});

	it('marca la seleccionada y le da el único tabindex de la grilla', () => {
		montar('date-picker');
		const sel = enSuelto('[data-ts-date-day]').filter((d) => d.classList.contains('is-selected'));

		expect(sel).toHaveLength(1);
		expect(sel[0].textContent).toBe('7');
		expect(enSuelto('[data-ts-date-day]').filter((d) => d.tabIndex === 0)).toHaveLength(1);
	});

	it('navega de mes y repinta', () => {
		montar('date-picker');
		q('[data-ts-date-next]').click();

		expect(q('[data-ts-date-title]').textContent?.toLowerCase()).toContain('agosto');
	});
});

describe('DatePicker emitido con disparador y popover', () => {
	const disparadores = () => qq('.ts.datepicker-trigger');
	const panelDe = (d: HTMLElement) => document.getElementById(d.getAttribute('popovertarget')!)!;
	const alternar = (panel: HTMLElement, nuevo: 'open' | 'closed') => {
		const e = new Event('toggle');
		Object.defineProperty(e, 'newState', { value: nuevo });
		panel.classList.toggle('is-visible', nuevo === 'open');
		panel.dispatchEvent(e);
	};

	it('cada disparador nombra su panel con `popovertarget`, trae aria-haspopup y aria-expanded="false"', () => {
		montar('date-picker');
		expect(disparadores()).toHaveLength(26);
		const conPanel = disparadores().filter((d) => !d.classList.contains('is-readonly'));
		expect(conPanel).toHaveLength(25);
		for (const d of conPanel) {
			const panel = panelDe(d);
			expect(panel.getAttribute('popover')).toBe('auto');
			expect(d.getAttribute('aria-haspopup')).toBe('dialog');
			expect(d.getAttribute('aria-expanded')).toBe('false');
		}
	});

	it('el hidden con `name` va fuera del panel y trae el valor; el panel no tiene campos con `name`', () => {
		montar('date-picker');
		const oculto = q<HTMLInputElement>('input[name="fecha-despliegue"]');
		expect(oculto.value).toBe('2026-07-14');
		expect(oculto.closest('[popover]')).toBeNull();
		expect(q<HTMLInputElement>('input[name="fecha-revision"]').value).toBe('');
		for (const d of disparadores().filter((x) => x.hasAttribute('popovertarget'))) expect(panelDe(d).querySelectorAll('[name]')).toHaveLength(0);
	});

	it('el disparador deshabilitado sale `disabled` (el navegador no abre un popovertarget deshabilitado)', () => {
		montar('date-picker');
		expect((disparadores()[2] as HTMLButtonElement).disabled).toBe(true);
	});

	it('abrir, elegir un día del rango y ver el texto, el hidden y el foco; los días fuera de rango no se eligen', () => {
		montar('date-picker');
		const disp = disparadores()[0];
		const panel = panelDe(disp);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		alternar(panel, 'open');
		expect(disp.getAttribute('aria-expanded')).toBe('true');

		const dias = [...panel.querySelectorAll<HTMLElement>('[data-ts-date-day]')];
		const de = (iso: string) => dias.find((x) => x.getAttribute('data-ts-value') === iso)!;
		expect(de('2026-07-03').getAttribute('aria-disabled')).toBe('true');
		de('2026-07-03').click();
		expect(q<HTMLInputElement>('input[name="fecha-despliegue"]').value).toBe('2026-07-14');

		de('2026-07-20').click();
		expect(q<HTMLInputElement>('input[name="fecha-despliegue"]').value).toBe('2026-07-20');
		expect(disp.querySelector('.ts.datepicker-value')!.textContent).toBe(
			new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(2026, 6, 20)),
		);
		expect(disp.getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).toBe(disp);
	});

	it('sin valor el calendario abre en el mes de hoy y elegir quita el estado de placeholder', () => {
		montar('date-picker');
		const disp = disparadores()[1];
		const panel = panelDe(disp);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		expect(disp.classList.contains('is-placeholder')).toBe(true);
		alternar(panel, 'open');
		const activo = document.activeElement as HTMLElement;
		expect(activo.classList.contains('is-today')).toBe(true);
		activo.click();
		expect(disp.classList.contains('is-placeholder')).toBe(false);
		expect(q<HTMLInputElement>('input[name="fecha-revision"]').value).not.toBe('');
	});
});

describe('DatePicker emitido — nombres accesibles y reset', () => {
	const disparadores = () => qq('.ts.datepicker-trigger');
	const panelDe = (d: HTMLElement) => document.getElementById(d.getAttribute('popovertarget')!)!;
	const alternar = (panel: HTMLElement, nuevo: 'open' | 'closed') => {
		const e = new Event('toggle');
		Object.defineProperty(e, 'newState', { value: nuevo });
		panel.dispatchEvent(e);
	};

	it('el grupo y la grilla del fragmento llevan el mes, y las celdas la fecha completa con aria-selected', () => {
		montar('date-picker');
		const raiz = q('[data-ts-date-picker]');
		expect(raiz.getAttribute('aria-label')?.toLowerCase()).toContain('julio de 2026');
		expect(raiz.querySelector('[role="grid"]')?.getAttribute('aria-label')).toBe(raiz.getAttribute('aria-label'));
		expect(raiz.querySelector('[role="grid"]')?.getAttribute('tabindex')).toBe('-1');
		const sel = raiz.querySelector<HTMLElement>('[data-ts-date-day].is-selected')!;
		expect(sel.getAttribute('aria-label')).toBe('martes, 7 de julio de 2026');
		expect(sel.getAttribute('aria-selected')).toBe('true');
		expect(raiz.querySelector('[data-ts-date-day]:not(.is-selected)')?.getAttribute('aria-selected')).toBe('false');
	});

	it('form.reset() devuelve el texto, el hidden y el valor del DatePicker «Fecha de despliegue»', async () => {
		montar('date-picker');
		const form = document.createElement('form');
		const oculto = q<HTMLInputElement>('input[name="fecha-despliegue"]');
		const disp = disparadores()[0];
		const inicial = disp.querySelector('.ts.datepicker-value')!.textContent;
		const panel = panelDe(disp);
		const raizPopover = disp.closest('.ts.popover-root') ?? disp.parentElement!;
		raizPopover.before(form);
		form.append(raizPopover, oculto);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		alternar(panel, 'open');
		panel.querySelector<HTMLElement>('[data-ts-date-day][data-ts-value="2026-07-20"]')!.click();
		expect(oculto.value).toBe('2026-07-20');

		form.reset();
		await new Promise((r) => setTimeout(r, 5));
		expect(oculto.value).toBe('2026-07-14');
		expect(disp.querySelector('.ts.datepicker-value')!.textContent).toBe(inicial);
		expect(panel.querySelector('[data-ts-date-picker]')!.getAttribute('data-ts-value')).toBe('2026-07-14');
	});
});

describe('DatePicker emitido — label, error, readonly y limpiar', () => {
	const disparadorDe = (texto: string) => disparadoresTodos().find((d) => d.getAttribute('aria-labelledby')?.includes('label') && document.getElementById(d.getAttribute('aria-labelledby')!.split(' ')[0])?.textContent?.startsWith(texto))!;
	const disparadoresTodos = () => qq('.ts.datepicker-trigger');
	const panelDe = (d: HTMLElement) => document.getElementById(d.getAttribute('popovertarget')!)!;
	const alternar = (panel: HTMLElement, nuevo: 'open' | 'closed') => {
		const e = new Event('toggle');
		Object.defineProperty(e, 'newState', { value: nuevo });
		panel.dispatchEvent(e);
	};
	const botonDe = (d: HTMLElement) => d.parentElement!.querySelector<HTMLButtonElement>('[data-ts-clear]')!;

	it('label + hint + required: envoltura de Input, label con asterisco y el disparador nombrado por aria-labelledby', () => {
		montar('date-picker');
		const d = disparadorDe('Fecha de entrega');
		const envoltura = d.closest('.ts.input-wrapper')!;
		expect(envoltura.querySelector('.ts.required-indicator')?.getAttribute('aria-hidden')).toBe('true');
		expect(envoltura.querySelector('label.ts.input-label')?.getAttribute('for')).toBe(d.id);
		expect(d.getAttribute('aria-describedby')).toBe(`${d.id}-hint`);
		expect(document.getElementById(`${d.id}-hint`)?.textContent).toContain('Se aplica al próximo despliegue.');
	});

	it('con error: variante danger, aria-invalid y mensaje con aria-live', () => {
		montar('date-picker');
		const d = disparadorDe('Fecha de corte');
		expect(d.classList.contains('variant-danger')).toBe(true);
		expect(d.getAttribute('aria-invalid')).toBe('true');
		expect(document.getElementById(`${d.id}-hint`)?.getAttribute('aria-live')).toBe('polite');
	});

	it('readonly: enfocable, sin popovertarget, sin panel ni botón de limpiar, y el hidden viaja', () => {
		montar('date-picker');
		const d = disparadorDe('Último despliegue');
		expect((d as HTMLButtonElement).disabled).toBe(false);
		expect(d.classList.contains('is-readonly')).toBe(true);
		for (const a of ['popovertarget', 'aria-haspopup', 'aria-expanded']) expect(d.hasAttribute(a)).toBe(false);
		const envoltura = d.closest('.ts.input-wrapper')!;
		expect(envoltura.querySelector('[popover]')).toBeNull();
		expect(envoltura.querySelector('[data-ts-clear]')).toBeNull();
		expect(envoltura.querySelector<HTMLInputElement>('input[name="ultimo-despliegue"]')!.value).toBe('2026-07-14');
		d.focus();
		d.click();
		expect(document.activeElement).toBe(d);
	});

	it('limpiar: con fecha se ve; click vacía hidden y texto, vuelve al placeholder, avisa `ts:change` y enfoca el disparador', () => {
		montar('date-picker');
		const d = disparadorDe('Fecha de lanzamiento');
		const boton = botonDe(d);
		const panel = panelDe(d);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		const oculto = q<HTMLInputElement>('input[name="fecha-lanzamiento"]');
		expect(boton.hidden).toBe(false);
		expect(oculto.value).toBe('2026-07-21');
		const avisos: unknown[] = [];
		document.addEventListener('ts:change', (e) => avisos.push((e as CustomEvent).detail));

		boton.click();

		expect(avisos).toContainEqual({ component: 'date-picker', value: '' });
		expect(oculto.value).toBe('');
		expect(d.querySelector('.ts.datepicker-value')!.textContent).toBe('Sin fecha de lanzamiento');
		expect(d.classList.contains('is-placeholder')).toBe(true);
		expect(panel.querySelector('[data-ts-date-picker]')!.hasAttribute('data-ts-value')).toBe(false);
		expect(boton.hidden).toBe(true);
		expect(document.activeElement).toBe(d);
	});

	it('limpiar y volver a elegir: el botón reaparece con la fecha nueva', () => {
		montar('date-picker');
		const d = disparadorDe('Fecha de lanzamiento');
		const boton = botonDe(d);
		const panel = panelDe(d);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		boton.click();
		expect(boton.hidden).toBe(true);
		alternar(panel, 'open');
		const dia = panel.querySelector<HTMLElement>('[data-ts-date-day][data-ts-value$="-15"]')!;
		dia.click();
		expect(q<HTMLInputElement>('input[name="fecha-lanzamiento"]').value).toBe(dia.getAttribute('data-ts-value'));
		expect(boton.hidden).toBe(false);
	});

	it('si alguien cancela `ts:change`, no se limpia nada', () => {
		montar('date-picker');
		const d = disparadorDe('Fecha de lanzamiento');
		const cancelar = (e: Event) => e.preventDefault();
		document.addEventListener('ts:change', cancelar);
		botonDe(d).click();
		document.removeEventListener('ts:change', cancelar);
		expect(q<HTMLInputElement>('input[name="fecha-lanzamiento"]').value).toBe('2026-07-21');
		expect(botonDe(d).hidden).toBe(false);
	});

	it('dentro de un <form> con otro campo de texto, limpiar la fecha NO borra el otro campo', () => {
		montar('date-picker');
		const d = disparadorDe('Fecha de lanzamiento');
		const raizPopover = d.closest('.ts.popover-root')!;
		const form = document.createElement('form');
		const otro = document.createElement('input');
		otro.name = 'proyecto';
		otro.value = 'Panel de control';
		raizPopover.before(form);
		form.append(raizPopover, q('input[name="fecha-lanzamiento"]'), otro);
		const panel = panelDe(d);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');

		botonDe(d).click();

		expect(otro.value).toBe('Panel de control');
		expect(q<HTMLInputElement>('input[name="fecha-lanzamiento"]').value).toBe('');
	});

	it('form.reset() devuelve la fecha limpiada y reaparece el botón', async () => {
		montar('date-picker');
		const d = disparadorDe('Fecha de lanzamiento');
		const raizPopover = d.closest('.ts.popover-root')!;
		const form = document.createElement('form');
		raizPopover.before(form);
		form.append(raizPopover, q('input[name="fecha-lanzamiento"]'));
		const panel = panelDe(d);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		botonDe(d).click();
		form.reset();
		await new Promise((r) => setTimeout(r, 5));
		expect(q<HTMLInputElement>('input[name="fecha-lanzamiento"]').value).toBe('2026-07-21');
		expect(d.querySelector('.ts.datepicker-value')!.textContent).toBe('21 jul 2026');
		expect(botonDe(d).hidden).toBe(false);
	});

	it('sin violaciones axe', async () => {
		montar('date-picker');
		expect(await axe(document.body, { rules: { region: { enabled: false } } })).toHaveNoViolations();
	});
});

describe('DatePicker emitido — días no disponibles, marcas, density y loading', () => {
	const disparadores = () => qq('.ts.datepicker-trigger');
	const panelDe = (d: HTMLElement) => document.getElementById(d.getAttribute('popovertarget')!)!;
	const alternar = (panel: HTMLElement, nuevo: 'open' | 'closed') => {
		const e = new Event('toggle');
		Object.defineProperty(e, 'newState', { value: nuevo });
		panel.classList.toggle('is-visible', nuevo === 'open');
		panel.dispatchEvent(e);
	};
	const abrir = (d: HTMLElement) => {
		const panel = panelDe(d);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		alternar(panel, 'open');
		return panel;
	};
	const dia = (panel: HTMLElement, iso: string) => panel.querySelector<HTMLElement>(`[data-ts-date-day][data-ts-value="${iso}"]`)!;

	it('«Entrega en día hábil»: el HTML emitido trae los atributos y el Core deshabilita fines de semana y feriados', () => {
		montar('date-picker');
		const d = disparadores()[8];
		const raiz = panelDe(d).querySelector('[data-ts-date-picker]')!;
		expect(raiz.getAttribute('data-ts-disabled-weekdays')).toBe('0 6');
		expect(raiz.getAttribute('data-ts-disabled-dates')).toBe('2026-07-09 2026-07-10');
		const panel = abrir(d);
		for (const iso of ['2026-07-04', '2026-07-05', '2026-07-09', '2026-07-10']) expect(dia(panel, iso).getAttribute('aria-disabled')).toBe('true');
		expect(dia(panel, '2026-07-13').getAttribute('aria-disabled')).toBe('false');
		dia(panel, '2026-07-04').click();
		expect(q<HTMLInputElement>('input[name="entrega-habil"]').value).toBe('2026-07-14');
	});

	it('«Próxima reunión»: el punto, el aria-label y el title salen del JSON de data-ts-day-marks', () => {
		montar('date-picker');
		const panel = abrir(disparadores()[9]);
		const marcado = dia(panel, '2026-07-21');
		expect(marcado.getAttribute('aria-label')).toBe('martes, 21 de julio de 2026, Reunión de equipo, Revisión de plan');
		expect(marcado.title).toBe('Reunión de equipo, Revisión de plan');
		expect(dia(panel, '2026-07-16').querySelector('.ts.calendar-day-mark.variant-success')).not.toBeNull();
		expect(dia(panel, '2026-07-23').querySelector('.ts.calendar-day-mark.variant-danger')).not.toBeNull();
		expect(dia(panel, '2026-07-22').querySelector('.ts.calendar-day-mark')).toBeNull();
	});

	it('density compact: la clase del modo en el disparador', () => {
		montar('date-picker');
		expect(disparadores()[10].classList.contains('density-compact')).toBe(true);
		expect(disparadores()[0].className).not.toMatch(/density/);
	});

	it('loading emitido: aria-busy en el disparador y la grilla, y el Spinner visible; los demás traen el Spinner oculto', () => {
		montar('date-picker');
		const d = disparadores()[11];
		expect(d.classList.contains('is-loading')).toBe(true);
		expect(d.getAttribute('aria-busy')).toBe('true');
		expect(panelDe(d).querySelector('[role="grid"]')!.getAttribute('aria-busy')).toBe('true');
		const giro = d.parentElement!.querySelector<HTMLElement>('[data-ts-date-spinner]')!;
		expect(giro.hidden).toBe(false);
		expect(giro.querySelector('.ts.spinner')!.getAttribute('aria-label')).toBe('Cargando...');
		const otro = disparadores()[0].parentElement!.querySelector<HTMLElement>('[data-ts-date-spinner]')!;
		expect(otro.hidden).toBe(true);
		expect(disparadores()[0].hasAttribute('aria-busy')).toBe(false);
	});

	it('loading no bloquea: se abre y se elige', () => {
		montar('date-picker');
		const d = disparadores()[11];
		const panel = abrir(d);
		dia(panel, '2026-07-20').click();
		expect(q<HTMLInputElement>('input[name="fecha-renovacion"]').value).toBe('2026-07-20');
	});

	it('el segundo Calendar suelto trae sus atributos y los pinta', () => {
		montar('date-picker');
		const raiz = qq('[data-ts-date-picker]:not([popover] *)')[1];
		expect(raiz.getAttribute('data-ts-disabled-weekdays')).toBe('0 6');
		expect(raiz.querySelectorAll('.ts.calendar-day-mark')).toHaveLength(2);
		expect(raiz.querySelector('[data-ts-date-day][data-ts-value="2026-07-09"]')!.getAttribute('aria-disabled')).toBe('true');
	});
});

describe('DatePicker emitido — atajos', () => {
	beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 6, 15, 10) }));
	afterEach(() => vi.useRealTimers());
	const disparadores = () => qq('.ts.datepicker-trigger');
	const panelDe = (d: HTMLElement) => document.getElementById(d.getAttribute('popovertarget')!)!;
	const alternar = (panel: HTMLElement, nuevo: 'open' | 'closed') => {
		const e = new Event('toggle');
		Object.defineProperty(e, 'newState', { value: nuevo });
		panel.classList.toggle('is-visible', nuevo === 'open');
		panel.dispatchEvent(e);
	};
	const abrir = (i: number) => {
		const panel = panelDe(disparadores()[i]);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		alternar(panel, 'open');
		return panel;
	};
	const atajos = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>('[data-ts-date-preset]')];
	const hidden = (n: string) => q<HTMLInputElement>(`input[name="${n}"]`);

	it('el fragmento trae el grupo de atajos en el panel, antes del calendario, con la clave, el día o el intervalo en el atributo', () => {
		montar('date-picker');
		const panel = panelDe(disparadores()[18]);
		const grupo = panel.querySelector<HTMLElement>('.ts.datepicker-presets')!;
		expect(grupo.getAttribute('role')).toBe('group');
		expect(grupo.getAttribute('aria-label')).toBe('Atajos de fecha');
		expect(grupo.parentElement!.classList.contains('datepicker-panel')).toBe(true);
		expect(grupo.nextElementSibling!.hasAttribute('data-ts-date-picker')).toBe(true);
		expect(atajos(panel).map((b) => [b.getAttribute('data-ts-date-preset'), b.textContent!.trim()])).toEqual([
			['last-7-days', 'Últimos 7 días'], ['last-30-days', 'Últimos 30 días'], ['this-week', 'Esta semana'],
			['this-month', 'Este mes'], ['last-month', 'Mes pasado'], ['2026-07-01/2026-07-14', 'Sprint 14'],
		]);
		expect(atajos(panelDe(disparadores()[17])).map((b) => b.getAttribute('data-ts-date-preset'))).toEqual(['today', '2026-07-31']);
	});

	it('«Despliegue programado»: Hoy elige el día de hoy y cierra devolviendo el foco', () => {
		montar('date-picker');
		const panel = abrir(17);
		const avisos: unknown[] = [];
		document.addEventListener('ts:change', (e) => avisos.push((e as CustomEvent).detail));
		atajos(panel)[0].click();
		expect(hidden('despliegue-programado').value).toBe('2026-07-15');
		expect(disparadores()[17].getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).toBe(disparadores()[17]);
		expect(avisos).toEqual([{ component: 'date-picker', value: '2026-07-15' }]);
	});

	it('«Periodo de reporte»: las claves se resuelven contra hoy y se escriben los dos hidden', () => {
		montar('date-picker');
		const panel = abrir(18);
		const elegir = (clave: string) => {
			atajos(panel).find((b) => b.getAttribute('data-ts-date-preset') === clave)!.click();
			const r = [hidden('reporte-inicio').value, hidden('reporte-fin').value];
			alternar(panel, 'open');
			return r;
		};
		expect(elegir('last-7-days')).toEqual(['2026-07-09', '2026-07-15']);
		expect(elegir('last-30-days')).toEqual(['2026-06-16', '2026-07-15']);
		expect(elegir('this-week')).toEqual(['2026-07-13', '2026-07-19']);
		expect(elegir('this-month')).toEqual(['2026-07-01', '2026-07-31']);
		expect(elegir('last-month')).toEqual(['2026-06-01', '2026-06-30']);
		expect(elegir('2026-07-01/2026-07-14')).toEqual(['2026-07-01', '2026-07-14']);
	});

	it('«Historial de despliegues» (max = 15 de julio, atajos de rango fijos): los que pasan del máximo quedan aria-disabled y no se eligen', () => {
		montar('date-picker');
		const panel = abrir(19);
		expect(atajos(panel).map((b) => b.textContent!.trim())).toEqual(['Junio', 'Primera quincena', 'Segunda quincena', 'Julio']);
		expect(atajos(panel).map((b) => b.getAttribute('aria-disabled'))).toEqual(['false', 'false', 'true', 'true']);
		atajos(panel)[2].click();
		expect(hidden('historial-inicio').value).toBe('');
		expect(disparadores()[19].getAttribute('aria-expanded')).toBe('true');
		atajos(panel)[0].click();
		expect([hidden('historial-inicio').value, hidden('historial-fin').value]).toEqual(['2026-06-01', '2026-06-30']);
	});

	it('«Historial de despliegues» no depende del día: con otro reloj los mismos atajos siguen disponibles y apagados', () => {
		vi.setSystemTime(new Date(2027, 2, 3, 10));
		montar('date-picker');
		const panel = abrir(19);
		expect(atajos(panel).map((b) => b.getAttribute('aria-disabled'))).toEqual(['false', 'false', 'true', 'true']);
	});

	it('«Periodo de auditoría»: quince atajos, cada uno con `title` con su label completo para el que se corta', () => {
		montar('date-picker');
		const panel = panelDe(disparadores()[20]);
		const lista = atajos(panel);
		expect(lista).toHaveLength(15);
		expect(lista[0].textContent!.trim()).toBe('Sprint_extraordinario_de_cierre_trimestral_2026_Q3_final');
		for (const b of lista) expect(b.getAttribute('title')).toBe(b.textContent!.trim());
	});

	it('«Vencimiento» con prefix: el bloque va primero en el disparador, antes del ícono y del valor, y lo marca con `has-prefix`', () => {
		montar('date-picker');
		const d = disparadores()[21];
		expect(d.classList.contains('has-prefix')).toBe(true);
		const bloque = d.firstElementChild as HTMLElement;
		expect(bloque.classList.contains('datepicker-prefix-block')).toBe(true);
		expect(bloque.textContent!.trim()).toBe('Vence');
		expect(bloque.nextElementSibling!.tagName.toLowerCase()).toBe('svg');
		expect(d.querySelector('.ts.datepicker-value')!.textContent).toBe(new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(2026, 6, 14)));
		expect(disparadores().filter((x) => x !== d).every((x) => !x.classList.contains('has-prefix') && !x.querySelector('.ts.datepicker-prefix-block'))).toBe(true);
	});

	it('al abrir, el foco sigue en el día y los atajos quedan antes en el orden del documento', () => {
		montar('date-picker');
		const panel = abrir(18);
		const dia = panel.querySelector<HTMLElement>('[data-ts-autofocus]')!;
		expect(dia).not.toBeNull();
		expect(atajos(panel)[0].compareDocumentPosition(dia) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('sin violaciones axe con el panel de atajos abierto', async () => {
		montar('date-picker');
		abrir(19);
		expect(await axe(panelDe(disparadores()[19]), { rules: { region: { enabled: false }, 'aria-dialog-name': { enabled: false } } })).toHaveNoViolations();
	});
});

describe('DatePicker emitido — RTL', () => {
	it('los chevrones viven dentro de `ts calendar-nav` (el CSS los espeja) y ← avanza un día', () => {
		montar('date-picker');
		expect(q('[data-ts-date-prev]').classList.contains('calendar-nav')).toBe(true);
		expect(q('[data-ts-date-prev] svg')).toBeTruthy();
		expect(q('[data-ts-date-next] svg')).toBeTruthy();

		document.documentElement.dir = 'rtl';
		try {
			const dia7 = qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === '2026-07-07')!;
			tecla(dia7, 'ArrowLeft');
			expect(q('[data-ts-date-picker]').getAttribute('data-ts-focused')).toBe('2026-07-08');
		} finally {
			document.documentElement.dir = '';
		}
	});
});

describe('Los que se probaban por gesto y ahora tienen página propia', () => {
	it('Collapsible: viaja cerrado y abre', () => {
		montar('collapsible');
		const item = q<HTMLDetailsElement>('details[data-ts-accordion-item]');
		expect(item.open).toBe(false);

		q('[data-ts-accordion-trigger]').click();
		expect(item.open).toBe(true);
	});

	it('Tag: se descarta el que puede, y el que no no trae botón', () => {
		montar('tag');
		expect(qq('[data-ts-dismissible]')).toHaveLength(2);

		qq('[data-ts-dismiss]')[0].click();
		expect(qq('[data-ts-dismissible]')[0].hidden).toBe(true);
	});

	it('SegmentedControl: la flecha mueve el foco Y selecciona, como manda la APG', () => {
		montar('segmented-control');
		const opciones = qq('[data-ts-segmented-option]');
		opciones[1].focus();
		tecla(opciones[1], 'ArrowRight');

		expect(document.activeElement).toBe(opciones[2]);
		expect(opciones[2].getAttribute('aria-checked')).toBe('true');
	});

	it('NumberInput: suma respetando el tope y deshabilita el botón al llegar', () => {
		montar('number-input');
		const mas = qq('[data-ts-number-step]')[1];
		const campo = q<HTMLInputElement>('[data-ts-number-field]');

		mas.click();
		expect(campo.value).toBe('2');
	});

	it('NumberInput: el ejemplo con error expresa variant-danger, aria-invalid y hint asociado', () => {
		montar('number-input');
		const campos = qq('[data-ts-number-field]');
		const campo = campos[1];
		const hint = document.getElementById(campo.getAttribute('aria-describedby')!)!;

		expect(campo.closest('.ts.number-input')?.classList.contains('variant-danger')).toBe(true);
		expect(campo.getAttribute('aria-invalid')).toBe('true');
		expect(hint.classList.contains('variant-danger')).toBe(true);
		expect(hint.getAttribute('aria-live')).toBe('polite');
	});

	it('NumberInput: el ejemplo con data-ts-allow-wheel sube con la rueda y el otro no', () => {
		montar('number-input');
		const [normal, permitido] = qq('[data-ts-number-field]') as HTMLInputElement[];
		expect(permitido.closest('[data-ts-number]')?.hasAttribute('data-ts-allow-wheel')).toBe(true);

		permitido.focus();
		permitido.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
		expect(permitido.value).toBe('4');

		normal.focus();
		normal.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
		expect(normal.value).toBe('1');
		expect(document.activeElement).toBe(normal);
	});

	it('NumberInput: el ejemplo con formato muestra la moneda, edita el crudo y manda el crudo al form', () => {
		montar('number-input');
		const campo = qq('[data-ts-number-field]').find((c) => c.getAttribute('aria-label') === 'Precio del plan') as HTMLInputElement;
		const oculto = document.querySelector<HTMLInputElement>('input[type="hidden"][name="precio-plan"]')!;
		expect(campo.getAttribute('role')).toBe('spinbutton');
		expect(campo.value.replace(/\s/g, ' ')).toBe('12.500,50 US$');
		expect(oculto.value).toBe('12500.5');
		expect(campo.hasAttribute('name')).toBe(false);

		campo.focus();
		expect(campo.value).toBe('12500,5');
		campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
		expect(campo.value).toBe('12501');
		expect(oculto.value).toBe('12501');
		campo.blur();
		expect(campo.value.replace(/\s/g, ' ')).toBe('12.501,00 US$');
	});

	it('NumberInput: con min=0 el signo menos no entra; con min negativo sí', () => {
		montar('number-input');
		const [cantidad] = qq('[data-ts-number-field]') as HTMLInputElement[];
		const ajuste = qq('[data-ts-number-field]').find((c) => c.getAttribute('aria-label') === 'Ajuste de capacidad')!;
		const a = new InputEvent('beforeinput', { data: '-', cancelable: true, bubbles: true });
		cantidad.dispatchEvent(a);
		const b = new InputEvent('beforeinput', { data: '-', cancelable: true, bubbles: true });
		ajuste.dispatchEvent(b);
		expect(a.defaultPrevented).toBe(true);
		expect(b.defaultPrevented).toBe(false);
	});

	it('NumberInput: vaciar el campo y salir restaura el último valor válido', () => {
		montar('number-input');
		const campo = q<HTMLInputElement>('[data-ts-number-field]');
		campo.focus();
		campo.value = '';
		campo.dispatchEvent(new Event('input', { bubbles: true }));
		campo.blur();

		expect(campo.value).toBe('1');
	});

	it('NumberInput: el ejemplo con prefix y suffix trae los bloques junto al campo', () => {
		montar('number-input');
		expect(q('.ts.number-input-prefix').textContent).toBe('USD');
		expect(q('.ts.number-input-suffix').textContent).toBe('GB');
		expect(q('.ts.number-input-prefix').nextElementSibling?.hasAttribute('data-ts-number-field')).toBe(true);
	});

	it('NumberInput: el ejemplo readonly deshabilita los botones y no cambia con Home/End', () => {
		montar('number-input');
		const campo = qq('[data-ts-number-field]').find((c) => c.hasAttribute('readonly')) as HTMLInputElement;
		const raiz = campo.closest('[data-ts-number]') as HTMLElement;
		expect(raiz.classList.contains('is-readonly')).toBe(true);
		expect([...raiz.querySelectorAll<HTMLButtonElement>('[data-ts-number-step]')].every((b) => b.disabled)).toBe(true);
		campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
		expect(campo.value).toBe('4');
	});

	it('NumberInput: el ejemplo con Home/End y PageUp/PageDown usa el largeStep del markup', () => {
		montar('number-input');
		const raiz = q('[data-ts-large-step]');
		const campo = raiz.querySelector<HTMLInputElement>('[data-ts-number-field]')!;
		campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
		expect(campo.value).toBe('45');
		campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
		expect(campo.value).toBe('0');
	});

	it('NumberInput: el ejemplo con loading trae el Spinner visible y aria-busy', () => {
		montar('number-input');
		const campo = qq('[data-ts-number-field]').find((c) => c.getAttribute('aria-busy') === 'true') as HTMLInputElement;
		const raiz = campo.closest('[data-ts-number]') as HTMLElement;
		expect(raiz.classList.contains('is-loading')).toBe(true);
		expect(raiz.querySelector<HTMLElement>('[data-ts-number-spinner]')!.hidden).toBe(false);
		expect(raiz.querySelector('[data-ts-number-spinner] [role="status"]')).not.toBeNull();
		expect(qq('[data-ts-number-spinner]').filter((s) => s.hidden).length).toBe(qq('[data-ts-number]').length - 1);
	});

	it('Avatar: cae a las iniciales si la imagen falla', () => {
		montar('avatar');
		const img = q<HTMLImageElement>('img');
		img.dispatchEvent(new Event('error'));

		expect(img.isConnected).toBe(false);
		expect(q('[data-ts-avatar-initials]').textContent).toBe('AT');
	});

	it('Card: el brillo escribe las variables que lee el degradado', () => {
		montar('card');
		const card = q('[data-ts-spotlight]');
		card.getBoundingClientRect = () => ({ left: 10, top: 20 }) as DOMRect;
		card.dispatchEvent(new PointerEvent('pointermove', { clientX: 60, clientY: 70, bubbles: true }));

		expect(card.style.getPropertyValue('--ts-spotlight-x')).toBe('50px');
	});

	it('Code: el botón de copiar apunta al bloque por id', () => {
		montar('code');
		const destino = q('[data-ts-copy]').getAttribute('data-ts-copy')!;

		expect(document.querySelector(destino)?.textContent).toContain('npm i -D @taishods/core');
	});

	it('Code: el HTML emitido trae el nombre y el ✓ del acuse de copiado', () => {
		montar('code');
		const boton = q('[data-ts-copy]');
		const plantilla = boton.querySelector<HTMLTemplateElement>('template[data-ts-copied-icon]')!;

		expect(boton.getAttribute('data-ts-copied-label')).toBe('Copiado');
		expect(boton.getAttribute('aria-label')).toBe('Copiar código');
		expect(plantilla.content.querySelector('svg path')?.getAttribute('d')).toMatch(/^M20 6/);
	});

	it('FileUpload: lista lo que se suelta, con el peso legible', () => {
		montar('file-upload');
		const raiz = q('[data-ts-file-upload]');
		const e = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(e, 'dataTransfer', {
			value: { files: [new File(['xy'], 'nota.txt', { type: 'text/plain' })] },
		});
		raiz.dispatchEvent(e);

		expect(q('[data-ts-file-item]').textContent).toContain('nota.txt');
		expect(q('[data-ts-file-item]').textContent).toContain('2 B');
	});

	it('FileUpload: la lista vacía va oculta y se acumula', () => {
		montar('file-upload');
		const raiz = q('[data-ts-file-upload]');
		const soltar = (archivos: File[]) => {
			const e = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
			Object.defineProperty(e, 'dataTransfer', { value: { files: archivos } });
			raiz.dispatchEvent(e);
		};
		expect(q('[data-ts-file-list]').hidden).toBe(true);

		soltar([new File(['xy'], 'nota.txt', { type: 'text/plain' })]);
		soltar([new File(['z'], 'otra.txt', { type: 'text/plain' })]);

		expect(q('[data-ts-file-list]').hidden).toBe(false);
		expect(qq('[data-file-name]').map((n) => n.textContent)).toEqual(['nota.txt', 'otra.txt']);
		expect(qq('[data-file-remove]').map((b) => b.getAttribute('aria-label'))).toEqual(['Quitar nota.txt', 'Quitar otra.txt']);
	});

	it('Toc: marca activo el encabezado que se está leyendo', () => {
		montar('toc');
		q('#resumen').getBoundingClientRect = () => ({ top: -10 }) as DOMRect;
		q('#despliegues').getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
		q('#equipo').getBoundingClientRect = () => ({ top: 900 }) as DOMRect;
		window.dispatchEvent(new Event('scroll'));

		expect(q('[href="#resumen"]').classList.contains('is-active')).toBe(true);
		expect(q('[href="#despliegues"]').classList.contains('is-active')).toBe(false);
	});
});

describe('Table emitida', () => {
	const nombres = () => qq('[data-ts-cell="nombre"]').map((c) => c.textContent?.trim());

	it('ordena alfabéticamente al click, sobre el HTML emitido', () => {
		montar('table');
		qq('[data-ts-th]')[0].click();

		expect(nombres()).toEqual(['Ana', 'Beto', 'Cami']);
		expect(qq('[data-ts-th]')[0].getAttribute('aria-sort')).toBe('ascending');
	});

	it('ordena números como números, no como texto', () => {
		montar('table');
		qq('[data-ts-th]')[2].click();

		expect(nombres()).toEqual(['Ana', 'Beto', 'Cami']);
	});

	it('el segundo click invierte', () => {
		montar('table');
		qq('[data-ts-th]')[0].click();
		qq('[data-ts-th]')[0].click();

		expect(nombres()).toEqual(['Cami', 'Beto', 'Ana']);
	});
});

describe('Breadcrumbs emitido', () => {
	it('el tramo colapsado viaja oculto en el HTML', () => {
		montar('breadcrumbs');
		const ocultos = qq('[data-ts-toggle-target]');

		expect(ocultos.length).toBeGreaterThan(0);
		expect(ocultos.every((o) => o.hidden)).toBe(true);
	});

	it('el "…" lo despliega', () => {
		montar('breadcrumbs');
		q('[data-ts-toggle]').click();

		expect(qq('[data-ts-toggle-target]').every((o) => !o.hidden)).toBe(true);
		expect(q('[data-ts-toggle]').getAttribute('aria-expanded')).toBe('true');
	});
});

describe('Popover emitido', () => {
	it('se resuelve con la Popover API nativa, sin ganchos del Core', () => {
		montar('popover');
		const panel = q('[popover]');

		expect(q('button').getAttribute('popovertarget')).toBe(panel.id);
		expect(document.body.innerHTML).not.toContain('data-ts-');
	});

	const alternar = (panel: HTMLElement, tipo: 'beforetoggle' | 'toggle', nuevo: 'open' | 'closed') => {
		const e = new Event(tipo);
		Object.defineProperty(e, 'newState', { value: nuevo });
		panel.dispatchEvent(e);
	};

	it('el disparador sale con aria-expanded="false" y lo mantiene al abrir y cerrar', () => {
		montar('popover');
		const panel = q('[popover]');
		const disp = q('button[popovertarget]');
		expect(disp.getAttribute('aria-haspopup')).toBe('dialog');
		expect(disp.getAttribute('aria-expanded')).toBe('false');
		alternar(panel, 'toggle', 'open');
		expect(disp.getAttribute('aria-expanded')).toBe('true');
		alternar(panel, 'toggle', 'closed');
		expect(disp.getAttribute('aria-expanded')).toBe('false');
	});

	it('el Combobox con `name` dentro de un Popover cerrado no viaja en el FormData; abierto, sí', () => {
		montar('combobox');
		const form = document.createElement('form');
		document.body.append(form);
		form.append(q('.ts.popover-root'));
		const panel = q('.ts.popover[popover]');
		const enviado = () => [...new FormData(form).keys()];

		expect(enviado()).not.toContain('filtro-proyecto');
		alternar(panel, 'beforetoggle', 'open');
		expect(enviado()).toContain('filtro-proyecto');
		alternar(panel, 'beforetoggle', 'closed');
		expect(enviado()).not.toContain('filtro-proyecto');
	});
});

describe('Tooltip emitido', () => {
	it('el tooltip viaja en el HTML, con la descripción enlazada al botón (no al envoltorio)', () => {
		montar('tooltip');
		const tip = q('[data-ts-tooltip]');

		expect(tip).not.toBeNull();
		expect(q('button').getAttribute('aria-describedby')).toBe(tip.id);
		expect(q('[data-ts-tooltip-root]').hasAttribute('aria-describedby')).toBe(false);
	});

	it('aparece con el foco', () => {
		montar('tooltip');
		q('button').dispatchEvent(new Event('focusin', { bubbles: true }));

		expect(q('[data-ts-tooltip]').classList.contains('is-visible')).toBe(true);
	});
});

describe('Combobox y CommandPalette emitidos: textos y comportamiento', () => {
	it('CommandPalette: el placeholder y el texto de vacío salen del locale', () => {
		montar('command-palette');
		expect(q('[data-ts-listbox-input]').getAttribute('placeholder')).toBe('Buscar comandos...');
		expect(q('[data-ts-listbox-empty]').getAttribute('data-ts-empty-for')).toBe('Sin resultados para "{q}"');
		expect(q('[data-ts-listbox-empty]').textContent?.trim()).toBe('No hay comandos disponibles');
	});

	it('Combobox: la opción rica del fixture lleva ícono aria-hidden y descripción por aria-describedby', () => {
		montar('combobox');
		const free = qq('[role="option"]').find((o) => o.getAttribute('data-ts-value') === 'free')!;
		expect(free.querySelector('[data-select-option-icon]')?.getAttribute('aria-hidden')).toBe('true');
		const desc = free.getAttribute('aria-describedby')!;
		expect(document.getElementById(desc)?.textContent).toBe('Para probar el workspace.');
		expect(document.getElementById(free.getAttribute('aria-labelledby')!)?.textContent).toBe('Free');
	});

	it('Combobox: elegir la opción rica deja sólo el label en el campo', () => {
		montar('combobox');
		const free = qq('[role="option"]').find((o) => o.getAttribute('data-ts-value') === 'free')!;
		const input = free.closest('[data-ts-combobox]')!.querySelector<HTMLInputElement>('[data-ts-listbox-input]')!;
		input.focus();
		free.click();
		expect(input.value).toBe('Free');
	});
});

describe('Select y DatePicker emitidos — required bloquea el envío', () => {
	const panelDe = (d: HTMLElement) => document.getElementById(d.getAttribute('popovertarget')!)!;
	const alternar = (panel: HTMLElement, nuevo: 'open' | 'closed') => {
		const e = new Event('toggle');
		Object.defineProperty(e, 'newState', { value: nuevo });
		panel.dispatchEvent(e);
	};

	it('Select «Rol» (required): trae el input de validación pegado al disparador, sin name, con el valor inicial', () => {
		montar('select');
		const proxy = q<HTMLInputElement>('[data-ts-required-proxy]');
		expect(proxy.previousElementSibling?.matches('[data-ts-listbox-trigger]')).toBe(true);
		expect(proxy.required).toBe(true);
		expect(proxy.hasAttribute('name')).toBe(false);
		expect(proxy.value).toBe('editor');
		expect(qq<HTMLInputElement>('[data-ts-required-proxy]').map((p) => p.value)).toEqual(['editor', '']);
	});

	it('Select «Rol»: elegir y enfocar el input de validación mantienen el contrato', () => {
		montar('select');
		const proxy = q<HTMLInputElement>('[data-ts-required-proxy]');
		const raiz = proxy.closest<HTMLElement>('[data-ts-listbox]')!;
		raiz.querySelector<HTMLElement>('[role="option"][data-ts-value="admin"]')!.click();
		expect(proxy.value).toBe('admin');
		proxy.focus();
		expect(document.activeElement).toBe(raiz.querySelector('[data-ts-listbox-trigger]'));
	});

	it('DatePicker «Fecha de entrega» (required): vacío bloquea y elegir un día lo habilita; limpiar o reset vuelven', async () => {
		montar('date-picker');
		const proxy = qq('[data-ts-required-proxy]')[0] as HTMLInputElement;
		expect(qq('[data-ts-required-proxy]')).toHaveLength(2);
		expect(proxy.required).toBe(true);
		expect(proxy.hasAttribute('name')).toBe(false);
		expect(proxy.value).toBe('');
		const disp = proxy.previousElementSibling as HTMLElement;
		expect(disp.matches('.ts.datepicker-trigger')).toBe(true);
		const form = document.createElement('form');
		const raizPopover = disp.parentElement!;
		raizPopover.before(form);
		form.append(raizPopover);
		expect(form.checkValidity()).toBe(false);

		const panel = panelDe(disp);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		alternar(panel, 'open');
		const dia = panel.querySelector<HTMLElement>('[data-ts-date-day]:not(.is-outside)')!;
		dia.click();
		expect(proxy.value).toBe(dia.getAttribute('data-ts-value'));
		expect(form.checkValidity()).toBe(true);

		form.reset();
		await new Promise((r) => setTimeout(r, 5));
		expect(proxy.value).toBe('');
		expect(form.checkValidity()).toBe(false);
	});
});

describe('DatePicker emitido — rango', () => {
	beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 6, 10) }));
	afterEach(() => vi.useRealTimers());
	const disparadores = () => qq('.ts.datepicker-trigger');
	const panelDe = (d: HTMLElement) => document.getElementById(d.getAttribute('popovertarget')!)!;
	const alternar = (panel: HTMLElement, nuevo: 'open' | 'closed') => {
		const e = new Event('toggle');
		Object.defineProperty(e, 'newState', { value: nuevo });
		panel.classList.toggle('is-visible', nuevo === 'open');
		panel.dispatchEvent(e);
	};
	const ventana = () => disparadores()[13];
	const dias = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>('[data-ts-date-day]')];
	const de = (panel: HTMLElement, iso: string) => dias(panel).find((x) => x.getAttribute('data-ts-value') === iso)!;
	const hidden = (n: string) => q<HTMLInputElement>(`input[name="${n}"]`);

	it('el fragmento trae el contrato de rango: data-ts-range, intervalo ISO, región viva con su texto y dos hidden start/end', () => {
		montar('date-picker');
		const raiz = panelDe(ventana()).querySelector<HTMLElement>('[data-ts-date-picker]')!;
		expect(raiz.hasAttribute('data-ts-range')).toBe(true);
		expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-07/2026-07-14');
		expect(raiz.querySelector('[role="grid"]')?.getAttribute('aria-multiselectable')).toBe('true');
		const estado = raiz.querySelector('[data-ts-date-status]')!;
		expect(estado.getAttribute('role')).toBe('status');
		expect(estado.getAttribute('data-ts-end-text')).toBe('Inicio: {start}. Elegir la fecha de fin.');
		expect(hidden('ventana-inicio').getAttribute('data-ts-date-input')).toBe('start');
		expect(hidden('ventana-fin').getAttribute('data-ts-date-input')).toBe('end');
		expect(hidden('ventana-inicio').value).toBe('2026-07-07');
		expect(hidden('ventana-fin').value).toBe('2026-07-14');
		expect(ventana().querySelector('.ts.datepicker-value')!.textContent).toBe(
			new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).formatRange(new Date(2026, 6, 7), new Date(2026, 6, 14)),
		);
	});

	it('sin rango el disparador muestra el placeholder de rango', () => {
		montar('date-picker');
		expect(disparadores()[14].querySelector('.ts.datepicker-value')!.textContent).toBe('Elegir un rango de fechas');
	});

	it('abrir, elegir inicio y fin: texto con formatRange, dos hidden, cierra, devuelve el foco y avisa con inicio y fin', () => {
		montar('date-picker');
		const disp = ventana();
		const panel = panelDe(disp);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		alternar(panel, 'open');
		const avisos: unknown[] = [];
		document.addEventListener('ts:change', (e) => avisos.push((e as CustomEvent).detail));

		de(panel, '2026-07-22').click();
		expect(disp.getAttribute('aria-expanded')).toBe('true');
		expect(panel.querySelector('[data-ts-date-status]')!.textContent).toBe('Inicio: miércoles, 22 de julio de 2026. Elegir la fecha de fin.');
		expect(avisos).toHaveLength(0);

		de(panel, '2026-07-18').click();
		expect(disp.getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).toBe(disp);
		expect(hidden('ventana-inicio').value).toBe('2026-07-18');
		expect(hidden('ventana-fin').value).toBe('2026-07-22');
		expect(avisos).toEqual([{ component: 'date-picker', value: '2026-07-18/2026-07-22', start: '2026-07-18', end: '2026-07-22' }]);
	});

	it('cerrar con el ancla puesta la descarta: al reabrir el calendario vuelve al rango vigente', () => {
		montar('date-picker');
		const panel = panelDe(ventana());
		alternar(panel, 'open');
		de(panel, '2026-07-22').click();
		alternar(panel, 'closed');
		alternar(panel, 'open');
		expect(panel.querySelector('[data-ts-date-picker]')!.hasAttribute('data-ts-anchor')).toBe(false);
		expect(de(panel, '2026-07-22').classList.contains('is-selected')).toBe(false);
		expect(de(panel, '2026-07-07').classList.contains('is-range-start')).toBe(true);
		expect(de(panel, '2026-07-10').classList.contains('is-in-range')).toBe(true);
	});

	it('«Mantenimiento programado»: los fines de semana no se eligen como extremo, pero el tramo los cruza', () => {
		montar('date-picker');
		const disp = disparadores()[16];
		const panel = panelDe(disp);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		alternar(panel, 'open');
		const raiz = panel.querySelector<HTMLElement>('[data-ts-date-picker]')!;
		de(panel, '2026-07-11').click();
		expect(raiz.hasAttribute('data-ts-anchor')).toBe(false);
		de(panel, '2026-07-10').click();
		de(panel, '2026-07-13').click();
		expect(hidden('mantenimiento-inicio').value).toBe('2026-07-10');
		expect(hidden('mantenimiento-fin').value).toBe('2026-07-13');
	});

	it('«Periodo de facturación» (required): el input de validación lleva el intervalo y bloquea vacío', async () => {
		montar('date-picker');
		const disp = disparadores()[14];
		const proxy = disp.nextElementSibling as HTMLInputElement;
		expect(proxy.hasAttribute('data-ts-required-proxy')).toBe(true);
		expect(proxy.value).toBe('');
		const panel = panelDe(disp);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		alternar(panel, 'open');
		const activo = document.activeElement as HTMLElement;
		activo.click();
		expect(proxy.value).toBe('');
		panel.querySelector<HTMLElement>('.is-range-start')!.click();
		expect(proxy.value).toMatch(/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/);
	});

	it('«Sprint» (limpiable): limpiar vacía los dos hidden y avisa con valor, inicio y fin vacíos; form.reset() vuelve al rango', async () => {
		montar('date-picker');
		const disp = disparadores()[15];
		const panel = panelDe(disp);
		(panel as HTMLElement & { hidePopover: () => void }).hidePopover = () => alternar(panel, 'closed');
		const boton = disp.parentElement!.querySelector<HTMLButtonElement>('[data-ts-clear]')!;
		expect(boton.hidden).toBe(false);
		const avisos: unknown[] = [];
		document.addEventListener('ts:change', (e) => avisos.push((e as CustomEvent).detail));
		boton.click();
		expect(avisos).toContainEqual({ component: 'date-picker', value: '', start: '', end: '' });
		expect(hidden('sprint-inicio').value).toBe('');
		expect(hidden('sprint-fin').value).toBe('');
		expect(boton.hidden).toBe(true);

		const form = document.createElement('form');
		const raizPopover = disp.closest('.ts.popover-root') ?? disp.parentElement!;
		raizPopover.before(form);
		form.append(raizPopover, hidden('sprint-inicio'), hidden('sprint-fin'));
		form.reset();
		await new Promise((r) => setTimeout(r, 5));
		expect(hidden('sprint-inicio').value).toBe('2026-07-01');
		expect(hidden('sprint-fin').value).toBe('2026-07-31');
		expect(panel.querySelector('[data-ts-date-picker]')!.getAttribute('data-ts-value')).toBe('2026-07-01/2026-07-31');
	});

	it('el Calendar suelto en modo rango: elegir dos días actualiza el intervalo y deja el tramo pintado', () => {
		montar('date-picker');
		const raiz = qq('[data-ts-date-picker]').filter((r) => !r.closest('[popover]') && r.hasAttribute('data-ts-range'))[0];
		expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-14/2026-07-21');
		const celda = (iso: string) => raiz.querySelector<HTMLElement>(`[data-ts-date-day][data-ts-value="${iso}"]`)!;
		expect(celda('2026-07-17').classList.contains('is-in-range')).toBe(true);
		celda('2026-07-02').click();
		celda('2026-07-05').click();
		expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-02/2026-07-05');
		expect(celda('2026-07-03').classList.contains('is-in-range')).toBe(true);
		expect(celda('2026-07-17').classList.contains('is-in-range')).toBe(false);
	});
});

describe('DatePicker emitido — campo tipeable', () => {
	const campos = () => qq<HTMLInputElement>('.ts.datepicker-input');
	const caja = (i: number) => campos()[i].closest<HTMLElement>('.ts.datepicker-field')!;
	const raizDe = (i: number) => caja(i).parentElement!.querySelector<HTMLElement>('[data-ts-date-picker]')!;
	const hidden = (n: string) => q<HTMLInputElement>(`input[name="${n}"]`);
	const salir = (c: HTMLElement, hacia: HTMLElement | null = null) => c.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: hacia }));
	const escribir = (c: HTMLInputElement, texto: string) => {
		c.focus();
		c.value = texto;
		c.dispatchEvent(new Event('input', { bubbles: true }));
	};

	it('«Entrega» con prefix: el bloque es el primer hijo de la caja, antes del input, y los demás campos no lo traen', () => {
		montar('date-picker');
		const bloque = caja(8).firstElementChild as HTMLElement;
		expect(bloque.classList.contains('datepicker-prefix-block')).toBe(true);
		expect(bloque.textContent!.trim()).toBe('Hasta');
		expect(bloque.nextElementSibling).toBe(campos()[8]);
		expect(campos().slice(0, 8).every((_, i) => !caja(i).querySelector('.ts.datepicker-prefix-block'))).toBe(true);
	});

	it('el fragmento trae la caja con el input, el placeholder del patrón, la descripción de formato y el botón de calendario con popovertarget', () => {
		montar('date-picker');
		expect(campos()).toHaveLength(11);
		const c = campos()[0];
		expect(c.getAttribute('data-ts-date-text')).toBe('');
		expect(c.getAttribute('placeholder')).toBe('dd/mm/aaaa');
		expect(c.getAttribute('autocomplete')).toBe('off');
		expect(c.value).toBe('14/07/2026');
		expect(document.getElementById(c.getAttribute('aria-describedby')!.split(' ').at(-1)!)!.textContent).toBe('Formato: dd/mm/aaaa');
		const toggle = caja(0).querySelector<HTMLElement>('.ts.datepicker-toggle')!;
		expect(toggle.getAttribute('aria-haspopup')).toBe('dialog');
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(document.getElementById(toggle.getAttribute('popovertarget')!)!.hasAttribute('popover')).toBe(true);
		expect(toggle.getAttribute('aria-label')).toBe('Elegir una fecha');
	});

	it('rango: grupo con dos campos (start y end), separador oculto y un solo botón', () => {
		montar('date-picker');
		const c = caja(2);
		expect(c.getAttribute('role')).toBe('group');
		expect([campos()[2].getAttribute('data-ts-date-text'), campos()[3].getAttribute('data-ts-date-text')]).toEqual(['start', 'end']);
		expect([campos()[2].value, campos()[3].value]).toEqual(['07/07/2026', '14/07/2026']);
		expect(c.querySelector('.ts.datepicker-separator')!.getAttribute('aria-hidden')).toBe('true');
		expect(c.querySelectorAll('.ts.datepicker-toggle')).toHaveLength(1);
		const rango = c.querySelector('.ts.datepicker-range')!;
		expect([...rango.children].map((e) => e.className.split(' ').slice(0, 2).join(' '))).toEqual(['ts datepicker-input', 'ts datepicker-separator', 'ts datepicker-input']);
		expect(rango.parentElement).toBe(c);
		expect(caja(0).querySelector('.ts.datepicker-range')).toBeNull();
	});

	it('simple: escribir, salir y ver el hidden, el atributo de valor y el reformateo; no abre el calendario', () => {
		montar('date-picker');
		escribir(campos()[0], '5/8/2026');
		salir(campos()[0]);
		expect(hidden('despliegue-escrito').value).toBe('2026-08-05');
		expect(raizDe(0).getAttribute('data-ts-value')).toBe('2026-08-05');
		expect(campos()[0].value).toBe('05/08/2026');
		expect(raizDe(0).closest('[popover]')!.matches(':popover-open')).toBe(false);
	});

	it('simple con min/max y fines de semana no disponibles: lo inválido revierte y lo válido se confirma', () => {
		montar('date-picker');
		for (const malo of ['01/07/2026', '30/07/2026', '18/07/2026', 'nada']) {
			escribir(campos()[1], malo);
			salir(campos()[1]);
			expect(campos()[1].value, malo).toBe('');
		}
		expect(hidden('entrega-escrita').value).toBe('');
		escribir(campos()[1], '2026-07-15');
		salir(campos()[1]);
		expect(hidden('entrega-escrita').value).toBe('2026-07-15');
	});

	it('required es el nativo del input, y readonly también (sin botón de calendario)', () => {
		montar('date-picker');
		expect(campos()[1].required).toBe(true);
		expect(campos()[1].validity.valueMissing).toBe(true);
		expect(qq('[data-ts-required-proxy]').length).toBeGreaterThanOrEqual(0);
		expect(campos()[4].readOnly).toBe(true);
		expect(caja(4).querySelector('.ts.datepicker-toggle')).toBeNull();
	});

	it('rango: el par completo se confirma al salir del grupo con los dos hidden; uno incompleto vuelve los dos', () => {
		montar('date-picker');
		escribir(campos()[2], '01/07/2026');
		escribir(campos()[3], '');
		salir(campos()[3]);
		expect([campos()[2].value, campos()[3].value]).toEqual(['07/07/2026', '14/07/2026']);
		escribir(campos()[3], '31/07/2026');
		escribir(campos()[2], '20/07/2026');
		salir(campos()[2], campos()[3]);
		salir(campos()[3]);
		expect([hidden('mantenimiento-escrito-inicio').value, hidden('mantenimiento-escrito-fin').value]).toEqual(['2026-07-20', '2026-07-31']);
		expect(raizDe(2).getAttribute('data-ts-value')).toBe('2026-07-20/2026-07-31');
	});

	it('la «x» de «Fecha de auditoría» vacía el campo y deja el foco en el input; elegir el atajo «Hoy» lo llena', () => {
		vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 6, 15, 10) });
		try {
			montar('date-picker');
			const panel = raizDe(5).closest<HTMLElement>('[popover]')! as HTMLElement & { hidePopover: () => void };
			panel.hidePopover = () => {};
			caja(5).querySelector<HTMLElement>('[data-ts-clear]')!.click();
			expect(campos()[5].value).toBe('');
			expect(hidden('auditoria-escrita').value).toBe('');
			expect(document.activeElement).toBe(campos()[5]);
			panel.querySelector<HTMLElement>('[data-ts-date-preset="today"]')!.click();
			expect(campos()[5].value).toBe('15/07/2026');
			expect(hidden('auditoria-escrita').value).toBe('2026-07-15');
		} finally {
			vi.useRealTimers();
		}
	});

	it('density y loading: la caja lleva las clases, el spinner del emisor está visible y los inputs marcan aria-busy al cargar', () => {
		montar('date-picker');
		expect(caja(6).classList.contains('density-compact')).toBe(true);
		expect(caja(6).classList.contains('is-loading')).toBe(true);
		expect(campos()[6].getAttribute('aria-busy')).toBe('true');
		expect(caja(6).querySelector<HTMLElement>('[data-ts-date-spinner]')!.hidden).toBe(false);
		expect(caja(0).querySelector<HTMLElement>('[data-ts-date-spinner]')!.hidden).toBe(true);
	});

	it('sin violaciones axe con los campos tipeables montados', async () => {
		montar('date-picker');
		expect(await axe(caja(0).parentElement!, { rules: { region: { enabled: false } } })).toHaveNoViolations();
		expect(await axe(caja(2).parentElement!, { rules: { region: { enabled: false } } })).toHaveNoViolations();
	});
});

describe('Checkbox y Radio emitidos: error, hint, description, card y label de grupo', () => {
	const texto = (id: string | null) => (id ? document.getElementById(id)?.textContent?.trim() : undefined);

	it('checkbox: el error describe al input, lo marca inválido y la tarjeta sigue el click', () => {
		montar('checkbox');
		const entradas = qq<HTMLInputElement>('.ts.checkbox-input');
		const cajas = qq('.ts.checkbox');
		const conError = entradas.find((i) => i.getAttribute('aria-invalid') === 'true' && !i.closest('[role=group]'))!;
		expect(texto(conError.getAttribute('aria-describedby'))).toBe('Hay que aceptar el despliegue.');
		const conHint = entradas.find((i) => texto(i.getAttribute('aria-describedby')) === 'Una vez por mes, sin spam.')!;
		expect(conHint.hasAttribute('aria-invalid')).toBe(false);
		const tarjeta = cajas.find((c) => c.classList.contains('is-card') && !c.classList.contains('is-checked'))!;
		tarjeta.querySelector<HTMLInputElement>('input')!.click();
		expect(tarjeta.classList.contains('is-checked')).toBe(true);
		expect(tarjeta.querySelector('.ts.checkbox-description')?.textContent).toBe('Pruebas antes de publicar.');
	});

	it('checkbox: el grupo con error se nombra y describe, e invalida a cada ítem', () => {
		montar('checkbox');
		const grupo = q('[role=group]');
		expect(grupo.getAttribute('aria-label')).toBe('Notificaciones');
		expect(texto(grupo.getAttribute('aria-describedby'))).toBe('Hay que elegir al menos un canal.');
		const items = [...grupo.querySelectorAll('input')];
		expect(items.length).toBe(3);
		for (const i of items) expect(i.getAttribute('aria-invalid')).toBe('true');
	});

	it('radio: el label nombra al radiogroup, el hint lo describe y el error lo invalida', () => {
		montar('radio');
		const grupos = qq('[role=radiogroup]');
		const nombre = (g: HTMLElement) => texto(g.getAttribute('aria-labelledby'));
		const entorno = grupos.find((g) => nombre(g) === 'Entorno')!;
		expect(texto(entorno.getAttribute('aria-describedby'))).toBe('Se puede cambiar en cada despliegue.');
		expect(entorno.hasAttribute('aria-invalid')).toBe(false);
		const plan = grupos.find((g) => nombre(g)?.startsWith('Tu plan'))!;
		expect(plan.getAttribute('aria-invalid')).toBe('true');
		expect(plan.getAttribute('aria-required')).toBe('true');
		expect(texto(plan.getAttribute('aria-describedby'))).toBe('Hay que elegir un plan para continuar.');
	});

	it('radio: elegir una opción apaga la anterior y la descripción se ve bajo el label', () => {
		montar('radio');
		const entorno = qq('[role=radiogroup]').find((g) => texto(g.getAttribute('aria-labelledby')) === 'Entorno')!;
		const [produccion, staging] = [...entorno.querySelectorAll<HTMLElement>('.ts.radio')];
		expect(staging.classList.contains('is-checked')).toBe(true);
		produccion.querySelector<HTMLInputElement>('input')!.click();
		expect(produccion.classList.contains('is-checked')).toBe(true);
		expect(staging.classList.contains('is-checked')).toBe(false);
		expect(produccion.querySelector('.ts.radio-description')?.textContent).toBe('Visible para todo el equipo.');
	});

	it('sin violaciones axe', async () => {
		montar('checkbox');
		expect(await axe(document.body, { rules: { region: { enabled: false } } })).toHaveNoViolations();
		montar('radio');
		expect(await axe(document.body, { rules: { region: { enabled: false } } })).toHaveNoViolations();
	});
});

describe('Slider emitido', () => {
	const mover = (el: HTMLInputElement, valor: number) => {
		el.value = String(valor);
		el.dispatchEvent(new Event('input', { bubbles: true }));
	};
	const rango = () => qq<HTMLInputElement>('[data-ts-slider-range] input[type="range"]');

	it('trae el rango con sus dos manijas nombradas, el grupo, el riel y el tramo pintado', () => {
		montar('slider');
		const [inicio, fin] = rango();
		expect(q('[data-ts-slider-range]').getAttribute('role')).toBe('group');
		expect(inicio.getAttribute('aria-label')).toBe('Mínimo');
		expect(fin.getAttribute('aria-label')).toBe('Máximo');
		expect(inicio.getAttribute('aria-valuemax')).toBe(fin.value);
		expect(fin.getAttribute('aria-valuemin')).toBe(inicio.value);
		const riel = q('[data-ts-slider-rail]');
		expect(riel.style.getPropertyValue('--ts-slider-from')).toBe('20%');
		expect(riel.style.getPropertyValue('--ts-slider-to')).toBe('80%');
	});

	it('el rango no deja cruzar las manijas, repinta el tramo y manda ts:change y ts:commit', () => {
		montar('slider');
		const [inicio, fin] = rango();
		const cambios: unknown[] = [];
		const commits: unknown[] = [];
		document.addEventListener('ts:change', (e) => cambios.push((e as CustomEvent).detail));
		document.addEventListener('ts:commit', (e) => commits.push((e as CustomEvent).detail));
		mover(inicio, 100);
		expect(inicio.value).toBe('80');
		mover(inicio, 40);
		expect(q('[data-ts-slider-rail]').style.getPropertyValue('--ts-slider-from')).toBe('40%');
		expect(q('[data-ts-slider-value]').textContent).toBe('\u206840 USD\u2069 – \u206880 USD\u2069');
		fin.dispatchEvent(new Event('change', { bubbles: true }));
		expect(cambios.at(-1)).toEqual({ component: 'slider', value: [40, 80], index: 0 });
		expect(commits).toEqual([{ component: 'slider', value: [40, 80] }]);
	});

	it('el vertical y el de sólo lectura salen marcados; el de sólo lectura no se mueve', () => {
		montar('slider');
		expect(q('.ts.slider.is-vertical input').getAttribute('aria-orientation')).toBe('vertical');
		const lectura = q<HTMLInputElement>('.ts.slider.is-readonly input');
		expect(lectura.getAttribute('aria-readonly')).toBe('true');
		mover(lectura, 5);
		expect(lectura.value).toBe('65');
		expect(tecla(lectura, 'ArrowRight')).toBe(false);
	});

	it('paradas no uniformes: el ejemplo emitido publica el valor real, su texto y las marcas', () => {
		montar('slider');
		const cuerpo = qq('[data-ts-slider-values]');
		expect(cuerpo).toHaveLength(2);
		const [asientos, plan] = cuerpo;
		const input = asientos.querySelector<HTMLInputElement>('input[type="range"]')!;
		expect([input.min, input.max, input.step, input.value]).toEqual(['0', '5', '1', '2']);
		expect(input.getAttribute('aria-valuenow')).toBe('25');
		expect(input.getAttribute('aria-valuetext')).toBe('25 asientos');
		expect(asientos.querySelectorAll('.ts.slider-ticks span')).toHaveLength(6);
		expect(asientos.querySelector<HTMLInputElement>('input[type="hidden"]')!.name).toBe('asientos-plan');
		mover(input, 4);
		expect(input.getAttribute('aria-valuenow')).toBe('100');
		expect(asientos.querySelector('[data-ts-slider-value]')!.textContent).toBe('100 asientos');
		expect(asientos.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe('100');
		// el texto del lector (función de valueText) viaja en data-ts-slider-valuetexts; el visible sigue la plantilla
		const texto = plan.querySelector<HTMLInputElement>('input[type="range"]')!;
		expect(plan.getAttribute('data-ts-slider-valuetexts')).toBe('5 asientos, Free|25 asientos, Pro|100 asientos, Enterprise');
		expect(texto.getAttribute('aria-valuetext')).toBe('25 asientos, Pro');
		mover(texto, 2);
		expect(texto.getAttribute('aria-valuetext')).toBe('100 asientos, Enterprise');
		expect(plan.querySelector('[data-ts-slider-value]')!.textContent).toBe('100 asientos');
		expect(tecla(texto, 'PageDown')).toBe(false); // se frenó el salto nativo
		expect(texto.value).toBe('1');
	});

	it('sin violaciones axe', async () => {
		montar('slider');
		expect(await axe(document.body, { rules: { region: { enabled: false } } })).toHaveNoViolations();
	});
});

describe('Valores de reposo emitidos (SU6: el DS no escribe style en el markup)', () => {
	it('Progress: el artefacto declara data-ts-value y el Core lo pinta en --ts-progress-value (40 %)', () => {
		document.body.innerHTML = cuerpoDe('progress');
		const rellenos = qq('[data-progress-fill]');
		const verde = rellenos.find((f) => f.getAttribute('data-ts-value') === '40')!;
		expect(verde.hasAttribute('style')).toBe(false);

		init(document);

		expect(verde.style.getPropertyValue('--ts-progress-value')).toBe('40%');
		for (const f of rellenos) {
			expect(f.style.width).toBe('');
			const v = f.getAttribute('data-ts-value');
			expect(f.style.getPropertyValue('--ts-progress-value')).toBe(v === null ? '' : `${v}%`);
		}
	});

	it('Progress: si cambia data-ts-value por JS, la variable lo sigue', async () => {
		montar('progress');
		const f = qq('[data-progress-fill]')[0];
		f.setAttribute('data-ts-value', '75');
		await new Promise((r) => setTimeout(r, 0));

		expect(f.style.getPropertyValue('--ts-progress-value')).toBe('75%');
	});

	it('AspectRatio: data-ts-ratio llega a --ts-aspect-ratio', () => {
		montar('aspect-ratio');
		const el = q('.ts.aspect-ratio');
		expect(el.hasAttribute('style')).toBe(true);
		expect(parseFloat(el.style.getPropertyValue('--ts-aspect-ratio'))).toBeCloseTo(16 / 9, 4);
		expect(el.getAttribute('data-ts-ratio')).toBe(el.style.getPropertyValue('--ts-aspect-ratio'));
	});

	it('ScrollArea: data-ts-max-height llega a --ts-scroll-area-max-h', () => {
		montar('scroll-area');
		const el = q('.ts.scroll-area');
		expect(el.style.getPropertyValue('--ts-scroll-area-max-h')).toBe(el.getAttribute('data-ts-max-height'));
		expect(el.style.maxHeight).toBe('');
	});

	it('Slider: el artefacto no trae style y el Core escribe el relleno al iniciar', () => {
		document.body.innerHTML = cuerpoDe('slider');
		expect(qq('[style]')).toHaveLength(qq('[style]').filter((e) => /anchor/.test(e.getAttribute('style')!)).length);
		init(document);
		const simple = qq<HTMLInputElement>('[data-ts-slider]:not([data-ts-slider-range]) input[type="range"]')[0];
		expect(simple.style.getPropertyValue('--ts-slider-fill')).toBe(`${simple.value}%`);
	});

	it('DatePicker: --ts-date-ch se calcula desde data-ts-locale (dd/mm/aaaa = 10)', () => {
		montar('date-picker');
		const campos = qq('.ts.datepicker-field');
		expect(campos.length).toBeGreaterThan(0);
		for (const c of campos) expect(c.style.getPropertyValue('--ts-date-ch')).toBe('10');
	});
});

describe('Combobox emitido: multiple', () => {
	const raiz = () => qq('[data-ts-combobox][data-ts-multiple]')[0];
	const input = () => raiz().querySelector<HTMLInputElement>('[data-ts-listbox-input]')!;
	const opcion = (v: string) => raiz().querySelector<HTMLElement>(`[role="option"][data-ts-value="${v}"]`)!;
	const etiquetas = () => [...raiz().querySelectorAll<HTMLElement>('[data-ts-listbox-tags] > [data-ts-value]')];
	const textos = () => etiquetas().map((e) => e.textContent!.trim());
	const valores = () => [...raiz().querySelectorAll<HTMLInputElement>('[data-ts-listbox-value]')].map((c) => c.value);
	const vivo = () => raiz().querySelector('[data-ts-listbox-live]')!.textContent;
	const escribir = (texto: string) => {
		input().value = texto;
		input().dispatchEvent(new Event('input', { bubbles: true }));
	};

	it('emite las etiquetas, los hidden en orden y la lista multiselección', () => {
		montar('combobox');
		expect(textos()).toEqual(['Ana Torres', 'Carla Ruiz']);
		expect(valores()).toEqual(['ana', 'carla']);
		expect(raiz().querySelector('[role="listbox"]')).toHaveAttribute('aria-multiselectable', 'true');
		expect(opcion('ana').querySelector('[data-select-option-checkbox]')).toHaveClass('is-checked');
	});

	it('elegir suma la etiqueta clonada, no cierra, limpia el texto y anuncia', () => {
		montar('combobox');
		input().focus();
		escribir('die');
		opcion('diego').click();
		expect(textos()).toEqual(['Ana Torres', 'Carla Ruiz', 'Diego Sosa']);
		expect(valores()).toEqual(['ana', 'carla', 'diego']);
		expect(etiquetas()[2].querySelector('[data-tag-close]')).toHaveAttribute('aria-label', 'Quitar Diego Sosa');
		expect(input().value).toBe('');
		expect(input()).toHaveAttribute('aria-expanded', 'true');
		expect(opcion('bruno').hidden).toBe(false);
		expect(vivo()).toBe('Se agregó Diego Sosa.');
	});

	it('la X quita el valor (no oculta la etiqueta sola) y la opción se desmarca', () => {
		montar('combobox');
		etiquetas()[0].querySelector<HTMLElement>('[data-ts-dismiss]')!.click();
		expect(textos()).toEqual(['Carla Ruiz']);
		expect(valores()).toEqual(['carla']);
		expect(opcion('ana')).toHaveAttribute('aria-selected', 'false');
		expect(vivo()).toBe('Se quitó Ana Torres.');
	});

	it('Backspace con el campo vacío quita la última; sobre la X no', () => {
		montar('combobox');
		tecla(etiquetas()[0].querySelector('[data-ts-dismiss]')!, 'Backspace');
		expect(textos()).toEqual(['Ana Torres', 'Carla Ruiz']);
		tecla(input(), 'Backspace');
		expect(textos()).toEqual(['Ana Torres']);
	});

	it('un ts:change cancelado no cambia nada', () => {
		montar('combobox');
		const cancelar = (e: Event) => e.preventDefault();
		document.addEventListener('ts:change', cancelar);
		opcion('bruno').click();
		document.removeEventListener('ts:change', cancelar);
		expect(textos()).toEqual(['Ana Torres', 'Carla Ruiz']);
		expect(opcion('bruno')).toHaveAttribute('aria-selected', 'false');
	});

	it('form.reset() vuelve a la selección inicial', async () => {
		document.body.innerHTML = '<form>' + cuerpoDe('combobox') + '</form>';
		init(document);
		opcion('bruno').click();
		tecla(input(), 'Backspace');
		tecla(input(), 'Backspace');
		expect(textos()).toEqual(['Ana Torres']);
		q<HTMLFormElement>('form').reset();
		await new Promise((r) => setTimeout(r, 0));
		expect(textos()).toEqual(['Ana Torres', 'Carla Ruiz']);
		expect(valores()).toEqual(['ana', 'carla']);
		expect(opcion('bruno')).toHaveAttribute('aria-selected', 'false');
	});

	it('el botón de limpiar vacía todo y anuncia', () => {
		montar('combobox');
		raiz().querySelector<HTMLElement>('[data-ts-clear]')!.click();
		expect(textos()).toEqual([]);
		expect(valores()).toEqual([]);
		expect(vivo()).toBe('Se quitó toda la selección.');
	});
});

describe('Sin JS: el markup emitido muestra todo y init lo oculta al arrancar', () => {
	const sinIniciar = (nombre: string) => {
		document.body.innerHTML = cuerpoDe(nombre);
	};

	it('Tabs: ningún panel lleva hidden hasta que init oculta los inactivos', () => {
		sinIniciar('tabs');
		expect(qq('[data-ts-tabs-panel][hidden]')).toHaveLength(0);
		init(document);
		expect(qq('[data-ts-tabs-panel]').map((p) => p.hidden)).toEqual([false, true, true]);
	});

	it('Accordion: el HTML abre y cierra solo; init sólo garantiza un ítem abierto', () => {
		sinIniciar('accordion');
		const items = qq<HTMLDetailsElement>('details[data-ts-accordion-item]');
		expect(items.map((d) => d.open)).toEqual([true, false]);
		expect(qq('[data-ts-accordion-trigger]').every((t) => !t.hasAttribute('aria-expanded'))).toBe(true);
		items[1].open = true;
		init(document);
		expect(items.map((d) => d.open)).toEqual([true, false]);
	});

	it('Select: trae un <select> nativo y el disparador oculto; init los intercambia y habilita los campos del formulario', async () => {
		sinIniciar('select');
		const nativos = qq('select[data-ts-listbox-native]');
		expect(nativos.length).toBeGreaterThan(0);
		expect(qq<HTMLButtonElement>('[data-ts-listbox-trigger]').every((t) => t.hidden)).toBe(true);
		expect(qq<HTMLInputElement>('input[data-ts-listbox-value]').every((i) => i.disabled)).toBe(true);
		await init(document);
		expect(qq('select[data-ts-listbox-native]')).toHaveLength(0);
		expect(qq<HTMLButtonElement>('[data-ts-listbox-trigger]').some((t) => t.hidden)).toBe(false);
		expect(q<HTMLInputElement>('input[name="proyecto"][data-ts-listbox-value]').disabled).toBe(false);
	});

	it('Menu: el disparador apunta al panel con popovertarget; init lo quita, pasa a manual y oculta', () => {
		sinIniciar('menu');
		const disparador = q('[data-ts-menu-trigger]');
		const panel = q('[data-ts-menu-panel]');
		expect(disparador.getAttribute('popovertarget')).toBe(panel.id);
		expect(panel.hidden).toBe(false);
		expect(qq('[role="menuitem"][tabindex]')).toHaveLength(0);
		init(document);
		expect(disparador.hasAttribute('popovertarget')).toBe(false);
		expect(disparador.getAttribute('aria-expanded')).toBe('false');
		expect(panel.getAttribute('popover')).toBe('manual');
		expect(panel.hidden).toBe(true);
		expect(qq('[role="menuitem"]').every((i) => i.getAttribute('tabindex') === '-1')).toBe(true);
	});

	it('contenido agregado después de init también se prepara', async () => {
		document.body.innerHTML = '';
		init(document);
		document.body.insertAdjacentHTML('beforeend', cuerpoDe('tabs'));
		await new Promise((r) => setTimeout(r, 0));
		expect(qq('[data-ts-tabs-panel]').map((p) => p.hidden)).toEqual([false, true, true]);
	});
});
