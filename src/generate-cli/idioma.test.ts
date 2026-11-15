// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { idiomaDelSistema, usarIdioma, idioma } from './idioma';
import { MENSAJES } from './mensajes';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let dir: string;

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-cli-idioma-'));
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

const correr = (sistema: string, ...args: string[]) => {
	const env = { ...process.env, LC_ALL: sistema, LC_MESSAGES: '', LANG: '' };
	return spawnSync(path.join(RAIZ, 'node_modules/.bin/tsx'), [path.join(RAIZ, 'src/bin/taisho.ts'), ...args], { cwd: dir, encoding: 'utf8', env });
};
const config = (lang?: string) =>
	fs.writeFileSync(path.join(dir, 'taisho.config.ts'), `export default { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: []${lang ? `, lang: '${lang}'` : ''} };\n`);
const limpio = () => fs.writeFileSync(path.join(dir, 'a.html'), '<div class="ts flex"></div>\n');

describe('idioma del sistema', () => {
	it('LC_ALL > LC_MESSAGES > LANG; es* es español y cualquier otro, inglés', () => {
		expect(idiomaDelSistema({ LC_ALL: 'es_AR.UTF-8', LANG: 'en_US.UTF-8' })).toBe('es');
		expect(idiomaDelSistema({ LC_ALL: 'en_US.UTF-8', LANG: 'es_ES.UTF-8' })).toBe('en');
		expect(idiomaDelSistema({ LC_MESSAGES: 'es_MX', LANG: 'en_US' })).toBe('es');
		expect(idiomaDelSistema({ LC_ALL: '', LANG: 'es' })).toBe('es');
		expect(idiomaDelSistema({ LANG: 'C.UTF-8' })).toBe('en');
		expect(idiomaDelSistema({ LANG: 'pt_BR.UTF-8' })).toBe('en');
		expect(idiomaDelSistema({})).toBe('en');
	});

	it('usarIdioma: flag > config > sistema; un lang de config que no es es/en se ignora', () => {
		const antes = process.env.LC_ALL;
		process.env.LC_ALL = 'es_AR.UTF-8';
		try {
			expect(usarIdioma('en', { lang: 'es' })).toBe('en');
			expect(usarIdioma(undefined, { lang: 'en' })).toBe('en');
			expect(idioma()).toBe('en');
			expect(usarIdioma(undefined, { lang: 'fr' })).toBe('es');
			expect(usarIdioma(undefined, null)).toBe('es');
		} finally {
			process.env.LC_ALL = antes;
		}
	});

	it('el catálogo tiene las mismas claves en los dos idiomas', () => {
		const claves = (o: object, pre = ''): string[] =>
			Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? claves(v, `${pre}${k}.`) : [`${pre}${k}`]));
		expect(claves(MENSAJES.en)).toEqual(claves(MENSAJES.es));
	});
});

// Cada caso arranca el ejecutable con tsx (un proceso nuevo): con la máquina cargada pasa los 5 s por defecto sin que nada esté mal.
describe('taisho en los dos idiomas — el ejecutable', { timeout: 60_000 }, () => {
	it('sin config manda el sistema', () => {
		limpio();
		expect(correr('es_AR.UTF-8', 'check').stdout).toBe('taisho check: 1 archivo(s) revisado(s), 0 aviso(s).\n');
		expect(correr('en_US.UTF-8', 'check').stdout).toBe('taisho check: 1 file checked, 0 warnings.\n');
		expect(correr('C', 'check').stdout).toBe('taisho check: 1 file checked, 0 warnings.\n');
	});

	it('el lang de la config manda sobre el sistema, y --lang sobre los dos', () => {
		limpio();
		config('es');
		expect(correr('en_US.UTF-8', 'check').stdout).toBe('taisho check: 2 archivo(s) revisado(s), 0 aviso(s).\n');
		expect(correr('en_US.UTF-8', 'check', '--lang', 'en').stdout).toBe('taisho check: 2 files checked, 0 warnings.\n');
		config('en');
		expect(correr('es_AR.UTF-8', 'check').stdout).toBe('taisho check: 2 files checked, 0 warnings.\n');
		expect(correr('es_AR.UTF-8', 'check', '--lang=es').stdout).toBe('taisho check: 2 archivo(s) revisado(s), 0 aviso(s).\n');
	});

	it('los errores de uso, en inglés y con el mismo código de salida (2) en todos los comandos', () => {
		limpio();
		const nada = correr('en_US.UTF-8', 'generate', '--nada');
		expect([nada.status, nada.stderr]).toEqual([2, 'Unknown option --nada. Run `taisho --help` to see the options.\n']);
		const formato = correr('es_AR.UTF-8', 'check', '--format', 'xml', '--lang', 'en');
		expect([formato.status, formato.stderr]).toEqual([2, '--format "xml" isn\'t valid. Use text or json.\n']);
		const lang = correr('en_US.UTF-8', 'check', '--lang', 'fr');
		expect([lang.status, lang.stderr]).toEqual([2, '--lang "fr" isn\'t valid. Use es or en.\n']);
		const sinConfig = correr('en_US.UTF-8', 'generate');
		expect([sinConfig.status, sinConfig.stderr]).toEqual([1, "Couldn't find taisho.config.ts.\nRun `taisho init` to create one.\n"]);
		expect(correr('en_US.UTF-8', '--help').stdout).toContain('taisho --lang <es|en>          Message language');
		expect(correr('es_AR.UTF-8', 'generate', '--nada').stderr).toBe('La opción --nada no existe: `taisho --help` lista las que hay.\n');
	});

	it('los reportes de migrate, en inglés', () => {
		fs.writeFileSync(path.join(dir, 'a.html'), '<div class="flex p-4"></div>\n');
		const tw = correr('en_US.UTF-8', 'migrate', '--from', 'tailwind');
		expect(tw.status).toBe(0);
		expect(tw.stdout).toContain('taisho migrate --from tailwind — dry run, nothing was written. Add --write to apply.\n');
		expect(tw.stdout).toContain('To convert (1 file):\n  a.html  2 converted, 1 `ts` scope class\n');
		expect(tw.stdout).toContain('\nTo finish:\n');
		fs.writeFileSync(path.join(dir, 'a.html'), '<div class="ts-flex"></div>\n');
		const clasico = correr('en_US.UTF-8', 'migrate', '--from', 'classic');
		expect(clasico.stdout).toContain('Summary: 1 file checked, 1 to modify; 1 class to scope, 1 `ts` scope class, 0 renames.\n');
	});

	it('init sin TTY no pregunta y guarda el idioma detectado (o el de --lang)', () => {
		const en = correr('en_US.UTF-8', 'init', 'en');
		expect(en.status).toBe(0);
		expect(en.stdout).toBe('✅ Created en/taisho.config.ts\n   Edit the colors and run `taisho generate` to compile your CSS.\n');
		const textoEn = fs.readFileSync(path.join(dir, 'en/taisho.config.ts'), 'utf8');
		expect(textoEn).toContain("\tlang: 'en',\n");
		expect(textoEn).toContain('// Seed colors (hex).');

		const es = correr('es_AR.UTF-8', 'init', 'es');
		expect(es.stdout).toBe('✅ Creado es/taisho.config.ts\n   Se editan los colores y se corre `taisho generate` para compilar tu CSS.\n');
		expect(fs.readFileSync(path.join(dir, 'es/taisho.config.ts'), 'utf8')).toContain("\tlang: 'es',\n");

		correr('en_US.UTF-8', 'init', 'flag', '--lang', 'es');
		expect(fs.readFileSync(path.join(dir, 'flag/taisho.config.ts'), 'utf8')).toContain("\tlang: 'es',\n");
	});
});
