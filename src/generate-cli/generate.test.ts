// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { carpetaDeSalida, displayPath, loadConfig, rutaParaPegar, runGenerate } from './generate';

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

const configEn = (dir: string, extra: string) => {
	const archivo = path.join(dir, 'taisho.config.ts');
	fs.writeFileSync(archivo, `export default { themes: { a: { colors: { brand: '#4F46E5' } } }, fontFaces: [], defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#D42424' }, ${extra} };\n`);
	return archivo;
};
const impreso = () => logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');

describe('la carpeta de salida', () => {
	const cfg = path.resolve('/proyecto/taisho.config.ts');
	it('--out > out de la config (relativa a la config) > ./taisho junto a la config', () => {
		expect(carpetaDeSalida({ out: 'public/taisho' }, cfg, '/otra/carpeta', '/donde/se/corre')).toBe(path.resolve('/otra/carpeta'));
		expect(carpetaDeSalida({ out: 'public/taisho' }, cfg, undefined, '/donde/se/corre')).toBe(path.resolve('/proyecto/public/taisho'));
		expect(carpetaDeSalida({}, cfg, undefined, '/donde/se/corre')).toBe(path.resolve('/proyecto/taisho'));
		expect(carpetaDeSalida(null, cfg, undefined, '/donde/se/corre')).toBe(path.resolve('/proyecto/taisho'));
	});

	it('las rutas para pegar salen como las ve el navegador: sin public/ ni static/, con / adelante', () => {
		const conf = path.resolve('/proyecto');
		expect(rutaParaPegar(path.resolve('/proyecto/public/taisho'), 'taisho.css', conf)).toBe('/taisho/taisho.css');
		expect(rutaParaPegar(path.resolve('/proyecto/static/assets/taisho'), 'theme.css', conf)).toBe('/assets/taisho/theme.css');
		expect(rutaParaPegar(path.resolve('/proyecto/static'), 'fonts.css', conf)).toBe('/fonts.css');
		expect(rutaParaPegar(path.resolve('/proyecto/src/taisho'), 'taisho.css', conf)).toBe(displayPath(path.resolve('/proyecto/src/taisho/taisho.css')));
	});

	it('generate con out en public/: escribe ahí, copia el JS completo y pega rutas del sitio, sin node_modules', async () => {
		const dir = makeTmpDir('taisho-cli-out-public-');
		const config = configEn(dir, "out: 'public/taisho'");
		await runGenerate({ configPath: config, lang: 'es' });
		const salida = path.join(dir, 'public/taisho');
		expect(process.exitCode).toBeUndefined();
		for (const f of ['taisho.full.css', 'theme.css', 'fonts.css', 'taisho.core.js', 'taisho.core.table.js']) expect(fs.existsSync(path.join(salida, f)), f).toBe(true);
		const texto = impreso();
		expect(texto).toContain('<link rel="stylesheet" href="/taisho/fonts.css">');
		expect(texto).toContain('<link rel="stylesheet" href="/taisho/theme.css">');
		expect(texto).toContain('<link rel="stylesheet" href="/taisho/taisho.full.css">');
		expect(texto).toContain('<script type="module" src="/taisho/taisho.core.js"></script>');
		expect(texto).not.toContain('node_modules');
	}, 30_000);

	it('--out manda sobre el out de la config', async () => {
		const dir = makeTmpDir('taisho-cli-out-flag-');
		const config = configEn(dir, "out: 'public/taisho'");
		const otra = path.join(dir, 'otra');
		await runGenerate({ configPath: config, outDir: otra, lang: 'es' });
		expect(fs.existsSync(path.join(otra, 'taisho.core.js'))).toBe(true);
		expect(fs.existsSync(path.join(dir, 'public/taisho'))).toBe(false);
		expect(impreso()).toContain(`src="${displayPath(path.join(otra, 'taisho.core.js'))}"`);
	}, 30_000);

	it('un out que no es una ruta falla con un error de la config', async () => {
		const dir = makeTmpDir('taisho-cli-out-invalido-');
		await runGenerate({ configPath: configEn(dir, "out: ''"), lang: 'es' });
		expect(process.exitCode).toBe(1);
		expect(errorSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toMatch(/out.*ruta de carpeta/);
	});
});
