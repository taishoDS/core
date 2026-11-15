// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildAtomicCSS } from './emit-atomic';
import { buildVocabularyColors } from '../config/scales';

describe('buildAtomicCSS — ts-color-*-contrast', () => {
	const colores = buildVocabularyColors({ brand: '#4F46E5' }, {});
	const css = buildAtomicCSS(colores, {});
	const contraste = [...css.matchAll(/@utility (ts-color-([A-Za-z]+)-(\d+)-contrast) /g)];

	it('hay utilidades -contrast de las paletas que definen el token', () => {
		expect(contraste.length).toBeGreaterThan(0);
		expect(css).toContain('@utility ts-color-brand-500-contrast ');
	});
	it('las neutras sin token -contrast (gray, grayAlpha, background, overlay) no emiten utilidades que apunten a una variable inexistente', () => {
		for (const [, , paleta] of contraste) expect(['gray', 'grayAlpha', 'background', 'overlay']).not.toContain(paleta);
	});
	it('toda utilidad -contrast corresponde a un token de su paleta', () => {
		for (const [, , paleta, paso] of contraste) expect(`${paso}-contrast` in colores[paleta]).toBe(true);
	});
});

describe('buildAtomicCSS — sólido de marca', () => {
	const css = buildAtomicCSS(buildVocabularyColors({ brand: '#4F46E5' }, {}), {});
	it('emite fondo y texto del sólido (y sus hover/active) para las familias con -contrast', () => {
		expect(css).toContain('@utility ts-bg-brand-solid { background-color: var(--color-brand-solid); }');
		expect(css).toContain('@utility ts-color-brand-solid-hover-contrast { color: var(--color-brand-solid-hover-contrast); }');
		expect(css).toContain('@utility ts-outline-brand-solid ');
	});
	it('las neutras no tienen sólido', () => {
		expect(css).not.toMatch(/ts-bg-gray-solid|ts-bg-background-solid/);
	});
	it('el primario es un rol: sólo las siete utilidades -solid, nunca una escala primary-N', () => {
		expect(css).toContain('@utility ts-bg-primary-solid-hover { background-color: var(--color-primary-solid-hover); }');
		expect(css).toContain('@utility ts-color-primary-solid-active-contrast { color: var(--color-primary-solid-active-contrast); }');
		expect(css).toContain('@utility ts-outline-primary-solid ');
		expect(css.match(/@utility ts-\S*primary-solid/g)).toHaveLength(7);
		expect(css).not.toMatch(/ts-\S*primary-\d/);
	});
});
