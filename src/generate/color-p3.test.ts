// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildTokensDTCG } from './emit-dtcg';
import { pruneTheme } from './podar-tema';
import { buildThemeCss } from '../lib/theme/createTheme';
import { inGamut } from '../lib/theme/color-math';
import { defaultStates, userFonts } from '../config/taisho.user';
import type { ThemeEntry } from '../config/taisho.types';
import { warningText } from '../generate-cli/mensajes-avisos';

const entry = (def: ThemeEntry['def']): ThemeEntry => ({ name: 't', group: 'root', def });
const COLORES = { brand: '#3b82f6', accent: '#f59e0b' };
const sinNeutro = entry({ colors: COLORES });
const conTinte = entry({ colors: COLORES, neutral: { tint: { c: 0.4, h: 145 } } });
const cssDe = (e: ThemeEntry) => buildTokensCSS(resolveThemeTokens(e, userFonts, defaultStates));

const OKLCH = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/g;
const bloqueP3 = (css: string) => { const desde = css.indexOf('@media (color-gamut: p3)'); return css.slice(desde, css.indexOf('\n@supports not', desde)); };
const declaraciones = (css: string) => new Map([...css.matchAll(/^\s*(--[\w-]+): (.*);$/gm)].map((m) => [m[1], m[2]]));
const colores = (valor: string) => [...valor.matchAll(OKLCH)].map((m) => [+m[1], +m[2], +m[3]] as const);

describe('bloque P3 de los tokens', () => {
  const css = cssDe(sinNeutro);
  const p3 = declaraciones(bloqueP3(css));
  const base = declaraciones(css.slice(0, css.indexOf('@media (color-gamut: p3)')));

  it('va al final, con una declaración por línea', () => {
    expect(css.indexOf('@media (color-gamut: p3)')).toBeGreaterThan(css.indexOf('@media (prefers-reduced-motion'));
    expect(bloqueP3(css)).toMatch(/^@media \(color-gamut: p3\) \{\n {2}:root \{\n( {4}--[\w-]+: .+;\n)+ {2}\}\n\}\n$/);
  });

  it('usa los mismos nombres que el sRGB y sólo trae las que difieren', () => {
    expect(p3.size).toBeGreaterThan(0);
    for (const [nombre, valor] of p3) {
      expect(base.has(nombre), nombre).toBe(true);
      expect(valor, nombre).not.toBe(base.get(nombre));
    }
    const pasosColor = [...base.keys()].filter((n) => /^--color-(brand|accent)-\d+$/.test(n));
    expect(pasosColor.filter((n) => !p3.has(n)).length).toBeGreaterThan(0);
    expect(p3.has('--color-brand-500-contrast')).toBe(false);
  });

  it('los valores sRGB están en gama sRGB y los P3 en gama P3 (y con más croma)', () => {
    for (const [nombre, valor] of p3) {
      const p3c = colores(valor), srgbc = colores(base.get(nombre)!);
      expect(p3c.length, nombre).toBe(srgbc.length);
      p3c.forEach(([l, c, h], i) => {
        expect(inGamut(l, c, h, 'p3', 1e-3), `${nombre} P3`).toBe(true);
        expect(inGamut(...srgbc[i], 'srgb', 1e-3), `${nombre} sRGB`).toBe(true);
        expect(c).toBeGreaterThanOrEqual(srgbc[i][1] - 1e-4);
      });
    }
  });

  it('los neutros teñidos también tienen P3', () => {
    const t = declaraciones(bloqueP3(cssDe(conTinte)));
    expect([...t.keys()].some((n) => n.startsWith('--color-gray-'))).toBe(true);
    expect([...p3.keys()].some((n) => n.startsWith('--color-gray-'))).toBe(false);
  });

  it('el modelo trae `p3` sólo en los pasos que difieren', () => {
    const m = resolveThemeTokens(sinNeutro, userFonts, defaultStates);
    expect(m.colors.brand['400'].p3).toBeDefined();
    expect(m.colors.brand['500-contrast'].p3).toBeUndefined();
    expect(m.colors.gray['500'].p3).toBeUndefined();
  });
});

describe('P3 en runtime (buildThemeCss)', () => {
  const def = { colors: COLORES };
  const css = buildThemeCss(def);

  it('emite el mismo bloque que el build: mismos nombres y valores', () => {
    const idx = css.indexOf('@media (color-gamut:p3)');
    expect(idx).toBeGreaterThan(css.indexOf(':root{'));
    const runtime = new Map([...css.slice(idx).matchAll(/:root\{([^}]*)\}/g)][0][1].split(';').filter(Boolean).map((d) => { const i = d.indexOf(':'); return [d.slice(0, i), d.slice(i + 1)] as [string, string]; }));
    const build = declaraciones(bloqueP3(cssDe(entry(def))));
    expect([...runtime.keys()].sort()).toEqual([...build.keys()].filter((n) => /^--color-(brand|accent)-/.test(n)).sort());
    for (const [nombre, valor] of build) {
      if (runtime.has(nombre)) expect(valor).toBe(runtime.get(nombre));
    }
  });

  it('con neutros teñidos también', () => {
    expect(buildThemeCss({ colors: COLORES, neutral: { tint: { c: 0.4, h: 145 } } })).toMatch(/@media \(color-gamut:p3\)\{:root\{[^}]*--color-gray-/);
  });
});

describe('pruneTheme y el bloque P3', () => {
  const completo = cssDe(sinNeutro);

  it('conserva sólo las variables vivas dentro del @media', () => {
    const podado = pruneTheme(completo, '.x { color: var(--color-brand-400); }');
    const p3 = bloqueP3(podado);
    expect(p3).toContain('--color-brand-400:');
    expect(p3).not.toContain('--color-brand-300:');
    expect(p3).not.toContain('--color-accent-');
    expect(p3.match(/^ {4}--/gm)).toHaveLength(1);
  });

  it('si ninguna variable P3 está viva, quita el @media entero', () => {
    const podado = pruneTheme(completo, '.x { color: var(--color-gray-500); }');
    expect(podado).not.toContain('color-gamut');
    expect(podado).toContain('--color-gray-500:');
  });
});

describe('DTCG y P3', () => {
  const dtcg = JSON.parse(buildTokensDTCG(sinNeutro, resolveThemeTokens(sinNeutro, userFonts, defaultStates)));
  const ext = (nodo: { $extensions?: Record<string, Record<string, string>> } | undefined, k: string): Record<string, string> => nodo?.$extensions?.[k] ?? {};

  it('`hex` es el sRGB exacto y `com.taishods.p3` va sólo donde P3 difiere', () => {
    const b400 = dtcg.color.brand['400'];
    expect(ext(b400, 'com.taishods').hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(ext(b400, 'com.taishods.p3').light).toMatch(/^oklch\(/);
    expect(ext(b400, 'com.taishods.p3').dark).toMatch(/^oklch\(/);
    expect(ext(dtcg.color.brand['500'], 'com.taishods.p3')).toEqual({});
    expect(ext(dtcg.color.brand['500-contrast'], 'com.taishods.p3')).toEqual({});
  });
});

describe('aviso de semilla corrida', () => {
  const corrida = entry({ colors: { brand: 'oklch(0.55 0.15 140)' } });

  it('lo trae el modelo, con familia, paso, cuánto se corrió y por qué', () => {
    const datos = resolveThemeTokens(corrida, userFonts, defaultStates).warnings;
    expect(datos.length).toBeGreaterThan(0);
    expect(datos.every((x) => x.code === 'seed-shifted')).toBe(true);
    const avisos = datos.map((x) => warningText(x, 'es'));
    const a = avisos.find((x) => x.includes('modo claro'))!;
    expect(a).toContain('"brand"');
    expect(a).toContain('oklch(0.55 0.15 140)');
    expect(a).toMatch(/paso \d+/);
    expect(a).toMatch(/L [+−]0\.\d{3}/);
    expect(a).toContain('4,5:1');
  });

  it('una semilla que encaja no avisa', () => {
    expect(resolveThemeTokens(sinNeutro, userFonts, defaultStates).warnings).toEqual([]);
  });

  it('un corrimiento imperceptible (menos de 0,01 de L) no avisa: las semillas de la plantilla de init', () => {
    const casi = entry({ colors: { brand: '#2563EB' } });
    expect(resolveThemeTokens(casi, userFonts, defaultStates).warnings.filter((a) => a.code === 'seed-shifted' && a.params.color === 'brand')).toEqual([]);
  });
});
