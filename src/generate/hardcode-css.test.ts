// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { RESET_FOCO } from './foco';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const tokens = read('../lib/css/tokens/taisho.css');
const atomic = read('../lib/css/atomic.css');
const components = read('../lib/css/components.css');
const reset = read('../lib/css/reset.css');

const EMISORES = fs
    .readdirSync(__dirname)
    .filter((f) => /^emit-.*\.ts$/.test(f) && !/\.test\.ts$/.test(f) && f !== 'emit-dtcg.ts');
const lineasDe = (f: string) =>
    read(f)
        .split('\n')
        .map((texto, i) => ({ f, n: i + 1, texto }))
        .filter((l) => !/^\s*\/\//.test(l.texto));
const TODAS = EMISORES.flatMap(lineasDe);

const sinExcepcion = (re: RegExp, excepciones: string[] = []) =>
    TODAS.filter((l) => re.test(l.texto) && !excepciones.some((e) => l.texto.includes(e))).map(
        (l) => `${l.f}:${l.n}  ${l.texto.trim()}`,
    );

const EXCEPCIONES = {
    srOnly: 'ts-sr-only',
};

describe('Ancho de borde / radio — tokens', () => {
    it('existen --ts-border-width-1..4 y --ts-radius-xs', () => {
        for (const [k, v] of [['1', '1px'], ['2', '2px'], ['3', '3px'], ['4', '4px']])
            expect(tokens).toContain(`--ts-border-width-${k}: ${v};`);
        expect(tokens).toContain('--ts-radius-xs: var(--ts-sizing-2);');
        expect(tokens).toContain('--ts-radius-full: 9999px;');
    });

    it('ts-outline-* usa el ancho de contorno (2) y el nombre dice la verdad', () => {
        expect(atomic).toMatch(/@utility ts-outline-gray-1000 \{ outline: var\(--ts-border-width-2\) solid/);
        expect(atomic).toContain('@utility ts-outline-transparent { outline: var(--ts-border-width-2) solid transparent; }');
        expect(atomic).toContain('@utility ts-outline-4-transparent { outline: var(--ts-border-width-4) solid transparent; }');
    });

    it('el reset y el foco leen los tokens', () => {
        expect(reset).toContain(RESET_FOCO);
        expect(reset).toContain('border-radius: var(--ts-radius-full); border: var(--ts-border-width-2) solid transparent');
    });
});

describe('Ancho de borde / radio — sin literales', () => {
    it('ningún emisor escribe un ancho de borde, contorno o anillo en px', () => {
        const borde = /\b(border[\w-]*|outline)\s*:[^;`]*(?<![\w.-])[1-9]\d*(\.\d+)?px/;
        const anillo = /0 0 0 -?[1-9]\d*(\.\d+)?px/;
        expect(sinExcepcion(borde, [EXCEPCIONES.srOnly])).toEqual([]);
        expect(sinExcepcion(anillo)).toEqual([]);
    });

    it('ningún emisor escribe un radio en px (sólo --ts-radius-*; 50% es una forma, no una medida)', () => {
        expect(sinExcepcion(/radius\s*:[^;`]*(?<![\w.-])[1-9]\d*(\.\d+)?px/)).toEqual([]);
    });

    it('el CSS emitido tampoco', () => {
        for (const [name, css] of Object.entries({ atomic, components, reset })) {
            const lineas = css
                .split('\n')
                .filter((l) => /\b(border[\w-]*|outline)\s*:[^;]*(?<![\w.-])[1-9]\d*px/.test(l) && !l.includes('ts-sr-only'));
            expect({ name, lineas }).toEqual({ name, lineas: [] });
        }
    });
});

const Z = ['base', 'raised', 'pinned', 'handle', 'sticky', 'glow', 'nav', 'banner', 'nav-menu', 'dropdown', 'toast', 'overlay', 'dialog'];
const BLURS = ['none', 'sm', 'md', 'lg', 'xl'];

describe('Blur y z-index — tokens', () => {
    it('existen --ts-blur-* y la escala semántica --ts-z-*', () => {
        for (const k of BLURS) expect(tokens).toMatch(new RegExp(`--ts-blur-${k}: [0-9]+px;`));
        for (const k of Z) expect(tokens).toMatch(new RegExp(`--ts-z-${k}: [0-9]+;`));
    });

    it('la escala de z está ordenada: lo que se apila encima tiene un valor mayor o igual', () => {
        const z = Object.fromEntries(Z.map((k) => [k, Number(tokens.match(new RegExp(`--ts-z-${k}: (\\d+);`))![1])]));
        const orden = ['base', 'raised', 'pinned', 'handle', 'sticky', 'nav', 'banner', 'dropdown', 'dialog'];
        for (let i = 1; i < orden.length; i++) expect(z[orden[i]!]!).toBeGreaterThan(z[orden[i - 1]!]!);
        expect(z.dialog).toBeGreaterThan(z.overlay!);
        expect(z.glow).toBeGreaterThan(z.raised!);
    });

    it('ts-backdrop-blur-* y ts-blur-* leen los tokens', () => {
        for (const k of BLURS.filter((k) => k !== 'none')) {
            expect(atomic).toContain(`@utility ts-backdrop-blur-${k} { -webkit-backdrop-filter: blur(var(--ts-blur-${k})); backdrop-filter: blur(var(--ts-blur-${k})); }`);
            expect(atomic).toContain(`@utility ts-blur-${k} { filter: blur(var(--ts-blur-${k})); }`);
        }
    });

    it('el telón de Modal/Drawer se anima entre transparent y el overlay, con blur de token', () => {
        expect(components).toContain('&[open]::backdrop { background-color: var(--color-overlay-100); -webkit-backdrop-filter: blur(var(--ts-blur-sm)); backdrop-filter: blur(var(--ts-blur-sm));');
        expect(components).toContain('&::backdrop { background-color: transparent; -webkit-backdrop-filter: blur(var(--ts-blur-none)); backdrop-filter: blur(var(--ts-blur-none));');
        expect(components).not.toContain('rgb(0 0 0 / 0)');
    });

    it('la paleta de comandos usa la capa dialog y su telón la capa overlay', () => {
        expect(components).toMatch(/@utility ts-command \{[\s\S]*?z-index: var\(--ts-z-dialog\);/);
        expect(components).toMatch(/@utility ts-command-overlay \{[\s\S]*?z-index: var\(--ts-z-overlay\);/);
    });
});

describe('Blur y z-index — sin literales', () => {
    it('ningún emisor escribe blur(N), z-index numérico ni ts-z-N (sí el escalón ts-z-${z} de atomic y ts-z-auto)', () => {
        expect(sinExcepcion(/blur\(\s*[0-9]/)).toEqual([]);
        expect(sinExcepcion(/z-index\s*:\s*-?\d/)).toEqual([]);
        expect(sinExcepcion(/ts-z-\d/)).toEqual([]);
        expect(sinExcepcion(/rgba?\(\s*0[ ,]+0[ ,]+0\s*[/,]\s*0\s*\)/)).toEqual([]);
    });

    it('el CSS de componentes no trae z-index ni blur con número', () => {
        expect(components.split('\n').filter((l) => /z-index\s*:\s*-?\d|blur\(\s*[0-9]/.test(l))).toEqual([]);
    });
});

describe('Opacidad, spotlight y estados del tema', () => {
    it('existen los escalones --ts-opacity-N y el rol muted', () => {
        for (const k of ['0', '30', '40', '50', '60', '70', '75', '80', '90', '100'])
            expect(tokens).toMatch(new RegExp(`--ts-opacity-${k}: [0-9.]+;`));
        expect(tokens).toContain('--ts-opacity-muted: var(--ts-opacity-60);');
    });

    it('ts-opacity-N lee los tokens', () => {
        for (const k of ['0', '50', '100']) expect(atomic).toContain(`@utility ts-opacity-${k} { opacity: var(--ts-opacity-${k}); }`);
        expect(atomic).not.toContain('ts-opacity-muted');
    });

    it('--ts-spotlight-color sale de grayAlpha, no de rgba fijos', () => {
        expect(tokens).toContain('--ts-spotlight-color: light-dark(var(--color-grayAlpha-100), var(--color-grayAlpha-200));');
        expect(tokens).not.toMatch(/spotlight-color: .*rgba/);
    });

    it('los estados custom toman bg/border de su paleta, sin alfas 0.12/0.24 fijos', async () => {
        const { resolveThemeTokens, buildTokensCSS } = await import('./emit-tokens');
        const { defaultStates, userFonts } = await import('../config/taisho.user');
        const entry = { name: 'x', group: 'root' as const, def: { colors: { brand: '#0066ff' }, states: { promo: '#cc3399' } } };
        const css = buildTokensCSS(resolveThemeTokens(entry as never, userFonts, defaultStates));
        expect(css).toContain('--ts-color-promo-bg: var(--color-promo-100);');
        expect(css).toContain('--ts-color-promo-border: var(--color-promo-200);');
        expect(css.split('\n').filter((l) => l.includes('--ts-color-promo-') && l.includes('/ 0.'))).toEqual([]);
    });

    it('el tema puede pisar el spotlight y las opacidades', async () => {
        const { resolveThemeTokens, buildTokensCSS } = await import('./emit-tokens');
        const { defaultStates, userFonts } = await import('../config/taisho.user');
        const entry = {
            name: 'x',
            group: 'root' as const,
            def: { colors: { brand: '#0066ff' }, spotlight: { light: 'var(--color-gray-300)' }, opacities: { muted: '0.5' } },
        };
        const css = buildTokensCSS(resolveThemeTokens(entry as never, userFonts, defaultStates));
        expect(css).toContain('--ts-spotlight-color: light-dark(var(--color-gray-300), var(--color-grayAlpha-200));');
        expect(css).toContain('--ts-opacity-muted: 0.5;');
    });

    it('ningún emisor escribe una opacidad suelta ni el spotlight/alfas de estado en literal', () => {
        const keyframes = ['@keyframes ts-ping', '@keyframes ts-dot-bounce'];
        expect(sinExcepcion(/(?<![\w-])opacity\s*:\s*0?\.\d/, keyframes)).toEqual([]);
        expect(sinExcepcion(/\/ 0\.(12|24)\b/)).toEqual([]);
    });
});

describe('Umbral del Badge y screens', () => {
    it('el umbral del Badge custom sale del token --ts-contrast-threshold (0.56)', () => {
        expect(tokens).toContain('--ts-contrast-threshold: 0.56;');
        expect(components).toContain('calc(clamp(0, (var(--ts-contrast-threshold) - l) * 1000000, 1))');
        expect(components).not.toContain('0.56');
    });

    it('--ts-screen-* y ts-max-w-screen-* los leen; los cortes de componentes salen de la misma escala', () => {
        for (const [k, v] of [['sm', '640px'], ['md', '768px'], ['lg', '1024px'], ['xl', '1280px']]) {
            expect(tokens).toContain(`--ts-screen-${k}: ${v};`);
            expect(atomic).toContain(`@utility ts-max-w-screen-${k} { max-width: var(--ts-screen-${k}); }`);
        }
        expect(components).toContain('@container (width < 640px)');
        expect(components).toContain('@container (width >= 768px)');
        expect(components).toContain('[data-ts-breakpoint="lg"] { @media (width < 1024px)');
    });

    it('el default del grid intrínseco es el paso md de userGridMins', () => {
        expect(atomic).toContain('var(--ts-grid-min, 280px)');
        expect(atomic).toContain('@utility ts-grid-min-md { --ts-grid-min: 280px; }');
    });
});

describe('Umbral del Badge y screens — sin literales', () => {
    it('ningún emisor escribe los anchos en rem de un panel, el umbral, #fff ni breakpoints en px', () => {
        expect(sinExcepcion(/(?<![\w.-])(17|9|12|28)rem/, ["'@md:': '28rem'"])).toEqual([]);
        expect(sinExcepcion(/\(0\.56 - l\)/)).toEqual([]);
        expect(sinExcepcion(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.35\s*\)/)).toEqual([]);
        expect(sinExcepcion(/solid #fff/)).toEqual([]);
        expect(sinExcepcion(/max-width:\s*(640|768|1024|1280)px/)).toEqual([]);
        expect(sinExcepcion(/@(container|media)[^`]*\b(640|768|1024|1280)px/)).toEqual([]);
    });
});

describe('Colores literales — el CSS no los escribe, los tokens sí', () => {
    const LITERAL = new RegExp(
        [
            '#[0-9a-fA-F]{3,8}\\b',
            '\\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(\\s*(?!from\\b)[-+.\\d]',
            '\\b(hsla?|rgba?)\\(\\s*var\\([^)]*\\)\\s*,\\s*\\d',
        ].join('|'),
    );
    const PALABRA = /(?<![\w-])(white|black|red|green|blue|yellow|orange|purple|gray|grey)(?![\w-])\s*[;,)]/;
    const EXC = [
        'radial-gradient(white, black)',
        '@supports (color: contrast-color(red))',
    ];
    const hallazgos = (css: string) =>
        css
            .split('\n')
            .map((texto, i) => ({ n: i + 1, texto }))
            .filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l.texto))
            .filter((l) => (LITERAL.test(l.texto) || PALABRA.test(l.texto)) && !EXC.some((e) => l.texto.includes(e)))
            .map((l) => `${l.n}  ${l.texto.trim().slice(0, 120)}`);

    it('el CSS de componentes (components.css) no escribe ningún color literal', () => {
        expect(hallazgos(components)).toEqual([]);
    });

    it('ni las utilidades (atomic.css)', () => {
        expect(hallazgos(atomic)).toEqual([]);
    });

    it('el detector detecta (hex, funciones con números, palabras)', () => {
        for (const css of ['a { background: #fff; }', 'a { color: rgb(0 0 0 / 0.3); }', 'a { color: hsl(0, 100%, 50%); }', 'a { color: oklch(1 0 0); }', 'a { background: linear-gradient(to top, black, transparent); }'])
            expect(hallazgos(css)).not.toEqual([]);
        for (const css of ['a { color: var(--color-gray-100); }', 'a { color: oklch(from var(--x) 1 0 0); }', 'a { background: hsl(var(--ts-x-hue, 0), var(--ts-a), var(--ts-b)); }'])
            expect(hallazgos(css)).toEqual([]);
    });

    it('los emisores de componentes no escriben hex en una declaración', () => {
        const emisor = lineasDe('emit-components.ts');
        expect(emisor.filter((l) => /:\s*[^;]*#[0-9a-fA-F]{3,6}\b/.test(l.texto)).map((l) => `${l.f}:${l.n}  ${l.texto.trim()}`)).toEqual([]);
    });
});

describe('Motion fuera de la escala', () => {
    it('la escala por defecto es una sola: la de CSS (config/scales) y la de JS son la misma', async () => {
        const { durations } = await import('../config/scales');
        const { durations: portable } = await import('../lib/theme/motion-scale');
        expect(durations).toBe(portable);
    });
});
