// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { carpetaDeSalida, isValidConfig, loadConfig } from './generate';
import type { TaishoConfig } from '../generate';
import { crearMotor, type Cambio, type Motor } from './motor';
import { idioma, m, usarIdioma } from './idioma';
import { esAvisoInformativo, warningLine } from './mensajes-avisos';
import { mensajeDe } from './errores';

export interface TaishoViteOptions {
	/** Ruta al `taisho.config.ts`, relativa a la raíz de Vite. Default: `./taisho.config.ts`. */
	config?: string;
	/** Carpeta de salida, relativa a la raíz de Vite. Manda sobre el `out` de la config. Default: ese `out`; sin él, `./taisho/`. */
	out?: string;
}

export function taisho(options: TaishoViteOptions = {}): Plugin {
	let vite: ResolvedConfig;
	let servidor: ViteDevServer | undefined;
	let configPath = '';
	let targetDir = '';
	let paqueteJson = '';
	let contenido = new Set<string>();
	let cola: Promise<unknown> = Promise.resolve();
	let motor: Motor | undefined;
	let cargada: unknown;
	let configSucia = true;
	const tandas = new Map<string, Promise<string[]>>();
	const manifiestosVigilados = new Map<string, fs.FSWatcher>();

	const configDir = () => path.dirname(configPath);

	function cubre(abs: string): boolean {
		const globs = (cargada as TaishoConfig | undefined)?.content ?? [];
		const rel = path.relative(configDir(), abs).split(path.sep);
		if (abs.startsWith(targetDir + path.sep)) return false;
		if (rel.some((s) => s.startsWith('.') && s !== '..')) return false;
		return globs.some((g) => (rel.includes('node_modules') ? g.split('/').includes('node_modules') : true) && path.matchesGlob(rel.join('/'), g));
	}

	function vigilarBases() {
		if (!servidor) return;
		for (const g of (cargada as TaishoConfig).content ?? []) {
			const segmentos = g.split('/');
			const magico = segmentos.findIndex((s) => /[*?[\]{}()!]/.test(s));
			const base = path.resolve(configDir(), ...segmentos.slice(0, magico === -1 ? -1 : magico));
			if (base !== vite.root && !base.startsWith(vite.root + path.sep)) servidor.watcher.add(base);
		}
	}

	function vigilarManifiestos() {
		if (!servidor) return;
		const s = servidor;
		for (const archivo of motor?.manifiestos ?? []) {
			const dir = path.dirname(archivo);
			if (manifiestosVigilados.has(dir)) continue;
			const w = fs.watch(dir, (_evento, nombre) => {
				if (nombre === path.basename(archivo)) s.watcher.emit('change', archivo);
			});
			w.on('error', () => {
				w.close();
				manifiestosVigilados.delete(dir);
			});
			w.unref();
			manifiestosVigilados.set(dir, w);
		}
	}

	async function generar(cambio: Cambio): Promise<string[]> {
		let nueva: TaishoConfig | undefined;
		if (configSucia) {
			cargada = await loadConfig(configPath);
			configSucia = !isValidConfig(cargada);
			nueva = cargada as TaishoConfig;
		}
		if (!isValidConfig(cargada)) {
			throw new Error(m().config.invalidaDetalle(configPath));
		}
		usarIdioma(undefined, cargada);
		let salida;
		if (!motor) {
			targetDir = carpetaDeSalida(cargada, configPath, options.out === undefined ? undefined : path.resolve(vite.root, options.out), vite.root);
			motor = crearMotor(cargada, { targetDir, cwd: vite.root, configDir: configDir(), soloSiCambia: true });
			salida = await motor.actualizar();
		} else {
			salida = await motor.actualizar(nueva ? { configCambio: nueva } : cambio);
		}
		for (const aviso of salida.avisosNuevos) {
			if (esAvisoInformativo(aviso)) vite.logger.info(`[taisho] ℹ ${warningLine(aviso, idioma())}`);
			else vite.logger.warnOnce(`[taisho] ${warningLine(aviso, idioma())}`);
		}
		contenido = new Set(salida.contenido.map((f) => path.resolve(configDir(), f)));
		vigilarBases();
		vigilarManifiestos();
		return salida.escritos.map((f) => path.join(targetDir, f));
	}

	const encolar = (cambio: Cambio = {}): Promise<string[]> => {
		const corrida = cola.then(() => generar(cambio));
		cola = corrida.catch(() => {});
		return corrida;
	};

	return {
		name: 'taisho',

		configResolved(resolved) {
			vite = resolved;
			configPath = path.resolve(vite.root, options.config ?? 'taisho.config.ts');
			targetDir = path.resolve(vite.root, options.out ?? 'taisho');
			paqueteJson = path.resolve(vite.root, 'package.json');
		},

		configureServer(s) {
			servidor = s;
			for (const w of manifiestosVigilados.values()) w.close();
			manifiestosVigilados.clear();
			s.httpServer?.once('close', () => {
				for (const w of manifiestosVigilados.values()) w.close();
				manifiestosVigilados.clear();
			});
			motor = undefined;
			configSucia = true;
		},

		async buildStart() {
			await encolar();
			this.addWatchFile(configPath);
			this.addWatchFile(paqueteJson);
			for (const f of motor?.manifiestos ?? []) this.addWatchFile(f);
			for (const f of contenido) this.addWatchFile(f);
		},

		async hotUpdate({ type, file, modules, server }) {
			const abs = path.resolve(file);
			const esConfig = abs === configPath;
			const esPaquete = abs === paqueteJson || !!motor?.manifiestos.includes(abs);
			const cambio: Cambio | undefined =
				esConfig && type !== 'delete' ? {}
				: esPaquete && cargada ? { configCambio: cargada as TaishoConfig }
				: type === 'update' && contenido.has(abs) ? { cambiados: [abs] }
				: type === 'create' && cubre(abs) ? { altas: [abs] }
				: type === 'delete' && contenido.has(abs) ? { bajas: [abs] }
				: undefined;
			if (!cambio) return;

			const clave = `${type}:${abs}`;
			let tanda = tandas.get(clave);
			if (!tanda) {
				if (esConfig) configSucia = true;
				tanda = encolar(cambio);
				tandas.set(clave, tanda);
				const limpiar = () => setImmediate(() => tandas.delete(clave));
				tanda.then(limpiar, limpiar);
				tanda.catch((err) => {
					const e = err instanceof Error ? err : new Error(String(err));
					const texto = String(mensajeDe(e));
					vite.logger.error(`[taisho] ${texto}`, { error: e });
					server.ws.send({ type: 'error', err: { message: texto, stack: e.stack ?? '' } });
				});
			}

			let escritos: string[];
			try {
				escritos = await tanda;
			} catch {
				return [];
			}

			const grafo = this.environment.moduleGraph;
			const css = escritos.flatMap((escrito) => [...(grafo.getModulesByFile(escrito) ?? [])]);
			for (const mod of css) grafo.invalidateModule(mod);
			return [...new Set([...modules, ...css])];
		},
	};
}
