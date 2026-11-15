// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { avisosEstructuradosDeMarkup, posicionesDe, type Aviso, type OpcionesDeAvisos } from './avisos-clases';
import { derivarVocabulario, type ContentFile } from './compile';
import { buildTokensCSS, resolveThemeTokens } from './emit-tokens';
import { vocabularioClasico, type VocabularioClasico } from './migrar-clasico';
import { vecino } from './resolve-extend';
import type { TaishoExtensions } from './extension';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';

export function varsDeclaradas(css: string): Set<string> {
	return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

export function varsDelTema(config: TaishoConfig, extensiones: TaishoExtensions = {}): Set<string> {
	const tema = deriveThemeVocabulary(config, extensiones);
	const { themeEntries, userFonts, defaultStates, userScales } = tema;
	const { reset, atomic, utilities, components } = derivarVocabulario(config, tema, extensiones);
	const css = [reset, atomic, utilities, components, ...themeEntries.map((e) => buildTokensCSS(resolveThemeTokens(e, userFonts, defaultStates, userScales, extensiones)))];
	return new Set(css.flatMap((c) => [...varsDeclaradas(c)]));
}

const CLASICA = /(?<![\w#$-])((?:@?[a-z0-9-]+:)*)(ts-[A-Za-z0-9/-]*[A-Za-z0-9])(?![A-Za-z0-9_/-])(?!\$\{)/g;

const REFERENCIA_VAR = /var\(\s*(--(?:ts|color)-[\w-]+)(?![\w${}-])\s*([,)])/g;

export function avisosClasicos(archivos: Iterable<ContentFile>, vocabulario: VocabularioClasico): Aviso[] {
	const avisos: Aviso[] = [];
	for (const f of archivos) {
		const posicion = posicionesDe(f.content);
		for (const m of f.content.matchAll(CLASICA)) {
			const [token, variante, nombre] = m;
			const donde = { file: f.file, ...posicion(m.index), rule: 'legacy-prefix', severity: 'error' } as const;
			if (vocabulario.nombres.has(nombre)) {
				const suggestion = `${variante}${nombre.slice(3)}`;
				avisos.push({ ...donde, code: 'legacy-prefix', params: { class: token, suggestion }, suggestion });
				continue;
			}
			const renombre = vocabulario.mapa.get(nombre);
			if (!renombre) continue;
			const suggestion = renombre.nuevo && `${variante}${renombre.nuevo.slice(3)}`;
			avisos.push(suggestion ? { ...donde, code: 'legacy-prefix-renamed', params: { class: token, suggestion }, suggestion } : { ...donde, code: 'legacy-prefix-removed', params: { class: token } });
		}
	}
	return avisos;
}

export function avisosDeVars(archivos: Iterable<ContentFile>, validas: ReadonlySet<string>): Aviso[] {
	const avisos: Aviso[] = [];
	const propias = new Set<string>();
	const lista = [...archivos];
	for (const f of lista) for (const m of f.content.matchAll(/(?<!var\(\s*)(--(?:ts|color)-[\w-]+)/g)) propias.add(m[1]);
	for (const f of lista) {
		const posicion = posicionesDe(f.content);
		for (const m of f.content.matchAll(REFERENCIA_VAR)) {
			const nombre = m[1];
			if (m[2] === ',' || validas.has(nombre) || propias.has(nombre)) continue;
			const suggestion = vecino(nombre, validas);
			avisos.push({ file: f.file, ...posicion(m.index), rule: 'unknown-var', severity: 'error', code: 'unknown-var', params: { variable: nombre, ...(suggestion && { suggestion }) }, ...(suggestion && { suggestion }) });
		}
	}
	return avisos;
}

export function avisosDeCheck(archivos: readonly ContentFile[], config: TaishoConfig, validasExtra: Iterable<string> = [], extensiones: TaishoExtensions = {}, opciones: OpcionesDeAvisos = {}): Aviso[] {
	const validas = new Set([...varsDelTema(config, extensiones), ...validasExtra]);
	const todos = [
		...avisosEstructuradosDeMarkup(archivos, derivarVocabulario(config, deriveThemeVocabulary(config, extensiones), extensiones), opciones),
		...avisosClasicos(archivos, vocabularioClasico(config, extensiones)),
		...avisosDeVars(archivos, validas),
	];
	const unicos = new Map(todos.map((a) => [`${a.file}\0${a.line}\0${a.column}\0${a.rule}`, a]));
	return [...unicos.values()].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line || a.column - b.column || (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0)));
}
