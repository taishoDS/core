// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { MODIFICADORES } from '../naming-table';
import type { IdiomaLlms } from './reglas';

export interface GuiaFicha {
	what: string;
	whenUse?: string[];
	whenAvoid?: string[];
	dos?: string[];
	donts?: string[];
	related?: string[];
}

export interface DatosFicha {
	slug: string;
	nombre: string;
	guia?: GuiaFicha;
	/** Las clases raíz del componente (`button`, `button-group`). */
	bloques: string[];
	/** Los atributos `data-ts-*` que el JS del Core lee. Vacío = no necesita JS. */
	atributos: string[];
	/** Por qué el componente usa (o no) el JS del Core. */
	nucleo?: string;
	teclado?: { keys: string; action: string }[];
	ejemplos: { titulo: string; html: string }[];
}

export interface OpcionesFicha {
	/** Cuántos ejemplos entran (todos por defecto). */
	maxEjemplos?: number;
	/** Nivel del título de la ficha (1 por defecto): las secciones van un nivel más abajo. */
	nivel?: number;
}

const TEXTOS = {
	es: {
		cuando: 'Cuándo usarlo', cuandoNo: 'Cuándo no usarlo', si: 'Sí', no: 'No', clases: 'Clases', raiz: 'Raíz', modificadores: 'Modificadores',
		js: 'JavaScript', sinJs: 'No necesita JavaScript.', conJs: 'Necesita el JavaScript del Core (`taisho.core.js`). Atributos:',
		teclado: 'Teclado', ejemplos: 'Ejemplos', relacionados: 'Relacionados',
	},
	en: {
		cuando: 'When to use it', cuandoNo: 'When not to use it', si: 'Do', no: "Don't", clases: 'Classes', raiz: 'Root', modificadores: 'Modifiers',
		js: 'JavaScript', sinJs: 'It needs no JavaScript.', conJs: 'It needs the Core JavaScript (`taisho.core.js`). Attributes:',
		teclado: 'Keyboard', ejemplos: 'Examples', relacionados: 'Related',
	},
} as const;

const PREFIJOS_MODIFICADOR = new RegExp(`^(?:${MODIFICADORES.prefijos.join('|')})-`);
const PALABRAS_MODIFICADOR: readonly string[] = MODIFICADORES.palabras;

/** Los modificadores (`variant-primary`, `size-md`…) que usan los ejemplos, sin repetir y en orden de aparición. */
function modificadoresDe(ejemplos: DatosFicha['ejemplos']): string[] {
	const vistos = new Set<string>();
	for (const { html } of ejemplos) {
		for (const atributo of html.matchAll(/\sclass="([^"]*)"/g)) {
			for (const clase of atributo[1].split(/\s+/)) {
				if (PREFIJOS_MODIFICADOR.test(clase) || PALABRAS_MODIFICADOR.includes(clase)) vistos.add(clase);
			}
		}
	}
	return [...vistos];
}

const lista = (items: readonly string[]) => items.map((i) => `- ${i}`).join('\n');
const codigos = (items: readonly string[]) => items.map((i) => `\`${i}\``).join(', ');

/** La ficha de un componente en Markdown. Pura: recibe los datos, no lee nada. */
export function fichaMarkdown(datos: DatosFicha, idioma: IdiomaLlms, opciones: OpcionesFicha = {}): string {
	const t = TEXTOS[idioma];
	const nivel = opciones.nivel ?? 1;
	const h = (n: number) => '#'.repeat(nivel + n);
	const { guia } = datos;
	const ejemplos = datos.ejemplos.slice(0, opciones.maxEjemplos ?? datos.ejemplos.length);
	const modificadores = modificadoresDe(datos.ejemplos);
	const secciones: string[] = [`${h(0)} ${datos.nombre}`];

	if (guia) secciones.push(guia.what);
	if (guia?.whenUse?.length) secciones.push(`${h(1)} ${t.cuando}\n\n${lista(guia.whenUse)}`);
	if (guia?.whenAvoid?.length) secciones.push(`${h(1)} ${t.cuandoNo}\n\n${lista(guia.whenAvoid)}`);
	if (guia?.dos?.length) secciones.push(`${h(1)} ${t.si}\n\n${lista(guia.dos)}`);
	if (guia?.donts?.length) secciones.push(`${h(1)} ${t.no}\n\n${lista(guia.donts)}`);

	const clases = [`${t.raiz}: ${codigos(datos.bloques.map((b) => `ts ${b}`))}`];
	if (modificadores.length) clases.push(`${t.modificadores}: ${codigos(modificadores)}`);
	secciones.push(`${h(1)} ${t.clases}\n\n${lista(clases)}`);

	const js = datos.atributos.length ? `${t.conJs} ${codigos(datos.atributos)}.` : t.sinJs;
	secciones.push(`${h(1)} ${t.js}\n\n${js}${datos.nucleo ? `\n\n${datos.nucleo}` : ''}`);

	if (datos.teclado?.length) secciones.push(`${h(1)} ${t.teclado}\n\n${lista(datos.teclado.map((k) => `\`${k.keys}\`: ${k.action}`))}`);
	if (guia?.related?.length) secciones.push(`${t.relacionados}: ${codigos(guia.related)}.`);

	if (ejemplos.length) {
		const bloques = ejemplos.map((e) => `${h(2)} ${e.titulo}\n\n\`\`\`html\n${e.html}\n\`\`\``);
		secciones.push(`${h(1)} ${t.ejemplos}\n\n${bloques.join('\n\n')}`);
	}
	return `${secciones.join('\n\n')}\n`;
}
