// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Custom properties del tema que el JS del Core lee por CSSOM (`getComputedStyle(...).getPropertyValue`) y que el
 * CSS emitido no referencia. Entran siempre.
 * Las que el JS sólo ESCRIBE (`--ts-overlay-x`, `--ts-progress-value`…) no son del tema: las declara el componente.
 */
export const CORE_JS_THEME_VARS: readonly string[] = ['--ts-space-quarter'];

const DECLARACION = /^\s*(--[\w-]+)\s*:(.*);\s*$/;
const REFERENCIA = /var\(\s*(--[\w-]+)/g;

/** Custom properties que el código del consumidor nombra (`var(--ts-x)` en su CSS, `getPropertyValue('--color-y')` en su JS). */
export function varsInContent(files: readonly { content: string }[]): string[] {
	return files.flatMap((f) => f.content.match(/--[a-zA-Z][\w-]*/g) ?? []);
}

export function varsReferenciadas(css: string): Set<string> {
	return new Set([...css.matchAll(REFERENCIA)].map((m) => m[1]));
}

/**
 * Devuelve `themeCss` sin las custom properties que nadie alcanza. Una variable viva conserva su declaración en
 * cada contexto (`:root`, `.dark`, compact, `@media`). Lo que no es una declaración (comentarios, `@font-face`,
 * `color-scheme`) queda igual; los bloques que se vacían se quitan.
 * @param usedCss CSS a demanda cuyas `var(--…)` son la semilla.
 * @param extras Nombres que también cuentan como usados (`--ts-x` del JS del Core, del CSS propio del consumidor).
 */
export function pruneTheme(themeCss: string, usedCss: string, extras: Iterable<string> = []): string {
	const lineas = themeCss.split('\n');
	const valores = new Map<string, string[]>();
	for (const l of lineas) {
		const m = DECLARACION.exec(l);
		if (m) valores.set(m[1], [...(valores.get(m[1]) ?? []), m[2]]);
	}
	const vivas = new Set<string>();
	const pendientes = [...varsReferenciadas(usedCss), ...extras];
	for (let n = pendientes.pop(); n !== undefined; n = pendientes.pop()) {
		if (vivas.has(n) || !valores.has(n)) continue;
		vivas.add(n);
		for (const v of valores.get(n)!) pendientes.push(...varsReferenciadas(v));
	}
	let css = lineas.filter((l) => {
		const m = DECLARACION.exec(l);
		return !m || vivas.has(m[1]);
	}).join('\n');
	const vacio = /^[ \t]*[^\n{}]+\{\s*\}[ \t]*\n/gm;
	for (let previo = ''; previo !== css; ) { previo = css; css = css.replace(vacio, ''); }
	return css.replace(/\n{3,}/g, '\n\n');
}

