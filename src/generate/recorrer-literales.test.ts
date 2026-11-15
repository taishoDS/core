// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, expect, it } from 'vitest';
import { recorrerLiterales, type ContextoLiteral, type ContextoToken, type PoliticaLiterales } from './recorrer-literales';

const TOKEN = /(?<![^\s"'`([,>])((?:[a-z]+:)*)(x-[a-z]+)(?![A-Za-z0-9_-])(?!\$\{)/g;

function correr(texto: string, over: Partial<PoliticaLiterales> = {}) {
    const literales: ContextoLiteral[] = [];
    const tokens: ContextoToken[] = [];
    const saltos = [...texto.matchAll(/\n/g)].map((m) => m.index!);
    const r = recorrerLiterales(texto, {
        tokenizador: TOKEN,
        reconoce: () => true,
        protegido: () => false,
        lineaDe: (pos) => saltos.filter((s) => s < pos).length + 1,
        politica: (c) => (literales.push(c), { convertir: true, llave: false, heredaLlave: false }),
        token: (c) => (tokens.push(c), `${c.variante}${c.nombre.slice(2)}`),
        ...over,
    });
    return { ...r, literales, tokens };
}

describe('recorrerLiterales', () => {
    it('reescribe class="…" y strings de JS con la conversión por token', () => {
        expect(correr(`<a class="x-a md:x-b"></a>\nconst s = 'x-c';`).texto).toBe(`<a class="a md:b"></a>\nconst s = 'c';`);
    });

    it('tokenizador: sólo ve lo que su regex reconoce', () => {
        const t = correr(`<a class="y-a x-b">`, { tokenizador: /(?<![^\s"'`([,>])()(y-[a-z]+)(?![A-Za-z0-9_-])/g, token: (c) => c.nombre.slice(2) });
        expect(t.texto).toBe(`<a class="a x-b">`);
    });

    it('literal: regex propio de qué es un literal', () => {
        const t = correr(`<a data-c="x-a" class="x-b">`, { literal: /\bdata-c\s*=\s*("[^"]*")/g });
        expect(t.texto).toBe(`<a data-c="a" class="x-b">`);
    });

    it('reconoce: define los conocidos que ve la política, y los demás tokens se reportan igual', () => {
        const t = correr(`<a class="x-a x-b">`, { reconoce: (m) => m[2] === 'x-a' });
        expect(t.literales[0].conocidos.map((m) => m[2])).toEqual(['x-a']);
        expect(t.literales[0].tokens).toHaveLength(2);
    });

    it('protegido: una posición protegida deja el literal intacto', () => {
        const texto = `<a class="x-a"> <b class="x-b">`;
        const t = correr(texto, { protegido: (abs) => abs < texto.indexOf('<b') });
        expect(t.texto).toBe(`<a class="x-a"> <b class="b">`);
    });

    it('politica.convertir=false: el literal queda tal cual, también por dentro', () => {
        const t = correr('<a class="x-a {x ? \'x-b\' : \'\'}">', { politica: (c) => ({ convertir: !c.esAtributo, llave: false, heredaLlave: false }) });
        expect(t.texto).toBe('<a class="x-a {x ? \'x-b\' : \'\'}">');
    });

    it('politica.dentro: el contenido es código; no se parte en tokens y se recorren sus strings', () => {
        const t = correr(`<a :c="['x-a', 'x-b']">`, { politica: (c) => ({ convertir: true, llave: false, heredaLlave: false, dentro: c.contenido.startsWith('[') }) });
        expect(t.texto).toBe(`<a :c="['a', 'b']">`);
    });

    it('politica.llave: pone `ts ` en el primer token convertido y cuenta una por literal', () => {
        const t = correr(`<a class="x-a x-b"></a><b class="x-c"></b>`, { politica: () => ({ convertir: true, llave: true, heredaLlave: false }) });
        expect(t.texto).toBe(`<a class="ts a b"></a><b class="ts c"></b>`);
        expect(t.llaves).toBe(2);
    });

    it('token devuelve null: no se convierte, y no gasta la llave', () => {
        const t = correr(`<a class="x-a x-b">`, { politica: () => ({ convertir: true, llave: true, heredaLlave: false }), token: (c) => (c.nombre === 'x-a' ? null : c.nombre.slice(2)) });
        expect(t.texto).toBe(`<a class="x-a ts b">`);
        expect(t.llaves).toBe(1);
    });

    it('politica.heredaLlave: la expresión interna ve llaveDelContenedor', () => {
        const vistos: boolean[] = [];
        correr('<a class="x-a {x ? \'x-b\' : \'\'}">', {
            politica: (c) => (vistos.push(c.llaveDelContenedor), { convertir: true, llave: false, heredaLlave: true }),
        });
        expect(vistos).toEqual([false, true, true]);
        const sin: boolean[] = [];
        correr('<a class="x-a {x ? \'x-b\' : \'\'}">', { politica: (c) => (sin.push(c.llaveDelContenedor), { convertir: true, llave: false, heredaLlave: false }) });
        expect(sin).toEqual([false, false, false]);
    });

    it('contexto: tieneLlave detecta el token `ts` suelto (H5), no `tsx`', () => {
        expect(correr(`<a class="ts x-a">`).literales[0].tieneLlave).toBe(true);
        expect(correr(`<a class="tsx x-a">`).literales[0].tieneLlave).toBe(false);
    });

    it('contexto: etiqueta con mayúscula es componente; minúscula no', () => {
        expect(correr(`<Button class="x-a">`).literales[0].enComponente).toBe(true);
        expect(correr(`<button class="x-a">`).literales[0].enComponente).toBe(false);
        expect(correr(`const s = 'x-a';`).literales[0].etiqueta).toBeNull();
    });

    it('contexto: classList.* y prefijo/esAtributo', () => {
        const t = correr(`el.classList.toggle('x-a'); <a class="x-b">`);
        expect(t.literales[0].classList?.[1]).toBe('toggle');
        expect(t.literales[0].esAtributo).toBe(false);
        expect(t.literales[1].classList).toBeNull();
        expect(t.literales[1].prefijo).toBe('class=');
    });

    it('template literal: expresiones `${…}` recorridas aparte; token pegado se avisa', () => {
        const t = correr('const s = `x-a ${cond ? "x-b" : ""} x-c${n}`;');
        expect(t.texto).toBe('const s = `a ${cond ? "b" : ""} c${n}`;');
        const pegados = t.tokens.filter((k) => k.pegado).map((k) => k.nombre);
        expect(pegados).toEqual(['x-c']);
    });

    it('token: posición absoluta y línea', () => {
        const t = correr(`\n\n<a class="x-a">`);
        expect(t.tokens[0].línea).toBe(3);
        expect(t.tokens[0].pos).toBe(`\n\n<a class="`.length);
    });

    it('HTML dentro de un string: cada class es su propio literal', () => {
        const t = correr('const code = `<div class="x-a">`;');
        expect(t.texto).toBe('const code = `<div class="a">`;');
    });

    it('llaves sin cerrar: el literal no se toca ni se consulta a la política', () => {
        const t = correr(`<a class="x-a {oops">`);
        expect(t.texto).toBe(`<a class="x-a {oops">`);
        expect(t.literales).toHaveLength(0);
    });

});
