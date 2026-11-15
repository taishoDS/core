// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runMigrate } from './migrate';

process.env.LC_ALL = 'es_AR.UTF-8';

let dir: string;
let salida: string[];

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-cli-migrate-'));
	fs.writeFileSync(path.join(dir, 'taisho.config.ts'), "export default { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [], content: ['src/**/*.svelte', 'src/**/*.css', 'node_modules/**/*.svelte'] };\n");
	fs.mkdirSync(path.join(dir, 'src'));
	fs.writeFileSync(path.join(dir, 'src/a.svelte'), '<div class="ts-flex ts-gap-base"><Button class="ts-mt-base" /></div>\n');
	fs.writeFileSync(path.join(dir, 'src/a.css'), '.x { @apply ts-flex; }\n');
	fs.mkdirSync(path.join(dir, 'node_modules/pkg'), { recursive: true });
	fs.writeFileSync(path.join(dir, 'node_modules/pkg/x.svelte'), '<div class="ts-grid"></div>\n');
	vi.spyOn(process, 'cwd').mockReturnValue(dir);
	salida = [];
	vi.spyOn(console, 'log').mockImplementation((m: string) => void salida.push(m));
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	process.exitCode = undefined;
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('runMigrate', () => {
	it('sin --write es un dry-run: no escribe nada, reporta y sale 0', async () => {
		await runMigrate({ from: 'classic' });
		expect(fs.readFileSync(path.join(dir, 'src/a.svelte'), 'utf8')).toContain('ts-flex');
		expect(process.exitCode).toBeUndefined();
		const texto = salida.join('\n');
		expect(texto).toContain('dry-run');
		expect(texto).toContain('src/a.css:1  ts-flex  [apply]');
	});

	it('con --write aplica; la segunda pasada no cambia nada; node_modules no se toca aunque el content lo nombre', async () => {
		await runMigrate({ from: 'classic', write: true });
		expect(fs.readFileSync(path.join(dir, 'src/a.svelte'), 'utf8')).toBe('<div class="ts flex gap-base"><Button class="mt-base" /></div>\n');
		expect(fs.readFileSync(path.join(dir, 'src/a.css'), 'utf8')).toBe('.x { @apply ts-flex; }\n');
		expect(fs.readFileSync(path.join(dir, 'node_modules/pkg/x.svelte'), 'utf8')).toContain('ts-grid');
		salida.length = 0;
		await runMigrate({ from: 'classic', write: true });
		expect(salida.join('\n')).toContain('0 modificados');
	});

	it('acepta rutas (archivo o carpeta) que reemplazan a content, y las lee aunque la config no las liste', async () => {
		fs.mkdirSync(path.join(dir, 'otra'));
		fs.writeFileSync(path.join(dir, 'otra/b.svelte'), '<p class="ts-hidden"></p>\n');
		fs.writeFileSync(path.join(dir, 'otra/nota.md'), 'Se usa `class="ts-flex"`.\n');
		await runMigrate({ from: 'classic', write: true, rutas: ['otra'] });
		expect(fs.readFileSync(path.join(dir, 'otra/b.svelte'), 'utf8')).toBe('<p class="ts hidden"></p>\n');
		expect(fs.readFileSync(path.join(dir, 'otra/nota.md'), 'utf8')).toContain('ts-flex');
		expect(fs.readFileSync(path.join(dir, 'src/a.svelte'), 'utf8')).toContain('ts-flex');
		await runMigrate({ from: 'classic', write: true, rutas: ['otra/nota.md'] });
		expect(fs.readFileSync(path.join(dir, 'otra/nota.md'), 'utf8')).toContain('class="ts flex"');
	});

	it('sin content ni rutas no toca los .md', async () => {
		fs.rmSync(path.join(dir, 'taisho.config.ts'));
		fs.writeFileSync(path.join(dir, 'NOTAS.md'), 'Se usa `class="ts-flex"`.\n');
		await runMigrate({ from: 'classic', write: true });
		expect(fs.readFileSync(path.join(dir, 'NOTAS.md'), 'utf8')).toContain('ts-flex');
		expect(fs.readFileSync(path.join(dir, 'src/a.svelte'), 'utf8')).toContain('class="ts flex gap-base"');
	});

	it('sin --from classic corta con error de uso (2)', async () => {
		await runMigrate({});
		expect(process.exitCode).toBe(2);
	});
});
