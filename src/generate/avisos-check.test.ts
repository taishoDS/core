// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { avisosDeCheck, avisosDeVars, varsDelTema } from './avisos-check';
import { warningLine } from '../generate-cli/mensajes-avisos';
import type { TaishoConfig } from './vocabulary';

const config: TaishoConfig = {
	themes: { principal: { colors: { brand: '#4F46E5' } } },
	fontFaces: [],
	defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' },
};
const estructurados = (file: string, content: string, extra: string[] = []) => avisosDeCheck([{ file, content }], config, extra);
const check = (file: string, content: string, extra: string[] = []) => estructurados(file, content, extra).map((a) => warningLine(a, 'es'));

describe('avisosDeCheck — (C) modo clásico remanente', () => {
	it('un ts-x vigente apunta a su nombre con la llave, con la línea y la variante', () => {
		expect(check('a.svelte', '<p>x</p>\n<div class="ts-flex md:ts-gap-base"></div>')).toEqual([
			'a.svelte:2: "ts-flex" lleva el prefijo viejo `ts-` y ya no pinta. Se escribe "flex" con la clase `ts` en el mismo elemento.',
			'a.svelte:2: "md:ts-gap-base" lleva el prefijo viejo `ts-` y ya no pinta. Se escribe "md:gap-base" con la clase `ts` en el mismo elemento.',
		]);
	});
	it('un nombre viejo apunta al sucesor vigente', () => {
		expect(check('a.css', '.x { @apply ts-ml-base; }')).toEqual([
			'a.css:1: "ts-ml-base" lleva el prefijo viejo `ts-` y es un nombre viejo. Se escribe "ms-base" con la clase `ts` en el mismo elemento.',
		]);
	});
	it('también en un selector o un string de JS', () => {
		expect(check('a.ts', "el.classList.add('ts-flex'); const s = '.ts-grid';").map((a) => a.slice(0, 19))).toEqual(['a.ts:1: "ts-flex" l', 'a.ts:1: "ts-grid" l']);
	});
	it('no avisa por ids, variables, atributos ni nombres que no son del DS', () => {
		expect(check('a.svelte', '<svg><use href="#ts-sun"/></svg><div id="ts-modal-1" data-ts-icon="x" class="ts mi-ts-flex ts-inventada" style="color: var(--ts-color-copy)"></div>')).toEqual([]);
	});
});

describe('avisosDeCheck — (A)/(B) las del generate', () => {
	it('clase inexistente con sugerencia y llave que falta', () => {
		expect(check('a.html', '<div class="ts gird-cols-3"></div>\n<div class="flex gap-base"></div>')).toEqual([
			'a.html:1: "gird-cols-3" no existe en el DS y no se emite. ¿Se quiso decir "grid-cols-3"?',
			'a.html:2: <div> usa clases del DS ("gap-base") pero no lleva la clase `ts`, y sin ella no recibe estilo.',
		]);
	});
	it('un componente no pide la llave', () => {
		expect(check('a.svelte', '<Card class="flex gap-base" />')).toEqual([]);
	});
});

describe('avisosDeVars — (D) variables inexistentes', () => {
	it('una variable del tema o del sistema no avisa; una inexistente sí, con sugerencia', () => {
		const css = 'a { color: var(--ts-color-copy); background: var(--color-brand-500); gap: var(--ts-gap-base); }\nb { color: var(--color-brnd-500); }';
		expect(check('a.css', css)).toEqual(['a.css:2: "var(--color-brnd-500)" no existe en el tema. ¿Se quiso decir "--color-brand-500"?']);
	});
	it('una variable con respaldo, o que el propio archivo declara o escribe, no avisa', () => {
		expect(check('a.css', ':root { --ts-mi-ancho: 3px; } a { width: var(--ts-mi-ancho); margin: var(--ts-nada, 0); }')).toEqual([]);
		expect(check('a.ts', "el.style.setProperty('--ts-columnas', '3'); const v = 'var(--ts-columnas)';")).toEqual([]);
	});
	it('un fragmento armado en runtime no avisa', () => {
		expect(check('a.ts', 'const v = `var(--ts-gap-${n})`;')).toEqual([]);
	});
	it('las variables extra (un tema importado) cuentan como válidas', () => {
		expect(check('a.css', 'a { color: var(--color-marca-500); }')).toHaveLength(1);
		expect(check('a.css', 'a { color: var(--color-marca-500); }', ['--color-marca-500'])).toEqual([]);
	});
	it('varsDelTema trae las del tema de la config y las del CSS de sistema', () => {
		const vars = varsDelTema(config);
		expect(vars.has('--color-brand-500')).toBe(true);
		expect(vars.has('--ts-gap-base')).toBe(true);
		expect(avisosDeVars([{ file: 'a.css', content: 'a{b:var(--ts-gap-base)}' }], vars)).toEqual([]);
	});
});

describe('avisosDeCheck — orden', () => {
	it('por archivo y línea, no por regla', () => {
		const r = avisosDeCheck(
			[
				{ file: 'b.css', content: 'a{color:var(--color-nada-500)}' },
				{ file: 'a.css', content: '.x{}\n.y{@apply ts-flex}\n\na{color:var(--color-nada-500)}' },
			],
			config,
		);
		expect(r.map((a) => `${a.file}:${a.line}`)).toEqual(['a.css:2', 'a.css:4', 'b.css:1']);
	});
});

describe('avisosDeCheck — el aviso estructurado', () => {
	it('lleva archivo, línea, columna (desde 1), regla, severidad, código, parámetros y sugerencia', () => {
		expect(estructurados('a.html', '<p>x</p>\n  <div class="ts gap-bse"></div>')).toEqual([
			{ file: 'a.html', line: 2, column: 18, rule: 'unknown-class', severity: 'error', code: 'unknown-class', params: { class: 'gap-bse', suggestion: 'gap-base' }, suggestion: 'gap-base' },
		]);
	});
	it('una regla por tipo: unknown-class, missing-ts, legacy-prefix y unknown-var', () => {
		const reglas = estructurados('a.svelte', '<div class="flex gap-base"></div>\n<div class="ts-flex"></div>\n<div class="ts gird-cols-3"></div>\n<style>a { color: var(--color-nada-500); }</style>').map((a) => a.rule);
		expect(reglas).toEqual(['missing-ts', 'legacy-prefix', 'unknown-class', 'unknown-var']);
	});
	it('dos clases malas en la misma línea son dos avisos, con columnas distintas', () => {
		const r = estructurados('a.html', '<div class="ts gap-bse gird-cols-3"></div>');
		expect(r.map((a) => [a.rule, a.column])).toEqual([['unknown-class', 16], ['unknown-class', 24]]);
		const dos = estructurados('a.html', '<div class="ts gap-bse"></div> <div class="ts gap-bse"></div>');
		expect(dos).toHaveLength(2);
	});
	it('la clase en una línea siguiente del mismo atributo señala su propia línea', () => {
		const [a] = estructurados('a.html', '<div class="ts\n  gap-bse"></div>');
		expect([a.line, a.column]).toEqual([2, 3]);
	});
	it('todas las reglas salen hoy con severity error', () => {
		expect(new Set(estructurados('a.css', '.x{@apply ts-flex} a{color:var(--color-nada-500)}').map((a) => a.severity))).toEqual(new Set(['error']));
	});
});
