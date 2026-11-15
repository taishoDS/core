// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { createRequire } from 'node:module';
import { esAtributoDeClases } from '../generate/avisos-clases';

const requerir = createRequire(import.meta.url);

const REGLA_CSS = /[^\s{}<>$]*\s*(?<!\$)\{[^{}$]*:[^{}$]*\}/g;
const ESTILO_EN_LINEA = /\bstyle\s*=\s*(["'])[^"'\n]*\1/g;
const sinCss = (texto: string) => texto.replace(ESTILO_EN_LINEA, ' ').replace(REGLA_CSS, ' ');

function stringsDeCodigo(codigo: string): string[] {
	return stringsCrudos(codigo).map(sinCss);
}

function stringsCrudos(codigo: string): string[] {
	codigo = codigo.replace(/\b(?:from|import|require)\s*\(?\s*(["'])[^"'\n]*\1/g, '');
	const out: string[] = [];
	for (let i = 0; i < codigo.length; i++) {
		const c = codigo[i];
		if (c === '/' && codigo[i + 1] === '/') i = codigo.indexOf('\n', i) === -1 ? codigo.length : codigo.indexOf('\n', i);
		else if (c === '/' && codigo[i + 1] === '*') i = codigo.indexOf('*/', i + 2) === -1 ? codigo.length : codigo.indexOf('*/', i + 2) + 1;
		else if (c === '"' || c === "'") {
			let j = i + 1;
			while (j < codigo.length && codigo[j] !== c && codigo[j] !== '\n') j += codigo[j] === '\\' ? 2 : 1;
			out.push(codigo.slice(i + 1, j));
			i = j;
		} else if (c === '`') {
			let j = i + 1;
			let anidado = 0;
			while (j < codigo.length && !(codigo[j] === '`' && anidado === 0)) {
				if (codigo[j] === '\\') j++;
				else if (codigo[j] === '$' && codigo[j + 1] === '{') {
					anidado++;
					j++;
				} else if (codigo[j] === '}' && anidado > 0) anidado--;
				j++;
			}
			out.push(codigo.slice(i + 1, j));
			i = j;
		}
	}
	return out;
}

function scriptSinTipos(script: string, loader: 'ts' | 'tsx' = 'ts'): string {
	try {
		const { transformSync } = requerir('esbuild') as typeof import('esbuild');
		return transformSync(script, { loader, target: 'esnext', ...(loader === 'tsx' ? { jsx: 'preserve' as const } : {}) }).code;
	} catch {
		return script;
	}
}

function expresion(texto: string, i: number): { strings: string[]; fin: number } {
	let profundidad = 1;
	let j = i;
	while (j < texto.length && profundidad > 0) {
		const c = texto[j];
		if (c === '"' || c === "'" || c === '`') {
			let k = j + 1;
			while (k < texto.length && texto[k] !== c) k += texto[k] === '\\' ? 2 : 1;
			j = k + 1;
			continue;
		}
		if (c === '{') profundidad++;
		else if (c === '}') profundidad--;
		j++;
	}
	return { strings: stringsDeCodigo(texto.slice(i, j - 1)), fin: j };
}

const ATRIBUTO = /(\[|:|v-bind:|x-bind:)?([A-Za-z_][\w.:-]*)\]?\s*=\s*(?:(["'])|([^\s"'`=<>{}]+?)(?=\/?>|\s|$))/y;

interface OpcionesMarkup {
	llaves: boolean;
	astro?: boolean;
}

function clasesDeMarkup(markup: string, { llaves, astro = false }: OpcionesMarkup): string[] {
	const out: string[] = [];
	for (let i = 0; i < markup.length; ) {
		if (markup.startsWith('<!--', i)) {
			const fin = markup.indexOf('-->', i);
			i = fin === -1 ? markup.length : fin + 3;
			continue;
		}
		if (llaves && markup[i] === '{') {
			const e = expresion(markup, i + 1);
			out.push(...e.strings);
			i = e.fin;
			continue;
		}
		const dir = /^class:([A-Za-z0-9_-]+)/.exec(markup.slice(i, i + 80));
		if (dir && /[\s"'}]/.test(markup[i - 1] ?? ' ')) {
			if (!(astro && dir[1] === 'list')) out.push(dir[1]);
			i += dir[0].length;
			continue;
		}
		const angular = /^\[class\.([A-Za-z0-9_-]+)\]/.exec(markup.slice(i, i + 80));
		if (angular && /\s/.test(markup[i - 1] ?? ' ')) {
			out.push(angular[1]);
			i += angular[0].length;
			continue;
		}
		ATRIBUTO.lastIndex = i;
		const attr = /\s/.test(markup[i - 1] ?? ' ') ? ATRIBUTO.exec(markup) : null;
		if (attr && esAtributoDeClases(attr[2])) {
			if (attr[4] !== undefined) {
				out.push(attr[4]);
				i = ATRIBUTO.lastIndex;
				continue;
			}
			let j = ATRIBUTO.lastIndex;
			let texto = '';
			while (j < markup.length && markup[j] !== attr[3]) {
				if (llaves && markup[j] === '{') {
					const e = expresion(markup, j + 1);
					out.push(...e.strings);
					texto += markup.slice(j, e.fin);
					j = e.fin;
				} else texto += markup[j++];
			}
			if (attr[1]) out.push(...stringsDeCodigo(texto));
			else out.push(texto);
			i = j + 1;
			continue;
		}
		i++;
	}
	return out;
}

function partirScripts(contenido: string): { scripts: string[]; markup: string } {
	const scripts: string[] = [];
	const markup = contenido
		.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g, (_t, cuerpo: string) => {
			scripts.push(cuerpo);
			return '';
		})
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
	return { scripts, markup };
}

const sinAtributosAjenos = (jsx: string) =>
	jsx.replace(/(?<![\w$.:-])([A-Za-z_][\w:-]*)=(["'])[^\n]*?\2/g, (todo, nombre: string) => (esAtributoDeClases(nombre) ? todo : ''));

export function soloClases(archivo: string, contenido: string): string {
	const ext = /\.([A-Za-z0-9]+)$/.exec(archivo)?.[1].toLowerCase();
	switch (ext) {
		case 'css':
			return '';
		case 'js':
		case 'mjs':
		case 'cjs':
			return stringsDeCodigo(contenido).join('\n');
		case 'ts':
		case 'mts':
		case 'cts':
			return stringsDeCodigo(scriptSinTipos(contenido)).join('\n');
		case 'jsx':
		case 'tsx':
			return stringsDeCodigo(sinAtributosAjenos(scriptSinTipos(contenido, 'tsx'))).join('\n');
		case 'html':
		case 'htm':
		case 'md':
		case 'svelte':
		case 'vue':
		case 'astro':
		case 'mdx': {
			const frontmatter = ext === 'astro' ? /^---\r?\n([\s\S]*?)\r?\n---/.exec(contenido) : null;
			const { scripts, markup } = partirScripts(frontmatter ? contenido.slice(frontmatter[0].length) : contenido);
			if (frontmatter) scripts.unshift(frontmatter[1]);
			const llaves = ext !== 'html' && ext !== 'htm' && ext !== 'md';
			return [...scripts.flatMap((s) => stringsDeCodigo(scriptSinTipos(s))), ...clasesDeMarkup(markup, { llaves, astro: ext === 'astro' })].join('\n');
		}
		default:
			return contenido;
	}
}

export function clasesDeContenido(archivo: string, contenido: string): string {
	const clases = soloClases(archivo, contenido);
	if (clases === contenido) return contenido;
	return [clases, ...(contenido.match(/data-ts-[a-z0-9-]+/g) ?? [])].join('\n');
}
