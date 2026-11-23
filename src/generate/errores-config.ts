// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { configErrorLine } from './mensajes-errores.ts';

/** Los `params` de cada error de config. */
export interface ConfigErrorParams {
	'empty-value': Record<string, never>;
	/** Un valor que no es un string (un número donde va `"10px"`). */
	'value-not-string': { value: unknown };
	/** Un valor CSS que podría cerrar la declaración o el bloque. */
	'unsafe-value': { value: string };
	'scope-invalid': { value: unknown };
	'dark-mode-invalid': { value: unknown };
	'out-invalid': { value: unknown };
	'icons-html-dirs-removed': Record<string, never>;
	'brand-required': Record<string, never>;
	'primary-invalid': Record<string, never>;
	/** `fontFaces[i].styles` pide `italic` y el paquete no trae `<subset>-<weight>-italic.css`. */
	'font-italic-missing': { source: string; subset: string; weight: number };
	'font-styles-invalid': { value: unknown };
	'primary-in-colors': Record<string, never>;
	'fixed-in-colors': { name: string };
	'screen-exists': { name: string };
	'screen-name-invalid': Record<string, never>;
	'screen-value-invalid': { value: string };
	'screen-repeated': { value: string; other: string };
	'screen-below-min': { name: string; px: number };
	'screen-above-max': { name: string; px: number };
	/** `greater`: el ancho de `name` tiene que ser mayor que el de `other` (si no, menor). */
	'screen-order': { name: string; value: string; greater: boolean; other: string; otherValue: string };
	'scale-exists': { name: string; themePath: string };
	'scale-name-invalid': Record<string, never>;
	'space-neg-prefix': Record<string, never>;
	'space-negative-suffix': Record<string, never>;
	'class-exists': { class: string };
	'class-duplicated': { class: string; other: string };
	'class-renamed-exists': { class: string; renamed: string };
	'utility-empty': Record<string, never>;
	'utility-not-a-class': { value: unknown };
	'utility-composes-modifier': { class: string; utility: string; modifiers: string[] };
	'utility-unknown-prefix': { class: string; prefix: string; suggestion?: string };
	'utility-data-ts-variant': { class: string };
	'utility-out-of-order': { class: string; suggestion: string };
	'utility-invalid-chain': { class: string };
	'utility-variant-on-component': { class: string; base: string };
	'utility-unknown-class': { class: string; suggestion?: string };
	'utility-invalid-composition': { class: string; utility: string; inner: string; use: string; result: string };
	'utility-composes-component': { class: string; utility: string; component: string };
	'utility-cycle': { cycle: string[] };
	'modifier-invalid': { modifier: string };
	'modifier-reserved-prefix': { modifier: string; prefix: string };
	'modifier-theme-class': { modifier: string };
	'modifier-short-name': { modifier: string };
	'modifier-is-utility': { modifier: string };
	'component-missing': { component: string };
	'modifier-repeated': Record<string, never>;
	'combination-repeated': { other: string };
	'utility-name-invalid': Record<string, never>;
	'utility-reserved-prefix': { prefix: string };
	'utility-name-is-modifier': Record<string, never>;
	'utility-conflicts-ds': Record<string, never>;
	'utility-name-ts': Record<string, never>;
	'utility-short-name': Record<string, never>;
	'safelist-not-list': Record<string, never>;
	'safelist-entry-empty': Record<string, never>;
	'safelist-unknown-prefix': { prefix: string; suggestion?: string };
	'safelist-data-ts': { prefix: string };
	'safelist-out-of-order': { suggestion: string };
	'safelist-invalid-chain': Record<string, never>;
	'safelist-misplaced-colon': Record<string, never>;
	/** Una entrada con `ts-`; `suggestion`, el nombre sin el prefijo si se puede decir. */
	'safelist-legacy-prefix': { suggestion?: string };
	'safelist-star-not-last': Record<string, never>;
	'safelist-family-empty': { suggestion?: string };
	'safelist-component-variant': Record<string, never>;
	'safelist-modifier-variant': Record<string, never>;
	'safelist-unknown': { suggestion?: string };
	'ext-shape': { expected: string };
	'ext-name-invalid': { kind: 'slug' | 'root' | 'block' | 'token'; name: string };
	'ext-roots-empty': Record<string, never>;
	'ext-root-repeated': { root: string; other: string };
	'ext-block-not-owned': { block: string; roots: string[] };
	'ext-block-repeated': { block: string };
	/** Un nombre que ya es del Core (o un nombre viejo del Core). */
	'ext-conflicts-core': { kind: 'root' | 'slug' | 'block' | 'utility' | 'variable'; name: string };
	/** Un nombre que dos paquetes se disputan: `package` es el que lo repite y `other` el que lo tenía primero (orden por nombre de paquete). */
	'ext-conflicts-extension': { kind: 'root' | 'slug' | 'block' | 'utility' | 'variable'; name: string; package: string; other: string };
	/** `other-component`: un bloque de OTRO componente del paquete o de otro paquete. `cycle`: el `@apply` vuelve sobre sí mismo. */
	'ext-apply-target': { block: string; target: string; reason: 'unknown' | 'core-component' | 'other-component' | 'cycle'; suggestion?: string };
	'ext-var-not-public': { block: string; variable: string; suggestion?: string };
	'ext-modifier-loose': { block: string; selector: string; motive: 'suelto' | 'desconocido' };
	'ext-color-literal': { block: string; value: string; kind: 'hex' | 'name' | 'function' };
	'ext-top-level': { snippet: string };
	'ext-at-rule': { block: string; rule: string };
	'ext-media-query': { block: string; query: string };
	'ext-url': { block: string };
	'ext-escape': { block: string };
	'ext-css-unbalanced': Record<string, never>;
	/** `format` del manifiesto distinto del 3: el paquete se compiló contra otra versión del Core. */
	'manifest-format': { version: string; format: unknown };
	'manifest-shape': { expected: string };
	'manifest-json': { file: string };
	/** Una ruta del manifiesto (o el propio manifiesto) que sale de la carpeta del paquete. */
	'manifest-path-escapes': { file: string };
	'manifest-file-invalid': { file: string; reason: 'not-file' | 'too-big' };
	/** La clave de dependencia no es el `name` del paquete instalado (un alias npm). */
	'package-name-mismatch': { name: string };
	/** Un carácter fuera de ASCII imprimible (bidi, BOM, NUL, control, no ASCII): `char` es `U+XXXX`. */
	'ext-char-not-allowed': { char: string };
	'ext-string-not-allowed': { block: string };
	'ext-function-not-allowed': { block: string; fn: string };
	'ext-selector-not-allowed': { block: string; selector: string; motive: 'unscoped' | 'combinator' | 'pseudo' | 'attribute' | 'syntax' };
	'ext-important': { block: string };
	'ext-custom-property': { block: string; property: string };
	/** Algo que no es una declaración, un valor o un selector que el lector entienda. */
	'ext-syntax': { block: string; snippet: string };
	'ext-at-params': { block: string; rule: string; params: string };
	/** Dos raíces de paquetes distintos donde una es prefijo (por segmento) de la otra. */
	'ext-roots-overlap': { root: string; other: string; package: string; otherPackage: string };
	'ext-utility-no-root': { block: string };
	'ext-variable-repeated': { variable: string };
	'ext-apply-budget': { block: string; limit: 'classes' | 'depth' | 'block-size' | 'total-size'; max: number };
	'ext-limit': { what: 'css-size' | 'block-size' | 'blocks' | 'depth' | 'tokens' | 'value-length' | 'key-length' | 'components' | 'roots'; max: number };
	/** Una clave que `extend` no tiene (`key` es la última parte de la ruta); `suggestion`: la más parecida. */
	'extend-key-unknown': { key: string; suggestion?: string };
	/** Una clave que `extend` no amplía a propósito (`zIndex`, `motion.loops`). */
	'extend-key-excluded': { key: string };
	/** Una clave de `extend` con la forma equivocada: una lista (`sizing`) o un objeto de nombres (el resto). */
	'extend-shape-invalid': { expected: 'object' | 'list'; value: unknown };
	/** Una clave que un tema no tiene. `extendPath`: la escala se amplía en `extend`; `suggestion`: la clave de tema más parecida. */
	'theme-key-unknown': { key: string; extendPath?: string; suggestion?: string };
	/** Un nombre que la escala no tiene (un tema sólo cambia valores). `extendPath`: la ruta de `extend` donde se suma, si la escala se puede ampliar. */
	'theme-name-unknown': { scale: string; name: string; extendPath?: string };
	/** `cornerShape` con un valor que no es `'round'` ni `'squircle'`. */
	'corner-shape-invalid': { value: unknown };
	/** Una clave de `seedFit` que no es una familia de color del tema. `families`: las que sí lo son; `suggestion`: la más parecida. */
	'seed-fit-key-unknown': { key: string; families: string[]; suggestion?: string };
	/** Un valor de `seedFit` que no es `'shift'` ni `'keep'`. */
	'seed-fit-value-invalid': { value: unknown };
	/** Un valor del tipo equivocado para su escala. */
	'value-type-invalid': { kind: 'integer' | 'font-weight' | 'opacity' | 'duration' | 'iterations' | 'px'; value: unknown };
	/** Un nivel de `extend.sizing` que ya está en la escala de fábrica o repetido en la lista. */
	'sizing-exists': { level: number; repeated: boolean };
	/** Un tamaño de texto sin interlineado con su nombre (`extend.lineHeights`). */
	'font-size-needs-line-height': { name: string };
	/** Un nombre de escala numérica que no es un número del rango. */
	'scale-name-numeric': { range: string };
	'theme-component-unknown': { slug: string; suggestion?: string };
	'theme-component-token-unknown': { slug: string; key: string; suggestion?: string };
}

export type ConfigErrorCode = keyof ConfigErrorParams;

/** Un error de config sin ruta: `code` y sus `params`, discriminados por `code`. */
export type ConfigErrorData = { [K in ConfigErrorCode]: { code: K; params: ConfigErrorParams[K] } }[ConfigErrorCode];

/** El error de UNA clave: su ruta (`utilities.mi-button`, `safelist[0] ("md:toast")`) y qué pasó. */
export type ConfigKeyError = ConfigErrorData & { path: string };

/**
 * Error de config: trae todos los errores de clave juntados (uno por clave, en el orden de la config). `message` es el
 * texto en español, una línea por error (`taisho config: <ruta> <qué pasó>`); el CLI arma el suyo desde `errors`.
 */
export class ConfigError extends Error {
	readonly errors: readonly ConfigKeyError[];
	constructor(errors: readonly ConfigKeyError[]) {
		super(errors.map((e) => configErrorLine(e, 'es')).join('\n'));
		this.errors = errors;
	}
}

