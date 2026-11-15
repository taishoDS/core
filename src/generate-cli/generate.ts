// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';
import type { TaishoConfig } from '../generate';
import { writeConsumerOutput } from './write-consumer-output';
import { idioma, m, usarIdioma, type Lang } from './idioma';
import { warningLine } from './mensajes-avisos';
import { mensajeDe } from './errores';

const DEFAULT_OUT_DIR = 'taisho';

export function displayPath(absolute: string): string {
	const rel = path.relative(process.cwd(), absolute);
	return rel.startsWith('..') ? absolute : rel || '.';
}

export interface RunGenerateOptions {
	configPath?: string;
	outDir?: string;
	strict?: boolean;
	lang?: Lang;
}

export function isValidConfig(value: unknown): value is TaishoConfig {
	if (!value || typeof value !== 'object') return false;
	const themes = (value as Partial<TaishoConfig>).themes;
	return !!themes && typeof themes === 'object' && Object.keys(themes).length > 0;
}

export async function loadConfig(configPath: string): Promise<unknown> {
	const jiti = createJiti(import.meta.url, { moduleCache: false });
	const mod = await jiti.import(configPath);
	return (mod as { default?: unknown; config?: unknown }).default ?? (mod as { config?: unknown }).config;
}

export async function cargarConfig(configPath: string, lang?: Lang): Promise<TaishoConfig> {
	if (!fs.existsSync(configPath)) {
		throw new Error(m().config.noEncontradaInit(displayPath(configPath)));
	}

	let loaded: unknown;
	try {
		loaded = await loadConfig(configPath);
	} catch (err) {
		throw new Error(m().config.noCargoCon(displayPath(configPath), String(err instanceof Error ? err.message : err)), { cause: err });
	}

	if (!isValidConfig(loaded)) {
		throw new Error(m().config.invalidaDetalle(displayPath(configPath)));
	}
	usarIdioma(lang, loaded);
	return loaded;
}

export async function runGenerate(options: RunGenerateOptions): Promise<void> {
	const configPath = path.resolve(process.cwd(), options.configPath ?? 'taisho.config.ts');
	usarIdioma(options.lang);

	let loaded: TaishoConfig;
	try {
		loaded = await cargarConfig(configPath, options.lang);
	} catch (err) {
		console.error(mensajeDe(err));
		process.exitCode = 1;
		return;
	}

	const cwd = process.cwd();
	const targetDir = path.resolve(cwd, options.outDir ?? DEFAULT_OUT_DIR);
	console.log(m().generate.compilando(displayPath(configPath)));

	let salida: Awaited<ReturnType<typeof writeConsumerOutput>>;
	try {
		salida = await writeConsumerOutput(loaded, { targetDir, cwd, configDir: path.dirname(configPath) });
	} catch (err) {
		console.error(mensajeDe(err));
		process.exitCode = 1;
		return;
	}

	for (const aviso of salida.warnings) console.warn(`⚠ ${warningLine(aviso, idioma())}`);
	if (options.strict && salida.warnings.length) {
		console.error(m().generate.estricto(salida.warnings.length));
		process.exitCode = 1;
	}

	const rel = (archivo: string) => displayPath(path.join(targetDir, archivo));
	console.log(m().generate.generado(displayPath(targetDir)));
	console.log(m().generate.pegar);
	console.log(`  <link rel="stylesheet" href="${rel(salida.fonts)}">`);
	for (const tema of salida.temas) {
		console.log(`  <link rel="stylesheet" href="${rel(tema)}">`);
	}
	console.log(`  <link rel="stylesheet" href="${rel(salida.sistema)}">`);
	console.log(`  <script type="module" src="${salida.js === null ? 'node_modules/@taishods/core/core.js' : rel('taisho.core.js')}"></script>`);
	if (salida.iconos) {
		console.log(m().generate.iconos);
		console.log(`  <svg><use href="${rel(salida.iconos)}${m().generate.usoIcono}"></use></svg>`);
	}
	if (salida.tipos) console.log(m().generate.tipos(rel(salida.tipos)));
}
