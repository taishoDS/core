// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { gestorDetectado, runInit, salidaDetectada } from './init';

const terminal = vi.hoisted(() => ({ respuestas: [] as string[], preguntas: [] as string[] }));
vi.mock('node:readline/promises', () => ({
	default: {
		createInterface: () => ({
			question: async (pregunta: string) => (terminal.preguntas.push(pregunta), terminal.respuestas.shift() ?? ''),
			close() {},
		}),
	},
}));

const instalador = vi.hoisted(() => ({ llamadas: [] as Array<{ cmd: string; args: string[]; cwd?: string }>, status: 0 as number | null }));
vi.mock('node:child_process', () => ({
	spawnSync: (cmd: string, args: string[], opts: { cwd?: string }) => (instalador.llamadas.push({ cmd, args, cwd: opts.cwd }), { status: instalador.status }),
}));

const tmpDirs: string[] = [];

function makeTmpDir(prefix: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tmpDirs.push(dir);
	return dir;
}

let errorSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
	errorSpy.mockRestore();
	logSpy.mockRestore();
	process.exitCode = undefined;
	while (tmpDirs.length) {
		fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
	}
});

describe('runInit — CLI de la Entrega B', () => {
	it('scaffoldea un taisho.config.ts con un TaishoConfig real', async () => {
		const dir = makeTmpDir('taisho-cli-init-');

		await runInit(dir);

		expect(process.exitCode).toBeUndefined();
		const contenido = fs.readFileSync(path.join(dir, 'taisho.config.ts'), 'utf8');
		expect(contenido).toContain('TaishoConfig');
		expect(contenido).toContain('themes');
		expect(contenido).toContain('export default config');
	});

	it('no pisa un taisho.config.ts existente', async () => {
		const dir = makeTmpDir('taisho-cli-init-existente-');
		const configPath = path.join(dir, 'taisho.config.ts');
		fs.writeFileSync(configPath, '// config del usuario, no tocar\n');

		await runInit(dir);

		expect(process.exitCode).toBe(1);
		expect(fs.readFileSync(configPath, 'utf8')).toBe('// config del usuario, no tocar\n');
	});
});

describe('runInit — el idioma', () => {
	const tty = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
	const lcAll = process.env.LC_ALL;
	afterEach(() => {
		if (tty) Object.defineProperty(process.stdin, 'isTTY', tty);
		else delete (process.stdin as { isTTY?: boolean }).isTTY;
		process.env.LC_ALL = lcAll;
		terminal.respuestas = [];
		terminal.preguntas = [];
	});
	const conTty = () => Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

	it('interactivo: pregunta el idioma primero, con el del sistema como default, y el resto sale en el elegido', async () => {
		process.env.LC_ALL = 'es_AR.UTF-8';
		conTty();
		terminal.respuestas = ['en'];
		const dir = makeTmpDir('taisho-cli-init-idioma-');

		await runInit(dir);

		expect(terminal.preguntas).toEqual([
			'Idioma de los mensajes (es/en) [es]: ',
			'Brand color (hex) [#4F46E5]: ',
			'Theme name [main]: ',
			'Fonts — (s)ystem or (f)ontsource [s]: ',
			'Folder for your own icons [src/icons]: ',
			'Output folder for the CSS and JS [./taisho]: ',
		]);
		expect(fs.readFileSync(path.join(dir, 'taisho.config.ts'), 'utf8')).toContain("\tlang: 'en',\n");
		expect(logSpy.mock.calls[0][0]).toMatch(/^✅ Created /);
	});

	it('interactivo: Enter deja el detectado; con --lang no lo pregunta', async () => {
		process.env.LC_ALL = 'en_US.UTF-8';
		conTty();
		const dir = makeTmpDir('taisho-cli-init-idioma-');
		await runInit(path.join(dir, 'a'));
		expect(terminal.preguntas[0]).toBe('Message language (es/en) [en]: ');
		expect(fs.readFileSync(path.join(dir, 'a/taisho.config.ts'), 'utf8')).toContain("\tlang: 'en',\n");

		terminal.preguntas = [];
		await runInit(path.join(dir, 'b'), { lang: 'es' });
		expect(terminal.preguntas[0]).toBe('Color de marca (hex) [#4F46E5]: ');
		expect(fs.readFileSync(path.join(dir, 'b/taisho.config.ts'), 'utf8')).toContain("\tlang: 'es',\n");
	});

	it('sin TTY no pregunta y guarda el del sistema', async () => {
		process.env.LC_ALL = 'en_US.UTF-8';
		Object.defineProperty(process.stdin, 'isTTY', { value: undefined, configurable: true });
		const dir = makeTmpDir('taisho-cli-init-idioma-');
		await runInit(dir);
		expect(terminal.preguntas).toEqual([]);
		expect(fs.readFileSync(path.join(dir, 'taisho.config.ts'), 'utf8')).toContain("\tlang: 'en',\n");
	});
});

describe('runInit — la carpeta de salida', () => {
	const tty = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
	afterEach(() => {
		if (tty) Object.defineProperty(process.stdin, 'isTTY', tty);
		else delete (process.stdin as { isTTY?: boolean }).isTTY;
		terminal.respuestas = [];
		terminal.preguntas = [];
	});
	const proyecto = (...carpetas: string[]) => {
		const dir = makeTmpDir('taisho-cli-init-salida-');
		for (const c of carpetas) fs.mkdirSync(path.join(dir, c));
		return dir;
	};
	const salidaDe = (dir: string) => /^\tout: '(.*)',$/m.exec(fs.readFileSync(path.join(dir, 'taisho.config.ts'), 'utf8'))?.[1];

	it('propone public/taisho, static/taisho o ./taisho según las carpetas del proyecto', () => {
		expect(salidaDetectada(proyecto())).toBe('./taisho');
		expect(salidaDetectada(proyecto('public'))).toBe('public/taisho');
		expect(salidaDetectada(proyecto('static'))).toBe('static/taisho');
	});

	it('con public/ y static/ elige public/', () => {
		expect(salidaDetectada(proyecto('public', 'static'))).toBe('public/taisho');
	});

	it('con un empaquetador en el package.json propone ./taisho aunque existan public/ o static/', () => {
		const conPaquete = (deps: object, ...carpetas: string[]) => {
			const dir = proyecto(...carpetas);
			fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(deps));
			return dir;
		};
		expect(salidaDetectada(conPaquete({ devDependencies: { vite: '^8.0.0' } }, 'public'))).toBe('./taisho');
		expect(salidaDetectada(conPaquete({ devDependencies: { '@sveltejs/kit': '^2.0.0' } }, 'static'))).toBe('./taisho');
		expect(salidaDetectada(conPaquete({ dependencies: { next: '15.0.0' } }, 'public'))).toBe('./taisho');
		expect(salidaDetectada(conPaquete({ dependencies: { '@remix-run/react': '2.0.0' } }, 'public'))).toBe('./taisho');
		expect(salidaDetectada(conPaquete({ peerDependencies: { webpack: '5' } }, 'public', 'static'))).toBe('./taisho');
	});

	it('un package.json sin empaquetador, vacío o roto no cambia la regla de las carpetas', () => {
		const sin = proyecto('public');
		fs.writeFileSync(path.join(sin, 'package.json'), JSON.stringify({ dependencies: { 'lucide-static': '1.0.0', viteish: '1' } }));
		expect(salidaDetectada(sin)).toBe('public/taisho');
		const roto = proyecto('static');
		fs.writeFileSync(path.join(roto, 'package.json'), '{ no es json');
		expect(salidaDetectada(roto)).toBe('static/taisho');
	});

	it('un archivo llamado public no cuenta como carpeta', () => {
		const dir = proyecto();
		fs.writeFileSync(path.join(dir, 'public'), '');
		expect(salidaDetectada(dir)).toBe('./taisho');
	});

	it('sin preguntas (-y o sin TTY) escribe `out` con la detectada, siempre', async () => {
		Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
		const conPublic = proyecto('public');
		await runInit(conPublic, { yes: true, lang: 'es' });
		expect(salidaDe(conPublic)).toBe('public/taisho');
		const limpio = proyecto();
		await runInit(limpio, { yes: true, lang: 'es' });
		expect(salidaDe(limpio)).toBe('./taisho');
		expect(terminal.preguntas).toEqual([]);
	});

	it('interactivo: la pregunta trae la detectada como default; Enter la deja y una respuesta la cambia', async () => {
		Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
		const a = proyecto('static');
		await runInit(a, { lang: 'es' });
		expect(terminal.preguntas.at(-1)).toBe('Carpeta de salida del CSS y el JS [static/taisho]: ');
		expect(salidaDe(a)).toBe('static/taisho');

		terminal.respuestas = ['', '', '', '', 'public/css/taisho'];
		const b = proyecto('static');
		await runInit(b, { lang: 'es' });
		expect(salidaDe(b)).toBe('public/css/taisho');
	});
});

describe('runInit — lucide-static', () => {
	const tty = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
	const conTty = () => Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
	const sinTty = () => Object.defineProperty(process.stdin, 'isTTY', { value: undefined, configurable: true });
	// idioma, marca, tema, fuentes, íconos propios, salida; la de lucide va después
	const RESTO = ['es', '', '', '', '', ''];
	afterEach(() => {
		if (tty) Object.defineProperty(process.stdin, 'isTTY', tty);
		else delete (process.stdin as { isTTY?: boolean }).isTTY;
		terminal.respuestas = [];
		terminal.preguntas = [];
		instalador.llamadas = [];
		instalador.status = 0;
	});
	const proyecto = (...archivos: string[]) => {
		const dir = makeTmpDir('taisho-cli-init-lucide-');
		fs.writeFileSync(path.join(dir, 'package.json'), '{}');
		for (const a of archivos) fs.writeFileSync(path.join(dir, a), '');
		return dir;
	};
	const pregunta = () => terminal.preguntas.at(-1);

	it('interactivo, acepta: instala como dependencia de desarrollo y muestra el comando', async () => {
		conTty();
		terminal.respuestas = [...RESTO, ''];
		const dir = proyecto();
		await runInit(dir);
		expect(pregunta()).toBe('¿Instalar los íconos de Lucide (lucide-static)? (s/n) [s]: ');
		expect(instalador.llamadas).toEqual([{ cmd: 'npm', args: ['install', '-D', 'lucide-static'], cwd: dir }]);
		expect(logSpy).toHaveBeenCalledWith('→ npm install -D lucide-static');
		expect(process.exitCode).toBeUndefined();
	});

	it('interactivo, rechaza: no instala', async () => {
		conTty();
		terminal.respuestas = [...RESTO, 'n'];
		await runInit(proyecto());
		expect(terminal.preguntas.at(-1)).toContain('lucide-static');
		expect(instalador.llamadas).toEqual([]);
	});

	it('interactivo, en inglés: pregunta y avisa en inglés', async () => {
		conTty();
		terminal.respuestas = ['en', '', '', '', '', '', 'y'];
		await runInit(proyecto());
		expect(terminal.preguntas.at(-1)).toBe('Install the Lucide icons (lucide-static)? (y/n) [y]: ');
		expect(instalador.llamadas).toHaveLength(1);
	});

	it('ya instalado: no pregunta ni instala', async () => {
		conTty();
		terminal.respuestas = RESTO;
		const dir = proyecto();
		fs.mkdirSync(path.join(dir, 'node_modules/lucide-static'), { recursive: true });
		fs.writeFileSync(path.join(dir, 'node_modules/lucide-static/icon-nodes.json'), '{}');
		await runInit(dir);
		expect(terminal.preguntas.some((p) => p.includes('lucide'))).toBe(false);
		expect(instalador.llamadas).toEqual([]);
	});

	it('sin TTY: no instala e imprime el comando exacto', async () => {
		sinTty();
		await runInit(proyecto('pnpm-lock.yaml'));
		expect(terminal.preguntas).toEqual([]);
		expect(instalador.llamadas).toEqual([]);
		expect(logSpy.mock.calls.flat().join('\n')).toContain('`pnpm add -D lucide-static`');
	});

	it('sin TTY con installIcons: instala sin preguntar', async () => {
		sinTty();
		const dir = proyecto('yarn.lock');
		await runInit(dir, { installIcons: true });
		expect(terminal.preguntas).toEqual([]);
		expect(instalador.llamadas).toEqual([{ cmd: 'yarn', args: ['add', '-D', 'lucide-static'], cwd: dir }]);
	});

	it('sin package.json: no ofrece nada', async () => {
		sinTty();
		await runInit(makeTmpDir('taisho-cli-init-sinpkg-'), { installIcons: true });
		expect(instalador.llamadas).toEqual([]);
	});

	it('si la instalación falla, init termina bien y muestra el comando a mano', async () => {
		sinTty();
		instalador.status = 1;
		const dir = proyecto();
		await runInit(dir, { installIcons: true, lang: 'en' });
		expect(process.exitCode).toBeUndefined();
		expect(fs.existsSync(path.join(dir, 'taisho.config.ts'))).toBe(true);
		expect(errorSpy.mock.calls.flat().join('\n')).toContain('install it by hand with `npm install -D lucide-static`');
	});

	it('detecta el gestor por el lockfile; sin ninguno, npm', () => {
		expect(gestorDetectado(proyecto())).toBe('npm');
		expect(gestorDetectado(proyecto('package-lock.json'))).toBe('npm');
		expect(gestorDetectado(proyecto('pnpm-lock.yaml'))).toBe('pnpm');
		expect(gestorDetectado(proyecto('yarn.lock'))).toBe('yarn');
		expect(gestorDetectado(proyecto('bun.lockb'))).toBe('bun');
		expect(gestorDetectado(proyecto('bun.lock'))).toBe('bun');
	});
});
