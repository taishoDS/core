// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Metafile } from 'esbuild';
import { construirCoreDirecto, PESADOS_DIRECTO, type ArchivoJs } from './build-core-directo';
import { MODULOS, archivoDe, PESADOS, type NombreModulo } from '../src/lib/core/modulos';

const CORE = path.resolve(__dirname, '../src/lib/core');
const nombres = Object.keys(MODULOS) as NombreModulo[];
const pesados = nombres.filter((n) => MODULOS[n].pesado);
const livianos = nombres.filter((n) => !MODULOS[n].pesado);

let archivos: ArchivoJs[];
const metafiles: Metafile[] = [];

beforeAll(async () => {
	archivos = await construirCoreDirecto({ minify: true, metafiles });
}, 120_000);

const de = (ruta: string) => archivos.find((a) => a.ruta === ruta)!.texto;

describe('Core del Modo directo', () => {
	it('la base no contiene el código de ningún módulo pesado', () => {
		const [base] = metafiles;
		const entrada = Object.values(base.outputs)[0];
		const dentro = Object.keys(entrada.inputs);
		const prohibidos = [...pesados.map(archivoDe), 'grid-logic'].flatMap((f) => [`src/lib/core/${f}.ts`, `src/lib/core/logica/${f}.ts`]);
		expect(dentro.filter((i) => prohibidos.includes(i))).toEqual([]);
		for (const n of livianos) expect(dentro, n).toContain(`src/lib/core/${archivoDe(n)}.ts`);
	});

	it('la base se basta sola: ningún import estático, y los pesados son sólo import() a archivos hermanos', () => {
		const base = de('taisho.core.js');
		expect(base).not.toMatch(/^import[ {]/m);
		expect(base).not.toMatch(/\bfrom\s*["']\.\//);
		const pedidos = [...base.matchAll(/import\("\.\/(taisho\.core\.[\w-]+\.js)"\)/g)].map((x) => x[1]).sort();
		expect(pedidos).toEqual(PESADOS_DIRECTO.map((n) => `taisho.core.${n}.js`).sort());
		for (const p of pedidos) expect(archivos.map((a) => a.ruta), p).toContain(p);
	});

	it('los archivos a pedido de la tabla existen y cada pesado con gancho tiene el suyo', () => {
		for (const { modulo } of PESADOS) {
			const archivo = archivoDe(modulo);
			expect(fs.existsSync(path.join(CORE, 'pesados', `${archivo}.ts`)), archivo).toBe(true);
		}
		const dueños = new Set(pesados.map(archivoDe));
		// `key-warning` (el aviso de la llave) es a pedido pero no es un componente: sólo se pide en desarrollo local.
		for (const n of PESADOS_DIRECTO.filter((x) => x !== 'key-warning')) expect(dueños.has(n), n).toBe(true);
	});

	it('base.ts registra los livianos de la tabla, y sólo ésos', () => {
		const fuente = fs.readFileSync(path.join(CORE, 'base.ts'), 'utf8');
		const importados = [...fuente.matchAll(/import \{ ficha as \w+ \} from '\.\/([\w-]+)';/g)].map((x) => x[1]).sort();
		const esperados = livianos.filter((n) => n !== 'listbox').map(archivoDe).sort();
		expect(importados).toEqual(esperados);
	});

	it('los pesados se reparten lo compartido en chunks: el listbox no se duplica entre Select y la paleta', () => {
		const conListbox = archivos.filter((a) => a.ruta.startsWith('taisho.core.') && a.texto.includes('listbox-tag-template') && a.ruta !== 'taisho.core.js');
		expect(conListbox.length).toBeLessThanOrEqual(1);
	});

	it('una base sola pesa lo que se prometió: menos de 15,2 KB gzip', async () => {
		const { gzipSync } = await import('node:zlib');
		expect(gzipSync(de('taisho.core.js'), { level: 9 }).length).toBeLessThan(15_600);
	});
});
