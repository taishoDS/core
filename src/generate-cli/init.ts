// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
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
}

const DEFAULTS: Omit<Respuestas, 'lang'> = {
	brandHex: '#4F46E5',
	themeName: 'main',
	useFontsource: false,
	customIconsDir: 'src/icons',
};

function buildConfig({ lang, brandHex, themeName, useFontsource, customIconsDir }: Respuestas): string {
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

${c.lang}
	lang: '${lang}',
};

export default config;
`;
}

async function preguntar(flag: Lang | undefined): Promise<Respuestas> {
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

		return { lang, brandHex, themeName, useFontsource, customIconsDir };
	} finally {
		rl.close();
	}
}

export interface RunInitOptions {
	yes?: boolean;
	lang?: Lang;
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
	const respuestas = interactivo ? await preguntar(options.lang) : { ...DEFAULTS, lang };

	fs.mkdirSync(targetDir, { recursive: true });
	fs.writeFileSync(configPath, buildConfig(respuestas));
	console.log(m().init.creado(displayPath(configPath)));
	console.log(m().init.siguiente);
}
