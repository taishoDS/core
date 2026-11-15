// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { archivosDePaquetes, archivosElegidos, descubrirPaquetes, extensionesDe, verificarCore } from './descubrir-paquetes';
import { ConfigError } from '../generate/errores-config';
import { configErrorLine } from '../generate/mensajes-errores';
import { acme } from '../generate/extension-acme.fixture';
import { writeConsumerOutput } from './write-consumer-output';
import type { TaishoConfig } from '../generate';

process.env.LC_ALL = 'es_AR.UTF-8';

const tmpDirs: string[] = [];
afterEach(() => {
	while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const COMPONENTES = {
	Button: ['components/Button/Button.svelte', 'components/Spinner/Spinner.svelte'],
	Grid: ['components/Grid/Grid.svelte', 'components/Grid/GridCell.svelte'],
	Table: ['components/Table/Table.svelte', 'components/Spinner/Spinner.svelte'],
};

const ARCHIVOS: Record<string, string> = {
	'components/Button/Button.svelte': '<script lang="ts">// un link con aria-disabled\nconst id = `ts-button-${uid}`;\ndeclare const t: \'link\' | \'command\';</script><button class="ts button"></button>',
	'components/Spinner/Spinner.svelte': '<span class="ts spinner"></span>',
	'components/Grid/Grid.svelte': '<div class="ts grid-container"></div>',
	'components/Grid/GridCell.svelte': '<div class="ts col-span-2"></div>',
	'components/Table/Table.svelte': '<table class="ts table"></table>',
};

function proyecto({
	core = '1.2.3',
	dependencia = 'dependencies',
	exporta = true,
	manifiesto,
	salida = './dist/taisho.manifest.json',
	nombre = '@acme/ui',
}: { core?: string; dependencia?: string; exporta?: boolean; manifiesto?: unknown; salida?: string; nombre?: string } = {}) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-paquetes-'));
	tmpDirs.push(dir);
	fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', [dependencia]: { '@acme/ui': '^0.11.0', otro: '1.0.0' } }));
	const ui = path.join(dir, 'node_modules/@acme/ui');
	fs.mkdirSync(path.join(ui, 'dist'), { recursive: true });
	fs.writeFileSync(
		path.join(ui, 'package.json'),
		JSON.stringify({ name: nombre, version: '0.11.0', ...(exporta ? { exports: { './taisho.manifest.json': salida } } : {}) }),
	);
	fs.writeFileSync(path.join(ui, 'dist/taisho.manifest.json'), JSON.stringify(manifiesto === undefined ? { format: 3, core, componentFiles: COMPONENTES } : manifiesto));
	for (const [rel, contenido] of Object.entries(ARCHIVOS)) {
		fs.mkdirSync(path.dirname(path.join(ui, 'dist', rel)), { recursive: true });
		fs.writeFileSync(path.join(ui, 'dist', rel), contenido);
	}
	return dir;
}

describe('verificarCore', () => {
	it('corta con el texto exacto cuando el paquete necesita otro Core', () => {
		expect(() => verificarCore({ nombre: '@acme/ui', version: '0.11.0', core: '0.11.0' }, '0.10.2')).toThrow(
			'@acme/ui 0.11.0 necesita @taishods/core 0.11.0; está instalado 0.10.2',
		);
	});
	it('no corta si coincide', () => {
		expect(() => verificarCore({ nombre: '@acme/ui', version: '0.11.0', core: '0.11.0' }, '0.11.0')).not.toThrow();
	});
});

describe('archivosElegidos', () => {
	it('un token que es clave suma los archivos de su cierre, sin repetidos', () => {
		expect(archivosElegidos(COMPONENTES, ['Button', 'Table', 'div'])).toEqual([
			'components/Button/Button.svelte',
			'components/Spinner/Spinner.svelte',
			'components/Table/Table.svelte',
		]);
	});
	it('`<Button/>`, `</Table>` y `<Grid.Cell>` pegan barras y puntos al token: igual cuentan', () => {
		expect(archivosElegidos(COMPONENTES, ['Button/', '/Table'])).toEqual([
			'components/Button/Button.svelte',
			'components/Spinner/Spinner.svelte',
			'components/Table/Table.svelte',
		]);
	});
	it('Grid.Cell cuenta como Grid; un nombre en minúscula o una subcadena no', () => {
		expect(archivosElegidos(COMPONENTES, ['Grid.Cell'])).toEqual(COMPONENTES.Grid);
		expect(archivosElegidos(COMPONENTES, ['button', 'ButtonX', 'constructor', 'toString'])).toEqual([]);
	});
});

describe('descubrirPaquetes', () => {
	it('encuentra la dependencia directa que exporta el manifiesto, también en devDependencies', () => {
		const p = descubrirPaquetes(proyecto({ core: '0.11.0', dependencia: 'devDependencies' }), '0.11.0');
		expect(p.map((x) => x.nombre)).toEqual(['@acme/ui']);
	});
	it('ignora la que no exporta el manifiesto, la que no está instalada y un proyecto sin package.json', () => {
		expect(descubrirPaquetes(proyecto({ exporta: false }), '9.9.9')).toEqual([]);
		const vacio = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-paquetes-'));
		tmpDirs.push(vacio);
		expect(descubrirPaquetes(vacio, '1.0.0')).toEqual([]);
	});
	it('versión distinta: error con los nombres y versiones reales', () => {
		expect(() => descubrirPaquetes(proyecto({ core: '0.11.0' }), '0.10.0')).toThrow(
			'@acme/ui 0.11.0 necesita @taishods/core 0.11.0; está instalado 0.10.0',
		);
	});
});

const mensajeEs = (e: unknown) => (e as ConfigError).errors.map((x) => configErrorLine(x, 'es')).join('\n');
const codigo = (f: () => unknown) => {
	try {
		f();
	} catch (e) {
		return e instanceof ConfigError ? e.errors[0].code : `otro: ${(e as Error).message}`;
	}
	return null;
};

describe('descubrirPaquetes: manifiesto format 3 y extension', () => {
	it('format 1: error con código que dice que hay que actualizar el paquete (es y en)', () => {
		const dir = proyecto({ manifiesto: { format: 1, core: '0.11.0', componentFiles: {} } });
		let error: unknown;
		try {
			descubrirPaquetes(dir, '0.11.0');
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(ConfigError);
		const e = (error as ConfigError).errors[0];
		expect(e.code).toBe('manifest-format');
		expect(configErrorLine(e, 'es')).toBe('taisho config: extensions["@acme/ui"] trae un taisho.manifest.json de formato 1 (versión 0.11.0); este Core sólo entiende el formato 3. Se actualiza el paquete.');
		expect(configErrorLine(e, 'en')).toBe('taisho config: extensions["@acme/ui"] ships a taisho.manifest.json in format 1 (version 0.11.0), and this Core only reads format 3. Update the package.');
	});
	it('format 3 con extension: arma las extensiones por nombre de paquete; sin estilos, el paquete no aporta CSS', () => {
		const con = descubrirPaquetes(proyecto({ manifiesto: { format: 3, core: '1', componentFiles: {}, extension: acme } }), '1');
		expect(Object.keys(extensionesDe(con))).toEqual(['@acme/ui']);
		expect(extensionesDe(con)['@acme/ui'].components!['acme-card'].roots).toEqual(['acme-card', 'acme-tile']);
		expect(extensionesDe(con)['@acme/ui'].roots).toEqual(['acme-glow']);
		const sin = descubrirPaquetes(proyecto({ core: '1' }), '1');
		expect(sin).toHaveLength(1);
		expect(extensionesDe(sin)).toEqual({});
	});
	it('un __proto__ o constructor del manifiesto es un dato más: no toca prototipos', () => {
		const crudo = '{"format":3,"core":"1","componentFiles":{"__proto__":["a.svelte"],"constructor":["b.svelte"]},"extension":{"components":{"__proto__":{"roots":["x"],"css":""}}}}';
		const dir = proyecto({ manifiesto: {} });
		fs.writeFileSync(path.join(dir, 'node_modules/@acme/ui/dist/taisho.manifest.json'), crudo);
		const [p] = descubrirPaquetes(dir, '1');
		expect(Object.getPrototypeOf(p.componentes)).toBeNull();
		expect(Object.hasOwn(p.componentes, '__proto__')).toBe(true);
		expect(Object.getPrototypeOf(p.estilos!.components!)).toBeNull();
		expect(({} as Record<string, unknown>).roots).toBeUndefined();
		expect(Object.getPrototypeOf(extensionesDe([p]))).toBeNull();
	});
	it('forma inválida: error de forma, no un TypeError', () => {
		for (const manifiesto of [null, [], 'x', { format: 3, core: 1, componentFiles: {} }, { format: 3, core: '1', componentFiles: null }, { format: 3, core: '1', componentFiles: { A: 'a' } }, { format: 3, core: '1', componentFiles: {}, extension: 'x' }, { format: 3, core: '1', componentFiles: {}, extension: { roots: 'acme-glow' } }, { format: 3, core: '1', componentFiles: {}, extension: { roots: ['a', 1] } }]) {
			expect(codigo(() => descubrirPaquetes(proyecto({ manifiesto }), '1'))).toBe('manifest-shape');
		}
	});
	it('roots sueltas del manifiesto: se copian sin prototipo', () => {
		const dir = proyecto({ manifiesto: { format: 3, core: '1', componentFiles: {}, extension: { roots: ['acme-glow'] } } });
		const [p] = descubrirPaquetes(dir, '1');
		expect(p.estilos!.roots).toEqual(['acme-glow']);
		expect(Object.getPrototypeOf(p.estilos)).toBeNull();
	});
	it('un JSON inválido no vuelca el contenido del archivo en el error', () => {
		const dir = proyecto({ manifiesto: {} });
		fs.writeFileSync(path.join(dir, 'node_modules/@acme/ui/dist/taisho.manifest.json'), 'API_KEY=hunter2 {');
		let error: unknown;
		try {
			descubrirPaquetes(dir, '1');
		} catch (e) {
			error = e;
		}
		expect(codigo(() => descubrirPaquetes(dir, '1'))).toBe('manifest-json');
		expect(mensajeEs(error)).toBe('taisho config: extensions["@acme/ui"] tiene un JSON inválido en "./dist/taisho.manifest.json".');
		expect(mensajeEs(error)).not.toContain('hunter2');
	});
	it('identidad: una dependencia instalada como alias de otro paquete es un error', () => {
		const dir = proyecto({ core: '1', nombre: 'evil' });
		expect(codigo(() => descubrirPaquetes(dir, '1'))).toBe('package-name-mismatch');
	});
});

describe('descubrirPaquetes: contención de rutas', () => {
	const secreto = (dir: string) => {
		fs.mkdirSync(path.join(dir, 'outside'), { recursive: true });
		fs.writeFileSync(path.join(dir, 'outside/secreto.txt'), 'API_KEY=hunter2 ts-flex\n');
	};
	it('`exports` que apunta afuera del paquete: manifest-path-escapes', () => {
		const dir = proyecto({ salida: '../../../outside/x.json', manifiesto: { format: 3, core: '1', componentFiles: {} } });
		fs.mkdirSync(path.join(dir, 'outside'));
		fs.writeFileSync(path.join(dir, 'outside/x.json'), '{"format":3,"core":"1","componentFiles":{}}');
		expect(codigo(() => descubrirPaquetes(dir, '1'))).toBe('manifest-path-escapes');
	});
	it('un symlink del manifiesto que sale del paquete: manifest-path-escapes', () => {
		const dir = proyecto({ manifiesto: {} });
		fs.writeFileSync(path.join(dir, 'fuera.json'), '{"format":3,"core":"1","componentFiles":{}}');
		const man = path.join(dir, 'node_modules/@acme/ui/dist/taisho.manifest.json');
		fs.rmSync(man);
		fs.symlinkSync(path.join(dir, 'fuera.json'), man);
		expect(codigo(() => descubrirPaquetes(dir, '1'))).toBe('manifest-path-escapes');
	});
	it('`componentes` con `../` o ruta absoluta: no lee el archivo ajeno', () => {
		const dir = proyecto({ manifiesto: { format: 3, core: '1', componentFiles: { Evil: ['../../../../../outside/secreto.txt'] } } });
		secreto(dir);
		const propios = [{ file: 'a.svelte', content: '<Evil/>' }];
		let error: unknown;
		try {
			archivosDePaquetes({ cwd: dir, configDir: dir, propios, versionCore: '1' });
		} catch (e) {
			error = e;
		}
		expect((error as ConfigError).errors[0].code).toBe('manifest-path-escapes');
		expect(mensajeEs(error)).not.toContain('hunter2');
		const abs = path.join(dir, 'outside/secreto.txt');
		fs.writeFileSync(path.join(dir, 'node_modules/@acme/ui/dist/taisho.manifest.json'), JSON.stringify({ format: 3, core: '1', componentFiles: { Evil: [abs] } }));
		expect(codigo(() => archivosDePaquetes({ cwd: dir, configDir: dir, propios, versionCore: '1' }))).toBe('manifest-path-escapes');
	});
	it('un archivo del paquete que es un symlink hacia afuera: manifest-path-escapes', () => {
		const dir = proyecto({ manifiesto: { format: 3, core: '1', componentFiles: { Evil: ['Evil.svelte'] } } });
		secreto(dir);
		fs.symlinkSync(path.join(dir, 'outside/secreto.txt'), path.join(dir, 'node_modules/@acme/ui/dist/Evil.svelte'));
		expect(codigo(() => archivosDePaquetes({ cwd: dir, configDir: dir, propios: [{ file: 'a.svelte', content: '<Evil/>' }], versionCore: '1' }))).toBe('manifest-path-escapes');
	});
	it('un archivo de más de 1 MiB o que no es regular: manifest-file-invalid', () => {
		const dir = proyecto({ manifiesto: { format: 3, core: '1', componentFiles: { Grande: ['grande.svelte'], Carpeta: ['carpeta'] } } });
		fs.writeFileSync(path.join(dir, 'node_modules/@acme/ui/dist/grande.svelte'), 'a'.repeat(1024 * 1024 + 1));
		fs.mkdirSync(path.join(dir, 'node_modules/@acme/ui/dist/carpeta'));
		const leer = (c: string) => codigo(() => archivosDePaquetes({ cwd: dir, configDir: dir, propios: [{ file: 'a.svelte', content: c }], versionCore: '1' }));
		expect(leer('<Grande/>')).toBe('manifest-file-invalid');
		expect(leer('<Carpeta/>')).toBe('manifest-file-invalid');
	});
	it('un paquete bien hecho, con symlink hacia adentro (pnpm), sigue andando', () => {
		const dir = proyecto({ core: '1' });
		const real = path.join(dir, 'store');
		fs.renameSync(path.join(dir, 'node_modules/@acme/ui'), real);
		fs.symlinkSync(real, path.join(dir, 'node_modules/@acme/ui'));
		const out = archivosDePaquetes({ cwd: dir, configDir: dir, propios: [{ file: 'a.svelte', content: '<Button/>' }], versionCore: '1' });
		expect(out).toHaveLength(2);
	});
});

describe('archivosDePaquetes', () => {
	it('suma sólo los archivos de lo que el content nombra, con ruta relativa a la config', () => {
		const dir = proyecto({ core: '0.11.0' });
		const propios = [{ file: 'src/App.svelte', content: '<Button>Hola</Button>' }];
		const out = archivosDePaquetes({ cwd: dir, configDir: dir, propios, versionCore: '0.11.0' });
		expect(out.map((f) => f.file)).toEqual([
			'node_modules/@acme/ui/dist/components/Button/Button.svelte',
			'node_modules/@acme/ui/dist/components/Spinner/Spinner.svelte',
		]);
		expect(out[0].content).toContain('ts button');
		expect(out[0].content).not.toContain('aria-disabled');
	});
	it('no repite un archivo que el content del consumidor ya trae', () => {
		const dir = proyecto({ core: '0.11.0' });
		const ya = 'node_modules/@acme/ui/dist/components/Button/Button.svelte';
		const propios = [
			{ file: ya, content: '' },
			{ file: 'a.svelte', content: '<Button/>' },
		];
		expect(archivosDePaquetes({ cwd: dir, configDir: dir, propios, versionCore: '0.11.0' }).map((f) => f.file)).not.toContain(ya);
	});
	it('verifica la versión aunque el content no nombre nada', () => {
		const dir = proyecto({ core: '0.11.0' });
		expect(() => archivosDePaquetes({ cwd: dir, configDir: dir, propios: [], versionCore: '0.10.0' })).toThrow('está instalado 0.10.0');
	});
});

describe('writeConsumerOutput con paquetes', () => {
	const config = (content: string[]): TaishoConfig => ({
		themes: { principal: { colors: { brand: '#4F46E5' } } },
		fontFaces: [],
		defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' },
		content,
	});

	it('el CSS trae el cierre de Button y nada de Table ni de Grid', async () => {
		const dir = proyecto({ core: '0.11.0' });
		fs.writeFileSync(path.join(dir, 'App.svelte'), '<script>import { Button } from "@acme/ui";</script><Button>Hola</Button>');
		const salida = await writeConsumerOutput(config(['*.svelte']), { targetDir: path.join(dir, 'taisho'), cwd: dir, versionCore: '0.11.0' });
		expect(salida.warnings.filter((w) => w.code !== 'seed-shifted')).toEqual([]);
		const css = fs.readFileSync(path.join(dir, 'taisho/taisho.css'), 'utf8');
		expect(css).toContain(':where(.ts).button');
		expect(css).toContain(':where(.ts).spinner');
		expect(css).not.toContain(':where(.ts).table');
		expect(css).not.toContain(':where(.ts).grid-container');
		expect(css).not.toContain(':where(.ts).link');
		expect(css).not.toContain(':where(.ts).command-palette');
	}, 30_000);

	it('una extensión del paquete entra al CSS (a demanda y completo) y sus tokens al tema, podados por uso', async () => {
		const manifiesto = { format: 3, core: '0.11.0', componentFiles: { AcmeCard: ['components/AcmeCard.svelte'] }, extension: acme };
		const dir = proyecto({ core: '0.11.0', manifiesto });
		fs.writeFileSync(path.join(dir, 'node_modules/@acme/ui/dist/components/AcmeCard.svelte'), '<div class="ts acme-card"></div>');
		fs.writeFileSync(path.join(dir, 'App.svelte'), '<AcmeCard/>');
		await writeConsumerOutput(config(['*.svelte']), { targetDir: path.join(dir, 'taisho'), cwd: dir, versionCore: '0.11.0' });
		const css = fs.readFileSync(path.join(dir, 'taisho/taisho.css'), 'utf8');
		expect(css).toContain(':where(.ts).acme-card');
		expect(css).not.toContain('acme-glow');
		const tema = fs.readFileSync(path.join(dir, 'taisho/theme.css'), 'utf8');
		expect(tema).toContain('--ts-acme-card-pad');
		fs.writeFileSync(path.join(dir, 'App.svelte'), '<p style="gap: var(--ts-acme-card-hover)">sin componente</p>');
		await writeConsumerOutput(config(['*.svelte']), { targetDir: path.join(dir, 'taisho'), cwd: dir, versionCore: '0.11.0' });
		expect(fs.readFileSync(path.join(dir, 'taisho/theme.css'), 'utf8')).toContain('--ts-acme-card-hover');
		expect(fs.readFileSync(path.join(dir, 'taisho/theme.css'), 'utf8')).not.toContain('--ts-acme-card-pad');
		await writeConsumerOutput({ ...config([]), content: undefined }, { targetDir: path.join(dir, 'full'), cwd: dir, versionCore: '0.11.0' });
		expect(fs.readFileSync(path.join(dir, 'full/taisho.full.css'), 'utf8')).toContain(':where(.ts).acme-glow');
	}, 30_000);

	it('una extensión inválida corta con el error de config (código) antes de escribir', async () => {
		const mala = { components: { 'acme-x': { roots: ['acme-x'], css: '@utility ts-acme-x { color: #ff0000; }' } } };
		const dir = proyecto({ core: '0.11.0', manifiesto: { format: 3, core: '0.11.0', componentFiles: {}, extension: mala } });
		fs.writeFileSync(path.join(dir, 'App.svelte'), '<p/>');
		const r = writeConsumerOutput(config(['*.svelte']), { targetDir: path.join(dir, 'taisho'), cwd: dir, versionCore: '0.11.0' });
		await expect(r).rejects.toBeInstanceOf(ConfigError);
		await r.catch((e: ConfigError) => expect(e.errors.map((x) => x.code)).toContain('ext-color-literal'));
		expect(fs.existsSync(path.join(dir, 'taisho/taisho.css'))).toBe(false);
	}, 30_000);

	it('con otra versión del Core corta con el error de versión y no escribe nada', async () => {
		const dir = proyecto({ core: '0.11.0' });
		fs.writeFileSync(path.join(dir, 'App.svelte'), '<Button/>');
		await expect(
			writeConsumerOutput(config(['*.svelte']), { targetDir: path.join(dir, 'taisho'), cwd: dir, versionCore: '0.10.0' }),
		).rejects.toThrow('@acme/ui 0.11.0 necesita @taishods/core 0.11.0; está instalado 0.10.0');
		expect(fs.existsSync(path.join(dir, 'taisho/taisho.css'))).toBe(false);
	}, 30_000);
});
