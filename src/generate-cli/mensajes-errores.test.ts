// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { deriveThemeVocabulary, type TaishoConfig } from '../generate/vocabulary';
import { ConfigError } from '../generate/errores-config';
import { configErrorLine } from '../generate/mensajes-errores';
import { mensajeDe } from './errores';
import { runCheck } from './check';
import { runGenerate } from './generate';

process.env.LC_ALL = 'es_AR.UTF-8';

const BASE: TaishoConfig = { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [] };
const CONFIG_MALA = `export default {
	iconsHtmlDirs: ['x'],
	themes: { principal: { colors: { brand: '#4F46E5' } } },
	fontFaces: [],
	content: ['*.html'],
	utilities: { 'mi-b': ['hover:md:flex'], 'nada.x': ['flex'] },
};
`;

let dir: string;
let salida: string[];

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-cli-errores-en-'));
	vi.spyOn(process, 'cwd').mockReturnValue(dir);
	salida = [];
	for (const m of ['log', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation((t: string) => void salida.push(t));
});

afterEach(() => {
	vi.restoreAllMocks();
	process.exitCode = undefined;
	fs.rmSync(dir, { recursive: true, force: true });
});

const atrapar = (fn: () => unknown): ConfigError => {
	try {
		fn();
	} catch (e) {
		if (e instanceof ConfigError) return e;
		throw e;
	}
	throw new Error('no lanzó');
};

describe('ConfigError', () => {
	it('trae cada error como datos y un message en español, una línea por clave', () => {
		const e = atrapar(() => deriveThemeVocabulary({ ...BASE, iconsHtmlDirs: ['x'] as never, utilities: { 'mi-b': ['hover:md:flex'] } }));
		expect(e.errors).toEqual([
			{ path: 'iconsHtmlDirs', code: 'icons-html-dirs-removed', params: {} },
			{ path: 'utilities.mi-b', code: 'utility-out-of-order', params: { class: 'hover:md:flex', suggestion: 'md:hover:flex' } },
		]);
		expect(e.message).toBe(
			'taisho config: iconsHtmlDirs ya no existe: se declara `content`.\n' +
				'taisho config: utilities.mi-b compone "hover:md:flex": la cadena está fuera de orden. ¿Se quiso decir "md:hover:flex"?',
		);
	});

	it('cada error en inglés, con la ruta tal cual', () => {
		expect(configErrorLine({ path: 'iconsHtmlDirs', code: 'icons-html-dirs-removed', params: {} }, 'en')).toBe('taisho config: iconsHtmlDirs no longer exists. Declare `content` instead.');
		expect(configErrorLine({ path: 'themes.main.colors.brand', code: 'brand-required', params: {} }, 'en')).toBe(
			"taisho config: themes.main.colors.brand is required. That seed drives the brand palette (links, accents and, unless you set `primary`, the primary buttons). Give it a hex, e.g., colors: { brand: '#4F46E5' }.",
		);
		expect(configErrorLine({ path: 'safelist[0] ("gird-cols-3")', code: 'safelist-unknown', params: { suggestion: 'grid-cols-3' } }, 'en')).toBe(
			'taisho config: safelist[0] ("gird-cols-3") isn\'t in the DS or in your utilities. Did you mean "grid-cols-3"?',
		);
		expect(configErrorLine({ path: 'utilities.mi-button.destructive', code: 'component-missing', params: { component: 'mi-button' } }, 'en')).toBe(
			'taisho config: utilities.mi-button.destructive uses the component "mi-button", which isn\'t in utilities. Declare it first, without modifiers.',
		);
	});
});

describe('los errores de config en el CLI', () => {
	it('generate --lang en los imprime en inglés, una línea por clave', async () => {
		fs.writeFileSync(path.join(dir, 'taisho.config.ts'), CONFIG_MALA);
		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex"></div>\n');
		await runGenerate({ configPath: path.join(dir, 'taisho.config.ts'), outDir: path.join(dir, 'taisho'), lang: 'en' });
		expect(process.exitCode).toBe(1);
		expect(salida.join('\n')).toContain(
			'taisho config: iconsHtmlDirs no longer exists. Declare `content` instead.\n' +
				'taisho config: utilities.mi-b composes "hover:md:flex", but the chain is out of order. Did you mean "md:hover:flex"?\n' +
				'taisho config: utilities.nada.x uses the component "nada", which isn\'t in utilities. Declare it first, without modifiers.',
		);
	}, 30_000);

	it('generate sin --lang, en una máquina en español, los imprime como siempre', async () => {
		fs.writeFileSync(path.join(dir, 'taisho.config.ts'), CONFIG_MALA);
		await runGenerate({ configPath: path.join(dir, 'taisho.config.ts'), outDir: path.join(dir, 'taisho') });
		expect(salida.join('\n')).toContain('taisho config: iconsHtmlDirs ya no existe: se declara `content`.');
	}, 30_000);

	it('check --lang en: el error de config que sube hasta el CLI se redacta en inglés', async () => {
		fs.writeFileSync(path.join(dir, 'taisho.config.ts'), "export default { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [], utilities: { 'mi-b': ['hover:md:flex'] } };\n");
		fs.writeFileSync(path.join(dir, 'a.html'), '<div class="ts flex"></div>\n');
		const err = await runCheck({ lang: 'en' }).then(() => null, (e: unknown) => e);
		expect(err).toBeInstanceOf(ConfigError);
		expect(mensajeDe(err)).toBe('taisho config: utilities.mi-b composes "hover:md:flex", but the chain is out of order. Did you mean "md:hover:flex"?');
		expect((err as Error).message).toBe('taisho config: utilities.mi-b compone "hover:md:flex": la cadena está fuera de orden. ¿Se quiso decir "md:hover:flex"?');
	});
});
