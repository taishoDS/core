// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { TipoNoConvertido } from '../generate/migrar-clasico';

export type Lang = 'es' | 'en';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const oLista = (items: string[]) => new Intl.ListFormat('en', { type: 'disjunction' }).format(items);

export interface ResumenTailwind {
	revisados: number;
	tocados: number;
	write: boolean;
	convertidas: number;
	conOtroValor: number | null;
	llaves: number;
	choques: number;
	pendientes: number;
	fuera: number;
	ajenas: number;
}

const es = {
	ayuda: `
taisho — TaishoDS personalizable

Uso:
  taisho init [dir]              Scaffoldea un taisho.config.ts en tu proyecto
    --yes, -y                    Sin preguntas: escribe el starter con defaults
    --install-icons              Instala lucide-static (los íconos) sin preguntar
  taisho generate [config]       Compila tu taisho.config.ts a una carpeta autocontenida
    --config <path>              Ruta al config (default: ./taisho.config.ts)
    --out <dir>                  Carpeta de salida (default: el out de tu config; si no, ./taisho/)
    --strict                     Sale con 1 si hubo cualquier aviso (la salida se escribe igual)
  taisho watch [config]          Regenera tu CSS cada vez que cambia tu content, tu config o src/icons/
    --config <path>              Ruta al config (default: ./taisho.config.ts)
    --out <dir>                  Carpeta de salida (default: el out de tu config; si no, ./taisho/)
                                 Ctrl+C para salir (con 0). Un import dentro de tu config no se detecta
  taisho migrate --from classic [rutas]  Pasa tu código del modo clásico (ts-flex) al modo scope (ts flex)
    [rutas]                      Archivos o carpetas a revisar (reemplazan a content; sin ellas y sin content, no se tocan los .md)
    --write                      Aplica los cambios (sin esto es un dry-run: sólo reporta)
    --config <path>              Ruta al config: de ahí salen content y el vocabulario
  taisho migrate --from tailwind [rutas]  Pasa tu código de Tailwind 4 a TaishoDS (modo scope) y lista lo que no pudo
    [rutas]                      Archivos o carpetas a revisar (reemplazan a content; los .css se leen, nunca se escriben)
    --write                      Aplica los cambios (sin esto sólo reporta)
    --config <path>              Ruta al config: de ahí salen content, el vocabulario y los colores
    --out <dir>                  Carpeta de salida de generate, que no se lee (default: el out de tu config; si no, ./taisho/)
                                 Sale con 0 si corrió (haya pendientes o no), 2 si no pudo correr (uso, config o Tailwind 3)
  taisho check [rutas…]          Avisa clases y variables del DS mal escritas en tu código
    [rutas]                      Archivos, carpetas o globs (sin ellas: content, o el proyecto sin dist/build/coverage)
    --config <path>              Ruta al config: de ahí salen content y el vocabulario
    --format <text|json>         Formato de salida (default: text; para parsear, json)
    --other-scale                Avisa también las medidas que en otro framework valen distinto (p-4, w-64); apagado por defecto
                                 Sale con 0 limpio, 1 con avisos, 2 si no pudo correr
  taisho mcp                     Servidor MCP por stdio: deja que un asistente consulte componentes, utilidades y tu tema (sólo lectura, sin red)
    --config <path>              Ruta al config (default: ./taisho.config.ts; sin él, el tema de fábrica)
  taisho --lang <es|en>          Idioma de los mensajes (default: el lang de tu config; si no, el del sistema)
  taisho --version                Muestra la versión
  taisho --help                   Muestra esta ayuda
`,
	mcp: {
		sinConfig: 'No hay taisho.config.ts en el proyecto: se usa el tema de fábrica. Con `--config <ruta>` se indica otro.',
	},
	cli: {
		opcionDesconocida: (flag: string) => `La opción ${flag} no existe: \`taisho --help\` lista las que hay.`,
		faltaValor: (flag: string) => `${flag} necesita un valor.`,
		sinValor: (flag: string) => `${flag} no lleva valor.`,
		langInvalido: (valor: string) => `--lang "${valor}" no existe: se acepta es o en.`,
		tailwindNoAcepta: (flags: string[]) => `taisho migrate --from tailwind no acepta ${flags.join(', ')}. Sus flags: --write, --config, --out.`,
		checkNoAcepta: (flags: string[]) => `taisho check no acepta ${flags.join(', ')}. Sus flags: --config, --format, --other-scale.`,
		watchNoAcepta: (flags: string[]) => `taisho watch no acepta ${flags.join(', ')}. Sus flags: --config, --out.`,
		mcpNoAcepta: (flags: string[]) => `taisho mcp no acepta ${flags.join(', ')}. Sus flags: --config.`,
		formatoInvalido: (formato: string) => `--format "${formato}" no existe: se acepta text o json.`,
		comandoDesconocido: (cmd: string) => `Comando desconocido: ${cmd}`,
	},
	config: {
		noEncontrada: (ruta: string) => `No se encontró ${ruta}.`,
		noEncontradaInit: (ruta: string) => `No se encontró ${ruta}.\nSe crea uno con \`taisho init\`.`,
		noCargo: (ruta: string) => `No se pudo cargar ${ruta}:`,
		noCargoCon: (ruta: string, detalle: string) => `No se pudo cargar ${ruta}:\n${detalle}`,
		invalida: (ruta: string) => `${ruta} no exporta un TaishoConfig válido.`,
		invalidaDetalle: (ruta: string) =>
			`${ruta} no exporta un TaishoConfig válido: ` + 'falta un default export (o `export const config`) con al menos un tema en `themes`.',
	},
	init: {
		yaExiste: (ruta: string) => `Ya existe ${ruta} — no se pisa.`,
		creado: (ruta: string) => `✅ Creado ${ruta}`,
		siguiente: '   Se editan los colores y se corre `taisho generate` para compilar tu CSS.',
		preguntaIdioma: (def: Lang) => `Idioma de los mensajes (es/en) [${def}]: `,
		idiomaInvalido: (respuesta: string, def: Lang) => `  "${respuesta}" no es es ni en — uso ${def}.`,
		preguntaMarca: (def: string) => `Color de marca (hex) [${def}]: `,
		hexInvalido: (respuesta: string, def: string) => `  "${respuesta}" no es un hex válido (#RRGGBB) — uso ${def}.`,
		preguntaTema: (def: string) => `Nombre del tema [${def}]: `,
		preguntaFuentes: `Fuentes — (s)istema o (f)ontsource [s]: `,
		preguntaIconos: (def: string) => `Carpeta de íconos propios [${def}]: `,
		preguntaSalida: (def: string) => `Carpeta de salida del CSS y el JS [${def}]: `,
		iconosInfo: (comando: string) => `  lucide-static trae los íconos de Lucide (los de <use href="#ts-nombre">). No viene con el Core: se puede instalar más tarde con \`${comando}\`.`,
		preguntaLucide: '¿Instalar los íconos de Lucide (lucide-static)? (s/n) [s]: ',
		instalando: (comando: string) => `→ ${comando}`,
		lucideInstalado: '✅ lucide-static instalado.',
		lucideFallo: (comando: string) => `⚠️  No se pudo instalar lucide-static. El config quedó creado; se instala a mano con \`${comando}\`.`,
		lucideSinPreguntar: (comando: string) => `   Los íconos de Lucide (lucide-static) no están instalados. Se instalan con \`${comando}\` (o \`taisho init --install-icons\` en un proyecto nuevo).`,
		plantilla: {
			cabecera: ` * Config de TaishoDS para tu marca — equivalente a \`tailwind.config.js\`.
 * Se corre \`taisho generate\` para compilar el CSS a partir de esto.`,
			temas: `	// Uno o más temas. La key es el nombre de archivo de salida
	// (theme.css si hay uno solo, theme-<key>.css si hay varios).`,
			colores: `			// Colores semilla (hex). El motor deriva toda la paleta OKLCH
			// (light/dark, shades 100-1000) a partir de este único valor.`,
			content: `	// Dónde buscar clases: el CSS lleva sólo lo que se usa; las armadas en runtime van en \`safelist\`.
	// Se suma \`**/*.md\` si tu prosa usa clases (sus ejemplos traen componentes enteros).`,
			fontFaces: `	// Fuentes que se descargan (paquetes @fontsource, deben estar en tu
	// package.json). Se deja vacío si se van a usar fuentes del sistema.`,
			fonts: `	// Pilas de fuente CSS. Sin @fontsource, se usan nombres de sistema.`,
			estados: `	// Colores semilla de los estados semánticos (success/warning/info/danger).`,
			iconos: `	// SVGs propios (además de lucide-static). El nombre de archivo (sin .svg)
	// es el nombre del ícono.`,
			salida: `	// Carpeta donde \`taisho generate\` escribe el CSS y el JS (relativa a este archivo).
	// Dentro de public/ o static/ se sirve tal cual; \`--out\` tiene prioridad.`,
			lang: `	// Idioma de los mensajes de \`taisho\` (es | en). Sin la clave, el del sistema.`,
		},
	},
	generate: {
		compilando: (ruta: string) => `→ compilando ${ruta}…`,
		estricto: (n: number) => `--strict: ${n} ${n === 1 ? 'aviso' : 'avisos'}.`,
		generado: (dir: string) => `\n✅ Generado en ${dir}/\n`,
		pegar: 'Esto va en tu HTML, en este orden:\n',
		iconos: `\nPara los íconos, con los mismos <use href="…#ts-nombre"> que encontró en tu HTML:\n`,
		usoIcono: '#ts-nombre',
		tipos: (archivo: string) => `\nTipos de tus clases propias (extend, utilities): con ${archivo} dentro del include de tu tsconfig, entran en TaishoClass.`,
		lucideFalta: (n: number) => `[taisho generate] ${n} ${n === 1 ? 'ícono no se resuelve' : 'íconos no se resuelven'}: falta lucide-static. Se instala con npm i -D lucide-static`,
		iconoIgnorado: (nombre: string, origen: string) => `[taisho generate] ícono "${nombre}" no existe; se ignora (${origen}, no es markup).`,
		iconosInexistentes: (lineas: string[], dir: string) =>
			`Ícono(s) inexistente(s) en #ts-<nombre>:\n${lineas.join('\n')}\n` + `Se corrige el nombre (lucide) o se agrega un SVG en "${dir}/<nombre>.svg".`,
		quisisteDecir: (sugerencia: string) => ` — ¿se quiso decir "${sugerencia}"?`,
		coreDistinto: (paquete: string, version: string, core: string, pide: string, tenes: string) => `${paquete} ${version} necesita ${core} ${pide}; está instalado ${tenes}`,
		coreRangoInvalido: (paquete: string, version: string, core: string, pide: string) =>
			`${paquete} ${version} declara "${pide}" como versión de ${core}: no es una versión ni un rango que el Core entienda (x.y.z, o comparadores =, >=, >, <=, <, ^, ~ separados por espacio, sin «||» ni versiones incompletas; por ejemplo ^0.17.0 o >=0.17.0 <0.19.0). Es un error del paquete: se avisa a su autor.`,
	},
	watch: {
		sinCambios: 'sin cambios',
		alDia: (dir: string, archivos: number, ms: number, content: number | null, iconos: string) =>
			`✅ ${dir}/ al día (${archivos} archivos, ${ms} ms). Mirando ${content !== null ? `${content} archivos de content, la config y ${iconos}/` : `la config y ${iconos}/`}. Ctrl+C para salir.`,
	},
	check: {
		sinArchivos: (conContent: boolean) => `No hay archivos para revisar en ${conContent ? 'el `content` de tu config' : 'el proyecto'}. Se pasan rutas: taisho check src`,
		ningunoCoincide: (ruta: string) => `Ningún archivo coincide con "${ruta}".`,
		resumen: (archivos: number, avisos: number) => `taisho check: ${archivos} archivo(s) revisado(s), ${avisos} aviso(s).`,
	},
	clasico: {
		faltaFrom: 'Falta `--from classic` o `--from tailwind`: son los únicos orígenes que existen.',
		cabecera: (write: boolean) => `taisho migrate --from classic${write ? '' : ' (dry-run: no se escribió nada; con --write se aplica)'}\n`,
		convertidos: (write: boolean, n: number) => `${write ? 'Convertidos' : 'Por convertir'} (${n} archivo(s)):`,
		nada: '  (nada)',
		archivo: (file: string, convertidos: number, llaves: number, renombres: number) =>
			`  ${file}  ${convertidos} convertido(s), ${llaves} llave(s)${renombres ? `, ${renombres} renombre(s)` : ''}`,
		pendientes: (n: number) => `\nNo convertidos o con reservas (${n}):`,
		resumen: (archivos: number, tocados: number, write: boolean, convertidos: number, llaves: number, renombres: number) =>
			`\nResumen: ${archivos} archivo(s) revisados, ${tocados} ${write ? 'modificados' : 'a modificar'}; ${convertidos} clase(s) a scope, ${llaves} llave(s) \`ts\`, ${renombres} renombre(s).`,
		porTipo: (lista: string) => `Sin convertir por tipo: ${lista}.`,
		motivo: {
			fragment: 'clase armada en runtime: se reescribe con un mapa estático',
			apply: '@apply: se pasa a las propiedades o a la clase en el markup',
			selector: 'selector .ts-x: pasa a .x (con la llave `ts` en el elemento)',
			'missing-ts': 'class:x convertido, pero el elemento no tiene `ts` estático: se agrega',
			classlist: 'classList convertido, pero el elemento necesita `ts`: se agrega a mano',
			'no-replacement': 'deprecada sin sucesor: se reemplaza a mano',
			'possible-class': 'nombre viejo que no está en la tabla del DS (¿deprecada de tu `extend`?)',
			'unknown-class': 'no es una clase del DS: se deja como está',
			'outside-string': 'no está en un string de clases (prosa, comentario u otro código)',
		} satisfies Record<TipoNoConvertido, string>,
	},
	tailwind: {
		tailwind3: (version: string) =>
			`Tu proyecto usa Tailwind ${version}: el migrador sólo conoce Tailwind 4 (con la 3 los mismos nombres valen otra cosa). Se pasa a Tailwind 4 y se vuelve a correr.`,
		sinArchivos: 'No hay archivos para revisar. Se pasan rutas: taisho migrate --from tailwind src',
		cabecera: (write: boolean) => `taisho migrate --from tailwind${write ? '' : ' (dry-run: no se escribió nada; con --write se aplica)'}`,
		version: (version: string, fuente: string, mapa: string) => `Tailwind ${version} (${fuente}); el mapa vale para ${mapa}.`,
		sinTailwind: (version: string) => `No se encontró Tailwind en el proyecto: se asume Tailwind ${version}.`,
		config: (ruta: string) => `Config: ${ruta}.`,
		sinConfig: 'Sin taisho.config.ts: corre con el vocabulario de fábrica; con tu tema (semillas, cortes) convierten más clases; se pasa con --config.',
		escribe: 'Escribe sobre tus archivos: si no se hizo commit antes, conviene hacerlo ahora para poder deshacer.',
		commitAntes: 'Conviene hacer commit antes de --write: el comando reescribe tus archivos.',
		convertidos: (write: boolean, n: number) => `${write ? 'Convertidos' : 'Por convertir'} (${plural(n, 'archivo', 'archivos')}):`,
		nada: '  (nada)',
		archivo: (file: string, convertidas: number, llaves: number) => `  ${file}  ${convertidas} convertida(s), ${llaves} llave(s) \`ts\``,
		choques: (n: number) =>
			`CHOQUES (${n}): nombres de Tailwind que en TaishoDS son otra cosa; el elemento que los lleva no se tocó (se renombra la clase propia o se escribe ese CSS en una hoja propia, y el resto se convierte a mano):`,
		aprox: (n: number) => `Convertidas con otro valor (${plural(n, 'par', 'pares')}): la misma intención, no el mismo píxel o color; se revisa cada una:`,
		pendientes: (n: number) => `Sin convertir al 100 % (${n}): quedan como están, se resuelven a mano:`,
		configTailwind: '`tailwind.config` es de Tailwind y no se migra solo: colores como semillas en `colors`, cortes en `extend.screens`, plugins como `utilities` en `taisho.config.ts`',
		fuera: (n: number) => `Fuera de las clases (${n}): no se tocan, son de tu configuración, tu CSS o tu JS:`,
		sugerencia: (s: string) => `    sugerencia: ${s}`,
		ajenas: (n: number) => `Clases ajenas (${n}, sin tocar: no son de Tailwind ni del DS):`,
		resumen: (r: ResumenTailwind) =>
			`Resumen: ${plural(r.revisados, 'archivo revisado', 'archivos revisados')}, ${r.tocados} ${r.write ? 'modificados' : 'a modificar'}; ` +
			`${r.convertidas} clase(s) a TaishoDS (${r.conOtroValor !== null ? `${r.conOtroValor} con otro valor` : 'todas con el mismo valor'}), ${r.llaves} llave(s) \`ts\`, ` +
			`${r.choques} choque(s), ${r.pendientes} sin convertir, ${r.fuera} fuera de las clases, ${r.ajenas} ajena(s).`,
		paraTerminar: 'Para terminar:',
		nadaQueConvertir: '  - No hay nada de Tailwind que convertir.',
		resolverChoques: '  - Se resuelven los CHOQUES: esos elementos quedaron sin tocar, sin la llave `ts` y con todas sus clases como estaban.',
		resolverAMano: '  - Se resuelve a mano lo que no se convirtió y lo que quedó fuera de las clases (archivo:línea arriba).',
		mirarAprox: '  - Se revisan las convertidas con otro valor: el color y la sombra de TaishoDS no son los de Tailwind.',
		convivencia: [
			'  - Convivencia: mientras queden clases de Tailwind, se carga el CSS de TaishoDS DESPUÉS del de Tailwind; así el elemento con la llave `ts` toma el estilo de TaishoDS.',
			'    Se migra elemento por elemento, no por nombre de clase: `p-16` significa 64px en Tailwind y 16px en TaishoDS.',
		],
		sacarTailwind: '  - Cuando el reporte quede vacío, se saca Tailwind (el import, el plugin y el tailwind.config) y se corre `taisho generate`.',
	},
};

const en: typeof es = {
	ayuda: `
taisho — customizable TaishoDS

Usage:
  taisho init [dir]              Scaffold a taisho.config.ts in your project
    --yes, -y                    Skip the questions and write the starter with defaults
    --install-icons              Install lucide-static (the icons) without asking
  taisho generate [config]       Compile your taisho.config.ts to a self-contained folder
    --config <path>              Path to the config (default: ./taisho.config.ts)
    --out <dir>                  Output folder (default: the out in your config; else ./taisho/)
    --strict                     Exit with 1 on any warning (the output is still written)
  taisho watch [config]          Regenerate your CSS whenever your content, your config, or src/icons/ changes
    --config <path>              Path to the config (default: ./taisho.config.ts)
    --out <dir>                  Output folder (default: the out in your config; else ./taisho/)
                                 Press Ctrl+C to exit (with 0). An import inside your config isn't detected
  taisho migrate --from classic [paths]  Move your code from classic mode (ts-flex) to scope mode (ts flex)
    [paths]                      Files or folders to check (they replace content; without them or content, .md files are left alone)
    --write                      Apply the changes (without it, it's a dry run that only reports)
    --config <path>              Path to the config, which provides content and the vocabulary
  taisho migrate --from tailwind [paths]  Move your code from Tailwind 4 to TaishoDS (scope mode) and list what it couldn't convert
    [paths]                      Files or folders to check (they replace content; .css files are read, never written)
    --write                      Apply the changes (without it, it only reports)
    --config <path>              Path to the config, which provides content, the vocabulary, and the colors
    --out <dir>                  Output folder of generate, which isn't read (default: the out in your config; else ./taisho/)
                                 Exits with 0 if it ran (with or without pending items), 2 if it couldn't run (usage, config, or Tailwind 3)
  taisho check [paths…]          Flag misspelled DS classes and variables in your code
    [paths]                      Files, folders, or globs (by default, content, or the project minus dist/build/coverage)
    --config <path>              Path to the config, which provides content and the vocabulary
    --format <text|json>         Output format (default: text; use json to parse it)
    --other-scale                Also flag the sizes that mean something else in another framework (p-4, w-64); off by default
                                 Exits with 0 when clean, 1 with warnings, 2 if it couldn't run
  taisho mcp                     MCP server over stdio: lets an assistant look up components, utilities, and your theme (read-only, no network)
    --config <path>              Path to the config (default: ./taisho.config.ts; without it, the factory theme)
  taisho --lang <es|en>          Message language (default: lang in your config, then the system's)
  taisho --version               Show the version
  taisho --help                  Show this help
`,
	mcp: {
		sinConfig: 'There is no taisho.config.ts in the project: the factory theme is used. Pass `--config <path>` to point at another.',
	},
	cli: {
		opcionDesconocida: (flag) => `Unknown option ${flag}. Run \`taisho --help\` to see the options.`,
		faltaValor: (flag) => `${flag} needs a value.`,
		sinValor: (flag) => `${flag} doesn't take a value.`,
		langInvalido: (valor) => `--lang "${valor}" isn't valid. Use es or en.`,
		tailwindNoAcepta: (flags) => `taisho migrate --from tailwind doesn't take ${oLista(flags)}. Use --write, --config, or --out.`,
		checkNoAcepta: (flags) => `taisho check doesn't take ${oLista(flags)}. Use --config, --format or --other-scale.`,
		watchNoAcepta: (flags) => `taisho watch doesn't take ${oLista(flags)}. Use --config or --out.`,
		mcpNoAcepta: (flags) => `taisho mcp doesn't take ${oLista(flags)}. Use --config.`,
		formatoInvalido: (formato) => `--format "${formato}" isn't valid. Use text or json.`,
		comandoDesconocido: (cmd) => `Unknown command "${cmd}".`,
	},
	config: {
		noEncontrada: (ruta) => `Couldn't find ${ruta}.`,
		noEncontradaInit: (ruta) => `Couldn't find ${ruta}.\nRun \`taisho init\` to create one.`,
		noCargo: (ruta) => `Couldn't load ${ruta}.`,
		noCargoCon: (ruta, detalle) => `Couldn't load ${ruta}.\n${detalle}`,
		invalida: (ruta) => `${ruta} doesn't export a valid TaishoConfig. Export one with at least one theme in \`themes\`.`,
		invalidaDetalle: (ruta) =>
			`${ruta} doesn't export a valid TaishoConfig. Add a default export (or \`export const config\`) with at least one theme in \`themes\`.`,
	},
	init: {
		yaExiste: (ruta) => `${ruta} already exists, so it was left as is.`,
		creado: (ruta) => `✅ Created ${ruta}`,
		siguiente: '   Edit the colors and run `taisho generate` to compile your CSS.',
		preguntaIdioma: (def) => `Message language (es/en) [${def}]: `,
		idiomaInvalido: (_respuesta, def) => `  Enter es or en. Using ${def}.`,
		preguntaMarca: (def) => `Brand color (hex) [${def}]: `,
		hexInvalido: (_respuesta, def) => `  Enter a hex color as #RRGGBB. Using ${def}.`,
		preguntaTema: (def) => `Theme name [${def}]: `,
		preguntaFuentes: `Fonts — (s)ystem or (f)ontsource [s]: `,
		preguntaIconos: (def) => `Folder for your own icons [${def}]: `,
		preguntaSalida: (def) => `Output folder for the CSS and JS [${def}]: `,
		iconosInfo: (comando) => `  lucide-static provides the Lucide icons (the ones used as <use href="#ts-name">). It doesn't ship with the Core: it can be installed later with \`${comando}\`.`,
		preguntaLucide: 'Install the Lucide icons (lucide-static)? (y/n) [y]: ',
		instalando: (comando) => `→ ${comando}`,
		lucideInstalado: '✅ lucide-static installed.',
		lucideFallo: (comando) => `⚠️  Couldn't install lucide-static. The config was created; install it by hand with \`${comando}\`.`,
		lucideSinPreguntar: (comando) => `   The Lucide icons (lucide-static) aren't installed. Install them with \`${comando}\` (or \`taisho init --install-icons\` in a new project).`,
		plantilla: {
			cabecera: ` * TaishoDS config for your brand, the equivalent of \`tailwind.config.js\`.
 * Run \`taisho generate\` to compile the CSS from it.`,
			temas: `	// One or more themes. The key names the output file
	// (theme.css if there's only one, theme-<key>.css if there are several).`,
			colores: `			// Seed colors (hex). The engine derives the full OKLCH palette
			// (light/dark, steps 100-1000) from this single value.`,
			content: `	// Where to look for classes. The CSS carries only what you use; classes built at runtime go in \`safelist\`.
	// Add \`**/*.md\` if your prose uses classes (their examples bring whole components).`,
			fontFaces: `	// Fonts to download (@fontsource packages, which must be in your
	// package.json). Leave it empty to use system fonts.`,
			fonts: `	// CSS font stacks. Without @fontsource, use system font names.`,
			estados: `	// Seed colors for the status colors (success/warning/info/danger).`,
			iconos: `	// Your own SVGs (on top of lucide-static). The file name (without .svg)
	// is the icon name.`,
			salida: `	// Folder where \`taisho generate\` writes the CSS and JS (relative to this file).
	// Inside public/ or static/ it's served as is; \`--out\` overrides it.`,
			lang: `	// Language of \`taisho\` messages (es | en). Without the key, the system's.`,
		},
	},
	generate: {
		compilando: (ruta) => `→ compiling ${ruta}…`,
		estricto: (n) => `--strict found ${plural(n, 'warning', 'warnings')}.`,
		generado: (dir) => `\n✅ Generated in ${dir}/\n`,
		pegar: 'Paste this into your HTML, in this order:\n',
		iconos: `\nFor icons, use the same <use href="…#ts-name"> it found in your HTML:\n`,
		usoIcono: '#ts-name',
		tipos: (archivo: string) => `\nTypes for your own classes (extend, utilities): keep ${archivo} inside your tsconfig include and they join TaishoClass.`,
		lucideFalta: (n) => `[taisho generate] ${n} ${n === 1 ? "icon doesn't" : "icons don't"} resolve: lucide-static is missing. Install it with npm i -D lucide-static`,
		iconoIgnorado: (nombre, origen) => `[taisho generate] Icon "${nombre}" doesn't exist, so it's ignored (${origen} isn't markup).`,
		iconosInexistentes: (lineas, dir) =>
			`${lineas.length === 1 ? "This icon doesn't" : "These icons don't"} exist (#ts-<name>):\n${lineas.join('\n')}\n` +
			`Fix the name (lucide) or add an SVG at "${dir}/<name>.svg".`,
		quisisteDecir: (sugerencia) => ` — did you mean "${sugerencia}"?`,
		coreDistinto: (paquete, version, core, pide, tenes) => `${paquete} ${version} needs ${core} ${pide}, and you have ${tenes}`,
		coreRangoInvalido: (paquete, version, core, pide) =>
			`${paquete} ${version} declares "${pide}" as its ${core} version, which the Core can't read (x.y.z, or =, >=, >, <=, <, ^, ~ comparators separated by spaces; no "||" or partial versions; e.g. ^0.17.0 or >=0.17.0 <0.19.0). This is a problem in the package; report it to its author.`,
	},
	watch: {
		sinCambios: 'no changes',
		alDia: (dir, archivos, ms, content, iconos) =>
			`✅ ${dir}/ is up to date (${plural(archivos, 'file', 'files')}, ${ms} ms). Watching ${content !== null ? `${plural(content, 'content file', 'content files')}, the config, and ${iconos}/` : `the config and ${iconos}/`}. Press Ctrl+C to exit.`,
	},
	check: {
		sinArchivos: (conContent) => `No files to check in ${conContent ? "your config's `content`" : 'the project'}. Pass paths, for example: taisho check src`,
		ningunoCoincide: (ruta) => `No files match "${ruta}".`,
		resumen: (archivos, avisos) => `taisho check: ${plural(archivos, 'file', 'files')} checked, ${plural(avisos, 'warning', 'warnings')}.`,
	},
	clasico: {
		faltaFrom: 'Pass `--from classic` or `--from tailwind`. Those are the only sources.',
		cabecera: (write) => `taisho migrate --from classic${write ? '' : ' — dry run, nothing was written. Add --write to apply.'}\n`,
		convertidos: (write, n) => `${write ? 'Converted' : 'To convert'} (${plural(n, 'file', 'files')}):`,
		nada: '  (none)',
		archivo: (file, convertidos, llaves, renombres) =>
			`  ${file}  ${convertidos} converted, ${plural(llaves, '`ts` scope class', '`ts` scope classes')}${renombres ? `, ${renombres} renamed` : ''}`,
		pendientes: (n) => `\nNot converted, or converted with caveats (${n}):`,
		resumen: (archivos, tocados, write, convertidos, llaves, renombres) =>
			`\nSummary: ${plural(archivos, 'file', 'files')} checked, ${tocados} ${write ? 'modified' : 'to modify'}; ${plural(convertidos, 'class', 'classes')} to scope, ${plural(llaves, '`ts` scope class', '`ts` scope classes')}, ${plural(renombres, 'rename', 'renames')}.`,
		porTipo: (lista) => `Not converted, by type: ${lista}.`,
		motivo: {
			fragment: 'class built at runtime. Rewrite it with a static map',
			apply: '@apply. Move it to properties or to the class in the markup',
			selector: 'selector .ts-x becomes .x (with the `ts` scope class on the element)',
			'missing-ts': "class:x converted, but the element doesn't have a static `ts`. Add it",
			classlist: 'classList converted, but the element needs `ts`. Add it by hand',
			'no-replacement': 'deprecated with no replacement. Replace it by hand',
			'possible-class': "old name that isn't in the DS table (deprecated in your `extend`?)",
			'unknown-class': "not a DS class, so it's left as is",
			'outside-string': "not in a class string (prose, a comment, or other code)",
		},
	},
	tailwind: {
		tailwind3: (version) =>
			`Your project uses Tailwind ${version}. The migrator only knows Tailwind 4 (in v3 the same names mean something else). Upgrade to Tailwind 4 and run it again.`,
		sinArchivos: 'No files to check. Pass paths, for example: taisho migrate --from tailwind src',
		cabecera: (write) => `taisho migrate --from tailwind${write ? '' : ' — dry run, nothing was written. Add --write to apply.'}`,
		version: (version, fuente, mapa) => `Tailwind ${version} (${fuente}). The map is for ${mapa}.`,
		sinTailwind: (version) => `Tailwind isn't in the project, so it assumes Tailwind ${version}.`,
		config: (ruta) => `Using ${ruta}.`,
		sinConfig: "No taisho.config.ts, so it runs with the default vocabulary. With your theme (seeds, breakpoints), more classes convert. Pass it with --config.",
		escribe: "This writes over your files. If you haven't committed yet, do it now so you can undo.",
		commitAntes: 'Commit before you use --write, since it rewrites your files.',
		convertidos: (write, n) => `${write ? 'Converted' : 'To convert'} (${plural(n, 'file', 'files')}):`,
		nada: '  (none)',
		archivo: (file, convertidas, llaves) => `  ${file}  ${convertidas} converted, ${plural(llaves, '`ts` scope class', '`ts` scope classes')}`,
		choques: (n) =>
			`CONFLICTS (${n}). These Tailwind names mean something else in TaishoDS, so the elements that use them were left untouched. Rename your class or write that CSS in your stylesheet, then convert the rest by hand:`,
		aprox: (n) => `Converted with a different value (${plural(n, 'pair', 'pairs')}). Same intent, not the same pixel or color, so check each one:`,
		pendientes: (n) => `Not fully converted (${n}). They stay as they are, so resolve them by hand:`,
		configTailwind:
			"`tailwind.config` belongs to Tailwind and isn't migrated for you. Colors become seeds in `colors`, breakpoints go in `extend.screens`, and plugins become `utilities` in `taisho.config.ts`",
		fuera: (n) => `Outside the classes (${n}). Left untouched because they're part of your config, CSS, or JS:`,
		sugerencia: (s) => `    suggestion: ${s}`,
		ajenas: (n) => `Other classes (${n}, untouched because they're not from Tailwind or the DS):`,
		resumen: (r) =>
			`Summary: ${plural(r.revisados, 'file checked', 'files checked')}, ${r.tocados} ${r.write ? 'modified' : 'to modify'}; ` +
			`${plural(r.convertidas, 'class', 'classes')} to TaishoDS (${r.conOtroValor !== null ? `${r.conOtroValor} with a different value` : 'all with the same value'}), ${plural(r.llaves, '`ts` scope class', '`ts` scope classes')}, ` +
			`${plural(r.choques, 'conflict', 'conflicts')}, ${r.pendientes} not converted, ${r.fuera} outside the classes, ${plural(r.ajenas, 'other class', 'other classes')}.`,
		paraTerminar: 'To finish:',
		nadaQueConvertir: "  - There's no Tailwind to convert.",
		resolverChoques: '  - Resolve the CONFLICTS. Those elements were left untouched, without the `ts` scope class and with all their classes as they were.',
		resolverAMano: "  - Resolve by hand what didn't convert and what stayed outside the classes (file:line above).",
		mirarAprox: "  - Check the classes converted with a different value. TaishoDS colors and shadows aren't Tailwind's.",
		convivencia: [
			"  - While Tailwind classes remain, load the TaishoDS CSS AFTER Tailwind's. That way an element with the `ts` scope class takes the TaishoDS style.",
			'    Migrate element by element, not class by class. `p-16` means 64px in Tailwind and 16px in TaishoDS.',
		],
		sacarTailwind: '  - When the report is empty, remove Tailwind (the import, the plugin, and tailwind.config) and run `taisho generate`.',
	},
};

export const MENSAJES: Record<Lang, typeof es> = { es, en };
