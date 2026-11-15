// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import type { ContentFile } from '../generate';

export interface ReadContentOptions {
	globs: string[];
	baseDir: string;
	outDir: string;
	excluir?: string[];
}

const nombraNodeModules = (glob: string) => glob.split('/').includes('node_modules');

export function listarContent({ globs, baseDir, outDir, excluir = [] }: ReadContentOptions): string[] {
	const salida = path.resolve(outDir);
	const vistos = new Set<string>();

	for (const glob of globs) {
		const conNodeModules = nombraNodeModules(glob);
		const matches = fs.globSync(glob, {
			cwd: baseDir,
			exclude: (ruta) => {
				const nombre = ruta.split(/[\\/]/).pop()!;
				return (nombre === 'node_modules' && !conNodeModules) || excluir.includes(nombre) || (nombre.startsWith('.') && nombre !== '.' && nombre !== '..');
			},
		});

		for (const rel of matches) {
			const abs = path.resolve(baseDir, rel);
			const segmentos = path.relative(baseDir, abs).split(path.sep);
			if (segmentos.some((s) => s.startsWith('.') && s !== '..')) continue;
			if (!conNodeModules && segmentos.includes('node_modules')) continue;
			if (segmentos.some((s) => excluir.includes(s))) continue;
			if (abs === salida || abs.startsWith(salida + path.sep)) continue;
			if (!fs.statSync(abs).isFile()) continue;

			const file = segmentos.join('/');
			if (vistos.has(file)) continue;
			vistos.add(file);
		}
	}
	return [...vistos];
}

export function readContent(opciones: ReadContentOptions): ContentFile[] {
	return listarContent(opciones).map((file) => ({ file, content: fs.readFileSync(path.resolve(opciones.baseDir, file), 'utf8') }));
}
