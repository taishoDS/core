// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import type { TaishoConfig } from '../generate';
import { leerTema, migrarTailwind, prepararTailwind, TEMA_VACIO, unirTemas, type ResultadoMigrarTailwind, type SinConvertirTexto, type TemaTailwind } from '../generate/migrar-tailwind-texto';
import { TAILWIND_VERSION } from '../generate/tailwind-map';
import { readContent } from './read-content';
import { loadConfig, isValidConfig, carpetaDeSalida } from './generate';
import { globDeRuta } from './migrate';
import { idioma, m, usarIdioma, type Lang } from './idioma';
import { textoMotivo, textoNotas } from './mensajes-avisos';
import type { NotaTailwind } from '../generate/avisos-tipos';
import { mensajeDe } from './errores';
import { extensionesDelProyecto } from './descubrir-paquetes';

const CONTENT_POR_DEFECTO = ['**/*.{html,svelte,vue,astro,jsx,tsx,js,ts,css}'];
const PATRON_CARPETA = '*.{html,svelte,vue,astro,jsx,tsx,js,ts,css}';
const EXCLUIDAS_POR_DEFECTO = ['dist', 'build', 'coverage'];
const TEXTO = /\.(html?|svelte|vue|astro|jsx|tsx|[mc]?[jt]s|css|md|mdx)$/;

export interface VersionTailwind {
	version: string | null;
	major: number | null;
	fuente: 'node_modules' | 'package.json' | null;
}

export function detectarTailwind(cwd: string): VersionTailwind {
	const major = (v: string) => Number(/\d+/.exec(v)?.[0]) || null;
	const leer = (ruta: string): Record<string, unknown> | null => {
		try {
			return JSON.parse(fs.readFileSync(ruta, 'utf8'));
		} catch {
			return null;
		}
	};
	for (let dir = cwd; ; dir = path.dirname(dir)) {
		const v = leer(path.join(dir, 'node_modules/tailwindcss/package.json'))?.version;
		if (typeof v === 'string') return { version: v, major: major(v), fuente: 'node_modules' };
		if (path.dirname(dir) === dir) break;
	}
	const pkg = leer(path.join(cwd, 'package.json'));
	for (const campo of ['dependencies', 'devDependencies']) {
		const rango = (pkg?.[campo] as Record<string, string> | undefined)?.tailwindcss;
		if (rango) return { version: rango, major: major(rango), fuente: 'package.json' };
	}
	return { version: null, major: null, fuente: null };
}

export interface RunMigrateTailwindOptions {
	write?: boolean;
	configPath?: string;
	outDir?: string;
	rutas?: string[];
	lang?: Lang;
}

interface ArchivoMigrado {
	file: string;
	cambia: boolean;
	r: ResultadoMigrarTailwind;
}

export interface DatosReporte {
	write: boolean;
	tailwind: VersionTailwind;
	config: string | null;
	configsTailwind: string[];
	archivos: ArchivoMigrado[];
	revisados: number;
}

const ubic = (file: string, línea: number) => `${file}:${línea}`;

function agrupar(tokens: readonly string[]): string[] {
	const n = new Map<string, number>();
	for (const t of tokens) n.set(t, (n.get(t) ?? 0) + 1);
	return [...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([t, c]) => `${t} ×${c}`);
}

const FUERA_DE_CLASES = new Set<SinConvertirTexto['tipo']>(['classlist', 'fragment']);

export function armarReporte(d: DatosReporte): string[] {
	const out: string[] = [];
	const linea = (s = '') => out.push(s);
	const t = m().tailwind;

	linea(t.cabecera(d.write));
	linea('');
	linea(
		d.tailwind.version
			? t.version(d.tailwind.version, d.tailwind.fuente === 'node_modules' ? 'node_modules' : 'package.json', TAILWIND_VERSION)
			: t.sinTailwind(TAILWIND_VERSION.replace('.x', '')),
	);
	linea(d.config ? t.config(d.config) : t.sinConfig);
	linea(d.write ? t.escribe : t.commitAntes);

	const archivos = d.archivos;
	const sinConv = archivos.flatMap((a) => a.r.sinConvertir.map((s) => ({ ...s, file: a.file })));
	const fuera = archivos.flatMap((a) => a.r.fuera.map((f) => ({ ...f, file: a.file })));
	const ajenas = archivos.flatMap((a) => a.r.ajenas.map((j) => j.token));
	const convertidas = archivos.flatMap((a) => a.r.convertidas.map((c) => ({ ...c, file: a.file })));

	const tocados = archivos.filter((a) => a.cambia);
	linea('');
	linea(t.convertidos(d.write, tocados.length));
	if (!tocados.length) linea(t.nada);
	for (const a of tocados) linea(t.archivo(a.file, a.r.totales.convertidos, a.r.llaves));

	const choques = sinConv.filter((s) => s.tipo === 'conflict');
	if (choques.length) {
		linea('');
		linea(t.choques(choques.length));
		for (const s of choques) linea(`  ${ubic(s.file, s.línea)}  ${s.token}  [conflict] ${textoMotivo(s.motivo, idioma())}`);
	}

	const aprox = new Map<string, { scope: string; notas?: NotaTailwind[]; donde: string[] }>();
	for (const c of convertidas.filter((x) => !x.exacta)) {
		const g = aprox.get(c.origen) ?? { scope: c.scope, notas: c.notas, donde: [] };
		g.donde.push(ubic(c.file, c.línea));
		aprox.set(c.origen, g);
	}
	if (aprox.size) {
		linea('');
		linea(t.aprox(aprox.size));
		for (const [origen, g] of [...aprox].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
			linea(`  ${origen} → ${g.scope}  ×${g.donde.length}${g.notas ? `  ${textoNotas(g.notas, idioma()).replace(/\.\. /g, '. ')}` : ''}`);
			linea(`    ${g.donde.join(', ')}`);
		}
	}

	const pendientes = sinConv.filter((s) => s.tipo !== 'conflict' && !FUERA_DE_CLASES.has(s.tipo));
	if (pendientes.length) {
		linea('');
		linea(t.pendientes(pendientes.length));
		for (const s of pendientes) linea(`  ${ubic(s.file, s.línea)}  ${s.token}  [${s.tipo}] ${textoMotivo(s.motivo, idioma())}`);
	}

	const sueltas = [
		...sinConv.filter((s) => FUERA_DE_CLASES.has(s.tipo)).map((s) => ({ file: s.file, línea: s.línea, token: s.token, tipo: s.tipo as string, motivo: textoMotivo(s.motivo, idioma()), sugerencia: undefined as string | undefined })),
		...fuera.map((f) => ({ file: f.file, línea: f.línea, token: f.token, tipo: f.tipo as string, motivo: textoMotivo(f.motivo, idioma()), sugerencia: f.sugerencia })),
	].sort((a, b) => (a.file === b.file ? a.línea - b.línea : a.file < b.file ? -1 : 1));
	const configs = d.configsTailwind.map((c) => ({ file: c, motivo: t.configTailwind }));
	if (sueltas.length || configs.length) {
		linea('');
		linea(t.fuera(sueltas.length + configs.length));
		for (const c of configs) linea(`  ${c.file}  [config] ${c.motivo}`);
		for (const s of sueltas) {
			linea(`  ${ubic(s.file, s.línea)}  ${s.token}  [${s.tipo}] ${s.motivo}`);
			if (s.sugerencia) linea(t.sugerencia(s.sugerencia));
		}
	}

	if (ajenas.length) {
		linea('');
		linea(t.ajenas(ajenas.length));
		linea(`  ${agrupar(ajenas).join(', ')}`);
	}

	const tot = archivos.reduce((s, a) => ({ llaves: s.llaves + a.r.llaves, conv: s.conv + a.r.totales.convertidos }), { llaves: 0, conv: 0 });
	const nSueltas = sueltas.length + configs.length;
	linea('');
	linea(
		t.resumen({
			revisados: d.revisados,
			tocados: tocados.length,
			write: d.write,
			convertidas: tot.conv,
			conOtroValor: aprox.size ? [...aprox.values()].reduce((s, g) => s + g.donde.length, 0) : null,
			llaves: tot.llaves,
			choques: choques.length,
			pendientes: pendientes.length,
			fuera: nSueltas,
			ajenas: ajenas.length,
		}),
	);

	linea('');
	linea(t.paraTerminar);
	if (choques.length + pendientes.length + nSueltas + tot.conv === 0) linea(t.nadaQueConvertir);
	if (choques.length) linea(t.resolverChoques);
	if (pendientes.length + nSueltas) linea(t.resolverAMano);
	if (aprox.size) linea(t.mirarAprox);
	for (const l of t.convivencia) linea(l);
	linea(t.sacarTailwind);
	return out;
}

const uso = (mensaje: string) => {
	console.error(mensaje);
	process.exitCode = 2;
};

export async function runMigrateTailwind(options: RunMigrateTailwindOptions): Promise<void> {
	const cwd = process.cwd();
	usarIdioma(options.lang);
	const tailwind = detectarTailwind(cwd);
	if (tailwind.major !== null && tailwind.major < 4) {
		return uso(m().tailwind.tailwind3(tailwind.version!));
	}

	const configPath = path.resolve(cwd, options.configPath ?? 'taisho.config.ts');
	let config: TaishoConfig = { themes: {}, fontFaces: [] };
	let conConfig = false;
	if (fs.existsSync(configPath)) {
		let cargada: unknown;
		try {
			cargada = await loadConfig(configPath);
		} catch (err) {
			console.error(m().config.noCargo(path.relative(cwd, configPath)));
			console.error(mensajeDe(err));
			process.exitCode = 2;
			return;
		}
		if (!isValidConfig(cargada)) return uso(m().config.invalida(path.relative(cwd, configPath)));
		config = cargada;
		conConfig = true;
		usarIdioma(options.lang, config);
	} else if (options.configPath) {
		return uso(m().config.noEncontrada(path.relative(cwd, configPath)));
	}

	const conRutas = !!options.rutas?.length;
	const baseDir = !conRutas && config.content ? path.dirname(configPath) : cwd;
	const outDir = carpetaDeSalida(config, configPath, options.outDir, cwd);
	const leer = (globs: string[], excluir?: string[]) => readContent({ globs, baseDir, outDir, excluir }).filter((f) => TEXTO.test(f.file));
	let archivos;
	if (conRutas) {
		const porArchivo = new Map<string, { file: string; content: string }>();
		for (const ruta of options.rutas!) {
			const encontrados = leer([globDeRuta(ruta, cwd, baseDir, PATRON_CARPETA)]);
			if (!encontrados.length) return uso(m().check.ningunoCoincide(ruta));
			for (const f of encontrados) porArchivo.set(f.file, f);
		}
		archivos = [...porArchivo.values()];
	} else if (config.content) {
		archivos = [...new Map([...leer(config.content), ...leer(['**/*.css'], EXCLUIDAS_POR_DEFECTO)].map((f) => [f.file, f])).values()];
	} else {
		archivos = leer(CONTENT_POR_DEFECTO, EXCLUIDAS_POR_DEFECTO);
	}
	if (!archivos.length) return uso(m().tailwind.sinArchivos);

	const paraTema = conRutas ? [...archivos, ...leer(['**/*.css'], EXCLUIDAS_POR_DEFECTO)] : archivos;
	const tema: TemaTailwind = paraTema.reduce((t, f) => unirTemas(t, /\.(css|svelte|html?|vue|astro)$/.test(f.file) ? leerTema(f.content) : TEMA_VACIO), TEMA_VACIO);

	const contexto = prepararTailwind(config, extensionesDelProyecto(cwd));
	const migrados: ArchivoMigrado[] = archivos
		.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
		.map((f) => {
			const r = migrarTailwind(f.content, { ...contexto, tema, esCss: f.file.endsWith('.css') });
			return { file: f.file, cambia: r.texto !== f.content, r };
		});
	if (options.write) {
		for (const m of migrados) {
			if (m.cambia && !m.file.endsWith('.css')) fs.writeFileSync(path.resolve(baseDir, m.file), m.r.texto);
		}
	}

	const configsTailwind = fs.readdirSync(cwd).filter((n) => /^tailwind\.config\.[cm]?[jt]s$/.test(n));
	for (const linea of armarReporte({
		write: !!options.write,
		tailwind,
		config: conConfig ? path.relative(cwd, configPath) : null,
		configsTailwind,
		archivos: migrados,
		revisados: archivos.length,
	})) {
		console.log(linea);
	}
}
