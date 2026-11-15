// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type Metafile, type Plugin } from 'esbuild';
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
	return [...(base.outputFiles ?? []), ...(pesados.outputFiles ?? [])].map((f) => ({ ruta: path.relative(outdir, f.path).split(path.sep).join('/'), texto: f.text }));
}
