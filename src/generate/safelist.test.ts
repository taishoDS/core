// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { compile, type ContentFile } from './compile';
import { nombresCortosDe } from './llave-scope';
import { buildRepoConfig } from '../config/pipeline';
import type { TaishoConfig } from './vocabulary';

const RAIZ = path.resolve(__dirname, '../..');
const config: TaishoConfig = buildRepoConfig();
const f = (content: string, file = 'a.html'): ContentFile => ({ file, content });
const demanda = (cfg: TaishoConfig, contenido = '', extra: Partial<TaishoConfig> = {}) =>
    compile({ ...cfg, ...extra }, contenido ? [f(contenido)] : [], { onDemand: true });

const tiene = (css: string, clase: string) =>
    new RegExp(`\\.${clase.replace(/[/.:@]/g, '\\\\$&')}(?![A-Za-z0-9_-])`).test(css);

describe('safelist: clases y familias', () => {
    it('nombre exacto, con y sin variante', () => {
        const css = demanda(config, '', { safelist: ['flex', 'md:grid-cols-3'] }).css;
        expect(tiene(css, 'flex')).toBe(true);
        expect(css).toContain(':where(.ts).md\\:grid-cols-3 {');
        expect(tiene(css, 'grid-cols-3')).toBe(false);
    });
    it('familia `*`: expande a las clases que existen', () => {
        const css = demanda(config, '', { safelist: ['grid-cols-*'] }).css;
        expect(tiene(css, 'grid-cols-1')).toBe(true);
        expect(tiene(css, 'grid-cols-12')).toBe(true);
        expect(tiene(css, 'flex')).toBe(false);
    });
    it('familia con variante: md:gap-*', () => {
        const css = demanda(config, '', { safelist: ['md:gap-*'] }).css;
        expect(css).toContain(':where(.ts).md\\:gap-');
        expect(css).toContain('@media (width >= 48rem)');
        expect(tiene(css, 'gap-base')).toBe(false);
    });
    it('container query en el safelist', () => {
        expect(demanda(config, '', { safelist: ['@md:grid-cols-2'] }).css).toContain('@container (width >= 28rem)');
    });
    it('una utilidad propia entra por nombre y por familia', () => {
        const cfg: TaishoConfig = { ...config, utilities: { 'card-hero': ['p-double'], 'card-flat': ['p-half'] } };
        const css = demanda(cfg, '', { safelist: ['card-hero', 'md:card-*'] }).css;
        expect(css).toContain('.card-hero {');
        expect(css).toContain('.md\\:card-flat {');
    });
    it('sin `content` (modo completo) el safelist no cambia la salida', () => {
        const r = compile({ ...config, safelist: ['md:gap-*', 'toast'] }, []);
        expect(r.css).toBe(compile(config, []).css);
    });
});

describe('componentes enteros', () => {
    const bloqueDe = (css: string, bloque: string) => tiene(css, bloque);
    it('entran por una clase literal de cualquiera de sus bloques', () => {
        const css = demanda(config, '<div class="ts accordion-item">').css;
        for (const b of ['accordion', 'accordion-item']) expect(bloqueDe(css, b)).toBe(true);
        expect(bloqueDe(css, 'toast')).toBe(false);
    });
    it('entran por `data-ts-<slug>` con su bloque principal; un bloque secundario, sólo si se nombra', () => {
        const css = demanda(config, '<div data-ts-avatar>').css;
        expect(bloqueDe(css, 'avatar')).toBe(true);
        expect(bloqueDe(css, 'avatar-group')).toBe(false);
        expect(bloqueDe(demanda(config, '<div data-ts-avatar class="ts avatar-group">').css, 'avatar-group')).toBe(true);
    });
    it('entran por `data-ts-<slug>-<parte>`', () => {
        const css = demanda(config, '<button data-ts-accordion-trigger>').css;
        expect(bloqueDe(css, 'accordion')).toBe(true);
        expect(bloqueDe(css, 'accordion-item')).toBe(false);
    });
    it('un bloque secundario entra si una clase armada en runtime puede generarlo', () => {
        expect(bloqueDe(demanda(config, '<div class="ts avatar"></div><div class={`ts avatar-${x}`}>').css, 'avatar-group')).toBe(true);
    });
    it('el safelist por nombre de componente lo sigue trayendo entero', () => {
        expect(bloqueDe(demanda(config, '', { safelist: ['avatar'] }).css, 'avatar-group')).toBe(true);
    });
    it('gana el slug más largo: data-ts-date-picker-x trae date-picker, no un hipotético `date`', () => {
        const css = demanda(config, '<div data-ts-date-picker-nav>').css;
        expect(bloqueDe(css, 'calendar-grid')).toBe(true);
    });
    it('entran por el safelist: `toast` trae el toaster', () => {
        const css = demanda(config, '', { safelist: ['toast'] }).css;
        expect(bloqueDe(css, 'toast')).toBe(true);
        expect(bloqueDe(css, 'toaster')).toBe(true);
    });
    it('el DatePicker trae calendar-*', () => {
        const css = demanda(config, '', { safelist: ['date-picker'] }).css;
        expect(bloqueDe(css, 'datepicker-panel')).toBe(true);
        expect(bloqueDe(css, 'calendar-grid')).toBe(true);
        expect(bloqueDe(css, 'calendar-day')).toBe(true);
    });
    it('Toast trae toaster aunque el código sólo escriba `toast`', () => {
        expect(bloqueDe(demanda(config, '<div class="ts toast">').css, 'toaster')).toBe(true);
    });
    it('por la clase corta, por el gancho y por el safelist', () => {
        expect(demanda(config, '<div class="ts card-media">').css).toContain(':where(.ts).card ');
        expect(demanda(config, '<div data-ts-toast-container>').css).toContain(':where(.ts).toaster');
        expect(demanda(config, '', { safelist: ['date-picker'] }).css).toContain(':where(.ts).calendar-grid');
    });
    it('el orden y la caché no cambian el resultado', () => {
        const archivos = [f('<div data-ts-avatar>', 'b.html'), f('<p class="ts flex">', 'a.html')];
        const base = compile(config, archivos, { onDemand: true });
        expect(compile(config, [...archivos].reverse(), { onDemand: true })).toEqual(base);
    });
});

describe('safelist: tabla de errores', () => {
    const falla = (cfg: TaishoConfig, entradas: unknown, msg: string) =>
        expect(() => compile({ ...cfg, safelist: entradas as string[] }, [], { onDemand: true })).toThrow(expect.objectContaining({ message: msg }));
    const P = 'taisho config: ';

    it('no es una lista', () => falla(config, 'flex', `${P}safelist tiene que ser una lista de strings.`));
    it('entrada que no es string', () => falla(config, ['flex', 3], `${P}safelist[1] tiene que ser un string no vacío.`));
    it('entrada vacía', () => falla(config, [' '], `${P}safelist[0] tiene que ser un string no vacío.`));
    it('clase que no existe, con sugerencia', () => {
        falla(config, ['flex', 'gird-cols-3'], `${P}safelist[1] ("gird-cols-3") no existe en el DS ni entre tus utilities. ¿Se quiso decir "grid-cols-3"?`);
    });
    it('clase que no existe, con variante y sin candidato', () => {
        falla(config, ['md:qqqqqqqq'], `${P}safelist[0] ("md:qqqqqqqq") no existe en el DS ni entre tus utilities.`);
    });
    it('prefijo inexistente, con sugerencia', () => {
        falla(config, ['mdd:flex'], `${P}safelist[0] ("mdd:flex") tiene el prefijo "mdd:", que no existe. ¿Se quiso decir "md:"?`);
    });
    it('prefijo que no es una variante', () => {
        falla(config, ['dark:flex'], `${P}safelist[0] ("dark:flex") tiene el prefijo "dark:", que no existe.`);
    });
    it('variantes fuera de orden', () => {
        falla(config, ['hover:md:flex'], `${P}safelist[0] ("hover:md:flex") tiene las variantes fuera de orden. ¿Se quiso decir "md:hover:flex"?`);
    });
    it('cadena demasiado larga', () => {
        falla(config, ['md:print:group-hover:hover:flex'], `${P}safelist[0] ("md:print:group-hover:hover:flex") tiene una cadena de variantes inválida: a lo sumo un contexto, un print, un group o peer y un estado, en ese orden, y 3 segmentos.`);
    });
    it('data-ts-* no es una variante', () => {
        falla(config, ['data-ts-x:flex'], `${P}safelist[0] ("data-ts-x:flex") tiene el prefijo "data-ts-x:": \`data-ts-*\` es el gancho de los componentes y no es una variante.`);
    });
    it('un estado y una cadena válida entran', () => {
        const css = demanda(config, '', { safelist: ['hover:p-double', 'md:group-hover/menu:flex'] }).css;
        expect(css).toContain(':where(.ts).hover\\:p-double:hover {');
        expect(css).toContain(':where(.ts).md\\:group-hover\\/menu\\:flex:is(:where(.ts.group\\/menu):hover *) {');
    });
    it('`*` que no está al final', () => {
        falla(config, ['grid-*-3'], `${P}safelist[0] ("grid-*-3") tiene un "*" que no está al final: la familia sólo admite "*" al final (p. ej. "grid-cols-*").`);
    });
    it('familia que no expande a nada, con sugerencia', () => {
        falla(config, ['grid-colz-*'], `${P}safelist[0] ("grid-colz-*") no expande a ninguna clase del DS ni de tus utilities. ¿Se quiso decir "grid-cols-*"?`);
    });
    it('familia que no expande a nada, sin candidato', () => {
        falla(config, ['md:qqqqqqqq-*'], `${P}safelist[0] ("md:qqqqqqqq-*") no expande a ninguna clase del DS ni de tus utilities.`);
    });
    it('`*` solo', () => {
        falla(config, ['*'], `${P}safelist[0] ("*") no expande a ninguna clase del DS ni de tus utilities.`);
    });
    it('componente con variante', () => {
        falla(config, ['md:date-picker'], `${P}safelist[0] ("md:date-picker") es un componente: un componente entra entero y no lleva variante.`);
    });
    it('componente que también es clase del DS, con variante (`toast`, `avatar`): el mismo error', () => {
        falla(config, ['md:toast'], `${P}safelist[0] ("md:toast") es un componente: un componente entra entero y no lleva variante.`);
        falla(config, ['md:avatar'], `${P}safelist[0] ("md:avatar") es un componente: un componente entra entero y no lleva variante.`);
    });
    it('componente mal escrito, con sugerencia', () => {
        falla(config, ['date-pickr'], `${P}safelist[0] ("date-pickr") no existe en el DS ni entre tus utilities. ¿Se quiso decir "date-picker"?`);
    });
    it('`ts-x` da la sugerencia de llave-scope', () => {
        falla(config, ['ts-flex'], `${P}safelist[0] ("ts-flex") es inválida: en scope no lleva \`ts-\`: \`flex\`.`);
        falla(config, ['md:ts-grid-cols-*'], `${P}safelist[0] ("md:ts-grid-cols-*") es inválida: en scope no lleva \`ts-\`: \`md:grid-cols-*\`.`);
    });
    it('el safelist se valida también en el modo completo', () => {
        expect(() => compile({ ...config, safelist: ['flx'] }, [])).toThrow(/safelist\[0\]/);
    });
});

describe('cobertura rápida: los 56 catálogos del Core', () => {
    const DIR = path.join(RAIZ, 'src/core-datos/html');
    const catalogos = fs.readdirSync(DIR).filter((n) => n.endsWith('.html')).sort();
    const completo = compile(config, []).css;
    const vocabulario = nombresCortosDe(completo);
    const clasesDe = (html: string) => {
        const out = new Set<string>();
        for (const m of html.matchAll(/class="([^"]*)"/g)) {
            const tokens = m[1].split(/\s+/).filter(Boolean);
            if (tokens.includes('ts')) for (const t of tokens) if (vocabulario.has(t.slice(t.lastIndexOf(':') + 1))) out.add(t);
        }
        return [...out];
    };

    it('hay 56 catálogos', () => expect(catalogos).toHaveLength(56));
    it.each(catalogos)('%s: lo que el modo completo define para sus clases, a demanda también', (nombre) => {
        const html = fs.readFileSync(path.join(DIR, nombre), 'utf8');
        expect(clasesDe(html).length).toBeGreaterThan(0);
        const css = demanda(config, html).css;
        const faltan = clasesDe(html).filter((c) => tiene(completo, c) && !tiene(css, c));
        expect(faltan).toEqual([]);
    });
});

describe('safelist: modificadores de utilidades propias', () => {
    const cfg: TaishoConfig = { ...config, utilities: { 'mi-button': ['p-half'], 'mi-button.destructive': ['bg-danger-700'] } };
    it('acepta el nombre del modificador y trae su regla con la propia', () => {
        const css = demanda(cfg, '', { safelist: ['mi-button', 'destructive'] }).css;
        expect(css).toContain('.mi-button:where(.destructive)');
    });
    it('sin su nombre en el código ni en el safelist, el modificador no entra', () => {
        expect(demanda(cfg, 'class="ts mi-button"').css).not.toContain(':where(.destructive)');
    });
    it('con variante es un error que apunta a la propia', () => {
        expect(() => demanda(cfg, '', { safelist: ['md:destructive'] })).toThrow(/modificador de una utilidad propia: no lleva variante/);
    });
});
