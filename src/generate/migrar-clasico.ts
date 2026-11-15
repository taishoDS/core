// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { buildVocabularyColors } from '../config/scales';
import { userColors as colorsDelDS, defaultStates as statesDelDS } from '../config/taisho.user';
import { buildAtomicCSS } from './emit-atomic';
import { buildComponentsCSS } from './emit-components';
import { buildUtilitiesCSS } from './emit-utilities';
import { parseUtilities } from './emit-flat';
import type { TaishoExtensions } from './extension';
import { cssDeExtensiones } from './registro';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { aliasDe, enRegion, esProductor, mapaDeTabla, migrarTexto, regionesExcluidas, renombrar, tablaRenombres, type Renombre } from './naming-renames';
import { esComponente, etiquetaEn } from './llave-scope';
import { recorrerLiterales } from './recorrer-literales';

export interface VocabularioClasico {
    nombres: ReadonlySet<string>;
    mapa: ReadonlyMap<string, Renombre>;
}

export function vocabularioClasico(config: TaishoConfig, extensiones: TaishoExtensions = {}): VocabularioClasico {
    const derivado = deriveThemeVocabulary(config, extensiones);
    const { userGridMins, userScales } = derivado;
    const userColors = { ...colorsDelDS, ...derivado.userColors };
    const userStates = { ...statesDelDS, ...derivado.userStates };
    const atomic = buildAtomicCSS(buildVocabularyColors(userColors, userStates), userGridMins, userScales);
    const extra = cssDeExtensiones(extensiones);
    const utilities = buildUtilitiesCSS(userScales) + extra.utilities;
    const components = buildComponentsCSS(userColors, userStates, userScales) + extra.components;
    const emitidos = [atomic, utilities, components].flatMap((css) => parseUtilities(css).map((b) => b.name.replaceAll('\\', '')));
    const alias = aliasDe([atomic, utilities, components].flatMap((css) => parseUtilities(css).map((b) => b.name)));
    const nombres = new Set<string>();
    for (const n of emitidos) if (!renombrar(n)) nombres.add(n);
    for (const nuevo of alias.values()) nombres.add(nuevo);
    for (const css of [atomic, utilities, components]) for (const m of css.matchAll(/\.(ts-[A-Za-z0-9_-]+)/g)) if (!renombrar(m[1])) nombres.add(m[1]);
    nombres.add('ts-compact');
    return { nombres, mapa: mapaDeTabla(tablaRenombres(emitidos)) };
}

export type TipoNoConvertido =
    | 'fragment'
    | 'apply'
    | 'selector'
    | 'missing-ts'
    | 'classlist'
    | 'no-replacement'
    | 'possible-class'
    | 'unknown-class'
    | 'outside-string';

export interface NoConvertido {
    línea: number;
    token: string;
    tipo: TipoNoConvertido;
}

export interface ResultadoMigracion {
    texto: string;
    convertidos: number;
    renombres: number;
    llaves: number;
    noConvertidos: NoConvertido[];
}

export interface OpcionesMigracion {
    vocabulario: VocabularioClasico;
    esCss?: boolean;
}

const TOKEN = /(?<![^\s"'`([,>])((?:@?[a-z0-9-]+:)*)(ts-[A-Za-z0-9/-]*[A-Za-z0-9])(?![A-Za-z0-9_/-])(?!\$\{)/g;

const rangosStyle = (texto: string): Array<[number, number]> => {
    const rangos: Array<[number, number]> = [];
    for (const m of texto.matchAll(/<!--[\s\S]*?(?:-->|$)|<script\b[^>]*>[\s\S]*?(?:<\/script>|$)|<style\b[^>]*>[\s\S]*?<\/style>/g)) {
        if (m[0].startsWith('<style')) rangos.push([m.index!, m.index! + m[0].length]);
    }
    return rangos;
};

export function migrarAScope(entrada: string, { vocabulario, esCss = false }: OpcionesMigracion): ResultadoMigracion {
    const { nombres } = vocabulario;
    const noConvertidos: NoConvertido[] = [];
    const visto = new Set<string>();
    const marcar = (línea: number, token: string, tipo: TipoNoConvertido) => {
        const clave = `${línea}:${token}:${tipo}`;
        if (visto.has(clave)) return;
        visto.add(clave);
        noConvertidos.push({ línea, token, tipo });
    };

    const renombrado = migrarTexto(entrada, vocabulario.mapa);
    const t1 = renombrado.texto;
    for (const s of renombrado.sinSucesor) marcar(s.linea, s.viejo, 'no-replacement');
    for (const p of renombrado.posibles) marcar(p.linea, p.token, 'possible-class');

    const saltos: number[] = [];
    for (let i = t1.indexOf('\n'); i >= 0; i = t1.indexOf('\n', i + 1)) saltos.push(i);
    const lineaDe = (pos: number) => {
        let a = 0;
        let b = saltos.length;
        while (a < b) {
            const m = (a + b) >> 1;
            if (saltos[m] < pos) a = m + 1;
            else b = m;
        }
        return a + 1;
    };

    const regiones = regionesExcluidas(t1);
    const css: Array<[number, number]> = esCss ? [[0, t1.length]] : rangosStyle(t1);
    const protegido = (pos: number) => enRegion(regiones, pos) || enRegion(css, pos);

    let convertidos = 0;

    const recorrido = esCss
        ? { texto: t1, llaves: 0 }
        : recorrerLiterales(t1, {
              tokenizador: TOKEN,
              reconoce: (m) => nombres.has(m[2]),
              protegido,
              lineaDe,
              politica: (c) => {
                  if (c.classList && c.conocidos.length && /classList\.(add|toggle|replace)/.test(c.classList[0])) marcar(lineaDe(c.abs), c.conocidos[0][0], 'classlist');
                  return {
                      convertir: true,
                      llave: !c.tieneLlave && !c.llaveDelContenedor && !c.enComponente && !c.classList && c.conocidos.length > 0,
                      heredaLlave: c.llaveDelContenedor || c.tieneLlave || c.conocidos.length > 0 || c.enComponente,
                  };
              },
              token: ({ token, variante, nombre, pos, línea, pegado, literal }) => {
                  if (!nombres.has(nombre)) {
                      if (!renombrar(nombre) && (literal.conocidos.length > 0 || literal.esAtributo)) marcar(línea, token, 'unknown-class');
                      return null;
                  }
                  if (enRegion(regiones, pos) || esProductor(t1, pos)) return null;
                  if (pegado) return null;
                  convertidos++;
                  return `${variante}${nombre.slice(3)}`;
              },
          });
    let texto = recorrido.texto;

    texto = texto.replace(/(?<![A-Za-z0-9_-])class:(ts-[A-Za-z0-9-]*[A-Za-z0-9])(?![A-Za-z0-9_-])/g, (m: string, nombre: string, i: number) => {
        if (!nombres.has(nombre) || protegido(i)) return m;
        const linea = lineaDe(i);
        convertidos++;
        const etiqueta = etiquetaEn(texto, i);
        if (etiqueta && !esComponente(etiqueta.nombre)) {
            const sinDirectivas = texto.slice(etiqueta.desde, etiqueta.hasta).replace(/class:[^\s=>/]+/g, '');
            if (!/(?<![\w:.-])ts(?![\w:-])/.test(sinDirectivas)) marcar(linea, `class:${nombre.slice(3)}`, 'missing-ts');
        }
        return `class:${nombre.slice(3)}`;
    });

    const prefijosDelDS = [...nombres];
    for (const m of texto.matchAll(/(?<![A-Za-z0-9_-])ts-[A-Za-z0-9-]*/g)) {
        const token = m[0];
        const i = m.index!;
        if (texto[i - 1] === '#') continue;
        if (enRegion(regiones, i) || esProductor(texto, i)) continue;
        const linea = lineaDe(i);
        const siguiente = texto.slice(i + token.length, i + token.length + 2);
        if (siguiente === '${') {
            const contexto = texto.slice(Math.max(0, i - 40), i);
            if (/\b(?:id|for|name|href|aria-[a-z]+|htmlFor)\s*[=:]\s*["'`{]?\s*$/i.test(contexto) || /\b[A-Za-z]*[iI]d\s*=\s*[`"']$/.test(contexto)) continue;
            if (prefijosDelDS.some((n) => n.startsWith(token))) marcar(linea, `${token}\${`, 'fragment');
            continue;
        }
        if (token.endsWith('-') || !nombres.has(token)) continue;
        if (renombrar(token)) continue;
        const antes = texto[i - 1];
        const entorno = texto.slice(Math.max(0, texto.lastIndexOf(';', i), texto.lastIndexOf('{', i), texto.lastIndexOf('}', i)), i);
        let tipo: TipoNoConvertido;
        if (/@apply\b/.test(entorno)) tipo = 'apply';
        else if (antes === '.' || /\\:$/.test(texto.slice(Math.max(0, i - 2), i))) tipo = 'selector';
        else if (antes === '}') tipo = 'fragment';
        else tipo = enRegion(css, i) ? 'selector' : 'outside-string';
        marcar(linea, token, tipo);
    }

    noConvertidos.sort((a, b) => a.línea - b.línea || a.token.localeCompare(b.token));
    return { texto, convertidos, renombres: renombrado.cambios.length, llaves: recorrido.llaves, noConvertidos };
}
