// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createServer, build, type ViteDevServer } from 'vite';
import { taisho } from './vite';
import { versionDelCore } from './descubrir-paquetes';

process.env.LC_ALL = 'es_AR.UTF-8';

const tmpDirs: string[] = [];
const servidores: ViteDevServer[] = [];

function proyecto(): string {
	const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-vite-')));
	tmpDirs.push(dir);
	fs.writeFileSync(
		path.join(dir, 'taisho.config.ts'),
		`export default { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [], defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' }, content: ['src/**/*.html'] };\n`,
	);
	fs.mkdirSync(path.join(dir, 'src'));
	fs.writeFileSync(path.join(dir, 'src/pagina.html'), '<div class="ts flex"></div>\n');
	fs.writeFileSync(path.join(dir, 'main.js'), "import './taisho/taisho.css';\n");
	return dir;
}

afterEach(async () => {
	vi.restoreAllMocks();
	while (servidores.length) await servidores.pop()!.close();
	while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function hasta(condicion: () => boolean, que: string): Promise<void> {
	const limite = Date.now() + 25_000;
	while (!condicion()) {
		if (Date.now() > limite) throw new Error(`Se agotó el tiempo esperando ${que}.`);
		await esperar(25);
	}
}

function instalarPaquete(dir: string, sombra: string): string {
	fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: { '@acme/ui': '1.0.0' } }));
	const carpeta = path.join(dir, 'node_modules/@acme/ui');
	fs.mkdirSync(carpeta, { recursive: true });
	fs.writeFileSync(path.join(carpeta, 'package.json'), JSON.stringify({ name: '@acme/ui', version: '1.0.0', exports: { './taisho.manifest.json': './taisho.manifest.json' } }));
	return escribirManifiesto(dir, sombra);
}
function escribirManifiesto(dir: string, sombra: string): string {
	const archivo = path.join(dir, 'node_modules/@acme/ui/taisho.manifest.json');
	const estilos = { roots: ['acme-glow'], utilities: `@utility ts-acme-glow { box-shadow: var(--ts-shadow-${sombra}); }` };
	fs.writeFileSync(archivo, JSON.stringify({ format: 3, core: versionDelCore(), componentFiles: {}, extension: estilos }));
	return archivo;
}

describe('taisho() — plugin de Vite', () => {
	it('buildStart genera y espera: el CSS está en disco antes de que arranque el build', async () => {
		const dir = proyecto();
		await build({
			root: dir,
			configFile: false,
			logLevel: 'silent',
			plugins: [taisho()],
			build: { write: false, lib: { entry: 'main.js', formats: ['es'], cssFileName: 'x' } },
		});
		const css = fs.readFileSync(path.join(dir, 'taisho/taisho.css'), 'utf8');
		expect(css).toContain(':where(.ts).flex');
		expect(fs.existsSync(path.join(dir, 'taisho/theme.css'))).toBe(true);
	});

	it('un error de config corta el build', async () => {
		const dir = proyecto();
		fs.writeFileSync(path.join(dir, 'taisho.config.ts'), 'export default {};\n');
		await expect(
			build({ root: dir, configFile: false, logLevel: 'silent', plugins: [taisho()], build: { write: false, lib: { entry: 'main.js', formats: ['es'], cssFileName: 'x' } } }),
		).rejects.toThrow(/TaishoConfig válido/);
	});

	it('HMR: el CSS cambia en disco ANTES de que salga el update; sin cambio de bytes, no se escribe', async () => {
		const dir = proyecto();
		const servidor = await createServer({
			root: dir,
			configFile: false,
			logLevel: 'silent',
			plugins: [taisho()],
			server: { middlewareMode: true },
			optimizeDeps: { noDiscovery: true },
		});
		servidores.push(servidor);
		await servidor.pluginContainer.buildStart({});
		await servidor.transformRequest('/main.js');
		await servidor.transformRequest('/taisho/taisho.css');

		const cssPath = path.join(dir, 'taisho/taisho.css');
		const pagina = path.join(dir, 'src/pagina.html');
		const visto: { css: string; mtime: number; rutas: string[] }[] = [];
		const hot = servidor.environments.client.hot;
		const enviar = hot.send.bind(hot);
		hot.send = ((payload: { type?: string; updates?: { path: string }[] }) => {
			if (payload?.type === 'update') {
				visto.push({ css: fs.readFileSync(cssPath, 'utf8'), mtime: fs.statSync(cssPath).mtimeMs, rutas: payload.updates!.map((u) => u.path) });
			}
			return enviar(payload as never);
		}) as never;

		const escrituras = vi.spyOn(fs, 'writeFileSync');
		const escriturasDelCss = () => escrituras.mock.calls.filter(([destino]) => destino === cssPath).length;

		const mtimeAntes = fs.statSync(cssPath).mtimeMs;
		await esperar(20);

		fs.writeFileSync(pagina, '<div class="ts flex gap-base"></div>\n');
		servidor.watcher.emit('change', pagina);
		await hasta(() => visto.some((v) => v.css.includes('.gap-base')), 'el update de HMR con gap-base');
		const update = visto.find((v) => v.css.includes('.gap-base'))!;
		expect(update.mtime).toBeGreaterThan(mtimeAntes);
		expect(update.rutas.some((r) => r.endsWith('taisho/taisho.css'))).toBe(true);
		const escriturasTras1 = escriturasDelCss();

		fs.writeFileSync(pagina, '<div class="gap-base ts flex"> otro texto </div>\n');
		servidor.watcher.emit('change', pagina);

		fs.writeFileSync(pagina, '<div class="ts flex gap-base gap-half"></div>\n');
		servidor.watcher.emit('change', pagina);
		await hasta(() => visto.some((v) => v.css.includes('.gap-half')), 'el update de HMR con gap-half');
		expect(escriturasDelCss()).toBe(escriturasTras1 + 1);
	}, 60_000);

	it('HMR: al cambiar la config se regenera con la config NUEVA y sale el update', async () => {
		const dir = proyecto();
		fs.writeFileSync(path.join(dir, 'main.js'), "import './taisho/taisho.css';\nimport './taisho/theme.css';\n");
		const servidor = await createServer({
			root: dir,
			configFile: false,
			logLevel: 'silent',
			plugins: [taisho()],
			server: { middlewareMode: true },
			optimizeDeps: { noDiscovery: true },
		});
		servidores.push(servidor);
		await servidor.pluginContainer.buildStart({});
		await servidor.transformRequest('/main.js');
		await servidor.transformRequest('/taisho/taisho.css');
		await servidor.transformRequest('/taisho/theme.css');

		const themePath = path.join(dir, 'taisho/theme.css');
		const antes = fs.readFileSync(themePath, 'utf8');
		// Se anota qué había en theme.css en el instante de cada update: el que cuenta es el que sale con la config nueva ya escrita
		// (con la máquina cargada puede llegar antes un update atrasado de la generación inicial).
		const actualizaciones: string[] = [];
		const hot = servidor.environments.client.hot;
		const enviar = hot.send.bind(hot);
		hot.send = ((payload: { type?: string; updates?: { path: string }[] }) => {
			if (payload?.type === 'update' && payload.updates!.some((u) => u.path.endsWith('taisho/theme.css')) && fs.readFileSync(themePath, 'utf8') !== antes) actualizaciones.push('taisho/theme.css');
			return enviar(payload as never);
		}) as never;

		const configPath = path.join(dir, 'taisho.config.ts');
		fs.writeFileSync(configPath, fs.readFileSync(configPath, 'utf8').replace('#4F46E5', '#E11D48'));
		servidor.watcher.emit('change', configPath);
		await hasta(() => actualizaciones.some((r) => r.endsWith('taisho/theme.css')), 'el update de HMR del tema');
		const despues = fs.readFileSync(themePath, 'utf8');
		expect(despues).not.toBe(antes);
	}, 60_000);

	async function servidorConEspia(dir: string) {
		const servidor = await createServer({
			root: dir,
			configFile: false,
			logLevel: 'silent',
			plugins: [taisho()],
			server: { middlewareMode: true },
			optimizeDeps: { noDiscovery: true },
		});
		servidores.push(servidor);
		await servidor.pluginContainer.buildStart({});
		await servidor.transformRequest('/main.js');
		await servidor.transformRequest('/taisho/taisho.css');
		const cssPath = path.join(dir, 'taisho/taisho.css');
		const visto: { css: string; rutas: string[] }[] = [];
		const hot = servidor.environments.client.hot;
		const enviar = hot.send.bind(hot);
		hot.send = ((payload: { type?: string; updates?: { path: string }[] }) => {
			if (payload?.type === 'update') visto.push({ css: fs.readFileSync(cssPath, 'utf8'), rutas: payload.updates!.map((u) => u.path) });
			return enviar(payload as never);
		}) as never;
		return { servidor, visto };
	}

	it('HMR: un archivo NUEVO de content regenera el CSS y sale el update', async () => {
		const dir = proyecto();
		const { servidor, visto } = await servidorConEspia(dir);
		const nueva = path.join(dir, 'src/otra.html');
		fs.writeFileSync(nueva, '<div class="ts gap-base"></div>\n');
		servidor.watcher.emit('add', nueva);
		await hasta(() => visto.some((v) => v.css.includes('.gap-base')), 'el update de HMR del alta');
		expect(visto.find((v) => v.css.includes('.gap-base'))!.rutas.some((r) => r.endsWith('taisho/taisho.css'))).toBe(true);
	}, 60_000);

	it('HMR: borrar un archivo de content regenera el CSS sin sus clases y sale el update', async () => {
		const dir = proyecto();
		const extra = path.join(dir, 'src/extra.html');
		fs.writeFileSync(extra, '<div class="ts gap-base"></div>\n');
		const { servidor, visto } = await servidorConEspia(dir);
		expect(fs.readFileSync(path.join(dir, 'taisho/taisho.css'), 'utf8')).toContain('.gap-base');
		fs.rmSync(extra);
		servidor.watcher.emit('unlink', extra);
		// Con la máquina cargada puede llegar antes un update atrasado del alta del archivo (todavía con la clase): se espera el de la baja.
		await hasta(() => visto.some((v) => !v.css.includes('.gap-base')), 'el update de HMR de la baja');
		const baja = visto.find((v) => !v.css.includes('.gap-base'))!;
		expect(baja.rutas.some((r) => r.endsWith('taisho/taisho.css'))).toBe(true);
	}, 60_000);

	it('HMR: cambiar el manifiesto de un paquete (o su package.json) recompila con los estilos nuevos', async () => {
		const dir = proyecto();
		const manifiesto = instalarPaquete(dir, 'md');
		fs.writeFileSync(path.join(dir, 'src/pagina.html'), '<div class="ts flex acme-glow"></div>\n');
		const { servidor, visto } = await servidorConEspia(dir);
		const css = () => fs.readFileSync(path.join(dir, 'taisho/taisho.css'), 'utf8');
		expect(css()).toContain('--ts-shadow-md');
		expect(css()).not.toContain('--ts-shadow-lg');

		escribirManifiesto(dir, 'lg');
		servidor.watcher.emit('change', manifiesto);
		await hasta(() => visto.some((v) => v.css.includes('--ts-shadow-lg')), 'el update de HMR del manifiesto');
		expect(visto.find((v) => v.css.includes('--ts-shadow-lg'))!.rutas.some((r) => r.endsWith('taisho/taisho.css'))).toBe(true);

		escribirManifiesto(dir, 'sm');
		servidor.watcher.emit('change', path.join(dir, 'package.json'));
		await hasta(() => visto.some((v) => v.css.includes('--ts-shadow-sm')), 'el update de HMR del package.json');
	}, 60_000);

	it('con el watcher REAL de Vite (que ignora node_modules), un cambio del manifiesto de un paquete igual recompila', async () => {
		const dir = proyecto();
		instalarPaquete(dir, 'md');
		fs.writeFileSync(path.join(dir, 'src/pagina.html'), '<div class="ts flex acme-glow"></div>\n');
		const servidor = await createServer({ root: dir, configFile: false, logLevel: 'silent', plugins: [taisho()], optimizeDeps: { noDiscovery: true } });
		servidores.push(servidor);
		await servidor.listen(0);
		await servidor.pluginContainer.buildStart({});
		const css = () => fs.readFileSync(path.join(dir, 'taisho/taisho.css'), 'utf8');
		expect(css()).toContain('--ts-shadow-md');
		await esperar(300);
		escribirManifiesto(dir, 'lg');
		await hasta(() => css().includes('--ts-shadow-lg'), 'el CSS con los estilos nuevos del manifiesto');
	}, 60_000);
});
