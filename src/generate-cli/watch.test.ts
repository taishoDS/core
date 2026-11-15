// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { iniciarWatch, type Watch } from './watch';
import { runGenerate } from './generate';
import { runInit } from './init';
import { versionDelCore } from './descubrir-paquetes';

process.env.LC_ALL = 'es_AR.UTF-8';

const RAIZ = path.resolve(import.meta.dirname, '../..');
const CLI = path.join(RAIZ, 'src/generate-cli/cli.ts');
const TSX = path.join(RAIZ, 'node_modules/.bin/tsx');

const tmpDirs: string[] = [];
const abiertos: Watch[] = [];
let logs: string[];
let errores: string[];
let avisos: string[];

const CONFIG = {
	themes: { principal: { colors: { brand: '#4F46E5' } } },
	fontFaces: [],
	defaultStates: { success: '#166534', warning: '#92400E', info: '#1E40AF', danger: '#991B1B' },
	content: ['src/**/*.html'],
};

const escribirConfig = (dir: string, config: object) => fs.writeFileSync(path.join(dir, 'taisho.config.ts'), `export default ${JSON.stringify(config)};\n`);

function proyecto(config: object = CONFIG): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-watch-'));
	tmpDirs.push(dir);
	fs.mkdirSync(path.join(dir, 'src/icons'), { recursive: true });
	fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts flex"><svg><use href="x.svg#ts-mi"></use></svg></div>\n');
	fs.writeFileSync(path.join(dir, 'src/icons/mi.svg'), '<svg viewBox="0 0 24 24"><path d="M1 1h4"/></svg>');
	escribirConfig(dir, config);
	return dir;
}

async function arrancar(dir: string): Promise<Watch> {
	const w = await iniciarWatch({ cwd: dir });
	abiertos.push(w);
	return w;
}

async function esperar(cond: () => boolean, que: string, tope = 8000) {
	const fin = Date.now() + tope;
	while (!cond()) {
		if (Date.now() > fin) throw new Error(`No pasó a tiempo: ${que}\nlogs: ${logs.join(' | ')}\nerrores: ${errores.join(' | ')}`);
		await new Promise((r) => setTimeout(r, 5));
	}
}

async function guardarHasta(archivo: string, contenido: string, cond: () => boolean, que: string) {
	const fin = Date.now() + 8000;
	let proximo = 0;
	while (!cond()) {
		if (Date.now() > fin) throw new Error(`No pasó a tiempo: ${que}\nlogs: ${logs.join(' | ')}\nerrores: ${errores.join(' | ')}`);
		if (Date.now() >= proximo) {
			fs.writeFileSync(archivo, contenido);
			proximo = Date.now() + 1000;
		}
		await new Promise((r) => setTimeout(r, 5));
	}
}

const leer = (dir: string, nombre: string) => fs.readFileSync(path.join(dir, 'taisho', nombre), 'utf8');
const mtime = (dir: string, nombre: string) => fs.statSync(path.join(dir, 'taisho', nombre)).mtimeMs;

beforeEach(() => {
	logs = [];
	errores = [];
	avisos = [];
	vi.spyOn(console, 'log').mockImplementation((...a) => void logs.push(a.join(' ')));
	vi.spyOn(console, 'error').mockImplementation((...a) => void errores.push(a.join(' ')));
	vi.spyOn(console, 'warn').mockImplementation((...a) => void avisos.push(a.join(' ')));
});

afterEach(async () => {
	await Promise.all(abiertos.splice(0).map((w) => w.cerrar()));
	vi.restoreAllMocks();
	process.exitCode = undefined;
	while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

function escribirPaquete(dir: string, sombra: string) {
	const carpeta = path.join(dir, 'node_modules/@acme/ui');
	fs.mkdirSync(carpeta, { recursive: true });
	fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: { '@acme/ui': '1.0.0' } }));
	fs.writeFileSync(path.join(carpeta, 'package.json'), JSON.stringify({ name: '@acme/ui', version: '1.0.0', exports: { './taisho.manifest.json': './taisho.manifest.json' } }));
	const estilos = { roots: ['acme-glow'], utilities: `@utility ts-acme-glow { box-shadow: var(--ts-shadow-${sombra}); }` };
	fs.writeFileSync(path.join(carpeta, 'taisho.manifest.json'), JSON.stringify({ format: 3, core: versionDelCore(), componentFiles: {}, extension: estilos }));
}

describe('taisho watch', { timeout: 30_000 }, () => {
	it('vigila el manifiesto de un paquete: si cambia, recompila con los estilos nuevos', async () => {
		const dir = proyecto();
		escribirPaquete(dir, 'md');
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts flex acme-glow"></div>\n');
		await arrancar(dir);
		expect(leer(dir, 'taisho.css')).toContain('--ts-shadow-md');

		escribirPaquete(dir, 'lg');
		await esperar(() => leer(dir, 'taisho.css').includes('--ts-shadow-lg'), 'el manifiesto nuevo recompila');
		expect(leer(dir, 'taisho.css')).not.toContain('--ts-shadow-md');
	});

	it('arranca: genera, cuenta los archivos y avisa que está mirando', async () => {
		const dir = proyecto();
		await arrancar(dir);
		expect(fs.existsSync(path.join(dir, 'taisho/taisho.css'))).toBe(true);
		expect(logs.join('\n')).toMatch(/✅ .*taisho\/ al día \(4 archivos, \d+ ms\)\. Mirando 1 archivos de content, la config y src\/icons\/\. Ctrl\+C para salir\./);
	});

	it('un cambio en un archivo de content regenera el CSS', async () => {
		const dir = proyecto();
		await arrancar(dir);
		const antes = leer(dir, 'taisho.css');
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts flex grid"><svg><use href="x.svg#ts-mi"></use></svg></div>\n');
		await esperar(() => leer(dir, 'taisho.css') !== antes, 'taisho.css cambia');
		const medio = leer(dir, 'taisho.css');
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts flex grid block"><svg><use href="x.svg#ts-mi"></use></svg></div>\n');
		await esperar(() => leer(dir, 'taisho.css') !== medio, 'taisho.css cambia otra vez');
		await esperar(() => logs.some((l) => /^↻ [^,]*index\.html → .*taisho\.css.* \(\d+ ms\)$/.test(l)), 'línea ↻');
	});

	it('un archivo nuevo (también en una carpeta que nace después) entra, y borrarlo lo saca', async () => {
		const dir = proyecto();
		await arrancar(dir);
		const base = leer(dir, 'taisho.css');

		fs.writeFileSync(path.join(dir, 'src/nueva.html'), '<div class="ts grid"></div>\n');
		await esperar(() => leer(dir, 'taisho.css') !== base, 'alta');
		const conGrid = leer(dir, 'taisho.css');
		await esperar(() => logs.some((l) => /(^|, )\+ .*nueva\.html → /.test(l)), 'línea +');

		fs.mkdirSync(path.join(dir, 'src/sub'));
		fs.writeFileSync(path.join(dir, 'src/sub/a.html'), '<div class="ts flex-col"></div>\n');
		await esperar(() => leer(dir, 'taisho.css') !== conGrid, 'alta en carpeta nueva');
		const conSub = leer(dir, 'taisho.css');
		fs.writeFileSync(path.join(dir, 'src/sub/a.html'), '<div class="ts block"></div>\n');
		await esperar(() => leer(dir, 'taisho.css') !== conSub, 'cambio en carpeta nueva');

		fs.rmSync(path.join(dir, 'src/nueva.html'));
		await esperar(() => logs.some((l) => /(^|, )− .*nueva\.html → /.test(l)), 'línea −');
		expect(leer(dir, 'taisho.css')).not.toBe(conGrid);
	});

	it('un cambio en la config regenera el tema; una config inválida muestra el error, deja la salida y sigue mirando', async () => {
		const dir = proyecto();
		await arrancar(dir);
		const tema = leer(dir, 'theme.css');
		escribirConfig(dir, { ...CONFIG, themes: { principal: { colors: { brand: '#E11D48' } } } });
		await esperar(() => leer(dir, 'theme.css') !== tema, 'theme.css cambia');
		const nuevo = leer(dir, 'theme.css');

		fs.writeFileSync(path.join(dir, 'taisho.config.ts'), 'export default {};\n');
		await esperar(() => errores.some((e) => e.startsWith('✖ taisho config: ')), 'error de config');
		expect(leer(dir, 'theme.css')).toBe(nuevo);

		const css = leer(dir, 'taisho.css');
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts grid"></div>\n');
		await esperar(() => leer(dir, 'taisho.css') !== css, 'el content sigue vivo');
	});

	it('un SVG propio regenera el sprite', async () => {
		const dir = proyecto();
		await arrancar(dir);
		const sprite = leer(dir, 'taisho.icons.svg');
		fs.writeFileSync(path.join(dir, 'src/icons/mi.svg'), '<svg viewBox="0 0 24 24"><path d="M2 2h9"/></svg>');
		await esperar(() => leer(dir, 'taisho.icons.svg') !== sprite, 'sprite cambia');
		expect(leer(dir, 'taisho.icons.svg')).toContain('M2 2h9');
	});

	it('si los bytes no cambian, el archivo no se toca (mtime intacto)', async () => {
		const dir = proyecto();
		await arrancar(dir);
		const antes = Object.fromEntries(fs.readdirSync(path.join(dir, 'taisho')).map((n) => [n, mtime(dir, n)]));
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts flex"><svg><use href="x.svg#ts-mi"></use></svg></div>\n<p>palabrasuelta</p>\n');
		await esperar(() => logs.some((l) => /^↻ .*index\.html → sin cambios \(\d+ ms\)$/.test(l)), 'línea «sin cambios»');
		for (const [n, t] of Object.entries(antes)) expect(mtime(dir, n)).toBe(t);
	});

	it('un error de generación deja la salida anterior, lo muestra y sigue mirando', async () => {
		const dir = proyecto();
		await arrancar(dir);
		const antes = leer(dir, 'taisho.css');
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts grid"><svg><use href="x.svg#ts-no-existe-nada"></use></svg></div>\n');
		await esperar(() => errores.some((e) => e.startsWith('✖ ')), 'error de ícono');
		expect(leer(dir, 'taisho.css')).toBe(antes);

		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts grid"></div>\n');
		await esperar(() => leer(dir, 'taisho.css') !== antes, 'se recupera');
	});

	it('muestra sólo los avisos nuevos', async () => {
		const dir = proyecto();
		await arrancar(dir);
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts gird-cols-3"></div>\n');
		await esperar(() => avisos.some((a) => a.startsWith('⚠ ') && a.includes('gird-cols-3')), 'aviso nuevo');
		const cuantos = avisos.length;
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts gird-cols-3"></div>\n<p>otra</p>\n');
		await esperar(() => logs.filter((l) => l.startsWith('↻')).length === 2, 'segunda tanda');
		expect(avisos.length).toBe(cuantos);
	});

	it('falta la config al arrancar: lanza con el texto de generate', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-watch-'));
		tmpDirs.push(dir);
		await expect(iniciarWatch({ cwd: dir })).rejects.toThrow(/No se encontró .*taisho\.config\.ts\.\nSe crea uno con `taisho init`\./);
	});
});

describe('taisho watch — por la CLI', () => {
	it('SIGINT cierra y sale con 0', async () => {
		const dir = proyecto();
		const hijo = spawn(TSX, [CLI, 'watch'], { cwd: dir });
		let salida = '';
		hijo.stdout.on('data', (d) => (salida += d));
		const fin = new Promise<number | null>((r) => hijo.on('exit', (code) => r(code)));
		await esperar(() => salida.includes('Ctrl+C para salir'), 'el hijo está mirando', 30_000);
		hijo.kill('SIGINT');
		expect(await fin).toBe(0);
	}, 40_000);

	it('un flag que no es suyo (incluido --strict) es un error de uso', () => {
		const dir = proyecto();
		for (const flag of ['--strict', '--format=json', '--write']) {
			const r = spawnSync(TSX, [CLI, 'watch', flag], { cwd: dir, encoding: 'utf8' });
			expect(r.status, flag).toBe(2);
			expect(r.stderr).toMatch(/taisho watch no acepta|Unknown option/);
		}
	}, 40_000);

	it('falta la config: sale con 1 y el texto de generate', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-watch-'));
		tmpDirs.push(dir);
		const r = spawnSync(TSX, [CLI, 'watch'], { cwd: dir, encoding: 'utf8' });
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('No se encontró');
	}, 30_000);
});

describe('taisho generate --strict', () => {
	const generar = async (dir: string, strict: boolean) => {
		const cwd = vi.spyOn(process, 'cwd').mockReturnValue(dir);
		try {
			await runGenerate({ strict });
		} finally {
			cwd.mockRestore();
		}
	};

	it('con avisos escribe la salida igual y sale con 1', async () => {
		const dir = proyecto();
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts gird-cols-3"></div>\n');
		await generar(dir, true);
		expect(process.exitCode).toBe(1);
		expect(fs.existsSync(path.join(dir, 'taisho/taisho.css'))).toBe(true);
	}, 30_000);

	it('limpio sale con 0, y sin --strict los avisos no cuentan', async () => {
		const dir = proyecto();
		await generar(dir, true);
		expect(avisos.filter((a) => a.startsWith('⚠'))).toEqual([]);
		expect(process.exitCode).toBeUndefined();

		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts gird-cols-3"></div>\n');
		await generar(dir, false);
		expect(process.exitCode).toBeUndefined();
	}, 30_000);

	it('también cuenta los avisos de contraste del tema', async () => {
		const dir = proyecto({ ...CONFIG, defaultStates: { ...CONFIG.defaultStates, danger: '#DC2626' } });
		await generar(dir, true);
		expect(avisos.some((a) => a.includes('contraste'))).toBe(true);
		expect(process.exitCode).toBe(1);
	}, 30_000);

	it('por la CLI: --strict sale con 1 y otro comando lo rechaza', () => {
		const dir = proyecto();
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts gird-cols-3"></div>\n');
		expect(spawnSync(TSX, [CLI, 'generate', '--strict'], { cwd: dir, encoding: 'utf8' }).status).toBe(1);
		expect(spawnSync(TSX, [CLI, 'init', '--strict'], { cwd: dir, encoding: 'utf8' }).status).not.toBe(0);
	}, 60_000);
});

describe('taisho watch — en vivo', { timeout: 30_000 }, () => {
	const CONFIG_CSS = { ...CONFIG, content: ['src/**/*.{html,css}'] };
	const conAviso = (texto: string) => avisos.filter((a) => a.includes(texto));

	it('un .css en content que pasa a usar tokens no los poda, al guardar', async () => {
		const dir = proyecto(CONFIG_CSS);
		fs.writeFileSync(path.join(dir, 'src/app.css'), '.a { color: red; }\n');
		await arrancar(dir);
		expect(leer(dir, 'theme.css')).not.toContain('--ts-fw-bold:');

		await guardarHasta(path.join(dir, 'src/app.css'), '.a { font-weight: var(--ts-fw-bold); }\n', () => leer(dir, 'theme.css').includes('--ts-fw-bold:'), 'el token entra al tema');
		expect(avisos.filter((a) => a.includes('app.css'))).toEqual([]);
	});

	it('un .css fuera de content avisa al arrancar y al guardar, una sola vez por aviso', async () => {
		const dir = proyecto();
		fs.writeFileSync(path.join(dir, 'src/app.css'), '.a { font-weight: var(--ts-fw-bold); }\n');
		await arrancar(dir);
		expect(conAviso('app.css')).toHaveLength(1);
		expect(conAviso('app.css')[0]).toContain('--ts-fw-bold');

		fs.writeFileSync(path.join(dir, 'src/app.css'), '.a { font-weight: var(--ts-fw-bold); letter-spacing: var(--ts-ls-wider); }\n');
		await esperar(() => conAviso('app.css').some((a) => a.includes('--ts-ls-wider')), 'el aviso se actualiza con la variable nueva');

		const antes = conAviso('app.css').length;
		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts flex grid"></div>\n');
		await esperar(() => logs.some((l) => /^↻ .*index\.html/.test(l)), 'línea ↻ del cambio de content');
		expect(conAviso('app.css')).toHaveLength(antes);
	});

	it('una clase inexistente se avisa al guardar, con archivo:línea, y no se repite en la recompilación siguiente', async () => {
		const dir = proyecto();
		await arrancar(dir);
		await guardarHasta(path.join(dir, 'src/index.html'), '<div class="ts flex shrink-0 input-prefix"></div>\n', () => conAviso('"input-prefix"').length > 0, 'aviso de input-prefix');
		expect(conAviso('index.html:1: "shrink-0" no existe en el DS y no se emite. ¿Se quiso decir "flex-shrink-0"?')).toHaveLength(1);

		fs.writeFileSync(path.join(dir, 'src/index.html'), '<div class="ts flex shrink-0 input-prefix grid"></div>\n');
		await esperar(() => logs.filter((l) => /^↻ .*index\.html/.test(l)).length >= 2, 'segunda recompilación');
		expect(conAviso('"shrink-0"')).toHaveLength(1);
		expect(conAviso('"input-prefix"')).toHaveLength(1);
	});

	it('un proyecto recién creado con init arranca sin avisos, aunque el JS lleve CSS en un string', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-watch-init-'));
		tmpDirs.push(dir);
		await runInit(dir);
		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex gap-base"></div>\n');
		fs.writeFileSync(path.join(dir, 'a.js'), `const s = '<style>body{display:grid;margin:0}</style>';\n`);
		fs.writeFileSync(path.join(dir, 'app.css'), 'body { display: grid; font-weight: var(--ts-fw-bold); }\n');
		await arrancar(dir);
		expect(avisos.filter((a) => !a.includes("lucide-static"))).toEqual([]);
		expect(errores).toEqual([]);
		expect(leer(dir, 'theme.css')).toContain('--ts-fw-bold:');
	});
});
