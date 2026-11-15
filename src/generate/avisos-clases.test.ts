// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { derivarVocabulario, type ContentFile, type Vocabulario } from './compile';
import { avisosEstructuradosDeMarkup } from './avisos-clases';
import { warningLine } from '../generate-cli/mensajes-avisos';
import type { TaishoConfig } from './vocabulary';

const avisosDeMarkup = (archivos: ContentFile[], v: Vocabulario) => [...new Set(avisosEstructuradosDeMarkup(archivos, v).map((a) => warningLine(a, 'es')))];

const config: TaishoConfig = {
	themes: { principal: { colors: { brand: '#4F46E5' } } },
	fontFaces: [],
	defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' },
	utilities: { 'card-hero': ['flex', 'gap-base'] },
};
const vocabulario = derivarVocabulario(config);
const avisos = (file: string, content: string) => avisosDeMarkup([{ file, content }], vocabulario);

describe('avisosDeMarkup — (A) clase con forma del DS que no existe', () => {
	it('un typo con sugerencia, con la línea', () => {
		expect(avisos('a.html', '<p>x</p>\n<div class="ts gird-cols-3"></div>')).toEqual(['a.html:2: "gird-cols-3" no existe en el DS y no se emite. ¿Se quiso decir "grid-cols-3"?']);
		expect(avisos('a.html', '<div class="ts gap-bse"></div>')).toEqual(['a.html:1: "gap-bse" no existe en el DS y no se emite. ¿Se quiso decir "gap-base"?']);
	});
	it('un valor numérico fuera de la escala, sin sugerencia que inventar', () => {
		const [a] = avisos('a.html', '<div class="ts m-17"></div>');
		expect(a).toMatch(/^a\.html:1: "m-17" no existe en el DS y no se emite\./);
		expect(avisos('a.html', '<div class="ts p-45"></div>')[0]).toContain('"p-45"');
	});
	it('con variante válida y base inexistente, la sugerencia conserva la variante', () => {
		expect(avisos('a.html', '<div class="ts md:gird-cols-3"></div>')).toEqual(['a.html:1: "md:gird-cols-3" no existe en el DS y no se emite. ¿Se quiso decir "md:grid-cols-3"?']);
	});
	it('no avisa por clases propias, BEM ni ganchos de JS', () => {
		expect(avisos('a.html', '<div class="ts card hero js-toggle card__title is-open site-header flex-item grid-item text-muted"></div>')).toEqual([]);
	});
	it('no avisa por nombres del DS, utilities propias, variantes válidas ni valores con barra', () => {
		expect(avisos('a.html', '<div class="ts flex gap-base p-4 md:grid-cols-3 w-1/4 card-hero variant-primary size-md bg-brand-500 hover:bg-brand-600"></div>')).toEqual([]);
	});
	it('un nombre viejo (se renombró) apunta al sucesor', () => {
		expect(avisos('a.html', '<div class="ts text-center ml-base"></div>')).toEqual([
			'a.html:1: "text-center" es un nombre viejo y no se emite. ¿Se quiso decir "align-center"?',
			'a.html:1: "ml-base" es un nombre viejo y no se emite. ¿Se quiso decir "ms-base"?',
		]);
	});
	it('un nombre de Tailwind con equivalente, un prefijo de un nombre del DS y un valor de modificador inexistente', () => {
		expect(avisos('a.html', '<div class="ts shrink-0"></div>')).toEqual(['a.html:1: "shrink-0" no existe en el DS y no se emite. ¿Se quiso decir "flex-shrink-0"?']);
		expect(avisos('a.html', '<div class="ts input-prefix"></div>')).toEqual(['a.html:1: "input-prefix" no existe en el DS y no se emite.']);
		expect(avisos('a.html', '<div class="ts variant-fancy"></div>')).toEqual(['a.html:1: "variant-fancy" no existe en el DS y no se emite.']);
		expect(avisos('a.html', '<div class="ts shape-default level-2"></div>')).toEqual([
			'a.html:1: "shape-default" no existe en el DS y no se emite.',
			'a.html:1: "level-2" no existe en el DS y no se emite.',
		]);
	});
	it('las clases del usuario con forma propia siguen sin avisar', () => {
		expect(avisos('a.html', '<div class="ts container hero-title page news-card lead is-active btn-primary tag-list"></div>')).toEqual([]);
	});
	it('un elemento sin `ts` y sin nada inequívoco del DS no avisa nada, ni el typo', () => {
		expect(avisos('a.html', '<div class="gird-cols-3 mt-3"></div>')).toEqual([]);
	});
});

describe('avisosDeMarkup — (B) falta la llave `ts`', () => {
	it('clases compuestas del DS sin `ts`', () => {
		expect(avisos('a.html', '\n<div class="flex gap-base"></div>')).toEqual(['a.html:2: <div> usa clases del DS ("gap-base") pero no lleva la clase `ts`, y sin ella no recibe estilo.']);
	});
	it('un modificador de componente cuenta', () => {
		expect(avisos('a.html', '<button class="button variant-primary"></button>')[0]).toContain('("variant-primary")');
	});
	it('también en svelte, vue, astro, jsx y tsx; la variante se quita', () => {
		for (const f of ['a.svelte', 'a.vue', 'a.astro', 'a.jsx', 'a.tsx']) {
			expect(avisos(f, '<main>\n<div class="md:gap-base"></div></main>')).toHaveLength(1);
		}
		expect(avisos('a.jsx', '<div className="gap-base"></div>')).toHaveLength(1);
	});
	it('una palabra común sola no alcanza (button, table, card, flex, grid, hidden)', () => {
		expect(avisos('a.html', '<div class="button table card flex grid hidden link"></div>')).toEqual([]);
	});
	it('un componente (mayúscula, kebab o con punto) pone la llave él', () => {
		expect(avisos('a.svelte', '<Button class="gap-base"></Button><nav-bar class="gap-base"/><Foo.Bar class="gap-base" />')).toEqual([]);
	});
	it('un class dinámico o parcial, un string de JS y los formatos que no son markup no avisan', () => {
		expect(avisos('a.svelte', '<div class="gap-base {x}"></div><div class={y}></div><div class="a ${b}"></div>')).toEqual([]);
		expect(avisos('a.svelte', '<script>const h = \'<div class="gap-base">\';</script>\n<!-- <div class="gap-base"> -->')).toEqual([]);
		expect(avisos('a.js', 'el.innerHTML = \'<div class="gap-base">\'')).toEqual([]);
		expect(avisos('a.md', '<div class="gap-base"></div>')).toEqual([]);
	});
	it('un class con `ts-` es markup clásico: no avisa', () => {
		expect(avisos('a.html', '<div class="ts-flex gap-base"></div>')).toEqual([]);
	});
	it('si falta la llave, valida además los tokens del elemento', () => {
		expect(avisos('a.html', '<div class="gap-base gird-cols-3"></div>')).toHaveLength(2);
	});
	it('un elemento correcto no avisa', () => {
		expect(avisos('a.html', '<div class="ts flex gap-base"><span class="ts align-center"></span></div>')).toEqual([]);
	});
});

describe('avisosDeMarkup — modificadores de utilidades propias', () => {
	const vm = derivarVocabulario({ ...config, utilities: { 'mi-button': ['flex'], 'mi-button.destructive': ['gap-base'], 'mi-button.destructive.outlined': ['gap-half'], 'mi-badge': ['flex'], 'mi-badge.destructive': ['gap-half'] } });
	const av = (content: string) => avisosDeMarkup([{ file: 'a.html', content }], vm);
	it('las claves con punto no son nombres de clase', () => {
		expect(vm.vocabulario).not.toContain('mi-button.destructive');
		expect(vm.esUtilidad('mi-button.destructive')).toBe(false);
	});
	it('un modificador junto a su propia es válido, también con prefijo en la propia', () => {
		expect(av('<button class="ts mi-button destructive outlined"></button>')).toEqual([]);
		expect(av('<button class="ts md:mi-button destructive"></button>')).toEqual([]);
	});
	it('un modificador sin su propia avisa', () => {
		expect(av('<button class="ts destructive"></button>')).toEqual(['a.html:1: "destructive" es un modificador de "mi-button", "mi-badge" y no hace nada sin una de ellas en el mismo elemento.']);
		expect(av('<button class="ts outlined flex"></button>')[0]).toContain('"outlined" es un modificador de "mi-button" y no hace nada sin ella');
	});
	it('md:destructive no existe y apunta a la propia', () => {
		expect(av('<button class="ts mi-button md:destructive"></button>')).toEqual(['a.html:1: "md:destructive" no se emite: "destructive" es un modificador de "mi-button", "mi-badge" y no lleva variante; se pone la variante en la propia (p. ej. "md:mi-button").']);
	});
	it('un modificador con el nombre de otro del DS no se trata como propio', () => {
		const v = derivarVocabulario({ ...config, utilities: { 'mi-link': ['flex'], 'mi-link.variant-primary': ['gap-half'] } });
		expect(avisosDeMarkup([{ file: 'a.html', content: '<a class="ts button variant-primary"></a>' }], v)).toEqual([]);
	});
});

describe('avisosDeMarkup: atributo que no se lee como clases (red de seguridad)', () => {
	it.each([
		['svelte', 'Card.svelte', '<Card variant="ts p-4" />'],
		['vue', 'Card.vue', '<template><Card ui="ts p-4"></Card></template>'],
		['tsx', 'Card.tsx', 'export const A = () => <Card ui="ts p-4" />;'],
		['astro', 'Card.astro', '---\n---\n<Card ui="ts p-4" />'],
		['html', 'a.html', '<div data-ui="ts p-4"></div>'],
	])('avisa en %s con el atributo y las clases', (_n, file, content) => {
		const [a] = avisosEstructuradosDeMarkup([{ file, content }], vocabulario);
		expect(a).toMatchObject({ code: 'ignored-attribute', rule: 'ignored-attribute', severity: 'warning', file, line: expect.any(Number) });
		expect(a.params).toMatchObject({ classes: ['p-4'] });
	});

	it('el mensaje nombra el atributo y las clases, en español y en inglés', () => {
		const [a] = avisosEstructuradosDeMarkup([{ file: 'a.html', content: '<div ui="ts p-4 flex"></div>' }], vocabulario);
		expect(warningLine(a, 'es')).toContain('el atributo `ui` trae la clase `ts` y clases del DS ("p-4", "flex")');
		expect(warningLine(a, 'en')).toContain('The `ui` attribute holds the `ts` class and DS classes ("p-4", "flex")');
	});

	it('no avisa si el atributo se lee como clases, si falta `ts` o si no hay clases del DS', () => {
		for (const [file, content] of [
			['a.html', '<div wrapperClass="ts p-4"></div>'],
			['a.html', '<div data-active-class="ts p-4"></div>'],
			['a.html', '<div class="ts p-4"></div>'],
			['a.html', '<div title="p-4 flex"></div>'],
			['a.html', '<div title="ts"></div>'],
			['a.html', '<div title="ts mi-clase-propia"></div>'],
			['a.html', '<!-- <div ui="ts p-4"></div> -->'],
		] as const) {
			expect(avisos(file, content), content).toEqual([]);
		}
	});
});

describe('avisosDeMarkup: nombres de Tailwind sin equivalente y el importante', () => {
	const aviso = (content: string) => avisosEstructuradosDeMarkup([{ file: 'a.html', content }], vocabulario);

	it.each(['rotate-45', 'border-dashed', 'mt-auto', 'grayscale', 'bg-gradient-to-r'])('%s avisa con el motivo de la tabla y no se emite', (clase) => {
		const [a] = aviso(`<div class="ts ${clase}"></div>`);
		expect(a).toMatchObject({ code: 'class-without-equivalent', rule: 'unknown-class', severity: 'warning', params: { class: clase } });
		expect(warningLine(a, 'es')).toContain(`"${clase}" es un nombre de otro framework sin equivalente en el DS y no se emite: `);
		expect(warningLine(a, 'en')).toContain(`"${clase}" is a name from another framework with no DS equivalent, so it isn't emitted: `);
	});

	it('el motivo sale en el idioma pedido', () => {
		const [a] = aviso('<div class="ts mt-auto"></div>');
		expect(warningLine(a, 'es')).toContain('sólo existen `m-auto`');
		expect(warningLine(a, 'en')).toContain('only `m-auto`');
	});

	it('conserva la variante en el nombre y avisa una vez por clase', () => {
		const as = aviso('<div class="ts md:rotate-45 grayscale"></div>');
		expect(as.map((a) => a.params)).toMatchObject([{ class: 'md:rotate-45' }, { class: 'grayscale' }]);
	});

	it.each([
		['!p-4', 'p-4'],
		['p-4!', 'p-4'],
		['hover:!p-4', 'hover:p-4'],
		['md:flex!', 'md:flex'],
	])('%s (importante de Tailwind) avisa y propone la clase sin el !', (clase, sugerida) => {
		const [a] = aviso(`<div class="ts ${clase}"></div>`);
		expect(a).toMatchObject({ code: 'important-class', rule: 'unknown-class', severity: 'warning', suggestion: sugerida, params: { class: clase, suggestion: sugerida } });
		expect(warningLine(a, 'es')).toContain(`"${clase}" no se emite: el modificador importante`);
		expect(warningLine(a, 'es')).toContain(`¿Se quiso decir "${sugerida}"?`);
		expect(warningLine(a, 'en')).toContain(`Did you mean "${sugerida}"?`);
	});

	it('lo que ya avisaba sigue igual (la sugerencia del mapa gana al motivo)', () => {
		expect(avisos('a.html', '<div class="ts shrink-0"></div>')).toEqual(['a.html:1: "shrink-0" no existe en el DS y no se emite. ¿Se quiso decir "flex-shrink-0"?']);
	});

	it('las clases propias parecidas a las de Tailwind no avisan, ni sin la llave `ts`', () => {
		expect(avisos('a.html', '<div class="ts text-muted flex-item grid-item rotate-card"></div>')).toEqual([]);
		expect(avisos('a.html', '<div class="rotate-45 grayscale !p-4"></div>')).toEqual([]);
	});

	it('una utilidad propia con el nombre de una de Tailwind cuenta como válida', () => {
		const v = derivarVocabulario({ ...config, utilities: { grayscale: ['flex'], 'border-dashed': ['flex'] } });
		expect(avisosDeMarkup([{ file: 'a.html', content: '<div class="ts grayscale border-dashed"></div>' }], v)).toEqual([]);
	});
});

describe('regla opcional other-scale: medidas con el nombre de otro framework y otro valor', () => {
	const conRegla = (content: string) => avisosEstructuradosDeMarkup([{ file: 'a.html', content }], vocabulario, { otherScale: true });

	it('apagada por defecto: p-4 es una clase válida y no avisa', () => {
		expect(avisos('a.html', '<div class="ts p-4 w-64 gap-4"></div>')).toEqual([]);
		expect(avisosEstructuradosDeMarkup([{ file: 'a.html', content: '<div class="ts p-4"></div>' }], vocabulario, {})).toEqual([]);
	});

	it.each([
		['p-4', 4, 16, 'p-16'],
		['w-64', 64, 256, 'w-256'],
		['gap-4', 4, 16, 'gap-16'],
		['p-6', 6, 24, 'p-24'],
		['mt-8', 8, 32, 'mt-32'],
		['max-w-24', 24, 96, 'max-w-96'],
	])('%s avisa el valor real, el del otro framework y el equivalente del mapa', (clase, px, otherPx, equivalent) => {
		const [a, ...resto] = conRegla(`<div class="ts ${clase}"></div>`);
		expect(resto).toEqual([]);
		expect(a).toMatchObject({ code: 'other-scale', rule: 'other-scale', severity: 'warning', params: { class: clase, px, otherPx, equivalent } });
		expect(a.suggestion).toBeUndefined();
		expect(warningLine(a, 'es')).toBe(`a.html:1: "${clase}" vale ${px} px en TaishoDS; el mismo número vale ${otherPx} px en otro framework. Para ${otherPx} px se escribe "${equivalent}".`);
		expect(warningLine(a, 'en')).toBe(`a.html:1: "${clase}" is ${px} px in TaishoDS; the same number is ${otherPx} px in another framework. For ${otherPx} px, write "${equivalent}".`);
	});

	it('un paso sin equivalente en la escala (w-96 son 384 px) avisa igual, sin proponer nada', () => {
		const [a] = conRegla('<div class="ts w-96"></div>');
		expect(a).toMatchObject({ code: 'other-scale', params: { class: 'w-96', px: 96, otherPx: 384 } });
		expect(a.params).not.toHaveProperty('equivalent');
		expect(warningLine(a, 'es')).toContain('No hay una clase de 384 px con ese prefijo.');
		expect(warningLine(a, 'en')).toContain('There is no 384 px class with that prefix.');
	});

	it('conserva la variante y cuenta una vez por clase', () => {
		const as = conRegla('<div class="ts md:p-4 hover:w-64 p-2"></div>');
		expect(as.map((a) => a.params)).toMatchObject([{ class: 'md:p-4' }, { class: 'hover:w-64' }, { class: 'p-2' }]);
	});

	it('los nombres que no son medidas pero cambian de valor (blur-sm, leading-10) avisan sin px', () => {
		const [a] = conRegla('<div class="ts blur-sm"></div>');
		expect(a).toMatchObject({ code: 'other-scale', params: { class: 'blur-sm', equivalent: 'blur-md' } });
		expect(a.params).not.toHaveProperty('px');
		expect(warningLine(a, 'es')).toBe('a.html:1: "blur-sm" existe en TaishoDS pero no vale lo mismo que en otro framework. El equivalente es "blur-md".');
		expect(warningLine(a, 'en')).toContain('The equivalent is "blur-md".');
	});

	it('no avisa lo que vale igual en los dos (p-0), las palabras de ritmo ni lo que no es una medida', () => {
		expect(conRegla('<div class="ts p-0 p-base gap-half flex w-full w-1/2 md:grid-cols-3 radius-lg"></div>')).toEqual([]);
	});

	it('sólo los elementos con la llave `ts`: sin ella la clase la pinta el otro framework', () => {
		expect(conRegla('<div class="p-4 w-64"></div>').filter((a) => a.code === 'other-scale')).toEqual([]);
	});

	it('no pisa los avisos de siempre: una clase inexistente sigue siendo unknown-class', () => {
		expect(conRegla('<div class="ts p-45"></div>').map((a) => a.code)).toEqual(['unknown-class']);
	});
});
