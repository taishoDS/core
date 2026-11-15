// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { init } from './index';
import { nextIndex } from './roving';

function montar(html: string): HTMLElement {
    document.body.innerHTML = html;
    init(document);
    return document.body.firstElementChild as HTMLElement;
}

const ACORDEON = `
<div data-ts-accordion>
  <details data-ts-accordion-item data-ts-value="uno">
    <summary data-ts-accordion-trigger>Uno</summary>
    <div data-ts-accordion-content id="p1">Contenido uno</div>
  </details>
  <details data-ts-accordion-item data-ts-value="dos">
    <summary data-ts-accordion-trigger>Dos</summary>
    <div data-ts-accordion-content id="p2">Contenido dos</div>
  </details>
</div>`;

const TABS = `
<div data-ts-tabs>
  <div role="tablist">
    <button role="tab" data-ts-tabs-tab data-ts-value="a" aria-selected="true" tabindex="0">A</button>
    <button role="tab" data-ts-tabs-tab data-ts-value="b" aria-selected="false" tabindex="-1">B</button>
    <button role="tab" data-ts-tabs-tab data-ts-value="c" aria-selected="false" tabindex="-1" disabled>C</button>
  </div>
  <div role="tabpanel" data-ts-tabs-panel data-ts-value="a">Panel A</div>
  <div role="tabpanel" data-ts-tabs-panel data-ts-value="b" hidden>Panel B</div>
</div>`;

const trigger = (n: number) =>
    document.querySelectorAll<HTMLElement>('[data-ts-accordion-trigger]')[n];
const abierto = (n: number) => document.querySelectorAll<HTMLDetailsElement>('details[data-ts-accordion-item]')[n].open;
const tab = (v: string) =>
    document.querySelector<HTMLElement>(`[data-ts-tabs-tab][data-ts-value="${v}"]`)!;
const tabPanel = (v: string) =>
    document.querySelector<HTMLElement>(`[data-ts-tabs-panel][data-ts-value="${v}"]`)!;

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('Accordion', () => {
    it('abre el ítem al hacer click', () => {
        montar(ACORDEON);
        expect(abierto(0)).toBe(false);

        trigger(0).click();

        expect(abierto(0)).toBe(true);
    });

    it('cierra el que estaba abierto: sin data-ts-multiple sólo uno queda abierto', () => {
        montar(ACORDEON);
        trigger(0).click();
        trigger(1).click();

        expect(abierto(0)).toBe(false);
        expect(abierto(1)).toBe(true);
    });

    it('con data-ts-multiple deja abiertos los dos', () => {
        montar(ACORDEON.replace('data-ts-accordion>', 'data-ts-accordion data-ts-multiple>'));
        trigger(0).click();
        trigger(1).click();

        expect(abierto(0)).toBe(true);
        expect(abierto(1)).toBe(true);
    });

    it('un trigger con aria-disabled no hace nada', () => {
        montar(ACORDEON);
        trigger(0).setAttribute('aria-disabled', 'true');
        trigger(0).click();

        expect(abierto(0)).toBe(false);
    });

    it('emite ts:change con el valor y el estado nuevo', () => {
        const raiz = montar(ACORDEON);
        const espia = vi.fn();
        raiz.addEventListener('ts:change', espia);

        trigger(1).click();

        expect(espia).toHaveBeenCalledTimes(1);
        expect(espia.mock.calls[0][0].detail).toEqual({
            component: 'accordion',
            value: 'dos',
            openItems: ['dos'],
        });
    });

    it('abrir y cerrar desde código: sin avisar ts:change', async () => {
        const raiz = montar(ACORDEON);
        const espia = vi.fn();
        raiz.addEventListener('ts:change', espia);
        const item = document.querySelectorAll<HTMLDetailsElement>('details[data-ts-accordion-item]')[0];

        item.open = true;
        await Promise.resolve();
        expect(abierto(0)).toBe(true);

        item.open = false;
        await Promise.resolve();
        expect(abierto(0)).toBe(false);
        expect(espia).not.toHaveBeenCalled();
    });

    it('abrir desde código sin data-ts-multiple cierra el que estaba abierto', async () => {
        montar(ACORDEON);
        await Promise.resolve();
        trigger(0).click();

        document.querySelectorAll<HTMLDetailsElement>('details[data-ts-accordion-item]')[1].open = true;
        await Promise.resolve();

        expect(abierto(1)).toBe(true);
        expect(abierto(0)).toBe(false);
    });

    it('si el HTML trae dos abiertos sin data-ts-multiple, init deja el primero', () => {
        montar(ACORDEON.replaceAll('<details ', '<details open '));

        expect(abierto(0)).toBe(true);
        expect(abierto(1)).toBe(false);
    });

    it('después de abrir desde código, el click sigue funcionando y avisa una sola vez', async () => {
        const raiz = montar(ACORDEON);
        const espia = vi.fn();
        raiz.addEventListener('ts:change', espia);
        document.querySelectorAll<HTMLDetailsElement>('details[data-ts-accordion-item]')[0].open = true;
        await Promise.resolve();

        trigger(0).click();
        await Promise.resolve();

        expect(abierto(0)).toBe(false);
        expect(espia).toHaveBeenCalledTimes(1);
    });

    it('si la app cancela el evento, el ítem no se abre', () => {
        const raiz = montar(ACORDEON);
        raiz.addEventListener('ts:change', (e) => e.preventDefault());

        trigger(0).click();

        expect(abierto(0)).toBe(false);
    });

    it('anda con HTML agregado DESPUÉS de init (por eso es delegación)', () => {
        montar('<div id="host"></div>');
        document.getElementById('host')!.innerHTML = ACORDEON;

        trigger(0).click();

        expect(abierto(0)).toBe(true);
    });
});

describe('Tabs', () => {
    it('cambia de panel al hacer click', () => {
        montar(TABS);
        tab('b').click();

        expect(tabPanel('a').hidden).toBe(true);
        expect(tabPanel('b').hidden).toBe(false);
        expect(tab('b').getAttribute('aria-selected')).toBe('true');
        expect(tab('a').getAttribute('aria-selected')).toBe('false');
    });

    it('mueve el roving tabindex: sólo la activa es tabulable', () => {
        montar(TABS);
        tab('b').click();

        expect(tab('b').tabIndex).toBe(0);
        expect(tab('a').tabIndex).toBe(-1);
    });

    it('navega con las flechas y saltea las deshabilitadas', () => {
        montar(TABS);
        tab('a').focus();
        tab('a').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

        expect(document.activeElement).toBe(tab('b'));

        tab('b').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(document.activeElement).toBe(tab('a'));
    });

    it('Home y End van a los extremos', () => {
        montar(TABS);
        tab('a').focus();
        tab('a').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(document.activeElement).toBe(tab('b'));

        tab('b').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
        expect(document.activeElement).toBe(tab('a'));
    });

    it('NO consume las teclas que no navegan', () => {
        montar(TABS);
        const e = new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true });
        tab('a').dispatchEvent(e);

        expect(e.defaultPrevented).toBe(false);
    });
    it('vincula cada pestaña con su panel: id, aria-controls, aria-labelledby y tabindex', () => {
        montar(TABS);

        expect(tab('a').id).not.toBe('');
        expect(tabPanel('a').id).not.toBe('');
        expect(tab('a').getAttribute('aria-controls')).toBe(tabPanel('a').id);
        expect(tabPanel('a').getAttribute('aria-labelledby')).toBe(tab('a').id);
        expect(tab('b').getAttribute('aria-controls')).toBe(tabPanel('b').id);
        expect(tabPanel('b').getAttribute('aria-labelledby')).toBe(tab('b').id);
        expect(tabPanel('a').getAttribute('tabindex')).toBe('0');
        expect(new Set([tab('a').id, tab('b').id, tabPanel('a').id, tabPanel('b').id]).size).toBe(4);
    });

    it('una pestaña sin panel no apunta a la nada', () => {
        montar(TABS);

        expect(tab('c').hasAttribute('aria-controls')).toBe(false);
    });

    it('respeta los ids y los atributos que el autor escribió', () => {
        montar(`
<div data-ts-tabs>
  <div role="tablist">
    <button role="tab" id="mi-tab" data-ts-tabs-tab data-ts-value="a" aria-selected="true" tabindex="0">A</button>
  </div>
  <div role="tabpanel" id="mi-panel" aria-labelledby="otro" tabindex="-1" data-ts-tabs-panel data-ts-value="a">Panel A</div>
</div>`);

        expect(tab('a').id).toBe('mi-tab');
        expect(tabPanel('a').id).toBe('mi-panel');
        expect(tab('a').getAttribute('aria-controls')).toBe('mi-panel');
        expect(tabPanel('a').getAttribute('aria-labelledby')).toBe('otro');
        expect(tabPanel('a').getAttribute('tabindex')).toBe('-1');
    });

    it('dos grupos en la página no comparten ids', () => {
        document.body.innerHTML = TABS + TABS;
        init(document);
        const ids = [...document.querySelectorAll('[data-ts-tabs-tab], [data-ts-tabs-panel]')].map((e) => e.id).filter(Boolean);

        expect(ids.length).toBeGreaterThan(4);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('horizontal: ↑ y ↓ no cambian de pestaña ni se consumen', () => {
        montar(TABS);
        tab('a').focus();
        const abajo = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
        tab('a').dispatchEvent(abajo);

        expect(abajo.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(tab('a'));
        expect(tab('a').getAttribute('aria-selected')).toBe('true');
    });

    it('vertical: ↑ y ↓ navegan y ← → no', () => {
        montar(TABS.replace('<div role="tablist">', '<div role="tablist" aria-orientation="vertical">'));
        tab('a').focus();
        const derecha = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
        tab('a').dispatchEvent(derecha);
        expect(derecha.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(tab('a'));

        tab('a').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).toBe(tab('b'));
        tab('b').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(document.activeElement).toBe(tab('a'));
    });

    it('RTL: ← avanza y → retrocede', () => {
        montar(TABS.replace('<div role="tablist">', '<div role="tablist" style="direction: rtl">'));
        tab('a').focus();
        tab('a').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(document.activeElement).toBe(tab('b'));
        tab('b').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(document.activeElement).toBe(tab('a'));
    });
});

describe('roving (lógica pura)', () => {
    it('envuelve en los dos sentidos', () => {
        expect(nextIndex('ArrowRight', 2, 3)).toBe(0);
        expect(nextIndex('ArrowLeft', 0, 3)).toBe(2);
    });

    it('devuelve null cuando la tecla no navega', () => {
        expect(nextIndex('a', 0, 3)).toBeNull();
    });

    it('devuelve null si el grupo está vacío, en vez de dividir por cero', () => {
        expect(nextIndex('ArrowRight', 0, 0)).toBeNull();
    });
    it('con orientación sólo responde el eje de esa orientación', () => {
        expect(nextIndex('ArrowDown', 0, 3, { orientation: 'horizontal' })).toBeNull();
        expect(nextIndex('ArrowUp', 0, 3, { orientation: 'horizontal' })).toBeNull();
        expect(nextIndex('ArrowRight', 0, 3, { orientation: 'vertical' })).toBeNull();
        expect(nextIndex('ArrowLeft', 0, 3, { orientation: 'vertical' })).toBeNull();
        expect(nextIndex('ArrowRight', 0, 3, { orientation: 'horizontal' })).toBe(1);
        expect(nextIndex('ArrowDown', 0, 3, { orientation: 'vertical' })).toBe(1);
        expect(nextIndex('ArrowUp', 0, 3, { orientation: 'vertical' })).toBe(2);
    });

    it('rtl invierte ← y →, no ↑ ↓, y Inicio/Fin siguen siendo los extremos', () => {
        expect(nextIndex('ArrowRight', 1, 3, { orientation: 'horizontal', rtl: true })).toBe(0);
        expect(nextIndex('ArrowLeft', 1, 3, { orientation: 'horizontal', rtl: true })).toBe(2);
        expect(nextIndex('ArrowDown', 1, 3, { orientation: 'vertical', rtl: true })).toBe(2);
        expect(nextIndex('Home', 2, 3, { orientation: 'horizontal', rtl: true })).toBe(0);
        expect(nextIndex('End', 0, 3, { orientation: 'horizontal', rtl: true })).toBe(2);
    });

    it('sin orientación (grupo de radios) responden las cuatro flechas', () => {
        expect(nextIndex('ArrowDown', 0, 3)).toBe(1);
        expect(nextIndex('ArrowUp', 0, 3)).toBe(2);
        expect(nextIndex('ArrowRight', 0, 3, { rtl: true })).toBe(2);
        expect(nextIndex('ArrowDown', 0, 3, { rtl: true })).toBe(1);
    });
});

describe('init', () => {
    it('es idempotente: no duplica el manejo del click', () => {
        const raiz = montar(ACORDEON);
        init(document);
        init(document);
        const espia = vi.fn();
        raiz.addEventListener('ts:change', espia);

        trigger(0).click();

        expect(espia).toHaveBeenCalledTimes(1);
    });
});

describe('Table (Core) — cancelar ts:change sólo frena el movimiento de filas', () => {
    const TABLA = `
<div data-ts-table>
  <table>
    <thead><tr>
      <th data-ts-th data-ts-key="proyecto" aria-sort="none">Proyecto</th>
      <th data-ts-th data-ts-key="estado" aria-sort="none">Estado</th>
    </tr></thead>
    <tbody data-ts-table-body>
      <tr data-ts-row><td data-ts-cell="proyecto">Sitio marketing</td><td data-ts-cell="estado">Listo</td></tr>
      <tr data-ts-row><td data-ts-cell="proyecto">API de pagos</td><td data-ts-cell="estado">En cola</td></tr>
    </tbody>
  </table>
</div>`;
    const th = (clave: string) => document.querySelector<HTMLElement>(`[data-ts-key="${clave}"]`)!;
    const primera = () => document.querySelector('[data-ts-row]')!.textContent;
    function montarCancelando() {
        const raiz = montar(TABLA);
        const avisos: unknown[] = [];
        raiz.addEventListener('ts:change', (e) => {
            avisos.push((e as CustomEvent).detail);
            e.preventDefault();
        });
        return { raiz, avisos };
    }

    it('dos clics con el evento cancelado dan asc y luego desc, con el detail documentado', () => {
        const { avisos } = montarCancelando();
        th('proyecto').click();
        th('proyecto').click();
        expect(avisos).toEqual([
            { component: 'table', key: 'proyecto', direction: 'asc' },
            { component: 'table', key: 'proyecto', direction: 'desc' },
        ]);
    });

    it('no mueve las filas, pero avanza data-ts-sort-key, data-ts-sort-dir y aria-sort', () => {
        const { raiz } = montarCancelando();
        const antes = primera();
        th('proyecto').click();
        th('proyecto').click();
        expect(primera()).toBe(antes);
        expect(raiz.getAttribute('data-ts-sort-key')).toBe('proyecto');
        expect(raiz.getAttribute('data-ts-sort-dir')).toBe('desc');
        expect(th('proyecto').getAttribute('aria-sort')).toBe('descending');
        expect(th('proyecto')).toHaveClass('is-sorted');
    });

    it('al pasar a otra columna arranca en asc y la anterior vuelve a none', () => {
        const { avisos } = montarCancelando();
        th('proyecto').click();
        th('proyecto').click();
        th('estado').click();
        expect(avisos.at(-1)).toEqual({ component: 'table', key: 'estado', direction: 'asc' });
        expect(th('estado').getAttribute('aria-sort')).toBe('ascending');
        expect(th('proyecto').getAttribute('aria-sort')).toBe('none');
        expect(th('proyecto')).not.toHaveClass('is-sorted');
    });

    it('sin cancelar, sigue ordenando las filas', () => {
        montar(TABLA);
        th('proyecto').click();
        expect(primera()).toContain('API de pagos');
    });
});

describe('Table + Pagination (Core) — ordenar en el servidor', () => {
    it('la receta de la doc: pide la página 1 con el orden nuevo, reemplaza las filas y sigue el orden al repetir', async () => {
        const raiz = montar(`
<div>
  <div data-ts-table>
    <table>
      <thead><tr><th data-ts-th data-ts-key="proyecto" aria-sort="none">Proyecto</th></tr></thead>
      <tbody data-ts-table-body><tr data-ts-row><td data-ts-cell="proyecto">Sitio marketing</td></tr></tbody>
    </table>
  </div>
  <nav data-ts-pagination data-ts-total="6" data-ts-page="3">
    <div data-ts-pagination-list><button data-ts-page-item data-ts-value="3" aria-current="page">3</button></div>
  </nav>
</div>`);
        const tabla = raiz.querySelector<HTMLElement>('[data-ts-table]')!;
        const paginador = raiz.querySelector<HTMLElement>('[data-ts-pagination]')!;
        const cuerpo = raiz.querySelector<HTMLElement>('[data-ts-table-body]')!;
        const th = raiz.querySelector<HTMLElement>('[data-ts-th]')!;
        const pedidos: string[] = [];

        tabla.addEventListener('ts:change', (e) => {
            const { key: clave, direction: direccion } = (e as CustomEvent).detail;
            e.preventDefault();
            paginador.setAttribute('data-ts-page', '1');
            pedidos.push(`${clave}:${direccion}:1`);
            cuerpo.innerHTML = `<tr data-ts-row><td data-ts-cell="proyecto">${direccion}</td></tr>`;
        });

        th.click();
        expect(cuerpo.textContent).toBe('asc');
        th.click();
        expect(cuerpo.textContent).toBe('desc');
        expect(pedidos).toEqual(['proyecto:asc:1', 'proyecto:desc:1']);

        await new Promise((r) => setTimeout(r));
        expect(paginador.querySelector('[aria-current="page"]')?.textContent).toBe('1');
    });
});

describe('Table (Core) virtualizada — SU6: el relleno viaja por variables', () => {
    it('pone is-padded y --ts-table-pad-start/-end en el tbody, sin padding inline', () => {
        const filas = Array.from({ length: 200 }, (_, i) => `<tr data-ts-row><td>Fila ${i}</td></tr>`).join('');
        const raiz = montar(`
<div data-ts-table data-ts-row-height="40"><div data-ts-table-scroll>
<table><tbody class="ts table-body" data-ts-table-body>${filas}</tbody></table></div></div>`);
        const tbody = raiz.querySelector<HTMLElement>('[data-ts-table-body]')!;
        expect(tbody).toHaveClass('is-padded');
        expect(tbody.style.getPropertyValue('--ts-table-pad-start')).toBe('0px');
        expect(parseFloat(tbody.style.getPropertyValue('--ts-table-pad-end'))).toBeGreaterThan(7000);
        expect(tbody.style.paddingBlockEnd).toBe('');
    });
});
