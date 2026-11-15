// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { transform } from 'esbuild';
import {
	deriveThemeVocabulary,
	resolveThemeTokens,
	buildTokensCSS,
	buildFontsCSS,
	compile,
	pruneTheme,
	CORE_JS_THEME_VARS,
	DEFAULT_CUSTOM_ICONS_DIR,
	type TaishoConfig,
	type TaishoExtensions,
} from '../generate';
import type { IconEntry } from '../generate/icon-utils';
import { analizarArchivo, clasesPropias, derivarVocabulario, unirAnalisis, DEFAULT_COPYRIGHT, type AnalisisArchivo } from '../generate/compile';
import { avisosMarcaVsEstado } from '../generate/emit-tokens';
import { buildClassTypesExtension } from '../generate/emit-classes';
import { respaldosDeFuentes, validarEstilosDeFuentes } from '../generate/respaldo-fuentes';
import { bloquesQueEntran, prepararFlat, seleccionarFlat, tokenizar } from '../generate/emit-flat';
import { materialDeSecciones, usaSecciones } from '../generate/emit-tokens';
import { avisosDeArchivo, datosDe } from '../generate/avisos-clases';
import type { EngineWarning } from '../generate/avisos-tipos';
import {
	cargarIconosPropios,
	cargarLucide,
	scanHtmlIcons,
	spriteDeUsos,
	usoDeIconos,
	type RecursosIconos,
	type UsoDeIconos,
} from './scan-html-icons';
import { listarContent, readContent } from './read-content';
import { archivosElegidos, descubrirPaquetes, extensionesDe, leerArchivoDelPaquete, versionDelCore, type PaqueteConManifiesto } from './descubrir-paquetes';
import { clasesDeContenido, soloClases } from './solo-clases';
import { construirCoreJs, construirCoreCompleto, construirAvisoLlaveJs, ARCHIVO_AVISO_LLAVE, type ArchivoJs } from './core-js';
import { conRequeridos, modulosDeArchivo, modulosDeSlugs, type NombreModulo } from '../lib/core/modulos';

export interface WriteConsumerOutputResult {
	temas: string[];
	fonts: string;
	sistema: string;
	js: string;
	iconos: string | null;
	tipos: string | null;
	warnings: EngineWarning[];
	escritos: string[];
	contenido: string[];
}

export interface WriteConsumerOutputOptions {
	targetDir: string;
	cwd: string;
	configDir?: string;
	soloSiCambia?: boolean;
	versionCore?: string;
}

export interface Cambio {
	cambiados?: string[];
	altas?: string[];
	bajas?: string[];
	configCambio?: TaishoConfig;
}

export interface ResultadoMotor extends WriteConsumerOutputResult {
	avisosNuevos: EngineWarning[];
	ms: number;
}

export interface EstadisticasMotor {
	cssArmados: number;
	cssMinificados: number;
	temasPodados: number;
	spritesArmados: number;
	jsArmados: number;
}

export interface Motor {
	actualizar(cambio?: Cambio): Promise<ResultadoMotor>;
	readonly stats: Readonly<EstadisticasMotor>;
	readonly manifiestos: readonly string[];
}

interface Entrada {
	raw: string;
	clases: string;
	tokens: readonly string[];
	vars: string[];
	uso: UsoDeIconos;
	analisis?: AnalisisArchivo;
	avisos?: EngineWarning[];
	modulos?: NombreModulo[];
	deLosPaquetes?: string[][];
}

const entrada = (file: string, raw: string, propio: boolean): Entrada => {
	const clases = propio ? clasesDeContenido(file, raw) : raw;
	return { raw, clases, tokens: tokenizar(clases), vars: raw.match(/--[a-zA-Z][\w-]*/g) ?? [], uso: usoDeIconos(file, raw) };
};

const ARCHIVO_TIPOS = 'taisho.classes.d.ts';

const posix = (rel: string) => rel.split(path.sep).join('/');

const claveAviso = (a: EngineWarning) => JSON.stringify([a.file, a.line, a.code, a.params]);

export function crearMotor(inicial: TaishoConfig, opciones: WriteConsumerOutputOptions): Motor {
	const { targetDir, cwd, configDir = cwd, soloSiCambia = false, versionCore = versionDelCore() } = opciones;
	const stats: EstadisticasMotor = { cssArmados: 0, cssMinificados: 0, temasPodados: 0, spritesArmados: 0, jsArmados: 0 };
	let config = inicial;

	let porConfig: ReturnType<typeof prepararConfig> | undefined;
	let paquetes: PaqueteConManifiesto[] | undefined;
	let extensiones: TaishoExtensions | undefined;
	const descubiertos = () => {
		paquetes ??= descubrirPaquetes(cwd, versionCore);
		return (extensiones ??= extensionesDe(paquetes));
	};
	const prepararConfig = () => {
		const ext = descubiertos();
		const tema = deriveThemeVocabulary(config, ext);
		const vocab = derivarVocabulario(config, tema, ext);
		const temas = tema.themeEntries.map((entry) => {
			const model = resolveThemeTokens(entry, tema.userFonts, tema.defaultStates, tema.userScales, ext);
			const key = entry.group === 'root' ? entry.name : `${entry.group}-${entry.name}`;
			return { key, avisos: [...model.warnings, ...avisosMarcaVsEstado(entry, tema.defaultStates)], completo: buildTokensCSS(model, config.darkMode), secciones: materialDeSecciones(model) };
		});
		validarEstilosDeFuentes(config.fontFaces, cwd);
		const propias = clasesPropias(config, tema, vocab, ext);
		return {
			vocab,
			tipos: propias.length ? buildClassTypesExtension(propias.map((n) => `ts-${n}`)) : null,
			temas,
			fonts: buildFontsCSS(config.fontFaces, respaldosDeFuentes(config.fontFaces, cwd)),
			plano: prepararFlat({ reset: vocab.reset, atomic: vocab.atomic, utilities: vocab.utilities, components: vocab.components, scales: vocab.userScales, userUtilities: vocab.userUtilities }),
			datosAvisos: datosDe(vocab),
			vecinos: new Map<string, string | undefined>(),
			completo: undefined as { css: string; min: string; warnings: EngineWarning[] } | undefined,
		};
	};

	let lucide: Pick<RecursosIconos, 'lucideNodes' | 'lucideAliases'> | undefined;
	let propios: Record<string, IconEntry> | undefined;
	const customDir = path.resolve(cwd, DEFAULT_CUSTOM_ICONS_DIR);
	const leidosDePaquete = new Map<string, string>();

	let entradas = new Map<string, Entrada>();
	const deLosPaquetes = new Map<string, Entrada>();

	let ultimaSeleccion: { clave: string; css: string; min: string } | undefined;
	let ultimoTema: { css: string; vars: string; temas: string[] } | undefined;
	let ultimoSprite: { huella: string; sprite: string } | undefined;
	let ultimoJs: { clave: string; js: string } | undefined;
	let jsCompleto: ArchivoJs[] | undefined;
	let avisoLlaveJs: string | undefined;
	let avisosPrevios = new Set<string>();

	const relativa = (r: string) => posix(path.relative(configDir, path.resolve(configDir, r)));
	const esDeIconosPropios = (r: string) => {
		const abs = path.resolve(configDir, r);
		return abs.startsWith(customDir + path.sep) && abs.endsWith('.svg');
	};

	function sincronizar(cambio: Cambio | undefined) {
		const completo = !cambio || cambio.configCambio !== undefined;
		if (completo) {
			const nuevas = new Map<string, Entrada>();
			for (const f of readContent({ globs: config.content!, baseDir: configDir, outDir: targetDir })) {
				const previa = entradas.get(f.file);
				nuevas.set(f.file, previa && previa.raw === f.content ? previa : entrada(f.file, f.content, true));
			}
			entradas = nuevas;
			return;
		}
		for (const r of cambio.bajas ?? []) entradas.delete(relativa(r));
		for (const r of [...(cambio.cambiados ?? []), ...(cambio.altas ?? [])]) {
			const file = relativa(r);
			const esAlta = cambio.altas?.includes(r);
			if (!esAlta && !entradas.has(file)) continue;
			const abs = path.resolve(configDir, r);
			if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
				entradas.delete(file);
				continue;
			}
			const raw = fs.readFileSync(abs, 'utf8');
			const previa = entradas.get(file);
			if (!previa || previa.raw !== raw) entradas.set(file, entrada(file, raw, true));
		}
	}

	function archivosDePaquete(): Array<[string, Entrada]> {
		descubiertos();
		const lista = paquetes!;
		if (!lista.length) return [];
		const vistos = new Set(entradas.keys());
		const salida: Array<[string, Entrada]> = [];
		lista.forEach((paquete, i) => {
			const elegidos = new Set<string>();
			for (const e of entradas.values()) {
				if (!e.deLosPaquetes) {
					const tokens = new Set(tokenizar(e.raw));
					e.deLosPaquetes = lista.map((p) => archivosElegidos(p.componentes, tokens));
				}
				for (const a of e.deLosPaquetes[i]) elegidos.add(a);
			}
			for (const rel of elegidos) {
				const abs = path.join(paquete.dir, rel);
				const file = posix(path.relative(configDir, abs));
				if (vistos.has(file)) continue;
				vistos.add(file);
				let content = leidosDePaquete.get(abs);
				if (content === undefined) leidosDePaquete.set(abs, (content = soloClases(abs, leerArchivoDelPaquete(paquete, rel))));
				let e = deLosPaquetes.get(file);
				if (!e || e.raw !== content) deLosPaquetes.set(file, (e = entrada(file, content, false)));
				salida.push([file, e]);
			}
		});
		return salida;
	}

	function avisosCssFueraDeContent(propios: ReadonlySet<string>, completos: string[], podados: string[]): EngineWarning[] {
		const declaradas = (css: string[]) => new Set(css.flatMap((c) => [...c.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1])));
		const existentes = declaradas(completos);
		const vivas = declaradas(podados);
		const avisos: EngineWarning[] = [];
		for (const file of listarContent({ globs: ['**/*.css'], baseDir: configDir, outDir: targetDir, excluir: ['dist', 'build', 'coverage'] })) {
			if (propios.has(file)) continue;
			const css = fs.readFileSync(path.resolve(configDir, file), 'utf8');
			const variables = [...new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))].filter((v) => existentes.has(v) && !vivas.has(v));
			if (variables.length) avisos.push({ code: 'css-outside-content', params: { variables: variables.slice(0, 3) }, file });
		}
		return avisos;
	}

	async function actualizar(cambio?: Cambio): Promise<ResultadoMotor> {
		const t0 = performance.now();
		if (cambio?.configCambio) {
			config = cambio.configCambio;
			porConfig = undefined;
			paquetes = extensiones = undefined;
			leidosDePaquete.clear();
			deLosPaquetes.clear();
			for (const e of entradas.values()) e.analisis = e.avisos = e.modulos = e.deLosPaquetes = undefined;
			ultimaSeleccion = ultimoTema = ultimoJs = undefined;
		}
		const cfg = (porConfig ??= prepararConfig());
		const { vocab } = cfg;
		const conContent = config.content !== undefined;

		const deIconos = [...(cambio?.cambiados ?? []), ...(cambio?.altas ?? []), ...(cambio?.bajas ?? [])].some(esDeIconosPropios);
		if (deIconos) {
			propios = undefined;
			ultimoSprite = undefined;
		}

		let delContenido: Array<[string, Entrada]> = [];
		let dePaquetes: Array<[string, Entrada]> = [];
		let css: string;
		let min: string;
		let warningsCompile: EngineWarning[];
		let js: string;
		let archivosJs: ArchivoJs[];
		if (conContent) {
			sincronizar(cambio);
			dePaquetes = archivosDePaquete();
			delContenido = [...entradas];
			const todos = [...delContenido, ...dePaquetes].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
			const analisis = todos.map(([file, e]) => (e.analisis ??= analizarArchivo(vocab, file, e.tokens, true)));
			const { variantes, planas, warnings, forzadas } = unirAnalisis(vocab, config, analisis, true);
			warningsCompile = [...warnings];
			const entran = bloquesQueEntran(cfg.plano, { usadas: planas, forzadas });
			const varsDelProyecto = new Set(todos.flatMap(([, e]) => e.vars).filter((v) => /^--ts-(?:lh|ls)-/.test(v)));
			const clave = `${entran.map((b) => b.name).join('\n')}\0${[...variantes].join('\n')}\0${[...varsDelProyecto].sort().join(' ')}`;
			if (ultimaSeleccion?.clave !== clave) {
				const armado = `/* TaishoDS — ${DEFAULT_COPYRIGHT} */\n` + seleccionarFlat(cfg.plano, { variantesUsadas: variantes, usadas: planas, forzadas, varsDelProyecto });
				stats.cssArmados++;
				const { code } = await transform(armado, { loader: 'css', minify: true });
				stats.cssMinificados++;
				ultimaSeleccion = { clave, css: armado, min: code };
			}
			({ css, min } = ultimaSeleccion);

			const elegidos = new Set<NombreModulo>(modulosDeSlugs(unirAnalisis(vocab, config, [], true).enteros, true));
			for (const [, e] of delContenido) {
				e.modulos ??= modulosDeArchivo(e.tokens, e.analisis!.enteros, e.raw);
				for (const n of e.modulos) elegidos.add(n);
			}
			const modulos = conRequeridos(elegidos);
			const claveJs = modulos.join(',');
			if (ultimoJs?.clave !== claveJs) {
				ultimoJs = { clave: claveJs, js: await construirCoreJs(modulos) };
				stats.jsArmados++;
			}
			js = ultimoJs.js;
			avisoLlaveJs ??= await construirAvisoLlaveJs();
			archivosJs = [{ ruta: 'taisho.core.js', texto: js }, { ruta: ARCHIVO_AVISO_LLAVE, texto: avisoLlaveJs }];
		} else {
			entradas = new Map();
			if (!cfg.completo) {
				const { css: armado, warnings } = compile(config, [], { extensions: extensiones });
				stats.cssArmados++;
				const { code } = await transform(armado, { loader: 'css', minify: true });
				stats.cssMinificados++;
				cfg.completo = { css: armado, min: code, warnings };
			}
			({ css, min } = cfg.completo);
			warningsCompile = cfg.completo.warnings;
			if (!jsCompleto) {
				jsCompleto = await construirCoreCompleto();
				stats.jsArmados++;
			}
			archivosJs = jsCompleto;
			js = jsCompleto.find((a) => a.ruta === 'taisho.core.js')!.texto;
		}
		const sistema = conContent ? 'taisho.css' : 'taisho.full.css';

		const crudo = [...delContenido, ...dePaquetes].map(([, e]) => e);
		const nombresTemas = cfg.temas.map((t) => (cfg.temas.length === 1 ? 'theme.css' : `theme-${t.key}.css`));
		let temasCss: string[];
		if (conContent) {
			const vars = new Set<string>(CORE_JS_THEME_VARS);
			for (const e of crudo) for (const v of e.vars) vars.add(v);
			const huellaVars = [...vars].sort().join(' ');
			if (ultimoTema?.css !== css || ultimoTema.vars !== huellaVars) {
				stats.temasPodados++;
				ultimoTema = { css, vars: huellaVars, temas: cfg.temas.map((t) => pruneTheme(usaSecciones(css) ? t.completo + t.secciones : t.completo, css, vars)) };
			}
			temasCss = ultimoTema.temas;
		} else temasCss = cfg.temas.map((t) => t.completo + t.secciones);

		let sprite: string;
		if (conContent) {
			const usos = crudo.map((e) => e.uso);
			const huella = `${(config.icons ?? []).join(',')}\0${usos.map((u) => `${u.soloAviso ? 1 : 0}${[...u.nombres].join(',')}`).join('\n')}`;
			if (ultimoSprite?.huella !== huella) {
				lucide ??= cargarLucide(cwd);
				propios ??= cargarIconosPropios(cwd, DEFAULT_CUSTOM_ICONS_DIR);
				sprite = spriteDeUsos({ ...lucide, customIcons: propios }, usos, config.icons ?? [], DEFAULT_CUSTOM_ICONS_DIR);
				stats.spritesArmados++;
				ultimoSprite = { huella, sprite };
			} else sprite = ultimoSprite.sprite;
		} else {
			sprite = scanHtmlIcons({ skip: targetDir, customIconsDir: DEFAULT_CUSTOM_ICONS_DIR, cwd, safelist: config.icons });
		}

		const ajenos = new Set(dePaquetes.map(([file]) => file));
		const warnings: EngineWarning[] = [...cfg.temas.flatMap((t) => t.avisos), ...warningsCompile.filter((w) => w.file === undefined || !ajenos.has(w.file))];
		if (conContent) {
			const delMarkup = new Map<string, EngineWarning>();
			for (const [file, e] of delContenido) {
				e.avisos ??= avisosDeArchivo({ file, content: e.raw }, cfg.datosAvisos, cfg.vecinos).map(({ code, params, file, line }) => ({ code, params, file, line }) as EngineWarning);
				for (const a of e.avisos) if (!delMarkup.has(claveAviso(a))) delMarkup.set(claveAviso(a), a);
			}
			warnings.push(...delMarkup.values());
			warnings.push(...avisosCssFueraDeContent(new Set(delContenido.map(([file]) => file)), cfg.temas.map((t) => t.completo), temasCss));
		}

		const salidas: Array<[string, string]> = [['fonts.css', cfg.fonts]];
		nombresTemas.forEach((nombre, i) => salidas.push([nombre, temasCss[i]]));
		salidas.push([sistema, min]);
		for (const { ruta, texto } of archivosJs) salidas.push([ruta, texto]);
		const iconos = sprite.includes('<symbol') ? 'taisho.icons.svg' : null;
		if (iconos) salidas.push([iconos, sprite]);

		const tipos = cfg.tipos === null ? null : ARCHIVO_TIPOS;
		if (cfg.tipos !== null) salidas.push([ARCHIVO_TIPOS, cfg.tipos]);

		fs.mkdirSync(targetDir, { recursive: true });
		if (tipos === null) fs.rmSync(path.join(targetDir, ARCHIVO_TIPOS), { force: true });
		const nombresJs = new Set(archivosJs.map((a) => a.ruta));
		for (const f of fs.readdirSync(targetDir)) if (/^taisho\.core\..+\.js$/.test(f) && !nombresJs.has(f)) fs.rmSync(path.join(targetDir, f));
		const escritos: string[] = [];
		for (const [nombre, datos] of salidas) {
			const destino = path.join(targetDir, nombre);
			if (soloSiCambia && fs.existsSync(destino) && fs.readFileSync(destino, 'utf8') === datos) continue;
			fs.writeFileSync(destino, datos);
			escritos.push(nombre);
		}

		const avisosNuevos = warnings.filter((w) => !avisosPrevios.has(claveAviso(w)));
		avisosPrevios = new Set(warnings.map(claveAviso));
		return {
			temas: nombresTemas,
			fonts: 'fonts.css',
			sistema,
			js,
			iconos,
			tipos,
			warnings,
			escritos,
			contenido: conContent ? [...delContenido, ...dePaquetes].map(([file]) => file) : [],
			avisosNuevos,
			ms: performance.now() - t0,
		};
	}

	return {
		actualizar,
		stats,
		get manifiestos() {
			return (paquetes ?? []).map((p) => p.archivo);
		},
	};
}
