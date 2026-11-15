// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach } from 'vitest';
import { activar, idNuevo } from './listbox';

const N = 200;

function montar(): { raiz: HTMLElement; opciones: HTMLElement[] } {
    document.body.innerHTML = `
      <div data-ts-listbox="select">
        <button type="button" data-ts-listbox-trigger role="combobox" aria-expanded="true" aria-controls="p"></button>
        <div id="p" data-ts-listbox-panel role="listbox">
          ${Array.from({ length: N }, (_, i) => `<div role="option">Proyecto ${i}</div>`).join('')}
        </div>
      </div>`;
    const raiz = document.querySelector<HTMLElement>('[data-ts-listbox]')!;
    return { raiz, opciones: [...raiz.querySelectorAll<HTMLElement>('[role="option"]')] };
}

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('ids de opción sin id propio', () => {
    it('activar muchas opciones en el mismo tick no repite ids', () => {
        const { raiz, opciones } = montar();
        for (const o of opciones) activar(raiz, o);
        const ids = opciones.map((o) => o.id);
        expect(ids.every(Boolean)).toBe(true);
        expect(new Set(ids).size).toBe(N);
    });

    it('la opción activa queda apuntada por aria-activedescendant', () => {
        const { raiz, opciones } = montar();
        activar(raiz, opciones[3]);
        expect(raiz.querySelector('[role="combobox"]')!.getAttribute('aria-activedescendant')).toBe(opciones[3].id);
    });

    it('no pisa un id que la opción ya trae ni reutiliza uno que la página ya usa', () => {
        const { raiz, opciones } = montar();
        opciones[0].id = 'mio';
        activar(raiz, opciones[0]);
        expect(opciones[0].id).toBe('mio');
        const siguiente = idNuevo(document);
        const ocupado = document.createElement('i');
        ocupado.id = siguiente.replace(/\d+$/, (n) => String(Number(n) + 1));
        document.body.append(ocupado);
        expect(idNuevo(document)).not.toBe(ocupado.id);
    });
});
