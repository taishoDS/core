// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import type { ContentFile, TaishoConfig, TaishoExtensions } from '../generate';
import { avisosDeCheck, varsDeclaradas, varsDelTema } from '../generate/avisos-check';
import type { Aviso } from '../generate/avisos-clases';
import { defaultStates } from '../config/taisho.user';
import taisho from '../config/themes/taisho';
import { readContent } from './read-content';
import { loadConfig, isValidConfig, carpetaDeSalida } from './generate';
import { globDeRuta } from './migrate';
import { idioma, m, usarIdioma, type Lang } from './idioma';
import { warningText } from './mensajes-avisos';
import { mensajeDe } from './errores';
import { extensionesDelProyecto } from './descubrir-paquetes';

const CONTENT_POR_DEFECTO = ['**/*.{html,svelte,vue,astro,jsx,tsx,js,ts,css}'];
const EXCLUIDAS_POR_DEFECTO = ['dist', 'build', 'coverage'];
const TEXTO = /\.(html?|svelte|vue|astro|jsx|tsx|[mc]?[jt]s|css|md|mdx)$/;

export interface RunCheckOptions {
	globs?: string[];
	configPath?: string;
	format?: 'text' | 'json';
	lang?: Lang;
	/** Activa la regla opcional `other-scale` (`--other-scale`). */
	otherScale?: boolean;
}

export const VERSION_JSON = 1;

export type AvisoJson = Aviso & { message: string };

export interface ResultadoJson {
	version: typeof VERSION_JSON;
	files: number;
	warnings: AvisoJson[];
}

export const avisoAJson = (a: Aviso, lang: Lang): AvisoJson =>
	({ file: a.file, line: a.line, column: a.column, rule: a.rule, severity: a.severity, code: a.code, params: a.params, message: warningText(a, lang), ...(a.suggestion && { suggestion: a.suggestion }) }) as AvisoJson;

const uso = (mensaje: string) => {
	console.error(mensaje);
	process.exitCode = 2;
};

export const configDeFabrica =(): TaishoConfig => ({ themes: { taisho }, fontFaces: [], defaultStates });

function cssImportado(archivos: readonly ContentFile[], baseDir: string): string[] {
	const vistos = new Set<string>();
	const textos: string[] = [];
	const resolver = (spec: string, desde: string): string | null => {
		if (/^\.{0,2}\//.test(spec)) return path.resolve(desde, spec);
		for (let dir = desde; ; dir = path.dirname(dir)) {
			const candidato = path.join(dir, 'node_modules', spec);
			if (fs.existsSync(candidato)) return candidato;
			if (path.dirname(dir) === dir) return null;
		}
	};
	const leer = (spec: string, desde: string) => {
		const ruta = resolver(spec.split('?')[0], desde);
		if (!ruta || vistos.has(ruta) || !fs.existsSync(ruta) || !fs.statSync(ruta).isFile()) return;
		vistos.add(ruta);
		const css = fs.readFileSync(ruta, 'utf8');
		textos.push(css);
		for (const m of css.matchAll(/@import\s+(?:url\()?['"]([^'"]+\.css)['"]/g)) leer(m[1], path.dirname(ruta));
	};
	for (const f of archivos) {
		const desde = path.dirname(path.resolve(baseDir, f.file));
		for (const m of f.content.matchAll(/@import\s+(?:url\()?['"]([^'"]+\.css[^'"]*)['"]|\bimport\s+(?:[\w$]+\s+from\s+)?['"]([^'"]+\.css[^'"]*)['"]/g)) leer(m[1] ?? m[2], desde);
	}
	return textos;
}

export interface Proyecto {
	cwd: string;
	configPath: string;
	/** `null` si el proyecto no tiene `taisho.config.ts`. */
	config: TaishoConfig | null;
	extensiones: TaishoExtensions;
}

/** Un proyecto que no se pudo cargar: `lineas` es lo que se le dice a quien lo usa, una por línea. */
export class ErrorDeProyecto extends Error {
	constructor(readonly lineas: string[]) {
		super(lineas.join('\n'));
	}
}

/** Carga la config del proyecto (si existe) y las extensiones de sus paquetes. Lanza `ErrorDeProyecto` si no se puede. */
export async function cargarProyecto(cwd: string, configPath?: string): Promise<Proyecto> {
	const ruta = path.resolve(cwd, configPath ?? 'taisho.config.ts');
	let config: TaishoConfig | null = null;
	if (fs.existsSync(ruta)) {
		let cargada: unknown;
		try {
			cargada = await loadConfig(ruta);
		} catch (err) {
			throw new ErrorDeProyecto([m().config.noCargo(path.relative(cwd, ruta)), String(mensajeDe(err))]);
		}
		if (!isValidConfig(cargada)) throw new ErrorDeProyecto([m().config.invalida(path.relative(cwd, ruta))]);
		config = cargada;
	} else if (configPath) {
		throw new ErrorDeProyecto([m().config.noEncontrada(path.relative(cwd, ruta))]);
	}
	return { cwd, configPath: ruta, config, extensiones: extensionesDelProyecto(cwd) };
}

/**
 * La config con la que se revisa el código. Sin `taisho.config.ts` es la de fábrica, con las escalas de color y las
 * variables que declara el CSS que `archivos` importa.
 */
export function configParaCheck(proyecto: Proyecto, archivos: readonly ContentFile[], baseDir: string): { config: TaishoConfig; validasExtra: string[] } {
	if (proyecto.config) return { config: proyecto.config, validasExtra: [] };
	const { extensiones } = proyecto;
	const config = configDeFabrica();
	const importados = cssImportado(archivos, baseDir);
	const conocidos = varsDelTema(config, extensiones);
	const validasExtra = importados.flatMap((css) => [...varsDeclaradas(css)]);
	const semilla = taisho.colors.brand;
	const colores: typeof taisho.colors & Record<string, string> = { ...taisho.colors };
	for (const css of importados) {
		for (const m of css.matchAll(/--color-([a-z][\w-]*)-500\s*:/g)) if (!conocidos.has(`--color-${m[1]}-500`)) colores[m[1]] = semilla;
	}
	return { config: { ...config, themes: { taisho: { ...taisho, colors: colores }} }, validasExtra };
}

export async function runCheck(options: RunCheckOptions): Promise<void> {
	const cwd = process.cwd();
	usarIdioma(options.lang);
	let proyecto: Proyecto;
	try {
		proyecto = await cargarProyecto(cwd, options.configPath);
	} catch (err) {
		if (!(err instanceof ErrorDeProyecto)) throw err;
		for (const linea of err.lineas) console.error(linea);
		process.exitCode = 2;
		return;
	}
	const { configPath, config, extensiones } = proyecto;
	if (config) usarIdioma(options.lang, config);

	const conGlobs = !!options.globs?.length;
	const baseDir = !conGlobs && config?.content ? path.dirname(configPath) : cwd;
	const outDir = carpetaDeSalida(config, configPath, undefined, cwd);
	const leer = (globs: string[], excluir?: string[]) => readContent({ globs, baseDir, outDir, excluir }).filter((f) => TEXTO.test(f.file));
	let archivos: ContentFile[];
	if (conGlobs) {
		const porArchivo = new Map<string, ContentFile>();
		for (const arg of options.globs!) {
			const encontrados = leer([globDeRuta(arg, cwd, baseDir, '*.{html,svelte,vue,astro,jsx,tsx,js,ts,css}')]);
			if (!encontrados.length) return uso(m().check.ningunoCoincide(arg));
			for (const f of encontrados) porArchivo.set(f.file, f);
		}
		archivos = [...porArchivo.values()];
	} else {
		archivos = config?.content ? leer(config.content) : leer(CONTENT_POR_DEFECTO, EXCLUIDAS_POR_DEFECTO);
		if (!archivos.length) return uso(m().check.sinArchivos(!!config?.content));
	}

	const { config: configFinal, validasExtra } = configParaCheck(proyecto, archivos, baseDir);

	const avisos = avisosDeCheck(archivos, configFinal, validasExtra, extensiones, { otherScale: options.otherScale });
	const resumen = m().check.resumen(archivos.length, avisos.length);
	if (options.format === 'json') {
		const warnings = avisos.map((a) => avisoAJson(a, idioma()));
		const resultado: ResultadoJson = { version: VERSION_JSON, files: archivos.length, warnings };
		console.log(JSON.stringify(resultado, null, 2));
		console.error(resumen);
	} else {
		for (const a of avisos) console.log(`${a.file}:${a.line}:${a.column}  ${a.rule}  ${warningText(a, idioma())}`);
		console.log(resumen);
	}
	if (avisos.some((a) => a.severity === 'error')) process.exitCode = 1;
}
