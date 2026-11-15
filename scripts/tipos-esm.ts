// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';

const ESPECIFICADOR = /(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}(?:\/[^'"]*)?)\2/g;

function listar(dir: string, out: string[] = []): string[] {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) listar(p, out);
		else if (e.name.endsWith('.d.ts')) out.push(p);
	}
	return out;
}

function resolver(desde: string, esp: string): string {
	const base = path.resolve(path.dirname(desde), esp);
	const sinExt = base.replace(/\.(ts|js)$/, '');
	if (fs.existsSync(`${sinExt}.d.ts`)) return `${esp.replace(/\.(ts|js)$/, '')}.js`;
	if (fs.existsSync(path.join(base, 'index.d.ts'))) return `${esp.replace(/\/$/, '')}/index.js`;
	throw new Error(`Tipos: no resuelve '${esp}' desde ${desde}`);
}

export function tiposConExtension(raiz: string): number {
	const archivos = listar(raiz);
	for (const archivo of archivos) {
		const texto = fs.readFileSync(archivo, 'utf8');
		const nuevo = texto.replace(ESPECIFICADOR, (_, pre: string, q: string, esp: string) => `${pre}${q}${resolver(archivo, esp)}${q}`);
		if (nuevo !== texto) fs.writeFileSync(archivo, nuevo);
	}
	return archivos.length;
}
