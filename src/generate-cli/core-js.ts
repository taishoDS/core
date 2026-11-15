// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { MODULOS, archivoDe, type NombreModulo } from '../lib/core/modulos';
import { DEFAULT_COPYRIGHT } from '../generate/compile';
import { PISO_JS } from './piso';
import { VERSION_CSS } from '../generate/version';

function carpetaDeModulos(): string {
	const aqui = path.dirname(fileURLToPath(import.meta.url));
	const empaquetada = path.join(aqui, 'core-modules');
	return fs.existsSync(empaquetada) ? empaquetada : path.resolve(aqui, '../lib/core');
}

const slugsDe = (modulo: NombreModulo): readonly string[] => {
	const ficha = MODULOS[modulo] as { slugs?: readonly string[]; slugsSafelist?: readonly string[] };
	return ficha.slugs ?? ficha.slugsSafelist ?? [];
};

export const ARCHIVO_AVISO_LLAVE = 'taisho.core.key-warning.js';

export function entryDelCore(modulos: readonly NombreModulo[], carpeta: string): string {
	const dir = (archivo: string) => JSON.stringify(path.join(carpeta, archivo).split(path.sep).join('/'));
	const elegidos = new Set<string>(modulos);
	const lineas: string[] = [`import { iniciar } from ${dir('nucleo')};`, `import { avisarVersiones } from ${dir('version')};`,`import { pedirAvisoLlave } from ${dir('desarrollo-local')};`,`import { m } from ${dir('registro')};`];
	const conFicha = modulos.filter((n) => n !== 'invalid');
	for (const n of conFicha) lineas.push(`import { ficha as ${n} } from ${dir(archivoDe(n))};`);
	lineas.push(`Object.assign(m, { ${conFicha.join(', ')} });`);
	lineas.push(`export { nextIndex } from ${dir('roving')};`);
	lineas.push(`export { setTexts } from ${dir('textos')};`);
	let hayFaltantes = false;
	for (const n of Object.keys(MODULOS) as NombreModulo[]) {
		const funciones = (MODULOS[n] as { funciones?: Readonly<Record<string, string>> }).funciones;
		if (!funciones) continue;
		if (elegidos.has(n)) {
			lineas.push(`export { ${Object.entries(funciones).map(([publico, interno]) => (publico === interno ? publico : `${interno} as ${publico}`)).join(', ')} } from ${dir(archivoDe(n))};`);
			continue;
		}
		for (const publico of Object.keys(funciones)) lineas.push(`export const ${publico} = falta(${JSON.stringify(publico)}, ${JSON.stringify(slugsDe(n)[0] ?? '')});`);
		hayFaltantes = true;
	}
	if (hayFaltantes) {
		lineas.push('function falta(nombre, slug) { return () => { throw new Error(`taisho: ${nombre}() no entró a taisho.core.js porque nada de tu contenido lo nombra. Se suma ${slug ? `safelist: [\'${slug}\'] en tu taisho.config.ts` : \'a `content` de tu taisho.config.ts el archivo que la llama\'}.`); }; }');
	}
	lineas.push(
		`export function init(root = document) { avisarVersiones(); if (root.getRootNode() === document) pedirAvisoLlave(() => import('./${ARCHIVO_AVISO_LLAVE}')); iniciar(root); return Promise.resolve(); }`,
		"if (typeof document !== 'undefined') {",
		"    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());",
		'    else init();',
		'}',
	);
	return lineas.join('\n');
}

export async function construirCoreJs(modulos: readonly NombreModulo[]): Promise<string> {
	const carpeta = carpetaDeModulos();
	const { outputFiles } = await build({
		stdin: { contents: entryDelCore(modulos, carpeta), resolveDir: carpeta, loader: 'ts' },
		bundle: true,
		format: 'esm',
		target: PISO_JS,
		minify: true,
		write: false,
		legalComments: 'none',
		logLevel: 'silent',
		external: [`./${ARCHIVO_AVISO_LLAVE}`],
		banner: { js: `/* TaishoDS — ${DEFAULT_COPYRIGHT} */` },
		define: { __TAISHO_CORE_VERSION__: JSON.stringify(VERSION_CSS) },
	});
	return outputFiles[0].text;
}

/** El aviso de la llave `ts`, aparte: `taisho.core.js` sólo lo pide (con `import()`) en desarrollo local, así que en producción no pesa. */
export async function construirAvisoLlaveJs(): Promise<string> {
	const carpeta = carpetaDeModulos();
	const { outputFiles } = await build({
		entryPoints: [path.join(carpeta, 'aviso-llave')],
		bundle: true,
		format: 'esm',
		target: PISO_JS,
		minify: true,
		write: false,
		outdir: 'salida',
		legalComments: 'none',
		logLevel: 'silent',
		banner: { js: `/* TaishoDS — ${DEFAULT_COPYRIGHT} */` },
		define: { __TAISHO_CORE_VERSION__: JSON.stringify(VERSION_CSS) },
	});
	return outputFiles[0].text;
}

export interface ArchivoJs {
	ruta: string;
	texto: string;
}

/**
 * El JS completo, para cuando no hay `content`: los mismos archivos que arma `build:core` (`core.js` + sus trozos `core.*.js`,
 * con los componentes pesados cargándose a pedido), pero con el prefijo `taisho.core` de la salida del consumidor.
 * Instalado, se copian del paquete (hermanos de `cli.js`); en el repo no existen, así que se arman con el mismo constructor.
 */
export async function construirCoreCompleto(): Promise<ArchivoJs[]> {
	const aqui = path.dirname(fileURLToPath(import.meta.url));
	if (!fs.existsSync(path.join(aqui, 'core.js'))) {
		const ruta = '../../scripts/build-core-directo';
		const { construirCoreDirecto } = (await import(/* @vite-ignore */ ruta)) as { construirCoreDirecto: (o: { minify: boolean; banner: string }) => Promise<ArchivoJs[]> };
		return construirCoreDirecto({ minify: true, banner: `/* TaishoDS — ${DEFAULT_COPYRIGHT} */` });
	}
	const hermanos = (a: string) => a === 'core.js' || /^core\.[\w-]+\.js$/.test(a);
	return fs
		.readdirSync(aqui)
		.filter(hermanos)
		.sort()
		.map((a) => ({
			ruta: `taisho.${a}`,
			texto: fs.readFileSync(path.join(aqui, a), 'utf8').replace(/(["'])\.\/core\.([\w-]+\.js)\1/g, '$1./taisho.core.$2$1'),
		}));
}
