// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearHerramientas, type OpcionesHerramientas } from './herramientas';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DATOS = { ejemplos: path.join(RAIZ, 'src/routes/_docs/core-ejemplos'), prosa: path.join(RAIZ, 'src/routes/_docs/generado/core-prosa') };

let dir: string;
const config = (brand: string, extra = '') => `export default { themes: { acme: { colors: { brand: '${brand}' } } }, fontFaces: []${extra} };\n`;

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-mcp-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const herramientas = (opciones: Partial<OpcionesHerramientas> = {}) => {
	const lista = crearHerramientas({ cwd: dir, lang: 'en', datos: DATOS, ...opciones });
	return (nombre: string, args: Record<string, unknown> = {}) => lista.find((h) => h.name === nombre)!.handler(args) as Promise<string>;
};

describe('herramientas del MCP', () => {
	it('son las seis, con descripción y esquema', () => {
		const lista = crearHerramientas({ cwd: dir, datos: DATOS });
		expect(lista.map((h) => h.name)).toEqual(['list_components', 'get_component', 'search_utilities', 'validate_markup', 'translate_tailwind', 'get_theme']);
		for (const h of lista) {
			expect(h.description.length).toBeGreaterThan(80);
			expect(h.inputSchema.type).toBe('object');
		}
	});

	it('list_components lista los componentes del Core con bloques, JS y resumen', async () => {
		const { count, components: lista } = JSON.parse(await herramientas()('list_components'));
		expect(count).toBe(lista.length);
		const boton = lista.find((c: { slug: string }) => c.slug === 'button');
		expect(boton).toMatchObject({ slug: 'button', name: 'Button', blocks: ['button', 'button-group'], needsJs: false });
		expect(boton.summary).toMatch(/^Triggers an action\./);
		expect(lista.find((c: { slug: string }) => c.slug === 'modal').needsJs).toBe(false);
		expect(lista.length).toBeGreaterThan(40);
		expect(lista.map((c: { slug: string }) => c.slug)).not.toContain('provider');
	});

	it('get_component da la ficha con prosa y ejemplos, y en español si se pide', async () => {
		const ficha = await herramientas()('get_component', { slug: 'button' });
		expect(ficha).toMatch(/^# Button\n/);
		expect(ficha).toContain('## When to use it');
		expect(ficha).toContain('```html');
		expect(await herramientas({ lang: 'es' })('get_component', { slug: 'button' })).toContain('## Cuándo usarlo');
	});

	it('get_component rechaza un slug que no existe y nombra los que hay', async () => {
		await expect(herramientas()('get_component', { slug: 'nada' })).rejects.toThrow(/Unknown component "nada"\. Available: .*button/);
		await expect(herramientas()('get_component', { slug: '../x' })).rejects.toThrow(/Unknown component/);
	});

	it('search_utilities busca por nombre y por CSS, con límite', async () => {
		const buscar = herramientas();
		const porNombre = JSON.parse(await buscar('search_utilities', { query: 'gap-base' })).results;
		expect(porNombre[0]).toEqual({ class: 'gap-base', css: 'gap: var(--ts-gap-base);' });
		const cortado = JSON.parse(await buscar('search_utilities', { query: 'column-gap', limit: 5 }));
		const porCss = cortado.results;
		expect(porCss).toHaveLength(5);
		expect(cortado.returned).toBe(5);
		expect(cortado.total).toBeGreaterThan(5);
		expect(porCss.every((f: { css: string }) => f.css.includes('column-gap'))).toBe(true);
		expect(JSON.parse(await buscar('search_utilities', { query: 'zzz-no-existe' }))).toEqual({ total: 0, returned: 0, results: [] });
		await expect(buscar('search_utilities', { query: '  ' })).rejects.toThrow('"query" is empty');
	});

	it('search_utilities incluye las utilidades propias del proyecto', async () => {
		fs.writeFileSync(path.join(dir, 'taisho.config.ts'), config('#336699', ", utilities: { 'tarjeta-mia': ['p-base', 'gap-half'] }"));
		const hallados = JSON.parse(await herramientas()('search_utilities', { query: 'tarjeta-mia' }));
		expect(hallados).toEqual({ total: 1, returned: 1, results: [{ class: 'tarjeta-mia', composes: ['p-base', 'gap-half'] }] });
	});

	it('search_utilities encuentra las utilidades con su nombre vigente (márgenes negativos y lados lógicos)', async () => {
		const buscar = herramientas();
		const neg = JSON.parse(await buscar('search_utilities', { query: 'mx-neg-base' })).results;
		expect(neg[0]).toMatchObject({ class: 'mx-neg-base' });
		expect(neg[0].css).toContain('margin-inline');
		const logico = JSON.parse(await buscar('search_utilities', { query: 'ms-16' })).results;
		expect(logico.map((f: { class: string }) => f.class)).toContain('ms-16');
		const todos = JSON.parse(await buscar('search_utilities', { query: 'neg', limit: 200 }));
		expect(todos.results.length).toBeGreaterThan(100);
	});

	it('validate_markup avisa la falta de `ts` y da valid:true con el marcado correcto', async () => {
		const validar = herramientas();
		const mal = JSON.parse(await validar('validate_markup', { markup: '<div class="flex p-4">x</div>' }));
		expect(mal).toMatchObject({ version: 1, files: 1, valid: false });
		expect(mal.warnings[0]).toMatchObject({ file: 'snippet.html', rule: 'missing-ts', severity: 'error', params: { element: 'div', classes: ['p-4'] } });
		expect(mal.warnings[0].message).toContain('`ts`');
		const bien = JSON.parse(await validar('validate_markup', { markup: '<div class="ts flex gap-base">x</div>', filename: 'a.svelte' }));
		expect(bien).toMatchObject({ valid: true, warnings: [] });
		const otraEscala = JSON.parse(await validar('validate_markup', { markup: '<div class="ts p-16">x</div>' }));
		expect(otraEscala.warnings.map((w: { rule: string }) => w.rule)).toEqual(['other-scale']);
		expect(otraEscala.valid).toBe(true);
	});

	it('validate_markup usa los colores de la config del proyecto', async () => {
		fs.writeFileSync(path.join(dir, 'taisho.config.ts'), config('#336699'));
		const r = JSON.parse(await herramientas()('validate_markup', { markup: '<p class="ts bg-brand-500">x</p>' }));
		expect(r.valid).toBe(true);
	});

	it('translate_tailwind convierte lo que tiene equivalente y lista lo que no', async () => {
		const r = JSON.parse(await herramientas()('translate_tailwind', { markup: '<div class="flex p-4 bg-blue-500">x</div>' }));
		expect(r.output).toBe('<div class="ts flex p-16 bg-blue-500">x</div>');
		expect(r.converted).toEqual([
			{ line: 1, from: 'flex', to: 'flex', exact: true },
			{ line: 1, from: 'p-4', to: 'p-16', exact: true },
		]);
		expect(r.notConverted).toEqual([expect.objectContaining({ line: 1, token: 'bg-blue-500', reason: expect.stringContaining('`blue`') })]);
	});

	it('get_theme dice que usa el tema de fábrica cuando no hay config', async () => {
		const tema = JSON.parse(await herramientas()('get_theme'));
		expect(tema.configFile).toBeNull();
		expect(tema.note).toContain('factory theme');
		expect(tema).toMatchObject({ language: 'en', themes: ['taisho'], darkMode: 'class', rhythm: ['none', 'quarter', 'half', 'base', 'section', 'double'] });
		expect(tema.colors.gray).toBe('neutral');
		expect(tema.shades).toHaveLength(10);
		expect(tema.cssVars).toContain('--color-brand-500');
		const es = JSON.parse(await herramientas({ lang: 'es' })('get_theme'));
		expect(es.note).toContain('tema de fábrica');
	});

	it('get_theme lee la config del proyecto y la recarga cuando cambia su mtime', async () => {
		const archivo = path.join(dir, 'taisho.config.ts');
		fs.writeFileSync(archivo, config('#336699'));
		const tema = herramientas();
		const antes = JSON.parse(await tema('get_theme'));
		expect(antes).toMatchObject({ configFile: 'taisho.config.ts', themes: ['acme'] });
		expect(antes.note).toBeUndefined();
		expect(antes.colors.brand).toBe('#336699');
		fs.writeFileSync(archivo, config('#aa2200'));
		const ahora = new Date(Date.now() + 5000);
		fs.utimesSync(archivo, ahora, ahora);
		expect(JSON.parse(await tema('get_theme')).colors.brand).toBe('#aa2200');
	});

	it('--config apunta a otra config, y si no existe la herramienta falla con el motivo', async () => {
		fs.mkdirSync(path.join(dir, 'ajeno'));
		fs.writeFileSync(path.join(dir, 'ajeno/mi.config.ts'), config('#112233'));
		expect(JSON.parse(await herramientas({ configPath: 'ajeno/mi.config.ts' })('get_theme')).configFile).toBe(path.join('ajeno', 'mi.config.ts'));
		await expect(herramientas({ configPath: 'no-esta.ts' })('get_theme')).rejects.toThrow(/no-esta\.ts/);
	});
});
