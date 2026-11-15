// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { IconEntry } from './icon-utils';

export function buildIconSprite(icons: Record<string, IconEntry>): string {
	const nombres = Object.keys(icons).sort();
	const symbols = nombres
		.map((nombre) => {
			const { viewBox, body, stroke } = icons[nombre];
			const presentacion = stroke
				? ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
				: '';
			return `  <symbol id="ts-${nombre}" viewBox="${viewBox}"${presentacion}>${body}</symbol>`;
		})
		.join('\n');
	return (
		'<!-- Archivo auto-generado por `taisho generate`: sprite de íconos. -->\n' +
		'<svg xmlns="http://www.w3.org/2000/svg" class="ts-sr-only" aria-hidden="true">\n' +
		symbols +
		'\n</svg>\n'
	);
}
