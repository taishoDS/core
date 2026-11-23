// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile, derivarVocabulario } from './compile';
import { deriveThemeVocabulary } from './vocabulary';
import { manifiestoDe, manifiestoDelCore } from './registro';
import { buildTokensCSS, resolveThemeTokens } from './emit-tokens';
import { buildDtcg } from './emit-dtcg';
import { defineExtension, type TaishoExtensions } from './extension';
import { acme, configMinima } from './extension-acme.fixture';

const P = '@acme/ui';
const extensions: TaishoExtensions = { [P]: acme };
const html = (clases: string) => [{ file: 'a.html', content: `<div class="${clases}"></div>` }];
const aDemanda = (clases: string, ext?: TaishoExtensions) => compile(configMinima(), html(clases), { onDemand: true, extensions: ext });
const tema = (config = configMinima(), ext: TaishoExtensions = extensions) => {
    const v = deriveThemeVocabulary(config, ext);
    return { v, model: resolveThemeTokens(v.themeEntries[0], v.userFonts, v.defaultStates, v.userScales, ext) };
};

describe('el manifiesto', () => {
    it('sin extensiones es el del Core, el mismo objeto', () => {
        expect(manifiestoDe()).toBe(manifiestoDelCore);
        expect(manifiestoDe({})).toBe(manifiestoDelCore);
    });
    it('suma el componente: slug, bloques en orden de declaración y raíces como runtime', () => {
        const m = manifiestoDe(extensions);
        expect(m.componentes['acme-card']).toEqual({
            gancho: null,
            bloques: ['acme-card', 'acme-card-title', 'acme-tile'],
            runtime: ['acme-card', 'acme-tile'],
        });
        expect(Object.keys(m.componentes)).toEqual([...Object.keys(manifiestoDelCore.componentes), 'acme-card']);
        expect(m.sueltos).toBe(manifiestoDelCore.sueltos);
        expect(manifiestoDelCore.componentes['acme-card']).toBeUndefined();
    });
});

describe('0 extensiones: nada cambia', () => {
    it('el CSS completo y a demanda es el mismo con `extensions: {}` que sin la opción', () => {
        const config = configMinima();
        expect(compile(config, [], { extensions: {} }).css).toBe(compile(config, []).css);
        expect(aDemanda('ts button', {}).css).toBe(aDemanda('ts button').css);
    });
    it('el tema y el DTCG no traen grupo de componentes', () => {
        const { v, model } = tema(configMinima(), {});
        expect(model.components).toEqual({});
        expect(buildTokensCSS(model)).not.toContain('acme');
        expect(Object.keys(buildDtcg(v.themeEntries[0], model))).not.toContain('components');
    });
});

describe('los bloques en el CSS', () => {
    it('van después del Core en el CSS de componentes, y salen con sus nombres del modo scope', () => {
        const config = configMinima();
        const sin = derivarVocabulario(config, deriveThemeVocabulary(config));
        const con = derivarVocabulario(config, deriveThemeVocabulary(config, extensions), extensions);
        expect(con.components.startsWith(sin.components)).toBe(true);
        expect(con.components.slice(sin.components.length)).toContain('@utility ts-acme-card {');
        expect(con.utilities.startsWith(sin.utilities)).toBe(true);
        expect(con.utilities.slice(sin.utilities.length)).toContain('@utility ts-acme-glow {');
        expect(con.atomic).toBe(sin.atomic);

        const css = compile(config, [], { extensions }).css;
        const i = css.indexOf(':where(.ts).acme-card {');
        expect(i).toBeGreaterThan(-1);
        expect(css).toContain(':where(.ts).acme-card-title {');
        expect(css).toContain(':where(.ts).acme-tile {');
        expect(css.slice(i, css.indexOf('}\n', i))).toContain('box-shadow: 0 0 0 var(--ts-border-width-1) var(--_focus, var(--ts-focus-ring-color');
        expect(css.slice(i, css.indexOf('}\n', i))).not.toContain('@apply');
    });
    it('el Core, intacto: las reglas que ya estaban salen igual y en el mismo orden', () => {
        const sin = compile(configMinima(), []).css;
        const con = compile(configMinima(), [], { extensions }).css;
        const lineas = (c: string) => c.split('\n');
        const conSinAcme = lineas(con).filter((l) => !/acme/.test(l));
        const antes = lineas(sin);
        let j = 0;
        for (const l of antes) {
            while (j < conSinAcme.length && conSinAcme[j] !== l) j++;
            expect(j).toBeLessThan(conSinAcme.length);
            j++;
        }
    });
    it('varios paquetes: por nombre de paquete, sin importar el orden en que se pasan', () => {
        const a = defineExtension({ components: { 'aa-one': { roots: ['aa-one'], css: '@utility ts-aa-one { display: flex; gap: var(--ts-gap-half); }' } } });
        const b = defineExtension({ components: { 'bb-two': { roots: ['bb-two'], css: '@utility ts-bb-two { display: flex; gap: var(--ts-gap-half); }' } } });
        for (const ext of [{ '@a/ui': a, '@b/ui': b }, { '@b/ui': b, '@a/ui': a }]) {
            const css = compile(configMinima(), [], { extensions: ext }).css;
            expect(css.indexOf('.aa-one')).toBeGreaterThan(-1);
            expect(css.indexOf('.aa-one')).toBeLessThan(css.indexOf('.bb-two'));
        }
    });
});

describe('a demanda', () => {
    it('sin usar acme no entra ni un byte', () => {
        const sin = aDemanda('ts button variant-primary');
        const con = aDemanda('ts button variant-primary', extensions);
        expect(con.css).toBe(sin.css);
        expect(con.css).not.toContain('acme');
    });
    it('usar un bloque trae el principal del componente y no los secundarios sin nombrar, ni la utilidad suelta', () => {
        const css = aDemanda('ts acme-tile', extensions).css;
        expect(css).toContain(':where(.ts).acme-card {');
        expect(css).not.toContain(':where(.ts).acme-card-title {');
        expect(css).toContain(':where(.ts).acme-tile {');
        expect(aDemanda('ts acme-tile acme-card-title', extensions).css).toContain(':where(.ts).acme-card-title {');
        expect(css).not.toContain('acme-glow');
    });
    it('el gancho data-ts-<slug> también trae el componente', () => {
        const css = aDemanda('ts" data-ts-acme-card="x', extensions).css;
        expect(css).toContain(':where(.ts).acme-card {');
    });
    it('el safelist por nombre de componente lo trae entero', () => {
        const r = compile(configMinima({ safelist: ['acme-card'] }), [], { onDemand: true, extensions });
        expect(r.css).toContain(':where(.ts).acme-tile {');
    });
    it('una utilidad suelta entra por clase usada, con variantes como las del Core', () => {
        const r = aDemanda('ts md:acme-glow hover:acme-glow', extensions);
        expect(r.css).toContain('@media (width >= 48rem) {\n  :where(.ts).md\\:acme-glow {\n  box-shadow: var(--ts-shadow-md);');
        expect(r.css).toContain('@media (hover: hover) {\n  :where(.ts).hover\\:acme-glow:hover {\n  box-shadow: var(--ts-shadow-md);');
        expect(r.variants).toEqual(['md:acme-glow', 'hover:acme-glow']);
        expect(r.css).not.toContain(':where(.ts).acme-card');
        expect(aDemanda('ts acme-glow', extensions).css).toContain(':where(.ts).acme-glow {\n  box-shadow: var(--ts-shadow-md);');
    });
    it('un componente de la extensión no lleva variantes: avisa como los del Core', () => {
        const r = aDemanda('ts md:acme-card', extensions);
        expect(r.warnings).toEqual([{ code: 'variant-on-component', params: { class: 'md:acme-card', variants: ['md:'], component: 'acme-card' }, file: 'a.html' }]);
        expect(r.variants).toEqual([]);
    });
});

describe('los tokens', () => {
    it('salen en el tema como --ts-<primera raíz>-<clave>, después de los del Core', () => {
        const css = buildTokensCSS(tema().model);
        expect(css).toContain('  --ts-acme-card-pad: 12px;\n  --ts-acme-card-hover: var(--color-gray-100);\n  --ts-acme-card-accent: #ff00aa;\n');
        expect(css.indexOf('--ts-acme-card-pad')).toBeGreaterThan(css.indexOf('--ts-screen-'));
        expect(css.indexOf('--ts-acme-card-pad')).toBeLessThan(css.indexOf('--ts-contrast-threshold'));
    });
    it('el tema los cambia con themes.<t>.components[slug]', () => {
        const config = configMinima({ themes: { taisho: { colors: { brand: '#4F46E5' }, components: { 'acme-card': { pad: '20px' } } } } });
        const css = buildTokensCSS(tema(config).model);
        expect(css).toContain('--ts-acme-card-pad: 20px;');
        expect(css).toContain('--ts-acme-card-hover: var(--color-gray-100);');
    });
    it('un tema `locked` los ignora, como a todos sus overrides', () => {
        const config = configMinima({ themes: { taisho: { colors: { brand: '#4F46E5' }, locked: true, components: { 'acme-card': { pad: '20px' } } } } });
        expect(buildTokensCSS(tema(config).model)).toContain('--ts-acme-card-pad: 12px;');
    });
    it('el mismo modelo sale en el DTCG, en el grupo components.<slug>', () => {
        const { v, model } = tema();
        const dtcg = buildDtcg(v.themeEntries[0], model) as Record<string, Record<string, Record<string, unknown>>>;
        expect(dtcg.components['acme-card'].pad).toEqual({ $type: 'dimension', $value: { value: 12, unit: 'px' } });
        expect(dtcg.components['acme-card'].hover).toEqual({ $type: 'color', $value: '{color.gray.100}' });
        expect(dtcg.components['acme-card'].accent).toEqual({ $type: 'color', $value: '#ff00aa' });
    });
    it('un componente sin tokens no deja grupo', () => {
        const sinTokens = defineExtension({ components: { 'acme-x': { roots: ['acme-x'], css: '@utility ts-acme-x { display: flex; }' } } });
        const { v, model } = tema(configMinima(), { [P]: sinTokens });
        expect(model.components).toEqual({});
        expect(Object.keys(buildDtcg(v.themeEntries[0], model))).not.toContain('components');
    });
});

describe('las utilidades del consumidor con la extensión', () => {
    it('pueden componer una utilidad de la extensión', () => {
        const config = configMinima({ utilities: { 'mi-tarjeta': ['acme-glow', 'p-base'] } });
        expect(() => deriveThemeVocabulary(config, extensions)).not.toThrow();
        const css = compile(config, html('ts mi-tarjeta'), { onDemand: true, extensions }).css;
        expect(css).toMatch(/\.mi-tarjeta \{[^}]*box-shadow: var\(--ts-shadow-md\);/);
    });
});
