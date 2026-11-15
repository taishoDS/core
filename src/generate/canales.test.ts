// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildRepoConfig } from '../config/pipeline';
import { compile, derivarVocabulario } from './compile';
import { canalesDeUtilidad, partirConCanales, propiedadesDeCanales, textoDeFondoEnEstado, textoSobreNeutro } from './canales';
import { effectiveNeutrals } from '../lib/theme/neutrals';
import { oklchToLinSrgb, wcag } from '../lib/theme/color-oracle.test.helper';

const AA = 4.5;

describe('canales: lo que declara la utilidad suelta', () => {
    const existe = (n: string) => /^ts-(bg-(danger|gray)-\d+|bg-background-(100|200)|color-danger-\d+-contrast|bg-brand-solid(-hover|-active)?|color-brand-solid(-hover|-active)?-contrast)$/.test(n);

    it('bg-<tono>: el fondo de hover y active (tono +1 y +2) y el texto de cada uno', () => {
        const css = canalesDeUtilidad('ts-bg-danger-700', 'background-color: var(--color-danger-700);', existe);
        expect(css).toBe(
            '\n  --ts-on-bg: var(--color-danger-700-contrast);\n  --ts-bg-h: var(--color-danger-800);\n  --ts-on-bg-h: var(--color-danger-800-contrast);\n  --ts-bg-a: var(--color-danger-900);\n  --ts-on-bg-a: var(--color-danger-900-contrast);',
        );
    });

    it('el último tono se queda donde está, y un paso que no existe no se declara', () => {
        expect(canalesDeUtilidad('ts-bg-danger-1000', 'background-color: var(--color-danger-1000);', existe)).toContain('--ts-bg-h: var(--color-danger-1000);');
        const fondo = canalesDeUtilidad('ts-bg-background-200', 'background-color: var(--color-background-200);', existe);
        expect(fondo).toBe('\n  --ts-on-bg: var(--color-gray-1000);');
    });

    it('el sólido de marca usa solid-hover y solid-active', () => {
        const css = canalesDeUtilidad('ts-bg-brand-solid', 'background-color: var(--color-brand-solid);', existe);
        expect(css).toContain('--ts-bg-h: var(--color-brand-solid-hover);');
        expect(css).toContain('--ts-on-bg-a: var(--color-brand-solid-active-contrast);');
    });

    it('color-*: la utilidad suelta escribe --ts-fg (con su valor tal cual); lo que no es un color de la escala no lo escribe', () => {
        expect(canalesDeUtilidad('ts-color-gray-100', 'color: var(--color-gray-100);', existe)).toBe('\n  --ts-fg: var(--color-gray-100);');
        expect(canalesDeUtilidad('ts-color-heading', 'color: var(--ts-color-heading, var(--color-gray-1000));', existe)).toBe('\n  --ts-fg: var(--ts-color-heading, var(--color-gray-1000));');
        expect(canalesDeUtilidad('ts-color-scheme-dark', 'color-scheme: dark;', existe)).toBe('');
        expect(canalesDeUtilidad('ts-text-14', 'color: red; font-size: 1px;', existe)).toBe('');
    });

    it('surface y floating suman el fondo y la sombra; shadow sólo la sombra; shadow-none y el resto, nada', () => {
        const surface = canalesDeUtilidad('ts-surface-md', 'border-radius: x; background-color: var(--color-background-100); box-shadow: var(--ts-shadow-md);', existe);
        expect(surface).toContain('--ts-on-bg: var(--color-gray-1000);');
        expect(surface).toContain('--ts-sh: var(--ts-shadow-md);');
        expect(canalesDeUtilidad('ts-shadow-sm', 'box-shadow: var(--ts-shadow-sm);', existe)).toBe('\n  --ts-sh: var(--ts-shadow-sm);');
        expect(canalesDeUtilidad('ts-shadow-none', 'box-shadow: none;', existe)).toBe('');
        expect(canalesDeUtilidad('ts-bg-transparent', 'background: transparent;', existe)).toBe('');
        expect(canalesDeUtilidad('ts-bg-brand-solid-hover', 'background-color: var(--color-brand-solid-hover);', existe)).toBe('');
        expect(canalesDeUtilidad('ts-ring-md', 'box-shadow: var(--ts-shadow-md);', existe)).toBe('');
        expect(canalesDeUtilidad('ts-flex', 'display: flex;', existe)).toBe('');
    });

    it('el @property de cada canal sale sólo si alguna regla lo declara, con el respaldo de Firefox 125–127', () => {
        expect(propiedadesDeCanales(':where(.ts).flex {\n  display: flex;\n}')).toBe('');
        const css = propiedadesDeCanales(':where(.ts).shadow-sm {\n  box-shadow: x;\n  --ts-sh: y;\n}');
        expect(css).toContain("@property --ts-sh { syntax: '*'; inherits: false; }");
        expect(css).not.toContain('--ts-bg-h');
        expect(css).toContain('@supports ((-moz-orient: inline)');
    });
});

describe('canales: lo que leen hover, active y el reposo del componente', () => {
    it('hover y active leen el canal de fondo y de texto; el resto de los estados no se toca', () => {
        const r = partirConCanales(
            ':where(.ts).x {\n  background-color: var(--a);\n  color: var(--b);\n  &:hover:not(:disabled) { background-color: var(--h); color: var(--hc); }\n  &:active { background: var(--p); transform: none; }\n  &:disabled { background-color: var(--d); color: var(--dc); }\n  &:focus-visible { box-shadow: var(--f); }\n  &.is-checked { background-color: var(--c); }\n}',
        );
        expect(r.reposo).toContain('color: var(--ts-on-bg, var(--b));');
        expect(r.reposo).toContain('background-color: var(--a);');
        expect(r.estados).toContain('background-color: var(--ts-bg-h, var(--h)); color: var(--ts-fg, var(--ts-on-bg-h, var(--hc)));');
        expect(r.estados).toContain('background: var(--ts-bg-a, var(--p)); transform: none;');
        expect(r.estados).toContain('background-color: var(--d); color: var(--dc);');
        expect(r.estados).toContain('background-color: var(--c);');
        expect(r.estados).not.toMatch(/--ts-bg-h[^}]*--d/);
    });

    it('un color de texto pedido gana en hover y active; los estados que duran (disabled, selected, checked…) no lo leen', () => {
        const r = partirConCanales(
            ':where(.ts).x {\n  background-color: var(--a);\n  &:hover { background-color: var(--h); color: var(--hc); }\n  &:active { background-color: var(--p); color: var(--pc); }\n  &.is-disabled:hover { background: var(--dh); color: var(--dhc); }\n  &:checked:hover { background: var(--ch); color: var(--chc); }\n  &:hover:not(:disabled) { background: var(--n); color: var(--nc); }\n  &:disabled { background: var(--d); color: var(--dc); }\n}',
        );
        expect(r.estados).toContain('color: var(--ts-fg, var(--ts-on-bg-h, var(--hc)));');
        expect(r.estados).toContain('color: var(--ts-fg, var(--ts-on-bg-a, var(--pc)));');
        expect(r.estados).toContain('background: var(--ts-bg-h, var(--dh)); color: var(--ts-on-bg-h, var(--dhc));');
        expect(r.estados).toContain('background: var(--ts-bg-h, var(--ch)); color: var(--ts-on-bg-h, var(--chc));');
        expect(r.estados).toContain('background: var(--ts-bg-h, var(--n)); color: var(--ts-fg, var(--ts-on-bg-h, var(--nc)));');
        expect(r.estados).toContain('background: var(--d); color: var(--dc);');
    });

    it('un valor compuesto, una palabra global o un color sin fondo en la misma regla se dejan como están', () => {
        const r = partirConCanales(':where(.ts).x {\n  color: var(--b);\n  &.a { background: transparent; color: inherit; }\n  &:hover { background: var(--x) var(--y); }\n}');
        expect(r.reposo).toContain('color: var(--b);');
        expect(r.reposo).toContain('color: inherit;');
        expect(r.estados).toContain('background: var(--x) var(--y);');
    });

    it('el aro de foco termina con la sombra de la utilidad: aro + sombra', () => {
        const v = derivarVocabulario(buildRepoConfig());
        expect(v.atomic).toContain('var(--ts-sh, 0 0 transparent)');
    });
});

// ── El texto sobre un neutro: AA en claro y en oscuro ───────────────────────────────────────────────────────────────────────────────
type Color = { l: number; c: number; h: number; a: number };
const leer = (s: string): Color => {
    const m = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(s)!;
    return { l: +m[1], c: +m[2], h: +m[3], a: m[4] === undefined ? 1 : +m[4] };
};
const aGamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const aLineal = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const rgb = (c: Color) => oklchToLinSrgb(c).map((v) => aGamma(Math.min(1, Math.max(0, v))));
const luz = (g: number[]) => 0.2126 * aLineal(g[0]) + 0.7152 * aLineal(g[1]) + 0.0722 * aLineal(g[2]);
const sobre = (c: Color, fondo: Color) => {
    const f = rgb(c);
    const b = rgb(fondo);
    return f.map((v, i) => v * c.a + b[i] * (1 - c.a));
};

describe('textoSobreNeutro: AA (4.5:1) en claro y en oscuro', () => {
    const pasos = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];
    const juegos = [
        ['neutros por defecto', undefined],
        ['neutros teñidos', { tint: { c: 0.03, h: 250 } }],
    ] as const;

    for (const [nombre, neutral] of juegos) {
        for (const modo of ['light', 'dark'] as const) {
            it(`${nombre} / ${modo}: cada par de la tabla llega a AA`, () => {
                const n = effectiveNeutrals(neutral as never)[modo];
                const color = (familia: string, paso: string) => leer(n[familia][paso]);
                const texto = (v: string) => {
                    const [, paso] = /gray-(\d+)\)/.exec(v)!;
                    return rgb(color('gray', paso));
                };
                const fallas: string[] = [];
                for (const familia of ['gray', 'grayAlpha', 'background']) {
                    for (const paso of familia === 'background' ? ['100', '200'] : pasos) {
                        const par = textoSobreNeutro(familia, paso);
                        if (!par) continue;
                        const fondos = familia === 'grayAlpha' ? [color('background', '100'), color('background', '200'), color('gray', '100')] : [color(familia, paso)];
                        for (const fondo of fondos) {
                            const superficie = familia === 'grayAlpha' ? sobre(color(familia, paso), fondo) : rgb(fondo);
                            const r = wcag(luz(texto(par)), luz(superficie));
                            if (r < AA) fallas.push(`${familia}-${paso} con ${par}: ${r.toFixed(2)}`);
                        }
                    }
                }
                expect(fallas).toEqual([]);
            });
        }
    }

    it('la tabla: gray 100–600 con gray-1000 y 700–1000 con gray-100; grayAlpha deja el 700 sin par (ninguno llega a AA en los dos modos)', () => {
        expect(pasos.map((p) => textoSobreNeutro('gray', p))).toEqual([...Array(6).fill('var(--color-gray-1000)'), ...Array(4).fill('var(--color-gray-100)')]);
        const corto = (v?: string) => v?.replace('var(--color-', '').replace(')', '');
        expect(pasos.map((p) => corto(textoSobreNeutro('grayAlpha', p)))).toEqual([...Array(6).fill('gray-1000'), undefined, ...Array(3).fill('gray-100')]);
        expect(textoSobreNeutro('background', '100')).toBe('var(--color-gray-1000)');
        expect(textoSobreNeutro('background', '300')).toBeUndefined();
        expect(textoSobreNeutro('overlay', '100')).toBeUndefined();
    });

    it('el tono 600 no usa gray-100 (3,5:1 en claro): es el escalón que separa la tabla', () => {
        const n = effectiveNeutrals();
        const r = wcag(luz(rgb(leer(n.light.gray['100']))), luz(rgb(leer(n.light.gray['600']))));
        expect(r).toBeLessThan(AA);
    });
});

describe('canales: también dentro de las variantes de pantalla y de contenedor', () => {
    const css = (clases: string) => compile(buildRepoConfig(), [{ file: 'a.html', content: `<i class="${clases}">` }], { onDemand: true }).css;

    it('md:bg-* y @md:bg-* declaran los canales dentro de su @media y de su @container', () => {
        const c = css('md:bg-danger-700 @md:bg-success-500');
        expect(c).toMatch(/@media \(width >= [\d.]+rem\) \{[^@]*md\\:bg-danger-700 \{[^}]*--ts-bg-h: var\(--color-danger-800\);/);
        expect(c).toMatch(/@container \(width >= [\d.]+rem\) \{[^@]*@md\\:bg-success-500 \{[^}]*--ts-bg-a: var\(--color-success-700\);/);
        expect(c).toContain("@property --ts-bg-h { syntax: '*'; inherits: false; }");
    });

    it('md:surface-md suma la sombra y md:p-base no declara nada de más; sin esas clases no hay canales', () => {
        expect(css('md:surface-md')).toContain('--ts-sh: var(--ts-shadow-md);');
        expect(css('md:p-base')).not.toMatch(/--ts-(bg-|on-bg|sh:)/);
        expect(css('flex')).not.toContain('@property --ts-bg-h');
    });

    it('color-* y md:color-* / @md:color-* declaran --ts-fg; sin esas clases no hay @property --ts-fg', () => {
        const c = css('color-gray-100 md:color-warning-300 @md:color-danger-500');
        expect(c).toMatch(/\.color-gray-100 \{[^}]*--ts-fg: var\(--color-gray-100\);/);
        expect(c).toMatch(/@media \(width >= [\d.]+rem\) \{[^@]*md\\:color-warning-300 \{[^}]*--ts-fg: var\(--color-warning-300\);/);
        expect(c).toMatch(/@container \(width >= [\d.]+rem\) \{[^@]*@md\\:color-danger-500 \{[^}]*--ts-fg: var\(--color-danger-500\);/);
        expect(c).toContain("@property --ts-fg { syntax: '*'; inherits: false; }");
        expect(css('flex')).not.toContain('--ts-fg');
    });
});

describe('hover:bg-* y las demás variantes de estado: el texto acompaña al fondo nuevo', () => {
    const existe = (n: string) => /^ts-(bg-(danger|gray)-\d+|color-danger-\d+-contrast)$/.test(n);
    const css = (clases: string) => compile(buildRepoConfig(), [{ file: 'a.html', content: `<i class="${clases}">` }], { onDemand: true }).css;
    const regla = (c: string, clase: string) => new RegExp(`${clase.replace(/[:]/g, '\\\\:')}[^{]*\\{([^}]*)\\}`).exec(c)?.[1] ?? '';

    it('suma el color de contraste leyendo --ts-fg; sin par o sin fondo de la escala, nada', () => {
        expect(textoDeFondoEnEstado('ts-bg-danger-700', 'background-color: var(--color-danger-700);', existe)).toBe('\n  color: var(--ts-fg, var(--color-danger-700-contrast));');
        expect(textoDeFondoEnEstado('ts-bg-gray-800', 'background-color: var(--color-gray-800);', existe)).toBe('\n  color: var(--ts-fg, var(--color-gray-100));');
        expect(textoDeFondoEnEstado('ts-bg-gray-300', 'background-color: var(--color-gray-300);', existe)).toBe('\n  color: var(--ts-fg, var(--color-gray-1000));');
        expect(textoDeFondoEnEstado('ts-bg-background-300', 'background-color: var(--color-background-300);', existe)).toBe('');
        expect(textoDeFondoEnEstado('ts-bg-transparent', 'background: transparent;', existe)).toBe('');
        expect(textoDeFondoEnEstado('ts-surface-md', 'background-color: var(--color-background-100);', existe)).toBe('');
    });

    it('hover:, focus-visible:, group-hover:, aria-…: y disabled: de bg-* declaran el texto; print: y md: no', () => {
        const c = css('hover:bg-success-500 focus-visible:bg-gray-900 group-hover:bg-danger-700 aria-expanded:bg-gray-200 disabled:bg-gray-300 print:bg-danger-700 md:bg-gray-100');
        expect(regla(c, 'hover:bg-success-500')).toContain('color: var(--ts-fg, var(--color-success-500-contrast));');
        expect(regla(c, 'focus-visible:bg-gray-900')).toContain('color: var(--ts-fg, var(--color-gray-100));');
        expect(regla(c, 'group-hover:bg-danger-700')).toContain('color: var(--ts-fg, var(--color-danger-700-contrast));');
        expect(regla(c, 'aria-expanded:bg-gray-200')).toContain('color: var(--ts-fg, var(--color-gray-1000));');
        expect(regla(c, 'disabled:bg-gray-300')).toContain('color: var(--ts-fg, var(--color-gray-1000));');
        expect(regla(c, 'print:bg-danger-700')).not.toMatch(/\scolor:/);
        expect(regla(c, 'md:bg-gray-100')).not.toMatch(/\scolor:/);
        expect(regla(c, 'md:bg-gray-100')).toContain('--ts-on-bg:');
    });

    it('hover:color-* va después de hover:bg-* en la misma capa (le gana al texto del fondo), y la regla de la variante no declara canales', () => {
        const c = css('hover:color-gray-1000 hover:bg-success-500');
        expect(c.indexOf('hover\\:color-gray-1000')).toBeGreaterThan(c.indexOf('hover\\:bg-success-500'));
        expect(regla(c, 'hover:bg-success-500')).not.toMatch(/--ts-(bg|on-bg|sh)/);
        expect(regla(c, 'hover:color-gray-1000')).not.toContain('--ts-');
    });
});
