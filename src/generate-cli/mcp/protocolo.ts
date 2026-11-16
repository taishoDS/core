// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

/** Versiones del protocolo que se aceptan, de la más nueva a la más vieja. */
export const VERSIONES_MCP = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;

export interface EsquemaEntrada {
	type: 'object';
	properties?: Record<string, unknown>;
	required?: string[];
	[clave: string]: unknown;
}

export interface Herramienta {
	name: string;
	description: string;
	inputSchema: EsquemaEntrada;
	/** Devuelve el texto de la respuesta; si lanza, la llamada vuelve con `isError: true`. */
	handler: (args: Record<string, unknown>) => string | Promise<string>;
}

export interface OpcionesServidor {
	entrada: Readable;
	salida: Writable;
	herramientas: Herramienta[];
	instructions: string;
	nombre: string;
	version: string;
}

type Id = string | number | null;

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Servidor MCP por stdio: JSON-RPC 2.0, un mensaje por línea. En `salida` sólo escribe
 * respuestas del protocolo. Se resuelve cuando la entrada se cierra y terminó lo pendiente.
 */
export function servirMcp(opciones: OpcionesServidor): Promise<void> {
	const { entrada, salida, herramientas, instructions, nombre, version } = opciones;

	const enviar = (mensaje: object): void => {
		salida.write(JSON.stringify(mensaje) + '\n');
	};
	const responder = (id: Id, result: unknown): void => enviar({ jsonrpc: '2.0', id, result });
	const fallar = (id: Id, code: number, message: string): void =>
		enviar({ jsonrpc: '2.0', id, error: { code, message } });

	async function llamar(id: Id, params: unknown): Promise<void> {
		if (!esObjeto(params) || typeof params.name !== 'string') {
			return fallar(id, -32602, 'tools/call needs a string "name"');
		}
		const herramienta = herramientas.find((h) => h.name === params.name);
		if (!herramienta) return fallar(id, -32602, `Unknown tool: ${params.name}`);
		const args = params.arguments ?? {};
		if (!esObjeto(args)) return fallar(id, -32602, '"arguments" must be an object');
		const faltan = (herramienta.inputSchema.required ?? []).filter((k) => !(k in args));
		if (faltan.length > 0) {
			return fallar(id, -32602, `Missing required argument(s): ${faltan.join(', ')}`);
		}
		try {
			const text = await herramienta.handler(args);
			responder(id, { content: [{ type: 'text', text }], isError: false });
		} catch (error) {
			const text = error instanceof Error ? error.message : String(error);
			responder(id, { content: [{ type: 'text', text }], isError: true });
		}
	}

	async function atender(linea: string): Promise<void> {
		let mensaje: unknown;
		try {
			mensaje = JSON.parse(linea);
		} catch {
			return fallar(null, -32700, 'Parse error');
		}
		if (!esObjeto(mensaje) || mensaje.jsonrpc !== '2.0' || typeof mensaje.method !== 'string') {
			return fallar(null, -32600, 'Invalid Request');
		}
		if (!('id' in mensaje)) return; // notificación: no se responde
		const id = mensaje.id;
		if (typeof id !== 'string' && typeof id !== 'number') return fallar(null, -32600, 'Invalid Request');

		switch (mensaje.method) {
			case 'initialize': {
				const pedida = esObjeto(mensaje.params) ? mensaje.params.protocolVersion : undefined;
				const protocolVersion = (VERSIONES_MCP as readonly unknown[]).includes(pedida)
					? pedida
					: VERSIONES_MCP[0];
				return responder(id, {
					protocolVersion,
					capabilities: { tools: {} },
					serverInfo: { name: nombre, version },
					instructions,
				});
			}
			case 'ping':
				return responder(id, {});
			case 'tools/list':
				return responder(id, {
					tools: herramientas.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
				});
			case 'tools/call':
				return llamar(id, mensaje.params);
			default:
				return fallar(id, -32601, `Method not found: ${mensaje.method}`);
		}
	}

	return new Promise((resolver) => {
		let cola: Promise<void> = Promise.resolve();
		const lector = readline.createInterface({ input: entrada, crlfDelay: Infinity });
		lector.on('line', (linea) => {
			if (linea.trim() === '') return;
			cola = cola.then(() => atender(linea));
		});
		lector.on('close', () => {
			void cola.then(() => resolver());
		});
	});
}
