// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { migrarTailwind, prepararTailwind, leerTema, unirTemas, TEMA_VACIO, type OpcionesMigrarTailwind } from './migrar-tailwind-texto';
import { construirMapa } from './tailwind-map';
import { escalasDe } from './naming-table';
import { buildVocabularyColors } from '../config/scales';
import { buildRepoConfig } from '../config/pipeline';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { textoMotivo } from '../generate-cli/mensajes-avisos';

const config = buildRepoConfig();
const ctx = prepararTailwind(config);
const conTexto = <T extends { motivo: Parameters<typeof textoMotivo>[0] }>(xs: T[]) => xs.map((x) => ({ ...x, motivo: textoMotivo(x.motivo, 'es') }));
const migrar = (t: string, o: Partial<OpcionesMigrarTailwind> = {}) => {
    const r = migrarTailwind(t, { ...ctx, ...o });
    return { ...r, sinConvertir: conTexto(r.sinConvertir), fuera: conTexto(r.fuera) };
};
const texto = (t: string, o: Partial<OpcionesMigrarTailwind> = {}) => migrar(t, o).texto;

const CASOS: Array<[string, string, string]> = [
    ['html: class con llave', '<div class="flex p-4 md:hover:pl-2 mi-clase">', '<div class="ts flex p-16 md:hover:ps-8 mi-clase">'],
    ['html: class sin clases de Tailwind queda', '<div class="mi-clase otra">', '<div class="mi-clase otra">'],
    ['html: multilínea', '<div class="\n  flex\n  mt-4\n">', '<div class="\n  ts flex\n  mt-16\n">'],
    ['html: type="hidden" intacto', '<input type="hidden" name="x"><p class="hidden">', '<input type="hidden" name="x"><p class="ts hidden">'],
    ['html: atributos ajenos con varias palabras', '<a title="flex items-center" data-x="p-4 m-2" href="/p-4">', '<a title="flex items-center" data-x="p-4 m-2" href="/p-4">'],
    ['html: <style> nunca', '<style>.a { @apply p-4 }</style><p class="p-4">', '<style>.a { @apply p-4 }</style><p class="ts p-16">'],
    ['svelte: expresión en class con comillas', '<div class="flex {abierto ? \'p-4\' : \'\'} x">', '<div class="ts flex {abierto ? \'p-16\' : \'\'} x">'],
    ['svelte: class={…} sin comillas, una llave por literal', "<div class={c ? 'p-4' : 'm-4'}>", "<div class={c ? 'ts p-16' : 'ts m-16'}>"],
    ['svelte: class:list (Astro) con arreglo', "<div class:list={['flex', { 'p-4': x }]}>", "<div class:list={['ts flex', { 'ts p-16': x }]}>"],
    ['svelte: directiva class: y el elemento ya trae la llave', '<div class="p-4" class:m-4={x} class:hidden>', '<div class="ts p-16" class:m-16={x} class:hidden>'],
    ['svelte: directiva en un elemento que ya era scope no se reconvierte', '<div class="ts p-16" class:ps-16={x}>', '<div class="ts p-16" class:ps-16={x}>'],
    ['svelte: componente lleva la llave en Tailwind', '<Button class="p-4 w-full">', '<Button class="ts p-16 w-full">'],
    ['vue: :class con arreglo y objeto', `<div :class="['p-4', { 'm-2': x }]">`, `<div :class="['ts p-16', { 'ts m-8': x }]">`],
    ['vue: v-bind:class', `<div v-bind:class="{ hidden: x, 'flex': y }">`, `<div v-bind:class="{ hidden: x, 'ts flex': y }">`],
    ['vue: class estático', '<div class="flex mt-4">', '<div class="ts flex mt-16">'],
    ['jsx: className', '<div className="flex p-4">', '<div className="ts flex p-16">'],
    ['jsx: className={…} con ternario', "<div className={on ? 'p-4' : 'm-4'}>", "<div className={on ? 'ts p-16' : 'ts m-16'}>"],
    ['jsx: className={`…${x}`}: la llave va una vez', '<div className={`flex ${on ? \'p-4\' : \'\'}`}>', '<div className={`ts flex ${on ? \'p-16\' : \'\'}`}>'],
    ['tsx: clsx y objeto', "const c = clsx('flex', { 'p-4': on }, on && 'm-4');", "const c = clsx('ts flex', { 'ts p-16': on }, on && 'ts m-16');"],
    ['tsx: cn con twMerge', "const c = twMerge(cn('p-4', x && 'hidden'), 'm-2');", "const c = twMerge(cn('ts p-16', x && 'ts hidden'), 'ts m-8');"],
    ['tsx: cva (base y variantes)', "const b = cva('flex p-4', { variants: { size: { sm: 'p-2', lg: 'p-8' } }, defaultVariants: { size: 'sm' } });", "const b = cva('ts flex p-16', { variants: { size: { sm: 'ts p-8', lg: 'ts p-32' } }, defaultVariants: { size: 'sm' } });"],
    ['tsx: tv, cx, classnames, classNames, twJoin', "tv('flex'); cx('flex'); classnames('flex'); classNames('flex'); twJoin('flex');", "tv('ts flex'); cx('ts flex'); classnames('ts flex'); classNames('ts flex'); twJoin('ts flex');"],
    ['js: palabra suelta intacta', "const t = 'hidden'; const u = 'flex';", "const t = 'hidden'; const u = 'flex';"],
    ['js: lista clara de clases (>=2, todas de Tailwind)', "const k = 'flex items-center mt-4';", "const k = 'ts flex items-center mt-16';"],
    ['js: dos tokens pero uno no es de Tailwind queda', "const k = 'flex mi-clase';", "const k = 'flex mi-clase';"],
    ['js: un string que no es de clases queda', "import x from './flex-card'; log('hello world');", "import x from './flex-card'; log('hello world');"],
    ['js: className = asignado', "el.className = 'flex p-4';", "el.className = 'ts flex p-16';"],
    ['js: classList no se convierte', "el.classList.add('p-4');", "el.classList.add('p-4');"],
    ['astro: class:list con clsx', '<div class:list={[cn("flex"), "p-4"]}>', '<div class:list={[cn("ts flex"), "ts p-16"]}>'],
    ['astro: class estático', '<div class="grid grid-cols-2 mt-4"></div>', '<div class="ts grid grid-cols-2 mt-16"></div>'],
    ['HTML dentro de un template (code=)', 'const code = `<div class="flex"><span class="hidden"></span></div>`;', 'const code = `<div class="ts flex"><span class="ts hidden"></span></div>`;'],
];

describe('migrarTailwind: tabla de casos', () => {
    it.each(CASOS)('%s', (_forma, entrada, salida) => {
        expect(texto(entrada)).toBe(salida);
    });

    it.each(CASOS)('segunda pasada = 0 cambios (H5): %s', (_forma, entrada) => {
        const una = texto(entrada);
        expect(texto(una)).toBe(una);
    });
});

describe('migrarTailwind: el total cuadra (nada desaparece)', () => {
    const MUESTRAS = [
        '<div class="flex p-4 dark:bg-gray-500 table card bg-gray-500 my-thing !p-4 w-[13px] ring-2 hover:underline">',
        '<div class="p-4" class:m-4={x} class:foo={y}><Button class="p-4 bg-${c}-500 hidden">',
        "el.classList.add('p-4', 'foo'); const k = cn('flex', 'mi-clase', { 'hidden': a });",
        '<p class="ts p-16 pl-4 flex card dark:flex">',
    ];
    it.each(MUESTRAS)('%s', (muestra) => {
        const r = migrar(muestra);
        expect(r.totales.tokens).toBe(r.totales.convertidos + r.totales.sinConvertir + r.totales.ajenos);
        expect(r.totales).toEqual({ tokens: r.convertidas.length + r.sinConvertir.length + r.ajenas.length, convertidos: r.convertidas.length, sinConvertir: r.sinConvertir.length, ajenos: r.ajenas.length });
    });

    it('cuenta exactamente los tokens de las clases (sin la llave)', () => {
        const r = migrar('<div class="flex p-4 dark:bg-gray-500 table card my-thing"><b class="ts hidden">');
        expect(r.totales.tokens).toBe(7);
        expect(r.convertidas).toEqual([]);
        expect(r.sinConvertir.map((c) => `${c.token}:${c.tipo}`)).toEqual(['flex:untouched', 'p-4:untouched', 'dark:bg-gray-500:variant', 'table:conflict', 'card:conflict', 'my-thing:base']);
        expect(r.ajenas.map((a) => a.token)).toEqual(['hidden']);
    });
});

describe('migrarTailwind: llaves (H4)', () => {
    it('una por literal convertido, también en etiquetas con mayúscula', () => {
        const r = migrar('<Card class="p-4"/><div class="m-4"/>');
        expect(r.texto).toBe('<Card class="ts p-16"/><div class="ts m-16"/>');
        expect(r.llaves).toBe(2);
    });
    it('un literal sin nada convertible no recibe la llave', () => {
        expect(texto('<div class="mi-clase dark:flex">')).toBe('<div class="mi-clase dark:flex">');
    });
    it('group y peer pasan y cuentan como convertidas', () => {
        const r = migrar('<div class="group peer/menu group-hover:flex">');
        expect(r.texto).toBe('<div class="ts group peer/menu group-hover:flex">');
        expect(r.convertidas).toHaveLength(3);
    });
    it('@container pasa a cq', () => {
        expect(texto('<div class="@container @md:flex">')).toBe('<div class="ts cq @md:flex">');
    });
});

describe('migrarTailwind: H5, un string con la llave no se reconvierte', () => {
    it('p-16 vale en los dos: queda; las sobras de Tailwind se reportan', () => {
        const r = migrar('<p class="ts p-16 pl-4 dark:flex">');
        expect(r.texto).toBe('<p class="ts p-16 pl-4 dark:flex">');
        expect(r.ajenas.map((a) => a.token)).toEqual(['p-16']);
        expect(r.sinConvertir.map((s) => `${s.token}:${s.tipo}`)).toEqual(['pl-4:already-scoped', 'dark:flex:variant']);
    });
});

describe('migrarTailwind: choques (H12)', () => {
    it('table es el componente Table: el elemento queda idéntico y se reporta', () => {
        const entrada = '<table class="table w-full">';
        const r = migrar(entrada);
        expect(r.texto).toBe(entrada);
        expect(r.llaves).toBe(0);
        expect(r.convertidas).toEqual([]);
        expect(r.sinConvertir.map((s) => `${s.token}:${s.tipo}`)).toEqual(['table:conflict', 'w-full:untouched']);
        expect(r.sinConvertir[0].motivo).toContain('se renombra la clase propia o se escribe ese CSS');
        expect(r.sinConvertir[1].motivo).toContain('`table` choca');
    });
    it('un elemento sin choque al lado sí se convierte', () => {
        const r = migrar('<table class="table w-full"><div class="p-4"></div></table>');
        expect(r.texto).toBe('<table class="table w-full"><div class="ts p-16"></div></table>');
        expect(r.llaves).toBe(1);
    });
    it('una clase propia con nombre de componente choca sólo si el literal recibe la llave: el elemento no se toca', () => {
        const r = migrar('<div class="card p-4"><b class="m-4"></b></div>');
        expect(r.texto).toBe('<div class="card p-4"><b class="ts m-16"></b></div>');
        expect(r.sinConvertir.map((s) => `${s.token}:${s.tipo}`)).toEqual(['card:conflict', 'p-4:untouched']);
        const sola = migrar('<div class="card">');
        expect(sola.sinConvertir).toEqual([]);
        expect(sola.ajenas.map((a) => a.token)).toEqual(['card']);
    });
});

describe('migrarTailwind: no convertidas con motivo y línea', () => {
    it('variante, cadena, base, importante y arbitrarias', () => {
        const r = migrar('<p>\n<div class="dark:flex !p-4 w-[13px] ring-8 md:hover:focus:active:p-4">');
        expect(r.sinConvertir.map((s) => `${s.línea}:${s.token}:${s.tipo}`)).toEqual(['2:dark:flex:variant', '2:!p-4:important', '2:w-[13px]:base', '2:ring-8:base', '2:md:hover:focus:active:p-4:chain']);
        expect(r.sinConvertir.every((s) => s.motivo.length > 10)).toBe(true);
    });
    it('un color con otro valor se convierte como no exacto', () => {
        const r = migrar('<p class="bg-gray-500 text-lg">');
        expect(r.convertidas.map((c) => [c.origen, c.exacta])).toEqual([['bg-gray-500', false], ['text-lg', false]]);
    });
    it('fragmentos: la clase se arma en runtime', () => {
        const r = migrar('<div className={`flex p-${n} ${x}hidden`}>');
        expect(r.texto).toBe('<div className={`ts flex p-${n} ${x}hidden`}>');
        expect(r.sinConvertir.map((s) => `${s.token}:${s.tipo}`)).toEqual(['p-:fragment', 'hidden:fragment']);
    });
    it('classList: se reporta, no se convierte', () => {
        const r = migrar("el.classList.toggle('p-4');");
        expect(r.texto).toBe("el.classList.toggle('p-4');");
        expect(r.sinConvertir).toMatchObject([{ token: 'p-4', tipo: 'classlist' }]);
    });
    it('class: en un elemento sin la llave → missing-ts', () => {
        const r = migrar('<div class:m-2={y}>');
        expect(r.texto).toBe('<div class:m-8={y}>');
        expect(r.fuera.map((f) => f.tipo)).toEqual(['missing-ts']);
    });
    it('posible: una clase de Tailwind suelta en un string de JS', () => {
        const r = migrar("const x = 'p-4'; const y = 'hello';");
        expect(r.texto).toBe("const x = 'p-4'; const y = 'hello';");
        expect(r.fuera).toMatchObject([{ token: 'p-4', tipo: 'possible-class', línea: 1 }]);
    });
});

describe('migrarTailwind: ajenas', () => {
    it('las clases propias quedan y se cuentan', () => {
        const r = migrar('<div class="flex mi-clase otra">');
        expect(r.ajenas.map((a) => a.token)).toEqual(['mi-clase', 'otra']);
        expect(r.texto).toBe('<div class="ts flex mi-clase otra">');
    });
});

describe('migrarTailwind: CSS', () => {
    const css = '@import "tailwindcss";\n@source "../src";\n@plugin "@tailwindcss/typography";\n@config "./tailwind.config.js";\n.btn {\n  @apply px-4 py-2 flex;\n}\n.card { @apply p-4 dark:bg-gray-500; }\n.a, .b { @apply p-4; }';
    const r = migrar(css, { esCss: true });
    it('no cambia el texto', () => expect(r.texto).toBe(css));
    it('reporta import, source, plugin y config', () => {
        expect(r.fuera.filter((f) => ['import', 'source', 'plugin', 'config'].includes(f.tipo)).map((f) => `${f.línea}:${f.tipo}`)).toEqual(['1:import', '2:source', '3:plugin', '4:config']);
    });
    it('@apply con la traducción como pista y la sugerencia utilities si es un solo selector de clase', () => {
        const a = r.fuera.filter((f) => f.tipo === 'apply');
        expect(a[0]).toMatchObject({ línea: 6, motivo: expect.stringContaining('`px-16 py-8 flex`'), sugerencia: "utilities: { 'btn': ['px-16', 'py-8', 'flex'] }" });
        expect(a[1].sugerencia).toBeUndefined();
        expect(a[1].motivo).toContain('dark:bg-gray-500');
        expect(a[2].sugerencia).toBeUndefined();
    });
    it('@apply dentro de <style> de un .svelte se reporta con su línea', () => {
        const s = migrar('<div class="p-4"></div>\n<style>\n  .x { @apply m-4; }\n</style>');
        expect(s.fuera).toMatchObject([{ tipo: 'apply', línea: 3 }]);
        expect(s.texto).toContain('@apply m-4');
    });
    it('tailwind-merge se reporta', () => {
        const m = migrar("import { twMerge } from 'tailwind-merge';\nconst a = twMerge('p-4', x);");
        expect(m.fuera.map((f) => `${f.línea}:${f.tipo}`)).toEqual(['1:merge']);
    });
});

describe('migrarTailwind: @theme del usuario (H10)', () => {
    const tema = leerTema('@theme {\n  --spacing: 5px;\n  --radius-md: 3px;\n  --text-lg: 20px;\n  --breakpoint-md: 50rem;\n  --color-brand-500: #f00;\n}');
    it('leerTema detecta qué familias toca', () => {
        expect(tema).toEqual({ spacing: true, radio: true, texto: true, pantallas: true, familias: ['brand'] });
        expect(leerTema('.a { color: red }')).toEqual(TEMA_VACIO);
        expect(unirTemas(tema, TEMA_VACIO)).toEqual(tema);
    });
    it('sacan esa familia de la conversión, con tipo tema', () => {
        const r = migrar('<div class="p-4 rounded-md text-lg md:flex flex w-full">', { tema });
        expect(r.texto).toBe('<div class="ts flex w-full">'.replace('ts flex w-full', 'p-4 rounded-md text-lg md:flex ts flex w-full'));
        expect(r.sinConvertir.map((s) => `${s.token}:${s.tipo}`)).toEqual(['p-4:theme-value', 'rounded-md:theme-value', 'text-lg:theme-value', 'md:flex:theme-value']);
        expect(r.convertidas.map((c) => c.origen)).toEqual(['flex', 'w-full']);
    });
    it('sin @theme las mismas clases convierten', () => {
        expect(texto('<div class="p-4 rounded-md text-lg md:flex">')).toBe('<div class="ts p-16 radius-md text-18 md:flex">'.replace('text-18', 'text-18'));
    });
    it('el @theme se reporta con pistas', () => {
        const r = migrar('@theme {\n  --color-brand-500: #f00;\n  --breakpoint-3xl: 120rem;\n}', { esCss: true });
        expect(r.fuera).toMatchObject([{ tipo: 'theme', línea: 1, motivo: expect.stringContaining('extend.screens') }]);
    });
    it('una familia de color del @theme que no es semilla pide la semilla', () => {
        const r = migrar('<p class="bg-foo-500 bg-brand-500">', { tema: leerTema('@theme { --color-foo-500: #f00; --color-brand-500: #00f; }') });
        expect(r.sinConvertir[0]).toMatchObject({ token: 'bg-foo-500', tipo: 'base' });
        expect(r.sinConvertir[0].motivo).toContain('semilla `foo`');
        expect(r.convertidas.map((c) => c.origen)).toEqual(['bg-brand-500']);
    });
});

describe('prepararTailwind: el mapa con la config del usuario', () => {
    it('con la config del repo es idéntico a src/core-datos/tailwind-map.json', () => {
        const json = JSON.parse(fs.readFileSync('src/core-datos/tailwind-map.json', 'utf8'));
        expect(JSON.parse(JSON.stringify(ctx.mapa))).toEqual(json);
    });

    const conAzul = (): TaishoConfig => {
        const clon = structuredClone(config);
        for (const t of Object.values(clon.themes)) t.colors = { ...t.colors, blue: '#0070f3' };
        return clon;
    };
    it('una semilla blue vuelve compartida esa familia y bg-blue-500 convierte', () => {
        const c = prepararTailwind(conAzul());
        expect(ctx.mapa.colores.familiasSoloTailwind).toContain('blue');
        expect(c.mapa.colores.familiasCompartidas).toContain('blue');
        expect(texto('<p class="bg-blue-500">', c)).toBe('<p class="ts bg-blue-500">');
        expect(texto('<p class="bg-blue-500">')).toBe('<p class="bg-blue-500">');
        expect(migrar('<p class="bg-blue-500">').sinConvertir[0].motivo).toContain('semilla `blue`');
    });
    it('los cortes propios (extend.screens) llegan al traductor', () => {
        const clon = structuredClone(config);
        clon.extend = { screens: { '2xl': '1536px' } };
        const c = prepararTailwind(clon);
        expect(c.screens['2xl']).toBe('1536px');
        expect(texto('<p class="2xl:hidden">', c)).toBe('<p class="ts 2xl:hidden">');
        expect(migrar('<p class="2xl:hidden">').sinConvertir[0]).toMatchObject({ tipo: 'variant' });
    });
    it('construirMapa corta si la config declara una familia que el generador no emite', () => {
        const v = deriveThemeVocabulary(conAzul());
        const sano = prepararTailwind(conAzul());
        const entrada = { vigentes: sano.nombres, esc: escalasDe({ gridMins: Object.keys(v.userGridMins) }), familias: Object.keys(buildVocabularyColors(v.userColors, v.userStates)) };
        expect(() => construirMapa(entrada)).not.toThrow();
        expect(() => construirMapa({ ...entrada, vigentes: ctx.nombres })).toThrow(/tailwind-map: bg-blue-\d+ → ts-bg-blue-\d+/);
    });
});
