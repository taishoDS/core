// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { clasesDefinidas, faltantes } from './faltantes';

const CLASICO = String.raw`.ts-flex { display: flex; }
.md\:ts-hidden { display: none; }
.\32 xl\:ts-flex { display: flex; }
.\@md\:ts-grid-cols-2 { grid-template-columns: 1fr 1fr; }
.ts-w-1\/2 { width: 50%; }
.ts-p-0\.5 { padding: 2px; }
.ts-button { padding: 1.5rem; &.size-md { height: 0.5rem; } }`;

const SCOPE = String.raw`:where(.ts).flex { display: flex; }
:where(.ts).md\:hidden { display: none; }
:where(.ts).w-1\/2 { width: 50%; }
:where(.ts).button { &.size-md { height: 1px; } }`;

describe('clasesDefinidas', () => {
	it('quita los escapes del selector y conserva la variante', () => {
		const d = clasesDefinidas(CLASICO);
		for (const c of ['ts-flex', 'md:ts-hidden', '2xl:ts-flex', '@md:ts-grid-cols-2', 'ts-w-1/2', 'ts-p-0.5', 'ts-button', 'size-md']) {
			expect(d.has(c), c).toBe(true);
		}
	});

	it('un decimal dentro de una declaración no es una clase', () => {
		expect(clasesDefinidas(CLASICO).has('5rem')).toBe(false);
		expect(clasesDefinidas(CLASICO).has('5')).toBe(false);
	});
});

describe('faltantes', () => {
	it('clásico: sólo mira las ts-*, con su variante entera, una entrada por aparición', () => {
		const html = '<div class="ts-flex ts-inventada md:ts-hidden dark:ts-hidden foo size-xx"><p class="ts-inventada ts-w-1/2"></p></div>';
		expect(faltantes(html, CLASICO)).toEqual(['ts-inventada', 'dark:ts-hidden', 'ts-inventada']);
	});

	it('clásico: un class con { se compone en runtime y se saltea', () => {
		expect(faltantes('<div class="ts-nada-{x}"></div>', CLASICO)).toEqual([]);
	});

	it('acepta un conjunto ya armado en lugar del texto del CSS', () => {
		expect(faltantes('<i class="ts-a ts-b"></i>', new Set(['ts-a']))).toEqual(['ts-b']);
	});

	it('scope: sólo los elementos con la llave ts; sin vocabulario cuenta toda clase', () => {
		const html = '<div class="ts flex nada md:hidden"></div><div class="flex nada"></div>';
		expect(faltantes(html, SCOPE, { scope: true })).toEqual(['nada']);
	});

	it('scope con vocabulario: los modificadores y lo ajeno no cuentan, una clase del DS sin regla sí', () => {
		const html = '<div class="ts button variant-default grid md:grid mio"></div>';
		const vocabulario = new Set(['button', 'grid', 'flex']);
		expect(faltantes(html, SCOPE, { scope: true, vocabulario })).toEqual(['grid', 'md:grid']);
	});
});
