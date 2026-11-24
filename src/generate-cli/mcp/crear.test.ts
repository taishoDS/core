// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { REGLAS_DE_ESCRITURA } from '../../generate/llms/reglas';
import { createMcpServer, type McpTool } from './servidor';

const CORE = ['list_components', 'get_component', 'search_utilities', 'validate_markup', 'translate_tailwind', 'get_theme'];
const herramienta = (name: string, texto = name): McpTool => ({ name, description: `Prueba ${name}`, inputSchema: { type: 'object' }, handler: () => texto });
const crear = (extra: Partial<Parameters<typeof createMcpServer>[0]> = {}) => createMcpServer({ name: 'prueba', version: '9.9.9', lang: 'en', ...extra });

describe('createMcpServer', () => {
	it('sin opciones propias son las seis del Core y sus reglas', () => {
		const s = crear();
		expect(s.tools.map((t) => t.name)).toEqual(CORE);
		expect(s.instructions).toBe(REGLAS_DE_ESCRITURA.en);
	});

	it('las nuevas van al final y las reemplazadas quedan en su lugar', () => {
		const s = crear({ tools: () => [herramienta('extra'), herramienta('get_theme', 'propio')], replaces: ['get_theme'] });
		expect(s.tools.map((t) => t.name)).toEqual([...CORE, 'extra']);
		expect(s.tools.find((t) => t.name === 'get_theme')!.handler({})).toBe('propio');
	});

	it('las instrucciones propias van después de las del Core', () => {
		const s = crear({ instructions: (lang) => `extra en ${lang}` });
		expect(s.instructions).toBe(`${REGLAS_DE_ESCRITURA.en}\n\nextra en en`);
	});

	it('el contexto trae cwd, idioma y project()', () => {
		let ctx!: Parameters<NonNullable<Parameters<typeof createMcpServer>[0]['tools']>>[0];
		crear({ tools: (c) => ((ctx = c), []) });
		expect(ctx.cwd).toBe(process.cwd());
		expect(ctx.lang).toBe('en');
		expect(typeof ctx.project).toBe('function');
	});

	describe('errores al crear', () => {
		it('nombre del Core sin `replaces`', () => {
			expect(() => crear({ tools: () => [herramienta('get_theme')] })).toThrow(/"get_theme" is already a Core tool/);
		});
		it('`replaces` con un nombre que no es del Core', () => {
			expect(() => crear({ tools: () => [herramienta('nueva')], replaces: ['nueva'] })).toThrow(/"nueva", which is not a Core tool/);
		});
		it('`replaces` sin la herramienta en `tools`', () => {
			expect(() => crear({ replaces: ['get_theme'] })).toThrow(/"get_theme", but `tools` has no tool/);
		});
		it('nombre repetido dentro de `tools`', () => {
			expect(() => crear({ tools: () => [herramienta('x'), herramienta('x')] })).toThrow(/"x" is repeated/);
		});
	});

	it('listen sirve el protocolo con el nombre, la versión, las herramientas y las instrucciones propias', async () => {
		const s = crear({ tools: () => [herramienta('extra', 'hola')], instructions: () => 'reglas propias' });
		const entrada = new PassThrough();
		const salida = new PassThrough();
		let crudo = '';
		salida.on('data', (d) => (crudo += d));
		const fin = s.listen(entrada, salida);
		const pedir = (id: number, method: string, params?: object) => entrada.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
		pedir(1, 'initialize', { protocolVersion: '2025-06-18' });
		pedir(2, 'tools/list');
		pedir(3, 'tools/call', { name: 'extra', arguments: {} });
		entrada.end();
		await fin;
		const [init, lista, llamada] = crudo.split('\n').filter(Boolean).map((l) => JSON.parse(l));
		expect(init.result.serverInfo).toEqual({ name: 'prueba', version: '9.9.9' });
		expect(init.result.instructions.endsWith('reglas propias')).toBe(true);
		expect(init.result.instructions.startsWith(REGLAS_DE_ESCRITURA.en)).toBe(true);
		expect(lista.result.tools.map((t: { name: string }) => t.name)).toEqual([...CORE, 'extra']);
		expect(llamada.result.content[0].text).toBe('hola');
	});
});
