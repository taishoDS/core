// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { avisosDeCheck } from '../avisos-check';
import { configDeFabrica } from '../../generate-cli/check';
import { REGLAS_DE_ESCRITURA } from './reglas';

const bloquesHtml = (md: string) => [...md.matchAll(/^```html\n([\s\S]*?)^```/gm)].map((m) => m[1]);

describe('REGLAS_DE_ESCRITURA', () => {
	for (const idioma of ['es', 'en'] as const) {
		const texto = REGLAS_DE_ESCRITURA[idioma];

		it(`${idioma}: trae las nueve reglas, numeradas`, () => {
			for (let n = 1; n <= 9; n++) expect(texto, `regla ${n}`).toMatch(new RegExp(`^${n}\\. `, 'm'));
		});

		it(`${idioma}: cada ejemplo pasa npx taisho check sin avisos (también other-scale)`, () => {
			const bloques = bloquesHtml(texto);
			expect(bloques.length).toBeGreaterThanOrEqual(4);
			for (const [i, html] of bloques.entries()) {
				expect(avisosDeCheck([{ file: `regla-${i}.html`, content: html }], configDeFabrica(), [], {}, { otherScale: true }), html).toEqual([]);
			}
		});

		it(`${idioma}: las listas salen del código (ritmo, colores, variantes)`, () => {
			for (const palabra of ['none', 'quarter', 'half', 'base', 'section', 'double']) expect(texto).toContain(`\`${palabra}\``);
			for (const color of ['gray', 'brand', 'brand-secondary', 'accent', 'success', 'warning', 'info', 'danger']) expect(texto).toContain(`\`${color}\``);
			for (const variante of ['md:', 'max-md:', '@md:', 'hover:', 'focus-visible:', 'aria-busy:', 'disabled:']) expect(texto).toContain(`\`${variante}\``);
		});

		it(`${idioma}: no nombra nada que no sea del Core`, () => {
			// Los nombres se arman por partes para que este archivo no los contenga escritos.
			const ajenos = ['PL' + 'US', 'Ki' + 'ts?', 'Tail' + 'wind'].join('|');
			expect(texto).not.toMatch(new RegExp(`\\b(?:${ajenos})\\b`, 'i'));
		});
	}

	it('es: español neutro, sin vos ni tú', () => {
		expect(REGLAS_DE_ESCRITURA.es).not.toMatch(/\b(?:vos|tenés|podés|escribí|corré|usá|sos|tú|puedes|tienes)\b/i);
	});
});
