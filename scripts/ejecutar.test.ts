// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { armarComando } from './ejecutar';

describe('armarComando', () => {
	it('fuera de Windows ejecuta directo, sin shell ni comillas', () => {
		expect(armarComando('npm', ['pack', 'a b'], 'darwin')).toEqual({ cmd: 'npm', args: ['pack', 'a b'], shell: false });
		expect(armarComando('npx', ['tsc'], 'linux').shell).toBe(false);
	});

	it('en Windows pasa por shell y entrecomilla lo que tenga espacios', () => {
		const r = armarComando('npm', ['pack', 'C:\\mi carpeta\\x', '--pack-destination', '../paquetes'], 'win32');
		expect(r.shell).toBe(true);
		expect(r.args).toEqual(['pack', '"C:\\mi carpeta\\x"', '--pack-destination', '../paquetes']);
	});
});
