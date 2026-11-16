// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGLAS_DE_ESCRITURA } from '../../generate/llms/reglas';
import { cargarProyecto } from '../check';
import { versionDelCore } from '../descubrir-paquetes';
import { usarIdioma, type Lang } from '../idioma';
import { crearHerramientas, type CarpetasDeDatos } from './herramientas';
import { servirMcp } from './protocolo';

export interface RunMcpOptions {
	configPath?: string;
	lang?: Lang;
}

/** En el paquete, los datos están en `mcp/` junto a `cli.js`; en el repo, en las carpetas de la doc. */
function carpetasDeDatos(base: string): CarpetasDeDatos {
	const delPaquete = { ejemplos: fileURLToPath(new URL('./mcp/ejemplos', base)), prosa: fileURLToPath(new URL('./mcp/prosa', base)) };
	if (fs.existsSync(delPaquete.prosa)) return delPaquete;
	return { ejemplos: fileURLToPath(new URL('../../routes/_docs/core-ejemplos', base)), prosa: fileURLToPath(new URL('../../routes/_docs/generado/core-prosa', base)) };
}

/** `taisho mcp`: sirve el protocolo por stdin/stdout hasta que el cliente cierra la entrada. */
export async function runMcp(options: RunMcpOptions): Promise<void> {
	// stdout es sólo del protocolo: cualquier `console.log` de una dependencia o de la config del proyecto va a stderr.
	console.log = (...args: unknown[]) => console.error(...args);
	// La raíz del proyecto es la carpeta del `--config` (un cliente global arranca el servidor en otra parte) o, sin él, la actual.
	const configPath = options.configPath && path.resolve(process.cwd(), options.configPath);
	const cwd = configPath ? path.dirname(configPath) : process.cwd();
	const config = await cargarProyecto(cwd, configPath).then((p) => p.config, () => null);
	const idioma = usarIdioma(options.lang, config);
	await servirMcp({
		entrada: process.stdin,
		salida: process.stdout,
		herramientas: crearHerramientas({ cwd, configPath, lang: options.lang, datos: carpetasDeDatos(import.meta.url) }),
		instructions: REGLAS_DE_ESCRITURA[idioma],
		nombre: 'taisho',
		version: versionDelCore(),
	});
}
