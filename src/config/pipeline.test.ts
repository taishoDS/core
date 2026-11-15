import { describe, it, expect } from 'vitest';
import { parseHex, getLuminance, rgbToOklch, oklchToRgb, getContrastColor } from './pipeline';

describe('pipeline math logic', () => {
  describe('parseHex', () => {
    it('should parse 6-digit hex correctly', () => {
      expect(parseHex('#FF0000')).toEqual({ r: 1, g: 0, b: 0 });
      expect(parseHex('00FF00')).toEqual({ r: 0, g: 1, b: 0 });
    });

    it('should parse 3-digit hex correctly', () => {
      expect(parseHex('#F00')).toEqual({ r: 1, g: 0, b: 0 });
      expect(parseHex('0F0')).toEqual({ r: 0, g: 1, b: 0 });
    });

    it('should throw on invalid hex', () => {
      expect(() => parseHex('red')).toThrow();
      expect(() => parseHex('#FFFF')).toThrow();
    });
  });

  describe('getLuminance', () => {
    it('should calculate luminance correctly for black and white', () => {
      expect(getLuminance(0, 0, 0)).toBe(0);
      expect(getLuminance(1, 1, 1)).toBeCloseTo(1, 5);
    });
  });

  describe('Color Space Conversions', () => {
    it('should convert RGB to OKLCH and back with high precision', () => {
      const original = { r: 0.5, g: 0.2, b: 0.8 };
      const oklch = rgbToOklch(original.r, original.g, original.b);
      const converted = oklchToRgb(oklch.l, oklch.c, oklch.h);

      expect(converted.r).toBeCloseTo(original.r, 2);
      expect(converted.g).toBeCloseTo(original.g, 2);
      expect(converted.b).toBeCloseTo(original.b, 2);
    });
  });

  describe('getContrastColor', () => {
    // Blanco puro en modo light → luminancia alta → texto oscuro
    it('retorna color oscuro sobre fondo muy claro en modo light', () => {
      const { l, c, h } = rgbToOklch(1, 1, 1);
      expect(getContrastColor(l, c, h, false)).toBe('var(--color-gray-1000)');
    });

    // Negro puro en modo light → luminancia baja → texto claro
    it('retorna color claro sobre fondo muy oscuro en modo light', () => {
      const { l, c, h } = rgbToOklch(0, 0, 0);
      expect(getContrastColor(l, c, h, false)).toBe('var(--color-gray-100)');
    });

    // En modo dark: blanco puro → luminancia alta → gris claro (100)
    it('retorna color claro sobre fondo muy claro en modo dark', () => {
      const { l, c, h } = rgbToOklch(1, 1, 1);
      expect(getContrastColor(l, c, h, true)).toBe('var(--color-gray-100)');
    });

    // En modo dark: negro puro → luminancia baja → gris oscuro (1000)
    it('retorna color oscuro sobre fondo muy oscuro en modo dark', () => {
      const { l, c, h } = rgbToOklch(0, 0, 0);
      expect(getContrastColor(l, c, h, true)).toBe('var(--color-gray-1000)');
    });

    // Umbral: gris medio (#888888) — luminancia ≈ 0.216, por encima de 0.175 → oscuro en light
    it('aplica el umbral de luminancia 0.175 correctamente (gris medio)', () => {
      const { l, c, h } = rgbToOklch(0x88 / 255, 0x88 / 255, 0x88 / 255);
      expect(getContrastColor(l, c, h, false)).toBe('var(--color-gray-1000)');
    });
  });
});
