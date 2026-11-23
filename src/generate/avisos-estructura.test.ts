// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { avisosDeEstructura, elementosDe, type EstructuraDeclarada } from './avisos-estructura';
import { avisosDeCheck } from './avisos-check';
import { warningLine } from '../generate-cli/mensajes-avisos';
import type { TaishoConfig } from './vocabulary';

const config: TaishoConfig = {
	themes: { principal: { colors: { brand: '#4F46E5' } } },
	fontFaces: [],
	defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' },
};
const numero: EstructuraDeclarada = {
	component: 'number-input',
	raiz: 'data-ts-number',
	clase: 'number-input',
	piezas: [{ atributo: 'data-ts-number-field', en: 'input' }, { atributo: 'data-ts-number-step', clase: 'number-input-step', en: 'button' }],
};
const caja: EstructuraDeclarada = { component: 'caja', raiz: 'data-ts-caja', piezas: [{ atributo: 'data-ts-caja-pieza' }, { atributo: 'data-ts-caja-otra', en: 'span' }] };
const avisar = (file: string, content: string, estructuras = [numero, caja]) => avisosDeEstructura([{ file, content }], estructuras);
const lineas = (file: string, content: string) => avisar(file, content).map((a) => warningLine(a, 'es'));
const reglas = (file: string, content: string) => avisar(file, content).map((a) => a.rule);

describe('elementosDe', () => {
	it('empareja aperturas y cierres, y deja fuera las vacías y las que se cierran solas', () => {
		const e = elementosDe('<div a="1"><input type="text"><br><img src="x"/><span>t</span></div><p>fin</p>');
		expect(e.map((x) => [x.nombre, x.padre, x.cerrado])).toEqual([['div', -1, true], ['input', 0, false], ['br', 0, false], ['img', 0, false], ['span', 0, true], ['p', -1, true]]);
	});
	it('un cierre de un ancestro cierra de paso lo que quedó abierto (`<li>` sin cierre)', () => {
		const e = elementosDe('<ul><li>a<li>b</ul>');
		expect(e.map((x) => [x.nombre, x.cerrado])).toEqual([['ul', true], ['li', false], ['li', false]]);
		expect(e[1].finContenido).toBe(e[0].finContenido);
	});
	it('lee atributos con comillas, llaves, sin valor y expansiones; un `>` dentro de un valor no corta la etiqueta', () => {
		const [e] = elementosDe(`<div a="x>y" b='z' c d={f(a > b)} {...rest} data-x=1>`);
		expect([...e.atributos]).toEqual([['a', 'x>y'], ['b', 'z'], ['c', null], ['d', '{f(a > b)}'], ['{...', null], ['data-x', '1']]);
	});
	it('en jsx un `<` pegado a una palabra es un tipo, no una etiqueta', () => {
		expect(elementosDe('const [a] = useState<string>(); <div></div>', true).map((x) => x.nombre)).toEqual(['div']);
	});
});

describe('missing-part', () => {
	it('un NumberInput sin su campo avisa, en español, con la etiqueta donde va', () => {
		expect(lineas('a.html', '<div class="ts number-input" data-ts-number><button data-ts-number-step="1"></button></div>')).toEqual([
			'a.html:1: "number-input" (data-ts-number) no tiene ningún elemento con `data-ts-number-field` adentro. Va en su <input>; sin él, el JS del Core no hace nada con el componente.',
		]);
	});
	it('en inglés, y sin etiqueta se omite «Va en su <…>»', () => {
		const [a, b] = avisar('a.html', '<div data-ts-number></div>\n<div data-ts-caja></div>');
		expect(warningLine(a, 'en')).toBe("a.html:1: \"number-input\" (data-ts-number) has no element with `data-ts-number-field` inside it. It goes on its <input>; without it, the Core's JS does nothing with the component.");
		expect(a.params).toEqual({ component: 'number-input', root: 'data-ts-number', attribute: 'data-ts-number-field', element: 'input' });
		expect(warningLine(b, 'es')).toBe('a.html:2: "caja" (data-ts-caja) no tiene ningún elemento con `data-ts-caja-pieza` adentro. Sin él, el JS del Core no hace nada con el componente.');
		expect(warningLine(b, 'en')).toBe("a.html:2: \"caja\" (data-ts-caja) has no element with `data-ts-caja-pieza` inside it. Without it, the Core's JS does nothing with the component.");
		expect(b.params).toEqual({ component: 'caja', root: 'data-ts-caja', attribute: 'data-ts-caja-pieza' });
	});
	it('con la pieza adentro no avisa, a cualquier profundidad', () => {
		expect(reglas('a.html', '<div data-ts-number><div><label><input data-ts-number-field></label></div></div>')).toEqual([]);
	});
	it('avisa una vez por pieza que falta, severidad error', () => {
		const avisos = avisar('a.html', '<div data-ts-caja><i data-ts-caja-otra></i></div><div data-ts-caja></div>');
		expect(avisos.map((a) => [a.params, a.severity, a.line])).toEqual([
			[{ component: 'caja', root: 'data-ts-caja', attribute: 'data-ts-caja-pieza' }, 'error', 1],
			[{ component: 'caja', root: 'data-ts-caja', attribute: 'data-ts-caja-pieza' }, 'error', 1],
			[{ component: 'caja', root: 'data-ts-caja', attribute: 'data-ts-caja-otra', element: 'span' }, 'error', 1],
		]);
	});
	it('cuenta la raíz más cercana: una pieza de la raíz anidada no es de la de afuera', () => {
		const html = '<div data-ts-caja id="afuera"><div data-ts-caja id="adentro"><b data-ts-caja-pieza></b><i data-ts-caja-otra></i></div></div>';
		const avisos = avisar('a.html', html);
		expect(avisos.map((a) => [(a.params as { component: string }).component, (a.params as { attribute: string }).attribute, a.column])).toEqual([
			['caja', 'data-ts-caja-pieza', 1],
			['caja', 'data-ts-caja-otra', 1],
		]);
	});
	it('un date-picker con su campo numérico adentro: la raíz numérica sin campo avisa, la del date-picker no', () => {
		const picker: EstructuraDeclarada = { component: 'date-picker', raiz: 'data-ts-date-picker', clase: 'calendar', piezas: [] };
		const html = '<div class="ts calendar" data-ts-date-picker><div class="ts number-input" data-ts-number></div></div>';
		expect(avisar('a.html', html, [picker, numero]).map((a) => (a.params as { component: string }).component)).toEqual(['number-input']);
	});
	it('una pieza en la raíz misma, o fuera de ella, no cuenta', () => {
		expect(reglas('a.html', '<div data-ts-number data-ts-number-field></div><input data-ts-number-field>')).toEqual(['missing-part']);
	});
	it('las etiquetas vacías y las que se cierran solas no rompen el emparejamiento', () => {
		expect(reglas('a.html', '<div data-ts-number><input><br><img src="x"/><input data-ts-number-field></div>')).toEqual([]);
		expect(reglas('a.html', '<div data-ts-number><input><br></div><input data-ts-number-field>')).toEqual(['missing-part']);
	});
	it('una raíz sin cerrar en .html llega hasta donde cierra su padre', () => {
		expect(reglas('a.html', '<section><div data-ts-number></section><input data-ts-number-field>')).toEqual(['missing-part']);
	});

	describe('en los demás archivos sólo se avisa cuando se sabe qué hay adentro', () => {
		const sinCampo = '<div data-ts-number><button>x</button></div>';
		it.each(['svelte', 'vue', 'jsx', 'tsx', 'astro'])('avisa en .%s con la raíz y su cierre en el archivo', (ext) => {
			expect(reglas(`a.${ext}`, sinCampo)).toEqual(['missing-part']);
		});
		it('con la pieza no avisa', () => {
			expect(reglas('a.svelte', '<div data-ts-number><input data-ts-number-field /></div>')).toEqual([]);
		});
		it('el gancho raíz no escrito no avisa (un componente propio escribe `ts number-input` con su propio JS)', () => {
			expect(reglas('a.svelte', '<div class="ts number-input"><button>x</button></div>')).toEqual([]);
			expect(reglas('a.tsx', '<div className="ts number-input"></div>')).toEqual([]);
		});
		it('se calla si la raíz no cierra en el archivo', () => {
			expect(reglas('a.svelte', '<div data-ts-number><button>x</button>')).toEqual([]);
			expect(reglas('a.svelte', '<div data-ts-number />')).toEqual([]);
		});
		it.each([
			['un componente (mayúscula)', 'a.svelte', '<div data-ts-number><Boton /></div>'],
			['un componente con subpropiedad', 'a.svelte', '<div data-ts-number><Menu.Item /></div>'],
			['un componente con guion en Vue', 'a.vue', '<div data-ts-number><mi-campo /></div>'],
			['un <slot>', 'a.vue', '<div data-ts-number><slot /></div>'],
			['un <Slot>', 'a.astro', '<div data-ts-number><Slot /></div>'],
			['{@render', 'a.svelte', '<div data-ts-number>{@render children()}</div>'],
			['{children}', 'a.svelte', '<div data-ts-number>{children}</div>'],
			['{props.children}', 'a.tsx', '<div data-ts-number>{props.children}</div>'],
			['una expansión {...x}', 'a.svelte', '<div data-ts-number><span {...rest}></span></div>'],
			['una expansión en la raíz', 'a.jsx', '<div data-ts-number>{...x}</div>'],
			['v-bind="obj"', 'a.vue', '<div data-ts-number><input v-bind="attrs" /></div>'],
			['HTML inyectado', 'a.svelte', '<div data-ts-number>{@html cuerpo}</div>'],
			['la raíz es un componente', 'a.svelte', '<Campo data-ts-number></Campo>'],
		])('se calla con %s', (_caso, archivo, contenido) => {
			expect(reglas(archivo, contenido)).toEqual([]);
		});
		it('un componente en otra parte del archivo no la calla', () => {
			expect(reglas('a.svelte', '<Boton /><div data-ts-number></div>')).toEqual(['missing-part']);
		});
		it('la etiqueta con llaves y un `>` dentro de una expresión se lee entera', () => {
			expect(reglas('a.svelte', '<div class={a > b ? "x" : "y"} data-ts-number><input data-ts-number-field /></div>')).toEqual([]);
		});
		it('el marcado en <script>, <style> y comentarios no cuenta', () => {
			expect(reglas('a.svelte', '<script>const t = "<div data-ts-number></div>";</script><!-- <div data-ts-number></div> -->')).toEqual([]);
		});
	});

	it('otros tipos de archivo no se miran', () => {
		expect(reglas('a.css', '<div data-ts-number></div>')).toEqual([]);
		expect(reglas('a.ts', '<div data-ts-number></div>')).toEqual([]);
	});
});

describe('missing-part-attribute (la pieza con clase)', () => {
	const campo = '<input data-ts-number-field>';
	it('un botón con la clase y sin el atributo avisa, en español e inglés', () => {
		const [a, ...resto] = avisar('a.html', `<div data-ts-number>\n<button class="ts button number-input-step"></button>${campo}</div>`);
		expect(resto).toEqual([]);
		expect([a.rule, a.code, a.severity, a.line]).toEqual(['missing-part', 'missing-part-attribute', 'error', 2]);
		expect(a.params).toEqual({ component: 'number-input', root: 'data-ts-number', attribute: 'data-ts-number-step', class: 'number-input-step', element: 'button' });
		expect(warningLine(a, 'es')).toBe('a.html:2: "number-input" (data-ts-number): el <button> con la clase "number-input-step" no tiene `data-ts-number-step`; sin él, el botón no hace nada.');
		expect(warningLine(a, 'en')).toBe('a.html:2: "number-input" (data-ts-number): the <button> with the "number-input-step" class has no `data-ts-number-step`; without it, the button does nothing.');
	});
	it('sin botones no avisa: la pieza con clase no es obligatoria', () => {
		expect(reglas('a.html', `<div data-ts-number>${campo}</div>`)).toEqual([]);
	});
	it('con el atributo no avisa', () => {
		expect(reglas('a.html', `<div data-ts-number><button class="number-input-step" data-ts-number-step="-1"></button>${campo}</div>`)).toEqual([]);
	});
	it('avisa cada botón que le falta, y no el de otra raíz anidada', () => {
		const html = `<div data-ts-number><button class="number-input-step"></button><button class="number-input-step" data-ts-number-step="1"></button><div data-ts-number><button class="number-input-step" data-ts-number-step="1"></button><input data-ts-number-field></div>${campo}</div>`;
		expect(avisar('a.html', html).map((a) => [a.code, a.column])).toEqual([['missing-part-attribute', 21]]);
	});
	it('fuera de la raíz no se mira', () => {
		expect(reglas('a.html', `<button class="number-input-step"></button><div data-ts-number>${campo}</div>`)).toEqual([]);
	});
	it('mismo alcance por tipo de archivo: se calla donde no se sabe qué hay adentro', () => {
		const mal = `<div data-ts-number><button class="number-input-step"></button>${campo}</div>`;
		for (const ext of ['html', 'svelte', 'vue', 'jsx', 'tsx', 'astro']) expect(reglas(`a.${ext}`, mal)).toEqual(['missing-part']);
		expect(reglas('a.svelte', `<div data-ts-number><Boton class="number-input-step" />${campo}</div>`)).toEqual([]);
		expect(reglas('a.svelte', `<div data-ts-number><button class="number-input-step"></button>{@render children()}</div>`)).toEqual([]);
		expect(reglas('a.svelte', `<div data-ts-number {...rest}><button class="number-input-step" {...otros}></button></div>`)).toEqual([]);
	});
});

describe('missing-root-attribute', () => {
	it('un elemento con `ts` y la clase raíz pero sin el gancho avisa, en español e inglés', () => {
		const [a] = avisar('a.html', '<p>x</p>\n<div class="ts number-input size-md"><input></div>');
		expect(a.rule).toBe('missing-root-attribute');
		expect(a.severity).toBe('error');
		expect(a.params).toEqual({ component: 'number-input', class: 'number-input', attribute: 'data-ts-number', element: 'div' });
		expect(warningLine(a, 'es')).toBe('a.html:2: <div> tiene la clase "number-input" pero no `data-ts-number`: el JS del Core no lo encuentra y el componente se ve pero no responde.');
		expect(warningLine(a, 'en')).toBe("a.html:2: <div> has the \"number-input\" class but not `data-ts-number`, so the Core's JS never finds it: the component renders but doesn't respond.");
	});
	it('con el gancho, sin `ts` o con otra clase no avisa', () => {
		expect(reglas('a.html', '<div class="ts number-input" data-ts-number><input data-ts-number-field></div>')).toEqual([]);
		expect(reglas('a.html', '<div class="number-input"></div>')).toEqual([]);
		expect(reglas('a.html', '<div class="ts number-input-field"></div>')).toEqual([]);
	});
	it('un elemento con una pieza de esa raíz (`ts collapsible` en un item del acordeón) no es la raíz', () => {
		const acordeon: EstructuraDeclarada = { component: 'collapsible', raiz: 'data-ts-accordion', clase: 'collapsible', piezas: [{ atributo: 'data-ts-accordion-item' }] };
		expect(avisar('a.html', '<details class="ts collapsible accordion-item" data-ts-accordion-item></details>', [acordeon])).toEqual([]);
		expect(avisar('a.html', '<details class="ts collapsible"></details>', [acordeon]).map((a) => a.rule)).toEqual(['missing-root-attribute']);
	});
	it('un componente sin clase raíz declarada no se mira', () => {
		expect(reglas('a.html', '<div class="ts caja"></div>')).toEqual([]);
	});
	it('sólo en .html y .htm: los demás archivos nunca', () => {
		for (const ext of ['svelte', 'vue', 'jsx', 'tsx', 'astro']) expect(reglas(`a.${ext}`, '<div class="ts number-input"></div>')).toEqual([]);
		expect(reglas('a.htm', '<div class="ts number-input"></div>')).toEqual(['missing-root-attribute']);
	});
});

describe('avisosDeCheck con la estructura del Core', () => {
	const check = (file: string, content: string) => avisosDeCheck([{ file, content }], config);
	it('un NumberInput sin `data-ts-number-field` ya no da «0 avisos»', () => {
		const avisos = check('a.html', '<div class="ts number-input size-md" data-ts-number><button class="ts button" data-ts-number-step="-1">-</button><input type="text"></div>');
		expect(avisos.map((a) => [a.rule, a.code, a.severity])).toEqual([['missing-part', 'missing-part', 'error']]);
	});
	it('las piezas que faltan de una misma raíz salen todas', () => {
		const avisos = check('a.html', '<details class="ts accordion" data-ts-accordion></details>');
		expect(avisos.flatMap((a) => (a.code === 'missing-part' ? [a.params.attribute] : []))).toEqual(['data-ts-accordion-item', 'data-ts-accordion-trigger']);
	});
	it('la raíz sin gancho en .html, y no en .svelte', () => {
		expect(check('a.html', '<div class="ts number-input"><input></div>').map((a) => a.code)).toEqual(['missing-root-attribute']);
		expect(check('a.svelte', '<div class="ts number-input"><input></div>')).toEqual([]);
	});
});

describe('los ejemplos del Core pasan check', () => {
	const RAIZ = path.resolve(__dirname, '../core-datos');
	const ejemplos: { file: string; content: string }[] = [];
	for (const f of fs.readdirSync(path.join(RAIZ, 'html'))) ejemplos.push({ file: `html/${f}`, content: fs.readFileSync(path.join(RAIZ, 'html', f), 'utf8') });
	for (const idioma of fs.readdirSync(path.join(RAIZ, 'ejemplos'))) {
		for (const f of fs.readdirSync(path.join(RAIZ, 'ejemplos', idioma))) {
			const casos: { titulo: string; html: string }[] = JSON.parse(fs.readFileSync(path.join(RAIZ, 'ejemplos', idioma, f), 'utf8'));
			casos.forEach((c, i) => ejemplos.push({ file: `ejemplos/${idioma}/${f.replace(/\.json$/, '')}-${i}.html`, content: c.html }));
		}
	}
	it('hay ejemplos que revisar', () => expect(ejemplos.length).toBeGreaterThan(100));
	it('ninguno trae `missing-part` ni `missing-root-attribute`', () => {
		const avisos = avisosDeCheck(ejemplos, config).filter((a) => a.rule === 'missing-part' || a.rule === 'missing-root-attribute');
		expect(avisos.map((a) => warningLine(a, 'es'))).toEqual([]);
	});
});

describe('raíces compartidas, piezas alternativas y condicionales (con el contrato real)', () => {
	const select = (extra: string, adentro: string) => `<div class="ts select" data-ts-listbox="select"${extra}>${adentro}</div>`;
	const PANEL = '<div data-ts-listbox-panel=""></div>';
	const TRIGGER = '<button data-ts-listbox-trigger=""></button>';
	const delCore = (content: string) => avisosDeCheck([{ file: 'a.html', content }], config).filter((a) => a.rule === 'missing-part').map((a) => { const p = a.params as { component: string; attribute: string }; return `${p.component} ${p.attribute}`; });

	it('un Select sin su disparador avisa; con disparador y panel, no', () => {
		expect(delCore(select('', PANEL))).toEqual(['select data-ts-listbox-trigger']);
		expect(delCore(select('', TRIGGER + PANEL))).toEqual([]);
		expect(delCore(`<div class="ts select" data-ts-listbox="">${PANEL}</div>`)).toEqual(['select data-ts-listbox-trigger']);
	});
	it('un Combobox y un Command Palette comparten `data-ts-listbox` y no se les pide el disparador del Select', () => {
		const combo = `<div class="ts combobox" data-ts-listbox="combobox" data-ts-combobox=""><input data-ts-listbox-input="">${PANEL}</div>`;
		expect(delCore(combo)).toEqual([]);
		expect(delCore(`<div class="ts combobox" data-ts-listbox="combobox" data-ts-combobox=""><input data-ts-listbox-input=""></div>`)).toEqual(['combobox data-ts-listbox-panel']);
		const paleta = `<div data-ts-command-palette=""><dialog data-ts-command-dialog=""><div data-ts-listbox="command"><input data-ts-listbox-input="">${PANEL}</div></dialog></div>`;
		expect(delCore(paleta)).toEqual([]);
	});
	it('el DatePicker acepta la grilla de un mes o la de varios, y sin ninguna avisa', () => {
		expect(delCore('<div class="ts calendar" data-ts-date-picker=""><div data-ts-date-grid=""></div></div>')).toEqual([]);
		expect(delCore('<div class="ts calendar" data-ts-date-picker=""><div data-ts-date-months=""></div></div>')).toEqual([]);
		expect(delCore('<div class="ts calendar" data-ts-date-picker=""><div data-ts-date-title=""></div></div>')).toEqual(['date-picker data-ts-date-grid']);
	});
	it('el riel del Slider sólo se pide en el de rango', () => {
		expect(delCore('<div class="ts slider" data-ts-slider=""><input type="range"></div>')).toEqual([]);
		expect(delCore('<div class="ts slider" data-ts-slider="" data-ts-slider-range=""><input type="range"><input type="range"></div>')).toEqual(['slider data-ts-slider-rail']);
		expect(delCore('<div class="ts slider" data-ts-slider="" data-ts-slider-range=""><div data-ts-slider-rail=""><input type="range"><input type="range"></div></div>')).toEqual([]);
	});
});
