// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type Metafile, type Plugin } from 'esbuild';
import { minify as terser } from 'terser';
import { PESADOS } from '../src/lib/core/modulos';
import { PISO_JS } from '../src/generate-cli/piso';

const RAIZ = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CORE = path.join(RAIZ, 'src/lib/core');
const VERSION: string = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;

export interface ArchivoJs {
	ruta: string;
	texto: string;
}

export interface OpcionesCoreDirecto {
	prefijo?: string;
	minify?: boolean;
	banner?: string;
	metafiles?: Metafile[];
}

export const PESADOS_DIRECTO = fs.readdirSync(path.join(CORE, 'pesados')).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, '')).sort();

/**
 * Segundo paso de minificado, sólo en nuestro build (terser es devDependency: el CLI del consumidor no lo carga).
 * Mangle de nombres locales nada más (sin `mangle.properties`), sin `pure_getters` ni `unsafe_*`: no se borra ninguna lectura de propiedad.
 */
async function pasarPorTerser(texto: string, banner?: string): Promise<string> {
	const { code } = await terser(texto, {
		module: true,
		ecma: 2022,
		compress: { passes: 3 },
		mangle: true,
		format: { comments: false },
	});
	if (code === undefined) throw new Error('terser no devolvió código');
	return banner ? `${banner}\n${code}` : code;
}

export async function construirCoreDirecto({ prefijo = 'taisho.core', minify = false, banner, metafiles }: OpcionesCoreDirecto = {}): Promise<ArchivoJs[]> {
	const outdir = path.join(RAIZ, '.core-directo');
	const comun = {
		bundle: true,
		format: 'esm' as const,
		target: PISO_JS,
		minify,
		write: false,
		outdir,
		logLevel: 'warning' as const,
		metafile: metafiles !== undefined,
		define: { __TAISHO_CORE_VERSION__: JSON.stringify(VERSION) },
		...(banner ? { banner: { js: banner } } : {}),
	};
	const pesadosExternos: Plugin = {
		name: 'pesados-externos',
		setup(b) {
			b.onResolve({ filter: /^\.\/pesados\/[\w-]+$/ }, (a) => ({ path: `./${prefijo}.${a.path.slice('./pesados/'.length)}.js`, external: true }));
		},
	};
	const tablaRecortada: Plugin = {
		name: 'tabla-recortada',
		setup(b) {
			b.onLoad({ filter: /src[\\/]lib[\\/]core[\\/]modulos\.ts$/ }, () => ({
				contents: `export const PESADOS = ${JSON.stringify(PESADOS)};\nexport const archivoDe = (n) => n.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());`,
				loader: 'js',
			}));
		},
	};
	const base = await build({ ...comun, entryPoints: { [prefijo]: path.join(CORE, 'auto.ts') }, plugins: [pesadosExternos, tablaRecortada] });
	const pesados = await build({
		...comun,
		splitting: true,
		entryPoints: Object.fromEntries(PESADOS_DIRECTO.map((n) => [`${prefijo}.${n}`, path.join(CORE, 'pesados', `${n}.ts`)])),
		chunkNames: `${prefijo}.chunk-[hash]`,
	});
	for (const r of [base, pesados]) if (metafiles && r.metafile) metafiles.push(r.metafile);
	const archivos = [...(base.outputFiles ?? []), ...(pesados.outputFiles ?? [])];
	return Promise.all(archivos.map(async (f) => ({ ruta: path.relative(outdir, f.path).split(path.sep).join('/'), texto: minify ? await pasarPorTerser(f.text, banner) : f.text })));
}
