// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { cumpleRango, rangoValido } from './rango-core';

describe('cumpleRango', () => {
	it('una versión exacta es un rango', () => {
		expect(cumpleRango('0.16.0', '0.16.0')).toBe(true);
		expect(cumpleRango('0.16.1', '0.16.0')).toBe(false);
		expect(cumpleRango('0.16.0', '=0.16.0')).toBe(true);
	});
	it('^ en 0.x se queda en el minor; desde 1.0 en el major', () => {
		expect(cumpleRango('0.17.0', '^0.17.0')).toBe(true);
		expect(cumpleRango('0.17.9', '^0.17.0')).toBe(true);
		expect(cumpleRango('0.18.0', '^0.17.0')).toBe(false);
		expect(cumpleRango('0.16.9', '^0.17.0')).toBe(false);
		expect(cumpleRango('0.0.3', '^0.0.3')).toBe(true);
		expect(cumpleRango('0.0.4', '^0.0.3')).toBe(false);
		expect(cumpleRango('1.9.0', '^1.2.0')).toBe(true);
		expect(cumpleRango('2.0.0', '^1.2.0')).toBe(false);
	});
	it('~ fija el minor', () => {
		expect(cumpleRango('0.17.5', '~0.17.2')).toBe(true);
		expect(cumpleRango('0.17.1', '~0.17.2')).toBe(false);
		expect(cumpleRango('0.18.0', '~0.17.2')).toBe(false);
	});
	it('comparadores separados por espacio se cumplen todos', () => {
		expect(cumpleRango('0.18.3', '>=0.17.0 <0.19.0')).toBe(true);
		expect(cumpleRango('0.19.0', '>=0.17.0 <0.19.0')).toBe(false);
		expect(cumpleRango('0.16.0', '>=0.17.0 <0.19.0')).toBe(false);
		expect(cumpleRango('0.17.0', '>0.17.0')).toBe(false);
		expect(cumpleRango('0.17.0', '<=0.17.0')).toBe(true);
	});
	it('acepta espacio después del operador y espacios de sobra', () => {
		expect(cumpleRango('0.18.0', '>= 0.17.0 < 0.19.0')).toBe(true);
		expect(cumpleRango('0.18.0', '  >=0.17.0   <0.19.0 ')).toBe(true);
		expect(cumpleRango('0.17.5', '^ 0.17.0')).toBe(true);
		expect(cumpleRango('0.19.0', '  >=0.17.0   <0.19.0 ')).toBe(false);
	});
	it('una prerelease sólo entra si el rango nombra una de la misma x.y.z', () => {
		expect(cumpleRango('0.17.0-rc.1', '^0.17.0')).toBe(false);
		expect(cumpleRango('0.17.0-rc.1', '0.17.0-rc.1')).toBe(true);
		expect(cumpleRango('0.17.0-rc.2', '>=0.17.0-rc.1 <0.18.0')).toBe(true);
		expect(cumpleRango('0.17.0-rc.1', '>=0.17.0-rc.2')).toBe(false);
		expect(cumpleRango('0.17.0-rc.2', '^0.17.0-rc.1')).toBe(true);
		expect(cumpleRango('0.17.1-rc.1', '^0.17.0-rc.1')).toBe(false);
		expect(cumpleRango('0.17.0', '>=0.17.0-rc.1')).toBe(true);
		expect(cumpleRango('0.17.0-beta', '>=0.17.0-alpha.9')).toBe(true);
		expect(cumpleRango('0.17.0-rc.10', '>=0.17.0-rc.9')).toBe(true);
	});
	it('un rango o una versión mal escritos dan null', () => {
		for (const r of ['', 'latest', '*', '0.17', '^0.17', '^^0.17.0', '>= ', '^0.17.0 ||^0.18.0', '0.17.x', 'v0.17.0', '01.2.3']) {
			expect(cumpleRango('0.17.0', r), r).toBeNull();
		}
		expect(cumpleRango('0.17', '^0.17.0')).toBeNull();
		expect(rangoValido('>=0.17.0 <0.19.0')).toBe(true);
		expect(rangoValido('^0.17')).toBe(false);
	});
});
