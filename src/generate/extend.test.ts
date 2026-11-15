// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { compile } from './compile';
import { extraerVariantes } from './emit-flat';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildRepoConfig } from '../config/pipeline';

const RAIZ = path.resolve(__dirname, '../..');
const repo = buildRepoConfig();
const base: TaishoConfig = { ...repo, themes: { ...repo.themes, mio: { colors: { brand: '#3b82f6', marca2: '#ff6600' } } } };
const con = (extra: Partial<TaishoConfig>): TaishoConfig => ({ ...base, ...extra });

function tokensDe(config: TaishoConfig, clave: string): string {
    const v = deriveThemeVocabulary(config);
    const entry = v.themeEntries.find((e) => e.name === clave)!;
    return buildTokensCSS(resolveThemeTokens(entry, v.userFonts, v.defaultStates, v.userScales));
}

describe('extend.screens', () => {
    const config = con({ extend: { screens: { '2xl': '1536px', xs: '480px' } } });
    const css = compile(config, [{ file: 'a.svelte', content: '<div class="ts 2xl:flex xs:hidden">' }]).css;

    it('emite el @media DESPUÉS del de 80rem, y un xs ANTES del de sm', () => {
        const i = (s: string) => css.indexOf(s);
        expect(i('@media (width >= 96rem)')).toBeGreaterThan(i('@media (width >= 80rem)'));
        expect(i('@media (width >= 30rem)')).toBeGreaterThan(-1);
        expect(i('@media (width >= 30rem)')).toBeLessThan(i('@media (width >= 40rem)'));
    });
    it('escapa el dígito inicial: .\\32 xl\\:flex', () => {
        expect(css).toContain(':where(.ts).\\32 xl\\:flex {');
    });
    it('genera max-w-screen-2xl', () => {
        expect(css).toContain(':where(.ts).max-w-screen-2xl {');
    });
    it('--ts-screen-2xl en TODOS los temas, también los locked', () => {
        const v = deriveThemeVocabulary(config);
        expect(v.themeEntries.some((e) => e.def.locked)).toBe(true);
        for (const e of v.themeEntries) expect(tokensDe(config, e.name)).toContain('--ts-screen-2xl: 1536px;');
    });
    it('compile devuelve sólo las variantes de screens vigentes', () => {
        const f = { file: 'a.svelte', content: '2xl:flex 3xl:flex bind:value class:active md:hidden' };
        expect(compile(config, [f]).variants).toEqual(['2xl:flex', 'md:hidden']);
        expect(compile(repo, [f]).variants).toEqual(['md:hidden']);
    });
});

describe('extend.radius / extend.spacing', () => {
    const config = con({
        extend: { radius: { card: '20px' }, spacing: { gaps: { loose: '40px' }, spaces: { loose: '48px' } } },
    });
    it('radius: radius-card y --ts-radius-card en todos los temas; el tema lo pisa sólo en él', () => {
        const css = compile(config, []).css;
        expect(css).toContain(':where(.ts).radius-card {');
        const nombres = deriveThemeVocabulary(config).themeEntries.map((e) => e.name);
        for (const n of nombres) expect(tokensDe(config, n)).toContain('--ts-radius-card: 20px;');
        const libre = 'mio';
        const themes = { ...config.themes, mio: { ...config.themes.mio, radius: { card: '2px' } } };
        const pisado = { ...config, themes };
        expect(tokensDe(pisado, libre)).toContain('--ts-radius-card: 2px;');
        for (const n of nombres.filter((x) => x !== libre)) expect(tokensDe(pisado, n)).toContain('--ts-radius-card: 20px;');
    });
    it('gaps y spaces: tokens y familias de clases', () => {
        const css = compile(config, []).css;
        for (const c of ['gap-loose', 'gap-x-loose', 'p-loose', 'mt-loose', 'top-loose', 'm-neg-loose']) {
            expect(css).toContain(`:where(.ts).${c} {`);
        }
        expect(tokensDe(config, deriveThemeVocabulary(config).themeEntries[0].name)).toContain('--ts-gap-loose: 40px;');
    });
    it('los spaces propios salen con el nombre vigente: lado lógico y neg- (E1b)', () => {
        const css = compile(config, []).css;
        expect(css).toContain(':where(.ts).ms-loose {');
        expect(css).toContain(':where(.ts).mt-neg-loose {');
        expect(css).toContain(':where(.ts).ps-loose {');
        expect(css).not.toMatch(/\.(ml|pl)-loose\b|loose-negative/);
    });
    it('los gaps propios no se compactan con compact', () => {
        const t = tokensDe(config, deriveThemeVocabulary(config).themeEntries[0].name);
        const idx = t.indexOf(':where(.ts).compact');
        expect(idx).toBeGreaterThan(-1);
        expect(t.slice(idx)).not.toContain('loose');
    });
});

describe('utilities componiendo clases de extend', () => {
    it('una utilidad puede componer radius-card definido en extend.radius y sale expandida', () => {
        const config = con({ extend: { radius: { card: '20px' } }, utilities: { hero: ['radius-card', 'p-double'] } });
        const css = compile(config, []).css;
        expect(css).toMatch(/\n\.hero \{[^}]*border-radius: var\(--ts-radius-card\)/);
        expect(css).not.toContain('@apply');
    });
});

describe('utilities', () => {
    const config = con({
        extend: { screens: { '2xl': '1536px' } },
        utilities: { 'card-hero': ['p-double', 'radius-lg'], 'hero-x': ['card-hero', 'flex'] },
    });
    const css = compile(config, []).css;
    it('sale expandida y con todos los screens, sin importar el orden de declaración', () => {
        expect(css).toMatch(/\n\.card-hero \{[^}]*padding: var\(--ts-space-double\)/);
        expect(css).toMatch(/\n\.hero-x \{[^}]*padding: var\(--ts-space-double\)[^}]*display: flex/s);
        for (const p of ['sm', 'md', 'lg', 'xl', '2xl']) {
            expect(css).toContain(p === '2xl' ? '.\\32 xl\\:card-hero {' : `.${p}\\:card-hero {`);
        }
        expect(css).not.toContain('@apply');
    });
    it('el markup con md:card-hero se reporta como variante', () => {
        expect(compile(config, [{ file: 'a.html', content: '<p class="md:card-hero md:nada">' }]).variants).toEqual(['md:card-hero']);
    });
});

describe('validación (deriveThemeVocabulary)', () => {
    const falla = (extra: Partial<TaishoConfig>, re: RegExp) => expect(() => deriveThemeVocabulary(con(extra))).toThrow(re);

    it('screens: nombre inválido', () => falla({ extend: { screens: { huge: '1px' } } }, /^taisho config: extend\.screens\.huge /));
    it('screens: nombre ya existente', () => falla({ extend: { screens: { sm: '100px' } } }, /extend\.screens\.sm ya existe en el DS\. El corte de un screen de fábrica \(los @media\) es fijo; themes\.<tema>\.screens\.sm sólo cambia el token --ts-screen-sm y ts-max-w-screen-sm\./));
    it('screens: valor no px', () => falla({ extend: { screens: { '2xl': '96rem' } } }, /extend\.screens\.2xl tiene un valor inválido/));
    it('screens: px repetido', () => falla({ extend: { screens: { '2xl': '640px' } } }, /extend\.screens\.2xl repite el ancho 640px de screens\.sm/));
    it('screens: px repetido entre propios', () => falla({ extend: { screens: { '2xl': '1500px', '3xl': '1500px' } } }, /extend\.screens\.3xl repite/));

    it('spaces: empieza con neg- (lo usan los negativos)', () => falla({ extend: { spacing: { spaces: { 'neg-1': '1px' } } } }, /extend\.spacing\.spaces\.neg-1 no puede empezar con "neg-"/));
    it('utilities: puede componer los nombres vigentes, también los de extend', () => {
        const config = con({ extend: { spacing: { spaces: { loose: '48px' } } }, utilities: { 'card-hero': ['ms-half', 'align-center', 'ms-loose', 'mt-neg-loose'] } });
        expect(() => deriveThemeVocabulary(config)).not.toThrow();
        const css = compile(config, []).css;
        expect(css).toMatch(/^\.card-hero \{[^}]*margin-inline-start: var\(--ts-space-half\)/m);
    });
    it('radius: nombre inválido', () => falla({ extend: { radius: { Card: '1px' } } }, /extend\.radius\.Card es un nombre inválido/));
    it('radius: ya existe (mensaje exacto)', () =>
        expect(() => deriveThemeVocabulary(con({ extend: { radius: { md: '1px' } } }))).toThrow(
            'taisho config: extend.radius.md ya existe en el DS. Para cambiar su valor se usa themes.<tema>.radius.md.',
        ));
    it('radius: valor vacío', () => falla({ extend: { radius: { card: ' ' } } }, /extend\.radius\.card tiene un valor vacío/));
    it('radius: valor con ; { }', () => {
        for (const v of ['1px; color: red', '1px}', '{1px']) falla({ extend: { radius: { card: v } } }, /extend\.radius\.card tiene un valor inválido/);
    });
    it('gaps: ya existe', () => falla({ extend: { spacing: { gaps: { base: '1px' } } } }, /themes\.<tema>\.spacing\.gaps\.base/));
    it('gaps: nombre inválido', () => falla({ extend: { spacing: { gaps: { 'a_b': '1px' } } } }, /extend\.spacing\.gaps\.a_b es un nombre inválido/));
    it('spaces: termina en -negative', () => falla({ extend: { spacing: { spaces: { 'big-negative': '1px' } } } }, /extend\.spacing\.spaces\.big-negative no puede terminar en "-negative"/));
    it('spaces: la clase generada ya existe (16 pisa ts-top-16)', () =>
        falla({ extend: { spacing: { spaces: { '16': '1px' } } } }, /extend\.spacing\.spaces\.16 genera la clase ts-[a-z-]+-16, que ya existe/));
    it('radius: la clase generada ya existe (l-inherit)', () =>
        falla({ extend: { radius: { 'l-inherit': '1px' } } }, /extend\.radius\.l-inherit genera la clase ts-radius-l-inherit/));
    it('una config válida no choca con los nombres del DS ni con sus alias', () => {
        expect(() => deriveThemeVocabulary(con({ extend: { radius: { card: '1px' } } }))).not.toThrow();
    });

    it('gaps: dos propios generan la misma clase (foo y x-foo -> ts-gap-x-foo)', () =>
        falla({ extend: { spacing: { gaps: { foo: '1px', 'x-foo': '2px' } } } }, /extend\.spacing\.gaps\.x-foo genera la clase ts-gap-x-foo, que también genera extend\.spacing\.gaps\.foo/));
    it('valores: rechaza comentarios, barra invertida y saltos de línea', () => {
        for (const v of ['1px /* x', '1px */', 'a\\b', '1px\n2px', '1px\r']) falla({ extend: { radius: { card: v } } }, /extend\.radius\.card tiene un valor inválido/);
    });
    it('screens: xs/2xs tienen que ser menores que sm; 2xl/3xl mayores que xl y crecientes', () => {
        falla({ extend: { screens: { xs: '700px' } } }, /extend\.screens\.xs tiene un ancho incoherente con su nombre: xs tiene que ser menor que el screen de fábrica más chico \(640px\)/);
        falla({ extend: { screens: { '2xl': '1100px' } } }, /extend\.screens\.2xl tiene un ancho incoherente.*mayor que el screen de fábrica más grande \(1280px\)/);
        falla({ extend: { screens: { '2xl': '1600px', '3xl': '1500px' } } }, /extend\.screens\.(2xl|3xl) tiene un ancho incoherente.*(mayor|menor) que (2xl|3xl)/);
        falla({ extend: { screens: { xs: '400px', '2xs': '450px' } } }, /extend\.screens\.(xs|2xs) tiene un ancho incoherente/);
        expect(() => deriveThemeVocabulary(con({ extend: { screens: { '2xs': '320px', xs: '480px', '2xl': '1536px', '3xl': '1920px' } } }))).not.toThrow();
    });
    it('utilities: nombre inválido', () => falla({ utilities: { 'Card': ['flex'] } }, /utilities\.Card es un nombre inválido/));
    it('utilities: empieza con ts-', () => falla({ utilities: { 'ts-mio': ['flex'] } }, /utilities\.ts-mio .*no puede empezar con "ts-"/));
    it('utilities: ts-flex -> prefijo reservado', () => falla({ utilities: { 'ts-flex': ['block'] } }, /utilities\.ts-flex es un nombre inválido: no puede empezar con "ts-"/));
    it('utilities: lista vacía', () => falla({ utilities: { tarjeta: [] } }, /utilities\.tarjeta tiene una lista de clases vacía/));
    it('utilities: clase desconocida', () => falla({ utilities: { tarjeta: ['ts-nada'] } }, /utilities\.tarjeta compone "ts-nada", que no existe/));
    it('utilities: clase con variante (la variante se valida; ver propias-variantes.test.ts)', () => {
        expect(() => deriveThemeVocabulary(con({ utilities: { tarjeta: ['md:flex', 'hover:p-base'] } }))).not.toThrow();
        falla({ utilities: { tarjeta: ['md:nada'] } }, /utilities\.tarjeta compone "md:nada", que no existe/);
    });
    it('utilities: sugiere la clase más cercana ("¿Se quiso decir…?")', () =>
        falla({ extend: { radius: { card: '1px' } }, utilities: { hero: ['radius-crad'] } }, /compone "radius-crad", que no existe.*¿Se quiso decir "radius-card"\?/));
    it('utilities: sin candidato claro no sugiere', () => {
        expect(() => deriveThemeVocabulary(con({ utilities: { hero: ['zzzzzzzz'] } }))).toThrow(/ni entre tus utilities\.$/);
    });
    it('utilities: ciclo', () => falla({ utilities: { a: ['b'], b: ['a'] } }, /utilities\.a tiene un ciclo entre utilidades propias: a → b → a\./));
});

describe('regresión: colores nuevos por tema', () => {
    it('marca2 (sólo en un tema) genera sus clases', () => {
        const css = compile(base, []).css;
        expect(css).toContain(':where(.ts).bg-marca2-500 {');
        expect(css).toContain(':where(.ts).bg-marca2-100 {');
    });
});

describe('extractor de variantes', () => {
    const viejo = (c: string) => [...new Set([...c.matchAll(/(?<![@:-])\b((?:sm|md|lg|xl):ts-[a-z0-9-]+)\b/g)].map((m) => m[1]))];
    const vigente = (v: string) => /^(?:sm|md|lg|xl):ts-/.test(v);

    it('filtrado por sm|md|lg|xl da la misma lista y el mismo orden que el regex de antes (src completo)', () => {
        const files: string[] = [];
        const rec = (d: string) => {
            for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                const p = path.join(d, e.name);
                if (e.isDirectory()) rec(p);
                else if (/\.(svelte|ts|html|css|md)$/.test(p)) files.push(p);
            }
        };
        rec(path.join(RAIZ, 'src'));
        expect(files.length).toBeGreaterThan(100);
        let total = 0;
        for (const f of files) {
            const c = fs.readFileSync(f, 'utf8');
            const nuevo = extraerVariantes(c).filter(vigente);
            expect(nuevo, f).toEqual(viejo(c));
            total += nuevo.length;
        }
        expect(total).toBeGreaterThan(0);
    });
    it('captura variantes con screens nuevos y utilidades propias; una cadena es una sola variante', () => {
        expect(extraerVariantes('2xl:ts-flex md:card-hero md:foo-sm:ts-hidden')).toEqual(['2xl:ts-flex', 'md:card-hero', 'md:foo-sm:ts-hidden']);
    });
});
