// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { aScope, clasesSinLlave, nombresCortosDe } from './llave-scope';

const cortos = new Set(['button', 'hidden', 'p-double', 'compact']);

describe('clasesSinLlave', () => {
    it('`button` sin `ts` es un hallazgo, con su línea', () => {
        expect(clasesSinLlave('<div>\n<button class="button">', cortos)).toEqual([{ clase: 'button', línea: 2 }]);
    });
    it('`ts button` no', () => {
        expect(clasesSinLlave('<button class="ts button">', cortos)).toEqual([]);
        expect(clasesSinLlave('<button class="button ts">', cortos)).toEqual([]);
    });
    it('la variante se quita: `md:hidden` sin `ts` es un hallazgo', () => {
        expect(clasesSinLlave('<p class="md:hidden">', cortos)).toEqual([{ clase: 'md:hidden', línea: 1 }]);
        expect(clasesSinLlave('<p class="@md:hidden 2xl:hidden">', cortos).map((h) => h.clase)).toEqual(['@md:hidden', '2xl:hidden']);
    });
    it('una utilidad propia, un modificador suelto o una clase ajena no cuentan', () => {
        expect(clasesSinLlave('<div class="card-hero">', cortos)).toEqual([]);
        expect(clasesSinLlave('<div class="is-active">', cortos)).toEqual([]);
        expect(clasesSinLlave('<div class="mi-clase md:card-hero">', cortos)).toEqual([]);
    });
    it('un `ts-*` en un class con la llave es un hallazgo, con la sugerencia', () => {
        expect(clasesSinLlave('<button class="ts ts-button">', cortos)).toEqual([
            { clase: 'ts-button', línea: 1, sugerencia: 'en scope no lleva `ts-`: `button`' },
        ]);
        expect(clasesSinLlave('<p class="ts md:ts-hidden">', cortos)[0].sugerencia).toBe('en scope no lleva `ts-`: `md:hidden`');
    });
    it('el contexto sin la llave también se marca', () => {
        expect(clasesSinLlave('<html class="compact">', cortos)).toHaveLength(1);
        expect(clasesSinLlave('<html class="ts compact">', cortos)).toEqual([]);
    });
});

describe('nombresCortosDe', () => {
    it('saca los nombres de las reglas y de las referencias anidadas; saltea las variantes', () => {
        const css = ':where(.ts).button { &.size-sm {} & :where(.ts).button-icon {} }\n  :where(.ts).md\\:hidden {}\n:where(.ts).w-1\\/4 {}';
        expect([...nombresCortosDe(css)].sort()).toEqual(['button', 'button-icon', 'w-1/4']);
    });
});

describe('nombresCortosDe', () => {
    it('el escape hex termina en el espacio: `\\32 xl\\:hidden` no produce el corto falso "32"', () => {
        const css = ':where(.ts).\\32 xl\\:hidden { display: none }\n:where(.ts).hidden { display: none }';
        const nombres = nombresCortosDe(css);
        expect(nombres.has('32')).toBe(false);
        expect(nombres.has('hidden')).toBe(true);
    });
});

describe('aScope', () => {
    it('agrega la llave y quita `ts-`; el modificador y la utilidad propia quedan', () => {
        expect(aScope('<button class="ts-button size-md variant-primary card-hero">')).toBe(
            '<button class="ts button size-md variant-primary card-hero">',
        );
    });
    it('respeta la variante: `md:ts-hidden` → `md:hidden`, `@md:ts-grid-cols-2` → `@md:grid-cols-2`', () => {
        expect(aScope('<p class="ts-flex md:ts-hidden @md:ts-grid-cols-2 2xl:ts-p-base">')).toBe(
            '<p class="ts flex md:hidden @md:grid-cols-2 2xl:p-base">',
        );
    });
    it('un class sin clases del DS no se toca, y el contexto `ts-compact` pasa a `compact`', () => {
        expect(aScope('<div class="mi-clase is-active"><section class="ts-compact">')).toBe(
            '<div class="mi-clase is-active"><section class="ts compact">',
        );
    });
    it('es la inversa de clasesSinLlave: lo que produce no tiene hallazgos', () => {
        const salida = aScope('<div class="ts-button md:ts-hidden ts-compact"><i class="ts-p-base"></i></div>');
        expect(clasesSinLlave(salida, new Set(['button', 'hidden', 'compact', 'p-base']))).toEqual([]);
    });
});
