// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Integridad (SRI) de los archivos del CDN propio: `static/core/<versión>/integrity.json`.
 *
 * Lo escribe `npm run build:cdn` junto con el resto de la carpeta y lo leen el sitio (portada y doc: las líneas del CDN
 * salen de ahí, no se escriben a mano) y `check-estatico`. Cubre lo que un usuario enlaza con una etiqueta: el CSS
 * (`taisho.<nombre>.css`) y `taisho.core.js`. Los módulos que `taisho.core.js` pide con `import()` no entran: `integrity`
 * de la etiqueta cubre sólo el archivo enlazado.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export const ARCHIVO_INTEGRIDAD = 'integrity.json';

export interface Integridad {
	version: string;
	algorithm: 'sha384';
	files: Record<string, string>;
}

/** `sha384-<base64>`: el valor del atributo `integrity`. */
export const hashSri = (bytes: Uint8Array): string => `sha384-${createHash('sha384').update(bytes).digest('base64')}`;

/** Los archivos que el usuario enlaza con `<link>` o `<script>`; no los módulos ni los chunks que se cargan con `import()`. */
export const esEnlazable = (archivo: string): boolean => /^taisho\.[a-z0-9-]+\.css$/.test(archivo) || archivo === 'taisho.core.js';

export function calcularIntegridad(carpeta: string, version: string): Integridad {
	const files: Record<string, string> = {};
	for (const f of fs.readdirSync(carpeta).filter(esEnlazable).sort()) files[f] = hashSri(fs.readFileSync(path.join(carpeta, f)));
	return { version, algorithm: 'sha384', files };
}

export function escribirIntegridad(carpeta: string, version: string): Integridad {
	const integridad = calcularIntegridad(carpeta, version);
	fs.writeFileSync(path.join(carpeta, ARCHIVO_INTEGRIDAD), JSON.stringify(integridad, null, '\t') + '\n');
	return integridad;
}

/** Los hashes que el manifiesto declara y no coinciden con el archivo de la carpeta (o el archivo no está). */
export function hashesRotos(carpeta: string): string[] {
	const { files }: Integridad = JSON.parse(fs.readFileSync(path.join(carpeta, ARCHIVO_INTEGRIDAD), 'utf8'));
	return Object.entries(files).flatMap(([f, hash]) => {
		const ruta = path.join(carpeta, f);
		return fs.existsSync(ruta) && hashSri(fs.readFileSync(ruta)) === hash ? [] : [f];
	});
}

/** Los README de `scripts/core-readme/`: `{{version}}` y `{{integrity:<archivo>}}` (el hash de `static/core/<versión>/integrity.json`). */
export function rellenarReadme(texto: string, version: string): string {
	const ruta = path.join(RAIZ, 'static/core', version, ARCHIVO_INTEGRIDAD);
	if (!fs.existsSync(ruta)) throw new Error(`Falta static/core/${version}/${ARCHIVO_INTEGRIDAD}: \`npm run build:cdn\` lo arma con la carpeta de la versión.`);
	const { files }: Integridad = JSON.parse(fs.readFileSync(ruta, 'utf8'));
	return texto.replaceAll('{{version}}', version).replace(/\{\{integrity:([^}]+)\}\}/g, (_, archivo: string) => {
		if (!files[archivo]) throw new Error(`static/core/${version}/${ARCHIVO_INTEGRIDAD} no trae el hash de ${archivo}.`);
		return files[archivo];
	});
}
