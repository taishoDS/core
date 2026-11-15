// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getByRole } from '@testing-library/dom';
import { init, toast, updateToast, clearToasts, setButtonLoading, setComboboxLoading, setSelectLoading } from './index';

function montar(html: string): HTMLElement {
    document.body.innerHTML = html;
    init(document);
    return document.body.firstElementChild as HTMLElement;
}
const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const qq = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
const tecla = (el: Element, key: string) =>
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

beforeEach(() => {
    document.body.innerHTML = '';
    clearToasts();
});

const SELECT = `
<div data-ts-listbox="select" data-ts-select>
  <button data-ts-listbox-trigger role="combobox" aria-expanded="false" aria-controls="p">
    <span data-ts-listbox-label data-ts-placeholder="Elegí…">Elegí…</span>
  </button>
  <input type="hidden" data-ts-listbox-value name="pais">
  <div id="p" data-ts-listbox-panel role="listbox" hidden>
    <div role="option" data-ts-value="ar" aria-selected="false">Argentina</div>
    <div role="option" data-ts-value="br" aria-selected="false">Brasil</div>
    <div role="option" data-ts-value="cl" aria-selected="false" aria-disabled="true">Chile</div>
  </div>
</div>`;

describe('Select', () => {
    it('abre al click y activa una opción de arranque', () => {
        montar(SELECT);
        q('[data-ts-listbox-trigger]').click();

        expect(q('#p').hidden).toBe(false);
        expect(q('[data-ts-listbox-trigger]').getAttribute('aria-expanded')).toBe('true');
        expect(q('[data-ts-listbox-trigger]').getAttribute('aria-activedescendant')).toBeTruthy();
    });

    it('usa aria-activedescendant y NO mueve el foco: el trigger lo conserva', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.focus();
        trigger.click();
        tecla(trigger, 'ArrowDown');

        expect(document.activeElement).toBe(trigger);
        const activa = q(`#${trigger.getAttribute('aria-activedescendant')}`);
        expect(activa.textContent).toBe('Brasil');
    });

    it('saltea las opciones deshabilitadas al navegar', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        tecla(trigger, 'End');

        expect(q(`#${trigger.getAttribute('aria-activedescendant')}`).textContent).toBe('Brasil');
    });

    it('selecciona con Enter, cierra y refleja la etiqueta', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        tecla(trigger, 'ArrowDown');
        tecla(trigger, 'Enter');

        expect(q('[data-ts-listbox-label]').textContent).toBe('Brasil');
        expect(q('#p').hidden).toBe(true);
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('br');
    });

    it('type-ahead: tipear salta a la opción que empieza así', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        tecla(trigger, 'b');

        expect(q(`#${trigger.getAttribute('aria-activedescendant')}`).textContent).toBe('Brasil');
    });

    it('en modo múltiple NO cierra al elegir', () => {
        montar(
            SELECT.replace('data-ts-select>', 'data-ts-select data-ts-multiple>').replace(
                '<input type="hidden" data-ts-listbox-value name="pais">',
                '<input type="hidden" disabled data-ts-listbox-template name="pais">',
            ),
        );
        q('[data-ts-listbox-trigger]').click();
        qq('[role="option"]')[0].click();
        qq('[role="option"]')[1].click();

        expect(q('#p').hidden).toBe(false);
        expect((qq('[data-ts-listbox-value]') as HTMLInputElement[]).map((c) => [c.name, c.value])).toEqual([
            ['pais', 'ar'],
            ['pais', 'br'],
        ]);
    });

    it('Escape cierra y devuelve el foco al trigger', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        tecla(trigger, 'Escape');

        expect(q('#p').hidden).toBe(true);
        expect(document.activeElement).toBe(trigger);
    });

    it('un click afuera cierra el panel', () => {
        montar(`<div><div id="afuera">otro</div>${SELECT}</div>`);
        q('[data-ts-listbox-trigger]').click();
        expect(q('#p').hidden).toBe(false);

        q('#afuera').click();
        expect(q('#p').hidden).toBe(true);
    });
});

describe('Select: Home y End, Tab y etiqueta', () => {
    const activa = (t: HTMLElement) => q(`#${t.getAttribute('aria-activedescendant')}`).textContent;

    it('Home y End llevan a la primera y a la última opción navegable', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        tecla(trigger, 'End');
        expect(activa(trigger)).toBe('Brasil');
        tecla(trigger, 'Home');
        expect(activa(trigger)).toBe('Argentina');
    });

    it('Tab con el panel abierto lo cierra y no consume la tecla (el foco sigue su camino)', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        expect(tecla(trigger, 'Tab')).toBe(true);
        expect(q('#p').hidden).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('elegir quita is-placeholder del disparador y limpiar lo devuelve', () => {
        montar(SELECT.replace('<button data-ts-listbox-trigger', '<button data-ts-listbox-trigger class="is-placeholder"'));
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        tecla(trigger, 'ArrowDown');
        tecla(trigger, 'Enter');
        expect(trigger.classList.contains('is-placeholder')).toBe(false);
        expect(q('[data-ts-listbox-label]').textContent).toBe('Brasil');
    });

    it('en múltiple el texto es el contador ("2 seleccionados"), con el sufijo del markup', () => {
        montar(
            SELECT.replace('data-ts-select>', 'data-ts-select data-ts-multiple>').replace(
                'data-ts-placeholder="Elegí…"',
                'data-ts-placeholder="Elegí…" data-ts-count-suffix="elegidos"',
            ),
        );
        q('[data-ts-listbox-trigger]').click();
        qq('[role="option"]')[0].click();
        expect(q('[data-ts-listbox-label]').textContent).toBe('Argentina');
        qq('[role="option"]')[1].click();
        expect(q('[data-ts-listbox-label]').textContent).toBe('2 elegidos');
        qq('[role="option"]')[1].click();
        qq('[role="option"]')[0].click();
        expect(q('[data-ts-listbox-label]').textContent).toBe('Elegí…');
        expect(q('[data-ts-listbox-trigger]').classList.contains('is-placeholder')).toBe(true);
    });
});

describe('Select: readonly', () => {
    const RO = SELECT.replace('<button data-ts-listbox-trigger', '<button data-ts-listbox-trigger aria-readonly="true"');

    it('no abre con click ni con teclado, pero conserva el foco', () => {
        montar(RO);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.focus();
        trigger.click();
        tecla(trigger, 'Enter');
        tecla(trigger, 'ArrowDown');
        expect(q('#p').hidden).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(trigger);
    });

    it('el botón de limpiar queda oculto y no limpia', () => {
        montar(
            RO.replace('<input type="hidden"', '<button type="button" data-ts-clear>x</button><input type="hidden"').replace(
                'aria-selected="false">Brasil',
                'aria-selected="true">Brasil',
            ),
        );
        q('[data-ts-clear]').click();
        expect(q('[role="option"][aria-selected="true"]').textContent).toBe('Brasil');
    });
});

describe('Select: loading', () => {
    const CARGA = SELECT.replace(
        '<input type="hidden"',
        '<span data-ts-listbox-spinner hidden></span><input type="hidden"',
    ).replace('<div role="option" data-ts-value="ar"', '<div data-ts-listbox-loading hidden>Cargando…</div><div role="option" data-ts-value="ar"');

    it('cargando(raiz, true) pone aria-busy, is-loading, el Spinner y "Cargando…" sin esconder las opciones', () => {
        montar(CARGA);
        const raiz = q('[data-ts-select]');
        setSelectLoading(raiz, true);
        expect(q('[data-ts-listbox-trigger]').getAttribute('aria-busy')).toBe('true');
        expect(q('#p').getAttribute('aria-busy')).toBe('true');
        expect(raiz.classList.contains('is-loading')).toBe(true);
        expect(q('[data-ts-listbox-spinner]').hidden).toBe(false);
        expect(q('[data-ts-listbox-loading]').hidden).toBe(false);
        expect(qq('[role="option"]').every((o) => !o.hidden)).toBe(true);
    });

    it('cargando(raiz, false) lo deshace', () => {
        montar(CARGA);
        const raiz = q('[data-ts-select]');
        setSelectLoading(raiz, true);
        setSelectLoading(raiz, false);
        expect(q('[data-ts-listbox-trigger]').hasAttribute('aria-busy')).toBe(false);
        expect(raiz.classList.contains('is-loading')).toBe(false);
        expect(q('[data-ts-listbox-spinner]').hidden).toBe(true);
        expect(q('[data-ts-listbox-loading]').hidden).toBe(true);
    });
});

describe('Select: opciones ricas', () => {
    const RICA = SELECT.replace(
        '<div role="option" data-ts-value="ar" aria-selected="false">Argentina</div>',
        `<div role="option" data-ts-value="ar" aria-selected="false" aria-labelledby="l0" aria-describedby="d0">
           <span data-select-option-text><span id="l0" data-select-option-label>Argentina</span><span id="d0" data-select-option-description>Cono sur</span></span>
         </div>`,
    );

    it('la etiqueta del disparador y el type-ahead usan el label, no la descripción', () => {
        montar(RICA);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        tecla(trigger, 'a');
        expect(trigger.getAttribute('aria-activedescendant')).toBe(qq('[role="option"]')[0].id);
        tecla(trigger, 'Enter');
        expect(q('[data-ts-listbox-label]').textContent).toBe('Argentina');
    });
});

describe('Opción activa por teclado: marca común', () => {
    it('Select: la opción de aria-activedescendant lleva is-focused y sólo ella', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.focus();
        trigger.click();
        tecla(trigger, 'ArrowDown');

        const marcadas = qq('[role="option"].is-focused');
        expect(marcadas).toHaveLength(1);
        expect(marcadas[0].id).toBe(trigger.getAttribute('aria-activedescendant'));
        expect(qq('[role="option"].is-active')).toHaveLength(0);
    });
});

describe('Combobox', () => {
    const HTML = SELECT.replace('data-ts-select>', 'data-ts-combobox>')
        .replace(
            /<button data-ts-listbox-trigger[\s\S]*?<\/button>/,
            '<input data-ts-listbox-input aria-expanded="false" aria-controls="p">',
        );

    it('filtra mientras se tipea', () => {
        montar(HTML);
        const input = q<HTMLInputElement>('[data-ts-listbox-input]');
        input.value = 'bra';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(qq('[role="option"]').filter((o) => !o.hidden).map((o) => o.textContent)).toEqual(['Brasil']);
    });

    it('tipear NO hace type-ahead: en un combobox lo que se tipea filtra', () => {
        montar(HTML);
        const input = q<HTMLInputElement>('[data-ts-listbox-input]');
        input.click();
        tecla(input, 'b');

        expect(qq('[role="option"]').every((o) => !o.hidden)).toBe(true);
    });
});

describe('Combobox: comportamiento', () => {
    const CB = `
<div>
<button id="otro">otro</button>
<div data-ts-listbox="combobox" data-ts-combobox>
  <input id="c" data-ts-listbox-input role="combobox" aria-expanded="false" aria-controls="p" autocomplete="off">
  <input type="hidden" name="pais" value="" data-ts-listbox-value>
  <div id="p" data-ts-listbox-panel role="listbox" popover="manual" hidden>
    <button type="button" role="option" id="p-0" tabindex="-1" data-ts-value="ar" aria-selected="false">Argentina</button>
    <button type="button" role="option" id="p-1" tabindex="-1" data-ts-value="br" aria-selected="false">Brasil</button>
    <button type="button" role="option" id="p-2" tabindex="-1" data-ts-value="uy" aria-selected="false">Uruguay</button>
    <div data-ts-listbox-empty hidden>Sin resultados</div>
  </div>
</div>
</div>`;
    const escribir = (input: HTMLInputElement, texto: string) => {
        input.value = texto;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const elegida = () => {
        montar(CB);
        const input = q<HTMLInputElement>('#c');
        input.focus();
        q('#p-1').click();
        return input;
    };
    const reabrir = (input: HTMLInputElement) => input.dispatchEvent(new Event('focusin', { bubbles: true }));

    it('abre al enfocar, con todas las opciones y la primera activa', () => {
        montar(CB);
        const input = q<HTMLInputElement>('#c');
        input.focus();
        expect(q('#p').hidden).toBe(false);
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(input.getAttribute('aria-activedescendant')).toBe('p-0');
    });

    it('con un valor elegido, abrir deja activa la elegida y Enter la mantiene; sin valor, la primera', () => {
        const input = elegida();
        input.blur();
        input.focus();
        expect(input.getAttribute('aria-activedescendant')).toBe('p-1');
        tecla(input, 'Enter');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('br');
        expect(input.value).toBe('Brasil');
    });

    it('filtrar activa la primera coincidencia aunque haya un valor elegido', () => {
        const input = elegida();
        reabrir(input);
        escribir(input, 'a');
        expect(input.getAttribute('aria-activedescendant')).toBe('p-0');
    });

    it('un click sobre el input ya abierto lo deja abierto', () => {
        montar(CB);
        const input = q<HTMLInputElement>('#c');
        input.focus();
        input.click();
        expect(q('#p').hidden).toBe(false);
    });

    it('Home/End no se interceptan: el cursor de texto se mueve y la activa no', () => {
        montar(CB);
        const input = q<HTMLInputElement>('#c');
        input.focus();
        expect(tecla(input, 'End')).toBe(true);
        expect(tecla(input, 'Home')).toBe(true);
        expect(input.getAttribute('aria-activedescendant')).toBe('p-0');
        expect(tecla(input, 'ArrowDown')).toBe(false);
        expect(input.getAttribute('aria-activedescendant')).toBe('p-1');
    });

    it('ArrowDown con el panel cerrado abre mostrando todo', () => {
        montar(CB);
        const input = q<HTMLInputElement>('#c');
        escribir(input, 'bra');
        tecla(input, 'Escape');
        expect(q('#p').hidden).toBe(true);
        tecla(input, 'ArrowDown');
        expect(q('#p').hidden).toBe(false);
        expect(qq('[role="option"]').every((o) => !o.hidden)).toBe(true);
    });

    it('elegir una opción confirma su value, cierra y deja el foco en el input', () => {
        const input = elegida();
        expect(input.value).toBe('Brasil');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('br');
        expect(q('#p').hidden).toBe(true);
        expect(document.activeElement).toBe(input);
    });

    it('Escape revierte el texto al valor elegido y cierra', () => {
        const input = elegida();
        reabrir(input);
        escribir(input, 'xx');
        expect(tecla(input, 'Escape')).toBe(false);
        expect(input.value).toBe('Brasil');
        expect(q('#p').hidden).toBe(true);
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('br');
    });

    it('Escape con el panel cerrado no se consume', () => {
        montar(CB);
        expect(tecla(q('#c'), 'Escape')).toBe(true);
    });

    it('click afuera revierte el texto y cierra', () => {
        const input = elegida();
        reabrir(input);
        escribir(input, 'xx');
        q('#otro').click();
        expect(input.value).toBe('Brasil');
        expect(q('#p').hidden).toBe(true);
    });

    it('Tab sin coincidencia revierte y cierra, y no se consume', () => {
        const input = elegida();
        reabrir(input);
        escribir(input, 'xx');
        expect(tecla(input, 'Tab')).toBe(true);
        expect(input.value).toBe('Brasil');
        expect(q('#p').hidden).toBe(true);
    });

    it('Tab con texto que coincide lo confirma', () => {
        montar(CB);
        const input = q<HTMLInputElement>('#c');
        escribir(input, 'uruguay');
        tecla(input, 'Tab');
        expect(input.value).toBe('Uruguay');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('uy');
    });

    it('estricto: Enter sin coincidencia revierte y cierra el panel', () => {
        const input = elegida();
        reabrir(input);
        escribir(input, 'Chile');
        expect(qq('[role="option"]').every((o) => o.hidden)).toBe(true);
        tecla(input, 'Enter');
        expect(input.value).toBe('Brasil');
        expect(q('#p').hidden).toBe(true);
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('Enter con una opción activa la elige y se consume', () => {
        montar(CB);
        const input = q<HTMLInputElement>('#c');
        escribir(input, 'uru');
        expect(tecla(input, 'Enter')).toBe(false);
        expect(input.value).toBe('Uruguay');
    });

    it('el campo vacío limpia la selección al confirmar', () => {
        const input = elegida();
        reabrir(input);
        escribir(input, '');
        tecla(input, 'Tab');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('');
        expect(qq('[aria-selected="true"]')).toHaveLength(0);
    });

    it('perder el foco confirma el texto tras la espera', () => {
        vi.useFakeTimers();
        const input = elegida();
        reabrir(input);
        escribir(input, 'xx');
        input.dispatchEvent(new Event('focusout', { bubbles: true }));
        expect(q('#p').hidden).toBe(false);
        vi.advanceTimersByTime(130);
        expect(input.value).toBe('Brasil');
        expect(q('#p').hidden).toBe(true);
        vi.useRealTimers();
    });

    it('sin coincidencias muestra "Sin resultados" y lo oculta al volver a haber', () => {
        montar(CB);
        const input = q<HTMLInputElement>('#c');
        escribir(input, 'zz');
        expect(q('[data-ts-listbox-empty]').hidden).toBe(false);
        escribir(input, 'bra');
        expect(q('[data-ts-listbox-empty]').hidden).toBe(true);
    });

    it('mouse: el pointerdown en una opción no roba el foco; touch se deja pasar', () => {
        montar(CB);
        const presionar = (pointerType: string) => {
            const e = new Event('pointerdown', { bubbles: true, cancelable: true });
            Object.defineProperty(e, 'pointerType', { value: pointerType });
            return q('#p-2').dispatchEvent(e);
        };
        expect(presionar('mouse')).toBe(false);
        expect(presionar('touch')).toBe(true);
    });

    it('el panel va al top-layer: abrir llama showPopover y cerrar hidePopover', () => {
        const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
        const show = vi.fn();
        const hide = vi.fn();
        proto.showPopover = show;
        proto.hidePopover = hide;
        try {
            montar(CB);
            const input = q<HTMLInputElement>('#c');
            input.focus();
            expect(show).toHaveBeenCalledTimes(1);
            tecla(input, 'Escape');
            expect(hide).toHaveBeenCalledTimes(1);
        } finally {
            delete proto.showPopover;
            delete proto.hidePopover;
        }
    });
});

describe('Menu', () => {
    const HTML = `
    <div data-ts-menu>
      <button data-ts-menu-trigger aria-haspopup="menu" aria-expanded="false">Acciones</button>
      <div data-ts-menu-panel role="menu" hidden>
        <button role="menuitem" data-ts-value="editar">Editar</button>
        <button role="menuitem" data-ts-value="borrar">Borrar</button>
      </div>
    </div>`;

    it('abre y mueve el FOCO real al primer ítem (a diferencia del listbox)', () => {
        montar(HTML);
        q('[data-ts-menu-trigger]').click();

        expect(q('[data-ts-menu-panel]').hidden).toBe(false);
        expect(document.activeElement).toBe(qq('[role="menuitem"]')[0]);
    });

    it('las flechas recorren los ítems', () => {
        montar(HTML);
        q('[data-ts-menu-trigger]').click();
        tecla(qq('[role="menuitem"]')[0], 'ArrowDown');

        expect(document.activeElement).toBe(qq('[role="menuitem"]')[1]);
    });

    it('elegir un ítem avisa y cierra', () => {
        const raiz = montar(HTML);
        const espia = vi.fn();
        raiz.addEventListener('ts:change', espia);
        q('[data-ts-menu-trigger]').click();
        qq('[role="menuitem"]')[1].click();

        expect(espia.mock.calls[0][0].detail.value).toBe('borrar');
        expect(q('[data-ts-menu-panel]').hidden).toBe(true);
    });

    it('elegir un ítem devuelve el foco al trigger; click afuera no se lo roba al destino', () => {
        montar(HTML + '<button id="afuera">Afuera</button>');
        q('[data-ts-menu-trigger]').click();
        qq('[role="menuitem"]')[1].click();
        expect(document.activeElement).toBe(q('[data-ts-menu-trigger]'));

        q('[data-ts-menu-trigger]').click();
        const afuera = q('#afuera');
        afuera.focus();
        afuera.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(q('[data-ts-menu-panel]').hidden).toBe(true);
        expect(document.activeElement).toBe(afuera);
    });

    it('Escape cierra y devuelve el foco al trigger', () => {
        montar(HTML);
        q('[data-ts-menu-trigger]').click();
        tecla(qq('[role="menuitem"]')[0], 'Escape');

        expect(q('[data-ts-menu-panel]').hidden).toBe(true);
        expect(document.activeElement).toBe(q('[data-ts-menu-trigger]'));
    });
});

describe('Menu — teclado', () => {
    const HTML = `
    <div data-ts-menu>
      <button data-ts-menu-trigger aria-haspopup="menu" aria-expanded="false">Acciones</button>
      <div data-ts-menu-panel role="menu" hidden>
        <button role="menuitem" tabindex="-1" data-ts-value="editar">Editar</button>
        <button role="menuitem" tabindex="-1" data-ts-value="borrar">Borrar</button>
      </div>
    </div>`;

    it('Tab cierra el menú, no devuelve el foco al trigger y no consume la tecla', () => {
        montar(HTML);
        q('[data-ts-menu-trigger]').click();
        const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        qq('[role="menuitem"]')[0].dispatchEvent(ev);

        expect(q('[data-ts-menu-panel]').hidden).toBe(true);
        expect(q('[data-ts-menu-trigger]').getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).not.toBe(q('[data-ts-menu-trigger]'));
        expect(ev.defaultPrevented).toBe(false);
    });

    it('ArrowLeft/ArrowRight no mueven el foco en un menú vertical', () => {
        montar(HTML);
        q('[data-ts-menu-trigger]').click();
        const [editar, borrar] = qq('[role="menuitem"]');
        tecla(editar, 'ArrowRight');
        expect(document.activeElement).toBe(editar);
        borrar.focus();
        tecla(borrar, 'ArrowRight');
        tecla(borrar, 'ArrowLeft');
        expect(document.activeElement).toBe(borrar);
    });
});

describe('ContextMenu — teclado', () => {
    const HTML = `
      <div data-ts-menu data-ts-context-menu>
        <div class="ts card" tabindex="0">Tarjeta</div>
        <div data-ts-menu-panel role="menu" hidden>
          <button role="menuitem" tabindex="-1" data-ts-value="copiar">Copiar</button>
          <button role="menuitem" tabindex="-1" data-ts-value="pegar">Pegar</button>
        </div>
      </div>`;

    it.each([
        ['Shift+F10', { key: 'F10', shiftKey: true }],
        ['tecla ContextMenu', { key: 'ContextMenu' }],
    ])('%s sobre el elemento enfocado lo abre con el primer ítem enfocado', (_n, init) => {
        montar(HTML);
        const tarjeta = q('.ts.card');
        tarjeta.focus();
        const ev = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
        tarjeta.dispatchEvent(ev);

        expect(q('[data-ts-menu-panel]').hidden).toBe(false);
        expect(document.activeElement).toBe(qq('[role="menuitem"]')[0]);
        expect(ev.defaultPrevented).toBe(true);
    });

    it('Escape devuelve el foco al elemento que lo tenía; Tab cierra sin devolverlo', () => {
        montar(HTML);
        const tarjeta = q('.ts.card');
        tarjeta.focus();
        tarjeta.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }));
        tecla(qq('[role="menuitem"]')[0], 'Escape');
        expect(q('[data-ts-menu-panel]').hidden).toBe(true);
        expect(document.activeElement).toBe(tarjeta);

        tarjeta.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true }));
        tecla(qq('[role="menuitem"]')[0], 'Tab');
        expect(q('[data-ts-menu-panel]').hidden).toBe(true);
        expect(document.activeElement).not.toBe(tarjeta);
    });

    it('Shift+F10 dentro del propio panel no lo reabre ni lo mueve', () => {
        montar(HTML);
        q('.ts.card').focus();
        q('.ts.card').dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true }));
        const ev = new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true });
        qq('[role="menuitem"]')[1].dispatchEvent(ev);
        expect(ev.defaultPrevented).toBe(false);
    });
});

describe('ContextMenu', () => {
    it('el click derecho lo abre y suprime el menú del navegador', () => {
        const raiz = montar(`
      <div data-ts-menu data-ts-context-menu>
        <div data-ts-menu-panel role="menu" hidden>
          <button role="menuitem" data-ts-value="copiar">Copiar</button>
        </div>
      </div>`);
        const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 20 });
        raiz.dispatchEvent(e);

        expect(q('[data-ts-menu-panel]').hidden).toBe(false);
        expect(e.defaultPrevented).toBe(true);
    });
});

describe('DatePicker', () => {
    const HTML = `
    <div data-ts-date-picker data-ts-locale="es-AR" data-ts-value="2026-07-07" data-ts-month="2026-07-01">
      <button data-ts-date-prev>‹</button><span data-ts-date-title></span><button data-ts-date-next>›</button>
      <div class="ts calendar-grid" role="grid">
        <div class="ts calendar-dow-row" role="row" data-ts-date-weekdays></div>
        <div data-ts-date-grid></div>
      </div>
    </div>`;

    it('dibuja la grilla del mes al inicializar', () => {
        montar(HTML);
        expect(qq('[data-ts-date-day]').length).toBeGreaterThanOrEqual(28);
        expect(q('[data-ts-date-title]').textContent?.toLowerCase()).toContain('julio');
    });

    it('marca la seleccionada y le da el único tabindex de la grilla', () => {
        montar(HTML);
        const sel = qq('[data-ts-date-day]').filter((d) => d.classList.contains('is-selected'));
        expect(sel).toHaveLength(1);
        expect(sel[0].textContent).toBe('7');
        expect(qq('[data-ts-date-day]').filter((d) => d.tabIndex === 0)).toHaveLength(1);
    });

    it('al hacer click en un día el foco queda en ese día aunque la grilla se redibuje', () => {
        montar(HTML);
        const dia = qq('[data-ts-date-day]').find((d) => d.textContent === '15' && !d.classList.contains('is-outside'))!;
        dia.focus();
        dia.click();
        expect(document.activeElement?.getAttribute('data-ts-value')).toBe('2026-07-15');
        expect(document.activeElement).not.toBe(dia);
    });

    it('navega de mes y repinta', () => {
        montar(HTML);
        q('[data-ts-date-next]').click();
        expect(q('[data-ts-date-title]').textContent?.toLowerCase()).toContain('agosto');
    });

    it('las flechas mueven el día enfocado', () => {
        const raiz = montar(HTML);
        const dia7 = qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === '2026-07-07')!;
        dia7.focus();
        tecla(dia7, 'ArrowRight');

        expect(raiz.getAttribute('data-ts-focused')).toBe('2026-07-08');
    });

    it('en RTL ← avanza un día y → retrocede', () => {
        document.documentElement.dir = 'rtl';
        try {
            const raiz = montar(HTML);
            const dia7 = qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === '2026-07-07')!;
            tecla(dia7, 'ArrowLeft');
            expect(raiz.getAttribute('data-ts-focused')).toBe('2026-07-08');
            const dia8 = qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === '2026-07-08')!;
            tecla(dia8, 'ArrowRight');
            expect(raiz.getAttribute('data-ts-focused')).toBe('2026-07-07');
        } finally {
            document.documentElement.dir = '';
        }
    });

    it('cruzar el borde del mes con el teclado cambia el mes visible', () => {
        const raiz = montar(HTML.replace('data-ts-value="2026-07-07"', 'data-ts-value="2026-07-31"'));
        const ultimo = qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === '2026-07-31')!;
        tecla(ultimo, 'ArrowRight');

        expect(raiz.getAttribute('data-ts-month')).toBe('2026-08-01');
    });

    it('cada celda lleva la fecha completa como nombre, aria-selected y aria-disabled; el grupo y la grilla, el mes', () => {
        const raiz = montar(HTML.replace('data-ts-month="2026-07-01">', 'data-ts-month="2026-07-01" data-ts-min="2026-07-06">'));
        expect(raiz.getAttribute('aria-label')).toBe('Julio de 2026');
        expect(q('[role="grid"]').getAttribute('aria-label')).toBe('Julio de 2026');
        const de = (iso: string) => qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === iso)!;
        expect(de('2026-07-07').getAttribute('aria-label')).toBe('martes, 7 de julio de 2026');
        expect(de('2026-07-07').getAttribute('aria-selected')).toBe('true');
        expect(de('2026-07-08').getAttribute('aria-selected')).toBe('false');
        expect(de('2026-07-05').getAttribute('aria-disabled')).toBe('true');
        expect(de('2026-07-08').getAttribute('aria-disabled')).toBe('false');
        q('[data-ts-date-next]').click();
        expect(raiz.getAttribute('aria-label')).toBe('Agosto de 2026');
        expect(q('[role="grid"]').getAttribute('aria-label')).toBe('Agosto de 2026');
    });

    it('APG: Mayús + RePág / AvPág mueven un año; RePág cae en el último día del mes si el día no existe', () => {
        const raiz = montar(HTML.replace('data-ts-value="2026-07-07"', 'data-ts-value="2026-01-31"').replace('data-ts-month="2026-07-01"', 'data-ts-month="2026-01-01"'));
        const dia = qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === '2026-01-31')!;
        dia.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', shiftKey: true, bubbles: true, cancelable: true }));
        expect(raiz.getAttribute('data-ts-focused')).toBe('2027-01-31');
        tecla(document.activeElement!, 'PageDown');
        expect(raiz.getAttribute('data-ts-focused')).toBe('2027-02-28');
    });

    it('parsea la fecha como LOCAL, no UTC (si no, muestra el día anterior)', () => {
        montar(HTML);
        const sel = qq('[data-ts-date-day]').find((d) => d.classList.contains('is-selected'))!;
        expect(sel.getAttribute('data-ts-value')).toBe('2026-07-07');
    });
});

describe('Popover: aria-expanded del disparador y campos del panel cerrado', () => {
    const HTML = `
    <form id="f">
      <input name="afuera" value="a">
      <div class="ts popover-root">
        <button type="button" id="disp" popovertarget="pop" aria-haspopup="dialog" aria-expanded="false">Filtrar</button>
        <div id="pop" class="ts popover" popover="auto" role="dialog">
          <input name="dentro" value="d">
          <input name="requerido" required>
          <input name="bloqueado" value="b" disabled>
          <select name="rol"><option value="admin">Admin</option></select>
          <textarea name="nota">n</textarea>
          <div id="anidado" class="ts popover" popover="auto"><input name="interno" value="i"></div>
        </div>
      </div>
    </form>`;
    const evento = (id: string, tipo: 'beforetoggle' | 'toggle', nuevo: 'open' | 'closed') => {
        const e = new Event(tipo);
        Object.defineProperty(e, 'newState', { value: nuevo });
        q(id).dispatchEvent(e);
    };
    const enviado = () => [...new FormData(q<HTMLFormElement>('#f')).keys()];

    it('aria-expanded sigue al panel: true al abrir, false al cerrar', () => {
        montar(HTML);
        evento('#pop', 'toggle', 'open');
        expect(q('#disp').getAttribute('aria-expanded')).toBe('true');
        evento('#pop', 'toggle', 'closed');
        expect(q('#disp').getAttribute('aria-expanded')).toBe('false');
    });

    it('con el panel cerrado sus campos no viajan ni validan; el resto del formulario sí', () => {
        montar(HTML);
        expect(enviado()).toEqual(['afuera']);
        expect(q<HTMLFormElement>('#f').checkValidity()).toBe(true);
    });

    it('abrir restaura los campos y cerrar los vuelve a apagar', () => {
        montar(HTML);
        evento('#pop', 'beforetoggle', 'open');
        expect(enviado()).toEqual(['afuera', 'dentro', 'requerido', 'rol', 'nota']);
        expect(q<HTMLFormElement>('#f').checkValidity()).toBe(false);
        evento('#pop', 'beforetoggle', 'closed');
        expect(enviado()).toEqual(['afuera']);
    });

    it('no pisa lo que el autor puso `disabled`: sigue deshabilitado después de abrir', () => {
        montar(HTML);
        evento('#pop', 'beforetoggle', 'open');
        expect(q<HTMLInputElement>('[name=bloqueado]').disabled).toBe(true);
        evento('#pop', 'beforetoggle', 'closed');
        evento('#pop', 'beforetoggle', 'open');
        expect(q<HTMLInputElement>('[name=bloqueado]').disabled).toBe(true);
    });

    it('el valor elegido con el panel abierto se conserva al reabrir', () => {
        montar(HTML);
        evento('#pop', 'beforetoggle', 'open');
        q<HTMLInputElement>('[name=dentro]').value = 'otro';
        evento('#pop', 'beforetoggle', 'closed');
        evento('#pop', 'beforetoggle', 'open');
        expect(q<HTMLInputElement>('[name=dentro]').value).toBe('otro');
    });

    it('un Popover anidado y cerrado conserva sus campos apagados cuando abre el de afuera', () => {
        montar(HTML);
        evento('#pop', 'beforetoggle', 'open');
        expect(enviado()).not.toContain('interno');
        evento('#anidado', 'beforetoggle', 'open');
        expect(enviado()).toContain('interno');
    });

    it('un `init` repetido no cambia nada', () => {
        montar(HTML);
        init(document);
        init(document);
        expect(enviado()).toEqual(['afuera']);
        expect(qq('[data-ts-popover-off]')).toHaveLength(5);
    });
});

describe('DatePicker con disparador y popover', () => {
    const HTML = (extra = '') => `
    <div class="ts popover-root">
      <button type="button" id="disp" class="ts datepicker-trigger is-placeholder" aria-label="Elegir una fecha"
        popovertarget="pop" aria-haspopup="dialog" aria-expanded="false">
        <span class="ts datepicker-value">Elegir una fecha</span>
      </button>
      <div id="pop" popover="auto" role="dialog">
        <div data-ts-date-picker data-ts-locale="es-AR" data-ts-month="2026-07-01" ${extra}>
          <button data-ts-date-prev>‹</button><span data-ts-date-title></span><button data-ts-date-next>›</button>
          <div class="ts calendar-grid" role="grid">
            <div class="ts calendar-dow-row" role="row" data-ts-date-weekdays></div>
            <div data-ts-date-grid></div>
          </div>
        </div>
      </div>
    </div>
    <input type="hidden" name="fecha" value="" data-ts-date-input>
    <button id="otro">Otro</button>`;
    const alternar = (nuevo: 'open' | 'closed') => {
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: nuevo });
        q('#pop').classList.toggle('is-visible', nuevo === 'open');
        q('#pop').dispatchEvent(e);
    };
    const dia = (iso: string) => qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === iso)!;
    const espiarCierre = () => {
        const cerrar = vi.fn(() => alternar('closed'));
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = cerrar;
        return cerrar;
    };

    it('al abrir sincroniza aria-expanded y is-open, y al cerrar los devuelve', () => {
        montar(HTML());
        alternar('open');
        expect(q('#disp').getAttribute('aria-expanded')).toBe('true');
        expect(q('#disp').classList.contains('is-open')).toBe(true);
        alternar('closed');
        expect(q('#disp').getAttribute('aria-expanded')).toBe('false');
        expect(q('#disp').classList.contains('is-open')).toBe(false);
    });

    it('al abrir el foco va al día enfocable (hoy sin valor), no a «Mes anterior»', () => {
        montar(HTML());
        alternar('open');
        const activo = document.activeElement as HTMLElement;
        expect(activo.hasAttribute('data-ts-date-day')).toBe(true);
        expect(activo.tabIndex).toBe(0);
    });

    it('al reabrir, el calendario vuelve al mes del valor aunque se haya navegado', () => {
        montar(HTML('data-ts-value="2026-07-14"'));
        q('[data-ts-date-next]').click();
        expect(q('[data-ts-date-title]').textContent?.toLowerCase()).toContain('agosto');
        alternar('closed');
        alternar('open');
        expect(q('[data-ts-date-title]').textContent?.toLowerCase()).toContain('julio');
        expect(document.activeElement?.getAttribute('data-ts-value')).toBe('2026-07-14');
    });

    it('elegir un día con click cierra, escribe la fecha formateada, el hidden y devuelve el foco al disparador', () => {
        montar(HTML('data-ts-value="2026-07-14"'));
        const cerrar = espiarCierre();
        alternar('open');
        dia('2026-07-16').click();

        expect(cerrar).toHaveBeenCalledTimes(1);
        expect(q('.ts.datepicker-value').textContent).toBe(new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(2026, 6, 16)));
        expect(q('#disp').classList.contains('is-placeholder')).toBe(false);
        expect(q('#disp').getAttribute('aria-label')).toBe(q('.ts.datepicker-value').textContent);
        expect(q<HTMLInputElement>('input[name="fecha"]').value).toBe('2026-07-16');
        expect(document.activeElement).toBe(q('#disp'));
    });

    it('Enter sobre el día enfocado elige igual que el click', () => {
        montar(HTML('data-ts-value="2026-07-14"'));
        const cerrar = espiarCierre();
        alternar('open');
        tecla(dia('2026-07-14'), 'ArrowRight');
        tecla(document.activeElement!, 'Enter');

        expect(cerrar).toHaveBeenCalled();
        expect(q<HTMLInputElement>('input[name="fecha"]').value).toBe('2026-07-15');
        expect(document.activeElement).toBe(q('#disp'));
    });

    it('con un Field el nombre sale de aria-labelledby: no se le inventa un aria-label', () => {
        montar(HTML('data-ts-value="2026-07-14"').replace('aria-label="Elegir una fecha"', 'aria-labelledby="etq"'));
        espiarCierre();
        alternar('open');
        dia('2026-07-16').click();
        expect(q('#disp').hasAttribute('aria-label')).toBe(false);
        expect(q('.ts.datepicker-value').textContent).toContain('2026');
    });

    it('preventDefault en ts:change cancela: ni cierra ni cambia el valor', () => {
        montar(HTML('data-ts-value="2026-07-14"'));
        const cerrar = espiarCierre();
        alternar('open');
        document.addEventListener('ts:change', (e) => e.preventDefault(), { once: true });
        dia('2026-07-16').click();

        expect(cerrar).not.toHaveBeenCalled();
        expect(q<HTMLInputElement>('input[name="fecha"]').value).toBe('');
        expect(q('#disp').classList.contains('is-placeholder')).toBe(true);
    });

    it('min / max: los días fuera de rango quedan aria-disabled, enfocables y no se eligen', () => {
        montar(HTML('data-ts-value="2026-07-14" data-ts-min="2026-07-06" data-ts-max="2026-07-27"'));
        const cerrar = espiarCierre();
        alternar('open');
        expect(dia('2026-07-05').getAttribute('aria-disabled')).toBe('true');
        expect(dia('2026-07-28').getAttribute('aria-disabled')).toBe('true');
        expect(dia('2026-07-10').getAttribute('aria-disabled')).toBe('false');
        dia('2026-07-28').click();
        dia('2026-07-05').focus();
        tecla(dia('2026-07-05'), 'Enter');

        expect(cerrar).not.toHaveBeenCalled();
        expect(q<HTMLInputElement>('input[name="fecha"]').value).toBe('');
    });

    describe('form.reset()', () => {
        const enForm = (extra: string) => montar(`<form id="f">${HTML(extra)}</form>`);
        const reset = async () => {
            (q('#f') as HTMLFormElement).reset();
            await new Promise((r) => setTimeout(r, 5));
        };

        it('vuelve al valor inicial: texto, aria-label, hidden y día seleccionado, sin avisar con ts:change', async () => {
            montar(`<form id="f">${HTML('data-ts-value="2026-07-14"')
                .replace(' is-placeholder', '')
                .replace('aria-label="Elegir una fecha"', 'aria-label="14 jul 2026"')
                .replace('>Elegir una fecha</span>', '>14 jul 2026</span>')
                .replace('name="fecha" value=""', 'name="fecha" value="2026-07-14"')}</form>`);
            espiarCierre();
            alternar('open');
            dia('2026-07-16').click();
            expect(q<HTMLInputElement>('input[name="fecha"]').value).toBe('2026-07-16');
            const avisos = vi.fn();
            document.addEventListener('ts:change', avisos);

            await reset();
            document.removeEventListener('ts:change', avisos);
            expect(q<HTMLInputElement>('input[name="fecha"]').value).toBe('2026-07-14');
            expect(q('[data-ts-date-picker]').getAttribute('data-ts-value')).toBe('2026-07-14');
            expect(q('.ts.datepicker-value').textContent).toBe('14 jul 2026');
            expect(q('#disp').getAttribute('aria-label')).toBe('14 jul 2026');
            expect(q('#disp').classList.contains('is-placeholder')).toBe(false);
            expect(avisos).not.toHaveBeenCalled();
        });

        it('sin valor inicial vuelve al placeholder y vacía el hidden', async () => {
            enForm('');
            espiarCierre();
            alternar('open');
            (document.activeElement as HTMLElement).click();
            expect(q<HTMLInputElement>('input[name="fecha"]').value).not.toBe('');
            expect(q('#disp').classList.contains('is-placeholder')).toBe(false);

            await reset();
            expect(q<HTMLInputElement>('input[name="fecha"]').value).toBe('');
            expect(q('.ts.datepicker-value').textContent).toBe('Elegir una fecha');
            expect(q('#disp').classList.contains('is-placeholder')).toBe(true);
            expect(q('#disp').getAttribute('aria-label')).toBe('Elegir una fecha');
            expect(q('[data-ts-date-picker]').hasAttribute('data-ts-value')).toBe(false);
        });

        it('un reset cancelado (preventDefault) no toca nada', async () => {
            enForm('data-ts-value="2026-07-14"');
            espiarCierre();
            alternar('open');
            dia('2026-07-16').click();
            q('#f').addEventListener('reset', (e) => e.preventDefault());
            await reset();
            expect(q<HTMLInputElement>('input[name="fecha"]').value).toBe('2026-07-16');
        });
    });

    it('weekStartsOn=0 arranca la semana en domingo', () => {
        montar(HTML('data-ts-week-start="0" data-ts-value="2026-07-14"'));
        alternar('open');
        expect(q('[data-ts-date-weekdays] .ts.calendar-dow').textContent?.toLowerCase()).toContain('dom');
        expect(qq('[data-ts-date-day]')[0].getAttribute('data-ts-value')).toBe('2026-06-28');
    });

    it('cerrado, el calendario no deja grilla en el DOM (no se monta): ni día seleccionado escondido', () => {
        montar(HTML('data-ts-value="2026-07-14"'));
        expect(qq('[data-ts-date-day]')).toHaveLength(0);
        alternar('open');
        expect(qq('.is-selected[data-ts-date-day]')).toHaveLength(1);
        alternar('closed');
        expect(qq('[data-ts-date-day]')).toHaveLength(0);
    });

    it('ningún control del calendario lleva `name`: sólo el hidden del valor viaja en el form', () => {
        montar(HTML());
        expect(q('#pop').querySelectorAll('[name]')).toHaveLength(0);
        expect([...document.querySelectorAll('[name]')].map((e) => e.getAttribute('name'))).toEqual(['fecha']);
    });

    it('un Calendar suelto (sin disparador) no cambia: elegir no cierra nada ni toca otros controles', () => {
        montar(`<div data-ts-date-picker data-ts-locale="es-AR" data-ts-month="2026-07-01">
            <div data-ts-date-grid></div></div><input type="hidden" name="x" data-ts-date-input>`);
        dia('2026-07-16').click();
        expect(dia('2026-07-16').classList.contains('is-selected')).toBe(true);
        expect(q<HTMLInputElement>('input[name="x"]').value).toBe('');
    });
});

describe('Table', () => {
    const HTML = `
    <div data-ts-table>
      <table>
        <thead><tr>
          <th data-ts-th data-ts-key="nombre">Nombre</th>
          <th data-ts-th data-ts-key="edad">Edad</th>
        </tr></thead>
        <tbody data-ts-table-body>
          <tr data-ts-row><td data-ts-cell="nombre">Beto</td><td data-ts-cell="edad">30</td></tr>
          <tr data-ts-row><td data-ts-cell="nombre">Ana</td><td data-ts-cell="edad">9</td></tr>
        </tbody>
      </table>
    </div>`;

    const nombres = () => qq('[data-ts-cell="nombre"]').map((c) => c.textContent);

    it('ordena alfabéticamente al click y marca aria-sort', () => {
        montar(HTML);
        qq('[data-ts-th]')[0].click();

        expect(nombres()).toEqual(['Ana', 'Beto']);
        expect(qq('[data-ts-th]')[0].getAttribute('aria-sort')).toBe('ascending');
    });

    it('el segundo click invierte', () => {
        montar(HTML);
        qq('[data-ts-th]')[0].click();
        qq('[data-ts-th]')[0].click();

        expect(nombres()).toEqual(['Beto', 'Ana']);
        expect(qq('[data-ts-th]')[0].getAttribute('aria-sort')).toBe('descending');
    });

    it('ordena números como números, no como texto', () => {
        montar(HTML);
        qq('[data-ts-th]')[1].click();

        expect(nombres()).toEqual(['Ana', 'Beto']);
    });

    it('Enter sobre el encabezado ordena igual que el click', () => {
        montar(HTML);
        tecla(qq('[data-ts-th]')[0], 'Enter');
        expect(nombres()).toEqual(['Ana', 'Beto']);
    });

    it('al ordenar por otra columna, los empates salen en el orden ORIGINAL, no en el último', () => {
        montar(`
        <div data-ts-table><table>
          <thead><tr>
            <th data-ts-th data-ts-key="nombre">Nombre</th>
            <th data-ts-th data-ts-key="edad">Edad</th>
            <th data-ts-th data-ts-key="plan">Plan</th>
          </tr></thead>
          <tbody data-ts-table-body>
            <tr data-ts-row><td data-ts-cell="nombre">Ana</td><td data-ts-cell="edad">30</td><td data-ts-cell="plan">Pro</td></tr>
            <tr data-ts-row><td data-ts-cell="nombre">Beto</td><td data-ts-cell="edad">28</td><td data-ts-cell="plan">Free</td></tr>
            <tr data-ts-row><td data-ts-cell="nombre">Cami</td><td data-ts-cell="edad">20</td><td data-ts-cell="plan">Pro</td></tr>
          </tbody>
        </table></div>`);
        const [, edad, plan] = qq('[data-ts-th]');
        edad.click();
        edad.click();
        plan.click();

        expect(nombres()).toEqual(['Beto', 'Ana', 'Cami']);
        plan.click();
        expect(nombres()).toEqual(['Ana', 'Cami', 'Beto']);
    });
});

describe('Table: orden de números localizados', () => {
    const tabla = (lang: string, celdas: string[], extra = '') => `
    <div data-ts-table lang="${lang}"><table>
      <thead><tr><th data-ts-th data-ts-key="n">Capacidad</th></tr></thead>
      <tbody data-ts-table-body>
        ${celdas.map((c) => `<tr data-ts-row><td data-ts-cell="n"${extra}>${c}</td></tr>`).join('')}
      </tbody>
    </table></div>`;
    const celdas = () => qq('[data-ts-cell="n"]').map((c) => c.textContent);

    it('es: «1.850» es 1850, no 1,85', () => {
        montar(tabla('es', ['1.850', '1.120', '410', '640', '920']));
        qq('[data-ts-th]')[0].click();
        expect(celdas()).toEqual(['410', '640', '920', '1.120', '1.850']);
    });

    it('ar: dígitos arábigo-índicos con separador de miles', () => {
        montar(tabla('ar', ['١٬٨٥٠', '١٬١٢٠', '٤١٠', '٦٤٠', '٩٢٠']));
        qq('[data-ts-th]')[0].click();
        expect(celdas()).toEqual(['٤١٠', '٦٤٠', '٩٢٠', '١٬١٢٠', '١٬٨٥٠']);
    });

    it('es: decimal con coma; en: miles con coma y decimal con punto', () => {
        montar(tabla('es', ['10,5', '9,25', '1.000,5']));
        qq('[data-ts-th]')[0].click();
        expect(celdas()).toEqual(['9,25', '10,5', '1.000,5']);
        montar(tabla('en', ['1,850.5', '410', '1,120']));
        qq('[data-ts-th]')[0].click();
        expect(celdas()).toEqual(['410', '1,120', '1,850.5']);
    });

    it('lo que no es número localizado sigue como antes (texto con locale, «1.5» decimal)', () => {
        montar(tabla('es', ['1.5', 'n/d', '0.25']));
        qq('[data-ts-th]')[0].click();
        expect(celdas()).toEqual(['0.25', '1.5', 'n/d']);
    });

    it('data-ts-sort-value gana sobre el texto y se lee tal cual (valor de máquina)', () => {
        montar(`
        <div data-ts-table lang="es"><table>
          <thead><tr><th data-ts-th data-ts-key="n">Capacidad</th></tr></thead>
          <tbody data-ts-table-body>
            <tr data-ts-row><td data-ts-cell="n" data-ts-sort-value="1850">1.850 hm³</td></tr>
            <tr data-ts-row><td data-ts-cell="n" data-ts-sort-value="410">410 hm³</td></tr>
            <tr data-ts-row><td data-ts-cell="n" data-ts-sort-value="1.5">1,5 hm³</td></tr>
          </tbody>
        </table></div>`);
        qq('[data-ts-th]')[0].click();
        expect(celdas()).toEqual(['1,5 hm³', '410 hm³', '1.850 hm³']);
    });
});

describe('Sidebar', () => {
    const HTML = `
    <aside data-ts-sidebar data-ts-persist-key="test-nav">
      <button data-ts-sidebar-toggle aria-expanded="true">≡</button>
      <div data-ts-sidebar-collapsible>contenido</div>
      <div data-ts-sidebar-group>
        <button data-ts-sidebar-group-toggle aria-expanded="false">Ajustes</button>
        <div data-ts-sidebar-group-items hidden>items</div>
      </div>
    </aside>`;

    beforeEach(() => localStorage.clear());

    it('colapsa y marca aria-expanded', () => {
        const raiz = montar(HTML);
        q('[data-ts-sidebar-toggle]').click();

        expect(raiz.classList.contains('is-collapsed')).toBe(true);
        expect(q('[data-ts-sidebar-toggle]').getAttribute('aria-expanded')).toBe('false');
    });

    it('el rail de íconos colapsado sigue operable: nada queda inert', () => {
        montar(HTML.replace('<aside ', '<aside class="collapsible-icon" '));
        q('[data-ts-sidebar-toggle]').click();
        expect(q('[data-ts-sidebar-collapsible]').inert).toBe(false);
    });

    it('la barra que se pliega del todo (offcanvas) queda inert: no se puede tabular a algo invisible', () => {
        montar(HTML.replace('<aside ', '<aside class="collapsible-offcanvas" '));
        q('[data-ts-sidebar-toggle]').click();
        expect(q('[data-ts-sidebar-collapsible]').inert).toBe(true);
        q('[data-ts-sidebar-toggle]').click();
        expect(q('[data-ts-sidebar-collapsible]').inert).toBe(false);
    });

    it('recuerda el estado entre cargas', () => {
        montar(HTML);
        q('[data-ts-sidebar-toggle]').click();

        const raiz = montar(HTML);
        expect(raiz.classList.contains('is-collapsed')).toBe(true);
    });

    it('los grupos abren y cierran por su cuenta', () => {
        montar(HTML);
        q('[data-ts-sidebar-group-toggle]').click();

        expect(q('[data-ts-sidebar-group-items]').hidden).toBe(false);
        expect(q('[data-ts-sidebar-group-toggle]').getAttribute('aria-expanded')).toBe('true');
    });
});

describe('Sidebar: Drawer bajo el breakpoint', () => {
    const HTML = `
    <div>
      <button data-ts-sidebar-trigger="default" aria-label="Abrir menú">≡</button>
      <nav data-ts-sidebar data-ts-sidebar-id="default" data-ts-sidebar-drawer="d1" data-ts-breakpoint="lg" data-ts-persist-key="test-nav">
        <button data-ts-sidebar-toggle aria-expanded="true">≡</button>
      </nav>
      <dialog id="d1">
        <nav><a href="#x" data-ts-sidebar-item>Inicio</a><button data-ts-sidebar-group-toggle aria-expanded="false">Grupo</button></nav>
      </dialog>
    </div>`;

    const ventana = (ancho: boolean) => {
        window.matchMedia = ((query: string) => ({ matches: ancho, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    };
    beforeEach(() => {
        localStorage.clear();
        HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.open = true; };
        HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.open = false; };
    });

    it('en ventana angosta el disparador abre el Drawer y no colapsa la barra', () => {
        ventana(false);
        const raiz = montar(HTML).querySelector<HTMLElement>('[data-ts-sidebar]')!;
        q('[data-ts-sidebar-trigger]').click();
        expect(q<HTMLDialogElement>('#d1').open).toBe(true);
        expect(raiz.classList.contains('is-collapsed')).toBe(false);
    });

    it('en ventana ancha el disparador colapsa y expande la barra, sin abrir el Drawer', () => {
        ventana(true);
        const raiz = montar(HTML).querySelector<HTMLElement>('[data-ts-sidebar]')!;
        q('[data-ts-sidebar-trigger]').click();
        expect(raiz.classList.contains('is-collapsed')).toBe(true);
        expect(q<HTMLDialogElement>('#d1').open).toBe(false);
        q('[data-ts-sidebar-trigger]').click();
        expect(raiz.classList.contains('is-collapsed')).toBe(false);
    });

    it('al agrandar la ventana con el Drawer abierto se cierra; angosta o ya cerrado no cambia', () => {
        ventana(false);
        montar(HTML);
        q('[data-ts-sidebar-trigger]').click();
        window.dispatchEvent(new Event('resize'));
        expect(q<HTMLDialogElement>('#d1').open).toBe(true);

        ventana(true);
        window.dispatchEvent(new Event('resize'));
        expect(q<HTMLDialogElement>('#d1').open).toBe(false);

        window.dispatchEvent(new Event('resize'));
        expect(q<HTMLDialogElement>('#d1').open).toBe(false);
    });

    it('activar un ítem cierra el Drawer; abrir un grupo no', () => {
        ventana(false);
        montar(HTML);
        q('[data-ts-sidebar-trigger]').click();
        q('[data-ts-sidebar-group-toggle]').click();
        expect(q<HTMLDialogElement>('#d1').open).toBe(true);
        q('[data-ts-sidebar-item]').click();
        expect(q<HTMLDialogElement>('#d1').open).toBe(false);
    });
});

const BOTON = `<button type="button" class="ts button size-md variant-primary"><span data-ts-spinner><span class="ts spinner size-sm" aria-hidden="true"></span></span>
  <span data-ts-content>Guardar</span></button>`;
const ENLACE = `<a href="#destino" class="ts button size-md variant-primary"><span data-ts-spinner><span class="ts spinner size-sm" aria-hidden="true"></span></span>
  <span data-ts-content>Ir al panel</span></a>`;

describe('Button cargando', () => {
    it('setButtonLoading pone is-loading, aria-busy y aria-disabled, sigue enfocable, y lo revierte', () => {
        montar(BOTON);
        const b = q('button');
        setButtonLoading(b, true);
        expect(b.classList.contains('is-loading')).toBe(true);
        expect(b.getAttribute('aria-busy')).toBe('true');
        expect(b.getAttribute('aria-disabled')).toBe('true');
        expect(b.hasAttribute('disabled')).toBe(false);
        b.focus();
        expect(document.activeElement).toBe(b);

        setButtonLoading(b, false);
        expect(b.classList.contains('is-loading')).toBe(false);
        expect(b.hasAttribute('aria-busy')).toBe(false);
        expect(b.hasAttribute('aria-disabled')).toBe(false);
        expect(b.querySelector('[data-ts-loading-text]')).toBeNull();
    });

    it('al terminar de cargar devuelve el aria-disabled que el botón ya traía, en vez de borrarlo', () => {
        montar(BOTON);
        const b = q('button');
        b.setAttribute('aria-disabled', 'true');
        setButtonLoading(b, true);
        setButtonLoading(b, true);
        setButtonLoading(b, false);
        expect(b.classList.contains('is-loading')).toBe(false);
        expect(b.hasAttribute('aria-busy')).toBe(false);
        expect(b.getAttribute('aria-disabled')).toBe('true');
        setButtonLoading(b, false);
        expect(b.getAttribute('aria-disabled')).toBe('true');
    });

    it('setButtonLoading(false) sobre un botón que nunca cargó no toca su aria-disabled', () => {
        montar(BOTON);
        const b = q('button');
        b.setAttribute('aria-disabled', 'true');
        setButtonLoading(b, false);
        expect(b.getAttribute('aria-disabled')).toBe('true');
    });

    it('un botón que viene cargando desde el marcado (is-loading + aria-disabled) deja de estar deshabilitado al terminar', () => {
        montar(BOTON);
        const b = q('button');
        b.classList.add('is-loading');
        b.setAttribute('aria-busy', 'true');
        b.setAttribute('aria-disabled', 'true');
        setButtonLoading(b, false);
        expect(b.hasAttribute('aria-disabled')).toBe(false);
        expect(b.hasAttribute('aria-busy')).toBe(false);
    });

    it('el nombre accesible calculado suma «Cargando» (en el idioma de la página) y lo quita al terminar', () => {
        document.documentElement.lang = 'es';
        montar(BOTON);
        const b = q('button');
        expect(getByRole(document.body, 'button', { name: 'Guardar' })).toBe(b);
        setButtonLoading(b, true);
        expect(getByRole(document.body, 'button', { name: 'Cargando Guardar' })).toBe(b);
        setButtonLoading(b, true);
        expect(qq('[data-ts-loading-text]')).toHaveLength(1);
        setButtonLoading(b, false);
        expect(getByRole(document.body, 'button', { name: 'Guardar' })).toBe(b);

        document.documentElement.lang = 'en';
        setButtonLoading(b, true);
        expect(getByRole(document.body, 'button', { name: 'Loading Guardar' })).toBe(b);
        setButtonLoading(b, false);
        document.documentElement.lang = '';
        setButtonLoading(b, true);
        expect(getByRole(document.body, 'button', { name: 'Loading Guardar' })).toBe(b);
    });

    it('el spinner es decorativo: ningún status ni nombre propio dentro del botón', () => {
        montar(BOTON);
        setButtonLoading(q('button'), true);
        expect(qq('button [role="status"]')).toHaveLength(0);
        expect(q('button .spinner').getAttribute('aria-hidden')).toBe('true');
    });

    it('cargando no se activa: ni click, ni Enter o Espacio llegan a lo que escucha el botón', () => {
        montar(BOTON);
        const b = q('button');
        const alClick = vi.fn();
        b.addEventListener('click', alClick);
        setButtonLoading(b, true);
        b.click();
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        q('[data-ts-content]').click();
        expect(alClick).not.toHaveBeenCalled();

        setButtonLoading(b, false);
        b.click();
        expect(alClick).toHaveBeenCalledTimes(1);
    });

    it('cargando no envía el formulario', () => {
        montar(`<form>${BOTON.replace('type="button"', 'type="submit"')}</form>`);
        const alEnviar = vi.fn((e: Event) => e.preventDefault());
        q('form').addEventListener('submit', alEnviar);
        setButtonLoading(q('button'), true);
        q('button').click();
        expect(alEnviar).not.toHaveBeenCalled();
        setButtonLoading(q('button'), false);
        q('button').click();
        expect(alEnviar).toHaveBeenCalledTimes(1);
    });

    it('un enlace con aspecto de botón es un enlace (rol link, sin role="button") y cargando no navega', () => {
        document.documentElement.lang = 'es';
        montar(ENLACE);
        const a = q('a');
        expect(a.hasAttribute('role')).toBe(false);
        expect(getByRole(document.body, 'link', { name: 'Ir al panel' })).toBe(a);
        setButtonLoading(a, true);
        expect(getByRole(document.body, 'link', { name: 'Cargando Ir al panel' })).toBe(a);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        a.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(true);
        setButtonLoading(a, false);
        const libre = new MouseEvent('click', { bubbles: true, cancelable: true });
        a.dispatchEvent(libre);
        expect(libre.defaultPrevented).toBe(false);
        document.documentElement.lang = '';
    });

    it('un aria-disabled escrito a mano en un botón también lo frena', () => {
        montar(BOTON.replace('type="button"', 'type="button" aria-disabled="true"'));
        const alClick = vi.fn();
        q('button').addEventListener('click', alClick);
        q('button').click();
        expect(alClick).not.toHaveBeenCalled();
    });
});

describe('Toast', () => {
    it('crea el contenedor con sus dos regiones vivas, y el contenedor no es región', () => {
        toast('Guardado');
        const cont = q('[data-ts-toast-container]');

        expect(cont.hasAttribute('aria-live')).toBe(false);
        expect(cont.hasAttribute('role')).toBe(false);
        const cortes = q('[data-ts-toast-region="polite"]');
        const asertiva = q('[data-ts-toast-region="assertive"]');
        expect(cortes.getAttribute('role')).toBe('status');
        expect(cortes.getAttribute('aria-live')).toBe('polite');
        expect(asertiva.getAttribute('role')).toBe('alert');
        expect(asertiva.getAttribute('aria-live')).toBe('assertive');
        expect(cortes.parentElement).toBe(cont);
        expect(asertiva.parentElement).toBe(cont);
    });

    it('un contenedor escrito en el marcado tiene sus regiones desde el init, antes del primer aviso', () => {
        montar('<div data-ts-toast-container class="ts toaster position-top-right"></div>');
        expect(qq('[data-ts-toast-region]').map((r) => r.getAttribute('data-ts-toast-region'))).toEqual(['polite', 'assertive']);
        expect(qq('[data-ts-toast]')).toHaveLength(0);
    });

    it('un contenedor de un marcado anterior (con aria-live propio) deja de ser región para no anidar', () => {
        montar('<div data-ts-toast-container role="status" aria-live="polite" aria-atomic="false"></div>');
        const cont = q('[data-ts-toast-container]');
        expect(cont.hasAttribute('aria-live')).toBe(false);
        expect(cont.hasAttribute('role')).toBe(false);
    });

    it('el aviso cae en la región que corresponde a su variante y no lleva rol propio', () => {
        toast('Guardado', { variant: 'success', duration: 0 });
        toast('Nueva versión disponible.', { duration: 0 });
        toast('No pudimos procesar el pago.', { variant: 'danger', duration: 0 });
        const cortes = q('[data-ts-toast-region="polite"]');
        const asertiva = q('[data-ts-toast-region="assertive"]');

        expect(cortes.textContent).toContain('Guardado');
        expect(cortes.textContent).toContain('Nueva versión disponible.');
        expect(cortes.textContent).not.toContain('No pudimos procesar el pago.');
        expect(asertiva.textContent).toContain('No pudimos procesar el pago.');
        expect(asertiva.textContent).not.toContain('Guardado');
        for (const aviso of qq('[data-ts-toast]')) expect(aviso.hasAttribute('role')).toBe(false);
    });

    it('no hay regiones vivas anidadas', () => {
        toast('Guardado', { duration: 0 });
        toast('No pudimos procesar el pago.', { variant: 'danger', duration: 0 });
        const vivas = qq('[aria-live], [role="status"], [role="alert"]');
        for (const v of vivas) expect(v.parentElement?.closest('[aria-live], [role="status"], [role="alert"]')).toBeNull();
        expect(vivas.map((v) => v.getAttribute('data-ts-toast-region'))).toEqual(['polite', 'assertive']);
    });

    it('updateToast a danger muda el aviso a la región asertiva (y de vuelta)', () => {
        const el = toast('Construyendo…', { duration: 0, loading: true });
        const cortes = q('[data-ts-toast-region="polite"]');
        const asertiva = q('[data-ts-toast-region="assertive"]');
        expect(el.parentElement).toBe(cortes);

        updateToast(el, { message: 'Falló el despliegue.', variant: 'danger', loading: false });
        expect(el.parentElement).toBe(asertiva);

        updateToast(el, { message: 'Despliegue completado.', variant: 'success' });
        expect(el.parentElement).toBe(cortes);
    });

    it('clearToasts quita los avisos de las dos regiones y deja las regiones', () => {
        toast('Guardado', { duration: 0 });
        toast('No pudimos procesar el pago.', { variant: 'danger', duration: 0 });
        clearToasts();
        expect(qq('[data-ts-toast]')).toHaveLength(0);
        expect(qq('[data-ts-toast-region]')).toHaveLength(2);
    });

    it('muestra el mensaje y la variante', () => {
        toast('Se borró', { variant: 'danger' });
        expect(q('[data-ts-toast]').textContent).toContain('Se borró');
        expect(q('[data-ts-toast]').className).toContain('variant-danger');
    });

    it('se cierra solo cuando vence', () => {
        vi.useFakeTimers();
        toast('Chau', { duration: 1000 });
        expect(qq('[data-ts-toast]')).toHaveLength(1);

        vi.advanceTimersByTime(1100);
        expect(qq('[data-ts-toast]')).toHaveLength(0);
        vi.useRealTimers();
    });

    it('con duration 0 se queda hasta que lo cierren', () => {
        vi.useFakeTimers();
        toast('Importante', { duration: 0 });
        vi.advanceTimersByTime(60_000);

        expect(qq('[data-ts-toast]')).toHaveLength(1);
        vi.useRealTimers();
    });

    it('su botón de cerrar lo maneja el controlador `dismiss` compartido', () => {
        init(document);
        const el = toast('Chau', { duration: 0 });
        q('[data-ts-toast] [data-ts-dismiss]').click();

        expect(el.hidden).toBe(true);
    });
});

describe('Combobox: chevron, limpiar, readonly, reset y Escape', () => {
    const CB = (valor = 'ar', extra = '') => `
<div id="caja"><form id="f">
<div data-ts-listbox="combobox" data-ts-combobox>
  <div class="ts combobox-control">
    <input id="c" data-ts-listbox-input role="combobox" aria-expanded="false" aria-controls="p" autocomplete="off" value="${valor === 'ar' ? 'Argentina' : valor === 'br' ? 'Brasil' : ''}" ${extra}>
    <input type="hidden" name="pais" value="${valor}" data-ts-listbox-value>
    <button type="button" id="limpiar" data-ts-clear aria-label="Limpiar campo" ${valor ? '' : 'hidden'}>x</button>
    <button type="button" id="chevron" tabindex="-1" data-ts-listbox-toggle aria-label="Mostrar opciones">v</button>
  </div>
  <div id="p" data-ts-listbox-panel role="listbox" popover="manual" hidden>
    <button type="button" role="option" id="p-0" tabindex="-1" data-ts-value="ar" aria-selected="${valor === 'ar'}">Argentina</button>
    <button type="button" role="option" id="p-1" tabindex="-1" data-ts-value="br" aria-selected="${valor === 'br'}">Brasil</button>
    <button type="button" role="option" id="p-2" tabindex="-1" data-ts-value="uy" aria-selected="${valor === 'uy'}">Uruguay</button>
    <div data-ts-listbox-empty hidden>Sin resultados</div>
  </div>
</div>
</form></div>`;
    const oculto = () => q<HTMLInputElement>('[data-ts-listbox-value]');
    const esperar = () => new Promise((r) => setTimeout(r, 5));

    it('chevron: el click enfoca el input y abre; el segundo click cierra y el foco sigue en el input', () => {
        montar(CB(''));
        const input = q<HTMLInputElement>('#c');
        q('#chevron').click();
        expect(document.activeElement).toBe(input);
        expect(q('#p').hidden).toBe(false);
        expect(input.getAttribute('aria-expanded')).toBe('true');

        q('#chevron').click();
        expect(q('#p').hidden).toBe(true);
        expect(document.activeElement).toBe(input);
    });

    it('chevron: con el foco en el input y el panel cerrado (tras Escape), abre', () => {
        montar(CB(''));
        const input = q<HTMLInputElement>('#c');
        input.focus();
        tecla(input, 'Escape');
        expect(q('#p').hidden).toBe(true);
        q('#chevron').click();
        expect(q('#p').hidden).toBe(false);
    });

    it('presionar el chevron o limpiar con mouse no le saca el foco al input; con toque sí se deja pasar', () => {
        montar(CB('ar'));
        const evento = (destino: Element, pointerType: string) => {
            const e = new Event('pointerdown', { bubbles: true, cancelable: true });
            Object.defineProperty(e, 'pointerType', { value: pointerType });
            destino.dispatchEvent(e);
            return e.defaultPrevented;
        };
        expect(evento(q('#chevron'), 'mouse')).toBe(true);
        expect(evento(q('#limpiar'), 'mouse')).toBe(true);
        expect(evento(q('#chevron'), 'touch')).toBe(false);
    });

    it('limpiar: vacía input y hidden, avisa con ts:change, se oculta, cierra y deja el foco en el input', () => {
        montar(CB('ar'));
        const input = q<HTMLInputElement>('#c');
        const avisos: unknown[] = [];
        const registrar = (e: Event) => avisos.push((e as CustomEvent).detail);
        document.addEventListener('ts:change', registrar);
        q('#limpiar').click();
        document.removeEventListener('ts:change', registrar);

        expect(input.value).toBe('');
        expect(oculto().value).toBe('');
        expect(qq('[role="option"]').every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);
        expect(avisos).toEqual([{ component: 'combobox', value: '', selection: [] }]);
        expect(q('#limpiar').hidden).toBe(true);
        expect(q('#p').hidden).toBe(true);
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(input);
    });

    it('limpiar: sin valor arranca oculto, elegir una opción lo muestra y con readonly o disabled no se ve', () => {
        montar(CB(''));
        expect(q('#limpiar').hidden).toBe(true);
        q<HTMLInputElement>('#c').focus();
        q('#p-1').click();
        expect(q('#limpiar').hidden).toBe(false);

        montar(CB('ar', 'readonly'));
        expect(q('#limpiar').hidden).toBe(true);
        montar(CB('ar', 'disabled'));
        expect(q('#limpiar').hidden).toBe(true);
    });

    it('readonly: enfocar, ArrowDown, el chevron, Enter y Tab no abren ni cambian nada', () => {
        montar(CB('ar', 'readonly'));
        const input = q<HTMLInputElement>('#c');
        input.focus();
        expect(q('#p').hidden).toBe(true);
        expect(tecla(input, 'ArrowDown')).toBe(true);
        expect(q('#p').hidden).toBe(true);
        q('#chevron').click();
        expect(q('#p').hidden).toBe(true);
        expect(tecla(input, 'Enter')).toBe(true);
        expect(tecla(input, 'Tab')).toBe(true);
        expect(oculto().value).toBe('ar');
        expect(input.value).toBe('Argentina');
    });

    it('form.reset(): vuelve al valor inicial (input, hidden y aria-selected) sin avisar', async () => {
        montar(CB('ar'));
        const input = q<HTMLInputElement>('#c');
        input.focus();
        q('#p-1').click();
        expect(oculto().value).toBe('br');

        const avisos: unknown[] = [];
        const registrar = (e: Event) => avisos.push(e);
        document.addEventListener('ts:change', registrar);
        q<HTMLFormElement>('#f').reset();
        await esperar();
        document.removeEventListener('ts:change', registrar);

        expect(input.value).toBe('Argentina');
        expect(oculto().value).toBe('ar');
        expect(q('#p-0').getAttribute('aria-selected')).toBe('true');
        expect(q('#p-1').getAttribute('aria-selected')).toBe('false');
        expect(q('#limpiar').hidden).toBe(false);
        expect(avisos).toEqual([]);
    });

    it('form.reset() sin valor inicial lo deja vacío; un reset cancelado no toca nada', async () => {
        montar(CB(''));
        const input = q<HTMLInputElement>('#c');
        input.focus();
        q('#p-1').click();
        q<HTMLFormElement>('#f').reset();
        await esperar();
        expect(input.value).toBe('');
        expect(oculto().value).toBe('');
        expect(q('#limpiar').hidden).toBe(true);

        input.focus();
        q('#p-1').click();
        q('#f').addEventListener('reset', (e) => e.preventDefault());
        q<HTMLFormElement>('#f').reset();
        await esperar();
        expect(oculto().value).toBe('br');
    });

    it('Escape con el panel abierto lo consume y no sigue hacia el contenedor; cerrado, sí llega', () => {
        montar(CB(''));
        const visto = vi.fn();
        window.addEventListener('keydown', visto);
        const input = q<HTMLInputElement>('#c');
        input.focus();
        tecla(input, 'Escape');
        expect(q('#p').hidden).toBe(true);
        expect(visto).not.toHaveBeenCalled();
        tecla(input, 'Escape');
        expect(visto).toHaveBeenCalledTimes(1);
        window.removeEventListener('keydown', visto);
    });
});

describe('Combobox: grupos y carga', () => {
    const GR = (extra = '', control = '') => `
<div data-ts-listbox="combobox" data-ts-combobox ${extra}>
  <div class="ts combobox-control ${control}">
    <input id="c" data-ts-listbox-input role="combobox" aria-expanded="false" aria-controls="p" autocomplete="off" value="">
    <span class="ts combobox-spinner" data-ts-listbox-spinner hidden><span class="ts spinner" role="status" aria-label="Cargando..."></span></span>
    <button type="button" tabindex="-1" data-ts-listbox-toggle aria-label="Mostrar opciones">v</button>
  </div>
  <div id="p" data-ts-listbox-panel role="listbox" popover="manual" hidden>
    <div class="ts combobox-loading" data-ts-listbox-loading hidden><span class="ts spinner size-sm" role="none" aria-hidden="true" aria-label=""></span><span>Cargando...</span></div>
    <div role="group" aria-labelledby="g-admin">
      <div id="g-admin" class="ts combobox-group-label">Admin</div>
      <button type="button" role="option" id="p-0" tabindex="-1" data-ts-value="ana" aria-selected="false">Ana Torres</button>
    </div>
    <div role="group" aria-labelledby="g-editor">
      <div id="g-editor" class="ts combobox-group-label">Editor</div>
      <button type="button" role="option" id="p-1" tabindex="-1" data-ts-value="bruno" aria-selected="false">Bruno Díaz</button>
      <button type="button" role="option" id="p-2" tabindex="-1" data-ts-value="carla" aria-selected="false">Carla Ruiz</button>
    </div>
    <div data-ts-listbox-empty hidden>Sin resultados</div>
  </div>
</div>`;
    const escribir = (texto: string) => {
        const input = q<HTMLInputElement>('#c');
        input.value = texto;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const grupo = (nombre: string) => qq('[role="group"]').find((g) => g.textContent?.includes(nombre))!;

    it('filtrar oculta el encabezado del grupo que queda sin opciones, y al borrar vuelve', () => {
        montar(GR());
        q('#c').focus();
        escribir('ruiz');
        expect(grupo('Admin').hidden).toBe(true);
        expect(grupo('Editor').hidden).toBe(false);
        expect(qq('[role="option"]').filter((o) => !o.hidden).map((o) => o.textContent)).toEqual(['Carla Ruiz']);
        escribir('');
        expect(qq('[role="group"]').every((g) => !g.hidden)).toBe(true);
    });

    it('las flechas recorren las opciones por grupo, sin pasar por los encabezados', () => {
        montar(GR());
        const input = q<HTMLInputElement>('#c');
        input.focus();
        const activa = () => document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent;
        expect(activa()).toBe('Ana Torres');
        tecla(input, 'ArrowDown');
        expect(activa()).toBe('Bruno Díaz');
        tecla(input, 'ArrowDown');
        tecla(input, 'ArrowDown');
        expect(activa()).toBe('Ana Torres');
    });

    it('sin resultados: los dos grupos ocultos y aparece "Sin resultados"', () => {
        montar(GR());
        q('#c').focus();
        escribir('zzz');
        expect(qq('[role="group"]').every((g) => g.hidden)).toBe(true);
        expect(q('[data-ts-listbox-empty]').hidden).toBe(false);
    });

    it('cargando(true): aria-busy en input y panel, is-loading, spinner y "Cargando..." visibles, sin "Sin resultados"', () => {
        montar(GR());
        const raiz = q('[data-ts-combobox]');
        q('#c').focus();
        escribir('zzz');
        setComboboxLoading(raiz, true);
        expect(q('#c').getAttribute('aria-busy')).toBe('true');
        expect(q('#p').getAttribute('aria-busy')).toBe('true');
        expect(q('.ts.combobox-control').classList.contains('is-loading')).toBe(true);
        expect(q('[data-ts-listbox-spinner]').hidden).toBe(false);
        expect(q('[data-ts-listbox-loading]').hidden).toBe(false);
        expect(q('[data-ts-listbox-empty]').hidden).toBe(true);

        setComboboxLoading(raiz, false);
        expect(q('#c').hasAttribute('aria-busy')).toBe(false);
        expect(q('#p').hasAttribute('aria-busy')).toBe(false);
        expect(q('.ts.combobox-control').classList.contains('is-loading')).toBe(false);
        expect(q('[data-ts-listbox-spinner]').hidden).toBe(true);
        expect(q('[data-ts-listbox-loading]').hidden).toBe(true);
        expect(q('[data-ts-listbox-empty]').hidden).toBe(false);
    });

    it('cargando no bloquea la edición: el input sigue avisando lo que se tipea (ts:change con termino)', () => {
        montar(GR());
        const avisos: unknown[] = [];
        document.addEventListener('ts:change', (e) => avisos.push((e as CustomEvent).detail));
        q('#c').focus();
        setComboboxLoading(q('[data-ts-combobox]'), true);
        escribir('ana');
        expect(q<HTMLInputElement>('#c').disabled).toBe(false);
        expect(avisos).toContainEqual({ component: 'combobox', query: 'ana' });
    });

    it('data-ts-async (búsqueda en el servidor): no filtra en el cliente', () => {
        montar(GR('data-ts-async'));
        q('#c').focus();
        escribir('ruiz');
        expect(qq('[role="option"]').every((o) => !o.hidden)).toBe(true);
        expect(qq('[role="group"]').every((g) => !g.hidden)).toBe(true);
    });
});

describe('Combobox y CommandPalette: el mouse activa la opción', () => {
    const mover = (el: Element) => el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    const CB = `
<div data-ts-listbox="combobox" data-ts-combobox>
  <input id="c" data-ts-listbox-input role="combobox" aria-expanded="false" aria-controls="p" autocomplete="off">
  <div id="p" data-ts-listbox-panel role="listbox" hidden>
    <button type="button" role="option" tabindex="-1" data-ts-value="a" aria-selected="false">Svelte</button>
    <button type="button" role="option" tabindex="-1" data-ts-value="b" aria-selected="false">React</button>
    <button type="button" role="option" tabindex="-1" data-ts-value="c" aria-disabled="true" aria-selected="false">Vue</button>
  </div>
</div>`;

    it('Combobox: pasar el mouse la marca is-focused y aria-activedescendant', () => {
        montar(CB);
        q('#c').focus();
        const [svelte, react, vue] = qq('[role="option"]');
        expect(svelte.classList.contains('is-focused')).toBe(true);
        mover(react);
        expect(react.classList.contains('is-focused')).toBe(true);
        expect(svelte.classList.contains('is-focused')).toBe(false);
        expect(q('#c').getAttribute('aria-activedescendant')).toBe(react.id);
        mover(vue);
        expect(react.classList.contains('is-focused')).toBe(true);
    });

    it('Combobox cerrado: el mouse no activa nada', () => {
        montar(CB);
        mover(qq('[role="option"]')[1]);
        expect(qq('[role="option"].is-focused')).toHaveLength(0);
    });

    it('Select: el hover no mueve la opción activa', () => {
        montar(SELECT);
        const trigger = q('[data-ts-listbox-trigger]');
        trigger.click();
        mover(qq('[role="option"]')[1]);
        expect(qq('[role="option"]')[1].classList.contains('is-focused')).toBe(false);
    });

    const CMD = `
<div data-ts-listbox="command" data-ts-command-palette data-ts-shortcut="k">
  <button type="button" data-ts-command-open>Abrir</button>
  <dialog data-ts-command-dialog>
    <input data-ts-listbox-input role="combobox" aria-expanded="true" aria-controls="lp" placeholder="Buscar comandos...">
    <div id="lp" data-ts-listbox-panel role="listbox">
      <div role="option" data-ts-value="nuevo" data-ts-keywords="crear">Nuevo archivo</div>
      <div role="option" data-ts-value="abrir">Abrir proyecto</div>
      <div role="option" data-ts-value="ajustes">Preferencias</div>
    </div>
    <div data-ts-listbox-empty data-ts-empty-for='Sin resultados para "{q}"' hidden>No hay comandos disponibles</div>
  </dialog>
</div>`;
    const abrirPaleta = () => {
        montar(CMD);
        const dlg = q<HTMLDialogElement>('dialog');
        dlg.showModal = () => dlg.setAttribute('open', '');
        dlg.close = () => dlg.removeAttribute('open');
        q('[data-ts-command-open]').click();
        return dlg;
    };

    it('CommandPalette: el mouse sobre una opción la resalta', () => {
        abrirPaleta();
        const opciones = qq('[role="option"]');
        mover(opciones[2]);
        expect(opciones[2].classList.contains('is-focused')).toBe(true);
        expect(opciones[0].classList.contains('is-focused')).toBe(false);
        expect(q('[data-ts-listbox-input]').getAttribute('aria-activedescendant')).toBe(opciones[2].id);
    });

    it('CommandPalette: Inicio y Fin no navegan y el espacio no elige', () => {
        abrirPaleta();
        const input = q('[data-ts-listbox-input]');
        const elegidos: unknown[] = [];
        document.addEventListener('ts:change', (e) => elegidos.push((e as CustomEvent).detail));
        tecla(input, 'ArrowDown');
        const activa = input.getAttribute('aria-activedescendant');
        tecla(input, 'End');
        expect(input.getAttribute('aria-activedescendant')).toBe(activa);
        tecla(input, 'Home');
        expect(input.getAttribute('aria-activedescendant')).toBe(activa);
        tecla(input, ' ');
        expect(elegidos).toEqual([]);
    });

    it('CommandPalette: Escape no lo consume el Core (cierra el <dialog> nativo en una pulsación) y no oculta la lista', () => {
        abrirPaleta();
        const input = q('[data-ts-listbox-input]');
        const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        input.dispatchEvent(ev);
        expect(ev.defaultPrevented).toBe(false);
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(q('[data-ts-listbox-panel]').hidden).toBe(false);
    });

    it('CommandPalette: presionar una opción con el mouse no le saca el foco a la entrada', () => {
        abrirPaleta();
        const ev = new Event('pointerdown', { bubbles: true, cancelable: true });
        Object.defineProperty(ev, 'pointerType', { value: 'mouse' });
        qq('[role="option"]')[1].dispatchEvent(ev);
        expect(ev.defaultPrevented).toBe(true);
    });

    it('CommandPalette: sin coincidencias, el texto de vacío incluye la búsqueda; sin búsqueda, el genérico', () => {
        abrirPaleta();
        const input = q<HTMLInputElement>('[data-ts-listbox-input]');
        input.value = 'zzz';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(q('[data-ts-listbox-empty]').hidden).toBe(false);
        expect(q('[data-ts-listbox-empty]').textContent).toBe('Sin resultados para "zzz"');
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(q('[data-ts-listbox-empty]').hidden).toBe(true);
        expect(q('[data-ts-listbox-empty]').textContent).toBe('No hay comandos disponibles');
    });
});

describe('Combobox: opciones ricas', () => {
    const RICO = `
<div data-ts-listbox="combobox" data-ts-combobox>
  <input id="c" data-ts-listbox-input role="combobox" aria-expanded="false" aria-controls="p" autocomplete="off">
  <input type="hidden" name="plan" value="" data-ts-listbox-value>
  <div id="p" data-ts-listbox-panel role="listbox" hidden>
    <button type="button" role="option" id="p-0" tabindex="-1" data-ts-value="free" aria-selected="false" aria-labelledby="l0" aria-describedby="d0">
      <span data-select-option-icon aria-hidden="true">i</span>
      <span data-select-option-text><span id="l0" data-select-option-label>Free</span><span id="d0" data-select-option-description>Para probar el workspace.</span></span>
    </button>
    <button type="button" role="option" id="p-1" tabindex="-1" data-ts-value="pro" aria-selected="false">Pro</button>
  </div>
</div>`;

    it('elegir una opción rica escribe sólo su label en el campo', () => {
        montar(RICO);
        const input = q<HTMLInputElement>('#c');
        input.focus();
        qq('[role="option"]')[0].click();
        expect(input.value).toBe('Free');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('free');
    });

    it('filtra por el label y no por la descripción', () => {
        montar(RICO);
        const input = q<HTMLInputElement>('#c');
        input.focus();
        input.value = 'workspace';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(qq('[role="option"]').every((o) => o.hidden)).toBe(true);
        input.value = 'free';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(qq('[role="option"]').filter((o) => !o.hidden)).toHaveLength(1);
    });

    it('Escape revierte al label (no a todo el texto de la opción rica elegida)', () => {
        montar(RICO);
        const input = q<HTMLInputElement>('#c');
        input.focus();
        qq('[role="option"]')[0].click();
        input.focus();
        input.value = 'xx';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        tecla(input, 'Escape');
        expect(input.value).toBe('Free');
    });
});
