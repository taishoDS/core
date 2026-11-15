// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runInit } from './init';

const terminal = vi.hoisted(() => ({ respuestas: [] as string[], preguntas: [] as string[] }));
vi.mock('node:readline/promises', () => ({
	default: {
		createInterface: () => ({
			question: async (pregunta: string) => (terminal.preguntas.push(pregunta), terminal.respuestas.shift() ?? ''),
			close() {},
		}),
	},
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
