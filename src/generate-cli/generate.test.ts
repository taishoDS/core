// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadConfig, runGenerate } from './generate';

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

describe('runGenerate — CLI de la Entrega B', () => {
	it('compila un taisho.config.ts válido a una carpeta autocontenida', async () => {
		const outDir = makeTmpDir('taisho-cli-out-');

		await runGenerate({
			configPath: path.resolve('tests/fixture-marca-ajena/taisho.config.fixture.ts'),
			outDir,
		});

		expect(process.exitCode).toBeUndefined();
		const themeCSS = fs.readFileSync(path.join(outDir, 'theme.css'), 'utf8');
		expect(themeCSS).toContain('--color-brand');
		expect(fs.existsSync(path.join(outDir, 'fonts.css'))).toBe(true);
		expect(fs.existsSync(path.join(outDir, 'taisho.full.css'))).toBe(true);
		expect(fs.existsSync(path.join(outDir, 'src'))).toBe(false);
	}, 30_000);

	it('falla con exit code 1 si el config no existe', async () => {
		await runGenerate({ configPath: path.join(os.tmpdir(), 'no-existe.config.ts') });
		expect(process.exitCode).toBe(1);
		expect(errorSpy).toHaveBeenCalled();
	});

	it('falla con exit code 1 si el config no exporta un TaishoConfig válido', async () => {
		const dir = makeTmpDir('taisho-cli-bad-');
		const badConfig = path.join(dir, 'taisho.config.ts');
		fs.writeFileSync(badConfig, 'export default {};\n');

		await runGenerate({ configPath: badConfig });

		expect(process.exitCode).toBe(1);
		expect(errorSpy).toHaveBeenCalled();
	});
});

describe('loadConfig', () => {
	it('sin caché: tras editar el archivo, la segunda carga devuelve la config nueva', async () => {
		const dir = makeTmpDir('taisho-load-');
		const archivo = path.join(dir, 'taisho.config.ts');
		fs.writeFileSync(archivo, 'export default { themes: { a: {} } };\n');
		expect(Object.keys(((await loadConfig(archivo)) as { themes: object }).themes)).toEqual(['a']);
		fs.writeFileSync(archivo, 'export default { themes: { b: {} } };\n');
		expect(Object.keys(((await loadConfig(archivo)) as { themes: object }).themes)).toEqual(['b']);
	});
});
