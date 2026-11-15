// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TaishoConfig } from '../generate';
import { crearMotor } from './motor';
import { entryDelCore } from './core-js';

process.env.LC_ALL = 'es_AR.UTF-8';

const tmpDirs: string[] = [];
const tmp = () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-corejs-'));
	tmpDirs.push(dir);
	return dir;
};

const CONFIG: TaishoConfig = {
	themes: { principal: { colors: { brand: '#4F46E5' } } },
	fontFaces: [],
	defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' },
	content: ['**/*.html', '**/*.ts'],
};

async function core(archivos: Record<string, string>, config: TaishoConfig = CONFIG) {
	const dir = tmp();
	for (const [nombre, texto] of Object.entries(archivos)) fs.writeFileSync(path.join(dir, nombre), texto);
	const motor = crearMotor(config, { targetDir: path.join(dir, 'taisho'), cwd: dir });
	const r = await motor.actualizar();
	return { dir, motor, r, js: r.js! };
}

const TABS = '<div class="ts tabs" data-ts-tabs><button data-ts-tabs-tab>Uno</button></div>';
const gz = async (texto: string) => (await import('node:zlib')).gzipSync(texto, { level: 9 }).length;

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe('taisho.core.js del Modo compilado', () => {
	it('con content escribe taisho.core.js y trae sólo los módulos del contenido', async () => {
		const { dir, js, r } = await core({ 'index.html': TABS });
		expect(r.escritos).toContain('taisho.core.js');
		expect(fs.readFileSync(path.join(dir, 'taisho/taisho.core.js'), 'utf8')).toBe(js);
		expect(js).toContain('tabs-tab');
		expect(js).not.toContain('hour-cycle');
		expect(js).not.toContain('listbox-tag-template');
		expect(js).not.toContain('toast-container');
		expect(await gz(js)).toBeLessThan(5150);
	});

	it('sin content no hay taisho.core.js: el consumidor usa el core.js del paquete', async () => {
		const dir = tmp();
		fs.writeFileSync(path.join(dir, 'index.html'), TABS);
		const { content: _sin, ...sinContent } = CONFIG;
		const r = await crearMotor(sinContent, { targetDir: path.join(dir, 'taisho'), cwd: dir }).actualizar();
		expect(r.js).toBeNull();
		expect(fs.existsSync(path.join(dir, 'taisho/taisho.core.js'))).toBe(false);
	});

	it('un gancho que no es slug (data-ts-listbox) trae el select y su listbox', async () => {
		const { js } = await core({ 'index.html': '<div data-ts-listbox></div>' });
		expect(js).toContain('listbox-tag-template');
		expect(js).not.toContain('hour-cycle');
	});

	it('el DatePicker trae lo que usa sin nombrarlo: los popovers', async () => {
		const { js } = await core({ 'index.html': '<div data-ts-date-picker></div>' });
		expect(js).toContain('hour-cycle');
		expect(js).toContain('autofocus');
	});

	it('una función importada por nombre trae su módulo; un módulo ausente lanza un error que dice qué sumar', async () => {
		const { js } = await core({ 'app.ts': "import { toast } from '@taishods/core';\ntoast('hola');\n" });
		expect(js).toContain('toast-container');
		const modulo = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
		expect(typeof modulo.toast).toBe('function');
		expect(() => modulo.setDatePickerLoading()).toThrow(/safelist: \['date-picker'\]/);
		expect(() => modulo.markInvalid()).toThrow(/safelist: \['field'\]/);
		expect(typeof modulo.setTexts).toBe('function');
		expect(String(modulo.init)).toContain('Promise.resolve()');
	});

	it('un Input o un Field no traen invalid; safelist: [\'field\'] sí', async () => {
		const html = '<div class="ts input" data-ts-input><span data-ts-field-spinner></span></div>';
		const sin = await core({ 'index.html': html });
		expect(sin.js).not.toContain('aria-invalid');
		const con = await core({ 'index.html': html }, { ...CONFIG, safelist: ['field'] });
		expect(con.js).toContain('aria-invalid');
	});

	it('el safelist de un componente lo trae aunque el contenido no lo nombre', async () => {
		const { js } = await core({ 'index.html': TABS }, { ...CONFIG, safelist: ['slider'] });
		expect(js).toContain('slider-rail');
	});

	it('el mismo conjunto de módulos no se vuelve a juntar', async () => {
		const { dir, motor } = await core({ 'index.html': TABS });
		expect(motor.stats.jsArmados).toBe(1);
		fs.writeFileSync(path.join(dir, 'index.html'), TABS + '<p>palabrasuelta</p>');
		await motor.actualizar({ cambiados: ['index.html'] });
		expect(motor.stats.jsArmados).toBe(1);
		fs.writeFileSync(path.join(dir, 'index.html'), TABS + '<div data-ts-slider></div>');
		await motor.actualizar({ cambiados: ['index.html'] });
		expect(motor.stats.jsArmados).toBe(2);
	});

	it('el entry registra los módulos en el pegamento y deja el auto-init', () => {
		const e = entryDelCore(['tabs'], '/core');
		expect(e).toContain("import { ficha as tabs } from \"/core/tabs\";");
		expect(e).toContain('Object.assign(m, { tabs });');
		expect(e).toContain("document.readyState === 'loading'");
	});
});
