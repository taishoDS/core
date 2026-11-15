// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MODULOS, GANCHOS_GENERICOS, PESADOS, archivoDe, modulosDeArchivo, modulosDeGancho, modulosDeSlugs, conRequeridos, type NombreModulo } from './modulos';
import { contratoCore } from '../../routes/_docs/core-contract';

const CORE = __dirname;
const nombres = Object.keys(MODULOS) as NombreModulo[];
const fuente = (n: string) => fs.readFileSync(path.join(CORE, `${n}.ts`), 'utf8');
const sinComentarios = (ts: string) => ts.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('tabla de módulos del Core', () => {
	it('cada módulo tiene su archivo, y los que hablan con el pegamento exportan su ficha', () => {
		for (const n of nombres) {
			expect(fs.existsSync(path.join(CORE, `${archivoDe(n)}.ts`)), n).toBe(true);
			if (n !== 'invalid') expect(fuente(archivoDe(n)), n).toMatch(/export const ficha = \{/);
		}
	});

	it('el registro y la tabla hablan de los mismos módulos', () => {
		const enRegistro = [...fuente('registro').matchAll(/^ {4}(\w+): typeof \w+\.ficha;/gm)].map((x) => x[1]).sort();
		expect(enRegistro).toEqual(nombres.filter((n) => n !== 'invalid').sort());
	});

	it('lo que cada ficha ofrece al pegamento existe en el módulo', () => {
		for (const n of nombres.filter((x) => x !== 'invalid')) {
			const ficha = /export const ficha = \{([^}]*)\}/.exec(fuente(archivoDe(n)))![1];
			for (const miembro of ficha.split(',').map((x) => x.trim()).filter(Boolean)) {
				expect(fuente(archivoDe(n)), `${n}.${miembro}`).toMatch(new RegExp(`export (?:async )?(?:function|const|let) ${miembro}\\b`));
			}
		}
	});

	it('cada función pública sale del módulo que la tabla dice', () => {
		for (const n of nombres) {
			const funciones = (MODULOS[n] as { funciones?: Record<string, string> }).funciones;
			for (const interno of Object.values(funciones ?? {})) {
				expect(fuente(archivoDe(n)), `${n}.${interno}`).toMatch(new RegExp(`export (?:async )?(?:function|const) ${interno}\\b`));
			}
		}
	});

	it('lo que un módulo requiere existe', () => {
		for (const n of nombres) for (const r of (MODULOS[n] as { requiere?: readonly string[] }).requiere ?? []) expect(nombres, `${n} requiere ${r}`).toContain(r);
	});

	it('todo módulo pesado con gancho tiene raíces, y alguno de sus ganchos las reclama', () => {
		for (const { modulo, raices } of PESADOS) {
			for (const r of raices) expect(modulosDeGancho(r), `${modulo}: ${r}`).toContain(modulo);
		}
		const sinRaices = nombres.filter((n) => MODULOS[n].pesado && 'ganchos' in MODULOS[n] && !('raices' in MODULOS[n]));
		expect(sinRaices).toEqual([]);
	});

	it('todo atributo del contrato del Core tiene un módulo que lo atiende (o es genérico)', () => {
		const huerfanos = new Set<string>();
		for (const { atributos } of Object.values(contratoCore)) {
			for (const a of atributos) if (!GANCHOS_GENERICOS.includes(a) && !modulosDeGancho(a).length) huerfanos.add(a);
		}
		expect([...huerfanos].sort()).toEqual([]);
	});

	it('todo data-ts-* que el JS de un módulo pesado consulta tiene dueño', () => {
		const PROPIOS = new Set(['anchor', 'busy', 'content', 'focused']);
		const sinDueno: string[] = [];
		for (const n of nombres.filter((x) => MODULOS[x].pesado)) {
			const codigo = sinComentarios(fuente(archivoDe(n)));
			for (const [, nombre] of codigo.matchAll(/(?:data-ts-|\$\{P\})([a-z][a-z0-9-]*)/g)) {
				const atributo = `data-ts-${nombre}`;
				if (PROPIOS.has(nombre) || GANCHOS_GENERICOS.includes(atributo) || modulosDeGancho(atributo).length) continue;
				sinDueno.push(`${n}: ${atributo}`);
			}
		}
		expect([...new Set(sinDueno)].sort()).toEqual([]);
	});
});

describe('qué módulos nombra un contenido', () => {
	const de = (texto: string, slugs: string[] = []) => conRequeridos(modulosDeArchivo(texto.match(/[\w@:./-]+/g) ?? [], slugs, texto));

	it('un gancho data-ts-* dispara su módulo, también por una parte suya', () => {
		expect(de('data-ts-tabs data-ts-tabs-tab')).toEqual(['tabs']);
		expect(de('data-ts-date-grid')).toContain('datePicker');
	});

	it('commandfor, o un Modal, un Drawer o un AlertDialog, traen el respaldo de invokers', () => {
		expect(de('<button commandfor="d" command="show-modal">')).toEqual(['invokers']);
		expect(de('', ['modal'])).toEqual(['invokers']);
		expect(de('', ['drawer'])).toEqual(['invokers']);
		expect(de('', ['alert-dialog'])).toEqual(expect.arrayContaining(['invokers', 'alertDialog']));
		expect(de('data-ts-tabs')).not.toContain('invokers');
	});

	it('el DatePicker trae los popovers (lo que requiere)', () => {
		expect(de('data-ts-date-picker')).toEqual(expect.arrayContaining(['datePicker', 'overlays']));
	});

	it('el Select y la paleta traen el listbox', () => {
		expect(de('data-ts-listbox')).toEqual(expect.arrayContaining(['select', 'listbox']));
		expect(de('data-ts-command-palette')).toEqual(expect.arrayContaining(['commandPalette', 'listbox']));
	});

	it('una función se nombra como identificador, no como palabra de una frase', () => {
		expect(de("import { toast } from '@taishods/core';")).toContain('toast');
		expect(de('toast("hola")')).toContain('toast');
		expect(de('markInvalid(campo, "falta")')).toContain('invalid');
		expect(de('markInvalid(campo, "falta")')).toContain('invalid');
		expect(de("import { markInvalid as mi } from '@taishods/core';")).toContain('invalid');
		expect(de("import * as core from '@taishods/core'; core.markInvalid(campo, 'x');")).toContain('invalid');
		expect(de("core['markInvalid'](campo, 'x')")).toContain('invalid');
		expect(de("import { toast as aviso } from '@taishods/core';")).toContain('toast');
		expect(de('Mostrá un toast cuando guarde')).not.toContain('toast');
	});

	it('el safelist de field es la salida para quien llama markInvalid sin que el contenido lo vea', () => {
		expect(modulosDeSlugs(['field'], true)).toContain('invalid');
		expect(modulosDeSlugs(['field'])).not.toContain('invalid');
	});

	it('un atributo que no es data-ts- se busca en el texto', () => {
		expect(de('<div data-progress-fill></div>')).toContain('progress');
	});

	it('los componentes que dispara el compilador entran por su slug', () => {
		expect(de('', ['checkbox'])).toContain('opcion');
	});
});
