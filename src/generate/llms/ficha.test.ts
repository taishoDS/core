// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { avisosDeCheck } from '../avisos-check';
import { configDeFabrica } from '../../generate-cli/check';
import { fichaMarkdown, type DatosFicha } from './ficha';

const datos: DatosFicha = {
	slug: 'button',
	nombre: 'Button',
	guia: {
		what: 'Dispara una acción.',
		whenUse: ['Guardar, enviar.'],
		whenAvoid: ['Navegar en medio de un texto → `link`.'],
		dos: ['Una acción primaria por contexto.'],
		donts: ['Cinco botones primarios.'],
		related: ['link', 'menu'],
	},
	bloques: ['button', 'button-group'],
	atributos: [],
	teclado: [{ keys: 'Enter', action: 'Activa el botón.' }],
	ejemplos: [
		{ titulo: 'Principal', html: '<button type="button" class="ts button size-md variant-primary">Guardar</button>' },
		{ titulo: 'Secundario', html: '<button type="button" class="ts button size-sm variant-secondary">Cancelar</button>' },
	],
};

describe('fichaMarkdown', () => {
	it('arma las secciones de la ficha en español', () => {
		const md = fichaMarkdown(datos, 'es');
		expect(md).toMatch(/^# Button\n\nDispara una acción\./);
		for (const titulo of ['## Cuándo usarlo', '## Cuándo no usarlo', '## Sí', '## No', '## Clases', '## JavaScript', '## Teclado', '## Ejemplos']) expect(md).toContain(titulo);
		expect(md).toContain('- Raíz: `ts button`, `ts button-group`');
		expect(md).toContain('- Modificadores: `size-md`, `variant-primary`, `size-sm`, `variant-secondary`');
		expect(md).toContain('No necesita JavaScript.');
		expect(md).toContain('- `Enter`: Activa el botón.');
		expect(md).toContain('Relacionados: `link`, `menu`.');
	});

	it('lo escribe aparte en inglés', () => {
		const md = fichaMarkdown(datos, 'en');
		for (const titulo of ['## When to use it', '## When not to use it', '## Do', "## Don't", '## Classes', '## Keyboard', '## Examples']) expect(md).toContain(titulo);
		expect(md).toContain('It needs no JavaScript.');
		expect(md).toContain('- Root: `ts button`, `ts button-group`');
	});

	it('lista los atributos cuando el componente necesita JS', () => {
		const md = fichaMarkdown({ ...datos, atributos: ['data-ts-tabs', 'data-ts-value'], nucleo: 'El panel activo lo cambia el Core.' }, 'es');
		expect(md).toContain('Necesita el JavaScript del Core (`taisho.core.js`). Atributos: `data-ts-tabs`, `data-ts-value`.');
		expect(md).toContain('El panel activo lo cambia el Core.');
		expect(md).not.toContain('No necesita JavaScript.');
	});

	it('maxEjemplos corta los ejemplos y nivel baja los títulos, pero los modificadores salen de todos', () => {
		const md = fichaMarkdown(datos, 'es', { maxEjemplos: 1, nivel: 2 });
		expect(md).toMatch(/^## Button\n/);
		expect(md).toContain('### Ejemplos');
		expect(md).toContain('#### Principal');
		expect(md).not.toContain('Secundario');
		expect(md).toContain('`variant-secondary`');
	});

	it('omite las secciones sin datos', () => {
		const md = fichaMarkdown({ ...datos, guia: undefined, teclado: [], ejemplos: [] }, 'es');
		expect(md).not.toMatch(/Cuándo|Teclado|Ejemplos|Relacionados/);
		expect(md).toContain('## Clases');
	});

	it('los ejemplos de la ficha pasan taisho check sin avisos', () => {
		const html = [...fichaMarkdown(datos, 'es').matchAll(/^```html\n([\s\S]*?)^```/gm)].map((m) => m[1]).join('\n');
		expect(avisosDeCheck([{ file: 'ficha.html', content: html }], configDeFabrica(), [], {}, { otherScale: true })).toEqual([]);
	});
});
