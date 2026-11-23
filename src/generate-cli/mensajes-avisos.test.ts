// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { warningLine, warningText, textoMotivo, textoNotas } from './mensajes-avisos';
import { runCheck } from './check';
import { runGenerate } from './generate';
import { runMigrateTailwind } from './migrate-tailwind';
import type { MotivoTailwind } from '../generate/avisos-tipos';

process.env.LC_ALL = 'es_AR.UTF-8';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let dir: string;
let salida: string[];

const escribir = (rel: string, texto: string) => {
	fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
	fs.writeFileSync(path.join(dir, rel), texto);
};

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-cli-avisos-en-'));
	vi.spyOn(process, 'cwd').mockReturnValue(dir);
	salida = [];
	for (const m of ['log', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation((t: string) => void salida.push(t));
});

afterEach(() => {
	vi.restoreAllMocks();
	process.exitCode = undefined;
	fs.rmSync(dir, { recursive: true, force: true });
});

const BAJO = { theme: 'main', color: 'brand', seed: '#767676', mode: 'light' as const, step: '600', deltaL: -0.0367, text: 4.33, bg: 4.54, textShifted: 4.72, bgShifted: 5.3 };
const EXACTO = { theme: 'main', color: 'brand', seed: '#2563EB', mode: 'light' as const, step: '600', text: 4.6, bg: 5.17, textShifted: 4.72, bgShifted: 5.3 };

describe('avisos en inglés', () => {
	it('cada aviso se arma con sus params, con o sin ubicación', () => {
		expect(warningLine({ code: 'unknown-class', params: { class: 'md:gap-bse', suggestion: 'md:gap-base' }, file: 'a.html', line: 3 }, 'en')).toBe(
			'a.html:3: "md:gap-bse" isn\'t a DS class, so it isn\'t emitted. Did you mean "md:gap-base"?',
		);
		expect(warningLine({ code: 'out-of-order', params: { class: 'hover:md:p-base', suggestion: 'md:hover:p-base' }, file: 'a.html' }, 'en')).toBe(
			'a.html: "hover:md:p-base" is out of order and isn\'t emitted. Did you mean "md:hover:p-base"?',
		);
		expect(warningLine({ code: 'scope-option', params: {} }, 'en')).toBe("`scope: 'ts'` is already the only mode. Remove the key.");
		expect(warningText({ code: 'missing-ts', params: { element: 'div', classes: ['flex', 'gap-base'] } }, 'en')).toBe(
			'<div> uses DS classes ("flex", "gap-base") but doesn\'t have the `ts` scope class, so it gets no styles.',
		);
		expect(warningText({ code: 'modifier-with-variant', params: { class: 'md:destructive', modifier: 'destructive', utilities: ['mi-button'], suggestion: 'md:mi-button' } }, 'en')).toBe(
			'"md:destructive" isn\'t emitted. "destructive" is a modifier of "mi-button", and a modifier can\'t take a variant. Put the variant on the utility itself (e.g., "md:mi-button").',
		);
		expect(warningText({ code: 'seed-low-contrast', params: { ...BAJO, color: 'brand' } }, 'en')).toBe(
			'Theme "main": the "brand" color (#767676) doesn\'t reach AA in light mode: text on it 4.33:1 (below 4.5:1), against the background 4.54:1. ' +
				'It was moved to the edge of step 600: text on it 4.72:1, against the background 5.30:1. ' +
				"To keep it this way without a warning, write `seedFit: { brand: 'shift' }`; to keep the exact color, `seedFit: { brand: 'keep' }`.",
		);
		expect(warningText({ code: 'seed-exact', params: EXACTO }, 'en')).toBe(
			'Theme "main": the "brand" color (#2563EB) stays exact in light mode, between two steps of the scale: text on it 4.60:1, against the background 5.17:1, both meeting AA (4.5:1). ' +
				"To hide this note, write `seedFit: { brand: 'keep' }`; to move it to the edge of step 600 (text on it 4.72:1, against the background 5.30:1), `seedFit: { brand: 'shift' }`.",
		);
	});

	it('los avisos de semilla entre pasos, en español', () => {
		expect(warningText({ code: 'seed-low-contrast', params: { ...BAJO, color: 'brand' } }, 'es')).toBe(
			'Tema "main": el color "brand" (#767676) no llega a AA en el modo claro: texto encima 4,33:1 (por debajo de 4,5:1) y contra el fondo 4,54:1. ' +
				'Se adaptó al borde del paso 600: texto encima 4,72:1 y contra el fondo 5,30:1. ' +
				"Para dejarlo así sin aviso se escribe `seedFit: { brand: 'shift' }`; para conservar el color exacto, `seedFit: { brand: 'keep' }`.",
		);
		expect(warningText({ code: 'seed-exact', params: EXACTO }, 'es')).toBe(
			'Tema "main": el color "brand" (#2563EB) queda exacto en el modo claro, entre dos pasos de la escala: texto encima 4,60:1 y contra el fondo 5,17:1, los dos con AA (4,5:1). ' +
				"Para no ver esta nota se escribe `seedFit: { brand: 'keep' }`; para adaptarlo al borde del paso 600 (texto encima 4,72:1, contra el fondo 5,30:1), `seedFit: { brand: 'shift' }`.",
		);
	});

	it('una clave que no es un identificador va entre comillas en la sugerencia, y el modo oscuro se nombra', () => {
		const es = warningText({ code: 'seed-low-contrast', params: { ...BAJO, color: 'brand-2', mode: 'dark', text: 4.38, bg: 4.2 } }, 'es');
		expect(es).toContain("`seedFit: { 'brand-2': 'shift' }`");
		expect(es).toContain('en el modo oscuro: texto encima 4,38:1 (por debajo de 4,5:1) y contra el fondo 4,20:1 (por debajo de 4,5:1)');
		expect(warningText({ code: 'seed-low-contrast', params: { ...BAJO, mode: 'dark', bg: 4.2 } }, 'en')).toContain("in dark mode: text on it 4.33:1 (below 4.5:1), against the background 4.20:1 (below 4.5:1).");
	});

	it('generate --lang en imprime las líneas ⚠ en inglés', async () => {
		escribir('taisho.config.ts', "export default { scope: 'ts', themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [], content: ['*.html'] };\n");
		escribir('index.html', '<div class="ts gap-bse hover:md:p-base"></div>\n<div class="flex gap-base"></div>\n');
		await runGenerate({ configPath: path.join(dir, 'taisho.config.ts'), outDir: path.join(dir, 'taisho'), lang: 'en' });
		const avisos = salida.filter((l) => l.startsWith('⚠ '));
		expect(avisos).toContain("⚠ `scope: 'ts'` is already the only mode. Remove the key.");
		expect(avisos).toContain('⚠ index.html: "hover:md:p-base" is out of order and isn\'t emitted. Did you mean "md:hover:p-base"?');
		expect(avisos).toContain('⚠ index.html:1: "gap-bse" isn\'t a DS class, so it isn\'t emitted. Did you mean "gap-base"?');
		expect(avisos).toContain('⚠ index.html:2: <div> uses DS classes ("gap-base") but doesn\'t have the `ts` scope class, so it gets no styles.');
	}, 30_000);

	it('check --lang en: el texto y el message del JSON en inglés; code y params iguales en los dos idiomas', async () => {
		escribir('src/a.svelte', '<div class="ts-flex"></div>\n<div class="ts gap-bse"></div>\n');
		escribir('src/a.css', 'a { color: var(--color-brnd-500); }\n');
		await runCheck({ lang: 'en' });
		expect(salida).toEqual([
			'src/a.css:1:12  unknown-var  "var(--color-brnd-500)" isn\'t defined in the theme. Did you mean "--color-brand-500"?',
			'src/a.svelte:1:13  legacy-prefix  "ts-flex" has the old `ts-` prefix and no longer applies any style. Write "flex" with the `ts` class on the same element.',
			'src/a.svelte:2:16  unknown-class  "gap-bse" isn\'t a DS class, so it isn\'t emitted. Did you mean "gap-base"?',
			'taisho check: 2 files checked, 3 warnings.',
		]);

		const json = async (lang: 'es' | 'en') => {
			salida = [];
			await runCheck({ format: 'json', lang });
			return JSON.parse(salida[0]).warnings as Array<{ code: string; params: unknown; message: string }>;
		};
		const [en, es] = [await json('en'), await json('es')];
		expect(en[0]).toMatchObject({ code: 'unknown-var', params: { variable: '--color-brnd-500', suggestion: '--color-brand-500' }, message: '"var(--color-brnd-500)" isn\'t defined in the theme. Did you mean "--color-brand-500"?' });
		expect(es.map((w) => [w.code, w.params])).toEqual(en.map((w) => [w.code, w.params]));
		expect(es[0].message).toBe('"var(--color-brnd-500)" no existe en el tema. ¿Se quiso decir "--color-brand-500"?');
	});
});

describe('el reporte de migrate --from tailwind en inglés', () => {
	it('motivos y notas en inglés, sin restos de español', async () => {
		fs.cpSync(path.join(RAIZ, 'tests/fixture-tailwind/proyecto'), dir, { recursive: true });
		await runMigrateTailwind({ lang: 'en' });
		const reporte = salida.join('\n');
		expect(reporte).toContain("[conflict] Tailwind's `table` isn't what `table` is in TaishoDS (a component). The element was left untouched. Rename your class or write that CSS in your stylesheet");
		expect(reporte).toContain("shadow-lg → shadow-lg  ×1  same intent, different shadow—the TaishoDS one includes the material's 1px ring");
		expect(reporte).toContain("[variant] `dark:` doesn't exist. Dark mode comes from the theme (`light-dark()`, `createTheme`), not from a class on each element");
		expect(reporte).toContain("[base] the `blue` family isn't in your theme. Add a `blue` seed to `colors` and run again");
		expect(reporte).toContain("[apply] `@apply` isn't rewritten. Translation: `");
		expect(reporte).not.toMatch(/\b(no existe|no se|sólo|tu tema|escribí|revisalo|resolvelas|la clase|el elemento|misma intención)\b/);
		expect(reporte).not.toMatch(/[’“”]/);
	});

	it('el motivo anidado de @apply y las notas siguen el idioma', () => {
		const apply: MotivoTailwind = { code: 'apply', params: { translation: 'p-16 foo', untranslated: [{ class: 'dark:p-2', reason: { code: 'dark-variant', params: {} } }, { class: 'foo', reason: null }] } };
		expect(textoMotivo(apply, 'en')).toBe(
			"`@apply` isn't rewritten. Translation: `p-16 foo`; not translated: dark:p-2 (`dark:` doesn't exist. Dark mode comes from the theme (`light-dark()`, `createTheme`), not from a class on each element); foo (not from Tailwind)",
		);
		expect(textoNotas([{ code: 'disabled-wider', params: {} }], 'en')).toBe("`disabled:` also applies with `aria-disabled=\"true\"`. It's broader than Tailwind's on purpose");
	});
});
