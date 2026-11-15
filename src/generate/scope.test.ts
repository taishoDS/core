// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { compile } from './compile';
import { defineExtension } from './extension';
import { buildFlatCSS } from './emit-flat';
import { buildAtomicCSS } from './emit-atomic';
import { buildUtilitiesCSS } from './emit-utilities';
import { buildComponentsCSS } from './emit-components';
import { buildVocabularyColors } from '../config/scales';
import { deriveThemeVocabulary } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';
import type { TaishoConfig } from './vocabulary';

const repo = buildRepoConfig();
const configScope: TaishoConfig = {
    ...repo,
    extend: { screens: { '2xl': '1536px' } },
    utilities: { 'card-hero': ['p-double', 'radius-lg'], 'card-wide': ['card-hero', 'w-full'] },
};
const markup = '<p class="ts md:hidden 2xl:hidden md:card-hero md:ts-flex md:ms-half 2xl:card-hero">';
const markupConTs = '<p class="md:ts-hidden 2xl:ts-hidden md:card-hero md:ts-ms-half 2xl:card-hero">';
const scope = compile(configScope, [{ file: 'a.html', content: markup }]);
const css = scope.css;

interface Nodo { prelude: string; hijos: Nodo[] }

function parsear(fuente: string): Nodo[] {
    const src = fuente.replace(/\/\*[\s\S]*?\*\//g, '');
    const raiz: Nodo = { prelude: '', hijos: [] };
    const pila = [raiz];
    let ini = 0;
    let parens = 0;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (c === '"' || c === "'") { for (i++; src[i] !== c; i++) if (src[i] === '\\') i++; }
        else if (c === '(') parens++;
        else if (c === ')') parens--;
        else if (parens === 0 && c === ';') ini = i + 1;
        else if (parens === 0 && c === '{') {
            const n: Nodo = { prelude: src.slice(ini, i).trim(), hijos: [] };
            pila[pila.length - 1].hijos.push(n);
            pila.push(n);
            ini = i + 1;
        } else if (parens === 0 && c === '}') { pila.pop(); ini = i + 1; }
    }
    return raiz.hijos;
}

const partirComas = (s: string) => {
    const out: string[] = [];
    let d = 0;
    let ini = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') d++;
        else if (s[i] === ')') d--;
        else if (s[i] === ',' && d === 0) { out.push(s.slice(ini, i).trim()); ini = i + 1; }
    }
    out.push(s.slice(ini).trim());
    return out;
};

type Esp = [number, number, number];
const mayor = (a: Esp, b: Esp): Esp => ((a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) >= 0 ? a : b);

function especificidad(sel: string): Esp {
    let resto = sel.replace(/\\[0-9a-f]{1,6} ?|\\./gi, 'x');
    let acc: Esp = [0, 0, 0];
    for (;;) {
        const m = /:(where|is|not|has)\(/.exec(resto);
        if (!m) break;
        let d = 1;
        let j = m.index + m[0].length;
        for (; j < resto.length && d > 0; j++) d += resto[j] === '(' ? 1 : resto[j] === ')' ? -1 : 0;
        const args = resto.slice(m.index + m[0].length, j - 1);
        if (m[1] !== 'where') {
            const mx = partirComas(args).map(especificidad).reduce(mayor);
            acc = [acc[0] + mx[0], acc[1] + mx[1], acc[2] + mx[2]];
        }
        resto = resto.slice(0, m.index) + ' ' + resto.slice(j);
    }
    const cuenta = (re: RegExp) => (resto.match(re) ?? []).length;
    const ids = cuenta(/#[\w-]+/g);
    const clases = cuenta(/\.[\w-]+/g) + cuenta(/\[[^\]]*\]/g) + cuenta(/(?<!:):[a-z-]+/g);
    const tipos = cuenta(/(?:^|[\s>+~])[a-z][\w-]*/g) + cuenta(/::[a-z-]+/g);
    return [acc[0] + ids, acc[1] + clases, acc[2] + tipos];
}

function reglasTope(nodos: Nodo[], out: Nodo[] = []): Nodo[] {
    for (const n of nodos) {
        if (!n.prelude.startsWith('@')) out.push(n);
        else if (!n.prelude.startsWith('@keyframes')) reglasTope(n.hijos, out);
    }
    return out;
}

const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

describe('scope: salida', () => {
    it('no queda ninguna clase `ts-` (fuera de comentarios); los tokens `--ts-*` y @keyframes no cambian', () => {
        expect(sinComentarios(css).match(/\.ts-[A-Za-z]/g)).toBeNull();
        expect(css).toContain('var(--ts-');
    });
    it('los nombres viejos no existen; los vigentes salen sin ts-', () => {
        expect(css).toContain(':where(.ts).ms-half {');
        expect(css).not.toMatch(/\.ml-half\b/);
        expect(css).toContain(':where(.ts).button {');
        expect(css).toContain(':where(.ts).bg-gray-100 {');
        expect(css).toContain(':where(.ts).w-1\\/4 {');
        expect(css).not.toContain('-negative {');
        expect(css).not.toContain('outline-focus');
    });
    it('formas: modificador anidado, screen, screen de extend, container', () => {
        expect(css).toMatch(/:where\(\.ts\)\.button \{[\s\S]*?\n {2}&\.variant-primary(, [^{]*)? \{/);
        expect(css).toContain('@media (width >= 48rem) {');
        expect(css).toContain(':where(.ts).md\\:hidden {');
        expect(css).toContain(':where(.ts).\\32 xl\\:hidden {');
        expect(css).toMatch(/@container \(width >= 28rem\) \{\n(?: .*\n)*? {2}:where\(\.ts\)\.\\@md\\:grid-cols-1 \{/);
    });
    it('el markup con md:ts-* se ignora; md:ms-half sale (con el selector nuevo)', () => {
        expect(scope.variants).toEqual(['md:hidden', '2xl:hidden', 'md:card-hero', 'md:ms-half', '2xl:card-hero']);
        expect(compile(configScope, [{ file: 'a.html', content: markupConTs }]).variants).toEqual(['md:card-hero', '2xl:card-hero']);
        expect(css).toContain(':where(.ts).md\\:ms-half {');
        expect(css).not.toContain('md\\:ts-');
    });
    it('el ancestro `ts` se resuelve: la densidad del contexto y las referencias anidadas', () => {
        expect(css).toContain(':where(.ts).compact &:not(.is-comfortable) :where(.ts).table-th');
    });
    it('la referencia a otra clase en el mismo elemento (`&.ts-x`) de una extensión pierde el `ts-` y pasa a :where(.ts)', () => {
        const extensions = { acme: defineExtension({ components: { acme: { roots: ['acme'], css: '@utility ts-acme { &.ts-acme-mark { color: var(--color-gray-1000); } }\n@utility ts-acme-mark { color: var(--color-gray-1000); }\n' } } }) };
        expect(compile(configScope, [], { extensions }).css).toContain('&:where(.ts).acme-mark');
    });
    it('las utilidades propias salen sin :where(.ts) y componen con nombres cortos', () => {
        expect(css).toMatch(/\n\.card-hero \{/);
        expect(css).toContain('.md\\:card-hero {');
        expect(css).toContain('.\\32 xl\\:card-hero {');
        expect(css).not.toContain(':where(.ts).card-hero');
        const regla = (sel: string) => css.match(new RegExp(`\\n${sel.replaceAll('\\', '\\\\')} \\{[^}]*\\}`))![0];
        expect(regla('.card-hero')).toContain('padding: var(--ts-space-double)');
        expect(regla('.card-hero')).toContain('border-radius: var(--ts-radius-lg)');
        expect(regla('.card-wide')).toContain('padding: var(--ts-space-double)');
        expect(regla('.card-wide')).toContain('width: 100%');
    });
});

describe('scope: especificidad', () => {
    it('cada regla de primer nivel del DS pesa una clase (0,1,0), y las propias también', () => {
        const tope = reglasTope(parsear(css));
        expect(tope.length).toBeGreaterThan(2900);
        const distintas = tope
            .map((r) => partirComas(r.prelude).map((sel) => `${sel} => ${especificidad(sel).join('.')}`))
            .flat()
            .filter((x) => !x.endsWith('=> 0.1.0'))
            .filter((x) => !/^:where\(\.ts\)\.(?:hover|focus|focus-visible|active|disabled|checked|invalid|aria-[a-z]+|data-[a-z-]+|group-[^ ]+|peer-[^ ]+)\\:.* => 0\.2\.0$/.test(x));
        expect(distintas.filter((x) => x.includes(':where(.ts)'))).toEqual([]);
    });
    it('el calculador mide lo que debe', () => {
        expect(especificidad(':where(.ts).button').join('.')).toBe('0.1.0');
        expect(especificidad(':where(.ts).button.variant-primary').join('.')).toBe('0.2.0');
        expect(especificidad(':is(.a, .b.c)').join('.')).toBe('0.2.0');
        expect(especificidad(':is(.b.c, .a)').join('.')).toBe('0.2.0');
        expect(especificidad(':not(.x, #y)').join('.')).toBe('1.0.0');
        expect(especificidad(':where(.ts).compact :where(.ts).table-th.is-compact').join('.')).toBe('0.3.0');
    });
});

describe('scope: buildFlatCSS', () => {
    const v = deriveThemeVocabulary(repo);
    const base = {
        reset: '',
        atomic: buildAtomicCSS(buildVocabularyColors(v.userColors, v.userStates), v.userGridMins, v.userScales),
        utilities: buildUtilitiesCSS(),
        components: buildComponentsCSS(v.userColors, v.userStates, v.userScales),
        scales: v.userScales,
    };
    it('deriva el alias adentro: las renombradas salen con su nombre nuevo, no se pierden', () => {
        const css = buildFlatCSS(base);
        expect(css).toContain(':where(.ts).ms-half {');
        expect(css).not.toMatch(/\.ml-half\b/);
    });
    it('un selector con `.ts-` entre comillas o comentarios no se reescribe', () => {
        const extra = '\n@utility ts-demo {\n  &[x=".ts-a"] { color: red; }\n  /* .ts-b */ & .ts-demo-part { color: blue; }\n}\n@utility ts-demo-part { color: red; }\n';
        const css = buildFlatCSS({ ...base, components: base.components + extra });
        expect(css).toContain('&[x=".ts-a"] {');
        expect(css).toContain('/* .ts-b */ & :where(.ts).demo-part {');
    });
});

describe('sin clásico: lo emitido no tiene selectores `.ts-`', () => {
    const RAIZ = path.resolve(__dirname, '../..');
    const sinCom = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectoresTs = (c: string) => sinCom(c).match(/(?<![\w-])\.ts-[A-Za-z]/g) ?? [];

    it('taisho.full.css y todos los tokens/*.css, sin ningún `.ts-x`', () => {
        expect(selectoresTs(fs.readFileSync(path.join(RAIZ, 'src/lib/css/taisho.full.css'), 'utf8'))).toEqual([]);
        const dir = path.join(RAIZ, 'src/lib/css/tokens');
        const temas = fs.readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.css'));
        expect(temas.length).toBeGreaterThan(0);
        for (const t of temas) expect(selectoresTs(fs.readFileSync(path.join(dir, t), 'utf8')), t).toEqual([]);
    });
    it('aliases.css ya no existe y utilities.css no lo importa', () => {
        expect(fs.existsSync(path.join(RAIZ, 'src/lib/css/aliases.css'))).toBe(false);
        expect(fs.readFileSync(path.join(RAIZ, 'src/lib/css/utilities.css'), 'utf8')).not.toContain('aliases.css');
    });
});
