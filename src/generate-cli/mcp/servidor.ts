// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { REGLAS_DE_ESCRITURA } from '../../generate/llms/reglas';
import { cargarProyecto } from '../check';
import { versionDelCore } from '../descubrir-paquetes';
import { idiomaDelSistema, usarIdioma, type Lang } from '../idioma';
import type { TaishoConfig } from '../../generate/vocabulary';
import type { TaishoExtensions } from '../../generate/extension';
import { crearCargador, crearHerramientas, type CarpetasDeDatos } from './herramientas';
import { servirMcp, type EsquemaEntrada, type Herramienta } from './protocolo';

export interface RunMcpOptions {
	configPath?: string;
	lang?: Lang;
}

export type McpInputSchema = EsquemaEntrada;
export type McpTool = Herramienta;

export interface McpProject {
	cwd: string;
	/** Ruta absoluta de la config en uso; `null` si el proyecto no tiene `taisho.config.ts` (entonces `config` es el tema de fábrica). */
	configFile: string | null;
	config: TaishoConfig;
	extensions: TaishoExtensions;
	lang: Lang;
}

export interface McpContext {
	cwd: string;
	lang: Lang;
	/** Una carga de la config, releída cuando cambia, compartida con las herramientas del Core. */
	project(): Promise<McpProject>;
}

export interface CreateMcpServerOptions {
	name: string;
	version: string;
	configPath?: string;
	lang?: Lang;
	tools?: (ctx: McpContext) => McpTool[];
	/** Herramientas del Core que `tools` reemplaza. */
	replaces?: string[];
	/** Se agrega después de las reglas del Core. */
	instructions?: (lang: Lang) => string;
}

export interface McpServer {
	readonly tools: readonly McpTool[];
	/** Lo que se envía en `initialize`. Al empezar `listen` se recalcula con el idioma de la config del proyecto. */
	readonly instructions: string;
	listen(input?: Readable, output?: Writable): Promise<void>;
}

/** En el paquete, los datos están en `mcp/` junto a `cli.js`; en el repo, en `src/core-datos/`. */
function carpetasDeDatos(base: string): CarpetasDeDatos {
	const delPaquete = { ejemplos: fileURLToPath(new URL('./mcp/ejemplos', base)), prosa: fileURLToPath(new URL('./mcp/prosa', base)) };
	if (fs.existsSync(delPaquete.prosa)) return delPaquete;
	return { ejemplos: fileURLToPath(new URL('../../core-datos/ejemplos', base)), prosa: fileURLToPath(new URL('../../core-datos/prosa', base)) };
}

/**
 * Un servidor MCP con las herramientas del Core y, si se pasan, las propias. Los errores de nombres salen acá, al crearlo:
 * una herramienta propia con el nombre de una del Core sólo se admite si está en `replaces`.
 */
export function createMcpServer(options: CreateMcpServerOptions): McpServer {
	// La raíz del proyecto es la carpeta del `--config` (un cliente global arranca el servidor en otra parte) o, sin él, la actual.
	const configPath = options.configPath && path.resolve(process.cwd(), options.configPath);
	const cwd = configPath ? path.dirname(configPath) : process.cwd();
	const cargador = crearCargador({ cwd, configPath, lang: options.lang });
	let idioma: Lang = options.lang ?? idiomaDelSistema();

	const delCore = crearHerramientas({ cwd, configPath, lang: options.lang, datos: carpetasDeDatos(import.meta.url) }, cargador);
	const ctx: McpContext = {
		cwd,
		get lang() {
			return idioma;
		},
		async project() {
			const { cargado, config, extensiones, idioma: lang } = await cargador.actual();
			return { cwd, configFile: cargado.proyecto.config ? cargado.proyecto.configPath : null, config, extensions: extensiones, lang };
		},
	};
	const propias = options.tools?.(ctx) ?? [];
	const reemplazadas = options.replaces ?? [];

	const nombresCore = new Set(delCore.map((h) => h.name));
	const nombresPropios = new Set<string>();
	for (const { name } of propias) {
		if (nombresPropios.has(name)) throw new Error(`createMcpServer: tool "${name}" is repeated in \`tools\``);
		nombresPropios.add(name);
		if (nombresCore.has(name) && !reemplazadas.includes(name)) {
			throw new Error(`createMcpServer: tool "${name}" is already a Core tool; list it in \`replaces\` to replace it`);
		}
	}
	for (const name of reemplazadas) {
		if (!nombresCore.has(name)) throw new Error(`createMcpServer: \`replaces\` names "${name}", which is not a Core tool`);
		if (!nombresPropios.has(name)) throw new Error(`createMcpServer: \`replaces\` names "${name}", but \`tools\` has no tool with that name`);
	}
	const tools: McpTool[] = [
		...delCore.map((h) => (reemplazadas.includes(h.name) ? propias.find((p) => p.name === h.name)! : h)),
		...propias.filter((p) => !nombresCore.has(p.name)),
	];

	const textoInstrucciones = (): string => {
		const extra = options.instructions?.(idioma);
		return extra ? `${REGLAS_DE_ESCRITURA[idioma]}\n\n${extra}` : REGLAS_DE_ESCRITURA[idioma];
	};
	let instructions = textoInstrucciones();

	return {
		tools,
		get instructions() {
			return instructions;
		},
		async listen(input: Readable = process.stdin, output: Writable = process.stdout): Promise<void> {
			// stdout es sólo del protocolo: cualquier `console.log` de una dependencia o de la config del proyecto va a stderr.
			if (output === process.stdout) console.log = (...args: unknown[]) => console.error(...args);
			const config = await cargarProyecto(cwd, configPath).then((p) => p.config, () => null);
			idioma = usarIdioma(options.lang, config);
			instructions = textoInstrucciones();
			await servirMcp({ entrada: input, salida: output, herramientas: tools, instructions, nombre: options.name, version: options.version });
		},
	};
}

/** `taisho mcp`: sirve el protocolo por stdin/stdout hasta que el cliente cierra la entrada. */
export async function runMcp(options: RunMcpOptions): Promise<void> {
	await createMcpServer({ name: 'taisho', version: versionDelCore(), configPath: options.configPath, lang: options.lang }).listen();
}
