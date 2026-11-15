// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { compile, analizarArchivo, derivarVocabulario, unirAnalisis } from './compile';
import { faltantes } from './faltantes';
import { aScope, nombresCortosDe } from './llave-scope';
import { pruneTheme, CORE_JS_THEME_VARS } from './podar-tema';
import { clasesDeContenido } from '../generate-cli/solo-clases';
import { tokenizar } from './emit-flat';
import { deriveThemeVocabulary, resolveThemeTokens, buildTokensCSS } from '.';
import { buildRepoConfig } from '../config/pipeline';
import { init, toast, clearToasts } from '../lib/core/index';
import { iniciar } from '../lib/core/nucleo';
import { m } from '../lib/core/registro';
import { MODULOS, conRequeridos, modulosDeArchivo, modulosDeSlugs, archivoDe, type NombreModulo } from '../lib/core/modulos';

const CATALOGOS = path.resolve(__dirname, '../routes/_docs/core-html');
const slugs = fs.readdirSync(CATALOGOS).filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', '')).sort();

const configScope = buildRepoConfig();
const vocabulario = nombresCortosDe(compile(configScope, []).css);

const qq = <T extends HTMLElement = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];
const alternar = (panel: HTMLElement, tipo: 'beforetoggle' | 'toggle', nuevo: 'open' | 'closed') => {
	const e = new Event(tipo);
	Object.defineProperty(e, 'newState', { value: nuevo });
	panel.dispatchEvent(e);
};

const DISPARADORES = [
	'[data-ts-listbox-trigger]',
	'[data-ts-listbox-toggle]',
	'[data-ts-menu-trigger]',
	'[data-ts-command-open]',
	'[data-ts-sidebar-trigger]',
	'[data-ts-sidebar-toggle]',
	'[data-ts-sidebar-group-toggle]',
	'[data-ts-accordion-trigger]',
	'[data-ts-toggle]',
	'[popovertarget]',
	'[commandfor]',
].join(', ');

const CLICKS_EXTRA = ['[data-ts-number] button', '[data-ts-toast-trigger]', '[data-ts-tabs-tab]', '[data-ts-segmented-option]', '[data-ts-page-item]', '[data-ts-page-next]', '[data-ts-page-prev]', '[data-ts-copy]', '[data-ts-dismiss]', '[data-ts-clear]', '[data-ts-th]'].join(', ');

beforeAll(() => {
	HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.open = true; };
	HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.open = false; };
	HTMLElement.prototype.showPopover = function () {};
	HTMLElement.prototype.hidePopover = function () {};
});

beforeEach(() => {
	document.body.innerHTML = '';
	clearToasts();
	document.querySelector('[data-ts-toast-container]')?.remove();
});

function recorrer(html: string, css: string, scope: boolean): string[] {
	const vistas = new Set<string>();
	const mirar = () => {
		for (const c of faltantes(document.body.outerHTML, css, { scope, vocabulario })) vistas.add(c);
		for (const c of faltantes(document.body.outerHTML, '')) vistas.add(c);
	};

	abrirTodo(html, () => init(document), mirar);
	return [...vistas];
}

function abrirTodo(html: string, arrancar: () => void, mirar: () => void, conClicks = false): void {
	document.body.innerHTML = html;
	arrancar();
	mirar();

	for (const panel of qq('[popover]')) {
		alternar(panel, 'beforetoggle', 'open');
		alternar(panel, 'toggle', 'open');
		mirar();
	}
	for (const disparador of qq(DISPARADORES)) {
		const destino = disparador.getAttribute('commandfor');
		if (destino && disparador.getAttribute('command') === 'show-modal') {
			(document.getElementById(destino) as HTMLDialogElement | null)?.showModal();
		}
		disparador.click();
		mirar();
	}
	for (const campo of qq('[data-ts-listbox-input], [data-ts-listbox-trigger]')) {
		campo.focus();
		campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
		mirar();
	}
	for (const raiz of qq('[data-ts-tooltip-root]')) {
		raiz.querySelector<HTMLElement>('button, a, [tabindex]')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		mirar();
	}
	for (const raiz of qq('[data-ts-context-menu]')) {
		raiz.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 20 }));
		mirar();
	}
	if (conClicks) {
		for (const el of qq(CLICKS_EXTRA)) {
			if (el.closest('[data-ts-date-picker]') && el.closest('[data-ts-number]')) continue;
			el.click();
			mirar();
		}
	}
	if (conClicks) {
		for (const boton of qq('.button')) {
			const llego = () => boton.setAttribute('data-clic-llego', '');
			boton.addEventListener('click', llego);
			boton.setAttribute('aria-disabled', 'true');
			boton.click();
			mirar();
			boton.removeEventListener('click', llego);
			boton.removeAttribute('aria-disabled');
			boton.removeAttribute('data-clic-llego');
		}
		for (const img of qq('[data-ts-avatar] img')) {
			img.dispatchEvent(new Event('error'));
			mirar();
		}
		for (const opcion of qq('[role="option"]')) {
			opcion.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
			mirar();
		}
		for (const tarjeta of qq('[data-ts-spotlight]')) {
			tarjeta.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 5, clientY: 5 }));
			mirar();
		}
		for (const zona of qq('[data-ts-file-upload]')) {
			zona.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
			mirar();
		}
		for (const dialogo of qq('[data-ts-confirm-text]')) {
			const campo = dialogo.querySelector<HTMLInputElement>('[data-ts-confirm-input]');
			if (!campo) continue;
			campo.value = dialogo.getAttribute('data-ts-confirm-text') ?? '';
			campo.dispatchEvent(new Event('input', { bubbles: true }));
			mirar();
		}
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		for (const campo of qq<HTMLInputElement>('input[data-ts-debounce], textarea[data-ts-debounce]')) {
			campo.value = 'x';
			campo.dispatchEvent(new Event('input', { bubbles: true }));
			vi.advanceTimersByTime(1000);
			mirar();
		}
		vi.useRealTimers();
		for (const casilla of qq<HTMLInputElement>('input[type="checkbox"], input[type="radio"]')) {
			casilla.click();
			mirar();
		}
	}
	if (html.includes('toast')) {
		for (const variant of ['default', 'success', 'warning', 'danger', 'info'] as const) {
			toast('Mensaje', { variant, description: 'Detalle', action: { label: 'Deshacer', onclick() {} }, duration: 0 });
		}
		toast('Cargando', { loading: true, duration: 0 });
		mirar();
	}
}


describe('Cobertura a demanda: el DOM que arma el JS del Core no deja clases sin regla', () => {
	it('hay 56 catálogos', () => {
		expect(slugs).toHaveLength(56);
	});

	describe.each([['scope', true]] as const)('modo %s', (_nombre, scope) => {
		it.each(slugs)('%s: 0 faltantes', (slug) => {
			const original = fs.readFileSync(path.join(CATALOGOS, `${slug}.html`), 'utf8');
			const html = aScope(original);
			const { css } = compile(configScope, [{ file: `${slug}.html`, content: clasesDeContenido(`${slug}.html`, html) }], { onDemand: true });
			expect(recorrer(html, css, scope)).toEqual([]);
		}, 60_000);
	});

	describe('Core a medida contra el completo', () => {
		const modulosDelCore = import.meta.glob<{ ficha?: object }>(['../lib/core/*.ts', '!../lib/core/*.test.ts', '!../lib/core/base.ts', '!../lib/core/auto.ts'], { eager: true });
		const fichaDe = (n: NombreModulo) => modulosDelCore[`../lib/core/${archivoDe(n)}.ts`].ficha;
		const vocab = derivarVocabulario(configScope, deriveThemeVocabulary(configScope));

		function seleccion(file: string, html: string): NombreModulo[] {
			const tokens = tokenizar(clasesDeContenido(file, html));
			const enteros = unirAnalisis(vocab, configScope, [analizarArchivo(vocab, file, tokens, true)], true).enteros;
			return conRequeridos([...modulosDeSlugs(enteros), ...modulosDeArchivo(tokens, [...enteros], html)]);
		}

		const normalizar = (html: string) =>
			html.replace(/(\b(?:id|for|aria-\w+|list|popovertarget|commandfor|data-ts-toast-id|data-ts-sidebar-id)=")([^"]*)"/g, (_t, a: string, v: string) => `${a}${v.replace(/\d+/g, '#')}"`);

		const pasos = (html: string, arrancar: () => void): string[] => {
			const vistos: string[] = [];
			const avisos: string[] = [];
			const oir = (e: Event) => avisos.push(JSON.stringify((e as CustomEvent).detail, (_k, v) => (v instanceof Node ? v.nodeName : v)));
			document.addEventListener('ts:change', oir);
			document.addEventListener('ts:debouncedinput', oir);
			try {
				abrirTodo(html, arrancar, () => vistos.push(normalizar(document.body.outerHTML)), true);
			} finally {
				document.removeEventListener('ts:change', oir);
				document.removeEventListener('ts:debouncedinput', oir);
			}
			return [...vistos, ...avisos];
		};

		const htmlDe = (slug: string) => aScope(fs.readFileSync(path.join(CATALOGOS, `${slug}.html`), 'utf8'));
		const limpiar = () => {
			clearToasts();
			document.querySelector('[data-ts-toast-container]')?.remove();
			localStorage.clear();
		};
		function medidaCon(slug: string, elegidos: NombreModulo[]) {
			limpiar();
			for (const k of Object.keys(m)) delete m[k as keyof typeof m];
			for (const n of elegidos) if (n !== 'invalid') Object.assign(m, { [n]: fichaDe(n) });
			return pasos(htmlDe(slug), () => iniciar(document));
		}
		function comparar(slug: string, sin?: NombreModulo) {
			const html = htmlDe(slug);
			const completo = pasos(html, () => init(document));
			return { completo, medida: medidaCon(slug, seleccion(`${slug}.html`, html).filter((n) => n !== sin)) };
		}

		it.each(slugs)('%s: el DOM, paso a paso, es el mismo', (slug) => {
			const { completo, medida } = comparar(slug);
			expect(medida).toEqual(completo);
		}, 60_000);

		it.each([
			['date-picker', 'datePicker'],
			['select', 'select'],
			['tabs', 'tabs'],
			['pagination', 'pagination'],
		] as const)('control: %s sin su módulo (%s) da otro DOM', (slug, modulo) => {
			const { completo, medida } = comparar(slug, modulo);
			expect(medida).not.toEqual(completo);
		}, 60_000);

		const SIN_DOM: Partial<Record<NombreModulo, string>> = {
			invalid: 'es sólo una función que la app llama; no atiende ningún gesto ni deja ficha en el pegamento',
		};

		it('quitar cualquier módulo de la selección cambia el recorrido de algún catálogo', () => {
			const notado = new Set<NombreModulo>();
			for (const slug of slugs) {
				const html = htmlDe(slug);
				const completo = pasos(html, () => init(document));
				const elegidos = seleccion(`${slug}.html`, html);
				for (const sin of elegidos) {
					if (notado.has(sin) || sin in SIN_DOM) continue;
					if (JSON.stringify(medidaCon(slug, elegidos.filter((n) => n !== sin))) !== JSON.stringify(completo)) notado.add(sin);
				}
			}
			const mudos = (Object.keys(MODULOS) as NombreModulo[]).filter((n) => !notado.has(n) && !(n in SIN_DOM));
			expect(mudos).toEqual([]);
		}, 600_000);

		it('todo módulo de la tabla lo elige la selección de algún catálogo', () => {
			const elegidos = new Set<NombreModulo>();
			for (const slug of slugs) for (const n of seleccion(`${slug}.html`, htmlDe(slug))) elegidos.add(n);
			for (const n of modulosDeArchivo([], [], 'markInvalid(campo, "x")')) elegidos.add(n);
			expect((Object.keys(MODULOS) as NombreModulo[]).filter((n) => !elegidos.has(n))).toEqual([]);
		});

		it('un catálogo sin JS (button) no necesita ningún módulo pesado', () => {
			const html = aScope(fs.readFileSync(path.join(CATALOGOS, 'button.html'), 'utf8'));
			expect(seleccion('button.html', html).filter((n) => MODULOS[n].pesado)).toEqual([]);
		});
	});

	describe.each([['scope', true]] as const)('tema podado, modo %s', () => {
		const cfg = configScope;
		const v = deriveThemeVocabulary(cfg);
		const completo = buildTokensCSS(resolveThemeTokens(v.themeEntries[0], v.userFonts, v.defaultStates, v.userScales));
		const declaraciones = (css: string) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
		const declaradasTema = declaraciones(completo);

		it.each(slugs)('%s: toda var() del tema tiene declaración', (slug) => {
			const original = fs.readFileSync(path.join(CATALOGOS, `${slug}.html`), 'utf8');
			const { css } = compile(cfg, [{ file: `${slug}.html`, content: clasesDeContenido(`${slug}.html`, aScope(original)) }], { onDemand: true });
			const enPodado = declaraciones(pruneTheme(completo, css, CORE_JS_THEME_VARS));
			const sinDeclaracion = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]).filter((n) => declaradasTema.has(n) && !enPodado.has(n));
			expect([...new Set(sinDeclaracion)]).toEqual([]);
		});
	});

	it.each([
		['date-picker', 'calendar-day'],
		['toast', 'toast'],
	])('%s: con el CSS base, el DOM del JS trae %s sin regla', (slug, clase) => {
		const html = fs.readFileSync(path.join(CATALOGOS, `${slug}.html`), 'utf8');
		const { css } = compile(configScope, [], { onDemand: true });
		expect(recorrer(html, css, true)).toContain(clase);
	}, 60_000);
});
