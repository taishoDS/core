// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ejecutar } from './ejecutar';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PAQUETE = path.join(RAIZ, 'dist-core');

const correr = (cmd: string, args: string[], cwd: string) =>
	ejecutar(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) as string;

const SMOKE = `
import { init, toast, clearToasts, markInvalid, clearInvalid, setTexts } from '@taishods/core/core';
import { buildThemeCss, createTheme, clearTheme } from '@taishods/core';
import * as vite from '@taishods/core/vite';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);

const fallas = [];
const check = (nombre, ok) => { if (!ok) fallas.push(nombre); };

check('core exporta init/toast', [init, toast, clearToasts].every((f) => typeof f === 'function'));
check('core exporta setTexts', typeof setTexts === 'function');
check('core exporta markInvalid/clearInvalid', [markInvalid, clearInvalid].every((f) => typeof f === 'function'));
check('theme exporta sus tres', [buildThemeCss, createTheme, clearTheme].every((f) => typeof f === 'function'));

// El diferencial del producto: un hex entra, sale la paleta completa.
const css = buildThemeCss({ colors: { brand: '#7c3aed' } });
check('buildThemeCss deriva la paleta', css.includes('--color-brand-500') && css.includes('oklch('));
check('buildThemeCss emite dark', css.includes('light-dark('));

check('css plano resuelve', req.resolve('@taishods/core/css/taisho.full.css').endsWith('taisho.full.css'));
check('tema resuelve', req.resolve('@taishods/core/css/tokens/taisho.css').endsWith('taisho.css'));

// La licencia es parte del producto: si sale sin MIT, no se puede adoptar.
const pkg = req('@taishods/core/package.json');
check('licencia MIT', pkg.license === 'MIT');
check('acceso público', pkg.publishConfig?.access === 'public');

// Ni una línea de Svelte del lado del consumidor: es la promesa entera del Modo directo.
const js = req('node:fs').readFileSync(req.resolve('@taishods/core/core'), 'utf8');
check('el bundle no arrastra Svelte', !/svelte/i.test(js));

// Contrato del plugin de Vite: ./vite exporta taisho y nada más (el tipo no existe en runtime).
check('./vite exporta sólo taisho', Object.keys(vite).join() === 'taisho' && typeof vite.taisho === 'function');
check('./vite declara vite como peer opcional', pkg.peerDependencies?.vite && pkg.peerDependenciesMeta?.vite?.optional === true);
check('taisho() devuelve un plugin', vite.taisho().name === 'taisho');

// Los subpaths de estilos que una extensión importa del Core: cada uno resuelve y exporta lo que se usa.
const density = await import('@taishods/core/density');
const motionScale = await import('@taishods/core/motion-scale');
check('./density', typeof density.setDensity === 'function');
check('./motion-scale', typeof motionScale.durations === 'object');

if (fallas.length) { console.error('FALLAS: ' + fallas.join(' · ')); process.exit(1); }
console.log('smoke ok');
`;

const TIPOS = `
import { buildThemeCss } from '@taishods/core';
import { init } from '@taishods/core/core';
import { taisho, type TaishoViteOptions } from '@taishods/core/vite';
import type { TaishoClass } from '@taishods/core/classes';
import { setDensity } from '@taishods/core/density';
import type { ThemeDef } from '@taishods/core/generate';
void (null as unknown as ThemeDef);

init();
setDensity('compact');
const opciones: TaishoViteOptions = { config: './taisho.config.ts', out: './taisho/' };
taisho(opciones);
// @ts-expect-error — no hay opciones fuera de config/out (nada de onDemand).
taisho({ onDemand: true });
buildThemeCss({ colors: { brand: '#7c3aed' } });

// @ts-expect-error — 'brand' suelto no es un ThemeDef; en runtime devuelve ':root{}'
// sin quejarse, así que el tipo es lo único que lo ataja.
buildThemeCss({ brand: '#7c3aed' });

// Las clases como tipos: el nombre corto vigente es válido; ni el viejo ni el prefijo ts- del clásico lo son.
const nuevo: TaishoClass = 'ms-half';
// @ts-expect-error — un nombre viejo ya no es TaishoClass (en scope no existe: se migra).
const noVigente: TaishoClass = 'ml-half';
// @ts-expect-error — el prefijo ts- era del clásico.
const clasico: TaishoClass = 'ts-ms-half';
// @ts-expect-error — una clase inventada no es TaishoClass.
const inventada: TaishoClass = 'inventada-1';
// @ts-expect-error — un bloque de una extensión no es del Core: lo suma el aumento que publica el paquete de la extensión.
const deExtension: TaishoClass = 'acme-card-row';
void [nuevo, noVigente, clasico, inventada, deExtension];
`;

function listar(dir: string, out: string[] = []): string[] {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) listar(p, out);
		else out.push(p);
	}
	return out;
}

/** El bin instalado: con un Node viejo (simulado) avisa en vez de romper, y los códigos de salida son 0 (ayuda), 2 (uso) y 1 (Node viejo). */
function binInstalado(tmp: string): void {
	const bin = path.join(tmp, 'node_modules/@taishods/core/bin/taisho');
	const viejo = path.join(tmp, 'node-viejo.cjs');
	fs.writeFileSync(viejo, `Object.defineProperty(process.versions, 'node', { value: '20.11.0', configurable: true });\n`);
	const salir = (args: string[]) => {
		try {
			return { status: 0, stderr: '', stdout: correr(process.execPath, args, tmp) };
		} catch (err) {
			const e = err as { status: number; stderr: Buffer | string };
			return { status: e.status, stderr: String(e.stderr), stdout: '' };
		}
	};
	const ayuda = salir([bin]);
	if (ayuda.status !== 0 || !ayuda.stdout.includes('taisho')) throw new Error(`taisho sin argumentos tiene que mostrar la ayuda y salir con 0 (salió con ${ayuda.status})`);
	const uso = salir([bin, 'generate', '--no-existe']);
	if (uso.status !== 2) throw new Error(`un flag que no existe tiene que salir con 2 (salió con ${uso.status})`);
	const nodeViejo = salir(['-r', viejo, bin, '--lang', 'es']);
	if (nodeViejo.status !== 1 || !nodeViejo.stderr.includes('hace falta Node 22.18 o superior')) {
		throw new Error(`con Node < 22.18 el bin tiene que avisar «hace falta Node 22.18 o superior» y salir con 1 (salió con ${nodeViejo.status}): ${nodeViejo.stderr}`);
	}
	console.log('   bin: ayuda 0, uso 2, Node viejo con mensaje claro');
}

function main(): void {
	if (!fs.existsSync(PAQUETE)) {
		console.error('Falta dist-core/. Corré `npm run build:core` antes.');
		process.exit(1);
	}

	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-core-'));
	try {
		const salida = correr('npm', ['pack', '--pack-destination', tmp], PAQUETE);
		const tgz = path.join(tmp, salida.trim().split('\n').pop()!.trim());

		const archivos = correr('tar', ['-tzf', tgz], tmp).split('\n').filter(Boolean);
		const fugas = archivos.filter((a) => /\.svelte/.test(a));
		if (fugas.length) {
			throw new Error(`El tarball del Core lleva archivos de Svelte:\n   ${fugas.join('\n   ')}`);
		}
		console.log(`   corte ok (${archivos.length} archivos, sin .svelte)`);

		fs.writeFileSync(
			path.join(tmp, 'package.json'),
			JSON.stringify({ name: 'prueba', private: true, type: 'module' }),
		);
		correr('npm', ['install', '--no-audit', '--no-fund', tgz], tmp);

		fs.writeFileSync(path.join(tmp, 'smoke.mjs'), SMOKE);
		process.stdout.write('   ' + correr('node', ['smoke.mjs'], tmp));
		binInstalado(tmp);

		fs.writeFileSync(path.join(tmp, 'tipos.ts'), TIPOS);
		fs.writeFileSync(
			path.join(tmp, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: {
					module: 'esnext',
					moduleResolution: 'bundler',
					target: 'es2022',
					strict: true,
					noEmit: true,
					skipLibCheck: true,
					types: [],
				},
				include: ['tipos.ts'],
			}),
		);
		correr(process.execPath, [path.join(RAIZ, 'node_modules/typescript/bin/tsc'), '-p', '.'], tmp);
		console.log('   tipos ok');

		for (const dep of ['vite', '@types/node']) {
			fs.mkdirSync(path.dirname(path.join(tmp, 'node_modules', dep)), { recursive: true });
			fs.symlinkSync(path.join(RAIZ, 'node_modules', dep), path.join(tmp, 'node_modules', dep));
		}
		fs.writeFileSync(
			path.join(tmp, 'tsconfig.dts.json'),
			JSON.stringify({
				compilerOptions: { module: 'esnext', moduleResolution: 'bundler', target: 'es2022', strict: true, noEmit: true, skipLibCheck: false, types: ['node'] },
				include: ['node_modules/@taishods/core/types/**/*.d.ts'],
			}),
		);
		correr(process.execPath, [path.join(RAIZ, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.dts.json'], tmp);
		console.log(`   .d.ts cerrados ok (${listar(path.join(tmp, 'node_modules/@taishods/core/types')).filter((f) => f.endsWith('.d.ts')).length} archivos, skipLibCheck: false)`);

		console.log('✅ @taishods/core: instala, importa, tipa y deriva temas desde el tarball.');
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

main();
