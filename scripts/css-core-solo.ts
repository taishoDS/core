// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * El CSS del Core, SIN extensiones: lo que se publica en `@taishods/core` y en el CDN.
 *
 * `npm run generate` escribe en `src/lib/css` el CSS del sitio, con las extensiones que éste registra. Lo que el Core publica no
 * lleva extensiones ni lee ningún archivo del repo: se compila con la misma config y con un contenido FIJO, el conjunto curado de
 * variantes de `VARIANTES_CDN_EXTRA` más lo que `compile` ya trae de serie cuando no hay `content` (`variantesCuradas` y
 * `FAMILIAS_*` en `src/generate/emit-flat.ts`). Si el marcado del sitio cambia, este archivo no cambia.
 */
import { compile, deriveThemeVocabulary, resolveThemeTokens, buildTokensCSS, type ContentFile } from '../src/generate';
import { buildRepoConfig } from '../src/config/pipeline';

/**
 * Familias de relleno y margen que el CSS completo trae por pantalla (`sm:`, `md:`, `lg:`, `xl:`; los contenedores `@…` no), ADEMÁS de las de `emit-flat.ts` (display, flex, grilla, gap,
 * alineación, ancho por palabra, `hover:` de color/subrayado/opacidad y `print:`). Sólo los pasos con nombre de la escala `spaces`
 * (`none`, `quarter`, `half`, `base`, `section`, `double`: la misma que ya cubre `gap`). Los números (`md:p-16`) y los negativos
 * piden `taisho generate` + `content`.
 */
const FAMILIAS_ESPACIADO_CDN = ['p', 'px', 'py', 'm', 'mx', 'my', 'mt', 'mb'];

export function variantesDelCdn(pantallas: readonly string[], pasos: readonly string[]): string[] {
	const out: string[] = [];
	for (const pantalla of pantallas) {
		for (const familia of FAMILIAS_ESPACIADO_CDN) for (const paso of pasos) out.push(`${pantalla}:${familia}-${paso}`);
	}
	return out;
}

export interface CssDelCore {
	/** `taisho.full.css` completo. */
	full: string;
	/** El CSS de cada tema, por ruta relativa a `tokens/` (`taisho.css`, `themes/oscuro.css`). */
	temas: Record<string, string>;
}

export function cssDelCoreSolo(): CssDelCore {
	const config = buildRepoConfig();
	const tema = deriveThemeVocabulary(config);
	const temas: Record<string, string> = {};
	for (const entry of tema.themeEntries) {
		const modelo = resolveThemeTokens(entry, tema.userFonts, tema.defaultStates, tema.userScales);
		temas[entry.group === 'root' ? `${entry.name}.css` : `${entry.group}/${entry.name}.css`] = buildTokensCSS(modelo);
	}
	const contenido: ContentFile = { file: 'variantes-del-cdn', content: variantesDelCdn(Object.keys(tema.userScales.screens), Object.keys(tema.userScales.spaces)).join(' ') };
	return { full: compile(config, [contenido]).css, temas };
}
