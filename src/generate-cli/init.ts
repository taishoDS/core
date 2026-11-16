// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { DEFAULT_STATES } from '../generate/vocabulary';
import { esIdioma, m, usarIdioma, type Lang } from './idioma';

function displayPath(absolute: string): string {
	const rel = path.relative(process.cwd(), absolute);
	return rel.startsWith('..') ? absolute : rel || '.';
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface Respuestas {
	lang: Lang;
	brandHex: string;
	themeName: string;
	useFontsource: boolean;
	customIconsDir: string;
	outDir: string;
	instalarIconos: boolean;
}

const DEFAULTS: Omit<Respuestas, 'lang' | 'outDir'> = {
	brandHex: '#4F46E5',
	themeName: 'main',
	useFontsource: false,
	customIconsDir: 'src/icons',
	instalarIconos: false,
};

/** Paquetes que empaquetan: con uno de estos en el package.json el CSS se importa desde el código, así que la salida no va a `public/` ni `static/`. */
const EMPAQUETADORES = ['vite', 'rollup', 'rolldown', 'webpack', 'parcel', 'esbuild', '@rspack/core', '@rsbuild/core', '@sveltejs/kit', 'astro', 'next', 'nuxt', 'gatsby', 'react-scripts', '@angular/cli'];
const PREFIJOS_EMPAQUETADORES = ['@remix-run/', '@react-router/'];

function hayEmpaquetador(proyecto: string): boolean {
	const paquete = path.join(proyecto, 'package.json');
	if (!fs.existsSync(paquete)) return false;
	let json: Record<string, unknown>;
	try {
		json = JSON.parse(fs.readFileSync(paquete, 'utf8'));
	} catch {
		return false;
	}
	const nombres = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].flatMap((c) => Object.keys((json[c] as object | undefined) ?? {}));
	return nombres.some((n) => EMPAQUETADORES.includes(n) || PREFIJOS_EMPAQUETADORES.some((p) => n.startsWith(p)));
}

/**
 * La carpeta de salida propuesta. Con empaquetador, `./taisho`: el CSS se importa desde el código y Vite no deja importar
 * lo de `public/` (avisa, y en el build el CSS queda empaquetado y además copiado). Sin empaquetador, la carpeta que sirve el
 * navegador si el proyecto la tiene (`public/`, o `static/`), si no `./taisho`.
 */
export function salidaDetectada(proyecto: string): string {
	if (hayEmpaquetador(proyecto)) return './taisho';
	const hay = (carpeta: string) => fs.existsSync(path.join(proyecto, carpeta)) && fs.statSync(path.join(proyecto, carpeta)).isDirectory();
	return hay('public') ? 'public/taisho' : hay('static') ? 'static/taisho' : './taisho';
}

/** El gestor del proyecto, por el lockfile que haya; sin ninguno, npm. */
export function gestorDetectado(proyecto: string): 'npm' | 'pnpm' | 'yarn' | 'bun' {
	const hay = (archivo: string) => fs.existsSync(path.join(proyecto, archivo));
	if (hay('pnpm-lock.yaml')) return 'pnpm';
	if (hay('yarn.lock')) return 'yarn';
	if (hay('bun.lock') || hay('bun.lockb')) return 'bun';
	return 'npm';
}

function comandoLucide(proyecto: string): { cmd: string; args: string[]; texto: string } {
	const cmd = gestorDetectado(proyecto);
	const args = [cmd === 'npm' ? 'install' : 'add', '-D', 'lucide-static'];
	return { cmd, args, texto: `${cmd} ${args.join(' ')}` };
}

/** Sólo se ofrece con un package.json donde instalar y sin lucide-static ya presente (el mismo archivo que lee el Core). */
function faltaLucide(proyecto: string): boolean {
	return fs.existsSync(path.join(proyecto, 'package.json')) && !fs.existsSync(path.join(proyecto, 'node_modules/lucide-static/icon-nodes.json'));
}

function instalarLucide(proyecto: string): void {
	const { cmd, args, texto } = comandoLucide(proyecto);
	console.log(m().init.instalando(texto));
	// En Windows los gestores son archivos .cmd, que Node sólo lanza a través del shell.
	// El comando es fijo (no entra texto de la persona), así que ahí va entero como una sola cadena.
	const opciones = { cwd: proyecto, stdio: 'inherit' } as const;
	const r = process.platform === 'win32' ? spawnSync(texto, { ...opciones, shell: true }) : spawnSync(cmd, args, opciones);
	if (r.status === 0) console.log(m().init.lucideInstalado);
	else console.error(m().init.lucideFallo(texto));
}

function buildConfig({ lang, brandHex, themeName, useFontsource, customIconsDir, outDir }: Respuestas): string {
	const c = m().init.plantilla;
	const fontFaces = useFontsource
		? `[{ source: '@fontsource/geist-sans', subsets: ['latin'], weights: [400, 500, 600, 700] }]`
		: `[]`;
	const sans = useFontsource
		? `'"Geist Sans", ui-sans-serif, system-ui, sans-serif'`
		: `'ui-sans-serif, system-ui, sans-serif'`;

	return `import type { TaishoConfig } from '@taishods/core/generate';

/**
${c.cabecera}
 */
const config: TaishoConfig = {
${c.temas}
	themes: {
		${themeName}: {
${c.colores}
			colors: {
				brand: '${brandHex}',
			},
		},
	},

${c.content}
	content: ['**/*.{html,svelte,vue,astro,jsx,tsx,js,ts,css}'],

${c.fontFaces}
	fontFaces: ${fontFaces},

${c.fonts}
	fonts: {
		sans: ${sans},
	},

${c.estados}
	defaultStates: {
${Object.entries(DEFAULT_STATES).map(([k, hex]) => `\t\t${k}: '${hex}',`).join('\n')}
	},

${c.iconos}
	// customIconsDir: '${customIconsDir}',

${c.salida}
	out: '${outDir}',

${c.lang}
	lang: '${lang}',
};

export default config;
`;
}

async function preguntar(flag: Lang | undefined, proyecto: string, preguntarLucide: boolean): Promise<Respuestas> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		let lang = usarIdioma(flag);
		if (!flag) {
			const langRespuesta = (await rl.question(m().init.preguntaIdioma(lang))).trim().toLowerCase();
			if (langRespuesta) {
				if (esIdioma(langRespuesta)) lang = usarIdioma(langRespuesta);
				else console.log(m().init.idiomaInvalido(langRespuesta, lang));
			}
		}
		const t = m().init;

		let brandHex = DEFAULTS.brandHex;
		const brandRespuesta = (
			await rl.question(t.preguntaMarca(DEFAULTS.brandHex))
		).trim();
		if (brandRespuesta) {
			if (HEX_RE.test(brandRespuesta)) brandHex = brandRespuesta;
			else console.log(t.hexInvalido(brandRespuesta, DEFAULTS.brandHex));
		}

		const themeRespuesta = (await rl.question(t.preguntaTema(DEFAULTS.themeName))).trim();
		const themeName = themeRespuesta || DEFAULTS.themeName;

		const fontsRespuesta = (
			await rl.question(t.preguntaFuentes)
		).trim().toLowerCase();
		const useFontsource = fontsRespuesta === 'f' || fontsRespuesta === 'fontsource';

		const iconsRespuesta = (
			await rl.question(t.preguntaIconos(DEFAULTS.customIconsDir))
		).trim();
		const customIconsDir = iconsRespuesta || DEFAULTS.customIconsDir;

		const salida = salidaDetectada(proyecto);
		const outDir = (await rl.question(t.preguntaSalida(salida))).trim() || salida;

		let instalarIconos = false;
		if (preguntarLucide) {
			console.log(t.iconosInfo(comandoLucide(proyecto).texto));
			instalarIconos = ['', 's', 'si', 'sí', 'y', 'yes'].includes((await rl.question(t.preguntaLucide)).trim().toLowerCase());
		}

		return { lang, brandHex, themeName, useFontsource, customIconsDir, outDir, instalarIconos };
	} finally {
		rl.close();
	}
}

export interface RunInitOptions {
	yes?: boolean;
	lang?: Lang;
	installIcons?: boolean;
}

export async function runInit(dir?: string, options: RunInitOptions = {}): Promise<void> {
	const targetDir = path.resolve(process.cwd(), dir ?? '.');
	const configPath = path.join(targetDir, 'taisho.config.ts');
	const lang = usarIdioma(options.lang);

	if (fs.existsSync(configPath)) {
		console.error(m().init.yaExiste(displayPath(configPath)));
		process.exitCode = 1;
		return;
	}

	const interactivo = !!process.stdin.isTTY && !options.yes;
	const falta = faltaLucide(targetDir);
	const respuestas = interactivo ? await preguntar(options.lang, targetDir, falta && !options.installIcons) : { ...DEFAULTS, lang, outDir: salidaDetectada(targetDir) };
	const instalar = falta && (options.installIcons || respuestas.instalarIconos);

	fs.mkdirSync(targetDir, { recursive: true });
	fs.writeFileSync(configPath, buildConfig(respuestas));
	console.log(m().init.creado(displayPath(configPath)));
	console.log(m().init.siguiente);
	if (instalar) instalarLucide(targetDir);
	else if (falta && !interactivo) console.log(m().init.lucideSinPreguntar(comandoLucide(targetDir).texto));
}
