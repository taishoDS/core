// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/** Los `params` de cada aviso de `generate`, `watch`, el plugin `taisho()` y `check`. */
export interface WarningParams {
	/** La config trae `scope` (ya no decide nada). */
	'scope-option': Record<string, never>;
	/** Una variante sobre un componente (`md:button`). */
	'variant-on-component': { class: string; variants: string[]; component: string };
	/** Una utilidad propia con variantes adentro que, con la del uso, deja una cadena inválida (`lg:` + `md:p-base`). */
	'invalid-composition': { class: string; utility: string; inner: string; use: string; result: string };
	/** `data-ts-*:` usado como variante. */
	'data-ts-variant': { class: string };
	/** Un prefijo de variante que no existe; `suggestion`, el vecino más cercano. */
	'unknown-prefix': { prefix: string; class: string; suggestion?: string };
	/** Una cadena de variantes fuera de orden; `suggestion`, la canónica. */
	'out-of-order': { class: string; suggestion: string };
	/** Una cadena de variantes que no entra en la forma canónica. */
	'invalid-chain': { class: string };
	/** Un fragmento de clase armado en runtime (`grid-cols-${n}`). */
	'runtime-class': { fragment: string };
	/** Una semilla que se corrió de luminosidad para que el texto se lea (WCAG AA). `deltaL` con signo: + más clara. */
	'seed-shifted': { theme: string; color: string; seed: string; mode: 'light' | 'dark'; step: string; deltaL: number };
	/** Una semilla (casi) blanca: el relleno sólido de la familia no puede serlo y sale gris. */
	'seed-white': { theme: string; color: string; seed: string };
	/** La marca y un estado casi no se distinguen (distancia en OKLab menor que `threshold`). */
	'brand-like-status': { theme: string; brand: string; status: string; seed: string; distance: number; threshold: number };
	/** Un ancho de trazo que dibuja el foco (`borderWidths.1`, su línea, o `.4`, su halo) quedó en 0: el foco se ve menos o nada. */
	'border-width-zero': { theme: string; name: string; value: string };
	/** Un elemento con clases del DS (las primeras tres en `classes`) sin la llave `ts`. */
	'missing-ts': { element: string; classes: string[] };
	/** Un atributo que no se lee como clases (`variant="ts p-4"`) con la llave `ts` y clases del DS en el valor: no se emiten. */
	'ignored-attribute': { attribute: string; classes: string[] };
	/** Una clase con forma del DS que no existe. */
	'unknown-class': { class: string; suggestion?: string };
	/** Un nombre de otro framework sin equivalente en el DS; `reason`, el motivo de la tabla de equivalencias. */
	'class-without-equivalent': { class: string; reason: string };
	/** `!clase` o `clase!` (el importante de Tailwind): no existe; `suggestion`, la clase sin el `!`. */
	'important-class': { class: string; suggestion: string };
	/** Regla opcional: una clase válida del DS cuyo nombre es de otro framework con OTRO valor. `px`: lo que vale en TaishoDS (sólo en medidas); `otherPx`: lo que vale en el otro framework; `equivalent`: la clase del DS con ese valor, si existe. */
	'other-scale': { class: string; px?: number; otherPx?: number; equivalent?: string };
	/** Un nombre viejo; `suggestion`, el vigente. */
	'renamed-class': { class: string; suggestion: string };
	/** Un modificador de una utilidad propia con variante (`md:destructive`); `suggestion`, la variante sobre la propia. */
	'modifier-with-variant': { class: string; modifier: string; utilities: string[]; suggestion: string };
	/** Un modificador de una utilidad propia sin ella en el mismo elemento. */
	'orphan-modifier': { class: string; utilities: string[] };
	/** Una clase con el prefijo viejo `ts-` que es un nombre vigente; `suggestion`, sin el prefijo. */
	'legacy-prefix': { class: string; suggestion: string };
	/** Una clase con el prefijo viejo `ts-` y un nombre viejo; `suggestion`, el vigente sin el prefijo. */
	'legacy-prefix-renamed': { class: string; suggestion: string };
	/** Una clase con el prefijo viejo `ts-`, deprecada sin sucesor. */
	'legacy-prefix-removed': { class: string };
	/** Un `var(--ts-*)` / `var(--color-*)` que no existe en el tema. */
	'unknown-var': { variable: string; suggestion?: string };
	/** Un `.css` del proyecto fuera de `content` usa variables del tema que la poda quitó (las primeras tres en `variables`). El aviso lleva el `file` del CSS. */
	'css-outside-content': { variables: string[] };
}

/** El `code` de un aviso. */
export type WarningCode = keyof WarningParams;

/** Un aviso sin ubicación: `code` y sus `params`, discriminados por `code`. */
export type WarningData = { [K in WarningCode]: { code: K; params: WarningParams[K] } }[WarningCode];

/** Un aviso de `generate`/`watch`/`taisho()`: con el archivo (y la línea) si sale del `content`. */
export type EngineWarning = WarningData & { file?: string; line?: number };

export interface ParamsMotivoTailwind {
	important: Record<string, never>;
	'arbitrary-variant': { variant: string };
	'dark-variant': Record<string, never>;
	'has-variant': Record<string, never>;
	'not-variant': Record<string, never>;
	'structural-variant': Record<string, never>;
	'focus-within-variant': Record<string, never>;
	'motion-variant': Record<string, never>;
	'supports-variant': Record<string, never>;
	'data-ts-variant': Record<string, never>;
	'breakpoint-missing': { variant: string };
	'unknown-variant': { variant: string };
	'component-variant': { class: string };
	'marker-with-variants': { class: string };
	'invalid-chain': { chain: string };
	'opacity-modifier': { class: string; opacity: string };
	'color-family-missing': { family: string };
	'color-step-missing': { step: string; family: string; steps: string[] };
	'arbitrary-value': { class: string };
	'no-equivalent': { class: string; reason: string };
	'not-in-map': { class: string };
	'runtime-class': Record<string, never>;
	'theme-breakpoints': Record<string, never>;
	'theme-spacing': { class: string; px: number };
	'theme-radius': { class: string };
	'theme-text': { class: string };
	'component-conflict': { class: string };
	'name-conflict': { class: string };
	classlist: { converted?: string };
	'already-scoped': { class: string; converted: string };
	untouched: { class: string; converted: string; conflicts: string[] };
	'possible-class': Record<string, never>;
	'directive-without-ts': { component: boolean };
	'tailwind-merge': Record<string, never>;
	apply: { translation: string; untranslated: Array<{ class: string; reason: MotivoTailwind | null }> };
	'tailwind-import': Record<string, never>;
	'theme-block': { families: string[]; breakpoints: boolean; radius: boolean; spacing: boolean; text: boolean };
	'tailwind-directive': { directive: 'source' | 'plugin' | 'config' };
}

export type CodigoMotivoTailwind = keyof ParamsMotivoTailwind;

export type MotivoTailwind = { [K in CodigoMotivoTailwind]: { code: K; params: ParamsMotivoTailwind[K] } }[CodigoMotivoTailwind];

export type NotaTailwind = { code: 'map-note'; params: { note: string } } | { code: 'disabled-wider'; params: Record<string, never> };
