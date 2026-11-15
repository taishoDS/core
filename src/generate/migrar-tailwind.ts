// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { screens as screensDelCore } from '../config/scales';
import type { MapaTailwind } from './tailwind-map';
import type { MotivoTailwind, NotaTailwind } from './avisos-tipos';
import { tablaPrefijos, validarCadena } from './variantes';

export interface Convertida {
    origen: string;
    scope: string;
    taisho: string;
    exacta: boolean;
    notas?: NotaTailwind[];
}

export type TipoNoConvertida = 'variant' | 'chain' | 'base' | 'component' | 'important';

export interface NoConvertida {
    origen: string;
    tipo: TipoNoConvertida;
    motivo: MotivoTailwind;
}

export interface ResultadoTailwind {
    convertidas: Convertida[];
    noConvertidas: NoConvertida[];
}

export interface OpcionesTailwind {
    mapa: MapaTailwind;
    screens?: Record<string, string>;
    esComponente?: (base: string) => boolean;
}

const SIN_VARIANTE: Array<[RegExp, 'dark-variant' | 'has-variant' | 'not-variant' | 'structural-variant' | 'focus-within-variant' | 'motion-variant' | 'supports-variant']> = [
    [/^dark$/, 'dark-variant'],
    [/^(has|group-has|peer-has)-/, 'has-variant'],
    [/^(not|group-not|peer-not)-/, 'not-variant'],
    [/^(first|last|only|odd|even|first-of-type|last-of-type)$/, 'structural-variant'],
    [/^(group-|peer-)?focus-within$/, 'focus-within-variant'],
    [/^motion-(safe|reduce)$/, 'motion-variant'],
    [/^supports-/, 'supports-variant'],
];

const CORTE = /^(max-)?(\d*xl|sm|md|lg)$/;

export function partir(clase: string): string[] {
    const partes: string[] = [];
    let profundidad = 0;
    let desde = 0;
    for (let i = 0; i < clase.length; i++) {
        const c = clase[i];
        if (c === '[' || c === '(') profundidad++;
        else if (c === ']' || c === ')') profundidad--;
        else if (c === ':' && profundidad === 0) {
            partes.push(clase.slice(desde, i));
            desde = i + 1;
        }
    }
    partes.push(clase.slice(desde));
    return partes;
}

const MARCADOR = /^(group|peer)(\/[a-z][a-z0-9-]*)?$/;

export function crearTraductorTailwind(opciones: OpcionesTailwind): (clase: string) => Convertida | NoConvertida {
    const { mapa, esComponente } = opciones;
    const tabla = tablaPrefijos(opciones.screens ?? screensDelCore);
    const filas = new Map(mapa.filas.map((f) => [f.tailwind, f]));
    const prefijosColor = new Map(mapa.colores.prefijos.map((p) => [p.tailwind, p]));
    const familias = new Set(mapa.colores.familiasCompartidas);
    const escalones = new Set(mapa.colores.escalonesCompartidos);
    const motivos = new Map(mapa.sinEquivalente.flatMap((g) => g.clases.map((c): [string, string] => [c, g.motivo])));
    const motivosPrefijo = [...motivos].filter(([c]) => /^[a-z-]+-\*$/.test(c)).map(([c, m]): [string, string] => [c.slice(0, -1), m]);

    const nota = (note: string | undefined): NotaTailwind[] => (note ? [{ code: 'map-note', params: { note } }] : []);

    function base(b: string): { scope: string; exacta: boolean; notas: NotaTailwind[] } | undefined {
        const fila = filas.get(b);
        if (fila) return { scope: fila.scope, exacta: fila.exacta, notas: nota(fila.nota) };
        const c = /^(bg|text|border|ring)-(.+)-(\d+)$/.exec(b);
        if (c && familias.has(c[2]) && escalones.has(c[3])) {
            const p = prefijosColor.get(c[1]) as { taisho: string; nota?: string };
            return { scope: `${p.taisho}-${c[2]}-${c[3]}`, exacta: false, notas: [...nota(mapa.colores.nota), ...nota(p.nota)] };
        }
        return undefined;
    }

    function motivoSin(b: string): MotivoTailwind {
        const c = /^(?:bg|text|border|ring)-(.+)-(\d+)(\/\d+)?$/.exec(b);
        if (c && c[3]) return { code: 'opacity-modifier', params: { class: b, opacity: c[3] } };
        if (c && mapa.colores.familiasSoloTailwind.includes(c[1])) return { code: 'color-family-missing', params: { family: c[1] } };
        if (c && familias.has(c[1])) return { code: 'color-step-missing', params: { step: c[2], family: c[1], steps: [...mapa.colores.escalonesCompartidos] } };
        if (b.includes('[')) return { code: 'arbitrary-value', params: { class: b } };
        const propio = motivos.get(b) ?? motivosPrefijo.find(([prefijo]) => b.startsWith(prefijo))?.[1];
        return propio ? { code: 'no-equivalent', params: { class: b, reason: propio } } : { code: 'not-in-map', params: { class: b } };
    }

    function variante(v: string): { prefijo: string } | { motivo: MotivoTailwind } {
        if (v.includes('[')) return { motivo: { code: 'arbitrary-variant', params: { variant: v } } };
        for (const [re, code] of SIN_VARIANTE) if (re.test(v)) return { motivo: { code, params: {} } };
        if (/^data-ts-/.test(v)) return { motivo: { code: 'data-ts-variant', params: {} } };
        const prefijo = `${v}:`;
        if (validarCadena([prefijo], tabla).ok) return { prefijo };
        if (CORTE.test(v)) return { motivo: { code: 'breakpoint-missing', params: { variant: v } } };
        return { motivo: { code: 'unknown-variant', params: { variant: v } } };
    }

    return (clase) => {
        const partes = partir(clase);
        const b = partes.at(-1) as string;
        const no = (tipo: TipoNoConvertida, motivo: MotivoTailwind): NoConvertida => ({ origen: clase, tipo, motivo });

        if (b.startsWith('!') || b.endsWith('!')) return no('important', { code: 'important', params: {} });

        const prefijos: string[] = [];
        for (const v of partes.slice(0, -1)) {
            const r = variante(v);
            if ('motivo' in r) return no('variant', r.motivo);
            prefijos.push(r.prefijo);
        }

        let destino: { scope: string; exacta: boolean; notas: NotaTailwind[] } | undefined;
        if (MARCADOR.test(b)) destino = { scope: b, exacta: true, notas: [] };
        else if (b === '@container') destino = { scope: 'cq', exacta: true, notas: [] };
        else destino = base(b);
        if (!destino) {
            if (esComponente?.(b)) return no('component', { code: 'component-variant', params: { class: b } });
            return no('base', motivoSin(b));
        }
        if (prefijos.length && (MARCADOR.test(b) || b === '@container')) return no('base', { code: 'marker-with-variants', params: { class: b } });

        let cadena = prefijos;
        if (prefijos.length) {
            const c = validarCadena(prefijos, tabla);
            if (!c.ok) {
                if (c.motivo === 'orden' && c.canonica) cadena = c.canonica;
                else return no('chain', { code: 'invalid-chain', params: { chain: `${partes.slice(0, -1).join(':')}:` } });
            }
        }

        const notas = [...destino.notas];
        if (cadena.includes('disabled:')) notas.push({ code: 'disabled-wider', params: {} });
        const lleva = cadena.join('');
        return {
            origen: clase,
            scope: `${lleva}${destino.scope}`,
            taisho: `${lleva}${MARCADOR.test(b) ? b : `ts-${destino.scope}`}`,
            exacta: destino.exacta,
            ...(notas.length ? { notas } : {}),
        };
    };
}

export function migrarClasesTailwind(clases: readonly string[], opciones: OpcionesTailwind): ResultadoTailwind {
    const traducir = crearTraductorTailwind(opciones);
    const resultado: ResultadoTailwind = { convertidas: [], noConvertidas: [] };
    for (const c of clases) {
        const r = traducir(c);
        if ('tipo' in r) resultado.noConvertidas.push(r);
        else resultado.convertidas.push(r);
    }
    return resultado;
}
