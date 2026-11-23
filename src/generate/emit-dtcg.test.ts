// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildTokensCSS, resolveThemeTokens, type ResolvedThemeTokens } from './emit-tokens';
import { buildDtcg, varToAlias, oklchToHex, splitTopLevel, parseShadowLayer, type DtcgNode } from './emit-dtcg';
import { themeList, userFonts, defaultStates } from '../config/taisho.user';

const isObj = (v: unknown): v is DtcgNode => typeof v === 'object' && v !== null && !Array.isArray(v);

function at(tree: DtcgNode, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (isObj(acc) ? acc[k] : undefined), tree);
}

function collectTokens(node: unknown, prefix = '', out: string[] = []): string[] {
  if (!isObj(node)) return out;
  if ('$value' in node) { out.push(prefix); return out; }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    collectTokens(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

function collectAliases(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    const m = /^\{(.+)\}$/.exec(node);
    if (m) out.push(m[1]!);
    return out;
  }
  if (Array.isArray(node)) { node.forEach((n) => collectAliases(n, out)); return out; }
  if (isObj(node)) { Object.values(node).forEach((n) => collectAliases(n, out)); }
  return out;
}

function cssVarToDtcgPath(name: string, t: ResolvedThemeTokens): string | null {
  const strip = (p: string) => name.slice(p.length);
  if (name === 'color-white' || name === 'color-black') return `color.${strip('color-')}`;
  if (name.startsWith('color-')) {
    const rest = strip('color-');
    const m = /^(.*?)-(\d+(?:-contrast)?|solid(?:-hover|-active)?(?:-contrast)?)$/.exec(rest);
    return m ? `color.${m[1]}.${m[2]}` : null;
  }
  if (name.startsWith('font-')) return `fontFamily.${strip('font-')}`;
  if (name.startsWith('ts-sizing-')) return `sizing.${strip('ts-sizing-')}`;
  if (name.startsWith('ts-fontsize-')) return `fontSize.${strip('ts-fontsize-')}`;
  if (name.startsWith('ts-lh-')) return `lineHeight.${strip('ts-lh-')}`;
  if (name.startsWith('ts-ls-')) return `letterSpacing.${strip('ts-ls-')}`;
  if (name.startsWith('ts-fw-')) return `fontWeight.${strip('ts-fw-')}`;
  if (name.startsWith('ts-gap-')) return `spacing.gap.${strip('ts-gap-')}`;
  if (name.startsWith('ts-space-')) return `spacing.space.${strip('ts-space-')}`;
  if (name.startsWith('ts-radius-')) return `radius.${strip('ts-radius-')}`;
  if (name.startsWith('ts-screen-')) return `screen.${strip('ts-screen-')}`;
  if (name === 'ts-contrast-threshold') return 'contrast.threshold';
  if (name.startsWith('ts-opacity-')) return `opacity.${strip('ts-opacity-')}`;
  if (name.startsWith('ts-blur-')) return `blur.${strip('ts-blur-')}`;
  if (name.startsWith('ts-z-')) return `zIndex.${strip('ts-z-')}`;
  if (name.startsWith('ts-border-width-')) return `borderWidth.${strip('ts-border-width-')}`;
  if (name.startsWith('ts-shadow-')) return `shadow.${strip('ts-shadow-')}`;
  if (name.startsWith('ts-duration-')) return `duration.${strip('ts-duration-')}`;
  if (name.startsWith('ts-iterations-')) return `iterations.${strip('ts-iterations-')}`;
  if (name.startsWith('ts-ease-')) return `easing.${strip('ts-ease-')}`;
  if (name.startsWith('ts-material-') || name === 'ts-spotlight-color' || name === 'ts-focus-ring-color' || name === 'ts-corner-shape') return 'EXT';
  if (name.startsWith('ts-color-')) {
    const rest = strip('ts-color-');
    if (rest in t.semantic) return `color.semantic.${rest}`;
    for (const state of Object.keys(t.states)) {
      if (rest === state) return `color.state.${state}.default`;
      for (const suffix of ['bg', 'border', 'contrast', 'text']) {
        if (rest === `${state}-${suffix}`) return `color.state.${state}.${suffix}`;
      }
    }
    return null;
  }
  for (const family of Object.keys(t.densityComfortable)) {
    const p = `ts-${family}-`;
    if (name.startsWith(p)) return `density.comfortable.${family}.${name.slice(p.length)}`;
  }
  return null;
}

describe('emit-dtcg — helpers', () => {
  it('varToAlias convierte referencias var() a aliases DTCG', () => {
    expect(varToAlias('var(--ts-sizing-6)')).toBe('{sizing.6}');
    expect(varToAlias('var(--color-gray-1000)')).toBe('{color.gray.1000}');
    expect(varToAlias('var(--color-brand-secondary-500)')).toBe('{color.brand-secondary.500}');
    expect(varToAlias('var(--color-brand-500-contrast)')).toBe('{color.brand.500-contrast}');
    expect(varToAlias('oklch(0.5 0 0)')).toBeNull();
  });

  it('oklchToHex produce un hex válido (fallback para Figma)', () => {
    expect(oklchToHex('oklch(1 0 0)')).toMatch(/^#[0-9a-f]{6}$/);
    expect(oklchToHex('oklch(0 0 0)')).toBe('#000000');
    expect(oklchToHex('var(--color-gray-100)')).toBeNull();
  });

  it('splitTopLevel no corta dentro de rgba()', () => {
    expect(splitTopLevel('0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px red')).toEqual([
      '0 1px 2px rgba(0,0,0,0.04)', '0 0 0 1px red',
    ]);
  });

  it('parseShadowLayer separa longitudes y color', () => {
    expect(parseShadowLayer('0 1px 2px rgba(0,0,0,0.04)')).toMatchObject({
      color: 'rgba(0,0,0,0.04)',
      offsetY: { value: 1, unit: 'px' },
      blur: { value: 2, unit: 'px' },
      spread: { value: 0, unit: 'px' },
    });
    expect(parseShadowLayer('0 0 0 1px var(--color-grayAlpha-200)')).toMatchObject({
      color: '{color.grayAlpha.200}',
      spread: { value: 1, unit: 'px' },
    });
  });
});

describe('emit-dtcg — por tema', () => {
  for (const entry of themeList) {
    describe(`tema "${entry.name}"`, () => {
      const t = resolveThemeTokens(entry, userFonts, defaultStates);
      const dtcg = buildDtcg(entry, t);
      const css = buildTokensCSS(t);

      it('no pierde ningún token que exista en el CSS', () => {
        const cssVars = [...css.slice(0, css.indexOf('@supports not')).matchAll(/^\s*--([\w-]+):/gm)].map((m) => m[1]!);
        expect(cssVars.length).toBeGreaterThan(100);
        const missing: string[] = [];
        for (const name of new Set(cssVars)) {
          const path = cssVarToDtcgPath(name, t);
          if (path === null) { missing.push(`${name} (sin mapeo)`); continue; }
          if (path === 'EXT') continue;
          if (at(dtcg, path) === undefined) missing.push(`${name} → ${path}`);
        }
        expect(missing).toEqual([]);
      });

      it('todo token tiene $type y $value', () => {
        const paths = collectTokens(dtcg);
        expect(paths.length).toBeGreaterThan(100);
        const sinTipo = paths.filter((p) => {
          const node = at(dtcg, p);
          return !isObj(node) || typeof node.$type !== 'string';
        });
        expect(sinTipo).toEqual([]);
      });

      it('todos los aliases apuntan a un token existente (sin referencias rotas)', () => {
        const rotos = collectAliases(dtcg).filter((a) => {
          const target = at(dtcg, a);
          return !isObj(target) || !('$value' in target);
        });
        expect(rotos).toEqual([]);
      });

      it('ningún alias es cíclico (un token no se referencia a sí mismo)', () => {
        for (const p of collectTokens(dtcg)) {
          const node = at(dtcg, p) as DtcgNode;
          if (typeof node.$value === 'string') {
            const m = /^\{(.+)\}$/.exec(node.$value);
            if (m) expect(m[1]).not.toBe(p);
          }
        }
      });

      it('los colores oklch traen fallback hex para herramientas de diseño', () => {
        const gray500 = at(dtcg, 'color.gray.500') as DtcgNode;
        const ext = (gray500.$extensions as DtcgNode)['com.taishods'] as DtcgNode;
        expect(ext.hex).toMatch(/^#[0-9a-f]{6}$/);
      });
    });
  }
});
