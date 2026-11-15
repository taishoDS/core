// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenizar } from '../generate/emit-flat';
import type { ContentFile, TaishoExtension, TaishoExtensions } from '../generate';
import { ConfigError, type ConfigErrorData, type ConfigKeyError } from '../generate/errores-config';
import { soloClases } from './solo-clases';
import { m } from './idioma';

export const NOMBRE_CORE = '@taishods/core';
const MANIFIESTO = './taisho.manifest.json';

export interface PaqueteConManifiesto {
	nombre: string;
	version: string;
	dir: string;
	core: string;
	componentes: Record<string, string[]>;
	estilos?: TaishoExtension;
	archivo: string;
	raiz: string;
}

const MAX_BYTES = 1024 * 1024;

const errorDe = (paquete: string, datos: ConfigErrorData, sub = '') => new ConfigError([{ path: `extensions[${JSON.stringify(paquete)}]${sub}`, ...datos } as ConfigKeyError]);

const dentro = (raiz: string, real: string) => real.startsWith(raiz + path.sep);

export function leerDePaquete(nombre: string, raiz: string, abs: string, ruta: string): string {
	const real = fs.realpathSync(abs);
	if (!dentro(raiz, real)) throw errorDe(nombre, { code: 'manifest-path-escapes', params: { file: ruta } });
	if (!fs.lstatSync(real).isFile()) throw errorDe(nombre, { code: 'manifest-file-invalid', params: { file: ruta, reason: 'not-file' } });
	const fd = fs.openSync(real, 'r');
	try {
		if (fs.fstatSync(fd).size > MAX_BYTES) throw errorDe(nombre, { code: 'manifest-file-invalid', params: { file: ruta, reason: 'too-big' } });
		return fs.readFileSync(fd, 'utf8');
	} finally {
		fs.closeSync(fd);
	}
}

const fueraDeLugar = (rel: string) => path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..');

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function sinPrototipo(x: unknown): unknown {
	if (Array.isArray(x)) return x.map(sinPrototipo);
	if (!esObjeto(x)) return x;
	const copia: Record<string, unknown> = Object.create(null);
	for (const [k, v] of Object.entries(x)) copia[k] = sinPrototipo(v);
	return copia;
}

export function extensionesDe(paquetes: readonly PaqueteConManifiesto[]): TaishoExtensions {
	const extensiones: Record<string, TaishoExtension> = Object.create(null);
	for (const p of paquetes) if (p.estilos) extensiones[p.nombre] = p.estilos;
	return extensiones;
}

export function versionDelCore(): string {
	let dir = path.dirname(fileURLToPath(import.meta.url));
	for (let i = 0; i < 5; i++) {
		const candidato = path.join(dir, 'package.json');
		if (fs.existsSync(candidato)) return JSON.parse(fs.readFileSync(candidato, 'utf8')).version;
		dir = path.dirname(dir);
	}
	return '0.0.0';
}

export function verificarCore(paquete: Pick<PaqueteConManifiesto, 'nombre' | 'version' | 'core'>, versionCore: string): void {
	if (paquete.core !== versionCore) {
		throw new Error(m().generate.coreDistinto(paquete.nombre, paquete.version, NOMBRE_CORE, paquete.core, versionCore));
	}
}

export function archivosElegidos(componentes: Record<string, string[]>, tokens: Iterable<string>): string[] {
	const archivos = new Set<string>();
	for (const token of tokens) {
		const limpio = token.replace(/^[./:]+|[./:]+$/g, '');
		const clave = Object.hasOwn(componentes, limpio) ? limpio : limpio.split('.')[0];
		if (Object.hasOwn(componentes, clave)) for (const a of componentes[clave]) archivos.add(a);
	}
	return [...archivos];
}

function carpetaDelPaquete(desde: string, nombre: string): string | null {
	for (let dir = desde; ; dir = path.dirname(dir)) {
		const candidato = path.join(dir, 'node_modules', nombre);
		if (fs.existsSync(path.join(candidato, 'package.json'))) return candidato;
		if (path.dirname(dir) === dir) return null;
	}
}

export function descubrirPaquetes(cwd: string, versionCore: string): PaqueteConManifiesto[] {
	const pkgPath = path.join(cwd, 'package.json');
	if (!fs.existsSync(pkgPath)) return [];
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	const nombres = new Set<string>();
	for (const campo of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
		for (const nombre of Object.keys(pkg[campo] ?? {})) nombres.add(nombre);
	}

	const paquetes: PaqueteConManifiesto[] = [];
	for (const nombre of [...nombres].sort()) {
		const carpeta = carpetaDelPaquete(cwd, nombre);
		if (!carpeta) continue;
		const dePaquete = JSON.parse(fs.readFileSync(path.join(carpeta, 'package.json'), 'utf8'));
		const salida = dePaquete.exports?.[MANIFIESTO];
		const relativo: unknown = typeof salida === 'string' ? salida : salida?.default;
		if (typeof relativo !== 'string') continue;
		if (dePaquete.name !== nombre) throw errorDe(nombre, { code: 'package-name-mismatch', params: { name: String(dePaquete.name) } });

		const raiz = fs.realpathSync(carpeta);
		const archivo = path.resolve(carpeta, relativo);
		if (fueraDeLugar(relativo)) throw errorDe(nombre, { code: 'manifest-path-escapes', params: { file: relativo } });
		let manifiesto: unknown;
		const texto = leerDePaquete(nombre, raiz, archivo, relativo);
		try {
			manifiesto = JSON.parse(texto);
		} catch {
			throw errorDe(nombre, { code: 'manifest-json', params: { file: relativo } });
		}
		if (!esObjeto(manifiesto)) throw errorDe(nombre, { code: 'manifest-shape', params: { expected: 'object' } });
		if (manifiesto.format !== 3) throw errorDe(nombre, { code: 'manifest-format', params: { version: String(dePaquete.version), format: manifiesto.format } });
		const { core, componentFiles, extension } = manifiesto;
		const formaOk =
			typeof core === 'string' &&
			esObjeto(componentFiles) &&
			Object.values(componentFiles).every((a) => Array.isArray(a) && a.every((r) => typeof r === 'string')) &&
			(extension === undefined || (esObjeto(extension) && (extension.roots === undefined || (Array.isArray(extension.roots) && extension.roots.every((r) => typeof r === 'string')))));
		if (!formaOk) throw errorDe(nombre, { code: 'manifest-shape', params: { expected: '{ format: 3, core: string, componentFiles: Record<string, string[]>, extension?: object }' } });
		const paquete: PaqueteConManifiesto = {
			nombre,
			version: dePaquete.version,
			dir: path.dirname(archivo),
			core,
			componentes: sinPrototipo(componentFiles) as Record<string, string[]>,
			...(extension !== undefined && { estilos: sinPrototipo(extension) as TaishoExtension }),
			archivo,
			raiz,
		};
		verificarCore(paquete, versionCore);
		paquetes.push(paquete);
	}
	return paquetes;
}

export function extensionesDelProyecto(cwd: string, versionCore = versionDelCore()): TaishoExtensions {
	return extensionesDe(descubrirPaquetes(cwd, versionCore));
}

export function leerArchivoDelPaquete(paquete: PaqueteConManifiesto, rel: string): string {
	if (fueraDeLugar(rel)) throw errorDe(paquete.nombre, { code: 'manifest-path-escapes', params: { file: rel } });
	return leerDePaquete(paquete.nombre, paquete.raiz, path.join(paquete.dir, rel), rel);
}

export interface ArchivosDePaquetesOptions {
	cwd: string;
	configDir: string;
	propios: readonly ContentFile[];
	versionCore: string;
}

export function archivosDePaquetes({ cwd, configDir, propios, versionCore }: ArchivosDePaquetesOptions): ContentFile[] {
	const paquetes = descubrirPaquetes(cwd, versionCore);
	if (!paquetes.length) return [];

	const tokens = new Set(propios.flatMap((f) => tokenizar(f.content)));
	const vistos = new Set(propios.map((f) => f.file));
	const out: ContentFile[] = [];
	for (const paquete of paquetes) {
		for (const rel of archivosElegidos(paquete.componentes, tokens)) {
			const abs = path.join(paquete.dir, rel);
			const file = path.relative(configDir, abs).split(path.sep).join('/');
			if (vistos.has(file)) continue;
			vistos.add(file);
			out.push({ file, content: soloClases(abs, leerArchivoDelPaquete(paquete, rel)) });
		}
	}
	return out;
}
