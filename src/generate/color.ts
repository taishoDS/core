// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { oklchToLinear, wcagRatio } from '../lib/theme/color-math';
import { resolveThemeTokens } from './emit-tokens';
import type { TaishoExtensions } from './extension';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';

export interface ThemeColors {
	light: Record<string, string>;
	dark: Record<string, string>;
}

type Rgb = [number, number, number];
type Modo = 'light' | 'dark';

/** Los tokens de componente de una extensión son de cualquier tipo: sólo entran los que se escriben como color. */
const PARECE_COLOR = /^(#|oklch\(|rgba?\(|color-mix\(|light-dark\(|var\(--(?:ts-)?color-)/i;
const CLARO_OSCURO = /^light-dark\(/i;
const VAR_ENTERA = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/;

/** Corta `a, b` en la coma de nivel cero (las de `oklch(...)` o `var(..., x)` anidados no cuentan). */
function partirPorComa(texto: string): string[] {
	const partes: string[] = [];
	let nivel = 0;
	let desde = 0;
	for (let i = 0; i < texto.length; i++) {
		if (texto[i] === '(') nivel++;
		else if (texto[i] === ')') nivel--;
		else if (texto[i] === ',' && nivel === 0) {
			partes.push(texto.slice(desde, i).trim());
			desde = i + 1;
		}
	}
	partes.push(texto.slice(desde).trim());
	return partes;
}

/** El contenido de `nombre(...)` si el texto es exactamente esa llamada, con el paréntesis final en su lugar. */
function argumentosDe(texto: string, apertura: RegExp): string | null {
	const m = apertura.exec(texto);
	if (!m) return null;
	let nivel = 0;
	for (let i = m[0].length - 1; i < texto.length; i++) {
		if (texto[i] === '(') nivel++;
		else if (texto[i] === ')' && --nivel === 0) return i === texto.length - 1 ? texto.slice(m[0].length, i) : null;
	}
	return null;
}

const codificar = (lineal: number): number => {
	const c = Math.min(Math.max(lineal, 0), 1);
	return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
};
const decodificar = (byte: number): number => {
	const c = byte / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const numero = (t: string, escala = 1): number | null => {
	const v = t.endsWith('%') ? (parseFloat(t) / 100) * escala : parseFloat(t);
	return Number.isFinite(v) && /^[+-]?(\d+\.?\d*|\.\d+)(%|deg)?$/.test(t) ? v : null;
};

/** `[r, g, b]` en bytes sRGB (recortado a la gama) y alfa de un color (hex, `rgb()` u `oklch()`); `null` si no se interpreta. */
function leer(color: string): { rgb: Rgb; a: number } | null {
	const s = color.trim().toLowerCase();
	const hex = /^#([0-9a-f]{3,8})$/.exec(s)?.[1];
	if (hex) {
		if (![3, 4, 6, 8].includes(hex.length)) return null;
		const completo = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
		return { rgb: [0, 2, 4].map((i) => parseInt(completo.slice(i, i + 2), 16)) as Rgb, a: completo.length === 8 ? parseInt(completo.slice(6), 16) / 255 : 1 };
	}
	const llamada = /^(rgba?|oklch)\(([^()]*)\)$/.exec(s);
	if (!llamada) return null;
	const [canales, alfa, ...sobra] = llamada[2].split('/').map((p) => p.trim());
	if (sobra.length > 0) return null;
	const partes = canales.split(/[\s,]+/).filter(Boolean);
	let textoAlfa = alfa;
	if (textoAlfa === undefined && llamada[1] !== 'oklch' && partes.length === 4) textoAlfa = partes.pop()!;
	const a = textoAlfa === undefined ? 1 : numero(textoAlfa);
	if (a === null || partes.length !== 3) return null;
	if (llamada[1] === 'oklch') {
		const L = numero(partes[0], 1);
		const C = numero(partes[1], 0.4);
		const H = numero(partes[2]);
		if (L === null || C === null || H === null) return null;
		return { rgb: oklchToLinear(L, C, H).map(codificar) as Rgb, a };
	}
	const bytes = partes.map((p) => {
		const v = numero(p, 255);
		return v === null ? null : Math.min(Math.max(Math.round(v), 0), 255);
	});
	return bytes.includes(null) ? null : { rgb: bytes as Rgb, a };
}

/** `[r, g, b]` en bytes sRGB (recortado a la gama) de un color opaco; `null` si tiene alfa o no se interpreta. */
function aBytes(color: string): Rgb | null {
	const c = leer(color);
	return c && c.a === 1 ? c.rgb : null;
}

const aHex = (bytes: Rgb): string => '#' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('');

const luminancia = ([r, g, b]: Rgb): number => 0.2126 * decodificar(r) + 0.7152 * decodificar(g) + 0.0722 * decodificar(b);

/**
 * La proporción de contraste WCAG 2 entre dos colores CSS (hex, `rgb()` u `oklch()`), de 1 a 21.
 * `null` si alguno tiene alfa o no se interpreta. Los colores fuera de sRGB se recortan a la gama.
 */
export function contrastRatio(a: string, b: string): number | null {
	const x = aBytes(a);
	const y = aBytes(b);
	return x && y ? wcagRatio(luminancia(x), luminancia(y)) : null;
}

/**
 * Compone `color` (con alfa o sin él: hex, `rgb()` u `oklch()`) sobre `background` (opaco) en sRGB, como lo hace el navegador,
 * y devuelve `#rrggbb`. `null` si alguno no se interpreta o si el fondo tiene alfa.
 */
export function compositeOver(color: string, background: string): string | null {
	const f = leer(color);
	const b = leer(background);
	if (!f || !b || b.a !== 1) return null;
	return aHex(f.rgb.map((v, i) => Math.round(f.a * v + (1 - f.a) * b.rgb[i])) as Rgb);
}

type Variables = Record<string, string>;

/** Reduce un valor a un color opaco en hex; lo que no lo es (`color-mix`, alfa, sombras) vuelve tal cual. */
function resolver(valor: string, modo: Modo, vars: Variables, visitadas: ReadonlySet<string> = new Set()): string {
	const v = valor.trim();
	const par = argumentosDe(v, CLARO_OSCURO);
	if (par !== null) {
		const [claro, oscuro] = partirPorComa(par);
		if (oscuro !== undefined) return resolver(modo === 'light' ? claro : oscuro, modo, vars, visitadas);
	}
	const ref = VAR_ENTERA.exec(v);
	if (ref) {
		const [, nombre, respaldo] = ref;
		if (Object.hasOwn(vars, nombre) && !visitadas.has(nombre)) return resolver(vars[nombre], modo, vars, new Set(visitadas).add(nombre));
		return respaldo === undefined ? v : resolver(respaldo, modo, vars, visitadas);
	}
	const bytes = aBytes(v);
	return bytes ? aHex(bytes) : v;
}

/**
 * Por tema, cada variable CSS de color con su valor final en sRGB (`#rrggbb`), en claro y en oscuro: con los `var()` y los
 * `light-dark()` resueltos y lo que el tema pisa a mano aplicado (incluidos los tokens de color de las extensiones). Lo que no se reduce a un color opaco (`color-mix`, alfa,
 * material) vuelve tal cual. Las claves son nombres de variables CSS (`--color-gray-500`, `--ts-color-heading`).
 * Puro: sin fs, sirve en el navegador.
 */
export function resolveThemeColors(config: TaishoConfig, extensions: TaishoExtensions = {}): Record<string, ThemeColors> {
	const { themeEntries, userFonts, defaultStates, userScales } = deriveThemeVocabulary(config, extensions);
	const salida: Record<string, ThemeColors> = {};
	for (const entry of themeEntries) {
		const t = resolveThemeTokens(entry, userFonts, defaultStates, userScales, extensions);
		const declaradas: Record<Modo, Variables> = { light: {}, dark: {} };
		const poner = (nombre: string, claro: string, oscuro: string = claro): void => {
			declaradas.light[nombre] = claro;
			declaradas.dark[nombre] = oscuro;
		};
		for (const [paleta, escala] of Object.entries(t.colors)) {
			for (const [tono, { light, dark }] of Object.entries(escala)) poner(`--color-${paleta}-${tono}`, light, dark ?? light);
		}
		for (const [k, v] of Object.entries(t.fixed)) poner(`--color-${k}`, v);
		for (const [k, v] of Object.entries(t.semantic)) poner(`--ts-color-${k}`, v);
		for (const [nombre, estado] of Object.entries(t.states)) {
			if (estado.kind === 'status') {
				poner(`--ts-color-${nombre}`, `var(--color-${nombre}-500)`);
				poner(`--ts-color-${nombre}-bg`, `var(--color-${nombre}-100)`);
				poner(`--ts-color-${nombre}-border`, `var(--color-${nombre}-200)`);
				poner(`--ts-color-${nombre}-contrast`, `var(--color-${nombre}-500-contrast)`);
				poner(`--ts-color-${nombre}-text`, `var(--color-${nombre}-700)`);
			} else {
				poner(`--ts-color-${nombre}`, `oklch(${estado.l} ${estado.c} ${estado.h})`);
				poner(`--ts-color-${nombre}-bg`, `var(--color-${nombre}-100)`);
				poner(`--ts-color-${nombre}-border`, `var(--color-${nombre}-200)`);
				poner(`--ts-color-${nombre}-contrast`, estado.contrastLight, estado.contrastDark);
			}
		}
		poner('--ts-focus-ring-color', t.focusRing ?? 'var(--color-brand-solid)');
		const { light: matClaro, dark: matOscuro } = t.material;
		for (const [nombre, clave] of [['bg', 'bg'], ['border', 'border'], ['shadow-rgb', 'shadowRgb']] as const) {
			if (matClaro?.[clave]) poner(`--ts-material-${nombre}`, matClaro[clave]!, matOscuro?.[clave] ?? matClaro[clave]!);
			else if (matOscuro?.[clave]) declaradas.dark[`--ts-material-${nombre}`] = matOscuro[clave]!;
		}
		for (const { prefix, tokens } of Object.values(t.components)) {
			for (const [k, v] of Object.entries(tokens)) if (PARECE_COLOR.test(v.trim())) poner(`--ts-${prefix}-${k}`, v);
		}
		poner('--ts-spotlight-color', t.spotlight.light, t.spotlight.dark);
		const tema: ThemeColors = { light: {}, dark: {} };
		for (const modo of ['light', 'dark'] as const) {
			for (const [nombre, valor] of Object.entries(declaradas[modo])) tema[modo][nombre] = resolver(valor, modo, declaradas[modo]);
		}
		salida[entry.name] = tema;
	}
	return salida;
}
