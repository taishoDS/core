// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { compositeOver, contrastRatio, resolveThemeColors } from './color';
import { defineExtension } from './extension';
import { configDeFabrica } from '../generate-cli/check';
import type { TaishoConfig } from './vocabulary';

const HEX = /^#[0-9a-f]{6}$/;

describe('contrastRatio', () => {
	it('da los valores conocidos de WCAG', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
		expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5);
		expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
		expect(contrastRatio('#336699', '#336699')).toBe(1);
		expect(contrastRatio('rgb(0 0 0)', 'rgb(255, 255, 255)')).toBeCloseTo(21, 5);
	});
	it('acepta oklch y coincide con su hex', () => {
		expect(contrastRatio('oklch(0 0 0)', 'oklch(1 0 0)')).toBeCloseTo(21, 1);
		const hex = resolveThemeColors(configDeFabrica()).taisho.light['--color-gray-500'];
		expect(contrastRatio('oklch(0.75 0 0)', '#000')).toBeCloseTo(contrastRatio(hex, '#000')!, 5);
	});
	it('es null con alfa o si no lo interpreta', () => {
		expect(contrastRatio('rgba(0,0,0,0.5)', '#fff')).toBeNull();
		expect(contrastRatio('oklch(0 0 0 / 0.4)', '#fff')).toBeNull();
		expect(contrastRatio('#00000080', '#fff')).toBeNull();
		expect(contrastRatio('color-mix(in oklab, red, blue)', '#fff')).toBeNull();
		expect(contrastRatio('var(--x)', '#fff')).toBeNull();
	});
});

describe('resolveThemeColors', () => {
	it('resuelve el tema de fábrica: hex opaco, claro y oscuro, sin var() ni light-dark()', () => {
		const t = resolveThemeColors(configDeFabrica()).taisho;
		expect(Object.keys(t.light)).toEqual(Object.keys(t.dark));
		expect(t.light['--color-gray-500']).toMatch(HEX);
		expect(t.light['--color-gray-500']).not.toBe(t.dark['--color-gray-500']);
		expect(t.light['--color-white']).toBe(t.dark['--color-white']);
		// Alias semánticos: siguen la cadena de var() hasta el color.
		expect(t.light['--ts-color-heading']).toBe(t.light['--color-gray-1000']);
		expect(t.dark['--ts-color-subtle']).toBe(t.dark['--color-gray-700']);
		// light-dark() entre variables: cada modo toma su lado.
		expect(t.light['--ts-color-toggle-thumb']).toBe(t.light['--color-background-100']);
		expect(t.dark['--ts-color-toggle-thumb']).toBe(t.dark['--color-gray-1000']);
		expect(t.light['--ts-color-danger']).toBe(t.light['--color-danger-500']);
		// Con alfa, tal cual.
		expect(t.light['--color-overlay-100']).toBe('oklch(0 0 0 / 0.40)');
		// El texto del tema contrasta con su fondo.
		expect(contrastRatio(t.light['--ts-color-heading'], t.light['--color-background-100'])!).toBeGreaterThan(7);
		expect(contrastRatio(t.dark['--ts-color-heading'], t.dark['--color-background-100'])!).toBeGreaterThan(7);
	});

	it('aplica lo pisado a mano y los tokens de color de una extensión', () => {
		const config: TaishoConfig = {
			themes: { acme: { colors: { brand: '#7c3aed' }, semantic: { subtle: '#112233', copy: 'light-dark(#010203, #fefdfc)' }, components: { 'acme-card': { edge: '#445566' } } } },
			fontFaces: [],
		};
		const extensiones = {
			'@acme/ui': defineExtension({
				components: { 'acme-card': { roots: ['acme-card'], css: '@utility ts-acme-card { color: var(--ts-acme-card-edge); }', tokens: { edge: '#abcdef', gap: '4px', tint: 'var(--color-brand-500)' } } },
			}),
		};
		const t = resolveThemeColors(config, extensiones).acme;
		expect(t.light['--color-brand-500']).toMatch(HEX);
		expect(t.light['--ts-color-subtle']).toBe('#112233');
		expect(t.dark['--ts-color-subtle']).toBe('#112233');
		expect(t.light['--ts-color-copy']).toBe('#010203');
		expect(t.dark['--ts-color-copy']).toBe('#fefdfc');
		expect(t.light['--ts-acme-card-edge']).toBe('#445566');
		expect(t.light['--ts-acme-card-tint']).toBe(t.light['--color-brand-500']);
		expect(t.light['--ts-acme-card-gap']).toBeUndefined();
	});

	it('da un resultado por tema', () => {
		const config: TaishoConfig = { themes: { a: { colors: { brand: '#7c3aed' } }, b: { colors: { brand: '#d42424' } } }, fontFaces: [] };
		const r = resolveThemeColors(config);
		expect(Object.keys(r)).toEqual(['a', 'b']);
		expect(r.a.light['--color-brand-500']).not.toBe(r.b.light['--color-brand-500']);
	});
});

describe('compositeOver', () => {
	it('compone con alfa sobre un fondo opaco, como el navegador (en sRGB)', () => {
		expect(compositeOver('rgba(0, 0, 0, 0.5)', '#ffffff')).toBe('#808080');
		expect(compositeOver('oklch(0 0 0 / 0.48)', '#ffffff')).toBe('#858585');
		expect(compositeOver('#00000080', '#ffffff')).toBe('#7f7f7f');
		expect(compositeOver('rgb(255 0 0 / 50%)', '#000')).toBe('#800000');
	});
	it('un color opaco queda igual y el fondo puede ser oklch', () => {
		expect(compositeOver('#ff0000', '#ffffff')).toBe('#ff0000');
		expect(compositeOver('#fff', 'oklch(0 0 0)')).toBe('#ffffff');
	});
	it('null si alguno no se interpreta o el fondo tiene alfa', () => {
		expect(compositeOver('color-mix(in srgb, red 50%, white)', '#fff')).toBeNull();
		expect(compositeOver('#000', 'nope')).toBeNull();
		expect(compositeOver('rgba(0,0,0,.5)', 'rgba(0,0,0,.5)')).toBeNull();
	});
});
