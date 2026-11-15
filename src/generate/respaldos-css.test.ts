// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { contarDeclaraciones } from './emit-flat';
import { buildRepoConfig } from '../config/pipeline';

const config = buildRepoConfig();
const completo = compile(config, []).css;
const aDemanda = (html: string) => compile(config, [{ file: 'a.html', content: html }], { onDemand: true }).css;

const declaraciones = (css: string, propiedad: string) => [...css.matchAll(new RegExp(`(?<![-\\w])${propiedad}:\\s*([^;}]+)`, 'g'))];
const conPrefijo = (css: string, propiedad: string) => declaraciones(css, propiedad).map((m) => css.slice(Math.max(0, m.index! - 120), m.index).includes(`-webkit-${propiedad}: ${m[1].trim()};`));

describe('prefijos -webkit- de Safari 17.4–17.6', () => {
  it('cada user-select del CSS completo lleva su -webkit-user-select con el mismo valor', () => {
    const conRespaldo = conPrefijo(completo, 'user-select');
    expect(conRespaldo.length).toBeGreaterThan(20);
    expect(conRespaldo.every(Boolean)).toBe(true);
  });

  it('cada backdrop-filter del CSS completo lleva su -webkit-backdrop-filter con el mismo valor', () => {
    const conRespaldo = conPrefijo(completo, 'backdrop-filter');
    expect(conRespaldo.length).toBeGreaterThan(8);
    expect(conRespaldo.every(Boolean)).toBe(true);
  });

  it('el velo de Modal, Drawer y la paleta de comandos lo llevan, también en las transiciones', () => {
    expect(completo).toMatch(/&::backdrop \{[^}]*-webkit-backdrop-filter: blur\(var\(--ts-blur-sm\)\); backdrop-filter: blur\(var\(--ts-blur-sm\)\);/);
    expect(completo).toMatch(/transition: [^;]*backdrop-filter [^;]*-webkit-backdrop-filter /);
    expect(completo).toMatch(/\.command-overlay \{[^}]*-webkit-backdrop-filter: blur\(var\(--ts-blur-sm\)\);\s*backdrop-filter: blur\(var\(--ts-blur-sm\)\);/);
  });

  it('a demanda, select-none y backdrop-blur-* entran con su prefijo', () => {
    const css = aDemanda('<div class="ts select-none backdrop-blur-md md:backdrop-blur-none"></div>');
    expect(css).toMatch(/\.select-none \{ -webkit-user-select: none; user-select: none;/);
    expect(css).toMatch(/\.backdrop-blur-md \{ -webkit-backdrop-filter: blur\(var\(--ts-blur-md\)\); backdrop-filter: blur\(var\(--ts-blur-md\)\);/);
    expect(css).toMatch(/-webkit-backdrop-filter: none; backdrop-filter: none;/);
  });

  it('el prefijo no cuenta como declaración propia: el orden de las utilidades no cambia', () => {
    expect(contarDeclaraciones('-webkit-user-select: none; user-select: none;')).toBe(1);
    expect(contarDeclaraciones('-webkit-backdrop-filter: none; backdrop-filter: none;')).toBe(1);
    expect(contarDeclaraciones('-webkit-line-clamp: 2; display: -webkit-box;')).toBe(2);
  });
});

describe('Badge con color propio sin color relativo (Firefox 125–127)', () => {
  const bloque = (css: string) => {
    const desde = css.indexOf('&.variant-custom {');
    return css.slice(desde, css.indexOf('\n  }\n', desde));
  };
  const badge = bloque(completo);

  it('declara primero un fondo teñido y el texto del tema, sin color relativo', () => {
    const base = badge.slice(0, badge.indexOf('@supports'));
    expect(base).toMatch(/background-color: color-mix\(in srgb, var\(--ts-badge-custom-bg\) \d+%, var\(--color-background-100\)\);/);
    expect(base).toMatch(/color: var\(--ts-on-bg, var\(--ts-color-heading, var\(--color-gray-1000\)\)\);/);
    expect(base).not.toContain('oklch(from');
  });

  it('el fondo pleno y el texto calculado sólo entran donde hay color relativo, y contrast-color después', () => {
    const relativo = badge.indexOf('@supports (color: oklch(from red l c h))');
    const contraste = badge.indexOf('@supports (color: contrast-color(red))');
    expect(relativo).toBeGreaterThan(0);
    expect(contraste).toBeGreaterThan(relativo);
    const dentro = badge.slice(relativo, contraste);
    expect(dentro).toContain('background-color: var(--ts-badge-custom-bg);');
    expect(dentro).toContain('color: oklch(from var(--ts-badge-custom-bg)');
  });

  it('a demanda, el respaldo viaja con el Badge', () => {
    expect(bloque(aDemanda('<span class="ts badge variant-custom"></span>'))).toContain('color-mix(in srgb, var(--ts-badge-custom-bg)');
  });
});

describe('densidad heredada de Card sin style queries (Firefox < 151)', () => {
  it('ya no hay @container style(): la densidad baja por variables que se heredan', () => {
    expect(completo).not.toContain('@container style(');
    for (const [talle, normal, compacto] of [['sm', 12, 8], ['md', 20, 12], ['lg', 32, 20]] as const) {
      expect(completo).toContain(`&.padding-${talle}   { padding: var(--_card-pad-${talle}, var(--ts-sizing-${normal})); --ts-card-padding: var(--_card-pad-${talle}, var(--ts-sizing-${normal})); }`);
      expect(completo).toContain(`--_card-pad-${talle}: var(--ts-sizing-${compacto});`);
      expect(completo).toContain(`--_card-pad-${talle}: initial;`);
    }
  });

  it('el Grid compacto las fija y el cómodo las vuelve a soltar', () => {
    expect(completo).toMatch(/&\.density-compact \{ --ts-density: compact; --_card-pad-lg: var\(--ts-sizing-20\); --_card-pad-md: var\(--ts-sizing-12\); --_card-pad-sm: var\(--ts-sizing-8\); \}/);
    expect(completo).toMatch(/&\.density-comfortable \{ --ts-density: comfortable; --_card-pad-lg: initial; --_card-pad-md: initial; --_card-pad-sm: initial; \}/);
  });
});

describe('@property en Firefox 125–127', () => {
  const sniff = '@supports ((-moz-orient: inline) and (not (color: oklch(from red l c h))))';

  it('sigue registrando las tres variables con inherits: false', () => {
    for (const v of ['--ts-bw', '--ts-ring-w', '--ts-ring-c']) expect(completo).toContain(`@property ${v} { syntax: '*'; inherits: false; }`);
  });

  it('donde @property no existe, las suelta en cada elemento para que no hereden', () => {
    const desde = completo.indexOf(sniff);
    expect(desde).toBeGreaterThan(0);
    const regla = completo.slice(desde, completo.indexOf('\n', desde));
    expect(regla).toContain('*, ::before, ::after { --ts-bw: initial; --ts-ring-w: initial; --ts-ring-c: initial; }');
  });

  it('el respaldo va antes de las utilidades que fijan las variables, así ellas ganan', () => {
    expect(completo.indexOf(sniff)).toBeLessThan(completo.indexOf('.border-2'));
  });

  it('a demanda también está', () => {
    expect(aDemanda('<div class="ts border-2"></div>')).toContain(sniff);
  });
});
