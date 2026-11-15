// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { main } from './cli';
import { nodeSirve, mensajeNodeMinimo } from './node-minimo';

const RAIZ = path.resolve(import.meta.dirname, '../..');
const TSX = path.join(RAIZ, 'node_modules/.bin/tsx');
const BIN = path.join(RAIZ, 'src/bin/taisho.ts');

const argvOriginal = process.argv;
let salida: string[];
let errores: string[];

beforeEach(() => {
	salida = [];
	errores = [];
	process.exitCode = undefined;
	vi.spyOn(console, 'log').mockImplementation((...a) => void salida.push(a.join(' ')));
	vi.spyOn(console, 'error').mockImplementation((...a) => void errores.push(a.join(' ')));
});

afterEach(() => {
	vi.restoreAllMocks();
	process.argv = argvOriginal;
	process.exitCode = undefined;
});

async function correr(...args: string[]): Promise<number> {
	process.argv = ['node', 'taisho', ...args];
	await main();
	const codigo = Number(process.exitCode ?? 0);
	process.exitCode = undefined;
	return codigo;
}

const COMANDOS: Array<[string, string[]]> = [
	['init', ['init']],
	['generate', ['generate']],
	['watch', ['watch']],
	['check', ['check']],
	['migrate --from classic', ['migrate', '--from', 'classic']],
	['migrate --from tailwind', ['migrate', '--from', 'tailwind']],
];

describe('taisho sin argumentos y ayuda', () => {
	it('sin argumentos muestra la ayuda y sale con 0', async () => {
		expect(await correr('--lang', 'es')).toBe(0);
		expect(salida.join('\n')).toContain('taisho');
		expect(errores).toEqual([]);
	});

	it('--help y --version salen con 0', async () => {
		expect(await correr('--help')).toBe(0);
		expect(await correr('--version')).toBe(0);
		expect(errores).toEqual([]);
	});
});

describe('código de salida 2: error de uso, igual en todos los comandos', () => {
	it.each(COMANDOS)('%s: una opción que no existe sale con 2 y la nombra', async (_n, base) => {
		expect(await correr(...base, '--no-existe')).toBe(2);
		expect(errores.join('\n')).toContain('--no-existe');
	});

	it.each(COMANDOS)('%s: --lang con un valor inválido sale con 2', async (_n, base) => {
		expect(await correr(...base, '--lang', 'fr')).toBe(2);
		expect(errores.join('\n')).toContain('--lang "fr"');
	});

	it.each(COMANDOS)('%s: una opción sin su valor (--lang) sale con 2', async (_n, base) => {
		expect(await correr(...base, '--lang')).toBe(2);
	});

	it.each([
		['init', ['init']],
		['generate', ['generate']],
		['migrate --from classic', ['migrate', '--from', 'classic']],
	])('%s: --format no aplica y sale con 2', async (_n, base) => {
		expect(await correr(...base, '--format', 'json')).toBe(2);
		expect(errores.join('\n')).toContain('--format');
	});

	it.each([
		['init', ['init']],
		['migrate --from classic', ['migrate', '--from', 'classic']],
		['migrate --from tailwind', ['migrate', '--from', 'tailwind']],
	])('%s: --strict no aplica y sale con 2', async (_n, base) => {
		expect(await correr(...base, '--strict')).toBe(2);
		expect(errores.join('\n')).toContain('--strict');
	});

	it.each([
		['init', ['init']],
		['generate', ['generate']],
		['watch', ['watch']],
		['migrate --from tailwind', ['migrate', '--from', 'tailwind']],
	])('%s: --other-scale es sólo de check y sale con 2', async (_n, base) => {
		expect(await correr(...base, '--other-scale')).toBe(2);
		expect(errores.join('\n')).toContain('--other-scale');
	});

	it('check: --format inválido sale con 2', async () => {
		expect(await correr('check', '--format', 'xml')).toBe(2);
	});

	it('watch y check: una opción de otro comando sale con 2', async () => {
		expect(await correr('watch', '--strict')).toBe(2);
		expect(await correr('check', '--strict')).toBe(2);
		expect(await correr('watch', '--write')).toBe(2);
		expect(await correr('check', '--out', 'x')).toBe(2);
	});

	it('migrate --from tailwind: --yes no aplica y sale con 2', async () => {
		expect(await correr('migrate', '--from', 'tailwind', '--yes')).toBe(2);
	});

	it('migrate sin --from, o con un origen que no existe, sale con 2', async () => {
		expect(await correr('migrate')).toBe(2);
		expect(await correr('migrate', '--from', 'otro')).toBe(2);
		expect(errores.join('\n')).toContain('--from');
	});

	it('un comando que no existe sale con 2, lo nombra y muestra la ayuda', async () => {
		expect(await correr('inicializar', '--lang', 'es')).toBe(2);
		expect(errores.join('\n')).toContain('inicializar');
		expect(salida.join('\n')).toContain('taisho');
	});
});

describe('el ejecutable real (src/bin/taisho.ts)', () => {
	const bin = (...args: string[]) => spawnSync(TSX, [BIN, ...args], { cwd: RAIZ, encoding: 'utf8', env: { ...process.env, LC_ALL: 'es_AR.UTF-8' } });

	it('sin argumentos: ayuda y código 0', () => {
		const r = bin();
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('taisho');
	});

	it('una opción que no existe: código 2, también en init y generate', () => {
		for (const cmd of ['init', 'generate', 'check', 'watch']) expect(bin(cmd, '--no-existe').status, cmd).toBe(2);
	});

	it('un comando que no existe: código 2', () => {
		expect(bin('inicializar').status).toBe(2);
	});
});

describe('guardia de la versión de Node', () => {
	it.each([
		['22.18.0', true],
		['22.22.3', true],
		['24.0.0', true],
		['26.1.0', true],
		['22.17.9', false],
		['22.0.0', false],
		['20.19.0', false],
		['18.20.4', false],
	])('Node %s → %s', (version, sirve) => {
		expect(nodeSirve(version)).toBe(sirve);
	});

	it('el mensaje dice «hace falta Node 22.18 o superior» y la versión actual, en español', () => {
		const t = mensajeNodeMinimo('20.11.0', [], { LANG: 'es_AR.UTF-8' });
		expect(t).toContain('hace falta Node 22.18 o superior');
		expect(t).toContain('20.11.0');
	});

	it('y «Node 22.18 or newer is required» en inglés', () => {
		const t = mensajeNodeMinimo('20.11.0', [], { LANG: 'en_US.UTF-8' });
		expect(t).toContain('Node 22.18 or newer is required');
		expect(t).toContain('20.11.0');
	});

	it('--lang manda sobre el idioma del sistema', () => {
		expect(mensajeNodeMinimo('20.0.0', ['--lang', 'en'], { LANG: 'es_AR.UTF-8' })).toContain('is required');
		expect(mensajeNodeMinimo('20.0.0', ['--lang=es'], { LANG: 'en_US.UTF-8' })).toContain('hace falta');
		expect(mensajeNodeMinimo('20.0.0', ['--lang', 'fr'], { LANG: 'en_US.UTF-8' })).toContain('is required');
	});

	it('sin variables de idioma, inglés', () => {
		expect(mensajeNodeMinimo('20.0.0', [], {})).toContain('is required');
	});
});
