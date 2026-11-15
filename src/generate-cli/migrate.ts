// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import type { TaishoConfig } from '../generate';
import { migrarAScope, vocabularioClasico, type TipoNoConvertido } from '../generate/migrar-clasico';
import { readContent } from './read-content';
import { loadConfig, isValidConfig, carpetaDeSalida } from './generate';
import { m, usarIdioma, type Lang } from './idioma';
import { mensajeDe } from './errores';
import { extensionesDelProyecto } from './descubrir-paquetes';

const CONTENT_POR_DEFECTO = ['**/*.{svelte,html,ts,js,css}'];
const TEXTO = /\.(svelte|html|ts|js|css|md)$/;

export interface RunMigrateOptions {
	from?: string;
	write?: boolean;
	configPath?: string;
	outDir?: string;
	rutas?: string[];
	lang?: Lang;
}

export function globDeRuta(ruta: string, cwd: string, baseDir: string, patron = '*.{svelte,html,ts,js,css}'): string {
	const abs = path.resolve(cwd, ruta);
	const rel = path.relative(baseDir, abs).split(path.sep).join('/') || '.';
	return fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? `${rel}/**/${patron}` : rel;
}

export async function runMigrate(options: RunMigrateOptions): Promise<void> {
	usarIdioma(options.lang);
	if (options.from !== 'classic') {
		console.error(m().clasico.faltaFrom);
		process.exitCode = 2;
		return;
	}
	const cwd = process.cwd();
	const configPath = path.resolve(cwd, options.configPath ?? 'taisho.config.ts');
	let config: TaishoConfig = { themes: {}, fontFaces: [] };
	if (fs.existsSync(configPath)) {
		let cargada: unknown;
		try {
			cargada = await loadConfig(configPath);
		} catch (err) {
			console.error(m().config.noCargo(path.relative(cwd, configPath)));
			console.error(mensajeDe(err));
			process.exitCode = 1;
			return;
		}
		if (!isValidConfig(cargada)) {
			console.error(m().config.invalida(path.relative(cwd, configPath)));
			process.exitCode = 1;
			return;
		}
		config = cargada;
		usarIdioma(options.lang, config);
	}
	const t = m().clasico;

	const baseDir = path.dirname(configPath);
	const archivos = readContent({
		globs: options.rutas?.length ? options.rutas.map((r) => globDeRuta(r, cwd, baseDir)) : (config.content ?? CONTENT_POR_DEFECTO),
		baseDir,
		outDir: carpetaDeSalida(config, configPath, options.outDir, cwd),
	}).filter((f) => TEXTO.test(f.file) && !f.file.split('/').includes('node_modules'));

	const vocabulario = vocabularioClasico(config, extensionesDelProyecto(cwd));
	const porTipo = new Map<TipoNoConvertido, number>();
	const lineas: string[] = [];
	const pendientes: string[] = [];
	let convertidos = 0;
	let renombres = 0;
	let llaves = 0;
	let tocados = 0;

	for (const f of archivos) {
		const r = migrarAScope(f.content, { vocabulario, esCss: f.file.endsWith('.css') });
		convertidos += r.convertidos;
		renombres += r.renombres;
		llaves += r.llaves;
		if (r.texto !== f.content) {
			tocados++;
			lineas.push(t.archivo(f.file, r.convertidos, r.llaves, r.renombres));
			if (options.write) fs.writeFileSync(path.resolve(baseDir, f.file), r.texto);
		}
		for (const n of r.noConvertidos) {
			porTipo.set(n.tipo, (porTipo.get(n.tipo) ?? 0) + 1);
			pendientes.push(`  ${f.file}:${n.línea}  ${n.token}  [${n.tipo}] ${t.motivo[n.tipo]}`);
		}
	}

	console.log(t.cabecera(!!options.write));
	console.log(t.convertidos(!!options.write, tocados));
	console.log(lineas.length ? lineas.join('\n') : t.nada);
	console.log(t.pendientes(pendientes.length));
	console.log(pendientes.length ? pendientes.join('\n') : t.nada);
	console.log(t.resumen(archivos.length, tocados, !!options.write, convertidos, llaves, renombres));
	if (porTipo.size) console.log(t.porTipo([...porTipo].sort().map(([tipo, n]) => `${tipo} ${n}`).join(', ')));
}
