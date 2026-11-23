// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runGenerate } from './generate';

process.env.LC_ALL = 'es_AR.UTF-8';

const tmpDirs: string[] = [];
const ESTADOS = "{ success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#D42424' }";

function proyecto(tema: string): { dir: string; config: string; outDir: string } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-cli-seedfit-'));
	tmpDirs.push(dir);
	const config = path.join(dir, 'taisho.config.ts');
	fs.writeFileSync(config, `export default { themes: { principal: ${tema} }, fontFaces: [], defaultStates: ${ESTADOS}, content: ['*.html'] };\n`);
	fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex gap-base"></div>\n');
	return { dir, config, outDir: path.join(dir, 'taisho') };
}

let warnSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let spies: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
	warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
	errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	spies = [vi.spyOn(console, 'log').mockImplementation(() => {})];
});

afterEach(() => {
	warnSpy.mockRestore();
	infoSpy.mockRestore();
	errorSpy.mockRestore();
	spies.forEach((s) => s.mockRestore());
	process.exitCode = undefined;
	while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const correr = async (tema: string, strict: boolean) => {
	const { config, outDir } = proyecto(tema);
	await runGenerate({ configPath: config, outDir, strict });
};
const texto = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls.flat().join('\n');

describe('generate --strict con colores entre dos pasos', () => {
	it('seed-low-contrast es un aviso (⚠) y --strict sale con 1', async () => {
		await correr("{ colors: { brand: '#767676' } }", true);
		expect(texto(warnSpy)).toContain('⚠ Tema "principal": el color "brand" (#767676) no llega a AA en el modo claro');
		expect(process.exitCode).toBe(1);
		expect(texto(errorSpy)).toContain('--strict');
	}, 30_000);

	it('seed-exact se imprime con ℹ, no es un aviso y --strict sale con 0', async () => {
		await correr("{ colors: { brand: '#4F46E5', accent: '#2563EB' } }", true);
		expect(texto(infoSpy)).toContain('ℹ Tema "principal": el color "accent" (#2563EB) queda exacto en el modo claro');
		expect(texto(warnSpy)).toBe('');
		expect(process.exitCode).toBeUndefined();
	}, 30_000);

	it.each(['shift', 'keep'])("seedFit: '%s' no avisa ni informa y --strict sale con 0", async (eleccion) => {
		await correr(`{ colors: { brand: '#767676', accent: '#2563EB' }, seedFit: { brand: '${eleccion}', accent: '${eleccion}' } }`, true);
		expect(texto(warnSpy)).toBe('');
		expect(texto(infoSpy)).toBe('');
		expect(process.exitCode).toBeUndefined();
	}, 30_000);

	it('con un seed-exact y un seed-low-contrast, --strict cuenta sólo los avisos (los dos modos de brand, no los ℹ)', async () => {
		await correr("{ colors: { brand: '#767676', accent: '#2563EB' } }", true);
		expect(texto(errorSpy)).toContain('2 avisos');
		expect(process.exitCode).toBe(1);
	}, 30_000);

	it('un valor inválido o una clave que no es una familia del tema cortan con error', async () => {
		await correr("{ colors: { brand: '#4F46E5' }, seedFit: { brand: 'yes' } }", false);
		expect(process.exitCode).toBe(1);
		expect(texto(errorSpy)).toContain("themes.principal.seedFit.brand");
		expect(texto(errorSpy)).toContain("'shift' o 'keep'");
		process.exitCode = undefined;
		await correr("{ colors: { brand: '#4F46E5' }, seedFit: { marca: 'keep' } }", false);
		expect(process.exitCode).toBe(1);
		expect(texto(errorSpy)).toContain('"marca" no es una familia de color del tema');
	}, 30_000);
});
