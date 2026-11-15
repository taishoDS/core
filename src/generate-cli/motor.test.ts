// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TaishoConfig } from '../generate';
import { crearMotor } from './motor';
import { writeConsumerOutput } from './write-consumer-output';
import { warningLine } from './mensajes-avisos';
import { versionDelCore } from './descubrir-paquetes';

process.env.LC_ALL = 'es_AR.UTF-8';

const tmpDirs: string[] = [];
const tmp = () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-motor-'));
	tmpDirs.push(dir);
	return dir;
};

const CONFIG: TaishoConfig = {
	themes: { principal: { colors: { brand: '#4F46E5' } } },
	fontFaces: [],
	defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' },
	content: ['**/*.html'],
};

function proyecto(): { dir: string; out: string } {
	const dir = tmp();
	fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex gap-base"></div>\n');
	fs.writeFileSync(path.join(dir, 'otra.html'), '<div class="ts grid"></div>\n');
	return { dir, out: path.join(dir, 'taisho') };
}

const leerSalida = (out: string) => Object.fromEntries(fs.readdirSync(out).sort().map((n) => [n, fs.readFileSync(path.join(out, n), 'utf8')]));

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe('motor incremental', () => {
	it('un cambio que no toca la selección no arma ni minifica el CSS, y no reescribe nada', async () => {
		const { dir, out } = proyecto();
		const motor = crearMotor(CONFIG, { targetDir: out, cwd: dir, soloSiCambia: true });
		await motor.actualizar();
		expect(motor.stats).toMatchObject({ cssArmados: 1, cssMinificados: 1, temasPodados: 1 });

		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex gap-base"></div>\n<p>palabrasuelta</p>\n');
		const r = await motor.actualizar({ cambiados: ['index.html'] });
		expect(motor.stats).toMatchObject({ cssArmados: 1, cssMinificados: 1, temasPodados: 1 });
		expect(r.escritos).toEqual([]);
	});

	it('una clase nueva del DS sí arma, minifica y reescribe sólo el CSS de sistema', async () => {
		const { dir, out } = proyecto();
		const motor = crearMotor(CONFIG, { targetDir: out, cwd: dir, soloSiCambia: true });
		await motor.actualizar();

		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex gap-base block"></div>\n');
		const r = await motor.actualizar({ cambiados: ['index.html'] });
		expect(motor.stats.cssArmados).toBe(2);
		expect(motor.stats.cssMinificados).toBe(2);
		expect(r.escritos).toEqual(['taisho.css']);
		expect(fs.readFileSync(path.join(out, 'taisho.css'), 'utf8')).toContain(':where(.ts).block');
	});

	it('tras altas, cambios y bajas, la salida es la misma que la de generar de cero', async () => {
		const { dir, out } = proyecto();
		const motor = crearMotor(CONFIG, { targetDir: out, cwd: dir, soloSiCambia: true });
		await motor.actualizar();

		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex md:grid-cols-3 p-4"></div>\n');
		fs.writeFileSync(path.join(dir, 'nueva.html'), '<button class="ts button variant-primary" data-ts-modal>x</button>\n');
		fs.rmSync(path.join(dir, 'otra.html'));
		await motor.actualizar({ cambiados: ['index.html'], altas: ['nueva.html'], bajas: ['otra.html'] });

		const deCero = path.join(tmp(), 'taisho');
		await writeConsumerOutput(CONFIG, { targetDir: deCero, cwd: dir });
		expect(leerSalida(out)).toEqual(leerSalida(deCero));
	});

	it('un cambio de config tira lo que dependía de ella', async () => {
		const { dir, out } = proyecto();
		const motor = crearMotor(CONFIG, { targetDir: out, cwd: dir, soloSiCambia: true });
		await motor.actualizar();

		const nueva: TaishoConfig = { ...CONFIG, themes: { principal: { colors: { brand: '#E11D48' } } }, content: ['index.html'] };
		const r = await motor.actualizar({ configCambio: nueva });

		const deCero = path.join(tmp(), 'taisho');
		await writeConsumerOutput(nueva, { targetDir: deCero, cwd: dir });
		expect(leerSalida(out)).toEqual(leerSalida(deCero));
		expect(r.contenido).toEqual(['index.html']);
	});

	it('informa los avisos que la pasada anterior no tenía', async () => {
		const { dir, out } = proyecto();
		const motor = crearMotor(CONFIG, { targetDir: out, cwd: dir, soloSiCambia: true });
		const primera = await motor.actualizar();
		expect(primera.avisosNuevos).toEqual(primera.warnings);

		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts gird-cols-3"></div>\n');
		const segunda = await motor.actualizar({ cambiados: ['index.html'] });
		expect(segunda.avisosNuevos.length).toBeGreaterThan(0);
		expect(segunda.avisosNuevos.every((a) => segunda.warnings.includes(a))).toBe(true);

		const tercera = await motor.actualizar({ cambiados: ['index.html'] });
		expect(tercera.avisosNuevos).toEqual([]);
	});
});

describe('motor — calcula todo antes de escribir', () => {
	it('un ícono inexistente a mitad de camino deja el disco intacto', async () => {
		const { dir, out } = proyecto();
		const motor = crearMotor(CONFIG, { targetDir: out, cwd: dir });
		await motor.actualizar();
		const antes = leerSalida(out);

		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts flex block"><svg><use href="x.svg#ts-icono-que-no-existe"></use></svg></div>\n');
		await expect(motor.actualizar({ cambiados: ['index.html'] })).rejects.toThrow(/inexistente/);

		expect(leerSalida(out)).toEqual(antes);
	});

	it('si falla la primera pasada, no crea la carpeta de salida', async () => {
		const { dir, out } = proyecto();
		fs.writeFileSync(path.join(dir, 'index.html'), '<svg><use href="x.svg#ts-icono-que-no-existe"></use></svg>\n');
		await expect(crearMotor(CONFIG, { targetDir: out, cwd: dir }).actualizar()).rejects.toThrow(/inexistente/);
		expect(fs.existsSync(out)).toBe(false);
	});

	it('corregido el ícono, la pasada siguiente escribe normalmente', async () => {
		const { dir, out } = proyecto();
		const motor = crearMotor(CONFIG, { targetDir: out, cwd: dir, soloSiCambia: true });
		await motor.actualizar();

		fs.writeFileSync(path.join(dir, 'index.html'), '<svg><use href="x.svg#ts-icono-que-no-existe"></use></svg>\n');
		await expect(motor.actualizar({ cambiados: ['index.html'] })).rejects.toThrow();
		await expect(motor.actualizar({ cambiados: ['index.html'] })).rejects.toThrow();

		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts block"></div>\n');
		const r = await motor.actualizar({ cambiados: ['index.html'] });
		expect(r.escritos).toContain('taisho.css');
	});
});

describe('motor — marca casi igual a un estado', () => {
	const roja: TaishoConfig = { ...CONFIG, themes: { principal: { colors: { brand: '#DC2626' } } } };

	it('sale entre los avisos del tema, una vez, sin cortar la salida', async () => {
		const { dir, out } = proyecto();
		const r = await crearMotor(roja, { targetDir: out, cwd: dir }).actualizar();
		const marcados = r.warnings.filter((w) => w.code === 'brand-like-status' && w.params.status === 'danger');
		expect(marcados).toHaveLength(1);
		expect(warningLine(marcados[0], 'es')).toContain('Tema "principal": el primario (#DC2626) casi no se distingue del estado "danger"');
		expect(r.escritos).toContain('taisho.css');
		expect(r.avisosNuevos).toEqual(r.warnings);
	});

	it('con una marca lejos de los estados no avisa', async () => {
		const { dir, out } = proyecto();
		const r = await crearMotor(CONFIG, { targetDir: out, cwd: dir }).actualizar();
		expect(r.warnings.filter((w) => w.code === 'brand-like-status')).toEqual([]);
	});
});

describe('motor con paquetes que traen estilos', () => {
	const instalar = (dir: string, sombra: string) => {
		const carpeta = path.join(dir, 'node_modules/@acme/ui');
		fs.mkdirSync(carpeta, { recursive: true });
		fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: { '@acme/ui': '1.0.0' } }));
		fs.writeFileSync(path.join(carpeta, 'package.json'), JSON.stringify({ name: '@acme/ui', version: '1.0.0', exports: { './taisho.manifest.json': './taisho.manifest.json' } }));
		const estilos = { roots: ['acme-glow'], utilities: `@utility ts-acme-glow { box-shadow: var(--ts-shadow-${sombra}); }` };
		fs.writeFileSync(path.join(carpeta, 'taisho.manifest.json'), JSON.stringify({ format: 3, core: versionDelCore(), componentFiles: {}, extension: estilos }));
	};

	it('los paquetes se descubren una vez por config: `configCambio` los relee, un cambio de contenido no', async () => {
		const { dir, out } = proyecto();
		instalar(dir, 'md');
		fs.writeFileSync(path.join(dir, 'index.html'), '<div class="ts acme-glow"></div>\n');
		const motor = crearMotor(CONFIG, { targetDir: out, cwd: dir, soloSiCambia: true });
		await motor.actualizar();
		expect(motor.manifiestos).toEqual([path.join(dir, 'node_modules/@acme/ui/taisho.manifest.json')]);
		const css = () => fs.readFileSync(path.join(out, 'taisho.css'), 'utf8');
		expect(css()).toContain('--ts-shadow-md');

		instalar(dir, 'lg');
		await motor.actualizar({ cambiados: ['otra.html'] });
		expect(css()).toContain('--ts-shadow-md');
		await motor.actualizar({ configCambio: CONFIG });
		expect(css()).toContain('--ts-shadow-lg');
	});

	it('sin `content`, el CSS completo trae la extensión', async () => {
		const { dir, out } = proyecto();
		instalar(dir, 'md');
		await crearMotor({ ...CONFIG, content: undefined }, { targetDir: out, cwd: dir }).actualizar();
		expect(fs.readFileSync(path.join(out, 'taisho.full.css'), 'utf8')).toContain('acme-glow');
	});
});

describe('tipos de las clases propias (taisho.classes.d.ts)', () => {
	const tipos = (out: string) => path.join(out, 'taisho.classes.d.ts');
	const CON_EXTEND: TaishoConfig = { ...CONFIG, extend: { sizing: [30] }, utilities: { 'card-hero': ['p-double', 'radius-lg'], 'card-hero.big': ['p-30'] } };

	it('sin extend ni utilities no se escribe ningún archivo de tipos', async () => {
		const { dir, out } = proyecto();
		const r = await crearMotor(CONFIG, { targetDir: out, cwd: dir }).actualizar();
		expect(r.tipos).toBeNull();
		expect(fs.existsSync(tipos(out))).toBe(false);
	});

	it('los niveles de extend y las utilidades propias entran como aumento de @taishods/core/classes, y sólo ellos', async () => {
		const { dir, out } = proyecto();
		const r = await crearMotor(CON_EXTEND, { targetDir: out, cwd: dir }).actualizar();
		expect(r.tipos).toBe('taisho.classes.d.ts');
		const d = fs.readFileSync(tipos(out), 'utf8');
		expect(d).toContain("declare module '@taishods/core/classes'");
		for (const n of ['p-30', 'w-30', 'h-30', 'size-30', 'card-hero']) expect(d).toContain(`"${n}": true;`);
		for (const n of ['p-32', 'flex', 'card-hero.big', 'big']) expect(d).not.toContain(`"${n}": true;`);
	});

	it('no suma peso al CSS: el CSS es el mismo con o sin el archivo de tipos', async () => {
		const { dir, out } = proyecto();
		await crearMotor(CON_EXTEND, { targetDir: out, cwd: dir }).actualizar();
		const { 'taisho.classes.d.ts': _tipos, ...css } = leerSalida(out);
		expect(Object.keys(css).sort()).toEqual(['fonts.css', 'taisho.core.js', 'taisho.core.key-warning.js', 'taisho.css', 'theme.css']);
	});

	it('si ya no hay clases propias, el archivo viejo se borra', async () => {
		const { dir, out } = proyecto();
		const motor = crearMotor(CON_EXTEND, { targetDir: out, cwd: dir });
		await motor.actualizar();
		expect(fs.existsSync(tipos(out))).toBe(true);
		const r = await motor.actualizar({ configCambio: CONFIG });
		expect(r.tipos).toBeNull();
		expect(fs.existsSync(tipos(out))).toBe(false);
	});
});

