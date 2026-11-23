// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { esModificador, escalasDe, modificadoresDeComponentes } from './naming-table';
import { etiquetaEn } from './llave-scope';
import { renombrar } from './naming-renames';
import { vecino } from './resolve-extend';
import { construirMapa, medidaDeOtroFramework } from './tailwind-map';
import { componerUso, datosComposicion, esModificadorPropio, type ParPropia } from './propias';
import { validarCadena, type Envoltura } from './variantes';
import type { ContentFile } from './compile';
import type { derivarVocabulario } from './compile';
import type { WarningData, WarningParams } from './avisos-tipos';

type Vocabulario = ReturnType<typeof derivarVocabulario>;

export type ReglaCheck = 'unknown-class' | 'missing-ts' | 'legacy-prefix' | 'unknown-var' | 'ignored-attribute' | 'other-scale' | 'missing-part' | 'missing-root-attribute';

export type Aviso = WarningData & {
	file: string;
	line: number;
	column: number;
	rule: ReglaCheck;
	severity: 'error' | 'warning';
	suggestion?: string;
};

export function posicionesDe(texto: string): (pos: number) => { line: number; column: number } {
	const saltos: number[] = [];
	for (let i = texto.indexOf('\n'); i >= 0; i = texto.indexOf('\n', i + 1)) saltos.push(i);
	return (pos) => {
		let a = 0;
		let b = saltos.length;
		while (a < b) {
			const m = (a + b) >> 1;
			if (saltos[m] < pos) a = m + 1;
			else b = m;
		}
		return { line: a + 1, column: pos - (a > 0 ? saltos[a - 1] : -1) };
	};
}

const MARKUP = new Set(['html', 'htm', 'svelte', 'vue', 'astro', 'jsx', 'tsx']);

const MIEMBROS_FAMILIA = 8;

const LARGO_MINIMO_VECINO = 5;

/** Raíces compuestas de escala (`col-span-`, `max-w-`, `gap-x-`…): una palabra suelta tras la raíz que el DS no define se toma por un valor mal escrito. Un nombre propio de una palabra (`max-w-container`) también cae acá; un sufijo con guion (`min-h-screen-mobile`) se tiene por propio. */
const RAIZ_DE_ESCALA = /^(?:grid|col|row|gap|min|max)-[a-z]+-$/;


/** Formas mal escritas que se vieron de verdad → la del DS. `fontsize-12` es el nombre del token (`--ts-fontsize-12`); la utilidad es `text-12`. */
const EQUIVOCACIONES: readonly [RegExp, string][] = [[/^fontsize-(\d+)$/, 'text-$1']];

function equivocacionConocida(base: string, datos: Datos): string | undefined {
	for (const [forma, correcta] of EQUIVOCACIONES) {
		const sugerida = base.replace(forma, correcta);
		if (sugerida !== base && datos.validos.has(sugerida)) return sugerida;
	}
	return undefined;
}

export interface Datos {
	validos: Set<string>;
	candidatos: string[];
	inequivocos: Set<string>;
	raices: string[];
	cadenasPropias: ReadonlyMap<string, readonly ParPropia[]>;
	modificadoresPropios: ReadonlyMap<string, readonly string[]>;
	prefijos: ReadonlyMap<string, Envoltura>;
	deTailwind: () => ReadonlyMap<string, string>;
	sinEquivalente: (nombre: string) => string | undefined;
	escalaAjena: (nombre: string) => Pick<WarningParams['other-scale'], 'px' | 'otherPx' | 'equivalent'> | undefined;
}

export function datosDe(v: Vocabulario): Datos {
	const modificadores = modificadoresDeComponentes(v.components);
	const propias = Object.keys(v.userUtilities).filter((k) => !esModificadorPropio(k));
	const dePropias = new Map<string, string[]>();
	for (const [componente, mods] of v.modificadoresPropios) for (const m of mods) dePropias.set(m, [...(dePropias.get(m) ?? []), componente]);
	const utilidades = [...v.nombresCortos.filter((n) => v.atomicas.has(n)), ...propias];
	const validos = new Set<string>([...v.nombresCortos, ...v.componentes, ...modificadores, ...propias, 'ts', 'dark']);
	for (const m of v.components.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.ts-([A-Za-z_][A-Za-z0-9_-]*)/g)) if (!renombrar(`ts-${m[1]}`)) validos.add(m[1]);
	for (const m of [...dePropias.keys()]) if (validos.has(m)) dePropias.delete(m);
	for (const m of dePropias.keys()) validos.add(m);
	const candidatos = [...utilidades, ...modificadores];
	const inequivocos = new Set(candidatos.filter((n) => n.includes('-')));
	const miembros = new Map<string, number>();
	for (const n of candidatos) {
		const partes = n.split('-');
		for (let i = 1; i < partes.length; i++) {
			const raiz = partes.slice(0, i).join('-') + '-';
			miembros.set(raiz, (miembros.get(raiz) ?? 0) + 1);
		}
	}
	const raices = [...miembros].filter(([, n]) => n >= MIEMBROS_FAMILIA).map(([r]) => r);
	let mapa: ReturnType<typeof construirMapa> | undefined;
	const delMapa = () => (mapa ??= construirMapa({ vigentes: new Set(v.nombresCortos.map((n) => `ts-${n}`)), esc: escalasDe(), familias: [] }));
	let tailwind: Map<string, string> | undefined;
	const deTailwind = () =>
		(tailwind ??= new Map(
			delMapa()
				.filas.filter((f) => f.tailwind.includes('-') && f.tailwind !== f.scope)
				.map((f) => [f.tailwind, f.scope]),
		));
	let sinEquivalenteDe: { exactas: Map<string, string>; prefijos: [string, string][] } | undefined;
	const sinEquivalente = (nombre: string) => {
		if (!sinEquivalenteDe) {
			const clases = delMapa().sinEquivalente.flatMap((g) => g.clases.filter((c) => !c.includes(':')).map((c): [string, string] => [c, g.motivo]));
			sinEquivalenteDe = { exactas: new Map(clases.filter(([c]) => !c.endsWith('*')).reverse()), prefijos: clases.filter(([c]) => /^[a-z-]+-\*$/.test(c)).map(([c, m]): [string, string] => [c.slice(0, -1), m]) };
		}
		return sinEquivalenteDe.exactas.get(nombre) ?? sinEquivalenteDe.prefijos.find(([prefijo]) => nombre.startsWith(prefijo))?.[1];
	};
	const escalaAjena = (nombre: string) => {
		const otherPx = medidaDeOtroFramework(nombre);
		const equivalent = deTailwind().get(nombre);
		if (otherPx === null && !equivalent) return undefined;
		return { ...(otherPx !== null && { px: Number(nombre.slice(nombre.lastIndexOf('-') + 1)), otherPx }), ...(equivalent && { equivalent }) };
	};
	return { validos, candidatos, inequivocos, raices, cadenasPropias: v.cadenasPropias, modificadoresPropios: dePropias, prefijos: v.prefijos, deTailwind, sinEquivalente, escalaAjena };
}

export function soloMarkup(archivo: string, contenido: string): string {
	const blanco = (t: string) => t.replace(/[^\n]/g, ' ');
	let texto = contenido;
	if (/\.astro$/i.test(archivo)) texto = texto.replace(/^---\r?\n[\s\S]*?\r?\n---/, blanco);
	return texto
		.replace(/<!--[\s\S]*?-->/g, blanco)
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, blanco)
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, blanco);
}

/** Un atributo cuyo valor el escáner lee como clases: `class`, `className`, `bodyClass`, `body-class`, `data-active-class`, `[ngClass]`… */
export const esAtributoDeClases = (nombre: string) => /class(?:name)?\]?$/i.test(nombre);

const poneLaLlave = (nombre: string) => /^[A-Z]/.test(nombre) || /[-.:]/.test(nombre);

export interface OpcionesDeAvisos {
	/** Regla opcional `other-scale`: avisa las medidas válidas del DS que en otro framework valen otra cosa (`p-4`, `w-64`). Apagada por defecto. */
	otherScale?: boolean;
}

export function avisosEstructuradosDeMarkup(archivos: Iterable<ContentFile>, vocabulario: Vocabulario, opciones: OpcionesDeAvisos = {}): Aviso[] {
	const datos = datosDe(vocabulario);
	const vecinos = new Map<string, string | undefined>();
	return [...archivos].flatMap((f) => avisosDeArchivo(f, datos, vecinos, opciones));
}

export function avisosDeArchivo(f: ContentFile, datos: Datos, vecinos: Map<string, string | undefined>, opciones: OpcionesDeAvisos = {}): Aviso[] {
	const avisos: Aviso[] = [];
	const ext = /\.([A-Za-z0-9]+)$/.exec(f.file)?.[1].toLowerCase() ?? '';
	if (!MARKUP.has(ext)) return avisos;
	const texto = soloMarkup(f.file, f.content);
	const posicion = posicionesDe(texto);
	for (const m of texto.matchAll(/(?<=\s)(?:class|className)\s*=\s*(["'])([^"'{}$]*)\1/g)) {
		const tokens = m[2].split(/\s+/).filter(Boolean);
		if (tokens.length === 0 || tokens.some((t) => t.startsWith('ts-'))) continue;
		const etiqueta = etiquetaEn(texto, m.index);
		if (!etiqueta || poneLaLlave(etiqueta.nombre)) continue;
		const inicioValor = m.index + m[0].length - 1 - m[2].length;
		const bases = [...m[2].matchAll(/\S+/g)].map((t) => ({ token: t[0], pos: inicioValor + t.index, variante: t[0].slice(0, t[0].lastIndexOf(':') + 1), base: t[0].slice(t[0].lastIndexOf(':') + 1) }));

		if (!tokens.includes('ts')) {
			const conBase = bases.some((b) => datos.validos.has(b.base) && !esModificador(b.base));
			const delatores = [...new Set(bases.filter((b) => datos.inequivocos.has(b.base) && (conBase || !esModificador(b.base))).map((b) => b.base))];
			if (delatores.length === 0) continue;
			avisos.push({ file: f.file, ...posicion(m.index), rule: 'missing-ts', severity: 'error', code: 'missing-ts', params: { element: etiqueta.nombre, classes: delatores.slice(0, 3) } });
		}
		const basesDelElemento = new Set(bases.map((b) => b.base));
		for (const { token, pos, variante, base } of bases) {
			const duenos = datos.modificadoresPropios.get(base);
			if (duenos) {
				if (variante) avisos.push({ file: f.file, ...posicion(pos), rule: 'unknown-class', severity: 'error', code: 'modifier-with-variant', params: { class: token, modifier: base, utilities: [...duenos], suggestion: `${variante}${duenos[0]}` } });
				else if (!duenos.some((d) => basesDelElemento.has(d))) avisos.push({ file: f.file, ...posicion(pos), rule: 'unknown-class', severity: 'warning', code: 'orphan-modifier', params: { class: token, utilities: [...duenos] } });
				continue;
			}
			const hojas = variante ? datos.cadenasPropias.get(base) : undefined;
			if (hojas) {
				const uso = variante.slice(0, -1).split(':').map((x) => `${x}:`);
				const mala = validarCadena(uso, datos.prefijos).ok ? componerUso(uso, hojas, datos.prefijos).find((c) => !c.ok) : undefined;
				if (mala && !mala.ok) avisos.push({ file: f.file, ...posicion(pos), rule: 'unknown-class', severity: 'error', code: 'invalid-composition', params: datosComposicion(token, base, uso, mala) });
				continue;
			}
			if (opciones.otherScale && tokens.includes('ts') && datos.validos.has(base)) {
				const ajena = datos.escalaAjena(base);
				if (ajena) avisos.push({ file: f.file, ...posicion(pos), rule: 'other-scale', severity: 'warning', code: 'other-scale', params: { class: token, ...ajena } });
			}
			if (datos.validos.has(base) || /^(ts-|is-|has-|data-|aria-)/.test(base) || !/[a-z]/.test(base)) continue;
			if (/^!./.test(base) || /.!$/.test(base)) {
				const sucesor = `${variante}${base.replace(/^!|!$/g, '')}`;
				avisos.push({ file: f.file, ...posicion(pos), rule: 'unknown-class', severity: 'warning', code: 'important-class', params: { class: token, suggestion: sucesor }, suggestion: sucesor });
				continue;
			}
			const viejo = renombrar(`ts-${base}`)?.nuevo;
			if (viejo) {
				const sucesor = `${variante}${viejo.slice(3)}`;
				avisos.push({ file: f.file, ...posicion(pos), rule: 'unknown-class', severity: 'error', code: 'renamed-class', params: { class: token, suggestion: sucesor }, suggestion: sucesor });
				continue;
			}
			const palabraDeEscala = datos.raices.some((r) => base.startsWith(r) && RAIZ_DE_ESCALA.test(r) && /^[a-z]+$/.test(base.slice(r.length)));
			const enFamilia = palabraDeEscala || (/\d/.test(base) && datos.raices.some((r) => base.startsWith(r)));
			const cercano = base.length >= LARGO_MINIMO_VECINO && !esModificador(base) ? (vecinos.has(base) ? vecinos.get(base) : vecinos.set(base, vecino(base, datos.candidatos)).get(base)) : undefined;
			const deTailwind = datos.deTailwind().get(base) ?? equivocacionConocida(base, datos);
			const prefijoDelDS = base.includes('-') && [...datos.validos].some((n) => n.startsWith(`${base}-`));
			if (!enFamilia && !cercano && !deTailwind && !prefijoDelDS && !esModificador(base)) {
				const motivo = datos.sinEquivalente(base);
				if (motivo) avisos.push({ file: f.file, ...posicion(pos), rule: 'unknown-class', severity: 'warning', code: 'class-without-equivalent', params: { class: token, reason: motivo } });
				continue;
			}
			const sugerida = (cercano ?? deTailwind) && `${variante}${cercano ?? deTailwind}`;
			avisos.push({ file: f.file, ...posicion(pos), rule: 'unknown-class', severity: palabraDeEscala && !cercano && !deTailwind && !prefijoDelDS && !esModificador(base) ? 'warning' : 'error', code: 'unknown-class', params: { class: token, ...(sugerida && { suggestion: sugerida }) }, ...(sugerida && { suggestion: sugerida }) });
		}
	}
	for (const m of texto.matchAll(/(?<=\s)([A-Za-z_:@[][^\s=<>"'{}]*)\s*=\s*(["'])([^"'{}$]*)\2/g)) {
		if (esAtributoDeClases(m[1])) continue;
		const tokens = m[3].split(/\s+/).filter(Boolean);
		if (!tokens.includes('ts')) continue;
		const clases = tokens.filter((t) => t !== 'ts' && datos.validos.has(t.slice(t.lastIndexOf(':') + 1)));
		if (clases.length === 0) continue;
		avisos.push({ file: f.file, ...posicion(m.index), rule: 'ignored-attribute', severity: 'warning', code: 'ignored-attribute', params: { attribute: m[1], classes: clases.slice(0, 3) } });
	}
	return avisos;
}
