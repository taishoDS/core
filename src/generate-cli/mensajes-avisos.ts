// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { EngineWarning, WarningData, MotivoTailwind, NotaTailwind, WarningParams, ParamsMotivoTailwind } from '../generate/avisos-tipos';
import { textoSemillaBlanca } from '../lib/theme/aviso-blanca';
import { textoBordeEnCero } from '../lib/theme/aviso-borde';
import { REGLA_CADENA } from '../generate/propias';
import { ingles } from '../generate/tailwind-map-en';
import type { Lang } from './mensajes';

type Catalogo<P> = { [K in keyof P]: (p: P[K]) => string };

const lista = (xs: string[]) => xs.map((x) => `"${x}"`).join(', ');
const yLista = (xs: string[]) => new Intl.ListFormat('en', { type: 'conjunction' }).format(xs);
const sugerencia = (s?: string) => (s ? ` ¿Se quiso decir "${s}"?` : '');
const didYouMean = (s?: string) => (s ? ` Did you mean "${s}"?` : '');
const REGLA_CADENA_EN = 'at most one context, one print, one group or peer, and one state, in that order, and 3 segments';

const avisosEs: Catalogo<WarningParams> = {
	'scope-option': () => "`scope: 'ts'` ya es el único modo: se quita la clave.",
	'variant-on-component': (p) =>
		`"${p.class}" no se emite: las variantes (${p.variants.join(' ')}) aplican sólo a utilidades, y "${p.component}" es de un componente. Sus estados son \`is-*\`, \`aria\` y los internos.`,
	'invalid-composition': (p) =>
		`"${p.class}" no se emite: "${p.utility}" lleva "${p.inner}" y con "${p.use}" queda "${p.result}", que no es una cadena válida: admite ${REGLA_CADENA}.`,
	'data-ts-variant': (p) =>
		`"${p.class}" se rechaza y no se emite: \`data-ts-*\` es el gancho de los componentes, no una variante. Los \`data-<nombre>:\` propios sí valen.`,
	'unknown-prefix': (p) => `el prefijo "${p.prefix}" no existe (en "${p.class}").${sugerencia(p.suggestion)}`,
	'out-of-order': (p) => `"${p.class}" está fuera de orden y no se emite.${sugerencia(p.suggestion)}`,
	'invalid-chain': (p) => `"${p.class}" no se emite: la cadena admite ${REGLA_CADENA}.`,
	'runtime-class': (p) => `"${p.fragment}" parece compuesta en runtime; se agrega a safelist.`,
	'seed-shifted': (p) =>
		`Tema "${p.theme}": la semilla de "${p.color}" (${p.seed}) no encaja en ningún paso del modo ${p.mode === 'light' ? 'claro' : 'oscuro'} sin romper el contraste del texto (WCAG AA, 4,5:1); ` +
		`se corrió al borde del paso ${p.step}: L ${p.deltaL > 0 ? '+' : '−'}${Math.abs(p.deltaL).toFixed(3)}, más ${p.deltaL > 0 ? 'clara' : 'oscura'}. ` +
		`Gana la legibilidad; para el color exacto se elige una semilla con otra luminosidad.`,
	'seed-white': (p) => textoSemillaBlanca(p.theme, p.color, p.seed),
	'brand-like-status': (p) =>
		`Tema "${p.theme}": el primario (${p.brand}) casi no se distingue del estado "${p.status}" (${p.seed}; distancia ${p.distance.toFixed(3)} en OKLab, menos de ${p.threshold}): ` +
		`un botón primario y uno de ${p.status} se verían casi iguales. Se define ese estado aparte en \`defaultStates\`.`,
	'border-width-zero': (p) => textoBordeEnCero(p.theme, p.name, p.value),
	'missing-ts': (p) => `<${p.element}> usa clases del DS (${lista(p.classes)}) pero no lleva la clase \`ts\`, y sin ella no recibe estilo.`,
	'ignored-attribute': (p) =>
		`el atributo \`${p.attribute}\` trae la clase \`ts\` y clases del DS (${lista(p.classes)}), pero no se lee como clases y no se emiten. Se leen los atributos \`class\`, \`className\` y los que terminan en \`class\`, \`Class\` o \`ClassName\` (\`bodyClass\`, \`body-class\`); si no es posible renombrarlo, las clases van al \`safelist\`.`,
	'unknown-class': (p) => `"${p.class}" no existe en el DS y no se emite.${sugerencia(p.suggestion)}`,
	'class-without-equivalent': (p) => `"${p.class}" es un nombre de otro framework sin equivalente en el DS y no se emite: ${p.reason}.`,
	'important-class': (p) => `"${p.class}" no se emite: el modificador importante (\`!\`) no existe, la cascada de capas hace que la utilidad gane sin forzarla.${sugerencia(p.suggestion)}`,
	'other-scale': (p) =>
		p.otherPx === undefined
			? `"${p.class}" existe en TaishoDS pero no vale lo mismo que en otro framework.${p.equivalent ? ` El equivalente es "${p.equivalent}".` : ''}`
			: `"${p.class}" vale ${p.px} px en TaishoDS; el mismo número vale ${p.otherPx} px en otro framework. ${p.equivalent ? `Para ${p.otherPx} px se escribe "${p.equivalent}".` : `No hay una clase de ${p.otherPx} px con ese prefijo.`}`,
	'renamed-class': (p) => `"${p.class}" es un nombre viejo y no se emite.${sugerencia(p.suggestion)}`,
	'modifier-with-variant': (p) =>
		`"${p.class}" no se emite: "${p.modifier}" es un modificador de ${lista(p.utilities)} y no lleva variante; se pone la variante en la propia (p. ej. "${p.suggestion}").`,
	'orphan-modifier': (p) =>
		`"${p.class}" es un modificador de ${lista(p.utilities)} y no hace nada sin ${p.utilities.length > 1 ? 'una de ellas' : 'ella'} en el mismo elemento.`,
	'legacy-prefix': (p) => `"${p.class}" lleva el prefijo viejo \`ts-\` y ya no pinta. Se escribe "${p.suggestion}" con la clase \`ts\` en el mismo elemento.`,
	'legacy-prefix-renamed': (p) => `"${p.class}" lleva el prefijo viejo \`ts-\` y es un nombre viejo. Se escribe "${p.suggestion}" con la clase \`ts\` en el mismo elemento.`,
	'legacy-prefix-removed': (p) => `"${p.class}" lleva el prefijo viejo \`ts-\` y está deprecada sin sucesor: se reemplaza a mano.`,
	'unknown-var': (p) => `"var(${p.variable})" no existe en el tema.${sugerencia(p.suggestion)}`,
	'css-outside-content': (p) => `usa variables del tema (${lista(p.variables)}) que se podaron porque este .css no está en \`content\`: conviene sumarlo (por ejemplo \`**/*.css\`) y volver a correr.`,
};

const avisosEn: Catalogo<WarningParams> = {
	'scope-option': () => "`scope: 'ts'` is already the only mode. Remove the key.",
	'variant-on-component': (p) =>
		`"${p.class}" isn't emitted. Variants (${p.variants.join(' ')}) apply only to utilities, and "${p.component}" belongs to a component. Its states are \`is-*\`, \`aria\`, and its internal ones.`,
	'invalid-composition': (p) =>
		`"${p.class}" isn't emitted. "${p.utility}" includes "${p.inner}", and with "${p.use}" it becomes "${p.result}", which isn't a valid chain. A chain allows ${REGLA_CADENA_EN}.`,
	'data-ts-variant': (p) =>
		`"${p.class}" is rejected and isn't emitted. \`data-ts-*\` is the hook for components, not a variant. Your own \`data-<name>:\` variants are fine.`,
	'unknown-prefix': (p) => `The prefix "${p.prefix}" doesn't exist (in "${p.class}").${didYouMean(p.suggestion)}`,
	'out-of-order': (p) => `"${p.class}" is out of order and isn't emitted.${didYouMean(p.suggestion)}`,
	'invalid-chain': (p) => `"${p.class}" isn't emitted. A chain allows ${REGLA_CADENA_EN}.`,
	'runtime-class': (p) => `"${p.fragment}" looks like it's built at runtime. Add it to safelist.`,
	'seed-shifted': (p) =>
		`Theme "${p.theme}": the "${p.color}" seed (${p.seed}) doesn't fit any ${p.mode} mode step without breaking text contrast (WCAG AA, 4.5:1), ` +
		`so it was moved to the edge of step ${p.step} (L ${p.deltaL > 0 ? '+' : '−'}${Math.abs(p.deltaL).toFixed(3)}, ${p.deltaL > 0 ? 'lighter' : 'darker'}). ` +
		`Legibility wins. For the exact color, pick a seed with a different lightness.`,
	'seed-white': (p) =>
		`Theme "${p.theme}": the "${p.color}" seed (${p.seed}) is almost white. It doesn't show on the light background, and the solid fill (buttons, checkboxes, toggles) can't be white, so it comes out gray. ` +
		`For a white button use an outlined variant; for the brand, pick a darker seed.`,
	'brand-like-status': (p) =>
		`Theme "${p.theme}": the primary color (${p.brand}) is almost indistinguishable from the "${p.status}" status color (${p.seed}; OKLab distance ${p.distance.toFixed(3)}, under ${p.threshold}). ` +
		`A primary button and a ${p.status} button would look nearly the same. Set that status color separately in \`defaultStates\`.`,
	'border-width-zero': (p) =>
		`Theme "${p.theme}": borderWidths.${p.name} is ${p.value}, and that width draws the focus (${p.name === '1' ? 'its line' : 'its halo'}), so that stroke disappears and the focus shows less or not at all. ` +
		`Use a width above 0, or keep the built-in one.`,
	'missing-ts': (p) => `<${p.element}> uses DS classes (${lista(p.classes)}) but doesn't have the \`ts\` scope class, so it gets no styles.`,
	'ignored-attribute': (p) =>
		`The \`${p.attribute}\` attribute holds the \`ts\` class and DS classes (${lista(p.classes)}), but it isn't read as classes, so they aren't emitted. The attributes read are \`class\`, \`className\`, and any ending in \`class\`, \`Class\`, or \`ClassName\` (\`bodyClass\`, \`body-class\`); if it can't be renamed, add the classes to the \`safelist\`.`,
	'unknown-class': (p) => `"${p.class}" isn't a DS class, so it isn't emitted.${didYouMean(p.suggestion)}`,
	'class-without-equivalent': (p) => `"${p.class}" is a name from another framework with no DS equivalent, so it isn't emitted: ${deLaTabla(p.reason)}.`,
	'important-class': (p) => `"${p.class}" isn't emitted: the important modifier (\`!\`) doesn't exist, cascade layers make the utility win without forcing it.${didYouMean(p.suggestion)}`,
	'other-scale': (p) =>
		p.otherPx === undefined
			? `"${p.class}" exists in TaishoDS but doesn't mean the same as in another framework.${p.equivalent ? ` The equivalent is "${p.equivalent}".` : ''}`
			: `"${p.class}" is ${p.px} px in TaishoDS; the same number is ${p.otherPx} px in another framework. ${p.equivalent ? `For ${p.otherPx} px, write "${p.equivalent}".` : `There is no ${p.otherPx} px class with that prefix.`}`,
	'renamed-class': (p) => `"${p.class}" is an old name and isn't emitted.${didYouMean(p.suggestion)}`,
	'modifier-with-variant': (p) =>
		`"${p.class}" isn't emitted. "${p.modifier}" is a modifier of ${yLista(p.utilities.map((u) => `"${u}"`))}, and a modifier can't take a variant. Put the variant on the utility itself (e.g., "${p.suggestion}").`,
	'orphan-modifier': (p) =>
		`"${p.class}" is a modifier of ${yLista(p.utilities.map((u) => `"${u}"`))}. It does nothing without ${p.utilities.length > 1 ? 'one of them' : 'that utility'} on the same element.`,
	'legacy-prefix': (p) => `"${p.class}" has the old \`ts-\` prefix and no longer applies any style. Write "${p.suggestion}" with the \`ts\` class on the same element.`,
	'legacy-prefix-renamed': (p) => `"${p.class}" has the old \`ts-\` prefix and an old name. Write "${p.suggestion}" with the \`ts\` class on the same element.`,
	'legacy-prefix-removed': (p) => `"${p.class}" has the old \`ts-\` prefix and is deprecated with no replacement. Replace it by hand.`,
	'unknown-var': (p) => `"var(${p.variable})" isn't defined in the theme.${didYouMean(p.suggestion)}`,
	'css-outside-content': (p) => `It uses theme variables (${lista(p.variables)}) that were pruned because this .css isn't in \`content\`. Add it (for example \`**/*.css\`) and run again.`,
};

function deLaTabla(es: string): string {
	try {
		return ingles(es).replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
	} catch {
		return es;
	}
}

const motivosEs: Catalogo<ParamsMotivoTailwind> = {
	important: () => '`!` (important) no existe: la cascada de capas hace que la utilidad gane sin forzarla',
	'arbitrary-variant': (p) => `\`${p.variant}:\` lleva un valor arbitrario: el vocabulario de variantes es cerrado`,
	'dark-variant': () => '`dark:` no existe: el oscuro sale del tema (`light-dark()`, `createTheme`), no de una clase por elemento',
	'has-variant': () => '`has-*` no existe: el vocabulario de variantes es cerrado',
	'not-variant': () => '`not-*` no existe: el vocabulario de variantes es cerrado',
	'structural-variant': () => 'las variantes estructurales (`first:`, `odd:`…) no existen: el vocabulario de variantes es cerrado',
	'focus-within-variant': () => '`focus-within:` no existe: el vocabulario de variantes es cerrado',
	'motion-variant': () => '`motion-*` no existe: el movimiento lo resuelven los tokens de motion (`prefers-reduced-motion`)',
	'supports-variant': () => '`supports-*` no existe: el vocabulario de variantes es cerrado',
	'data-ts-variant': () => '`data-ts-*` es el gancho de los componentes, no una variante',
	'breakpoint-missing': (p) => `el corte \`${p.variant}:\` no está en las pantallas del Core; se agrega con extend.screens`,
	'unknown-variant': (p) =>
		`\`${p.variant}:\` no está en el vocabulario de variantes (hover, focus, focus-visible, active, disabled, checked, invalid, aria-*, data-<nombre>, group-*, peer-*, print, pantallas y @contenedores)`,
	'component-variant': (p) => `\`${p.class}\` es un componente de TaishoDS: las variantes aplican sólo a utilidades (sus estados son \`is-*\`, \`aria\` y los internos)`,
	'marker-with-variants': (p) => `\`${p.class}\` es un marcador y no lleva variantes`,
	'invalid-chain': (p) => `la cadena \`${p.chain}\` no entra en la forma canónica: un contexto (pantalla o @contenedor), \`print:\`, un group/peer y un estado, 3 como máximo`,
	'opacity-modifier': (p) => `\`${p.class}\` lleva un modificador de opacidad (\`${p.opacity}\`) que no existe: el vocabulario es cerrado; hay escalas con alfa (\`bg-grayAlpha-200\`)`,
	'color-family-missing': (p) => `la familia \`${p.family}\` no está en tu tema: se suma una semilla \`${p.family}\` en \`colors\` y se vuelve a correr`,
	'color-step-missing': (p) => `el escalón ${p.step} no existe en TaishoDS (los de la familia \`${p.family}\` son ${p.steps.join(', ')})`,
	'arbitrary-value': (p) => `\`${p.class}\` lleva un valor arbitrario: el vocabulario es cerrado; la escotilla es un token del config o una utilidad propia en \`utilities\``,
	'no-equivalent': (p) => `\`${p.class}\`: ${p.reason}`,
	'not-in-map': (p) => `\`${p.class}\` no tiene equivalente en TaishoDS (ver sinEquivalente en la tabla de Tailwind)`,
	'runtime-class': () => 'la clase se arma en runtime (`${…}`): no se puede traducir; se escribe entera o se arma con un mapa de clases completas',
	'theme-breakpoints': () => 'tu `@theme` redefine `--breakpoint-*`: el corte ya no vale lo que dice la tabla; se pasa a `extend.screens` en `taisho.config.ts` y se escribe a mano',
	'theme-spacing': (p) => `tu \`@theme\` redefine \`--spacing\`: \`${p.class}\` ya no mide ${p.px}px; se revisa a mano (en TaishoDS el número es el valor en px)`,
	'theme-radius': (p) => `tu \`@theme\` redefine \`--radius-*\`: \`${p.class}\` ya no vale lo que dice la tabla; se revisa a mano (radios propios, en \`extend.radius\`)`,
	'theme-text': (p) => `tu \`@theme\` redefine \`--text-*\`: \`${p.class}\` ya no vale lo que dice la tabla; se revisa a mano`,
	'component-conflict': (p) =>
		`\`${p.class}\` de Tailwind no es lo que \`${p.class}\` es en TaishoDS (un componente): el elemento no se tocó; se renombra la clase propia o se escribe ese CSS en una hoja propia`,
	'name-conflict': (p) => `\`${p.class}\` es también un nombre de TaishoDS: el elemento no se tocó; se renombra la clase propia`,
	classlist: (p) =>
		`\`classList\` no se convierte: ${p.converted !== undefined ? `la clase en TaishoDS es \`${p.converted}\` y ` : ''}el elemento necesita la llave \`ts\` en su \`class\`; se hace a mano`,
	'already-scoped': (p) => `este string ya tiene la llave \`ts\` y no se reconvierte; \`${p.class}\` es de Tailwind (en TaishoDS: \`${p.converted}\`)`,
	untouched: (p) =>
		`el elemento no se tocó porque ${p.conflicts.map((t) => `\`${t}\``).join(', ')} choca con un nombre de TaishoDS; después de resolverlo, se convierte \`${p.class}\` a mano (en TaishoDS: \`${p.converted}\`)`,
	'possible-class': () => 'parece una clase de Tailwind pero está en un string que no es claramente una lista de clases: no se tocó; si lo es, se convierte a mano',
	'directive-without-ts': (p) =>
		`la directiva no puede llevar la llave: el elemento necesita un \`class\` con \`ts\` (hoy no lo tiene)${p.component ? '; es un componente tuyo: Tailwind no le pone la llave' : ''}`,
	'tailwind-merge': () => 'TaishoDS no trae un `twMerge`: la cascada de capas hace que tu CSS gane sobre la utilidad sin resolver conflictos de clases; se revisan las llamadas a mano',
	apply: (p) =>
		`\`@apply\` no se reescribe. Traducción: \`${p.translation}\`` +
		(p.untranslated.length ? `; sin traducir: ${p.untranslated.map((s) => `${s.class} (${s.reason ? textoMotivo(s.reason, 'es') : 'no es de Tailwind'})`).join('; ')}` : ''),
	'tailwind-import': () => 'el import de Tailwind no tiene equivalente: el CSS de TaishoDS sale de `taisho generate`; se saca cuando no quede ninguna clase de Tailwind',
	'theme-block': (p) => {
		const pistas = [
			p.families.length ? `colores (${p.families.join(', ')}): semillas en \`colors\` del config` : '',
			p.breakpoints ? 'cortes: `extend.screens`' : '',
			p.radius ? 'radios: `extend.radius`' : '',
			p.spacing ? 'espaciado: `extend.spacing`' : '',
			p.text ? 'tamaños de texto: los de TaishoDS son una escala propia' : '',
		].filter(Boolean);
		return `el \`@theme\` no se migra solo${pistas.length ? ` (${pistas.join('; ')})` : ''}${p.spacing || p.radius || p.text || p.breakpoints ? '; las clases de esas familias quedan sin convertir (tipo `tema`)' : ''}`;
	},
	'tailwind-directive': (p) => `\`@${p.directive}\` es de Tailwind y no tiene equivalente en TaishoDS: se declara en \`taisho.config.ts\` (\`content\`, \`extend\`, \`utilities\`)`,
};

const motivosEn: Catalogo<ParamsMotivoTailwind> = {
	important: () => "`!` (important) doesn't exist. Cascade layers make the utility win without forcing it",
	'arbitrary-variant': (p) => `\`${p.variant}:\` has an arbitrary value, and the variant vocabulary is closed`,
	'dark-variant': () => "`dark:` doesn't exist. Dark mode comes from the theme (`light-dark()`, `createTheme`), not from a class on each element",
	'has-variant': () => "`has-*` doesn't exist. The variant vocabulary is closed",
	'not-variant': () => "`not-*` doesn't exist. The variant vocabulary is closed",
	'structural-variant': () => "structural variants (`first:`, `odd:`…) don't exist. The variant vocabulary is closed",
	'focus-within-variant': () => "`focus-within:` doesn't exist. The variant vocabulary is closed",
	'motion-variant': () => "`motion-*` doesn't exist. The motion tokens handle it (`prefers-reduced-motion`)",
	'supports-variant': () => "`supports-*` doesn't exist. The variant vocabulary is closed",
	'data-ts-variant': () => '`data-ts-*` is the hook for components, not a variant',
	'breakpoint-missing': (p) => `the \`${p.variant}:\` breakpoint isn't one of Core's screens; add it with extend.screens`,
	'unknown-variant': (p) =>
		`\`${p.variant}:\` isn't in the variant vocabulary (hover, focus, focus-visible, active, disabled, checked, invalid, aria-*, data-<name>, group-*, peer-*, print, screens, and @containers)`,
	'component-variant': (p) => `\`${p.class}\` is a TaishoDS component. Variants apply only to utilities (its states are \`is-*\`, \`aria\`, and its internal ones)`,
	'marker-with-variants': (p) => `\`${p.class}\` is a marker and can't take variants`,
	'invalid-chain': (p) => `the \`${p.chain}\` chain doesn't fit the canonical form: one context (screen or @container), \`print:\`, one group/peer, and one state, 3 at most`,
	'opacity-modifier': (p) => `\`${p.class}\` has an opacity modifier (\`${p.opacity}\`) that doesn't exist, and the vocabulary is closed. There are alpha scales (\`bg-grayAlpha-200\`)`,
	'color-family-missing': (p) => `the \`${p.family}\` family isn't in your theme. Add a \`${p.family}\` seed to \`colors\` and run again`,
	'color-step-missing': (p) => `step ${p.step} doesn't exist in TaishoDS (the \`${p.family}\` family has ${p.steps.join(', ')})`,
	'arbitrary-value': (p) => `\`${p.class}\` has an arbitrary value, and the vocabulary is closed. The way out is a token in your config or your own utility in \`utilities\``,
	'no-equivalent': (p) => `\`${p.class}\`: ${deLaTabla(p.reason)}`,
	'not-in-map': (p) => `\`${p.class}\` has no TaishoDS equivalent (see sinEquivalente in the Tailwind table)`,
	'runtime-class': () => "the class is built at runtime (`${…}`), so it can't be translated. Write it in full or build it from a map of complete classes",
	'theme-breakpoints': () =>
		'your `@theme` redefines `--breakpoint-*`, so the breakpoint no longer matches the table. Move it to `extend.screens` in `taisho.config.ts` and write it by hand',
	'theme-spacing': (p) => `your \`@theme\` redefines \`--spacing\`, so \`${p.class}\` no longer measures ${p.px}px. Check it by hand (in TaishoDS the number is the value in px)`,
	'theme-radius': (p) => `your \`@theme\` redefines \`--radius-*\`, so \`${p.class}\` no longer matches the table. Check it by hand (custom radii go in \`extend.radius\`)`,
	'theme-text': (p) => `your \`@theme\` redefines \`--text-*\`, so \`${p.class}\` no longer matches the table. Check it by hand`,
	'component-conflict': (p) =>
		`Tailwind's \`${p.class}\` isn't what \`${p.class}\` is in TaishoDS (a component). The element was left untouched. Rename your class or write that CSS in your stylesheet`,
	'name-conflict': (p) => `\`${p.class}\` is also a TaishoDS name. The element was left untouched. Rename your class`,
	classlist: (p) =>
		`\`classList\` isn't converted. ${p.converted !== undefined ? `The TaishoDS class is \`${p.converted}\`, and the` : 'The'} element needs the \`ts\` scope class in its \`class\`. Do it by hand`,
	'already-scoped': (p) => `this string already has the \`ts\` scope class and isn't converted again. \`${p.class}\` is from Tailwind (in TaishoDS, \`${p.converted}\`)`,
	untouched: (p) =>
		`the element was left untouched because ${yLista(p.conflicts.map((t) => `\`${t}\``))} ${p.conflicts.length > 1 ? 'conflict' : 'conflicts'} with a TaishoDS name. ` +
		`After you resolve it, convert \`${p.class}\` by hand (in TaishoDS, \`${p.converted}\`)`,
	'possible-class': () => "looks like a Tailwind class, but it's in a string that isn't clearly a class list, so it was left untouched. If it is one, convert it by hand",
	'directive-without-ts': (p) =>
		`a directive can't carry the \`ts\` scope class, so the element needs a \`class\` with \`ts\` (it doesn't have one yet)${p.component ? ". It's your own component, and Tailwind doesn't add the class to it" : ''}`,
	'tailwind-merge': () => "TaishoDS doesn't ship a `twMerge`. Cascade layers make your CSS win over the utility without resolving class conflicts. Check the calls by hand",
	apply: (p) =>
		`\`@apply\` isn't rewritten. Translation: \`${p.translation}\`` +
		(p.untranslated.length ? `; not translated: ${p.untranslated.map((s) => `${s.class} (${s.reason ? textoMotivo(s.reason, 'en') : 'not from Tailwind'})`).join('; ')}` : ''),
	'tailwind-import': () => 'the Tailwind import has no equivalent. TaishoDS CSS comes from `taisho generate`. Remove it once no Tailwind classes remain',
	'theme-block': (p) => {
		const pistas = [
			p.families.length ? `colors (${p.families.join(', ')}) become seeds in \`colors\` in the config` : '',
			p.breakpoints ? 'breakpoints go in `extend.screens`' : '',
			p.radius ? 'radii go in `extend.radius`' : '',
			p.spacing ? 'spacing goes in `extend.spacing`' : '',
			p.text ? 'TaishoDS text sizes are their own scale' : '',
		].filter(Boolean);
		return `\`@theme\` isn't migrated for you${pistas.length ? ` (${pistas.join('; ')})` : ''}${p.spacing || p.radius || p.text || p.breakpoints ? '. Classes in those families stay unconverted (type `tema`)' : ''}`;
	},
	'tailwind-directive': (p) => `\`@${p.directive}\` belongs to Tailwind and has no TaishoDS equivalent. Declare it in \`taisho.config.ts\` (\`content\`, \`extend\`, \`utilities\`)`,
};

const notasEs = {
	'map-note': (p: { note: string }) => p.note,
	'disabled-wider': () => '`disabled:` también corre con `aria-disabled="true"`: es más amplio que el de Tailwind, a propósito',
};
const notasEn: typeof notasEs = {
	'map-note': (p) => deLaTabla(p.note),
	'disabled-wider': () => "`disabled:` also applies with `aria-disabled=\"true\"`. It's broader than Tailwind's on purpose",
};

const AVISOS = { es: avisosEs, en: avisosEn };
const MOTIVOS = { es: motivosEs, en: motivosEn };
const NOTAS = { es: notasEs, en: notasEn };

/** El texto de un aviso, sin ubicación. */
export function warningText(warning: WarningData, lang: Lang): string {
	return (AVISOS[lang][warning.code] as (p: WarningData['params']) => string)(warning.params);
}

/** El aviso como lo imprimen `generate`, `watch` y el plugin: `archivo:línea: texto`, `archivo: texto` o el texto solo. */
export function warningLine(warning: EngineWarning, lang: Lang): string {
	const donde = warning.file === undefined ? '' : warning.line === undefined ? `${warning.file}: ` : `${warning.file}:${warning.line}: `;
	return donde + warningText(warning, lang);
}

export function textoMotivo(m: MotivoTailwind, idioma: Lang): string {
	return (MOTIVOS[idioma][m.code] as (p: MotivoTailwind['params']) => string)(m.params);
}

export function textoNotas(notas: readonly NotaTailwind[], idioma: Lang): string {
	return notas.map((n) => (NOTAS[idioma][n.code] as (p: NotaTailwind['params']) => string)(n.params)).join('. ');
}
