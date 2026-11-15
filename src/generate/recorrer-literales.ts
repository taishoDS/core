// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { esComponente, etiquetaEn, type Etiqueta } from './llave-scope';

export const LITERAL = /\bclass\s*=\s*("[^"]*"|'[^']*')|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

export interface ContextoLiteral {
    fuente: string;
    abs: number;
    prefijo: string;
    esAtributo: boolean;
    comilla: string;
    contenido: string;
    estaticas: string[];
    tieneLlave: boolean;
    conocidos: RegExpMatchArray[];
    tokens: RegExpMatchArray[];
    etiqueta: Etiqueta | null;
    enComponente: boolean;
    classList: RegExpExecArray | null;
    llaveDelContenedor: boolean;
}

export interface DecisionLiteral {
    convertir: boolean;
    llave: boolean;
    heredaLlave: boolean;
    dentro?: boolean;
}

export interface ContextoToken {
    token: string;
    variante: string;
    nombre: string;
    pos: number;
    línea: number;
    pegado: boolean;
    literal: ContextoLiteral;
}

export interface PoliticaLiterales {
    literal?: RegExp;
    tokenizador: RegExp;
    reconoce: (m: RegExpMatchArray) => boolean;
    protegido: (abs: number) => boolean;
    politica: (c: ContextoLiteral) => DecisionLiteral;
    token: (c: ContextoToken) => string | null;
    lineaDe: (pos: number) => number;
}

export interface ResultadoRecorrido {
    texto: string;
    llaves: number;
}

const CLASSLIST = /classList\.(add|remove|toggle|contains|replace)\(\s*(?:[^()]*,\s*)?$/;

export function recorrerLiterales(entrada: string, p: PoliticaLiterales): ResultadoRecorrido {
    const literales = p.literal ?? LITERAL;
    let llaves = 0;

    function convertir(texto: string, base: number, llaveDelContenedor: boolean): string {
        return texto.replace(literales, (lit: string, _attr: string | undefined, _s: string | undefined, indice: number) => {
            const prefijo = lit.slice(0, lit.search(/["'`]/));
            const abs = base + indice + prefijo.length;
            if (p.protegido(abs)) return lit;
            const comilla = lit[prefijo.length];
            const contenido = lit.slice(prefijo.length + 1, -1);
            const inicio = abs + 1;
            const esAtributo = prefijo !== '';

            if (!esAtributo && /<[A-Za-z][^>]*\bclass\s*=\s*["'{]/.test(contenido)) return `${comilla}${convertir(contenido, inicio, llaveDelContenedor)}${comilla}`;

            const abre = esAtributo ? '{' : comilla === '`' ? '${' : null;
            const partes: Array<{ texto: string; desde: number; expresion: boolean }> = [];
            let desde = 0;
            while (abre) {
                const i = contenido.indexOf(abre, desde);
                if (i < 0) break;
                let profundidad = 1;
                let k = i + abre.length;
                for (; k < contenido.length && profundidad > 0; k++) {
                    if (contenido[k] === '{') profundidad++;
                    else if (contenido[k] === '}') profundidad--;
                }
                if (profundidad > 0) return lit;
                partes.push({ texto: contenido.slice(desde, i), desde, expresion: false });
                partes.push({ texto: contenido.slice(i + abre.length, k - 1), desde: i + abre.length, expresion: true });
                desde = k;
            }
            partes.push({ texto: contenido.slice(desde), desde, expresion: false });

            const estaticas = partes.filter((x) => !x.expresion).map((x) => x.texto);
            const tokens = estaticas.flatMap((t) => [...t.matchAll(p.tokenizador)]);
            const etiqueta = etiquetaEn(entrada, abs);
            const ctx: ContextoLiteral = {
                fuente: entrada,
                abs,
                prefijo,
                esAtributo,
                comilla,
                contenido,
                estaticas,
                tieneLlave: estaticas.some((t) => /(?:^|\s)ts(?:\s|$)/.test(t)),
                conocidos: tokens.filter(p.reconoce),
                tokens,
                etiqueta,
                enComponente: !!etiqueta && esComponente(etiqueta.nombre),
                classList: CLASSLIST.exec(entrada.slice(Math.max(0, abs - 80), abs)),
                llaveDelContenedor,
            };
            const decision = p.politica(ctx);
            if (!decision.convertir) return lit;
            if (decision.dentro) return `${prefijo}${comilla}${convertir(contenido, inicio, decision.heredaLlave)}${comilla}`;

            let primero = true;
            const salida = partes.map((x) => {
                const pos = inicio + x.desde;
                if (x.expresion) return convertir(x.texto, pos, decision.heredaLlave);
                const antes = x.desde > 0;
                const despues = x.desde + x.texto.length < contenido.length;
                return x.texto.replace(p.tokenizador, (token: string, variante: string, nombre: string, i: number) => {
                    const pegado = (antes && i === 0) || (despues && i + token.length === x.texto.length);
                    const nuevo = p.token({ token, variante, nombre, pos: pos + i, línea: p.lineaDe(pos + i), pegado, literal: ctx });
                    if (nuevo === null) return token;
                    const llave = decision.llave && primero ? 'ts ' : '';
                    if (llave) llaves++;
                    primero = false;
                    return `${llave}${nuevo}`;
                });
            });
            let rearmado = '';
            partes.forEach((x, n) => {
                if (x.expresion) rearmado += `${abre}${salida[n]}}`;
                else rearmado += salida[n];
            });
            return `${prefijo}${comilla}${rearmado}${comilla}`;
        });
    }

    const texto = convertir(entrada, 0, false);
    return { texto, llaves };
}
