// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ConfigKeyError, ConfigErrorParams } from './errores-config.ts';
import { REGLA_CADENA } from './propias.ts';
import type { Lang } from '../generate-cli/mensajes.ts';

type Catalogo<P> = { [K in keyof P]: (p: P[K]) => string };

const sugerencia = (s?: string) => (s ? ` ¿Se quiso decir "${s}"?` : '');
const didYouMean = (s?: string) => (s ? ` Did you mean "${s}"?` : '');
const NOMBRE_ES = { slug: 'slug', root: 'raíz', block: 'bloque', token: 'clave de token' };
const CLASE_ES_ART = { slug: 'el componente', root: 'la raíz', block: 'el bloque', utility: 'la utilidad', variable: 'la variable' };
const COLOR_ES = { hex: 'el color hex', name: 'el color con nombre', function: 'la función de color' };
const CLASE_EN = { slug: 'slug', root: 'root', block: 'block', token: 'token key', utility: 'utility', variable: 'variable' };
const COLOR_EN = { hex: 'the hex color', name: 'the named color', function: 'the color function' };
const SELECTOR_ES = {
	unscoped: 'el sujeto es siempre & (sólo se admite un ancestro: una clase o [dir=…] antes de &).',
	combinator: 'sólo se admiten el espacio y > como combinadores (no ~, + ni *).',
	pseudo: 'esa pseudoclase o pseudoelemento no está en la lista permitida.',
	attribute: 'un atributo sólo puede ser aria-*, data-*, dir, disabled, open…, con = y un valor [a-z0-9-].',
	syntax: 'no se entiende.',
};
const SELECTOR_EN = {
	unscoped: 'The subject is always & (only an ancestor is allowed: a class or [dir=…] before &).',
	combinator: 'Only the space and > combinators are allowed (not ~, + or *).',
	pseudo: "That pseudo-class or pseudo-element isn't in the allowed list.",
	attribute: 'An attribute can only be aria-*, data-*, dir, disabled, open…, with = and a [a-z0-9-] value.',
	syntax: "It can't be read.",
};
const APPLY_ES = { classes: 'demasiadas clases en un @apply', depth: 'cadena de @apply demasiado profunda', 'block-size': 'el bloque expandido es demasiado grande', 'total-size': 'el CSS expandido del paquete es demasiado grande' };
const APPLY_EN = { classes: 'too many classes in one @apply', depth: '@apply chain too deep', 'block-size': 'the expanded block is too large', 'total-size': "the package's expanded CSS is too large" };
const LIMITE_ES = { 'css-size': 'tamaño del CSS (bytes)', 'block-size': 'tamaño de un bloque (bytes)', blocks: 'bloques', depth: 'anidamiento', tokens: 'tokens por componente', 'value-length': 'largo de un valor de token', 'key-length': 'largo de una clave de token', components: 'componentes', roots: 'raíces (por componente o sueltas)' };
const LIMITE_EN = { 'css-size': 'CSS size (bytes)', 'block-size': 'block size (bytes)', blocks: 'blocks', depth: 'nesting', tokens: 'tokens per component', 'value-length': 'token value length', 'key-length': 'token key length', components: 'components', roots: 'roots (per component or loose)' };
const VALOR_ES = {
	integer: 'tiene que ser un número entero, p. ej. "10".',
	'font-weight': 'tiene que ser un peso entre 1 y 1000, p. ej. "600".',
	opacity: 'tiene que ser un número entre 0 y 1 (p. ej. "0.5") o un var().',
	duration: 'tiene que ser un tiempo en ms o s, p. ej. "150ms".',
	'iterations': 'tiene que ser "infinite" o un número de repeticiones (0 o más), p. ej. "0".',
	px: 'tiene que ser un número de px (0 o más), p. ej. 32.',
};
const VALOR_EN = {
	integer: 'It must be a whole number, e.g., "10".',
	'font-weight': 'It must be a weight from 1 to 1000, e.g., "600".',
	opacity: 'It must be a number from 0 to 1 (e.g., "0.5") or a var().',
	duration: 'It must be a time in ms or s, e.g., "150ms".',
	'iterations': 'It must be "infinite" or a number of repetitions (0 or more), e.g., "0".',
	px: 'It must be a number of px (0 or more), e.g., 32.',
};
const REGLA_CADENA_EN = 'at most one context, one print, one group or peer, and one state, in that order, and 3 segments';

const es: Catalogo<ConfigErrorParams> = {
	'empty-value': () => 'tiene un valor vacío.',
	'value-not-string': (p) => `tiene que ser un texto (${JSON.stringify(p.value)} no lo es), p. ej. "10px".`,
	'unsafe-value': (p) => `tiene un valor inválido (${JSON.stringify(p.value)}): no puede contener ; { } \\ /* */ ni saltos de línea.`,
	'scope-invalid': (p) => `tiene un valor inválido (${JSON.stringify(p.value)}): el único valor es 'ts', y ya es el único modo: se quita la clave.`,
	'dark-mode-invalid': (p) => `tiene un valor inválido (${JSON.stringify(p.value)}): se usa 'class' o 'media'.`,
	'out-invalid': (p) => `tiene que ser una ruta de carpeta, en un texto no vacío (${JSON.stringify(p.value)} no lo es), p. ej. out: './taisho'.`,
	'icons-html-dirs-removed': () => 'ya no existe: se declara `content`.',
	'brand-required': () => "es obligatorio: de esa semilla sale la paleta de marca (enlaces, acentos y, si no se define `primary`, los botones primarios). Se le pone un hex, p. ej. colors: { brand: '#4F46E5' }.",
	'font-italic-missing': (p) => `pide italic, pero ${p.source} no trae ${p.subset}-${p.weight}-italic.css. Se quita "italic" de styles, se quita ese peso o se elige una fuente con itálica.`,
	'font-styles-invalid': (p) => `tiene un valor inválido (${JSON.stringify(p.value)}): tiene que ser una lista con 'normal' y/o 'italic', p. ej. styles: ['normal', 'italic'].`,
	'primary-invalid': () => "tiene un valor inválido: tiene que ser un color (hex u oklch), p. ej. primary: 'oklch(0.15 0 0)'. Si no hace falta un primario aparte, se quita la clave: los botones primarios usan la marca.",
	'primary-in-colors': () => '`primary` no es un color de paleta: va en `themes.<tema>.primary`, junto a `colors`, no adentro.',
	'screen-exists': (p) =>
		`ya existe en el DS. El corte de un screen de fábrica (los @media) es fijo; themes.<tema>.screens.${p.name} sólo cambia el token --ts-screen-${p.name} y ts-max-w-screen-${p.name}.`,
	'screen-name-invalid': () => 'es un nombre inválido: tiene que ser xs (o 2xs…9xs) o 2xl…9xl.',
	'screen-value-invalid': (p) => `tiene un valor inválido ("${p.value}"): tiene que ser un ancho en px, p. ej. "1536px".`,
	'screen-repeated': (p) => `repite el ancho ${p.value} de screens.${p.other}.`,
	'screen-below-min': (p) => `tiene un ancho incoherente con su nombre: ${p.name} tiene que ser menor que el screen de fábrica más chico (${p.px}px).`,
	'screen-above-max': (p) => `tiene un ancho incoherente con su nombre: ${p.name} tiene que ser mayor que el screen de fábrica más grande (${p.px}px).`,
	'screen-order': (p) => `tiene un ancho incoherente con su nombre: ${p.name} (${p.value}) tiene que ser ${p.greater ? 'mayor' : 'menor'} que ${p.other} (${p.otherValue}).`,
	'scale-exists': (p) => `ya existe en el DS. Para cambiar su valor se usa themes.<tema>.${p.themePath}.${p.name}.`,
	'scale-name-invalid': () => 'es un nombre inválido: minúsculas y dígitos, separados por guiones (p. ej. "card" o "hero-lg").',
	'extend-key-unknown': (p) => `no es una clave de extend.${sugerencia(p.suggestion)}`,
	'extend-key-excluded': (p) =>
		`no se amplía: un nombre nuevo sería una variable sin clase que la use. Para cambiar el valor de uno que ya existe se usa themes.<tema>.${p.key}.<nombre>.`,
	'extend-shape-invalid': (p) =>
		`tiene una forma inválida (${JSON.stringify(p.value)}): tiene que ser ${p.expected === 'list' ? 'una lista, p. ej. [30, 100]' : 'un objeto de nombres, p. ej. { nombre: "valor" }'}.`,
	'theme-key-unknown': (p) =>
		`no es una clave de un tema.${p.extendPath ? ` Para sumar nombres a esa escala se usa ${p.extendPath}; el tema sólo cambia valores.` : ''}${sugerencia(p.suggestion)}`,
	'theme-name-unknown': (p) =>
		`no es un nombre de la escala ${p.scale}: un tema sólo cambia el valor de un nombre que ya existe.${p.extendPath ? ` Para sumarlo se usa ${p.extendPath}.${p.name}.` : ' Esa escala no se puede ampliar.'}`,
	'corner-shape-invalid': (p) => `tiene un valor inválido (${JSON.stringify(p.value)}): tiene que ser 'round' o 'squircle'.`,
	'value-type-invalid': (p) => `tiene un valor inválido (${JSON.stringify(p.value)}): ${VALOR_ES[p.kind]}`,
	'sizing-exists': (p) => (p.repeated ? `repite el nivel ${p.level} de la lista.` : `ya existe en el DS. El sizing es fijo: sólo se suman niveles nuevos (un tema no cambia su valor).`),
	'font-size-needs-line-height': (p) => `necesita un interlineado con el mismo nombre: se suma extend.lineHeights.${p.name}.`,
	'scale-name-numeric': (p) => `es un nombre inválido: en esta escala el nombre es un número entero (${p.range}), p. ej. "36".`,
	'space-neg-prefix': () => 'no puede empezar con "neg-": ese prefijo lo usan los nombres de los márgenes negativos (ts-mt-neg-1).',
	'space-negative-suffix': () => 'no puede terminar en "-negative": ese sufijo lo genera el motor para los márgenes negativos.',
	'class-exists': (p) => `genera la clase ${p.class}, que ya existe en el DS. Se elige otro nombre.`,
	'class-duplicated': (p) => `genera la clase ${p.class}, que también genera ${p.other}. Se elige otro nombre.`,
	'class-renamed-exists': (p) => `genera la clase ${p.class}, cuyo nombre nuevo ${p.renamed} ya existe en el DS. Se elige otro nombre.`,
	'utility-empty': () => 'tiene una lista de clases vacía.',
	'utility-not-a-class': (p) => `compone ${JSON.stringify(p.value)}, que no es un nombre de clase.`,
	'utility-composes-modifier': (p) =>
		`compone "${p.class}": un modificador no es una utilidad; se compone "${p.utility}" y se pone "${p.modifiers.join(' ')}" en el markup.`,
	'utility-unknown-prefix': (p) => `compone "${p.class}": el prefijo "${p.prefix}" no existe.${sugerencia(p.suggestion)}`,
	'utility-data-ts-variant': (p) =>
		`compone "${p.class}": \`data-ts-*\` es el gancho de los componentes, no una variante. Los \`data-<nombre>:\` propios sí valen.`,
	'utility-out-of-order': (p) => `compone "${p.class}": la cadena está fuera de orden.${sugerencia(p.suggestion)}`,
	'utility-invalid-chain': (p) => `compone "${p.class}": la cadena no es válida, admite ${REGLA_CADENA}.`,
	'utility-variant-on-component': (p) =>
		`compone "${p.class}": las variantes aplican sólo a utilidades, y "${p.base}" es de un componente o un modificador. Sus estados son \`is-*\`, \`aria\` y los internos.`,
	'utility-unknown-class': (p) =>
		`compone "${p.class}", que no existe en el DS (los nombres no llevan "ts-" y los viejos no existen) ni entre tus utilities.${sugerencia(p.suggestion)}`,
	'utility-invalid-composition': (p) =>
		`compone "${p.class}": "${p.utility}" lleva "${p.inner}" y con "${p.use}" queda "${p.result}", que no es una cadena válida: admite ${REGLA_CADENA}.`,
	'utility-composes-component': (p) =>
		`compone "${p.class}": las variantes aplican sólo a utilidades, y "${p.utility}" lleva "${p.component}", que es de un componente o un modificador.`,
	'utility-cycle': (p) => `tiene un ciclo entre utilidades propias: ${p.cycle.join(' → ')}.`,
	'modifier-invalid': (p) => `tiene un modificador inválido ("${p.modifier}"): minúsculas y dígitos separados por guiones, empezando con letra (p. ej. "destructive").`,
	'modifier-reserved-prefix': (p) => `tiene un modificador inválido ("${p.modifier}"): no puede empezar con "${p.prefix}" (prefijo reservado al DS).`,
	'modifier-theme-class': (p) => `tiene un modificador inválido ("${p.modifier}"): es la llave del modo scope o una clase de tema.`,
	'modifier-short-name': (p) =>
		`tiene un modificador ("${p.modifier}") que choca con un nombre corto del DS: aplicaría ese estilo a cualquier elemento que lo lleve. Se elige otro nombre (p. ej. "${p.modifier}-<propiedad>", como las variantes del Core).`,
	'modifier-is-utility': (p) => `tiene un modificador ("${p.modifier}") que es el nombre de otra utilidad propia: activaría esa utilidad.`,
	'component-missing': (p) => `el componente "${p.component}" no está en utilities: declaralo antes, sin modificadores.`,
	'modifier-repeated': () => 'repite un modificador.',
	'combination-repeated': (p) => `repite la combinación de utilities.${p.other}: el orden de los modificadores no importa.`,
	'utility-name-invalid': () => 'es un nombre inválido: minúsculas y dígitos separados por guiones, empezando con letra (p. ej. "card-hero").',
	'utility-reserved-prefix': (p) => `es un nombre inválido: no puede empezar con "${p.prefix}" (prefijo reservado al DS).`,
	'utility-name-is-modifier': () => 'es un nombre inválido: es un modificador de componente o la clase de tema (variant-*, size-*, is-*, dark…) y pisaría a cada componente.',
	'utility-conflicts-ds': () => 'choca con una utilidad del DS. Se elige otro nombre.',
	'utility-name-ts': () => 'es un nombre inválido: "ts" es la llave del modo scope.',
	'utility-short-name': () => 'choca con un nombre corto del DS en el modo scope. Se elige otro nombre.',
	'safelist-not-list': () => 'tiene que ser una lista de strings.',
	'safelist-entry-empty': () => 'tiene que ser un string no vacío.',
	'safelist-unknown-prefix': (p) => `tiene el prefijo "${p.prefix}", que no existe.${sugerencia(p.suggestion)}`,
	'safelist-data-ts': (p) => `tiene el prefijo "${p.prefix}": \`data-ts-*\` es el gancho de los componentes y no es una variante.`,
	'safelist-out-of-order': (p) => `tiene las variantes fuera de orden.${sugerencia(p.suggestion)}`,
	'safelist-invalid-chain': () => 'tiene una cadena de variantes inválida: a lo sumo un contexto, un print, un group o peer y un estado, en ese orden, y 3 segmentos.',
	'safelist-misplaced-colon': () => 'tiene un ":" mal ubicado: las variantes van antes de la clase (p. ej. "md:hover:gap-4").',
	'safelist-legacy-prefix': (p) => `es inválida: en scope no lleva \`ts-\`${p.suggestion !== undefined ? `: \`${p.suggestion}\`` : ''}.`,
	'safelist-star-not-last': () => 'tiene un "*" que no está al final: la familia sólo admite "*" al final (p. ej. "grid-cols-*").',
	'safelist-family-empty': (p) => `no expande a ninguna clase del DS ni de tus utilities.${sugerencia(p.suggestion)}`,
	'safelist-component-variant': () => 'es un componente: un componente entra entero y no lleva variante.',
	'safelist-modifier-variant': () => 'es un modificador de una utilidad propia: no lleva variante (se pone la variante en la propia, p. ej. "md:mi-button").',
	'safelist-unknown': (p) => `no existe en el DS ni entre tus utilities.${sugerencia(p.suggestion)}`,
	'ext-shape': (p) => `no tiene la forma esperada: tiene que ser ${p.expected}.`,
	'ext-name-invalid': (p) => `tiene un nombre inválido ("${p.name}", ${NOMBRE_ES[p.kind]}): minúsculas y dígitos separados por guiones, empezando con letra${p.kind === 'block' ? ' y con el prefijo "ts-"' : ''}.`,
	'ext-roots-empty': () => 'no tiene raíces: un componente necesita al menos una para poseer sus bloques.',
	'ext-root-repeated': (p) => `repite la raíz "${p.root}", que ya es ${p.other ? `del componente "${p.other}"` : 'de las raíces sueltas del paquete'}.`,
	'ext-block-not-owned': (p) => `tiene el bloque "${p.block}", que no es de ninguna raíz de este componente (${p.roots.join(', ') || 'ninguna'}): tiene que ser ts-<raíz> o ts-<raíz>-….`,
	'ext-block-repeated': (p) => `repite el bloque "${p.block}".`,
	'ext-conflicts-core': (p) => `declara ${CLASE_ES_ART[p.kind]} "${p.name}", que choca con un nombre del Core. Se elige otro.`,
	'ext-conflicts-extension': (p) => `declara ${CLASE_ES_ART[p.kind]} "${p.name}", que ya es del paquete "${p.other}": "${p.package}" y "${p.other}" no pueden compartir un nombre. Se elige otro.`,
	'ext-apply-target': (p) =>
		p.reason === 'core-component'
			? `aplica "${p.target}" en "${p.block}", que es un bloque de un componente del Core: @apply sólo vale hacia utilidades del Core.`
			: p.reason === 'other-component'
				? `aplica "${p.target}" en "${p.block}", que es un bloque de otro componente o de otro paquete: @apply sólo vale hacia utilidades del Core o bloques del mismo componente.`
				: p.reason === 'cycle'
					? `aplica "${p.target}" en "${p.block}" y eso forma un ciclo de @apply.`
					: `aplica "${p.target}" en "${p.block}", que no es una utilidad del Core.${sugerencia(p.suggestion)}`,
	'ext-var-not-public': (p) => `lee ${p.variable} en "${p.block}", que no es un token del Core ni de las raíces de este paquete (--ts-<raíz>-…).${sugerencia(p.suggestion)}`,
	'ext-modifier-loose': (p) =>
		p.motive === 'suelto'
			? `tiene en "${p.block}" un modificador suelto en "${p.selector}": un modificador va en el mismo compuesto que su base (& o .ts-…).`
			: `tiene en "${p.block}" una clase que no es del vocabulario en "${p.selector}": una extensión no suma modificadores, sólo usa los del Core.`,
	'ext-color-literal': (p) =>
		`escribe en "${p.block}" ${COLOR_ES[p.kind]} "${p.value}": el CSS no lleva colores literales, sólo var(--…). Declaralo en los tokens del componente.`,
	'ext-top-level': (p) => `tiene en el nivel superior algo que no es un @utility ("${p.snippet}"): sólo se admiten bloques @utility.`,
	'ext-at-rule': (p) => `usa ${p.rule} en "${p.block}": sólo se admiten @media, @supports, @container y @starting-style, y @apply hacia utilidades del Core.`,
	'ext-media-query': (p) => `usa un @media no permitido en "${p.block}" ("${p.query}"): sólo consultas de preferencia (prefers-*, forced-colors, hover, pointer), nunca el ancho.`,
	'ext-url': (p) => `usa url() en "${p.block}": una extensión no carga recursos.`,
	'ext-escape': (p) => `usa una barra invertida (\\) en "${p.block}": no se admiten escapes.`,
	'manifest-format': (p) => `trae un taisho.manifest.json ${p.format === undefined ? 'sin formato' : `de formato ${String(p.format)}`} (versión ${p.version}); este Core sólo entiende el formato 3. Se actualiza el paquete.`,
	'manifest-shape': (p) => `tiene un taisho.manifest.json con una forma inválida: ${p.expected}.`,
	'manifest-json': (p) => `tiene un JSON inválido en "${p.file}".`,
	'manifest-path-escapes': (p) => `nombra "${p.file}", que sale de la carpeta del paquete: se rechaza todo el paquete.`,
	'manifest-file-invalid': (p) => (p.reason === 'too-big' ? `nombra "${p.file}", que pesa más de 1 MiB.` : `nombra "${p.file}", que no es un archivo regular.`),
	'package-name-mismatch': (p) => `se instaló como un alias: su package.json se llama "${p.name}". Un paquete con estilos tiene que instalarse con su nombre.`,
	'ext-css-unbalanced': () => 'tiene llaves, paréntesis o corchetes que no cierran, o una cadena o un comentario sin cerrar.',
	'ext-char-not-allowed': (p) => `tiene un carácter que no se admite (${p.char}): sólo ASCII imprimible.`,
	'ext-string-not-allowed': (p) => `usa una cadena de texto en "${p.block}": sólo se admite en content, corta y sin llaves, paréntesis ni arrobas.`,
	'ext-function-not-allowed': (p) => `usa la función ${p.fn}() en "${p.block}", que no está en la lista permitida (var, calc, min, max, clamp, round, mod, color-mix, rgb, hsl, oklch, linear-gradient, translate, scale, rotate, repeat, minmax).`,
	'ext-selector-not-allowed': (p) =>
		`tiene en "${p.block}" un selector que no se admite ("${p.selector}"): ${SELECTOR_ES[p.motive]}`,
	'ext-important': (p) => `usa !important en "${p.block}": no se admite. Se sube la especificidad (p. ej. con && en el selector).`,
	'ext-custom-property': (p) => `declara la propiedad personalizada ${p.property} en "${p.block}": el CSS sólo lee var(--…). Se declara el valor en los tokens del componente.`,
	'ext-syntax': (p) => `tiene en "${p.block}" algo que no se entiende ("${p.snippet}"): una declaración es propiedad: valor; con la propiedad en minúsculas y un valor de la lista permitida.`,
	'ext-at-params': (p) => `usa ${p.rule} en "${p.block}" con parámetros que no se admiten ("${p.params}"): consultas simples y con unidades relativas.`,
	'ext-roots-overlap': (p) => `declara la raíz "${p.root}", que se pisa con la raíz "${p.other}" del paquete "${p.otherPackage}": una no puede ser prefijo de la otra ("${p.package}" y "${p.otherPackage}"). Se elige otra.`,
	'ext-utility-no-root': (p) => `tiene la utilidad "${p.block}", que no es de ninguna raíz de los componentes ni de las raíces sueltas de este paquete: tiene que ser ts-<raíz> o ts-<raíz>-….`,
	'ext-variable-repeated': (p) => `repite la variable "${p.variable}": dos claves de tokens dan el mismo nombre.`,
	'ext-apply-budget': (p) => `pasa el presupuesto de @apply en "${p.block}": ${APPLY_ES[p.limit]} (máximo ${p.max}).`,
	'ext-limit': (p) => `pasa el límite de ${LIMITE_ES[p.what]}: máximo ${p.max}.`,
	'theme-component-unknown': (p) => `no es un componente de ninguna extensión instalada ("${p.slug}").${sugerencia(p.suggestion)}`,
	'theme-component-token-unknown': (p) => `no es un token que declare "${p.slug}" ("${p.key}").${sugerencia(p.suggestion)}`,
};

const en: Catalogo<ConfigErrorParams> = {
	'empty-value': () => 'is empty. Give it a value.',
	'value-not-string': (p) => `must be a string (${JSON.stringify(p.value)} isn't), e.g., "10px".`,
	'unsafe-value': (p) => `has an invalid value (${JSON.stringify(p.value)}). It can't contain ; { } \\ /* */ or line breaks.`,
	'scope-invalid': (p) => `has an invalid value (${JSON.stringify(p.value)}). The only value is 'ts', and it's already the only mode. Remove the key.`,
	'dark-mode-invalid': (p) => `has an invalid value (${JSON.stringify(p.value)}). Use 'class' or 'media'.`,
	'out-invalid': (p) => `must be a folder path, as a non-empty string (${JSON.stringify(p.value)} isn't), e.g., out: './taisho'.`,
	'icons-html-dirs-removed': () => 'no longer exists. Declare `content` instead.',
	'brand-required': () => "is required. That seed drives the brand palette (links, accents and, unless you set `primary`, the primary buttons). Give it a hex, e.g., colors: { brand: '#4F46E5' }.",
	'font-italic-missing': (p) => `asks for italic, but ${p.source} has no ${p.subset}-${p.weight}-italic.css. Remove "italic" from styles, drop that weight or pick a font that ships an italic.`,
	'font-styles-invalid': (p) => `has an invalid value (${JSON.stringify(p.value)}): it must be a list with 'normal' and/or 'italic', e.g., styles: ['normal', 'italic'].`,
	'primary-invalid': () => "has an invalid value. It must be a color (hex or oklch), e.g., primary: 'oklch(0.15 0 0)'. If you don't want a separate primary, remove the key: primary buttons use the brand.",
	'primary-in-colors': () => '`primary` isn\'t a palette color: it goes in `themes.<theme>.primary`, next to `colors`, not inside it.',
	'screen-exists': (p) =>
		`already exists in the DS. A built-in screen's breakpoint (the @media) is fixed; themes.<theme>.screens.${p.name} only changes the --ts-screen-${p.name} token and ts-max-w-screen-${p.name}.`,
	'screen-name-invalid': () => "isn't a valid name. Use xs (or 2xs…9xs) or 2xl…9xl.",
	'screen-value-invalid': (p) => `has an invalid value ("${p.value}"). It must be a width in px, e.g., "1536px".`,
	'screen-repeated': (p) => `repeats the ${p.value} width of screens.${p.other}.`,
	'screen-below-min': (p) => `has a width that doesn't match its name. ${p.name} must be narrower than the smallest built-in screen (${p.px}px).`,
	'screen-above-max': (p) => `has a width that doesn't match its name. ${p.name} must be wider than the largest built-in screen (${p.px}px).`,
	'screen-order': (p) => `has a width that doesn't match its name. ${p.name} (${p.value}) must be ${p.greater ? 'wider' : 'narrower'} than ${p.other} (${p.otherValue}).`,
	'scale-exists': (p) => `already exists in the DS. To change its value, use themes.<theme>.${p.themePath}.${p.name}.`,
	'scale-name-invalid': () => 'isn\'t a valid name. Use lowercase letters and digits separated by hyphens (e.g., "card" or "hero-lg").',
	'extend-key-unknown': (p) => `isn't an extend key.${didYouMean(p.suggestion)}`,
	'extend-key-excluded': (p) =>
		`can't be extended: a new name would be a variable with no class using it. To change the value of an existing one use themes.<theme>.${p.key}.<name>.`,
	'extend-shape-invalid': (p) =>
		`has an invalid shape (${JSON.stringify(p.value)}). It must be ${p.expected === 'list' ? 'a list, e.g., [30, 100]' : 'an object of names, e.g., { name: "value" }'}.`,
	'theme-key-unknown': (p) =>
		`isn't a theme key.${p.extendPath ? ` To add names to that scale use ${p.extendPath}; a theme only changes values.` : ''}${didYouMean(p.suggestion)}`,
	'theme-name-unknown': (p) =>
		`isn't a name in the ${p.scale} scale. A theme only changes the value of an existing name.${p.extendPath ? ` To add it use ${p.extendPath}.${p.name}.` : " That scale can't be extended."}`,
	'corner-shape-invalid': (p) => `has an invalid value (${JSON.stringify(p.value)}). It must be 'round' or 'squircle'.`,
	'value-type-invalid': (p) => `has an invalid value (${JSON.stringify(p.value)}). ${VALOR_EN[p.kind]}`,
	'sizing-exists': (p) => (p.repeated ? `repeats level ${p.level} of the list.` : `already exists in the DS. The sizing is fixed: you only add new levels (a theme can't change its value).`),
	'font-size-needs-line-height': (p) => `needs a line height with the same name. Add extend.lineHeights.${p.name}.`,
	'scale-name-numeric': (p) => `isn't a valid name. In this scale the name is a whole number (${p.range}), e.g., "36".`,
	'space-neg-prefix': () => 'can\'t start with "neg-". Negative margin names use that prefix (ts-mt-neg-1).',
	'space-negative-suffix': () => 'can\'t end in "-negative". The engine generates that suffix for negative margins.',
	'class-exists': (p) => `generates the class ${p.class}, which already exists in the DS. Pick another name.`,
	'class-duplicated': (p) => `generates the class ${p.class}, which ${p.other} also generates. Pick another name.`,
	'class-renamed-exists': (p) => `generates the class ${p.class}, whose new name ${p.renamed} already exists in the DS. Pick another name.`,
	'utility-empty': () => 'has an empty class list.',
	'utility-not-a-class': (p) => `composes ${JSON.stringify(p.value)}, which isn't a class name.`,
	'utility-composes-modifier': (p) =>
		`composes "${p.class}", but a modifier isn't a utility. Compose "${p.utility}" and put "${p.modifiers.join(' ')}" in the markup.`,
	'utility-unknown-prefix': (p) => `composes "${p.class}", but the prefix "${p.prefix}" doesn't exist.${didYouMean(p.suggestion)}`,
	'utility-data-ts-variant': (p) =>
		`composes "${p.class}", but \`data-ts-*\` is the hook for components, not a variant. Your own \`data-<name>:\` variants are fine.`,
	'utility-out-of-order': (p) => `composes "${p.class}", but the chain is out of order.${didYouMean(p.suggestion)}`,
	'utility-invalid-chain': (p) => `composes "${p.class}", but the chain isn't valid. A chain allows ${REGLA_CADENA_EN}.`,
	'utility-variant-on-component': (p) =>
		`composes "${p.class}", but variants apply only to utilities, and "${p.base}" belongs to a component or is a modifier. Its states are \`is-*\`, \`aria\`, and its internal ones.`,
	'utility-unknown-class': (p) =>
		`composes "${p.class}", which isn't in the DS (names don't take "ts-", and old names don't exist) or in your utilities.${didYouMean(p.suggestion)}`,
	'utility-invalid-composition': (p) =>
		`composes "${p.class}". "${p.utility}" includes "${p.inner}", and with "${p.use}" it becomes "${p.result}", which isn't a valid chain. A chain allows ${REGLA_CADENA_EN}.`,
	'utility-composes-component': (p) =>
		`composes "${p.class}", but variants apply only to utilities, and "${p.utility}" includes "${p.component}", which belongs to a component or is a modifier.`,
	'utility-cycle': (p) => `has a cycle between your utilities: ${p.cycle.join(' → ')}.`,
	'modifier-invalid': (p) => `has an invalid modifier ("${p.modifier}"). Use lowercase letters and digits separated by hyphens, starting with a letter (e.g., "destructive").`,
	'modifier-reserved-prefix': (p) => `has an invalid modifier ("${p.modifier}"). It can't start with "${p.prefix}" (a prefix reserved for the DS).`,
	'modifier-theme-class': (p) => `has an invalid modifier ("${p.modifier}"). It's the scope class or a theme class.`,
	'modifier-short-name': (p) =>
		`has a modifier ("${p.modifier}") that conflicts with a short DS name, so it would apply that style to any element that has it. Pick another name (e.g., "${p.modifier}-<property>", like Core's variants).`,
	'modifier-is-utility': (p) => `has a modifier ("${p.modifier}") that's the name of another of your utilities, so it would trigger that utility.`,
	'component-missing': (p) => `uses the component "${p.component}", which isn't in utilities. Declare it first, without modifiers.`,
	'modifier-repeated': () => 'repeats a modifier.',
	'combination-repeated': (p) => `repeats the combination in utilities.${p.other}. The order of the modifiers doesn't matter.`,
	'utility-name-invalid': () => 'isn\'t a valid name. Use lowercase letters and digits separated by hyphens, starting with a letter (e.g., "card-hero").',
	'utility-reserved-prefix': (p) => `isn't a valid name. It can't start with "${p.prefix}" (a prefix reserved for the DS).`,
	'utility-name-is-modifier': () => "isn't a valid name. It's a component modifier or the theme class (variant-*, size-*, is-*, dark…), and it would override every component.",
	'utility-conflicts-ds': () => 'conflicts with a DS utility. Pick another name.',
	'utility-name-ts': () => 'isn\'t a valid name. "ts" is the scope class.',
	'utility-short-name': () => 'conflicts with a short DS name in scope mode. Pick another name.',
	'safelist-not-list': () => 'must be a list of strings.',
	'safelist-entry-empty': () => 'must be a non-empty string.',
	'safelist-unknown-prefix': (p) => `has the prefix "${p.prefix}", which doesn't exist.${didYouMean(p.suggestion)}`,
	'safelist-data-ts': (p) => `has the prefix "${p.prefix}", but \`data-ts-*\` is the hook for components, not a variant.`,
	'safelist-out-of-order': (p) => `has its variants out of order.${didYouMean(p.suggestion)}`,
	'safelist-invalid-chain': () => `has an invalid variant chain. A chain allows ${REGLA_CADENA_EN}.`,
	'safelist-misplaced-colon': () => 'has a misplaced ":". Variants go before the class (e.g., "md:hover:gap-4").',
	'safelist-legacy-prefix': (p) => `isn't valid. In scope mode, classes don't take \`ts-\`${p.suggestion !== undefined ? ` (write \`${p.suggestion}\`)` : ''}.`,
	'safelist-star-not-last': () => 'has a "*" that isn\'t at the end. A family only allows "*" at the end (e.g., "grid-cols-*").',
	'safelist-family-empty': (p) => `doesn't expand to any class in the DS or in your utilities.${didYouMean(p.suggestion)}`,
	'safelist-component-variant': () => "is a component. A component comes in whole and can't take a variant.",
	'safelist-modifier-variant': () => 'is a modifier of one of your utilities, so it can\'t take a variant. Put the variant on the utility itself (e.g., "md:mi-button").',
	'safelist-unknown': (p) => `isn't in the DS or in your utilities.${didYouMean(p.suggestion)}`,
	'ext-shape': (p) => `doesn't have the expected shape. It must be ${p.expected}.`,
	'ext-name-invalid': (p) => `has an invalid name ("${p.name}", ${CLASE_EN[p.kind]}). Use lowercase letters and digits separated by hyphens, starting with a letter${p.kind === 'block' ? ' and with the "ts-" prefix' : ''}.`,
	'ext-roots-empty': () => 'has no roots. A component needs at least one to own its blocks.',
	'ext-root-repeated': (p) => `repeats the root "${p.root}", which already belongs to ${p.other ? `the component "${p.other}"` : "the package's loose roots"}.`,
	'ext-block-not-owned': (p) => `has the block "${p.block}", which doesn't belong to any root of this component (${p.roots.join(', ') || 'none'}). It must be ts-<root> or ts-<root>-….`,
	'ext-block-repeated': (p) => `repeats the block "${p.block}".`,
	'ext-conflicts-core': (p) => `declares the ${CLASE_EN[p.kind]} "${p.name}", which conflicts with a Core name. Pick another.`,
	'ext-conflicts-extension': (p) => `declares the ${CLASE_EN[p.kind]} "${p.name}", which already belongs to the package "${p.other}". "${p.package}" and "${p.other}" can't share a name. Pick another.`,
	'ext-apply-target': (p) =>
		p.reason === 'core-component'
			? `applies "${p.target}" in "${p.block}", which is a block of a Core component. @apply only works toward Core utilities.`
			: p.reason === 'other-component'
				? `applies "${p.target}" in "${p.block}", which is a block of another component or another package. @apply only works toward Core utilities or blocks of the same component.`
				: p.reason === 'cycle'
					? `applies "${p.target}" in "${p.block}" and that forms an @apply cycle.`
					: `applies "${p.target}" in "${p.block}", which isn't a Core utility.${didYouMean(p.suggestion)}`,
	'ext-var-not-public': (p) => `reads ${p.variable} in "${p.block}", which is neither a Core token nor one of this package's roots (--ts-<root>-…).${didYouMean(p.suggestion)}`,
	'ext-modifier-loose': (p) =>
		p.motive === 'suelto'
			? `has a loose modifier in "${p.block}" at "${p.selector}". A modifier goes in the same compound as its base (& or .ts-…).`
			: `has a class in "${p.block}" at "${p.selector}" that isn't in the vocabulary. An extension can't add modifiers; it only uses Core's.`,
	'ext-color-literal': (p) =>
		`writes ${COLOR_EN[p.kind]} "${p.value}" in "${p.block}". CSS doesn't carry literal colors, only var(--…). Declare it in the component's tokens.`,
	'ext-top-level': (p) => `has something at the top level that isn't a @utility ("${p.snippet}"). Only @utility blocks are allowed.`,
	'ext-at-rule': (p) => `uses ${p.rule} in "${p.block}". Only @media, @supports, @container and @starting-style are allowed, plus @apply toward Core utilities.`,
	'ext-media-query': (p) => `uses a @media that isn't allowed in "${p.block}" ("${p.query}"). Only preference queries (prefers-*, forced-colors, hover, pointer), never the width.`,
	'ext-url': (p) => `uses url() in "${p.block}". An extension doesn't load resources.`,
	'ext-escape': (p) => `uses a backslash (\\) in "${p.block}". Escapes aren't allowed.`,
	'manifest-format': (p) => `ships a taisho.manifest.json ${p.format === undefined ? 'with no format' : `in format ${String(p.format)}`} (version ${p.version}), and this Core only reads format 3. Update the package.`,
	'manifest-shape': (p) => `has a taisho.manifest.json with an invalid shape: ${p.expected}.`,
	'manifest-json': (p) => `has invalid JSON in "${p.file}".`,
	'manifest-path-escapes': (p) => `names "${p.file}", which leaves the package folder. The whole package is rejected.`,
	'manifest-file-invalid': (p) => (p.reason === 'too-big' ? `names "${p.file}", which is larger than 1 MiB.` : `names "${p.file}", which isn't a regular file.`),
	'package-name-mismatch': (p) => `was installed as an alias: its package.json is named "${p.name}". A package with styles must be installed under its own name.`,
	'ext-css-unbalanced': () => "has braces, parentheses or brackets that don't close, or an unclosed string or comment.",
	'ext-char-not-allowed': (p) => `has a character that isn't allowed (${p.char}). Only printable ASCII.`,
	'ext-string-not-allowed': (p) => `uses a text string in "${p.block}". Only allowed in content, short and without braces, parentheses or at-signs.`,
	'ext-function-not-allowed': (p) => `uses the function ${p.fn}() in "${p.block}", which isn't in the allowed list (var, calc, min, max, clamp, round, mod, color-mix, rgb, hsl, oklch, linear-gradient, translate, scale, rotate, repeat, minmax).`,
	'ext-selector-not-allowed': (p) => `has a selector that isn't allowed in "${p.block}" ("${p.selector}"). ${SELECTOR_EN[p.motive]}`,
	'ext-important': (p) => `uses !important in "${p.block}", which isn't allowed. Raise the specificity instead (e.g. with && in the selector).`,
	'ext-custom-property': (p) => `declares the custom property ${p.property} in "${p.block}". CSS only reads var(--…). Declare the value in the component's tokens.`,
	'ext-syntax': (p) => `has something in "${p.block}" that can't be read ("${p.snippet}"). A declaration is property: value; with a lowercase property and a value from the allowed list.`,
	'ext-at-params': (p) => `uses ${p.rule} in "${p.block}" with parameters that aren't allowed ("${p.params}"). Simple queries with relative units.`,
	'ext-roots-overlap': (p) => `declares the root "${p.root}", which overlaps the root "${p.other}" of the package "${p.otherPackage}". One can't be a prefix of the other ("${p.package}" and "${p.otherPackage}"). Pick another.`,
	'ext-utility-no-root': (p) => `has the utility "${p.block}", which doesn't belong to any root of this package's components or of its loose roots. It must be ts-<root> or ts-<root>-….`,
	'ext-variable-repeated': (p) => `repeats the variable "${p.variable}". Two token keys produce the same name.`,
	'ext-apply-budget': (p) => `exceeds the @apply budget in "${p.block}": ${APPLY_EN[p.limit]} (maximum ${p.max}).`,
	'ext-limit': (p) => `exceeds the limit of ${LIMITE_EN[p.what]}: maximum ${p.max}.`,
	'theme-component-unknown': (p) => `isn't a component of any installed extension ("${p.slug}").${didYouMean(p.suggestion)}`,
	'theme-component-token-unknown': (p) => `isn't a token that "${p.slug}" declares ("${p.key}").${didYouMean(p.suggestion)}`,
};

const ERRORES = { es, en };

/** El error de una clave como lo imprime el CLI: `taisho config: <ruta> <qué pasó>`. */
export function configErrorLine(error: ConfigKeyError, lang: Lang): string {
	return `taisho config: ${error.path} ${(ERRORES[lang][error.code] as (p: ConfigKeyError['params']) => string)(error.params)}`;
}

