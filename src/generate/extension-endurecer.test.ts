// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { defineExtension, validateExtension, type ExtensionComponent, type TaishoExtension } from './extension';
import { configErrorLine } from './mensajes-errores';
import { ConfigError, type ConfigKeyError } from './errores-config';
import { deriveThemeVocabulary } from './vocabulary';
import { cssDeExtensiones, manifiestoDe, tokensDeExtensiones } from './registro';
import { buildFlatCSS, expandApply, parseUtilities, quitarUtilities } from './emit-flat';
import { diccionarioConAlias } from './naming-renames';
import { erroresDeValor, LIMITES, parsearCss } from './extension-parser';
import { acme, configMinima } from './extension-acme.fixture';

const P = '@acme/ui';
const RUTA = `extensions["${P}"]`;
const comp = (css: string, extra: Partial<ExtensionComponent> = {}): TaishoExtension => ({
    components: { 'acme-card': { roots: ['acme-card'], css, ...extra } },
});
const bloque = (cuerpo: string, nombre = 'ts-acme-card') => `@utility ${nombre} {\n${cuerpo}\n}\n`;
const codigos = (e: TaishoExtension, paquete = P) => validateExtension(e, paquete).map((x) => x.code);
const es = (e: ConfigKeyError) => configErrorLine(e, 'es');
const en = (e: ConfigKeyError) => configErrorLine(e, 'en');
const ms = (f: () => unknown) => { const t = performance.now(); try { f(); } catch { } return performance.now() - t; };
// La mejor de tres corridas: un tirón de la máquina cargada infla una, no el costo del algoritmo (las regresiones eran de 7 a 9 s).
const mejor = (f: () => unknown) => Math.min(ms(f), ms(f), ms(f));

describe('un solo lector, el motor compila lo que el validador leyó', () => {
    it('una llave de más que cierra la capa', () => {
        expect(codigos(comp('@utility ts-acme-card { color: red; } } body { display: none } @utility ts-acme-z { color: blue; }'))).toEqual(['ext-css-unbalanced']);
    });
    it('una llave dentro de una cadena (el diferencial entre lectores): la cadena no vale', () => {
        const e = validateExtension(comp('@utility ts-acme-card { content: "} body{display:none} @utility ts-acme-z{" }'), P);
        expect(e.map((x) => x.code)).toEqual(['ext-string-not-allowed']);
        expect(es(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css usa una cadena de texto en "ts-acme-card": sólo se admite en content, corta y sin llaves, paréntesis ni arrobas.`);
        expect(en(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css uses a text string in "ts-acme-card". Only allowed in content, short and without braces, parentheses or at-signs.`);
    });
    it('una llave dentro de un comentario: el comentario se descarta y no llega al motor', () => {
        const css = '@utility ts-acme-card { color: inherit; /* } html{background:red} @utility ts-acme-z{ */ display: flex; }';
        const e = comp(css);
        expect(validateExtension(e, P)).toEqual([]);
        const salida = cssDeExtensiones({ [P]: e }).components;
        expect(salida).not.toContain('html');
        expect(parseUtilities(salida).map((b) => b.name)).toEqual(['ts-acme-card']);
    });
    it('un comentario sin cerrar', () => {
        expect(codigos(comp('@utility ts-acme-card { display: flex; } /* html{x:y}'))).toEqual(['ext-css-unbalanced']);
    });
    it('el CSS «suelto» de una extensión es siempre vacío', () => {
        const hostiles = [
            bloque('display: flex;') + '/* } */',
            '/* c1 */ @utility ts-acme-card { display: flex; /* } */ } /* c2 */',
            bloque('display: flex;') + bloque('gap: var(--ts-gap-half);', 'ts-acme-card-title'),
        ];
        for (const css of hostiles) {
            const salida = cssDeExtensiones({ [P]: comp(css) }).components;
            expect(quitarUtilities(salida).trim()).toBe('');
        }
        const conTodo = cssDeExtensiones({ [P]: acme });
        expect(quitarUtilities(conTodo.components).trim()).toBe('');
        expect(quitarUtilities(conTodo.utilities).trim()).toBe('');
    });
    it('lo que el motor ve son los bloques que el validador devolvió, re-escritos', () => {
        const css = `/* x */\n@utility   ts-acme-card{display:flex;gap:var(--ts-gap-half);&:hover{color:inherit}}`;
        const { bloques } = parsearCss(css);
        expect(bloques.map((b) => b.css).join('')).toBe('@utility ts-acme-card {\n  display: flex;\n  gap: var(--ts-gap-half);\n  &:hover {\n    color: inherit;\n  }\n}\n');
        expect(cssDeExtensiones({ [P]: comp(css) }).components).toBe(`\n${bloques[0].css}`);
    });
    it('cada extensión se lee por separado: una llave abierta en A no desincroniza a B', () => {
        const a = defineExtension({ components: { 'a-x': { roots: ['a-x'], css: '@utility ts-a-x { color: inherit; ' } } });
        const b = defineExtension({ components: { 'b-x': { roots: ['b-x'], css: bloque('display: flex;', 'ts-b-x') } } });
        let errores: readonly ConfigKeyError[] = [];
        try { deriveThemeVocabulary(configMinima(), { a, b }); } catch (e) { errores = (e as ConfigError).errors; }
        expect(errores.map((x) => [x.path, x.code])).toEqual([['extensions["a"].components.a-x.css', 'ext-css-unbalanced']]);
        expect(() => deriveThemeVocabulary(configMinima(), { b })).not.toThrow();
    });
    it('una extensión con un error de lectura no se compila (el CSS no llega al motor)', () => {
        expect(() => cssDeExtensiones({ [P]: comp('@utility ts-acme-card { content: "}" }') })).toThrow(ConfigError);
        expect(() => manifiestoDe({ [P]: comp('@utility ts-acme-card {') })).toThrow(ConfigError);
    });
});

describe('funciones de red y escapes', () => {
    const decl = (d: string) => codigos(comp(bloque(d)));
    it('url() con el nombre escrito con un escape', () => {
        expect(decl('background: \\75rl(https://e/x);')).toEqual(['ext-escape']);
        expect(decl('background: U\\52L(https://e/x);')).toEqual(['ext-escape']);
    });
    it('image-set() y -webkit-image-set(): una cadena no es url( pero hace fetch', () => {
        expect(decl('background: image-set("https://e/x" 1x);')).toEqual(['ext-function-not-allowed', 'ext-string-not-allowed']);
        expect(decl('background: -webkit-image-set(x 1x);')).toEqual(['ext-function-not-allowed']);
    });
    it('url() de fallback dentro de var()', () => {
        const e = validateExtension(comp(bloque('background: var(--ts-acme-card-x, url(https://e/x));')), P);
        expect(e.map((x) => x.code)).toEqual(['ext-url']);
    });
    it('cursor, filter, mask, list-style-image con url()', () => {
        for (const p of ['cursor', 'filter', 'mask', 'list-style-image', 'background-image']) expect(decl(`${p}: url(x);`)).toEqual(['ext-url']);
    });
    it('src(), attr(), env(), element(), paint(), cross-fade(), expression() no están en la lista', () => {
        for (const f of ['src', 'attr', 'env', 'element', 'paint', 'cross-fade', 'expression', 'image']) {
            const e = validateExtension(comp(bloque(`background: ${f}(x);`)), P);
            expect(e.map((x) => x.code)).toEqual(['ext-function-not-allowed']);
            expect(e[0].params).toEqual({ block: 'ts-acme-card', fn: f });
        }
        expect(es(validateExtension(comp(bloque('background: src(x);')), P)[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css usa la función src() en "ts-acme-card", que no está en la lista permitida (var, calc, min, max, clamp, round, mod, color-mix, rgb, hsl, oklch, linear-gradient, translate, scale, rotate, repeat, minmax).`);
        expect(en(validateExtension(comp(bloque('background: src(x);')), P)[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css uses the function src() in "ts-acme-card", which isn't in the allowed list (var, calc, min, max, clamp, round, mod, color-mix, rgb, hsl, oklch, linear-gradient, translate, scale, rotate, repeat, minmax).`);
    });
    it('el nombre de la función se compara en minúsculas', () => {
        expect(decl('background: URL(x);')).toEqual(['ext-url']);
        expect(decl('width: CALC(1px + 2px);')).toEqual([]);
    });
    it('un fallback de var() con una función permitida vale', () => {
        expect(decl('width: var(--ts-sizing-4, calc(1px + 2px));')).toEqual([]);
    });
    it('@font-face suelto: sólo `@utility` en el nivel superior', () => {
        const e = validateExtension(comp('@font-face { font-family: x; src: url(https://e/f.woff2); }'), P);
        expect(e.map((x) => x.code)).toEqual(['ext-top-level']);
    });
});

describe('los valores de token (lista blanca)', () => {
    const tok = (valor: string) => codigos(comp('', { tokens: { bg: valor } }));
    it('un paréntesis sin cerrar se come la hoja: no vale', () => {
        const e = validateExtension(comp('', { tokens: { bg: 'calc(1px' } }), P);
        expect(e).toEqual([{ path: `${RUTA}.components.acme-card.tokens.bg`, code: 'ext-css-unbalanced', params: {} }]);
        expect(tok('a) b(')).toEqual(['ext-css-unbalanced']);
        expect(tok('[x')).toEqual(['ext-css-unbalanced']);
        expect(tok('"x')).toEqual(['ext-css-unbalanced']);
    });
    it('url() y funciones de red', () => {
        expect(tok('url(https://e/x)')).toEqual(['ext-url']);
        expect(tok('image-set("x" 1x)')).toEqual(['ext-function-not-allowed', 'ext-string-not-allowed']);
        expect(tok('src("x")')).toEqual(['ext-function-not-allowed', 'ext-string-not-allowed']);
    });
    it('url() en un token más una declaración que lo lee: el token ya no lo cuela', () => {
        const e = comp(bloque('background: var(--ts-acme-card-bg);'), { tokens: { bg: 'url(https://e/x)' } });
        expect(codigos(e)).toEqual(['ext-url']);
    });
    it('!important, @, < y >', () => {
        expect(tok('red !important')).toEqual(['ext-important']);
        expect(tok('red ! important')).toEqual(['ext-important']);
        expect(tok('@import "x"')).toEqual(['ext-string-not-allowed']);
        expect(tok('@import x')).toEqual(['ext-syntax']);
        expect(tok('</style><script>')).toEqual(['ext-syntax']);
    });
    it('NUL, control, bidi y no ASCII', () => {
        const e = validateExtension(comp('', { tokens: { bg: 'a\u0000b' } }), P);
        expect(e.map((x) => [x.code, x.params])).toEqual([['ext-char-not-allowed', { char: 'U+0000' }]]);
        expect(es(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.tokens.bg tiene un carácter que no se admite (U+0000): sólo ASCII imprimible.`);
        expect(en(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.tokens.bg has a character that isn't allowed (U+0000). Only printable ASCII.`);
        expect(tok('\u202ered')).toEqual(['ext-char-not-allowed']);
        expect(tok('é')).toEqual(['ext-char-not-allowed']);
    });
    it('claves: __proto__, constructor, prototype, toString, mayúsculas y largo', () => {
        const proto = JSON.parse('{"__proto__": "1px"}') as Record<string, string>;
        for (const tokens of [proto, { constructor: '1px' }, { prototype: '1px' }, { toString: '1px' }]) {
            expect(codigos(comp('', { tokens }))).toEqual(['ext-name-invalid']);
        }
        const e = validateExtension(comp('', { tokens: { ['a'.repeat(65)]: '1px' } }), P);
        expect(e.map((x) => x.code)).toEqual(['ext-limit']);
        expect(e[0].params).toEqual({ what: 'key-length', max: 64 });
        expect(es(e[0])).toContain('pasa el límite de largo de una clave de token: máximo 64.');
        expect(en(e[0])).toContain('exceeds the limit of token key length: maximum 64.');
    });
    it('largo del valor y cantidad de tokens', () => {
        const e = validateExtension(comp('', { tokens: { bg: 'a'.repeat(513) } }), P);
        expect(e.map((x) => [x.code, x.params])).toEqual([['ext-limit', { what: 'value-length', max: 512 }]]);
        const muchos = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`k${i}`, '1px']));
        expect(validateExtension(comp('', { tokens: muchos }), P).map((x) => [x.code, x.params])).toEqual([['ext-limit', { what: 'tokens', max: 500 }]]);
    });
    it('dos claves que dan la misma variable', () => {
        const e = validateExtension({
            components: { a: { roots: ['acme', 'acme-card'], css: '', tokens: { 'card-pad': '1px' } }, b: { roots: ['acme-card-x'], css: '', tokens: { pad: '1px' } } },
        }, P);
        expect(e.map((x) => x.code)).toEqual([]);
        const dos = validateExtension({
            components: { a: { roots: ['acme'], css: '', tokens: { 'card-pad': '1px' } }, 'acme-card': { roots: ['acme-card'], css: '', tokens: { pad: '1px' } } },
        }, P);
        expect(dos.map((x) => [x.code, x.params])).toEqual([['ext-variable-repeated', { variable: '--ts-acme-card-pad' }]]);
        expect(es(dos[0])).toBe(`taisho config: ${RUTA}.components.acme-card.tokens.pad repite la variable "--ts-acme-card-pad": dos claves de tokens dan el mismo nombre.`);
        expect(en(dos[0])).toBe(`taisho config: ${RUTA}.components.acme-card.tokens.pad repeats the variable "--ts-acme-card-pad". Two token keys produce the same name.`);
    });
    it('los valores de verdad valen: números, dimensiones, var(), calc, gradientes, colores, oklch', () => {
        for (const v of ['12px', '100%', '0.5', 'var(--color-gray-100)', 'calc(var(--ts-sizing-4) * 2)', 'linear-gradient(to right, #f00, #00f 50%)', 'oklch(1 0 0)', 'hsl(var(--x), 100%, 50%)', 'min(10px, 2rem)', 'color-mix(in oklch, red 20%, blue)']) {
            expect(tok(v), v).toEqual([]);
        }
    });
    it('erroresDeValor es lo mismo sin pasar por una extensión', () => {
        expect(erroresDeValor('calc(1px', 'x')).toEqual([{ code: 'ext-css-unbalanced', params: {} }]);
        expect(erroresDeValor('1px', 'x')).toEqual([]);
    });
});

describe('la lista blanca de la gramática', () => {
    const cuerpo = (c: string) => codigos(comp(bloque(c)));
    it('en el nivel superior sólo `@utility`: todo lo demás es error, incluido `@Utility`', () => {
        for (const suelto of ['@font-face { font-family: x; }', '@keyframes k { to { opacity: 0 } }', '@property --x { syntax: "*"; }', '@import "x.css";', '@Utility ts-acme-card { color: inherit; }', 'body { display: none }', '.x { color: red }', 'color: red;']) {
            expect(codigos(comp(suelto)), suelto).toEqual(['ext-top-level']);
        }
    });
    it('el nombre del bloque: ASCII minúsculo y kebab', () => {
        const nombre = (n: string) => codigos(comp(bloque('color: inherit;', n)));
        expect(nombre('ts-Acme-card')).toEqual(['ext-name-invalid']);
        expect(nombre('ts-acme-card\\:b')).toEqual(['ext-escape', 'ext-name-invalid']);
        expect(nombre('ts-acme--card')).toEqual(['ext-name-invalid']);
        expect(nombre('ts-acme-card-')).toEqual(['ext-name-invalid']);
        expect(nombre('acme-card')).toEqual(['ext-name-invalid']);
        expect(codigos(comp(bloque('color: inherit;', 'ts-acm\u00e9-a')))).toEqual(['ext-char-not-allowed']);
    });
    it('los caracteres que ocultan código en un diff: bidi, BOM, NUL, control', () => {
        for (const [c, u] of [['\u202e', 'U+202E'], ['\ufeff', 'U+FEFF'], ['\u0000', 'U+0000'], ['\u0007', 'U+0007'], ['\u200b', 'U+200B']] as const) {
            const e = validateExtension(comp(bloque(`color: inherit; /* ${c} */`)), P);
            expect(e.map((x) => [x.code, x.params]), u).toEqual([['ext-char-not-allowed', { char: u }]]);
        }
    });
    it('selectores fuera de la llave: el sujeto es siempre &', () => {
        const sel = (s: string) => validateExtension(comp(bloque(`${s} { display: none; }`)), P).map((x) => [x.code, (x.params as { motive?: string }).motive]);
        expect(sel('body:has(&)')).toEqual([['ext-selector-not-allowed', 'unscoped']]);
        expect(sel(':root &')).toEqual([['ext-selector-not-allowed', 'pseudo']]);
        expect(sel('html &')).toEqual([['ext-selector-not-allowed', 'unscoped']]);
        expect(sel('& ~ *')).toEqual([['ext-selector-not-allowed', 'combinator']]);
        expect(sel('& + .ts-x')).toEqual([['ext-selector-not-allowed', 'combinator']]);
        expect(sel('&:has(.x)')).toEqual([['ext-selector-not-allowed', 'pseudo']]);
        expect(sel('&:is(.a)')).toEqual([['ext-selector-not-allowed', 'pseudo']]);
        expect(sel(':host &')).toEqual([['ext-selector-not-allowed', 'pseudo']]);
        expect(sel('&, body')).toEqual([['ext-selector-not-allowed', 'unscoped']]);
        expect(sel('& &')).toEqual([['ext-selector-not-allowed', 'unscoped']]);
        expect(sel('.ts-a .ts-b &')).toEqual([['ext-selector-not-allowed', 'unscoped']]);
        expect(sel("input[value^='a'] &")).toEqual([['ext-selector-not-allowed', 'attribute']]);
        expect(sel('&[style]')).toEqual([['ext-selector-not-allowed', 'attribute']]);
        expect(sel('&[data-x=y i]')).toEqual([['ext-selector-not-allowed', 'attribute']]);
        expect(sel('&::-webkit-scrollbar')).toEqual([['ext-selector-not-allowed', 'pseudo']]);
    });
    it('el texto del error de un selector', () => {
        const e = validateExtension(comp(bloque('body:has(&) { overflow: hidden; }')), P)[0];
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css tiene en "ts-acme-card" un selector que no se admite ("body:has(&)"): el sujeto es siempre & (sólo se admite un ancestro: una clase o [dir=…] antes de &).`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css has a selector that isn't allowed in "ts-acme-card" ("body:has(&)"). The subject is always & (only an ancestor is allowed: a class or [dir=…] before &).`);
    });
    it('los selectores que el Core usa valen', () => {
        const css = [
            '&:hover { color: inherit; }', '&:hover:not(.is-disabled) { color: inherit; }', '&:not(.side-left, .side-top) { color: inherit; }',
            '&::before { content: ""; }', '&[aria-selected=\'true\'] { color: inherit; }', '&[data-acme-card-x].size-sm { color: inherit; }',
            '& > .ts-acme-card-title { color: inherit; }', '& .ts-acme-card-title, & .ts-acme-card-x { color: inherit; }',
            '.ts-density-compact & { color: inherit; }', '[dir=rtl] & { color: inherit; }', '.dark & { color: inherit; }', '&&&& { height: auto; }',
            '&:focus-visible { color: inherit; }', '&.is-active { color: inherit; }', '&:not(:disabled):hover { color: inherit; }',
        ].join('\n');
        const e = validateExtension(comp(bloque(css)), P).filter((x) => x.code !== 'ext-modifier-loose');
        expect(e).toEqual([]);
    });
    it('!important', () => {
        const e = validateExtension(comp(bloque('color: inherit !important;')), P);
        expect(e).toEqual([{ path: `${RUTA}.components.acme-card.css`, code: 'ext-important', params: { block: 'ts-acme-card' } }]);
        expect(es(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css usa !important en "ts-acme-card": no se admite. Se sube la especificidad (p. ej. con && en el selector).`);
        expect(en(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css uses !important in "ts-acme-card", which isn't allowed. Raise the specificity instead (e.g. with && in the selector).`);
        expect(cuerpo('color: inherit ! important;')).toEqual(['ext-important']);
        expect(cuerpo('color: inherit !IMPORTANT;')).toEqual(['ext-important']);
        expect(cuerpo('@apply ts-flex !important;')).toEqual(['ext-important']);
    });
    it('equilibrio de paréntesis y corchetes en los cuerpos', () => {
        expect(cuerpo('width: calc(1px;')).toEqual(['ext-css-unbalanced']);
        expect(cuerpo('width: calc(1px));')).toEqual(['ext-css-unbalanced']);
        expect(cuerpo('grid-template-columns: [a;')).toEqual(['ext-css-unbalanced']);
        expect(cuerpo('content: "a;')).toEqual(['ext-css-unbalanced']);
    });
    it('propiedades personalizadas declaradas en un cuerpo', () => {
        const e = validateExtension(comp(bloque('--ts-sizing-4: 0;')), P);
        expect(e).toEqual([{ path: `${RUTA}.components.acme-card.css`, code: 'ext-custom-property', params: { block: 'ts-acme-card', property: '--ts-sizing-4' } }]);
        expect(es(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css declara la propiedad personalizada --ts-sizing-4 en "ts-acme-card": el CSS sólo lee var(--…). Se declara el valor en los tokens del componente.`);
        expect(en(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css declares the custom property --ts-sizing-4 in "ts-acme-card". CSS only reads var(--…). Declare the value in the component's tokens.`);
        expect(cuerpo('&:hover { --x: 1; }')).toEqual(['ext-custom-property']);
    });
    it('declaraciones que no se entienden', () => {
        expect(cuerpo('Color: red;')).toEqual(['ext-syntax']);
        expect(cuerpo('color;')).toEqual(['ext-syntax']);
        expect(cuerpo('color: ;')).toEqual(['ext-syntax']);
        expect(cuerpo('width: 1px < 2px;')).toEqual(['ext-syntax']);
        const e = validateExtension(comp(bloque('color;')), P)[0];
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css tiene en "ts-acme-card" algo que no se entiende ("color"): una declaración es propiedad: valor; con la propiedad en minúsculas y un valor de la lista permitida.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css has something in "ts-acme-card" that can't be read ("color"). A declaration is property: value; with a lowercase property and a value from the allowed list.`);
    });
    it('los parámetros de @supports y @container', () => {
        expect(cuerpo('@supports (anchor-name: --a) { display: block; }')).toEqual([]);
        expect(cuerpo('@container (width >= 40rem) { display: grid; }')).toEqual([]);
        const e = validateExtension(comp(bloque('@container (width >= 640px) { display: grid; }')), P);
        expect(e.map((x) => [x.code, x.params])).toEqual([['ext-at-params', { block: 'ts-acme-card', rule: '@container', params: '(width >= 640px)' }]]);
        expect(es(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css usa @container en "ts-acme-card" con parámetros que no se admiten ("(width >= 640px)"): consultas simples y con unidades relativas.`);
        expect(en(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css uses @container in "ts-acme-card" with parameters that aren't allowed ("(width >= 640px)"). Simple queries with relative units.`);
        expect(cuerpo('@supports selector(:has(a)) { display: block; }')).toEqual(['ext-at-params']);
    });
    it('anidamiento ≤ 4, cantidad de bloques, componentes, raíces y tamaño', () => {
        const hondo = (n: number) => '&:hover {'.repeat(n) + 'color: inherit;' + '}'.repeat(n);
        expect(cuerpo(hondo(3))).toEqual([]);
        const e = validateExtension(comp(bloque(hondo(4))), P);
        expect(e.map((x) => [x.code, x.params])).toEqual([['ext-limit', { what: 'depth', max: 4 }]]);
        expect(es(e[0])).toContain('pasa el límite de anidamiento: máximo 4.');
        expect(ms(() => parsearCss(bloque('&:hover {'.repeat(100000) + '}'.repeat(100000))))).toBeLessThan(500);
        const muchos = Array.from({ length: 2001 }, (_, i) => bloque('color: inherit;', `ts-acme-card-b${i}`)).join('');
        expect(codigos(comp(muchos))).toEqual(['ext-limit']);
        const comps = Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`c${i}`, { roots: [`r${i}`], css: '' }]));
        expect(codigos({ components: comps })).toEqual(['ext-limit']);
        expect(codigos({ components: { x: { roots: Array.from({ length: 17 }, (_, i) => `r${i}`), css: '' } } })).toEqual(['ext-limit']);
        const e2 = validateExtension(comp(' '.repeat(LIMITES.css + 1)), P);
        expect(e2.map((x) => [x.code, x.params])).toEqual([['ext-limit', { what: 'css-size', max: 262144 }]]);
        const grande = validateExtension(comp(bloque(`content: "${'a'.repeat(100)}";`.repeat(200))), P);
        expect(grande.map((x) => x.code)).toContain('ext-string-not-allowed');
        const bloqueGrande = bloque(Array.from({ length: 800 }, (_, i) => `margin-top: ${i}px;`).join('\n'));
        expect(validateExtension(comp(bloqueGrande), P).map((x) => [x.code, x.params])).toEqual([['ext-limit', { what: 'block-size', max: 16384 }]]);
    });
    it('un `@apply` con más de 32 clases', () => {
        const e = validateExtension(comp(bloque(`@apply ${Array.from({ length: 33 }, () => 'ts-flex').join(' ')};`)), P);
        expect(e.map((x) => [x.code, x.params])).toEqual([['ext-apply-budget', { block: 'ts-acme-card', limit: 'classes', max: 32 }]]);
        expect(es(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css pasa el presupuesto de @apply en "ts-acme-card": demasiadas clases en un @apply (máximo 32).`);
        expect(en(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css exceeds the @apply budget in "ts-acme-card": too many classes in one @apply (maximum 32).`);
        expect(cuerpo(`@apply ${Array.from({ length: 32 }, () => 'ts-flex').join(' ')};`)).toEqual([]);
    });
});

describe('choques normalizados contra el Core y entre paquetes', () => {
    it('una utilidad del Core (el caso de pisa.mts)', () => {
        const e = validateExtension({ components: { acme: { roots: ['acme'], css: bloque('display: none;', 'ts-flex') } } }, P);
        expect(e.map((x) => x.code)).toEqual(['ext-conflicts-core', 'ext-block-not-owned']);
        expect(e[0].params).toEqual({ kind: 'block', name: 'ts-flex' });
    });
    it('con barra escapada, con mayúsculas o con el nombre viejo/nuevo de un renombre', () => {
        const nombre = (n: string) => codigos({ components: { acme: { roots: ['acme'], css: bloque('display: none;', n) } } });
        expect(nombre('ts-w-1\\/4')).toEqual(['ext-escape', 'ext-name-invalid', 'ext-block-not-owned'].filter((c) => c !== 'ext-block-not-owned'));
        expect(nombre('ts-w-1/4')).toEqual(['ext-name-invalid']);
        expect(nombre('ts-Flex')).toEqual(['ext-name-invalid']);
        expect(nombre('ts-text-label-14')).toEqual(['ext-conflicts-core', 'ext-block-not-owned']);
        expect(nombre('ts-type-label-14')).toEqual(['ext-conflicts-core', 'ext-block-not-owned']);
    });
    it('un duplicado dentro de la misma extensión (aunque sea en otro componente) es error', () => {
        const dos = validateExtension({
            components: { a: { roots: ['acme'], css: bloque('color: inherit;', 'ts-acme-a') }, b: { roots: ['acme-b'], css: bloque('color: inherit;', 'ts-acme-a') } },
        }, P);
        expect(dos.map((x) => x.code)).toContain('ext-block-repeated');
    });
    it('raíces reservadas por su primer segmento: sizing, z, color, gap, font…', () => {
        for (const raiz of ['sizing', 'z', 'color', 'gap', 'font', 'radius', 'dark']) {
            const e = validateExtension({ components: { x: { roots: [raiz], css: '', tokens: { '4': '1px' } } } }, P);
            expect(e.map((y) => y.code), raiz).toContain('ext-conflicts-core');
            expect(e.find((y) => y.code === 'ext-conflicts-core')!.params).toEqual({ kind: 'root', name: raiz });
        }
        expect(codigos({ components: { x: { roots: ['color-swatch'], css: bloque('color: inherit;', 'ts-color-swatch') } } })).toEqual([]);
    });
    it('raíces que se pisan entre paquetes: una prefijo de la otra, por segmento', () => {
        const a = defineExtension({ components: { a: { roots: ['acme'], css: '' } } });
        const b = defineExtension({ components: { b: { roots: ['acme-pro'], css: '' } } });
        for (const [lista, esperado] of [[{ '@a/ui': a, '@b/ui': b }, { root: 'acme-pro', other: 'acme', package: '@b/ui', otherPackage: '@a/ui' }], [{ '@a/ui': b, '@b/ui': a }, { root: 'acme', other: 'acme-pro', package: '@b/ui', otherPackage: '@a/ui' }]] as const) {
            let errores: readonly ConfigKeyError[] = [];
            try { deriveThemeVocabulary(configMinima(), lista); } catch (e) { errores = (e as ConfigError).errors; }
            const e = errores.find((x) => x.code === 'ext-roots-overlap')!;
            expect(e.params).toEqual(esperado);
        }
        let errores: readonly ConfigKeyError[] = [];
        try { deriveThemeVocabulary(configMinima(), { '@a/ui': a, '@b/ui': b }); } catch (e) { errores = (e as ConfigError).errors; }
        const e = errores.find((x) => x.code === 'ext-roots-overlap')!;
        expect(es(e)).toBe('taisho config: extensions["@b/ui"] declara la raíz "acme-pro", que se pisa con la raíz "acme" del paquete "@a/ui": una no puede ser prefijo de la otra ("@b/ui" y "@a/ui"). Se elige otra.');
        expect(en(e)).toBe('taisho config: extensions["@b/ui"] declares the root "acme-pro", which overlaps the root "acme" of the package "@a/ui". One can\'t be a prefix of the other ("@b/ui" and "@a/ui"). Pick another.');
    });
    it('«acme» y «acmex» no se pisan (el límite es el segmento)', () => {
        const a = defineExtension({ components: { a: { roots: ['acme'], css: '' } } });
        const x = defineExtension({ components: { x: { roots: ['acmex'], css: '' } } });
        expect(() => deriveThemeVocabulary(configMinima(), { '@a/ui': a, '@x/ui': x })).not.toThrow();
        expect(codigos({ components: { x: { roots: ['acme', 'acme-pro'], css: bloque('color: inherit;', 'ts-acme-pro-x') } } })).toEqual([]);
    });
    it('un bloque que sólo comparte letras con la raíz no es de ella', () => {
        const e = validateExtension(comp(bloque('color: inherit;', 'ts-acme-cardx')), P);
        expect(e.map((x) => x.code)).toEqual(['ext-block-not-owned']);
        const u = validateExtension({ components: { acme: { roots: ['acme'], css: '' } }, utilities: bloque('color: inherit;', 'ts-acmex-a') }, P);
        expect(u.map((x) => [x.code, x.params])).toEqual([['ext-utility-no-root', { block: 'ts-acmex-a' }]]);
        expect(es(u[0])).toBe(`taisho config: ${RUTA}.utilities tiene la utilidad "ts-acmex-a", que no es de ninguna raíz de los componentes ni de las raíces sueltas de este paquete: tiene que ser ts-<raíz> o ts-<raíz>-….`);
        expect(en(u[0])).toBe(`taisho config: ${RUTA}.utilities has the utility "ts-acmex-a", which doesn't belong to any root of this package's components or of its loose roots. It must be ts-<root> or ts-<root>-….`);
    });
    it('`utilities` sin ninguna raíz declarada', () => {
        expect(codigos({ utilities: bloque('color: inherit;', 'ts-p-4x') })).toEqual(['ext-utility-no-root']);
        expect(codigos({ components: { x: { roots: [], css: '' } }, utilities: bloque('color: inherit;', 'ts-acme-a') })).toEqual(['ext-roots-empty', 'ext-utility-no-root']);
    });
    it('slug o raíz con un nombre de objeto: constructor, prototype, __proto__', () => {
        expect(codigos({ components: { constructor: { roots: ['acme'], css: '' } } })).toEqual(['ext-name-invalid']);
        expect(codigos({ components: { x: { roots: ['prototype'], css: '' } } })).toEqual(['ext-name-invalid']);
        const proto = JSON.parse('{"components": {"__proto__": {"roots": ["acme"], "css": ""}}}') as TaishoExtension;
        expect(codigos(proto)).toEqual(['ext-name-invalid']);
        expect(({} as Record<string, unknown>).roots).toBeUndefined();
    });
    it('el motor no deja que un bloque pise a uno del Core aunque el validador no lo haya visto', () => {
        const atomic = '@utility ts-flex { display: flex; }\n@utility ts-card-x { @apply ts-flex; padding: 1px; }';
        const ext = '@utility ts-flex { display: none; }\n@utility ts-acme-a { @apply ts-flex; }';
        expect(() => buildFlatCSS({ reset: '', atomic, utilities: '', components: ext, variantesUsadas: new Set(), usadas: new Set(['flex', 'card-x', 'acme-a']) })).toThrow(/repetido: ts-flex/);
        expect(() => diccionarioConAlias([{ name: 'ts-a', body: '' }, { name: 'ts-a', body: 'x' }])).toThrow(/repetido: ts-a/);
        expect(diccionarioConAlias([{ name: 'ts-a', body: '' }, { name: 'ts-b', body: 'x' }]).size).toBe(2);
    });
    it('la compilación entera frena el choque con el error de siempre', () => {
        let error: unknown;
        try { deriveThemeVocabulary(configMinima(), { [P]: { components: { acme: { roots: ['acme'], css: bloque('display: none;', 'ts-flex') } } } }); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as Error).message).toContain('declara el bloque "ts-flex", que choca con un nombre del Core');
    });
});

describe('@apply', () => {
    const cadena = (n: number, doble = true) =>
        Array.from({ length: n + 1 }, (_, i) => bloque(i < n ? `@apply ts-acme-card-l${i + 1}${doble ? ` ts-acme-card-l${i + 1}` : ''};` : 'display: flex;', i === 0 ? 'ts-acme-card' : `ts-acme-card-l${i}`)).join('');
    it('hacia bloques del mismo componente: vale', () => {
        expect(codigos(comp(cadena(3)))).toEqual([]);
        expect(codigos(comp(bloque('@apply ts-acme-card-x ts-flex;') + bloque('display: flex;', 'ts-acme-card-x')))).toEqual([]);
    });
    it('el `@apply` a un bloque de su propio componente (el `damero` que usan varios bloques de un selector de color)', () => {
        const e = { components: { 'acme-picker': { roots: ['acme-picker'], css: bloque('@apply ts-acme-picker-checker;', 'ts-acme-picker-sv') + bloque('display: flex;', 'ts-acme-picker-checker') } } };
        expect(codigos(e)).toEqual([]);
    });
    it('hacia un bloque de un componente del Core o de otro paquete', () => {
        const e = validateExtension(comp(bloque('@apply ts-button;')), P);
        expect(e[0].params).toEqual({ block: 'ts-acme-card', target: 'ts-button', reason: 'core-component' });
        const otro = defineExtension({ components: { 'b-x': { roots: ['b-x'], css: bloque('display: flex;', 'ts-b-x-y') } } });
        let errores: readonly ConfigKeyError[] = [];
        try { deriveThemeVocabulary(configMinima(), { [P]: comp(bloque('@apply ts-b-x-y;')), b: otro }); } catch (er) { errores = (er as ConfigError).errors; }
        expect(errores.find((x) => x.code === 'ext-apply-target')!.params).toEqual({ block: 'ts-acme-card', target: 'ts-b-x-y', reason: 'other-component' });
    });
    it('un ciclo a -> b -> a, y un bloque que se aplica a sí mismo', () => {
        const e = validateExtension(comp(bloque('@apply ts-acme-card-b;') + bloque('@apply ts-acme-card;', 'ts-acme-card-b')), P);
        expect(e.map((x) => [x.code, x.params])).toEqual([['ext-apply-target', { block: 'ts-acme-card-b', target: 'ts-acme-card', reason: 'cycle' }]]);
        expect(es(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css aplica "ts-acme-card" en "ts-acme-card-b" y eso forma un ciclo de @apply.`);
        expect(en(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css applies "ts-acme-card" in "ts-acme-card-b" and that forms an @apply cycle.`);
        const yo = validateExtension(comp(bloque('@apply ts-acme-card;')), P);
        expect(yo.map((x) => [x.code, (x.params as { reason?: string }).reason])).toEqual([['ext-apply-target', 'cycle']]);
    });
    it('una cadena de más de 4 niveles', () => {
        const e = validateExtension(comp(cadena(5, false)), P);
        expect(e.map((x) => [x.code, x.params])).toEqual([['ext-apply-budget', { block: 'ts-acme-card', limit: 'depth', max: 4 }]]);
        expect(es(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css pasa el presupuesto de @apply en "ts-acme-card": cadena de @apply demasiado profunda (máximo 4).`);
        expect(en(e[0])).toBe(`taisho config: ${RUTA}.components.acme-card.css exceeds the @apply budget in "ts-acme-card": @apply chain too deep (maximum 4).`);
        expect(codigos(comp(cadena(4, false)))).toEqual([]);
    });
    it('la cadena exponencial (N=12, cada nivel se aplica dos veces): error en < 500 ms (antes 7,6 s)', () => {
        let e: ConfigKeyError[] = [];
        validateExtension({}, P);
        const t = mejor(() => { e = validateExtension(comp(cadena(12)), P); });
        expect(t).toBeLessThan(500);
        const limites = e.filter((x) => x.code === 'ext-apply-budget').map((x) => (x.params as { limit: string }).limit);
        expect(limites).toContain('depth');
        expect(limites).toContain('total-size');
        const t2 = mejor(() => validateExtension(comp(cadena(40)), P));
        expect(t2).toBeLessThan(500);
    });
    it('el tamaño total expandido del paquete', () => {
        const muchas = Array.from({ length: 4 }, (_, k) => k);
        const hoja = (n: string) => bloque(Array.from({ length: 60 }, (_, i) => `margin-top: ${i}px;`).join('\n'), n);
        const padres = Array.from({ length: 60 }, (_, i) => bloque('@apply ts-acme-card-h ts-acme-card-h ts-acme-card-h ts-acme-card-h;', `ts-acme-card-p${i}`)).join('');
        const e = validateExtension(comp(hoja('ts-acme-card-h') + padres), P);
        expect(muchas.length).toBe(4);
        expect(e.some((x) => x.code === 'ext-apply-budget' && (x.params as { limit: string }).limit === 'total-size')).toBe(true);
        const t = e.find((x) => x.code === 'ext-apply-budget' && (x.params as { limit: string }).limit === 'total-size')!;
        expect(es(t)).toContain('el CSS expandido del paquete es demasiado grande (máximo 262144).');
        expect(en(t)).toContain("the package's expanded CSS is too large (maximum 262144).");
    });
    it('el scanner: `@apply` + 80.000 espacios sin `;` no cuelga (antes 9 s)', () => {
        const t = mejor(() => expandApply('@apply' + ' '.repeat(80000) + 'x', new Map()));
        expect(t).toBeLessThan(500);
        validateExtension({}, P);
        expect(mejor(() => validateExtension(comp('@utility ts-acme-card { @apply' + ' '.repeat(80000) + 'ts-nada }'), P))).toBeLessThan(500);
        expect(expandApply('@apply' + ' '.repeat(80000) + 'x', new Map())).toBe('@apply' + ' '.repeat(80000) + 'x');
        const e = validateExtension(comp('@utility ts-acme-card { @apply' + ' '.repeat(80000) + 'ts-nada }'), P);
        expect(e.map((x) => x.code)).toEqual(['ext-apply-target']);
    });
    it('el scanner equivale a la regex de siempre', () => {
        const dict = new Map([['ts-a', 'x: 1;'], ['ts-b', 'y: 2; z: 3;']]);
        expect(expandApply('p: 0; @apply ts-a ts-b; q: 1;', dict)).toBe('p: 0; y: 2; z: 3;\n  x: 1; q: 1;');
        expect(expandApply('@apply\n  ts-a;', dict)).toBe('x: 1;');
        expect(expandApply('@applyts-a; @apply ts-a;', dict)).toBe('@applyts-a; x: 1;');
        expect(expandApply('@apply ;', dict)).toBe('@apply ;');
        expect(expandApply('@apply  ;', dict)).toBe('');
        expect(expandApply('a: b; @apply ts-a', dict)).toBe('a: b; @apply ts-a');
    });
    it('el resolvedor del motor tiene memo: la cadena exponencial no es exponencial', () => {
        const dict = new Map<string, string>();
        for (let i = 0; i < 12; i++) dict.set(`l${i}`, `@apply l${i + 1} l${i + 1};`);
        dict.set('l12', 'color: red;');
        let r = '';
        expect(mejor(() => { r = expandApply('@apply l0;', dict); })).toBeLessThan(500);
        expect(r.split('color: red;').length - 1).toBe(2 ** 12);
    });
    it('y tiene tope: lo que se duplica sin fin falla con ConfigError, no con memoria ni con la pila', () => {
        const dict = new Map<string, string>();
        for (let i = 0; i < 40; i++) dict.set(`l${i}`, `@apply l${i + 1} l${i + 1};`);
        dict.set('l40', 'color: red;');
        let error: unknown;
        const t = mejor(() => { try { expandApply('@apply l0;', dict); } catch (e) { error = e; } });
        expect(t).toBeLessThan(500);
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as ConfigError).errors[0]).toMatchObject({ code: 'ext-apply-budget', params: { limit: 'block-size' } });
        const larga = new Map<string, string>();
        for (let i = 0; i < 3000; i++) larga.set(`c${i}`, `@apply c${i + 1};`);
        larga.set('c3000', 'color: red;');
        let error2: unknown;
        try { expandApply('@apply c0;', larga); } catch (e) { error2 = e; }
        expect(error2).toBeInstanceOf(ConfigError);
        expect((error2 as ConfigError).errors[0]).toMatchObject({ code: 'ext-apply-budget', params: { limit: 'depth' } });
    });
    it('un ciclo con varias clases por @apply se detecta (antes: recursión sin fin en el sort)', () => {
        const dict = new Map([['a', '@apply b c;'], ['b', '@apply a c;'], ['c', 'x: 1;']]);
        expect(() => expandApply('@apply a;', dict)).toThrow(/Ciclo de @apply: a → b → a/);
    });
});

describe('mapas sin prototipo en la fusión', () => {
    it('el manifiesto y los tokens fusionados no tienen prototipo', () => {
        const m = manifiestoDe({ [P]: acme });
        expect(Object.getPrototypeOf(m.componentes)).toBeNull();
        expect(m.componentes['acme-card']).toBeDefined();
        const [t] = tokensDeExtensiones({ [P]: acme });
        expect(Object.getPrototypeOf(t.tokens)).toBeNull();
        expect(Object.keys(t.tokens)).toEqual(['pad', 'hover', 'accent']);
    });
    it('un `__proto__` de un JSON no contamina ni cambia nada', () => {
        const hostil = JSON.parse('{"components": {"__proto__": {"roots": ["acme-z"], "css": ""}, "ok": {"roots": ["acme-ok"], "css": "", "tokens": {"__proto__": "1px"}}}}') as TaishoExtension;
        const e = validateExtension(hostil, P);
        expect(e.map((x) => x.code)).toEqual(['ext-name-invalid', 'ext-name-invalid']);
        expect(({} as Record<string, unknown>).roots).toBeUndefined();
        expect(({} as Record<string, unknown>).bloques).toBeUndefined();
    });
});

describe('nada de lo leído sale a otro lado sin pasar por la lista blanca', () => {
    it('lo que sale hacia el CSS es sólo ASCII imprimible, sin comentarios ni barras', () => {
        const salida = cssDeExtensiones({ [P]: acme });
        expect(/[^\x20-\x7e\n]/.test(salida.components + salida.utilities)).toBe(false);
        expect(salida.components).not.toContain('\\');
        expect(salida.components).not.toContain('/*');
    });
});
