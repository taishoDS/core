// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compile } from '../generate';
import { buildRepoConfig } from '../config/pipeline';
import manifestoComponentes from '../lib/css/manifiesto-componentes.json';
import { clasesDeContenido } from './solo-clases';

const config = buildRepoConfig();

function slugsPresentes(css: string): string[] {
	const clases = new Set([...css.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)].map((m) => m[1].replaceAll('\\', '')));
	return Object.entries(manifestoComponentes.componentes)
		.filter(([, c]) => c.bloques.some((b) => clases.has(b)))
		.map(([slug]) => slug)
		.sort();
}

const slugsDe = (file: string, content: string) =>
	slugsPresentes(compile(config, [{ file, content: clasesDeContenido(file, content) }], { onDemand: true }).css);

describe('el content del consumidor: lo que NO trae bloques', () => {
	it.each([
		['<button>', '<button>x</button>'],
		['<input>', '<input type="text">'],
		['<input type="button">', '<input type="button" value="ok">'],
		['<table>', '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'],
		['<select>', '<select><option>a</option></select>'],
		['prosa', '<p>un link y un menu</p>'],
		['comentario HTML', '<!-- class="ts button" --><div></div>'],
		['style', '<style>.button { color: red } .card {}</style><div></div>'],
	])('html: %s', (_n, html) => {
		expect(slugsDe('a.html', html)).toEqual([]);
	});

	it('un .ts: comentarios, tipos e imports no son clases', () => {
		const ts = `import { Button } from './button';\n// un link y un menu\ntype T = { card: string };\nconst x: T = { card: y };`;
		expect(slugsDe('a.ts', ts)).toEqual([]);
	});

	it('un .tsx: etiquetas, atributos que no son class y prosa tampoco', () => {
		const tsx = `export const A = () => <div><button type="button">un link y un menu</button><input type="text" /></div>;`;
		expect(slugsDe('A.tsx', tsx)).toEqual([]);
	});

	it('un .svelte: etiquetas y prosa', () => {
		expect(slugsDe('A.svelte', '<script>let a = 1; // un card</script>\n<button>un link</button><table></table>')).toEqual([]);
	});
});

describe('el content del consumidor: lo que SÍ trae bloques', () => {
	it('class="ts button" en html', () => {
		expect(slugsDe('a.html', '<button class="ts button">x</button>')).toContain('button');
	});

	it('className="ts button" en tsx', () => {
		expect(slugsDe('A.tsx', 'export const A = () => <button className="ts button">x</button>;')).toContain('button');
	});

	it('class:button y class="…" en svelte, y :class de vue', () => {
		expect(slugsDe('A.svelte', '<div class:button={x}></div>')).toContain('button');
		expect(slugsDe('A.vue', `<template><div :class="{ 'card': ok }"></div></template>`)).toContain('card');
		expect(slugsDe('A.astro', `---\nconst c = 'badge';\n---\n<div class="ts tag"></div>`)).toEqual(expect.arrayContaining(['badge', 'tag']));
	});

	it('el gancho data-ts-accordion dispara el componente entero', () => {
		expect(slugsDe('a.html', '<div data-ts-accordion></div>')).toContain('accordion');
	});

	it("un string 'ts flex' / 'button' en un .ts", () => {
		expect(slugsDe('a.ts', `const base = 'ts button';`)).toContain('button');
	});

	it('una plantilla armada en runtime sigue avisando', () => {
		const file = 'a.js';
		const content = 'const c = `ts grid-cols-${n}`;';
		const { warnings } = compile(config, [{ file, content: clasesDeContenido(file, content) }], { onDemand: true });
		expect(warnings).toEqual([{ code: 'runtime-class', params: { fragment: 'grid-cols-' }, file }]);
	});

	it('un formato desconocido se lee entero', () => {
		expect(clasesDeContenido('datos.txt', 'link')).toBe('link');
	});
});

describe('el CSS dentro de un string o un .css no es uso', () => {
	const avisos = (file: string, content: string) => compile(config, [{ file, content: clasesDeContenido(file, content) }], { onDemand: true }).warnings;

	it.each([
		['<style> en un string', 'a.js', `const s = '<style>body{display:grid;margin:0}</style>';`],
		['template literal con regla y media query', 'a.ts', 'const s = `.card{display:grid;gap:4px}@media (min-width:600px){.x{display:flex}}`;'],
		['style en línea dentro de un string', 'a.js', `el.innerHTML = '<div style="display:grid;margin:0">x</div>';`],
		['un .css propio', 'app.css', 'body { display: grid; margin: 0; }\n.a:hover { color: red; }'],
	])('%s: sin avisos ni bloques', (_n, file, contenido) => {
		expect(avisos(file, contenido)).toEqual([]);
		expect(slugsDe(file, contenido)).toEqual([]);
	});

	it('una clase armada con `${…}` en un template sigue leyéndose', () => {
		const leido = clasesDeContenido('a.js', 'const c = `ts grid-cols-${n} flex`;');
		expect(leido).toContain('flex');
		expect(leido).toContain('grid-cols-${n}');
	});
});
