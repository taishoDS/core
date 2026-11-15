// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { tokenizar } from '../generate/emit-flat';
import { soloClases } from './solo-clases';

const tokens = (archivo: string, contenido: string) => new Set(tokenizar(soloClases(archivo, contenido)));

describe('soloClases: archivos de paquete', () => {
	it('un .js: sólo los strings, no los comentarios', () => {
		const t = tokens('logic.js', `// un link con aria-disabled\n/* card */ const a = ["ts button", 'gap-base', \`size-\${n}\`];`);
		expect(t.has('button')).toBe(true);
		expect(t.has('gap-base')).toBe(true);
		expect(t.has('link')).toBe(false);
		expect(t.has('card')).toBe(false);
	});

	it('un .svelte: los tipos y los comentarios del script no disparan nada', () => {
		const svelte = `<script lang="ts">
  // un link con aria-disabled
  import type { HTMLButtonAttributes } from 'svelte/elements';
  interface Props extends Pick<HTMLButtonAttributes, 'command' | 'commandfor'> { size?: 'slider' | 'toggle'; }
  let { size = 'md' }: Props = $props();
  const base = 'ts button';
</script>
<!-- un card en un comentario -->
<button class="ts button size-md">x</button>`;
		const t = tokens('Button.svelte', svelte);
		expect(t.has('button')).toBe(true);
		expect(t.has('size-md')).toBe(true);
		for (const falso of ['link', 'command', 'slider', 'toggle', 'card']) expect(t.has(falso), falso).toBe(false);
	});

	it('el markup: class, class: y los strings de las expresiones; el resto de los atributos no', () => {
		const markup = `<div class="ts flex {activo ? "is-open" : ''} gap-{n}" class:is-active={x} aria-label="pagination" data-x={'tag'}>
  <span class={['ts badge', cond && 'is-selected']}>texto con un apóstrofe: don't</span>
  {#if lista.length}<p class="ts text-copy-16">y</p>{/if}
</div>`;
		const t = tokens('X.svelte', markup);
		for (const esperado of ['flex', 'is-open', 'is-active', 'badge', 'is-selected', 'text-copy-16']) expect(t.has(esperado), esperado).toBe(true);
		expect(t.has('pagination')).toBe(false);
	});

	it('un fragmento armado en runtime se conserva para que el escáner lo avise', () => {
		expect(tokens('X.svelte', '<p class="ts grid-cols-{n}">').has('grid-cols-{')).toBe(true);
	});

	it('un archivo que no es .svelte ni .js se lee entero (codicioso: sobra, no falta)', () => {
		expect(soloClases('datos.json', 'link')).toBe('link');
	});
});

describe('soloClases: tabla de casos por framework (atributos que no se llaman class)', () => {
	it.each([
		['svelte: wrapperClass con comillas', 'Card.svelte', '<Card wrapperClass="ts p-4" />'],
		['svelte: wrapperClass con llaves', 'Card.svelte', `<Card wrapperClass={'ts p-4'} />`],
		['vue: body-class', 'Card.vue', '<template><Card body-class="p-4" /></template>'],
		['vue: :body-class con expresión', 'Card.vue', `<template><Card :body-class="open ? 'p-4' : ''" /></template>`],
		['vue: v-bind:class con objeto', 'Card.vue', `<template><div v-bind:class="{ 'p-4': open }"></div></template>`],
		['react: bodyClassName', 'Card.tsx', 'export const A = () => <Card bodyClassName="ts p-4" />;'],
		['react: wrapperClass (solid, qwik)', 'Card.jsx', 'export const A = () => <Card wrapperClass="p-4" />;'],
		['react: bodyClassName con llaves', 'Card.tsx', 'export const A = () => <Card bodyClassName={"p-4"} />;'],
		['astro: bodyClass', 'Card.astro', '---\n---\n<Card bodyClass="p-4" />'],
		['astro: class:list', 'Card.astro', `---\n---\n<div class:list={['ts', { 'p-4': ok }]}></div>`],
		['alpine: x-bind:class', 'a.html', `<div x-data="{ open: false }" x-bind:class="{ 'p-4': open }"></div>`],
		['alpine: :class', 'a.html', `<div :class="open ? 'p-4' : ''"></div>`],
		['html: data-active-class', 'a.html', '<a data-active-class="p-4">x</a>'],
		['html: class sin comillas', 'a.html', '<div class=p-4>x</div>'],
		['html: class sin comillas en una etiqueta que se cierra', 'a.html', '<img class=p-4/>'],
		['html: class sin comillas entre otros atributos', 'a.html', '<div id=x class=p-4 title=y>x</div>'],
		['angular: [class] con string', 'a.component.html', `<div [class]="'p-4'"></div>`],
		['angular: [ngClass] con objeto', 'a.component.html', `<div [ngClass]="{ 'p-4': open }"></div>`],
		['angular: [class.p-4]', 'a.component.html', '<div [class.p-4]="open"></div>'],
		['angular: [attr.class]', 'a.component.html', `<div [attr.class]="'p-4'"></div>`],
	])('%s', (_n, archivo, contenido) => {
		expect(tokens(archivo, contenido).has('p-4')).toBe(true);
	});

	it.each([
		['svelte', 'Card.svelte', '<Card title="p-4" label="p-4 flex" />'],
		['vue', 'Card.vue', '<template><Card :label="\'p-4\'" aria-label="p-4" /></template>'],
		['tsx', 'Card.tsx', 'export const A = () => <Card title="p-4" data-foo="p-4" />;'],
		['astro', 'Card.astro', '---\n---\n<Card title="p-4" />'],
		['html', 'a.html', '<a href=p-4 title="p-4" data-x=p-4>p-4</a>'],
		['angular', 'a.component.html', `<div [title]="'p-4'" [style.width]="'p-4'"></div>`],
	])('no son clases: %s', (_n, archivo, contenido) => {
		expect(tokens(archivo, contenido).has('p-4')).toBe(false);
	});

	it('lo que ya se leía sigue igual: class, className, :class y class:x', () => {
		for (const [archivo, contenido] of [
			['a.html', '<div class="p-4"></div>'],
			['a.html', "<div class='p-4'></div>"],
			['A.tsx', 'export const A = () => <div className="p-4" />;'],
			['A.vue', `<template><div :class="'p-4'"></div></template>`],
			['A.svelte', '<div class:p-4={x}></div>'],
		]) {
			expect(tokens(archivo, contenido).has('p-4'), contenido).toBe(true);
		}
	});

	it('un atributo de clases con llaves de código en un archivo html no rompe el resto del markup', () => {
		const t = tokens('A.svelte', '<Card wrapperClass="ts gap-{n}" id="x" /><p class="flex">a</p>');
		expect(t.has('flex')).toBe(true);
		expect(t.has('gap-{')).toBe(true);
	});
});
