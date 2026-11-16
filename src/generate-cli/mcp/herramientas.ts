// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { avisosDeCheck, varsDelTema } from '../../generate/avisos-check';
import { derivarVocabulario, type Vocabulario } from '../../generate/compile';
import { parseUtilities } from '../../generate/emit-flat';
import { fichaMarkdown, type DatosFicha, type GuiaFicha } from '../../generate/llms/ficha';
import { migrarTailwind, prepararTailwind, TEMA_VACIO } from '../../generate/migrar-tailwind-texto';
import { escalasDe } from '../../generate/naming-table';
import { manifiestoDelCore } from '../../generate/registro';
import { deriveThemeVocabulary, type TaishoConfig } from '../../generate/vocabulary';
import { SHADES } from '../../lib/theme/palette';
import { contratoCore } from '../../routes/_docs/core-contract';
import { avisoAJson, cargarProyecto, configDeFabrica, configParaCheck, VERSION_JSON, type Proyecto, type ResultadoJson } from '../check';
import { usarIdioma, m, type Lang } from '../idioma';
import { textoMotivo, textoNotas } from '../mensajes-avisos';
import type { Herramienta } from './protocolo';

/** Dónde están, en disco, los datos que viajan con el paquete: `<idioma>/<slug>.json` en cada carpeta. */
export interface CarpetasDeDatos {
	ejemplos: string;
	prosa: string;
}

export interface OpcionesHerramientas {
	cwd: string;
	configPath?: string;
	lang?: Lang;
	datos: CarpetasDeDatos;
}

interface Prosa {
	nombre: string;
	guia?: GuiaFicha;
	teclado?: DatosFicha['teclado'];
	nucleo?: string;
}

interface Cargado {
	mtime: number | null;
	proyecto: Proyecto;
	vocabulario?: Vocabulario;
}

const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 200;

const json = (valor: unknown): string => JSON.stringify(valor);
const texto = (args: Record<string, unknown>, clave: string): string => {
	const valor = args[clave];
	if (typeof valor !== 'string') throw new Error(`"${clave}" must be a string`);
	return valor;
};
const primeraOracion = (que: string) => /^.+?[.!?](?=\s|$)/s.exec(que)?.[0].replace(/\s+/g, ' ') ?? que;

export function crearHerramientas(opciones: OpcionesHerramientas): Herramienta[] {
	const { cwd, configPath, lang: pedido, datos } = opciones;
	const ruta = path.resolve(cwd, configPath ?? 'taisho.config.ts');
	let cargado: Cargado | undefined;

	/** El proyecto, recargado si su config cambió desde la última vez. Fija el idioma de los mensajes. */
	async function actual(): Promise<{ cargado: Cargado; config: TaishoConfig; extensiones: Proyecto['extensiones']; idioma: Lang }> {
		const mtime = fs.existsSync(ruta) ? fs.statSync(ruta).mtimeMs : null;
		if (!cargado || cargado.mtime !== mtime) {
			usarIdioma(pedido);
			cargado = { mtime, proyecto: await cargarProyecto(cwd, configPath) };
		}
		const { proyecto } = cargado;
		const idioma = usarIdioma(pedido, proyecto.config);
		return { cargado, config: proyecto.config ?? configDeFabrica(), extensiones: proyecto.extensiones, idioma };
	}

	const leerJson = <T>(carpeta: string, idioma: Lang, slug: string) => JSON.parse(fs.readFileSync(path.join(carpeta, idioma, `${slug}.json`), 'utf8')) as T;
	const slugsDe = (idioma: Lang) =>
		fs.readdirSync(path.join(datos.prosa, idioma)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length)).sort();

	const listarComponentes: Herramienta = {
		name: 'list_components',
		description:
			'List every TaishoDS Core component, returned as `{ count, components }` where `count` is the exact total (do not count the list yourself). Each component has its slug, name, root class blocks (written as `ts <block>`), whether it needs the Core JavaScript, and a one-line summary. Call this first when choosing a component for a UI, or to confirm a component exists before writing markup.',
		inputSchema: { type: 'object', properties: {} },
		handler: async () => {
			const { idioma } = await actual();
			const componentes = slugsDe(idioma).map((slug) => {
				const { nombre, guia } = leerJson<Prosa>(datos.prosa, idioma, slug);
				return {
					slug,
					name: nombre,
					blocks: manifiestoDelCore.componentes[slug].bloques,
					needsJs: contratoCore[slug].atributos.length > 0,
					...(guia?.what && { summary: primeraOracion(guia.what) }),
				};
			});
			return json({ count: componentes.length, components: componentes });
		},
	};

	const obtenerComponente: Herramienta = {
		name: 'get_component',
		description:
			'Get the reference sheet of one TaishoDS Core component as Markdown: what it is, when to use it and when not to, do and don\'t lists, its classes and modifiers, the JavaScript hooks it needs, keyboard behavior, and copy-ready HTML examples. Call it before writing markup for a component and copy the example structure instead of inventing one. Use list_components to find the slug.',
		inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Component slug, e.g. "button" or "date-picker".' } }, required: ['slug'] },
		handler: async (args) => {
			const slug = texto(args, 'slug');
			const { idioma } = await actual();
			const slugs = slugsDe(idioma);
			if (!slugs.includes(slug)) throw new Error(`Unknown component "${slug}". Available: ${slugs.join(', ')}`);
			const prosa = leerJson<Prosa>(datos.prosa, idioma, slug);
			const ficha: DatosFicha = {
				slug,
				nombre: prosa.nombre,
				guia: prosa.guia,
				bloques: manifiestoDelCore.componentes[slug].bloques,
				atributos: contratoCore[slug].atributos,
				nucleo: prosa.nucleo,
				teclado: prosa.teclado,
				ejemplos: leerJson<DatosFicha['ejemplos']>(datos.ejemplos, idioma, slug),
			};
			return fichaMarkdown(ficha, idioma);
		},
	};

	const buscarUtilidades: Herramienta = {
		name: 'search_utilities',
		description:
			'Search the utility classes of this project (spacing, color, layout, typography, and the project\'s own utilities) and return each class with the CSS it produces. Call it when unsure that a class exists or what it does: the vocabulary is closed, so a class that does not appear here does nothing. Classes are written without the `ts-` prefix, on an element that also has the `ts` class. Returns `{ total, returned, results }`: `total` is how many classes matched, `returned` how many are in `results` (ranked by relevance); if `returned` is lower than `total`, the limit cut some off, so narrow the query or raise `limit`.',
		inputSchema: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'Words to look for in the class name or its CSS, e.g. "padding", "gap-base", "grid cols". All words must match.' },
				limit: { type: 'integer', minimum: 1, maximum: LIMITE_MAXIMO, description: `How many results to return (default ${LIMITE_POR_DEFECTO}).` },
			},
			required: ['query'],
		},
		handler: async (args) => {
			const consulta = texto(args, 'query').toLowerCase().split(/\s+/).filter(Boolean);
			if (consulta.length === 0) throw new Error('"query" is empty');
			const limite = Math.min(Math.max(Math.trunc(Number(args.limit ?? LIMITE_POR_DEFECTO)) || LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);
			const { cargado: c, config, extensiones } = await actual();
			c.vocabulario ??= derivarVocabulario(config, deriveThemeVocabulary(config, extensiones), extensiones);
			const vocab = c.vocabulario;
			const filas: { class: string; css?: string; composes?: string[] }[] = [
				...[...parseUtilities(vocab.atomic), ...parseUtilities(vocab.utilities)]
					// El CSS fuente nombra algunas utilidades con su nombre anterior: se devuelve el vigente (`ms-*`, `mx-neg-*`…).
					.map((b) => ({ class: (vocab.alias.get(b.name) ?? b.name).slice(3), css: b.body.replace(/\s+/g, ' ').trim() }))
					.filter((f) => vocab.esUtilidad(f.class)),
				...Object.entries(vocab.userUtilities).map(([nombre, clases]) => ({ class: nombre, composes: clases })),
			];
			const puntaje = (f: (typeof filas)[number]): number => {
				const cuerpo = f.css ?? f.composes!.join(' ');
				if (!consulta.every((p) => f.class.includes(p) || cuerpo.toLowerCase().includes(p))) return 0;
				const q = consulta.join(' ');
				if (f.class === q) return 4;
				if (consulta.every((p) => f.class.startsWith(p))) return 3;
				return consulta.every((p) => f.class.includes(p)) ? 2 : 1;
			};
			const hallados = filas
				.map((f) => ({ f, p: puntaje(f) }))
				.filter((x) => x.p > 0)
				.sort((a, b) => b.p - a.p || a.f.class.length - b.f.class.length || (a.f.class < b.f.class ? -1 : 1));
			const results = hallados.slice(0, limite).map((x) => x.f);
				return json({ total: hallados.length, returned: results.length, results });
		},
	};

	const validarMarkup: Herramienta = {
		name: 'validate_markup',
		description:
			'Check markup against the project\'s TaishoDS vocabulary, the same as `npx taisho check`: unknown or misspelled classes, elements that use the system\'s classes without the `ts` class, `ts-` prefixes, spacing numbers that mean something else in other frameworks, and CSS variables that do not exist. Call it after writing or editing markup (HTML, Svelte, Vue, JSX) and fix the warnings until `valid` is true. An `other-scale` warning does not make the markup invalid: it is a reminder that the number is pixels here (`p-16` is 16 px), so only check that the pixel value is the intended one.',
		inputSchema: {
			type: 'object',
			properties: {
				markup: { type: 'string', description: 'The markup or component source to check.' },
				filename: { type: 'string', description: 'Name used in the warnings and to pick the syntax (default "snippet.html").' },
			},
			required: ['markup'],
		},
		handler: async (args) => {
			const markup = texto(args, 'markup');
			const filename = typeof args.filename === 'string' && args.filename !== '' ? args.filename : 'snippet.html';
			const { cargado: c, extensiones, idioma } = await actual();
			const { config, validasExtra } = configParaCheck(c.proyecto, [], cwd);
			const avisos = avisosDeCheck([{ file: filename, content: markup }], config, validasExtra, extensiones, { otherScale: true });
			const resultado: ResultadoJson & { valid: boolean } = {
				version: VERSION_JSON,
				files: 1,
				// `other-scale` es un recordatorio (el número es válido y puede ser justo el buscado): no invalida.
				valid: avisos.every((a) => a.rule === 'other-scale'),
				warnings: avisos.map((a) => avisoAJson(a, idioma)),
			};
			return json(resultado);
		},
	};

	const traducirTailwind: Herramienta = {
		name: 'translate_tailwind',
		description:
			'Convert markup written with Tailwind CSS classes to TaishoDS classes. Returns the converted markup, the classes it converted, and the ones it could not with the reason. Call it when the user pastes Tailwind code or asks for a Tailwind class: numbers differ between the two (`p-4` is 16 px in Tailwind and 4 px in TaishoDS), so do not translate by name. Run validate_markup on the result.',
		inputSchema: { type: 'object', properties: { markup: { type: 'string', description: 'Markup that uses Tailwind classes.' } }, required: ['markup'] },
		handler: async (args) => {
			const markup = texto(args, 'markup');
			const { config, extensiones, idioma } = await actual();
			const r = migrarTailwind(markup, { ...prepararTailwind(config, extensiones), tema: TEMA_VACIO, esCss: false });
			return json({
				output: r.texto,
				converted: r.convertidas.map((c) => ({ line: c.línea, from: c.origen, to: c.scope, exact: c.exacta, ...(c.notas?.length && { note: textoNotas(c.notas, idioma) }) })),
				notConverted: [...r.sinConvertir, ...r.fuera]
					.sort((a, b) => a.línea - b.línea)
					.map((n) => ({ line: n.línea, token: n.token, type: n.tipo, reason: textoMotivo(n.motivo, idioma) })),
			});
		},
	};

	const obtenerTema: Herramienta = {
		name: 'get_theme',
		description:
			'Get the theme of this project: the config file in use, its themes, the color families (written `bg-{color}-{shade}`, with their seed color), the shades, the spacing words of the rhythm scale, the dark mode strategy, and every CSS variable available. Call it before choosing colors or spacing, or when asked about the theme. Without a `taisho.config.ts`, it reports the factory theme and says so.',
		inputSchema: { type: 'object', properties: {} },
		handler: async () => {
			const { cargado: c, config, extensiones, idioma } = await actual();
			const tema = deriveThemeVocabulary(config, extensiones);
			const semillas: Record<string, string> = { gray: 'neutral', ...tema.userColors, ...tema.userStates };
			return json({
				configFile: c.proyecto.config ? path.relative(cwd, c.proyecto.configPath) : null,
				...(!c.proyecto.config && { note: m().mcp.sinConfig }),
				language: idioma,
				themes: Object.keys(config.themes),
				colors: semillas,
				shades: SHADES,
				rhythm: escalasDe().ritmo.filter((p) => !/^\d/.test(p)),
				darkMode: config.darkMode ?? 'class',
				cssVars: [...varsDelTema(config, extensiones)].sort(),
			});
		},
	};

	return [listarComponentes, obtenerComponente, buscarUtilidades, validarMarkup, traducirTailwind, obtenerTema];
}
