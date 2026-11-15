// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { detectarTailwind, runMigrateTailwind } from './migrate-tailwind';

process.env.LC_ALL = 'es_AR.UTF-8';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROYECTO = path.join(RAIZ, 'tests/fixture-tailwind/proyecto');
let dir: string;
let salida: string[];

const escribir = (rel: string, texto: string) => {
	fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
	fs.writeFileSync(path.join(dir, rel), texto);
};

function hashDelArbol(raiz: string): string {
	const h = crypto.createHash('sha256');
	const recorrer = (d: string) => {
		for (const n of fs.readdirSync(d).sort()) {
			const p = path.join(d, n);
			if (fs.statSync(p).isDirectory()) recorrer(p);
			else h.update(path.relative(raiz, p)).update(fs.readFileSync(p));
		}
	};
	recorrer(raiz);
	return h.digest('hex');
}

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-cli-migrate-tw-'));
	vi.spyOn(process, 'cwd').mockReturnValue(dir);
	salida = [];
	vi.spyOn(console, 'log').mockImplementation((m: string) => void salida.push(m));
	vi.spyOn(console, 'error').mockImplementation((m: string) => void salida.push(m));
});

afterEach(() => {
	vi.restoreAllMocks();
	process.exitCode = undefined;
	fs.rmSync(dir, { recursive: true, force: true });
});

const copiarProyecto = () => fs.cpSync(PROYECTO, dir, { recursive: true });
const reporte = () => salida.join('\n');

describe('detectarTailwind', () => {
	it('node_modules manda sobre package.json; sin ninguno no hay versión', () => {
		expect(detectarTailwind(dir)).toEqual({ version: null, major: null, fuente: null });
		escribir('package.json', '{"devDependencies":{"tailwindcss":"^3.4.1"}}');
		expect(detectarTailwind(dir)).toEqual({ version: '^3.4.1', major: 3, fuente: 'package.json' });
		escribir('node_modules/tailwindcss/package.json', '{"version":"4.1.2"}');
		expect(detectarTailwind(dir)).toEqual({ version: '4.1.2', major: 4, fuente: 'node_modules' });
	});
});

describe('runMigrateTailwind — el proyecto de prueba', () => {
	beforeEach(copiarProyecto);

	it('(a) sin --write el árbol queda idéntico (hash) y sale 0', async () => {
		const antes = hashDelArbol(dir);
		await runMigrateTailwind({});
		expect(hashDelArbol(dir)).toBe(antes);
		expect(process.exitCode).toBeUndefined();
		expect(reporte()).toContain('dry-run');
	});

	it('el reporte sigue el orden de la spec y trae el tailwind.config, el @theme, el @apply y la convivencia', async () => {
		await runMigrateTailwind({});
		const t = reporte();
		const orden = ['Tailwind ', 'Config: taisho.config.ts', 'Por convertir', 'CHOQUES', 'Convertidas con otro valor', 'Sin convertir al 100 %', 'Fuera de las clases', 'Clases ajenas', 'Resumen:', 'Para terminar:'].map((s) => t.indexOf(s));
		expect(orden.every((i) => i >= 0)).toBe(true);
		expect([...orden].sort((a, b) => a - b)).toEqual(orden);
		expect(t).toContain('tailwind.config.js  [config]');
		expect(t).toContain('src/estilos.css:3  @theme  [theme]');
		expect(t).toContain('[apply]');
		expect(t).toContain('p-16` significa 64px en Tailwind y 16px en TaishoDS');
		expect(t).toMatch(/src\/index\.html:\d+ {2}table {2}\[conflict\]/);
	});

	it('(c) toda clase sin convertir sale con archivo:línea donde de verdad está, y ninguna figura también como convertida en esa línea', async () => {
		await runMigrateTailwind({});
		const lineas = salida.flatMap((m) => m.split('\n')).filter((l) => /^ {2}\S+:\d+ {2}\S+ {2}\[[a-z-]+\]/.test(l));
		expect(lineas.length).toBeGreaterThan(20);
		for (const l of lineas) {
			const [, file, n, token] = /^ {2}(\S+):(\d+) {2}(.+?) {2}\[/.exec(l) as RegExpExecArray;
			const texto = fs.readFileSync(path.join(dir, file), 'utf8').split('\n')[Number(n) - 1];
			const buscada = token.startsWith('@apply ') ? '@apply' : token.replace(/^class:/, '');
			expect(texto, l).toContain(buscada.replace(/^@import "tailwindcss";$/, '@import'));
		}
		const t = reporte();
		expect(t).toMatch(/bg-blue-500 {2}\[base\] la familia `blue` no está en tu tema/);
		expect(t).not.toMatch(/ {2}bg-blue-500 → /);
		expect(t).not.toMatch(/ {2}table → /);
	});

	it('las convertidas con otro valor van agrupadas por par, con cantidad y todas las ubicaciones', async () => {
		await runMigrateTailwind({});
		expect(reporte()).toMatch(/ {2}text-gray-900 → color-gray-900 {2}×3 .*\n {4}src\/components\/Card\.svelte:4, src\/components\/Card\.svelte:8, src\/index\.html:3/);
	});

	it('con --write aplica (incluido type="hidden" intacto) y no escribe CSS; la segunda pasada sólo reconvierte el límite documentado', async () => {
		const css = fs.readFileSync(path.join(dir, 'src/estilos.css'), 'utf8');
		await runMigrateTailwind({ write: true });
		const html = fs.readFileSync(path.join(dir, 'src/index.html'), 'utf8');
		expect(html).toContain('<input type="hidden" name="csrf" value="x">');
		expect(html).toContain('<body class="ts min-h-screen');
		expect(fs.readFileSync(path.join(dir, 'src/estilos.css'), 'utf8')).toBe(css);
		expect(fs.readFileSync(path.join(dir, 'src/components/Modal.vue'), 'utf8')).toContain('<input type="hidden" name="id" value="1" />');
		const leerTodo = () => Object.fromEntries((fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })).filter((f) => fs.statSync(path.join(dir, f)).isFile()).map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
		const primera = leerTodo();
		await runMigrateTailwind({ write: true });
		const segunda = leerTodo();
		const distintos = Object.keys(segunda).filter((f) => segunda[f] !== primera[f]);
		expect(distintos.every((f) => f.endsWith('.svelte'))).toBe(true);
		await runMigrateTailwind({ write: true });
		expect(leerTodo()).toEqual(segunda);
	});

	it('rutas reemplazan a content; una ruta que no matchea sale 2; el @theme de un CSS fuera de las rutas igual se lee', async () => {
		await runMigrateTailwind({ rutas: ['src/components/Boton.jsx'] });
		expect(reporte()).toContain('1 archivo revisado');
		expect(process.exitCode).toBeUndefined();
		salida.length = 0;
		await runMigrateTailwind({ rutas: ['nada/**'] });
		expect(process.exitCode).toBe(2);
		expect(reporte()).toContain('Ningún archivo coincide con "nada/**".');
	});

	it('el @theme que redefine --spacing saca esa familia de la conversión (tipo theme-value)', async () => {
		escribir('src/spacing.css', '@theme { --spacing: 0.5rem; }\n');
		await runMigrateTailwind({});
		expect(reporte()).toMatch(/\[theme-value\] tu `@theme` redefine `--spacing`/);
	});
});

describe('runMigrateTailwind — versión, config y salidas', () => {
	it('Tailwind 3 se niega: sale 2, no lee ni escribe', async () => {
		escribir('package.json', '{"devDependencies":{"tailwindcss":"^3.4.1"}}');
		escribir('a.html', '<div class="p-4"></div>\n');
		await runMigrateTailwind({ write: true });
		expect(process.exitCode).toBe(2);
		expect(reporte()).toContain('Tailwind ^3.4.1');
		expect(fs.readFileSync(path.join(dir, 'a.html'), 'utf8')).toBe('<div class="p-4"></div>\n');
	});

	it('sin Tailwind avisa que asume la 4; sin config avisa que corre con el vocabulario de fábrica', async () => {
		escribir('a.html', '<div class="flex p-4"></div>\n');
		await runMigrateTailwind({});
		expect(process.exitCode).toBeUndefined();
		expect(reporte()).toContain('No se encontró Tailwind en el proyecto: se asume Tailwind 4.');
		expect(reporte()).toContain('Sin taisho.config.ts: corre con el vocabulario de fábrica');
	});

	it('--config inexistente o inválido sale 2; no hay archivos sale 2', async () => {
		await runMigrateTailwind({ configPath: 'nada.ts' });
		expect(process.exitCode).toBe(2);
		process.exitCode = undefined;
		escribir('taisho.config.ts', 'export default 3;\n');
		await runMigrateTailwind({});
		expect(process.exitCode).toBe(2);
		process.exitCode = undefined;
		fs.rmSync(path.join(dir, 'taisho.config.ts'));
		await runMigrateTailwind({});
		expect(process.exitCode).toBe(2);
		expect(reporte()).toContain('No hay archivos para revisar');
	});

	it('sin content ni rutas no revisa md ni dist/build/coverage', async () => {
		escribir('README.md', 'Se usa `class="p-4"`.\n');
		escribir('dist/a.html', '<div class="p-4"></div>\n');
		escribir('a.html', '<div class="p-4"></div>\n');
		await runMigrateTailwind({ write: true });
		expect(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')).toContain('class="p-4"');
		expect(fs.readFileSync(path.join(dir, 'dist/a.html'), 'utf8')).toContain('class="p-4"');
		expect(fs.readFileSync(path.join(dir, 'a.html'), 'utf8')).toBe('<div class="ts p-16"></div>\n');
	});
});

describe('taisho migrate --from tailwind — el ejecutable', () => {
	const correr = (...args: string[]) => spawnSync(path.join(RAIZ, 'node_modules/.bin/tsx'), [path.join(RAIZ, 'src/bin/taisho.ts'), ...args], { cwd: dir, encoding: 'utf8' });

	it('corre y sale 0; con Tailwind 3 sale 2; un flag ajeno sale 2 (el contrato de check)', () => {
		escribir('a.html', '<div class="flex p-4 table"></div>\n');
		const ok = correr('migrate', '--from', 'tailwind');
		expect(ok.status).toBe(0);
		expect(ok.stdout).toContain('a.html:1  table  [conflict]');
		for (const flag of [['--nada'], ['--format', 'json'], ['--yes']]) {
			const r = correr('migrate', '--from', 'tailwind', ...flag);
			expect(r.status, flag.join(' ')).toBe(2);
			expect(r.stderr).not.toBe('');
		}
		escribir('package.json', '{"dependencies":{"tailwindcss":"3.4.0"}}');
		expect(correr('migrate', '--from=tailwind').status).toBe(2);
	});

	it('un origen desconocido es un error de uso: sale 2, como el resto de los comandos', () => {
		expect(correr('migrate', '--from', 'otro').status).toBe(2);
	});
});
