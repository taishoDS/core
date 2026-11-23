// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { posicionesDe, soloMarkup, type Aviso } from './avisos-clases';
import type { ContentFile } from './compile';

/** La estructura que el JS del Core necesita de un componente: su gancho raíz, la clase con que se escribe y las piezas obligatorias adentro. Sale de `core-datos/contrato.ts`. */
export interface EstructuraDeclarada {
	component: string;
	raiz: string;
	clase?: string;
	/** Si la raíz trae alguno (`atributo` o `atributo="valor"`), es de otro componente y esta estructura no se le aplica. */
	fuera?: string[];
	/** `o`: otros atributos que también cumplen la pieza. `si`: la pieza sólo es obligatoria si la raíz trae ese atributo. */
	piezas: { atributo: string; clase?: string; en?: string; o?: string[]; si?: string }[];
}

/** ¿El elemento cumple `atributo` o `atributo="valor"`? */
export function cumple(el: Pick<Elemento, 'atributos'>, selector: string): boolean {
	const m = /^([^=]+)="([^"]*)"$/.exec(selector);
	return m ? el.atributos.get(m[1]) === m[2] : el.atributos.has(selector);
}

export interface Elemento {
	nombre: string;
	desde: number;
	finApertura: number;
	/** Donde empieza su cierre; si no lo tiene propio, donde lo cierra el de un padre o el fin del texto. */
	finContenido: number;
	/** Tiene su propia etiqueta de cierre. */
	cerrado: boolean;
	padre: number;
	atributos: Map<string, string | null>;
}

const VACIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/** Salta un `{…}` balanceado (con sus strings) desde la llave de apertura en `i`; devuelve el índice tras el cierre, o -1. */
function saltarLlaves(texto: string, i: number): number {
	let profundidad = 0;
	let comilla = '';
	for (let k = i; k < texto.length; k++) {
		const c = texto[k];
		if (comilla) {
			if (c === '\\') k++;
			else if (c === comilla) comilla = '';
		} else if (c === '"' || c === "'" || c === '`') comilla = c;
		else if (c === '{') profundidad++;
		else if (c === '}' && --profundidad === 0) return k + 1;
	}
	return -1;
}

/** Los atributos de una etiqueta (`texto[desde, hasta)`, sin el nombre ni el `>`), en orden. Una expansión (`{...x}`) se anota como `{...`. */
function atributosDe(texto: string, desde: number, hasta: number): Map<string, string | null> | null {
	const atributos = new Map<string, string | null>();
	let i = desde;
	while (i < hasta) {
		const c = texto[i];
		if (/\s|\//.test(c)) i++;
		else if (c === '{') {
			const fin = saltarLlaves(texto, i);
			if (fin < 0 || fin > hasta) return null;
			if (texto.startsWith('{...', i)) atributos.set('{...', null);
			i = fin;
		} else {
			const nombre = /^[^\s=/>{}"']+/.exec(texto.slice(i, hasta))?.[0];
			if (!nombre) return null;
			i += nombre.length;
			let valor: string | null = null;
			const igual = /^\s*=\s*/.exec(texto.slice(i, hasta));
			if (igual) {
				i += igual[0].length;
				if (texto[i] === '"' || texto[i] === "'") {
					const fin = texto.indexOf(texto[i], i + 1);
					if (fin < 0 || fin >= hasta) return null;
					valor = texto.slice(i + 1, fin);
					i = fin + 1;
				} else if (texto[i] === '{') {
					const fin = saltarLlaves(texto, i);
					if (fin < 0 || fin > hasta) return null;
					valor = texto.slice(i, fin);
					i = fin;
				} else {
					const crudo = /^[^\s>]*/.exec(texto.slice(i, hasta))![0];
					valor = crudo;
					i += crudo.length;
				}
			}
			atributos.set(nombre, valor);
		}
	}
	return atributos;
}

/** Fin de una etiqueta de apertura (el índice del `>`), mirando comillas y llaves; -1 si no cierra. */
function finDeApertura(texto: string, desde: number): number {
	let comilla = '';
	let profundidad = 0;
	for (let k = desde; k < texto.length; k++) {
		const c = texto[k];
		if (comilla) {
			if (c === '\\' && profundidad > 0) k++;
			else if (c === comilla) comilla = '';
		} else if (c === '"' || c === "'" || (c === '`' && profundidad > 0)) comilla = c;
		else if (c === '{') profundidad++;
		else if (c === '}') profundidad--;
		else if (c === '>' && profundidad <= 0) return k;
	}
	return -1;
}

/**
 * Los elementos del marcado, en orden de aparición, con su padre y dónde cierran. Empareja aperturas y cierres a mano: las
 * etiquetas vacías (`<input>`) y las que se cierran solas (`<x />`) no abren nada; un cierre que corresponde a un ancestro
 * cierra de paso a los que quedaron abiertos (`<li>`, `<p>`) sin darles cierre propio. En `jsx`/`tsx` un `<` pegado a una
 * palabra (`useState<string>`) es un tipo, no una etiqueta.
 */
export function elementosDe(texto: string, jsx = false): Elemento[] {
	const elementos: Elemento[] = [];
	const pila: number[] = [];
	for (let i = texto.indexOf('<'); i >= 0; i = texto.indexOf('<', i + 1)) {
		if (jsx && /[A-Za-z0-9_$)\]]/.test(texto[i - 1] ?? '')) continue;
		const resto = texto.slice(i, i + 120);
		if (resto[1] === '/') {
			const cierre = /^<\/([A-Za-z][\w.:-]*)\s*>/.exec(resto);
			if (!cierre) continue;
			let hallado = pila.length - 1;
			while (hallado >= 0 && elementos[pila[hallado]].nombre.toLowerCase() !== cierre[1].toLowerCase()) hallado--;
			if (hallado < 0) continue;
			const [propio, ...abiertos] = pila.splice(hallado);
			elementos[propio].cerrado = true;
			for (const k of [propio, ...abiertos]) elementos[k].finContenido = i;
			continue;
		}
		const nombre = /^<([A-Za-z][\w.:-]*)/.exec(resto);
		if (!nombre) continue;
		const fin = finDeApertura(texto, i + nombre[0].length);
		if (fin < 0) continue;
		const atributos = atributosDe(texto, i + nombre[0].length, fin);
		if (!atributos) continue;
		const propio = texto[fin - 1] === '/' || VACIOS.has(nombre[1]);
		elementos.push({ nombre: nombre[1], desde: i, finApertura: fin + 1, finContenido: fin + 1, cerrado: false, padre: pila.at(-1) ?? -1, atributos });
		if (!propio) pila.push(elementos.length - 1);
		i = fin;
	}
	for (const k of pila) elementos[k].finContenido = texto.length;
	return elementos;
}

const EXPANSIONES_O_HIJOS = /\{\.\.\.|\{@render\b|\{@html\b|\{children\b|\{props\.children\b|<slot\b|\bv-bind\s*=|\bv-html\b|\bdangerouslySetInnerHTML\b/;

/** Una etiqueta que es un componente (no un elemento del DOM): su marcado no está en este archivo. */
const esComponente = (nombre: string, ext: string): boolean => /^[A-Z]/.test(nombre) || nombre.includes('.') || nombre.startsWith('svelte:') || (ext === 'vue' && nombre.includes('-'));

function agruparPorRaiz(estructuras: readonly EstructuraDeclarada[]): Map<string, EstructuraDeclarada[]> {
	const porRaiz = new Map<string, EstructuraDeclarada[]>();
	for (const e of estructuras) porRaiz.set(e.raiz, [...(porRaiz.get(e.raiz) ?? []), e]);
	return porRaiz;
}

/** El índice de la raíz más cercana (la de `atributoRaiz`) de `elementos[k]`, sin contarlo a él; -1 si no tiene. */
function raizMasCercana(elementos: readonly Elemento[], k: number, atributoRaiz: string): number {
	let ancestro = elementos[k].padre;
	while (ancestro >= 0 && !elementos[ancestro].atributos.has(atributoRaiz)) ancestro = elementos[ancestro].padre;
	return ancestro;
}

/** Los elementos de adentro de `elementos[raiz]` cuya raíz más cercana (la de `atributoRaiz`) es él. */
function propiosDe(elementos: readonly Elemento[], raiz: number, atributoRaiz: string): Elemento[] {
	const { finApertura, finContenido } = elementos[raiz];
	const propios: Elemento[] = [];
	for (let k = raiz + 1; k < elementos.length && elementos[k].desde < finContenido; k++) {
		if (elementos[k].desde >= finApertura && raizMasCercana(elementos, k, atributoRaiz) === raiz) propios.push(elementos[k]);
	}
	return propios;
}

/** ¿Tiene `elementos[raiz]` adentro un elemento con `pieza` cuya raíz más cercana (la de `atributoRaiz`) es él? */
export function tienePieza(elementos: readonly Elemento[], raiz: number, atributoRaiz: string, pieza: string): boolean {
	return propiosDe(elementos, raiz, atributoRaiz).some((e) => e.atributos.has(pieza));
}

/**
 * Revisa la estructura de los componentes del Core. `missing-part`: una raíz sin una pieza obligatoria adentro (cuenta la raíz
 * más cercana: el date-picker anida campos numéricos). `missing-root-attribute`: un elemento con `ts` y la clase raíz sin el gancho.
 *
 * En `.html`/`.htm` valen las dos. En `.svelte`/`.vue`/`.jsx`/`.tsx`/`.astro` sólo `missing-part`, y se calla si no se puede
 * saber qué hay adentro: la raíz sin cierre en el archivo, un componente, un `<slot>`/hijos o una expansión de atributos.
 */
export function avisosDeEstructura(archivos: Iterable<ContentFile>, estructuras: readonly EstructuraDeclarada[]): Aviso[] {
	const avisos: Aviso[] = [];
	const porRaiz = agruparPorRaiz(estructuras);
	for (const f of archivos) {
		const ext = /\.([A-Za-z0-9]+)$/.exec(f.file)?.[1].toLowerCase() ?? '';
		const esHtml = ext === 'html' || ext === 'htm';
		if (!esHtml && !['svelte', 'vue', 'jsx', 'tsx', 'astro'].includes(ext)) continue;
		const texto = soloMarkup(f.file, f.content);
		if (![...porRaiz.keys()].some((raiz) => texto.includes(raiz)) && !(esHtml && estructuras.some((e) => e.clase && texto.includes(e.clase)))) continue;
		const elementos = elementosDe(texto, ext === 'jsx' || ext === 'tsx');
		const posicion = posicionesDe(texto);
		elementos.forEach((el, indice) => {
			const clases = (el.atributos.get('class') ?? '').split(/\s+/);
			if (esHtml && clases.includes('ts')) {
				for (const e of estructuras) {
					if (!e.clase || !clases.includes(e.clase) || el.atributos.has(e.raiz) || e.piezas.some((p) => el.atributos.has(p.atributo))) continue;
					avisos.push({ file: f.file, ...posicion(el.desde), rule: 'missing-root-attribute', severity: 'error', code: 'missing-root-attribute', params: { component: e.component, class: e.clase, attribute: e.raiz, element: el.nombre } });
				}
			}
			for (const [raiz, declaradas] of porRaiz) {
				if (!el.atributos.has(raiz)) continue;
				if (!esHtml) {
					const dentro = texto.slice(el.finApertura, el.finContenido);
					const hijos = elementos.slice(indice + 1).filter((h) => h.desde < el.finContenido);
					if (!el.cerrado || esComponente(el.nombre, ext) || EXPANSIONES_O_HIJOS.test(dentro) || hijos.some((h) => esComponente(h.nombre, ext))) continue;
				}
				const aplicables = declaradas.filter((d) => !d.fuera?.some((x) => cumple(el, x)));
				const e = aplicables.find((d) => d.clase && clases.includes(d.clase)) ?? aplicables[0];
				if (!e) continue;
				const propios = propiosDe(elementos, indice, raiz);
				for (const pieza of e.piezas) {
					for (const h of pieza.clase ? propios : []) {
						if (!(h.atributos.get('class') ?? '').split(/\s+/).includes(pieza.clase!) || h.atributos.has(pieza.atributo)) continue;
						avisos.push({ file: f.file, ...posicion(h.desde), rule: 'missing-part', severity: 'error', code: 'missing-part-attribute', params: { component: e.component, root: raiz, attribute: pieza.atributo, class: pieza.clase!, element: h.nombre } });
					}
					if (pieza.clase || (pieza.si && !el.atributos.has(pieza.si))) continue;
					if (propios.some((h) => [pieza.atributo, ...(pieza.o ?? [])].some((a) => h.atributos.has(a)))) continue;
					avisos.push({ file: f.file, ...posicion(el.desde), rule: 'missing-part', severity: 'error', code: 'missing-part', params: { component: e.component, root: raiz, attribute: pieza.atributo, ...(pieza.en && { element: pieza.en }) } });
				}
			}
		});
	}
	return avisos;
}
