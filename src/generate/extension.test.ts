// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { defineExtension, validateExtension, type ExtensionComponent, type TaishoExtension } from './extension';
import { configErrorLine } from './mensajes-errores';
import { deriveThemeVocabulary } from './vocabulary';
import { ConfigError, type ConfigKeyError } from './errores-config';
import { acme, configMinima } from './extension-acme.fixture';

const P = '@acme/ui';
const RUTA = `extensions["${P}"]`;
const comp = (css: string, extra: Partial<ExtensionComponent> = {}): TaishoExtension => ({
    components: { 'acme-card': { roots: ['acme-card'], css, ...extra } },
});
const bloque = (cuerpo: string, nombre = 'ts-acme-card') => `@utility ${nombre} {\n${cuerpo}\n}\n`;
const unico = (e: TaishoExtension, paquete = P): ConfigKeyError => {
    const errores = validateExtension(e, paquete);
    expect(errores).toHaveLength(1);
    return errores[0];
};
const es = (e: ConfigKeyError) => configErrorLine(e, 'es');
const en = (e: ConfigKeyError) => configErrorLine(e, 'en');

describe('la API', () => {
    it('defineExtension devuelve lo que recibe (sólo tipa)', () => {
        const e = { utilities: '' };
        expect(defineExtension(e)).toBe(e);
    });
    it('acme es válida con la marca y los estados de fábrica', () => {
        expect(validateExtension(acme, P)).toEqual([]);
    });
    it('una extensión vacía es válida', () => {
        expect(validateExtension({}, P)).toEqual([]);
    });
});

describe('regla 1: propiedad', () => {
    it('un bloque que no es de una raíz de su componente', () => {
        const e = unico(comp(bloque('display: flex;', 'ts-acme-other')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-block-not-owned', params: { block: 'ts-acme-other', roots: ['acme-card'] } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css tiene el bloque "ts-acme-other", que no es de ninguna raíz de este componente (acme-card): tiene que ser ts-<raíz> o ts-<raíz>-….`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css has the block "ts-acme-other", which doesn't belong to any root of this component (acme-card). It must be ts-<root> or ts-<root>-….`);
    });
    it('un bloque de la raíz de OTRO componente del mismo paquete (por prefijo más largo)', () => {
        const e = unico({
            components: {
                'acme-card': { roots: ['acme'], css: bloque('display: flex;', 'ts-acme-tile') },
                'acme-tile': { roots: ['acme-tile'], css: bloque('display: flex;', 'ts-acme-tile-x') },
            },
        });
        expect(e.code).toBe('ext-block-not-owned');
        expect(e.params).toEqual({ block: 'ts-acme-tile', roots: ['acme'] });
    });
    it('una raíz repetida entre componentes', () => {
        const e = unico({
            components: {
                'acme-a': { roots: ['acme-a'], css: '' },
                'acme-b': { roots: ['acme-b', 'acme-a'], css: '' },
            },
        });
        expect(e).toEqual({ path: `${RUTA}.components.acme-b.roots`, code: 'ext-root-repeated', params: { root: 'acme-a', other: 'acme-a' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-b.roots repite la raíz "acme-a", que ya es del componente "acme-a".`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-b.roots repeats the root "acme-a", which already belongs to the component "acme-a".`);
    });
    it('un bloque repetido', () => {
        const e = unico(comp(bloque('display: flex;') + bloque('display: grid;')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-block-repeated', params: { block: 'ts-acme-card' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css repite el bloque "ts-acme-card".`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css repeats the block "ts-acme-card".`);
    });
    it('sin raíces, o con una raíz o un slug mal escritos', () => {
        const sin = unico({ components: { 'acme-card': { roots: [], css: '' } } });
        expect(sin).toEqual({ path: `${RUTA}.components.acme-card.roots`, code: 'ext-roots-empty', params: {} });
        expect(es(sin)).toBe(`taisho config: ${RUTA}.components.acme-card.roots no tiene raíces: un componente necesita al menos una para poseer sus bloques.`);
        expect(en(sin)).toBe(`taisho config: ${RUTA}.components.acme-card.roots has no roots. A component needs at least one to own its blocks.`);
        const raiz = unico({ components: { 'acme-card': { roots: ['Acme_Card'], css: '' } } });
        expect(raiz).toEqual({ path: `${RUTA}.components.acme-card.roots`, code: 'ext-name-invalid', params: { kind: 'root', name: 'Acme_Card' } });
        expect(es(raiz)).toBe(`taisho config: ${RUTA}.components.acme-card.roots tiene un nombre inválido ("Acme_Card", raíz): minúsculas y dígitos separados por guiones, empezando con letra.`);
        expect(en(raiz)).toBe(`taisho config: ${RUTA}.components.acme-card.roots has an invalid name ("Acme_Card", root). Use lowercase letters and digits separated by hyphens, starting with a letter.`);
        const slug = unico({ components: { 'Acme Card': { roots: ['acme-card'], css: '' } } });
        expect(slug).toEqual({ path: `${RUTA}.components.Acme Card`, code: 'ext-name-invalid', params: { kind: 'slug', name: 'Acme Card' } });
    });
    it('un bloque con nombre inválido', () => {
        const e = unico(comp(bloque('display: flex;', 'acme-card')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-name-invalid', params: { kind: 'block', name: 'acme-card' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css tiene un nombre inválido ("acme-card", bloque): minúsculas y dígitos separados por guiones, empezando con letra y con el prefijo "ts-".`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css has an invalid name ("acme-card", block). Use lowercase letters and digits separated by hyphens, starting with a letter and with the "ts-" prefix.`);
    });
    it('la forma: un dato que no es lo que el tipo dice', () => {
        const e = unico({ components: { 'acme-card': { roots: ['acme-card'], css: 3 } } } as unknown as TaishoExtension);
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-shape', params: { expected: 'string' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css no tiene la forma esperada: tiene que ser string.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css doesn't have the expected shape. It must be string.`);
    });
});

describe('regla 2: choques con el Core', () => {
    it('una raíz del Core (COMPONENTES)', () => {
        const e = unico({ components: { 'acme-card': { roots: ['button'], css: '' } } });
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.roots`, code: 'ext-conflicts-core', params: { kind: 'root', name: 'button' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.roots declara la raíz "button", que choca con un nombre del Core. Se elige otro.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.roots declares the root "button", which conflicts with a Core name. Pick another.`);
    });
    it('una raíz en cuya familia el Core ya emite nombres', () => {
        const e = unico({ components: { 'acme-card': { roots: ['gap'], css: '' } } });
        expect(e.code).toBe('ext-conflicts-core');
        expect(e.params).toEqual({ kind: 'root', name: 'gap' });
    });
    it('un slug del Core', () => {
        const e = unico({ components: { toast: { roots: ['acme-card'], css: '' } } });
        expect(e).toEqual({ path: `${RUTA}.components.toast`, code: 'ext-conflicts-core', params: { kind: 'slug', name: 'toast' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.toast declara el componente "toast", que choca con un nombre del Core. Se elige otro.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.toast declares the slug "toast", which conflicts with a Core name. Pick another.`);
    });
    it('un bloque que el Core ya emite', () => {
        const errores = validateExtension({ components: { 'acme-card': { roots: ['acme-card'], css: bloque('display: flex;', 'ts-acme-card') + bloque('display: flex;', 'ts-gap-base') } } }, P);
        expect(errores.map((x) => x.code)).toEqual(['ext-conflicts-core', 'ext-block-not-owned']);
        expect(errores[0].params).toEqual({ kind: 'block', name: 'ts-gap-base' });
        expect(en(errores[0])).toContain('declares the block "ts-gap-base"');
    });
    it('una utilidad que el Core ya emite', () => {
        const errores = validateExtension({ utilities: bloque('display: flex;', 'ts-gap-base') }, P);
        expect(errores.map((x) => x.code)).toEqual(['ext-conflicts-core', 'ext-utility-no-root']);
        const e = errores[0];
        expect(e).toEqual({ path: `${RUTA}.utilities`, code: 'ext-conflicts-core', params: { kind: 'utility', name: 'ts-gap-base' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.utilities declara la utilidad "ts-gap-base", que choca con un nombre del Core. Se elige otro.`);
    });
    it('una variable de token que el Core ya emite', () => {
        const errores = validateExtension({ components: { fw: { roots: ['fw'], css: '', tokens: { normal: '1' } } } }, P);
        expect(errores.map((x) => x.code)).toEqual(['ext-conflicts-core', 'ext-conflicts-core']);
        const e = errores[1];
        expect(e).toEqual({ path: `${RUTA}.components.fw.tokens.normal`, code: 'ext-conflicts-core', params: { kind: 'variable', name: '--ts-fw-normal' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.fw.tokens.normal declara la variable "--ts-fw-normal", que choca con un nombre del Core. Se elige otro.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.fw.tokens.normal declares the variable "--ts-fw-normal", which conflicts with a Core name. Pick another.`);
    });
});

describe('regla 3: @apply', () => {
    const apply = (destino: string) => comp(bloque(`@apply ${destino};`) + bloque('display: flex;', 'ts-acme-card-x'));
    it('hacia una utilidad que no existe, con sugerencia', () => {
        const e = unico(apply('ts-focus-rign'));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-apply-target', params: { block: 'ts-acme-card', target: 'ts-focus-rign', reason: 'unknown', suggestion: 'ts-focus-ring' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css aplica "ts-focus-rign" en "ts-acme-card", que no es una utilidad del Core. ¿Se quiso decir "ts-focus-ring"?`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css applies "ts-focus-rign" in "ts-acme-card", which isn't a Core utility. Did you mean "ts-focus-ring"?`);
    });
    it('hacia un bloque de un componente del Core', () => {
        const e = unico(apply('ts-button'));
        expect(e.params).toEqual({ block: 'ts-acme-card', target: 'ts-button', reason: 'core-component' });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css aplica "ts-button" en "ts-acme-card", que es un bloque de un componente del Core: @apply sólo vale hacia utilidades del Core.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css applies "ts-button" in "ts-acme-card", which is a block of a Core component. @apply only works toward Core utilities.`);
    });
    it('hacia un bloque del MISMO componente vale (acíclico)', () => {
        expect(validateExtension(apply('ts-acme-card-x'), P)).toEqual([]);
    });
    it('hacia un bloque de OTRO componente del mismo paquete no vale', () => {
        const e = unico({
            components: {
                'acme-card': { roots: ['acme-card'], css: bloque('@apply ts-acme-tile-x;') },
                'acme-tile': { roots: ['acme-tile'], css: bloque('display: flex;', 'ts-acme-tile-x') },
            },
        });
        expect(e.params).toEqual({ block: 'ts-acme-card', target: 'ts-acme-tile-x', reason: 'other-component' });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css aplica "ts-acme-tile-x" en "ts-acme-card", que es un bloque de otro componente o de otro paquete: @apply sólo vale hacia utilidades del Core o bloques del mismo componente.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css applies "ts-acme-tile-x" in "ts-acme-card", which is a block of another component or another package. @apply only works toward Core utilities or blocks of the same component.`);
    });
    it('hacia utilidades públicas del Core, no hay error', () => {
        expect(validateExtension(comp(bloque('@apply ts-focus-ring ts-gap-base;')), P)).toEqual([]);
    });
});

describe('regla 4: var()', () => {
    it('sólo tokens del Core o de las raíces propias', () => {
        const e = unico(comp(bloque('color: var(--mi-color);')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-var-not-public', params: { block: 'ts-acme-card', variable: '--mi-color' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css lee --mi-color en "ts-acme-card", que no es un token del Core ni de las raíces de este paquete (--ts-<raíz>-…).`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css reads --mi-color in "ts-acme-card", which is neither a Core token nor one of this package's roots (--ts-<root>-…).`);
    });
    it('con sugerencia cuando hay un token cercano', () => {
        const e = unico(comp(bloque('gap: var(--ts-gap-hlaf);')));
        expect(e.params).toEqual({ block: 'ts-acme-card', variable: '--ts-gap-hlaf', suggestion: '--ts-gap-half' });
        expect(es(e)).toContain('¿Se quiso decir "--ts-gap-half"?');
        expect(en(e)).toContain('Did you mean "--ts-gap-half"?');
    });
    it('las variables de runtime de la raíz propia valen aunque no sean tokens', () => {
        expect(validateExtension(comp(bloque('width: var(--ts-acme-card-runtime, 0);')), P)).toEqual([]);
    });
});

describe('regla 5: gramática', () => {
    it('un modificador fuera de su base', () => {
        const e = unico(comp(bloque('.size-sm > & { color: var(--color-gray-1000); }')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-modifier-loose', params: { block: 'ts-acme-card', selector: '.size-sm > &', motive: 'suelto' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css tiene en "ts-acme-card" un modificador suelto en ".size-sm > &": un modificador va en el mismo compuesto que su base (& o .ts-…).`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css has a loose modifier in "ts-acme-card" at ".size-sm > &". A modifier goes in the same compound as its base (& or .ts-…).`);
    });
    it('una clase que no es del vocabulario: una extensión no suma modificadores', () => {
        const e = unico(comp(bloque('&.mi-estado { color: var(--color-gray-1000); }')));
        expect(e.params).toEqual({ block: 'ts-acme-card', selector: '&.mi-estado', motive: 'desconocido' });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css tiene en "ts-acme-card" una clase que no es del vocabulario en "&.mi-estado": una extensión no suma modificadores, sólo usa los del Core.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css has a class in "ts-acme-card" at "&.mi-estado" that isn't in the vocabulary. An extension can't add modifiers; it only uses Core's.`);
    });
    it('un modificador del Core con su base propia vale; el gancho [data-<raíz propia>] también es base', () => {
        expect(validateExtension(comp(bloque('&.size-sm { color: var(--color-gray-1000); }\n[data-acme-card-x].size-sm { color: var(--color-gray-1000); }')), P)).toEqual([]);
    });
});

describe('regla 6: color', () => {
    it('un hex', () => {
        const e = unico(comp(bloque('background: #fff;')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-color-literal', params: { block: 'ts-acme-card', value: '#fff', kind: 'hex' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css escribe en "ts-acme-card" el color hex "#fff": el CSS no lleva colores literales, sólo var(--…). Declaralo en los tokens del componente.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css writes the hex color "#fff" in "ts-acme-card". CSS doesn't carry literal colors, only var(--…). Declare it in the component's tokens.`);
    });
    it('un nombre de color', () => {
        const e = unico(comp(bloque('border: 1px solid Red;')));
        expect(e.params).toEqual({ block: 'ts-acme-card', value: 'Red', kind: 'name' });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css escribe en "ts-acme-card" el color con nombre "Red": el CSS no lleva colores literales, sólo var(--…). Declaralo en los tokens del componente.`);
        expect(en(e)).toContain('writes the named color "Red" in "ts-acme-card"');
    });
    it('una función de color sin var()', () => {
        const e = unico(comp(bloque('color: rgb(0 0 0 / 50%);')));
        expect(e.params).toEqual({ block: 'ts-acme-card', value: 'rgb(0 0 0 / 50%)', kind: 'function' });
        expect(es(e)).toContain('la función de color "rgb(0 0 0 / 50%)"');
        expect(en(e)).toContain('the color function "rgb(0 0 0 / 50%)"');
    });
    it('transparent, currentColor, inherit, un color de sistema y una función con var() valen', () => {
        const css = bloque(
            'color: currentColor; background: transparent; border-color: inherit; outline-color: Highlight;\n' +
                'background-color: color-mix(in oklch, var(--color-gray-1000) 5%, transparent);\n' +
                "content: '#fff red';",
        );
        expect(validateExtension(comp(css), P)).toEqual([]);
    });
    it('los literales valen en tokens', () => {
        expect(validateExtension(comp('', { tokens: { accent: '#ff00aa', gradient: 'linear-gradient(red, blue)' } }), P)).toEqual([]);
    });
});

describe('regla 7: superficie del CSS', () => {
    it('en el nivel superior, sólo @utility', () => {
        const e = unico(comp(bloque('display: flex;') + '@keyframes spin { to { rotate: 1turn; } }\n'));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-top-level', params: { snippet: '@keyframes spin { to { rotate: 1turn; } }' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css tiene en el nivel superior algo que no es un @utility ("@keyframes spin { to { rotate: 1turn; } }"): sólo se admiten bloques @utility.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css has something at the top level that isn't a @utility ("@keyframes spin { to { rotate: 1turn; } }"). Only @utility blocks are allowed.`);
    });
    it('los at-rules anidados que el Core ya usa valen', () => {
        const css = bloque(
            '@media (prefers-reduced-motion: reduce) { transition: none; }\n' +
                '@media (hover: hover) and (pointer: fine) { opacity: 1; }\n' +
                '@supports (anchor-name: --a) { display: block; }\n' +
                '@container (width >= 40rem) { display: grid; }\n' +
                '@starting-style { opacity: 0; }',
        );
        expect(validateExtension(comp(css), P)).toEqual([]);
    });
    for (const [regla, texto] of [['@import', '@import "x.css";'], ['@layer', '@layer base { color: inherit; }'], ['@font-face', '@font-face { font-family: x; }'], ['@keyframes', '@keyframes k { to { opacity: 0; } }'], ['@property', '@property --x { syntax: "*"; }']] as const) {
        it(`${regla} adentro de un bloque no vale`, () => {
            const errores = validateExtension(comp(bloque(texto)), P).filter((x) => x.code === 'ext-at-rule');
            expect(errores).toHaveLength(1);
            expect(errores[0].params).toEqual({ block: 'ts-acme-card', rule: regla });
        });
    }
    it('el texto de un at-rule prohibido', () => {
        const e = unico(comp(bloque('@keyframes k { to { opacity: 0; } }')));
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css usa @keyframes en "ts-acme-card": sólo se admiten @media, @supports, @container y @starting-style, y @apply hacia utilidades del Core.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css uses @keyframes in "ts-acme-card". Only @media, @supports, @container and @starting-style are allowed, plus @apply toward Core utilities.`);
    });
    it('un @media por ancho no vale', () => {
        const e = unico(comp(bloque('@media (width >= 768px) { display: grid; }')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-media-query', params: { block: 'ts-acme-card', query: '(width >= 768px)' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css usa un @media no permitido en "ts-acme-card" ("(width >= 768px)"): sólo consultas de preferencia (prefers-*, forced-colors, hover, pointer), nunca el ancho.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css uses a @media that isn't allowed in "ts-acme-card" ("(width >= 768px)"). Only preference queries (prefers-*, forced-colors, hover, pointer), never the width.`);
    });
    it('un @media con una consulta de preferencia mezclada con un ancho tampoco', () => {
        const errores = validateExtension(comp(bloque('@media (hover: hover) and (min-width: 40px) { display: grid; }')), P);
        expect(errores.map((x) => x.code)).toEqual(['ext-media-query']);
    });
    it('url() no vale', () => {
        const e = unico(comp(bloque('background-image: url(x.png);')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-url', params: { block: 'ts-acme-card' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css usa url() en "ts-acme-card": una extensión no carga recursos.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css uses url() in "ts-acme-card". An extension doesn't load resources.`);
    });
    it('un escape (\\75rl) no esquiva la prohibición', () => {
        const e = unico(comp(bloque('background-image: \\75rl(x.png);')));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-escape', params: { block: 'ts-acme-card' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css usa una barra invertida (\\) en "ts-acme-card": no se admiten escapes.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css uses a backslash (\\) in "ts-acme-card". Escapes aren't allowed.`);
    });
    it('llaves, paréntesis o corchetes que no cierran', () => {
        const e = unico(comp('@utility ts-acme-card { display: flex;'));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.css`, code: 'ext-css-unbalanced', params: {} });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css tiene llaves, paréntesis o corchetes que no cierran, o una cadena o un comentario sin cerrar.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.css has braces, parentheses or brackets that don't close, or an unclosed string or comment.`);
    });
    it('una llave dentro de una cadena: la cadena no vale', () => {
        expect(validateExtension(comp(bloque('content: "}";')), P).map((x) => x.code)).toEqual(['ext-string-not-allowed']);
    });
    it('las mismas reglas valen para `utilities`', () => {
        const e = unico({ components: { glow: { roots: ['acme-glow'], css: '' } }, utilities: bloque('background: #fff;', 'ts-acme-glow') });
        expect(e).toEqual({ path: `${RUTA}.utilities`, code: 'ext-color-literal', params: { block: 'ts-acme-glow', value: '#fff', kind: 'hex' } });
    });
});

describe('regla 8: tokens', () => {
    it('una clave que no es kebab', () => {
        const e = unico(comp('', { tokens: { Pad: '1px' } }));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.tokens.Pad`, code: 'ext-name-invalid', params: { kind: 'token', name: 'Pad' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.tokens.Pad tiene un nombre inválido ("Pad", clave de token): minúsculas y dígitos separados por guiones, empezando con letra.`);
        expect(en(e)).toBe(`taisho config: ${RUTA}.components.acme-card.tokens.Pad has an invalid name ("Pad", token key). Use lowercase letters and digits separated by hyphens, starting with a letter.`);
    });
    it('un valor que podría cerrar la declaración (el mismo error que las escalas)', () => {
        const e = unico(comp('', { tokens: { pad: '1px; } body { x: y' } }));
        expect(e).toEqual({ path: `${RUTA}.components.acme-card.tokens.pad`, code: 'unsafe-value', params: { value: '1px; } body { x: y' } });
        expect(es(e)).toBe(`taisho config: ${RUTA}.components.acme-card.tokens.pad tiene un valor inválido ("1px; } body { x: y"): no puede contener ; { } \\ /* */ ni saltos de línea.`);
    });
    it('un valor vacío', () => {
        expect(unico(comp('', { tokens: { pad: ' ' } })).code).toBe('empty-value');
    });

    const tema = (components: Record<string, Record<string, string>>) =>
        configMinima({ themes: { taisho: { colors: { brand: '#4F46E5' }, components } } });
    const lanza = (config: ReturnType<typeof configMinima>, extensions: Record<string, TaishoExtension>): ConfigKeyError[] => {
        try { deriveThemeVocabulary(config, extensions); } catch (e) { return [...(e as ConfigError).errors]; }
        throw new Error('no lanzó');
    };
    it('en el tema, un componente sin la extensión instalada', () => {
        const [e] = lanza(tema({ 'acme-card': { pad: '1px' } }), {});
        expect(e).toEqual({ path: 'themes.taisho.components.acme-card', code: 'theme-component-unknown', params: { slug: 'acme-card' } });
        expect(es(e)).toBe('taisho config: themes.taisho.components.acme-card no es un componente de ninguna extensión instalada ("acme-card").');
        expect(en(e)).toBe('taisho config: themes.taisho.components.acme-card isn\'t a component of any installed extension ("acme-card").');
    });
    it('en el tema, un componente cercano a uno instalado: sugerencia', () => {
        const [e] = lanza(tema({ 'acme-crad': { pad: '1px' } }), { [P]: acme });
        expect(e.params).toEqual({ slug: 'acme-crad', suggestion: 'acme-card' });
        expect(es(e)).toContain('¿Se quiso decir "acme-card"?');
        expect(en(e)).toContain('Did you mean "acme-card"?');
    });
    it('en el tema, una clave que la extensión no declara, con sugerencia', () => {
        const [e] = lanza(tema({ 'acme-card': { pda: '1px' } }), { [P]: acme });
        expect(e).toEqual({ path: 'themes.taisho.components.acme-card.pda', code: 'theme-component-token-unknown', params: { slug: 'acme-card', key: 'pda', suggestion: 'pad' } });
        expect(es(e)).toBe('taisho config: themes.taisho.components.acme-card.pda no es un token que declare "acme-card" ("pda"). ¿Se quiso decir "pad"?');
        expect(en(e)).toBe('taisho config: themes.taisho.components.acme-card.pda isn\'t a token that "acme-card" declares ("pda"). Did you mean "pad"?');
    });
    it('en el tema, un valor inseguro', () => {
        const [e] = lanza(tema({ 'acme-card': { pad: '1px;' } }), { [P]: acme });
        expect(e.code).toBe('unsafe-value');
        expect(e.path).toBe('themes.taisho.components.acme-card.pad');
    });
    it('en el tema, una clave declarada es válida', () => {
        expect(() => deriveThemeVocabulary(tema({ 'acme-card': { pad: '1px' } }), { [P]: acme })).not.toThrow();
    });
});

describe('las extensiones en la compilación', () => {
    it('una extensión inválida corta la compilación con un ConfigError (message en español)', () => {
        let error: unknown;
        try { deriveThemeVocabulary(configMinima(), { [P]: comp(bloque('background: #fff;')) }); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as Error).message).toBe(`taisho config: ${RUTA}.components.acme-card.css escribe en "ts-acme-card" el color hex "#fff": el CSS no lleva colores literales, sólo var(--…). Declaralo en los tokens del componente.`);
    });
    it('un choque con una utilidad del consumidor lo ve el error de utilities de siempre', () => {
        expect(() => deriveThemeVocabulary(configMinima({ utilities: { 'acme-glow': ['p-base'] } }), { [P]: acme })).toThrow(/utilities\.acme-glow choca con un nombre corto del DS/);
        expect(() => deriveThemeVocabulary(configMinima({ utilities: { 'acme-card': ['p-base'] } }), { [P]: acme })).toThrow(/utilities\.acme-card choca con un nombre corto del DS/);
    });
    it('sin la extensión, la misma utilidad del consumidor es válida', () => {
        expect(() => deriveThemeVocabulary(configMinima({ utilities: { 'acme-glow': ['p-base'] } }))).not.toThrow();
    });
    it('dos paquetes con la misma raíz: el error nombra a los dos, en el orden de la cascada', () => {
        const otra = defineExtension({ components: { 'acme-other': { roots: ['acme-card'], css: '' } } });
        let errores: readonly ConfigKeyError[] = [];
        try { deriveThemeVocabulary(configMinima(), { '@zeta/ui': otra, [P]: acme }); } catch (e) { errores = (e as ConfigError).errors; }
        const e = errores.find((x) => x.code === 'ext-conflicts-extension')!;
        expect(e).toEqual({ path: 'extensions["@zeta/ui"]', code: 'ext-conflicts-extension', params: { kind: 'root', name: 'acme-card', package: '@zeta/ui', other: '@acme/ui' } });
        expect(es(e)).toBe('taisho config: extensions["@zeta/ui"] declara la raíz "acme-card", que ya es del paquete "@acme/ui": "@zeta/ui" y "@acme/ui" no pueden compartir un nombre. Se elige otro.');
        expect(en(e)).toBe('taisho config: extensions["@zeta/ui"] declares the root "acme-card", which already belongs to the package "@acme/ui". "@zeta/ui" and "@acme/ui" can\'t share a name. Pick another.');
    });
    it('dos paquetes que se disputan una utilidad o una variable', () => {
        const a = defineExtension({ utilities: bloque('display: flex;', 'ts-shared-x'), components: { 'a-c': { roots: ['a-c'], css: '', tokens: { k: '1' } } } });
        const b = defineExtension({ utilities: bloque('display: flex;', 'ts-shared-x'), components: { 'b-c': { roots: ['a'], css: '', tokens: { 'c-k': '1' } } } });
        let errores: readonly ConfigKeyError[] = [];
        try { deriveThemeVocabulary(configMinima(), { a, b }); } catch (e) { errores = (e as ConfigError).errors; }
        expect(errores.filter((x) => x.code === 'ext-conflicts-extension').map((x) => x.params)).toEqual([
            { kind: 'utility', name: 'ts-shared-x', package: 'b', other: 'a' },
            { kind: 'variable', name: '--ts-a-c-k', package: 'b', other: 'a' },
        ]);
    });
});
