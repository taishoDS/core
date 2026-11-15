// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { runCheck } from './check';
import { versionDelCore } from './descubrir-paquetes';
import { acme } from '../generate/extension-acme.fixture';

process.env.LC_ALL = 'es_AR.UTF-8';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let dir: string;
let salida: string[];
const esAviso = (l: string) => /^\S+:\d+:\d+ {2}[a-z-]+ {2}/.test(l);

const escribir = (rel: string, texto: string) => {
	fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
	fs.writeFileSync(path.join(dir, rel), texto);
};

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-cli-check-'));
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

describe('runCheck', () => {
	it('sin config ni globs revisa el proyecto, avisa con archivo:línea y sale 1', async () => {
		escribir('src/a.svelte', '<div class="ts-flex"></div>\n<div class="ts gap-bse"></div>\n');
		escribir('src/a.css', 'a { color: var(--color-nada-500); }\n');
		escribir('README.md', '<div class="ts-flex"></div>\n');
		escribir('node_modules/p/x.svelte', '<div class="ts-flex"></div>\n');
		await runCheck({});
		expect(process.exitCode).toBe(1);
		expect(salida.filter(esAviso).map((l) => l.slice(0, 52))).toEqual([
			'src/a.css:1:12  unknown-var  "var(--color-nada-500)"',
			'src/a.svelte:1:13  legacy-prefix  "ts-flex" lleva el',
			'src/a.svelte:2:16  unknown-class  "gap-bse" no exist',
		]);
		expect(salida.at(-1)).toBe('taisho check: 2 archivo(s) revisado(s), 3 aviso(s).');
	});

	it('las clases y variables de un paquete con estilos (manifiesto format 3) son del vocabulario', async () => {
		escribir('package.json', JSON.stringify({ name: 'app', dependencies: { '@acme/ui': '1.0.0' } }));
		escribir('node_modules/@acme/ui/package.json', JSON.stringify({ name: '@acme/ui', version: '1.0.0', exports: { './taisho.manifest.json': './taisho.manifest.json' } }));
		escribir('node_modules/@acme/ui/taisho.manifest.json', JSON.stringify({ format: 3, core: versionDelCore(), componentFiles: {}, extension: acme }));
		escribir('src/a.svelte', '<div class="ts acme-card acme-glow"></div>\n<style>.x { padding: var(--ts-acme-card-pad); }</style>\n');
		await runCheck({});
		expect(salida).toEqual(['taisho check: 1 archivo(s) revisado(s), 0 aviso(s).']);
		escribir('src/b.svelte', '<div class="ts-acme-card"></div>\n<p style="padding: var(--ts-acme-card-pda)"></p>\n');
		salida.length = 0;
		await runCheck({});
		expect(salida.filter(esAviso).map((l) => l.slice(0, 56))).toEqual(['src/b.svelte:1:13  legacy-prefix  "ts-acme-card" lleva e', 'src/b.svelte:2:20  unknown-var  "var(--ts-acme-card-pda)']);
	});

	it('limpio: sale 0', async () => {
		escribir('src/a.svelte', '<div class="ts flex gap-base my-own"></div>\n<style>.my-own { color: var(--color-brand-500); }</style>\n');
		await runCheck({});
		expect(process.exitCode).toBeUndefined();
		expect(salida).toEqual(['taisho check: 1 archivo(s) revisado(s), 0 aviso(s).']);
	});

	it('la regla other-scale es opcional: sin la opción no avisa, con ella avisa como warning y no cambia el código de salida', async () => {
		escribir('src/a.svelte', '<div class="ts p-4 w-64"></div>\n');
		await runCheck({});
		expect(salida).toEqual(['taisho check: 1 archivo(s) revisado(s), 0 aviso(s).']);
		salida.length = 0;
		await runCheck({ otherScale: true });
		expect(process.exitCode).toBeUndefined();
		expect(salida.filter(esAviso)).toEqual([
			'src/a.svelte:1:16  other-scale  "p-4" vale 4 px en TaishoDS; el mismo número vale 16 px en otro framework. Para 16 px se escribe "p-16".',
			'src/a.svelte:1:20  other-scale  "w-64" vale 64 px en TaishoDS; el mismo número vale 256 px en otro framework. Para 256 px se escribe "w-256".',
		]);
		expect(salida.at(-1)).toBe('taisho check: 1 archivo(s) revisado(s), 2 aviso(s).');
	});

	it('other-scale en --format json: rule, code y params son datos, y el idioma sólo cambia el message', async () => {
		escribir('src/a.svelte', '<div class="ts p-4"></div>\n');
		await runCheck({ otherScale: true, format: 'json', lang: 'en' });
		const { warnings } = JSON.parse(salida[0]);
		expect(warnings).toMatchObject([{ rule: 'other-scale', severity: 'warning', code: 'other-scale', params: { class: 'p-4', px: 4, otherPx: 16, equivalent: 'p-16' }, message: '"p-4" is 4 px in TaishoDS; the same number is 16 px in another framework. For 16 px, write "p-16".' }]);
		expect(warnings[0]).not.toHaveProperty('suggestion');
	});

	it('los globs del argumento mandan sobre el content del config', async () => {
		escribir('taisho.config.ts', "export default { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [], content: ['src/**/*.html'] };\n");
		escribir('src/a.html', '<div class="ts-flex"></div>\n');
		escribir('otro/b.html', '<div class="ts-grid"></div>\n');
		await runCheck({});
		expect(salida.filter(esAviso).map((l) => l.slice(0, 22))).toEqual(['src/a.html:1:13  legac']);
		salida.length = 0;
		await runCheck({ globs: ['otro/*.html'] });
		expect(salida.filter(esAviso).map((l) => l.slice(0, 24))).toEqual(['otro/b.html:1:13  legacy']);
	});

	it('el vocabulario sale del config: los colores del tema son válidos', async () => {
		escribir('taisho.config.ts', "export default { themes: { principal: { colors: { brand: '#4F46E5', marca: '#4F46E5' } } }, fontFaces: [] };\n");
		escribir('a.html', '<div class="ts bg-marca-500"></div>\n<div class="ts bg-otra-500"></div>\n');
		await runCheck({});
		expect(salida.filter(esAviso).map((l) => l.slice(0, 40))).toEqual(['a.html:2:16  unknown-class  "bg-otra-500']);
	});

	it('sin config, el tema que el código importa suma sus colores y variables', async () => {
		escribir('tema/tokens.css', ':root { --color-marca-500: red; --ts-marca-extra: 1px; }\n');
		escribir('src/app.css', "@import '../tema/tokens.css';\n.x { color: var(--color-marca-500); padding: var(--ts-marca-extra); }\n");
		escribir('src/a.html', '<div class="ts bg-marca-500"></div>\n');
		await runCheck({});
		expect(salida).toEqual(['taisho check: 3 archivo(s) revisado(s), 0 aviso(s).']);
	});

	it('un --config que no existe es un error', async () => {
		await runCheck({ configPath: 'nada.ts' });
		expect(process.exitCode).toBe(2);
		expect(salida[0]).toContain('No se encontró');
	});
});

describe('taisho check — el ejecutable', () => {
	it('end to end: imprime los avisos, sale 1; y 0 cuando se arregla', () => {
		escribir('src/a.svelte', '<div class="ts-flex"></div>\n');
		const correr = () => spawnSync(path.join(RAIZ, 'node_modules/.bin/tsx'), [path.join(RAIZ, 'src/bin/taisho.ts'), 'check', 'src/**/*.svelte'], { cwd: dir, encoding: 'utf8' });
		const mal = correr();
		expect(mal.status).toBe(1);
		expect(mal.stdout).toContain('src/a.svelte:1:13  legacy-prefix  "ts-flex" lleva el prefijo viejo');
		fs.writeFileSync(path.join(dir, 'src/a.svelte'), '<div class="ts flex"></div>\n');
		const bien = correr();
		expect(bien.status).toBe(0);
		expect(bien.stdout).toBe('taisho check: 1 archivo(s) revisado(s), 0 aviso(s).\n');
	});
});

describe('runCheck — el contrato con CI', () => {
	it('una carpeta como argumento revisa sus archivos', async () => {
		escribir('src/lib/a.svelte', '<div class="ts-flex"></div>\n');
		escribir('src/b.css', 'a { color: var(--color-nada-500); }\n');
		escribir('otra/c.svelte', '<div class="ts-flex"></div>\n');
		await runCheck({ globs: ['src'] });
		expect(process.exitCode).toBe(1);
		expect(salida.filter(esAviso).map((l) => l.split('  ')[0])).toEqual(['src/b.css:1:12', 'src/lib/a.svelte:1:13']);
		expect(salida.at(-1)).toBe('taisho check: 2 archivo(s) revisado(s), 2 aviso(s).');
	});

	it('un argumento que no matchea nada sale 2 con un mensaje, aunque otro sí matchee', async () => {
		escribir('src/a.svelte', '<div class="ts flex"></div>\n');
		await runCheck({ globs: ['nada/**'] });
		expect(process.exitCode).toBe(2);
		expect(salida).toEqual(['Ningún archivo coincide con "nada/**".']);
		salida.length = 0;
		process.exitCode = undefined;
		await runCheck({ globs: ['src', 'typo'] });
		expect(process.exitCode).toBe(2);
		expect(salida).toEqual(['Ningún archivo coincide con "typo".']);
	});

	it('sin argumentos y sin archivos en el alcance sale 2', async () => {
		escribir('README.md', 'nada de código\n');
		await runCheck({});
		expect(process.exitCode).toBe(2);
		expect(salida[0]).toContain('No hay archivos para revisar');
	});

	it('el content del config que no matchea nada también sale 2', async () => {
		escribir('taisho.config.ts', "export default { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [], content: ['src/**/*.html'] };\n");
		await runCheck({});
		expect(process.exitCode).toBe(2);
	});

	it('un config que no carga o no es válido sale 2', async () => {
		escribir('taisho.config.ts', 'export default 5;\n');
		await runCheck({});
		expect(process.exitCode).toBe(2);
		expect(salida[0]).toContain('no exporta un TaishoConfig válido');
		salida.length = 0;
		process.exitCode = undefined;
		escribir('roto.config.ts', 'throw new Error("roto");\n');
		await runCheck({ configPath: 'roto.config.ts' });
		expect(process.exitCode).toBe(2);
		expect(salida[0]).toContain('No se pudo cargar');
	});

	it('sin config no recorre dist, build, coverage, .svelte-kit ni la carpeta de salida; con un argumento explícito sí', async () => {
		for (const d of ['dist', 'build', 'coverage', '.svelte-kit', 'taisho', 'packages/x/dist']) escribir(`${d}/a.js`, "el.classList.add('ts-flex');\n");
		escribir('src/a.svelte', '<div class="ts flex"></div>\n');
		await runCheck({});
		expect(process.exitCode).toBeUndefined();
		expect(salida).toEqual(['taisho check: 1 archivo(s) revisado(s), 0 aviso(s).']);
		await runCheck({ globs: ['dist'] });
		expect(process.exitCode).toBe(1);
	});

	it('con config, la carpeta de salida es el `out` de la config y no se recorre', async () => {
		escribir('taisho.config.ts', "export default { themes: { a: { colors: { brand: '#4F46E5' } } }, out: 'public/taisho', content: ['**/*.{html,js}'] };\n");
		escribir('public/taisho/taisho.core.js', "el.classList.add('ts-flex');\n");
		escribir('index.html', '<div class="ts flex"></div>\n');
		await runCheck({});
		expect(process.exitCode).toBeUndefined();
		expect(salida.at(-1)).toContain('1 archivo(s) revisado(s), 0 aviso(s)');
	});

	it('dos clases malas en la misma línea son dos avisos', async () => {
		escribir('a.html', '<div class="ts gap-bse gap-bsee"></div>\n');
		await runCheck({});
		expect(salida.filter(esAviso)).toHaveLength(2);
		expect(salida.at(-1)).toContain('2 aviso(s)');
	});

	it('--format json: stdout es el JSON versionado, el resumen va a stderr', async () => {
		escribir('src/a.svelte', '<div class="ts gap-bse"></div>\n');
		const out: string[] = [];
		const err: string[] = [];
		vi.spyOn(console, 'log').mockImplementation((m: string) => void out.push(m));
		vi.spyOn(console, 'error').mockImplementation((m: string) => void err.push(m));
		await runCheck({ format: 'json' });
		expect(process.exitCode).toBe(1);
		expect(err).toEqual(['taisho check: 1 archivo(s) revisado(s), 1 aviso(s).']);
		const json = JSON.parse(out.join('\n'));
		expect(json).toEqual({
			version: 1,
			files: 1,
			warnings: [
				{
					file: 'src/a.svelte',
					line: 1,
					column: 16,
					rule: 'unknown-class',
					severity: 'error',
					code: 'unknown-class',
					params: { class: 'gap-bse', suggestion: 'gap-base' },
					message: '"gap-bse" no existe en el DS y no se emite. ¿Se quiso decir "gap-base"?',
					suggestion: 'gap-base',
				},
			],
		});
	});

	it('un aviso con severity warning no hace fallar', async () => {
		const mod = await import('../generate/avisos-check');
		vi.spyOn(mod, 'avisosDeCheck').mockReturnValue([{ file: 'a.html', line: 1, column: 1, rule: 'unknown-class', severity: 'warning', code: 'unknown-class', params: { class: 'x' } }]);
		escribir('a.html', '<div class="ts flex"></div>\n');
		await runCheck({});
		expect(process.exitCode).toBeUndefined();
	});
});

describe('taisho check — flags y códigos de salida del ejecutable', () => {
	const correr = (...args: string[]) => spawnSync(path.join(RAIZ, 'node_modules/.bin/tsx'), [path.join(RAIZ, 'src/bin/taisho.ts'), ...args], { cwd: dir, encoding: 'utf8' });

	it('un flag desconocido o de otro comando sale 2 con un mensaje', () => {
		escribir('a.html', '<div class="ts flex"></div>\n');
		for (const flag of [['--nada'], ['--write'], ['--out', 'x'], ['--from', 'classic'], ['-y']]) {
			const r = correr('check', ...flag);
			expect(r.status, flag.join(' ')).toBe(2);
			expect(r.stderr).not.toBe('');
			expect(r.stdout).toBe('');
		}
	});

	it('--format inválido, --config inexistente y glob vacío salen 2; avisos 1; limpio 0', () => {
		escribir('a.html', '<div class="ts flex"></div>\n');
		expect(correr('check', '--format', 'xml').status).toBe(2);
		expect(correr('check', '--config', 'nada.ts').status).toBe(2);
		expect(correr('check', 'nada/**').status).toBe(2);
		expect(correr('check').status).toBe(0);
		escribir('b.html', '<div class="ts-flex"></div>\n');
		expect(correr('check').status).toBe(1);
	});

	it('--format json por el ejecutable: stdout es JSON puro', () => {
		escribir('b.html', '<div class="ts-flex"></div>\n');
		const r = correr('check', '--format', 'json');
		expect(r.status).toBe(1);
		expect(JSON.parse(r.stdout).warnings[0]).toMatchObject({ file: 'b.html', rule: 'legacy-prefix', severity: 'error' });
		expect(r.stderr).toContain('1 archivo(s) revisado(s), 1 aviso(s).');
	});

	it('--format en otro comando se rechaza como error de uso (2)', () => {
		expect(correr('generate', '--format', 'json').status).toBe(2);
	});
});
