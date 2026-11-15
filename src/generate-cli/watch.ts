// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { DEFAULT_CUSTOM_ICONS_DIR, type TaishoConfig } from '../generate';
import { cargarConfig, displayPath } from './generate';
import { crearMotor } from './motor';
import { listarContent } from './read-content';
import { idioma, m, usarIdioma, type Lang } from './idioma';
import { warningLine } from './mensajes-avisos';
import { mensajeDe } from './errores';

const JUNTAR_MS = 10;
const CHARS_GLOB = /[*?[\]{}()!]/;

export interface WatchOptions {
	configPath?: string;
	outDir?: string;
	cwd?: string;
	lang?: Lang;
}

export interface Watch {
	cerrar(): Promise<void>;
}

function baseDeGlob(glob: string): string {
	const segmentos = glob.split('/').filter((s) => s && s !== '.');
	const i = segmentos.findIndex((s) => CHARS_GLOB.test(s));
	return (i === -1 ? segmentos.slice(0, -1) : segmentos.slice(0, i)).join('/');
}

const nombraNodeModules = (glob: string) => glob.split('/').includes('node_modules');

export async function iniciarWatch(options: WatchOptions = {}): Promise<Watch> {
	const cwd = options.cwd ?? process.cwd();
	const configPath = path.resolve(cwd, options.configPath ?? 'taisho.config.ts');
	const configDir = path.dirname(configPath);
	const targetDir = path.resolve(cwd, options.outDir ?? 'taisho');
	const paqueteJson = path.join(cwd, 'package.json');
	const iconosDir = path.resolve(cwd, DEFAULT_CUSTOM_ICONS_DIR);
	const t0 = performance.now();

	usarIdioma(options.lang);
	let config: TaishoConfig = await cargarConfig(configPath, options.lang);
	const motor = crearMotor(config, { targetDir, cwd, configDir, soloSiCambia: true });

	const rel = (abs: string) => path.relative(configDir, abs).split(path.sep).join('/');
	const nombre = (f: string) => displayPath(path.resolve(configDir, f));
	const listar = () => new Set(config.content ? listarContent({ globs: config.content, baseDir: configDir, outDir: targetDir }) : []);
	let propios = new Set<string>();

	const watchers = new Map<string, fs.FSWatcher>();
	let pendientes = new Map<string, string>();
	let timer: NodeJS.Timeout | undefined;
	let cola: Promise<void> = Promise.resolve();
	let reverificar: NodeJS.Timeout | undefined;
	let cerrado = false;
	let iniciado = false;

	function recorrer(raiz: string, conNodeModules: boolean, acc: Set<string>) {
		if (raiz === targetDir || raiz.startsWith(targetDir + path.sep)) return;
		let entradas: fs.Dirent[];
		try {
			entradas = fs.readdirSync(raiz, { withFileTypes: true });
		} catch {
			return;
		}
		acc.add(raiz);
		for (const e of entradas) {
			if (!e.isDirectory() || e.name.startsWith('.') || (e.name === 'node_modules' && !conNodeModules)) continue;
			recorrer(path.join(raiz, e.name), conNodeModules, acc);
		}
	}

	function alEvento(dir: string, evento: string, nombreArchivo: string | Buffer | null) {
		const abs = nombreArchivo ? path.join(dir, nombreArchivo.toString()) : dir;
		pendientes.set(abs, evento === 'rename' || !nombreArchivo ? 'rename' : (pendientes.get(abs) ?? 'change'));
		timer ??= setTimeout(() => {
			timer = undefined;
			const tanda = pendientes;
			pendientes = new Map();
			cola = cola.then(() => procesar(tanda));
		}, JUNTAR_MS);
	}

	function mirarCarpetas() {
		const deseadas = new Set<string>([configDir, cwd, ...motor.manifiestos.map((f) => path.dirname(f))]);
		recorrer(iconosDir, false, deseadas);
		for (const glob of config.content ?? []) recorrer(path.resolve(configDir, baseDeGlob(glob)), nombraNodeModules(glob), deseadas);
		for (const [dir, w] of watchers) {
			if (deseadas.has(dir)) continue;
			w.close();
			watchers.delete(dir);
		}
		const nuevos: string[] = [];
		for (const dir of deseadas) {
			if (watchers.has(dir)) continue;
			nuevos.push(dir);
			try {
				const w = fs.watch(dir, (evento, archivo) => alEvento(dir, evento, archivo));
				w.on('error', () => {
					w.close();
					watchers.delete(dir);
				});
				watchers.set(dir, w);
			} catch {
			}
		}
		if (nuevos.length && iniciado && !cerrado) {
			clearTimeout(reverificar);
			reverificar = setTimeout(() => {
				alEvento(configDir, 'rename', null);
				for (const f of motor.manifiestos) if (nuevos.includes(path.dirname(f))) alEvento(path.dirname(f), 'change', path.basename(f));
				for (const f of propios) {
					const abs = path.resolve(configDir, f);
					if (nuevos.some((d) => abs.startsWith(d + path.sep))) alEvento(path.dirname(abs), 'change', path.basename(abs));
				}
			}, 50);
		}
		iniciado = true;
	}

	async function procesar(tanda: Map<string, string>) {
		if (cerrado) return;
		const inicio = performance.now();
		try {
			let configNueva: TaishoConfig | undefined;
			let paquetesCambiaron = false;
			const manifiestos = new Set(motor.manifiestos);
			const cambiados = new Set<string>();
			let relistar = false;
			let cssAjeno = false;
			for (const [abs, evento] of tanda) {
				if (abs === configPath) {
					try {
						configNueva = await cargarConfig(configPath, options.lang);
					} catch (err) {
						console.error(`✖ taisho config: ${mensajeDe(err)}`);
					}
				} else if (abs === paqueteJson || manifiestos.has(abs)) paquetesCambiaron = true;
				else if (abs.startsWith(iconosDir + path.sep) && abs.endsWith('.svg')) cambiados.add(rel(abs));
				else if (evento === 'rename' || !propios.has(rel(abs))) {
					relistar = true;
					if (abs.endsWith('.css') && !abs.startsWith(targetDir + path.sep)) cssAjeno = true;
				}
			}

			let altas: string[] = [];
			let bajas: string[] = [];
			const previos = propios;
			if (configNueva) config = configNueva;
			if (configNueva || relistar) {
				mirarCarpetas();
				const ahora = listar();
				altas = [...ahora].filter((f) => !propios.has(f));
				bajas = [...propios].filter((f) => !ahora.has(f));
				propios = ahora;
			}
			for (const abs of tanda.keys()) {
				const f = rel(abs);
				if (propios.has(f) && !altas.includes(f)) cambiados.add(f);
			}
			if (!configNueva && !paquetesCambiaron && !cambiados.size && !altas.length && !bajas.length) {
				if (!cssAjeno || !config.content) return;
				const r = await motor.actualizar({});
				for (const aviso of r.avisosNuevos) console.warn(`⚠ ${warningLine(aviso, idioma())}`);
				return;
			}

			let r;
			try {
				r = await motor.actualizar({ cambiados: [...cambiados], altas, bajas, configCambio: configNueva ?? (paquetesCambiaron ? config : undefined) });
				if (paquetesCambiaron) mirarCarpetas();
			} catch (err) {
				propios = previos;
				console.error(`✖ ${mensajeDe(err)}`);
				return;
			}
			const grupos = [configNueva || paquetesCambiaron ? 1 : 0, cambiados.size, altas.length, bajas.length].filter((n) => n > 0).length;
			const marca = grupos === 1 && altas.length ? '+' : grupos === 1 && bajas.length ? '−' : '↻';
			const lista = [
				...(configNueva ? [displayPath(configPath)] : []),
				...(paquetesCambiaron ? [displayPath(paqueteJson)] : []),
				...[...cambiados].map(nombre),
				...altas.map((f) => (grupos === 1 ? nombre(f) : `+ ${nombre(f)}`)),
				...bajas.map((f) => (grupos === 1 ? nombre(f) : `− ${nombre(f)}`)),
			].join(', ');
			console.log(`${marca} ${lista} → ${r.escritos.length ? r.escritos.join(', ') : m().watch.sinCambios} (${Math.round(performance.now() - inicio)} ms)`);
			for (const aviso of r.avisosNuevos) console.warn(`⚠ ${warningLine(aviso, idioma())}`);
		} catch (err) {
			console.error(`✖ ${mensajeDe(err)}`);
		}
	}

	mirarCarpetas();
	propios = listar();
	const primera = motor.actualizar();
	cola = primera.then(() => {}, () => {});
	let inicial;
	try {
		inicial = await primera;
		mirarCarpetas();
	} catch (err) {
		cerrado = true;
		clearTimeout(timer);
		clearTimeout(reverificar);
		for (const w of watchers.values()) w.close();
		throw err;
	}
	for (const aviso of inicial.avisosNuevos) console.warn(`⚠ ${warningLine(aviso, idioma())}`);
	const archivos = inicial.temas.length + 2 + (inicial.iconos ? 1 : 0);
	console.log(m().watch.alDia(displayPath(targetDir), archivos, Math.round(performance.now() - t0), config.content ? propios.size : null, DEFAULT_CUSTOM_ICONS_DIR));

	return {
		async cerrar() {
			cerrado = true;
			clearTimeout(timer);
			clearTimeout(reverificar);
			for (const w of watchers.values()) w.close();
			watchers.clear();
			await cola;
		},
	};
}

export async function runWatch(options: WatchOptions): Promise<void> {
	let watch: Watch;
	try {
		watch = await iniciarWatch(options);
	} catch (err) {
		console.error(mensajeDe(err));
		process.exitCode = 1;
		return;
	}
	await new Promise<void>((resolve) => {
		const fin = () => {
			process.off('SIGINT', fin);
			process.off('SIGTERM', fin);
			resolve();
		};
		process.on('SIGINT', fin);
		process.on('SIGTERM', fin);
	});
	await watch.cerrar();
}
