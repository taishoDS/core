// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runGenerate } from './generate';
import { runInit } from './init';

process.env.LC_ALL = 'es_AR.UTF-8';

const tmpDirs: string[] = [];

function makeTmpDir(prefix: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tmpDirs.push(dir);
	return dir;
}

function proyecto(extra: string | ((dir: string) => string) = ''): { dir: string; config: string; outDir: string } {
	const dir = makeTmpDir('taisho-cli-content-');
	const config = path.join(dir, 'taisho.config.ts');
	const resto = typeof extra === 'function' ? extra(dir) : extra;
	fs.writeFileSync(
		config,
		`export default { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [], defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' }, ${resto} };\n`,
	);
	fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex gap-base"></div>\n');
	fs.mkdirSync(path.join(dir, 'node_modules/pkg'), { recursive: true });
	fs.writeFileSync(path.join(dir, 'node_modules/pkg/x.html'), '<div class="ts grid"></div>\n');
	fs.mkdirSync(path.join(dir, '.oculta'), { recursive: true });
	fs.writeFileSync(path.join(dir, '.oculta/y.html'), '<div class="ts block"></div>\n');
	return { dir, config, outDir: path.join(dir, 'taisho') };
}

let warnSpy: ReturnType<typeof vi.spyOn>;
let spies: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
	warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	spies = [vi.spyOn(console, 'error').mockImplementation(() => {}), vi.spyOn(console, 'log').mockImplementation(() => {})];
});

afterEach(() => {
	warnSpy.mockRestore();
	spies.forEach((s) => s.mockRestore());
	process.exitCode = undefined;
	while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe('runGenerate — content: CSS a demanda', () => {
	it('con content escribe taisho.css minificado con sólo lo usado, y no taisho.full.css', async () => {
		const { config, outDir } = proyecto(`content: ['**/*.html']`);
		await runGenerate({ configPath: config, outDir });

		expect(process.exitCode).toBeUndefined();
		expect(fs.existsSync(path.join(outDir, 'taisho.full.css'))).toBe(false);
		const css = fs.readFileSync(path.join(outDir, 'taisho.css'), 'utf8');
		expect(css).toContain(':where(.ts).flex');
		expect(css).toContain(':where(.ts).gap-base');
		expect(css).not.toContain(':where(.ts).grid{');
		expect(css).not.toContain(':where(.ts).block{');
		expect(css.split('\n').length).toBeLessThan(5);
		expect(css.length).toBeLessThan(20_000);
	}, 30_000);

	it('sin content escribe taisho.full.css (minificado) como antes', async () => {
		const { config, outDir } = proyecto();
		await runGenerate({ configPath: config, outDir });

		expect(fs.existsSync(path.join(outDir, 'taisho.css'))).toBe(false);
		const css = fs.readFileSync(path.join(outDir, 'taisho.full.css'), 'utf8');
		expect(css).toContain(':where(.ts).grid');
		expect(css.split('\n').length).toBeLessThan(5);
	}, 30_000);

	it('con content el tema sale podado; sin content, completo; las vars del código del consumidor se conservan', async () => {
		const a = proyecto(`content: ['**/*.html']`);
		fs.writeFileSync(path.join(a.dir, 'index.html'), '<div class="ts flex gap-base" style="color: var(--color-brand-500)"></div>\n');
		await runGenerate({ configPath: a.config, outDir: a.outDir });
		const podado = fs.readFileSync(path.join(a.outDir, 'theme.css'), 'utf8');
		expect(podado).toContain('--ts-gap-base:');
		expect(podado).toContain('--ts-space-quarter:');
		expect(podado).toContain('--color-brand-500:');
		expect(podado).not.toContain('--ts-radius-sm');

		const b = proyecto();
		await runGenerate({ configPath: b.config, outDir: b.outDir });
		const completo = fs.readFileSync(path.join(b.outDir, 'theme.css'), 'utf8');
		expect(completo).toContain('--ts-radius-sm');
		expect(completo.length).toBeGreaterThan(podado.length * 3);
	}, 30_000);

	it('node_modules se saltea, salvo que el glob lo nombre explícito', async () => {
		const a = proyecto(`content: ['**/*.html']`);
		await runGenerate({ configPath: a.config, outDir: a.outDir });
		expect(fs.readFileSync(path.join(a.outDir, 'taisho.css'), 'utf8')).not.toContain(':where(.ts).grid{');

		const b = proyecto(`content: ['**/*.html', 'node_modules/pkg/*.html']`);
		await runGenerate({ configPath: b.config, outDir: b.outDir });
		expect(fs.readFileSync(path.join(b.outDir, 'taisho.css'), 'utf8')).toContain(':where(.ts).grid{');
	}, 30_000);

	it('imprime los warnings del resultado sin cortar', async () => {
		const { dir, config, outDir } = proyecto(`content: ['**/*.html']`);
		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex grid-cols-${n}"></div>\n');
		await runGenerate({ configPath: config, outDir });

		expect(process.exitCode).toBeUndefined();
		expect(fs.existsSync(path.join(outDir, 'taisho.css'))).toBe(true);
		expect(warnSpy.mock.calls.flat().join('\n')).toContain('safelist');
	}, 30_000);

	it('avisa, sin cortar, una clase del DS que no existe y la llave `ts` que falta, con archivo:línea', async () => {
		const { dir, config, outDir } = proyecto(`content: ['**/*.html']`);
		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts gap-bse"></div>\n<div class="flex gap-base"></div>\n');
		await runGenerate({ configPath: config, outDir });

		expect(process.exitCode).toBeUndefined();
		const salida = warnSpy.mock.calls.flat().join('\n');
		expect(salida).toContain('⚠ index.html:1: "gap-bse" no existe en el DS y no se emite. ¿Se quiso decir "gap-base"?');
		expect(salida).toContain('⚠ index.html:2: <div> usa clases del DS ("gap-base") pero no lleva la clase `ts`, y sin ella no recibe estilo.');
	}, 30_000);

	it('iconsHtmlDirs corta con el error exacto', async () => {
		const { config, outDir } = proyecto((dir) => `iconsHtmlDirs: [${JSON.stringify(dir)}]`);
		await runGenerate({ configPath: config, outDir });

		expect(process.exitCode).toBe(1);
		expect(spies[0].mock.calls.flat().join('\n')).toContain('taisho config: iconsHtmlDirs ya no existe: se declara `content`.');
		expect(fs.existsSync(path.join(outDir, 'taisho.css'))).toBe(false);
	}, 30_000);

	it("scope: 'ts' se acepta y avisa que ya es el único modo; el CSS es el mismo", async () => {
		const con = proyecto(`scope: 'ts', content: ['**/*.html']`);
		await runGenerate({ configPath: con.config, outDir: con.outDir });
		expect(process.exitCode).toBeUndefined();
		expect(warnSpy.mock.calls.flat().join('\n')).toContain("⚠ `scope: 'ts'` ya es el único modo: se quita la clave.");

		warnSpy.mockClear();
		const sin = proyecto(`content: ['**/*.html']`);
		await runGenerate({ configPath: sin.config, outDir: sin.outDir });
		expect(warnSpy.mock.calls.flat().join('\n')).not.toContain('ya es el único modo');
		expect(fs.readFileSync(path.join(con.outDir, 'taisho.css'), 'utf8')).toBe(fs.readFileSync(path.join(sin.outDir, 'taisho.css'), 'utf8'));
	}, 30_000);

	it('con content, el escáner de íconos lee los archivos de content (incluidos .svelte)', async () => {
		const { dir, config, outDir } = proyecto(`content: ['**/*.{html,svelte}']`);
		fs.writeFileSync(path.join(dir, 'App.svelte'), '<svg><use href="taisho/taisho.icons.svg#ts-sun"></use></svg>\n');
		await runGenerate({ configPath: config, outDir });

		expect(fs.readFileSync(path.join(outDir, 'taisho.icons.svg'), 'utf8')).toContain('ts-sun');
	}, 30_000);
});

describe('el CSS propio fuera de content', () => {
	const CSS = '.a { font-weight: var(--ts-fw-bold); letter-spacing: var(--ts-ls-wider); }\n';

	it('avisa, con el archivo y las variables, que el tema las podó porque el .css no está en content', async () => {
		const { dir, config, outDir } = proyecto(`content: ['**/*.html']`);
		fs.writeFileSync(path.join(dir, 'app.css'), CSS);
		await runGenerate({ configPath: config, outDir });

		expect(fs.readFileSync(path.join(outDir, 'theme.css'), 'utf8')).not.toContain('--ts-fw-bold:');
		const salida = warnSpy.mock.calls.flat().join('\n');
		expect(salida).toContain('app.css');
		expect(salida).toContain('--ts-fw-bold');
		expect(salida).toContain('content');
	}, 30_000);

	it('con el .css en content: las variables salen y no hay aviso', async () => {
		const { dir, config, outDir } = proyecto(`content: ['**/*.{html,css}']`);
		fs.writeFileSync(path.join(dir, 'app.css'), CSS);
		await runGenerate({ configPath: config, outDir });

		const tema = fs.readFileSync(path.join(outDir, 'theme.css'), 'utf8');
		expect(tema).toContain('--ts-fw-bold:');
		expect(tema).toContain('--ts-ls-wider:');
		expect(warnSpy.mock.calls.flat().join('\n')).not.toContain('app.css');
	}, 30_000);

	it('el .css de dist/, node_modules y la salida no cuentan; uno que no usa variables podadas tampoco', async () => {
		const { dir, config, outDir } = proyecto(`content: ['**/*.html']`);
		fs.mkdirSync(path.join(dir, 'dist'));
		fs.writeFileSync(path.join(dir, 'dist/app.css'), CSS);
		fs.writeFileSync(path.join(dir, 'node_modules/pkg/x.css'), CSS);
		fs.writeFileSync(path.join(dir, 'otro.css'), '.b { color: red; }\n');
		await runGenerate({ configPath: config, outDir });
		await runGenerate({ configPath: config, outDir });

		expect(warnSpy.mock.calls.flat().join('\n')).not.toMatch(/\.css/);
	}, 30_000);
});

describe('un proyecto recién creado pasa --strict', () => {
	it('taisho init + generate --strict: sin avisos, aunque el JS lleve CSS en un string', async () => {
		const dir = makeTmpDir('taisho-cli-init-strict-');
		await runInit(dir);
		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex gap-base"></div>\n');
		fs.writeFileSync(path.join(dir, 'a.js'), `const s = '<style>body{display:grid;margin:0}</style>';\n`);
		fs.writeFileSync(path.join(dir, 'app.css'), 'body { display: grid; margin: 0; }\n');
		await runGenerate({ configPath: path.join(dir, 'taisho.config.ts'), outDir: path.join(dir, 'taisho'), strict: true });

		expect(warnSpy.mock.calls.flat().join('\n')).toBe('');
		expect(process.exitCode).toBeUndefined();
	}, 30_000);
});

describe('runInit — plantilla con content', () => {
	it('escribe content con el glob por defecto y menciona safelist', async () => {
		const dir = makeTmpDir('taisho-cli-init-content-');
		await runInit(dir);
		const contenido = fs.readFileSync(path.join(dir, 'taisho.config.ts'), 'utf8');
		expect(contenido).toContain(`content: ['**/*.{html,svelte,vue,astro,jsx,tsx,js,ts,css}'],`);
		expect(contenido).toContain('safelist');
	});
});

describe('taisho generate: darkMode y secciones con modo fijo', () => {
	const material = `material: { light: { bg: 'var(--color-gray-100)' }, dark: { bg: 'var(--color-gray-300)' } }`;
	const armar = async (opciones: string, clases: string) => {
		const dir = makeTmpDir('taisho-cli-oscuro-');
		const config = path.join(dir, 'taisho.config.ts');
		fs.writeFileSync(config, `export default { ${opciones} themes: { principal: { colors: { brand: '#4F46E5' }, ${material} } }, fontFaces: [], content: ['index.html'] };\n`);
		fs.writeFileSync(path.join(dir, 'index.html'), `<div class="ts ${clases}" style="background: var(--ts-material-bg)"></div>\n`);
		const outDir = path.join(dir, 'taisho');
		await runGenerate({ configPath: config, outDir });
		return { css: fs.readFileSync(path.join(outDir, 'taisho.css'), 'utf8'), tema: fs.readFileSync(path.join(outDir, 'theme.css'), 'utf8') };
	};

	it("con 'media' el CSS del proyecto sigue al sistema", async () => {
		const { css, tema } = await armar(`darkMode: 'media',`, 'toggle');
		expect(css).toContain('prefers-color-scheme:dark');
		expect(tema).toContain('prefers-color-scheme: dark');
	});

	it('sin la opción y sin secciones no paga nada', async () => {
		const { css, tema } = await armar('', 'toggle');
		expect(css).not.toContain('prefers-color-scheme');
		expect(css).not.toContain('scheme-dark');
		expect(tema).not.toContain('--ts-material-bg: var(--color-gray-300);\n}\n\n.scheme-light');
		expect(tema).not.toMatch(/^\.scheme-dark \{/m);
	});

	it('con una sección, el material del tema la sigue', async () => {
		const { tema } = await armar('', 'toggle scheme-dark');
		expect(tema).toMatch(/^\.scheme-dark \{/m);
	});
});
