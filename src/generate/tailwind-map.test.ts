// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { construirMapa, vigentesDe, medidaDeOtroFramework, TAILWIND_VERSION, type Fila } from './tailwind-map';
import { leerEmitidos } from './naming-emitidos';
import { escalasDe, validarAtomico } from './naming-table';
import { renombrar } from './naming-renames';
import { buildVocabularyColors } from '../config/scales';
import { userColors, userStates, userGridMins } from '../config/taisho.user';

const emitidos = leerEmitidos();
const vigentes = vigentesDe(emitidos.todos, emitidos.aliases);
const esc = escalasDe({ gridMins: Object.keys(userGridMins) });
const familias = Object.keys(buildVocabularyColors(userColors, userStates));
const mapa = construirMapa({ vigentes, esc, familias });
const clases = (f: string) => mapa.filas.find((r) => r.tailwind === f) as Fila;

describe('tabla Tailwind → TaishoDS', () => {
    it('la versión de Tailwind es la línea 4.x y sale en la tabla', () => {
        expect(TAILWIND_VERSION).toBe('4.x');
        expect(mapa.tailwind).toBe(TAILWIND_VERSION);
    });

    it('cada fila pasa validarAtomico, está emitida, no usa un nombre deprecado y su scope es la clase sin `ts-`', () => {
        expect(mapa.filas.length).toBeGreaterThan(500);
        for (const f of mapa.filas) {
            expect(validarAtomico(f.taisho, esc, familias), f.taisho).toEqual([]);
            expect(vigentes.has(f.taisho), `${f.taisho} emitida`).toBe(true);
            expect(renombrar(f.taisho), `${f.taisho} deprecada`).toBeNull();
            expect(f.scope).toBe(f.taisho.replace(/^ts-/, ''));
        }
    });

    it('no repite clases de Tailwind', () => {
        const vistas = mapa.filas.map((f) => f.tailwind);
        expect(new Set(vistas).size).toBe(vistas.length);
    });

    it('las medidas se arman por el px, no por el número: w-64 (16rem) ≠ ts-w-64', () => {
        expect(clases('w-16')).toMatchObject({ taisho: 'ts-w-64', px: 64, exacta: true });
        expect(clases('w-64')).toMatchObject({ taisho: 'ts-w-256', px: 256 });
        expect(clases('p-4')).toMatchObject({ taisho: 'ts-p-16', px: 16 });
        expect(mapa.unidades).toContain('ts-w-64 = 64px');
    });

    it('un lado físico de Tailwind pasa al lógico, con su nota', () => {
        expect(clases('pl-4')).toMatchObject({ taisho: 'ts-ps-16' });
        expect(clases('pl-4').nota).toMatch(/lógico/);
    });

    it('el nombre cambia donde el valor coincide con otra clave (blur, duración)', () => {
        expect(clases('blur-sm').taisho).toBe('ts-blur-md');
        expect(clases('duration-200').taisho).toBe('ts-duration-base');
    });

    it('lo fluido o con otro valor es aproximado, no exacto', () => {
        expect(clases('text-2xl').exacta).toBe(false);
        expect(clases('shadow-md').exacta).toBe(false);
    });

    it('text-* nunca es exacta: Tailwind fija también el interlineado', () => {
        for (const f of mapa.filas.filter((r) => r.tailwind.startsWith('text-') && r.familia === 'tamaño de texto')) expect(f.exacta, f.tailwind).toBe(false);
        expect(clases('text-sm').nota).toMatch(/interlineado/);
    });

    it('lo que mide distinto en computado no es exacto (medido en 3 motores con 4.3.3)', () => {
        for (const c of ['rounded-full', 'text-left', 'text-right', 'sr-only', 'font-sans', 'font-mono', 'w-1/3', 'w-2/3']) expect(clases(c).exacta, c).toBe(false);
    });

    it('las filas con equivalente real de los márgenes automáticos y el radio base', () => {
        expect(clases('mx-auto')).toMatchObject({ taisho: 'ts-mx-auto', exacta: true });
        expect(clases('m-auto')).toMatchObject({ taisho: 'ts-m-auto', exacta: true });
        expect(clases('my-auto')).toMatchObject({ taisho: 'ts-my-auto', exacta: true });
        expect(clases('rounded')).toMatchObject({ taisho: 'ts-radius-sm', exacta: true });
        expect(clases('flex-none')).toMatchObject({ taisho: 'ts-flex-none', exacta: true });
    });

    it('los márgenes negativos traducen a `neg-` con el lado lógico; lo que no está en la escala queda declarado', () => {
        expect(clases('-mx-2')).toMatchObject({ taisho: 'ts-mx-neg-8', exacta: true, px: 8 });
        expect(clases('-mt-4')).toMatchObject({ taisho: 'ts-mt-neg-16', exacta: true });
        expect(clases('-ml-4')).toMatchObject({ taisho: 'ts-ms-neg-16', exacta: true });
        expect(clases('-ml-4').nota).toMatch(/lado lógico/);
        expect(clases('-m-1')).toMatchObject({ taisho: 'ts-m-neg-4' });
        const motivoDe = (c: string) => mapa.sinEquivalente.find((s) => s.clases.includes(c))?.motivo ?? '';
        expect(clases('-mx-96')).toBeUndefined();
        expect(motivoDe('-mx-96')).toMatch(/no está en la escala de medidas/);
        expect(mapa.filas.filter((f) => f.tailwind.startsWith('-m')).length).toBeGreaterThan(100);
        expect(JSON.stringify(mapa)).not.toMatch(/no los emite/);
    });

    it('las clases comunes sin equivalente tienen motivo propio, no el genérico', () => {
        const motivoDe = (c: string) => mapa.sinEquivalente.find((s) => s.clases.includes(c))?.motivo ?? '';
        expect(motivoDe('gap-4')).toBe('');
        expect(clases('gap-4')).toMatchObject({ taisho: 'ts-gap-16', exacta: true });
        expect(motivoDe('border-0')).toMatch(/border-none/);
        expect(motivoDe('border-t')).toMatch(/un solo lado/);
        expect(motivoDe('bg-current')).toMatch(/background-100/);
        expect(motivoDe('text-inherit')).toMatch(/color-gray-1000/);
        for (const [t, d] of [['bg-white', 'ts-bg-white'], ['text-white', 'ts-color-white'], ['bg-black', 'ts-bg-black'], ['text-black', 'ts-color-black']]) {
            expect(motivoDe(t), t).toBe('');
            expect(clases(t), t).toMatchObject({ taisho: d, exacta: true });
        }
        expect(motivoDe('transition')).toMatch(/transition-colors/);
        expect(motivoDe('ring')).toMatch(/ring-1/);
        expect(motivoDe('ring-8')).toMatch(/1 a 4/);
        for (const c of ['border-2', 'border-4', 'ring-2', 'transition-colors', 'transition-all', 'transition-opacity', 'mt-auto', 'mb-auto', 'col-auto', 'col-start-auto', 'ms-auto', 'me-auto', 'ml-auto', 'mr-auto', 'outline-none']) {
            expect(motivoDe(c), c).toBe('');
            expect(clases(c), c).toBeDefined();
        }
    });

    it('lo que no tiene equivalente queda declarado con su motivo', () => {
        const motivoDe = (c: string) => mapa.sinEquivalente.find((s) => s.clases.includes(c))?.motivo ?? '';
        expect(motivoDe('p-[13px]')).toMatch(/arbitrarios/);
        expect(motivoDe('has-*:*')).toMatch(/lista cerrada/);
        expect(motivoDe('hover:*')).toBe('');
        expect(motivoDe('dark:*')).toMatch(/tema/);
        expect(motivoDe('text-3xl')).toMatch(/30px/);
        expect(mapa.filas.find((f) => f.tailwind === 'text-3xl')).toBeUndefined();
    });

    it('las variantes por pantalla tienen el mismo corte de los dos lados', () => {
        expect(mapa.variantes.map((v) => v.tailwind)).toEqual(['sm:', 'md:', 'lg:', 'xl:']);
    });

    it('los colores compartidos son el mismo nombre; la tabla avisa que no es el mismo valor', () => {
        expect(mapa.colores.familiasCompartidas).toContain('gray');
        expect(mapa.colores.prefijos).toContainEqual({ tailwind: 'text', taisho: 'color' });
        expect(mapa.colores.nota).toMatch(/color no/);
    });

    it('src/core-datos/tailwind-map.json está al día (si falla: npm run generate:tailwind-map)', () => {
        const disco = fs.readFileSync(path.join(process.cwd(), 'src/core-datos/tailwind-map.json'), 'utf8');
        expect(disco).toBe(JSON.stringify(mapa, null, 2) + '\n');
    });
});

describe('sinEquivalente contra el CSS que de verdad se emite', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/lib/css/taisho.full.css'), 'utf8');
    const emitidas = new Set([...css.matchAll(/:where\(\.ts\)\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]));
    const declaradas = mapa.sinEquivalente.flatMap((g) => g.clases.filter((c) => !c.includes(':')).map((clase) => ({ clase, motivo: g.motivo })));

    it('hay clases declaradas y un CSS completo contra el que cruzarlas', () => {
        expect(emitidas.size).toBeGreaterThan(3000);
        expect(declaradas.length).toBeGreaterThan(200);
    });

    it('ninguna clase declarada sin equivalente existe en el CSS emitido', () => {
        const existen = declaradas.filter(({ clase }) => (clase.endsWith('*') ? [...emitidas].some((e) => e.startsWith(clase.slice(0, -1))) : emitidas.has(clase)));
        // El mismo nombre con otro valor (p-28 son 112px en Tailwind y 28px acá; ease-out y blur-md también difieren): la tabla los
        // declara por valor, no por nombre, y el nombre sí existe. Todo lo demás declarado sin equivalente tiene que faltar en el CSS.
        const mismoNombreOtroValor = /escala de medidas|no hay clase en px|interlineado de \d+px|curva de easing|blur de \d+px/;
        expect(existen.filter((e) => !mismoNombreOtroValor.test(e.motivo)).map((e) => `${e.clase}: ${e.motivo}`)).toEqual([]);
    });
});

describe('medidaDeOtroFramework', () => {
    it('el número de una medida es un paso de 4px en el otro framework', () => {
        expect([medidaDeOtroFramework('p-4'), medidaDeOtroFramework('w-64'), medidaDeOtroFramework('gap-x-2'), medidaDeOtroFramework('min-h-96'), medidaDeOtroFramework('p-0.5')]).toEqual([16, 256, 8, 384, 2]);
    });
    it('nada para lo que no es un paso de su escala ni una medida, ni para lo que vale lo mismo', () => {
        expect([medidaDeOtroFramework('p-0'), medidaDeOtroFramework('p-px'), medidaDeOtroFramework('p-13'), medidaDeOtroFramework('p-base'), medidaDeOtroFramework('z-10'), medidaDeOtroFramework('w-1/2')]).toEqual([null, null, null, null, null, null]);
    });
});
