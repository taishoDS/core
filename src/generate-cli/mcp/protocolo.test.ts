// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { servirMcp, type Herramienta } from './protocolo';

const herramientas: Herramienta[] = [
	{
		name: 'eco',
		description: 'Devuelve el texto',
		inputSchema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
		handler: async (args) => `eco:${String(args.texto)}`,
	},
	{
		name: 'roto',
		description: 'Siempre falla',
		inputSchema: { type: 'object' },
		handler: () => {
			throw new Error('no pude');
		},
	},
];

/** Manda las líneas, cierra la entrada y devuelve lo escrito en la salida, parseado. */
async function correr(lineas: string[]): Promise<{ crudo: string; mensajes: Record<string, ReturnType<typeof JSON.parse>>[] }> {
	const entrada = new PassThrough();
	const salida = new PassThrough();
	let crudo = '';
	salida.on('data', (d) => (crudo += d));
	const fin = servirMcp({ entrada, salida, herramientas, instructions: 'reglas', nombre: 'taisho', version: '1.2.3' });
	for (const l of lineas) entrada.write(l + '\n');
	entrada.end();
	await fin;
	const mensajes = crudo.split('\n').filter(Boolean).map((l) => JSON.parse(l));
	return { crudo, mensajes };
}

const pedir = (id: number | string, method: string, params?: unknown) =>
	JSON.stringify({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) });

describe('servirMcp', () => {
	it('initialize devuelve la versión del cliente si está soportada', async () => {
		const { mensajes } = await correr([pedir(1, 'initialize', { protocolVersion: '2025-03-26' })]);
		expect(mensajes[0]).toEqual({
			jsonrpc: '2.0',
			id: 1,
			result: {
				protocolVersion: '2025-03-26',
				capabilities: { tools: {} },
				serverInfo: { name: 'taisho', version: '1.2.3' },
				instructions: 'reglas',
			},
		});
	});

	it('initialize con versión desconocida o ausente responde la última', async () => {
		const { mensajes } = await correr([
			pedir(1, 'initialize', { protocolVersion: '1999-01-01' }),
			pedir(2, 'initialize'),
		]);
		expect(mensajes[0].result.protocolVersion).toBe('2025-11-25');
		expect(mensajes[1].result.protocolVersion).toBe('2025-11-25');
	});

	it('acepta las cuatro versiones', async () => {
		for (const v of ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']) {
			const { mensajes } = await correr([pedir(1, 'initialize', { protocolVersion: v })]);
			expect(mensajes[0].result.protocolVersion).toBe(v);
		}
	});

	it('ping responde un objeto vacío', async () => {
		const { mensajes } = await correr([pedir('a', 'ping')]);
		expect(mensajes[0]).toEqual({ jsonrpc: '2.0', id: 'a', result: {} });
	});

	it('tools/list expone nombre, descripción y esquema sin el handler', async () => {
		const { mensajes } = await correr([pedir(1, 'tools/list')]);
		expect(mensajes[0].result.tools).toEqual([
			{ name: 'eco', description: 'Devuelve el texto', inputSchema: herramientas[0].inputSchema },
			{ name: 'roto', description: 'Siempre falla', inputSchema: { type: 'object' } },
		]);
	});

	it('tools/call devuelve el texto como content', async () => {
		const { mensajes } = await correr([pedir(1, 'tools/call', { name: 'eco', arguments: { texto: 'hola' } })]);
		expect(mensajes[0].result).toEqual({ content: [{ type: 'text', text: 'eco:hola' }], isError: false });
	});

	it('si el handler falla responde isError y el servidor sigue vivo', async () => {
		const { mensajes } = await correr([pedir(1, 'tools/call', { name: 'roto' }), pedir(2, 'ping')]);
		expect(mensajes[0].result).toEqual({ content: [{ type: 'text', text: 'no pude' }], isError: true });
		expect(mensajes[1]).toEqual({ jsonrpc: '2.0', id: 2, result: {} });
	});

	it('no responde a notificaciones, válidas o con método desconocido', async () => {
		const { crudo } = await correr([
			JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
			JSON.stringify({ jsonrpc: '2.0', method: 'lo/que/sea', params: {} }),
		]);
		expect(crudo).toBe('');
	});

	it('línea que no es JSON: -32700 con id null', async () => {
		const { mensajes } = await correr(['{no es json']);
		expect(mensajes[0]).toEqual({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
	});

	it('pedido inválido: -32600', async () => {
		const { mensajes } = await correr([
			'[1,2]',
			'42',
			JSON.stringify({ jsonrpc: '1.0', id: 1, method: 'ping' }),
			JSON.stringify({ jsonrpc: '2.0', id: 1 }),
			JSON.stringify({ jsonrpc: '2.0', id: {}, method: 'ping' }),
		]);
		expect(mensajes).toHaveLength(5);
		for (const m of mensajes) expect(m.error.code).toBe(-32600);
	});

	it('método desconocido con id: -32601', async () => {
		const { mensajes } = await correr([pedir(7, 'resources/list')]);
		expect(mensajes[0].id).toBe(7);
		expect(mensajes[0].error.code).toBe(-32601);
	});

	it('herramienta inexistente, sin nombre o argumentos incompletos: -32602', async () => {
		const { mensajes } = await correr([
			pedir(1, 'tools/call', { name: 'nada' }),
			pedir(2, 'tools/call', {}),
			pedir(3, 'tools/call', { name: 'eco', arguments: {} }),
			pedir(4, 'tools/call', { name: 'eco' }),
			pedir(5, 'tools/call', { name: 'eco', arguments: 'x' }),
		]);
		for (const m of mensajes) expect(m.error.code).toBe(-32602);
		expect(mensajes[2].error.message).toContain('texto');
	});

	it('mantiene el orden de respuesta y la salida son sólo líneas JSON-RPC', async () => {
		const { crudo, mensajes } = await correr([
			pedir(1, 'tools/call', { name: 'eco', arguments: { texto: 'a' } }),
			'',
			pedir(2, 'ping'),
			'basura',
		]);
		expect(mensajes.map((m) => m.id)).toEqual([1, 2, null]);
		for (const l of crudo.split('\n').filter(Boolean)) expect(JSON.parse(l).jsonrpc).toBe('2.0');
	});
});
