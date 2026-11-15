// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { init, toast, clearToasts, setTexts } from './index';
import { idiomaDe, localeDe } from './textos';

function montar(html: string): HTMLElement {
    document.body.innerHTML = html;
    init(document);
    return document.body.firstElementChild as HTMLElement;
}
const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const cierre = () => q('[data-toast-close]').getAttribute('aria-label');

const PAGINACION = `
<nav data-ts-pagination data-ts-total="20" data-ts-page="1" data-ts-items="200" data-ts-page-size="10">
  <span data-ts-page-label></span>
  <button data-ts-page-prev disabled>‹</button>
  <div data-ts-pagination-list><button data-ts-page-item data-ts-value="1" aria-label="Page 1">1</button></div>
  <button data-ts-page-next>›</button>
</nav>`;

const MULTIPLE = `
<div class="ts select" data-ts-listbox="select" data-ts-select data-ts-multiple>
  <button type="button" data-ts-listbox-trigger role="combobox" aria-expanded="false" aria-controls="p">
    <span data-ts-listbox-label data-ts-placeholder="Environment">Environment</span>
  </button>
  <input type="hidden" disabled data-ts-listbox-template name="entorno">
  <div id="p" data-ts-listbox-panel role="listbox" hidden>
    <div role="option" data-ts-value="staging" aria-selected="false">Staging</div>
    <div role="option" data-ts-value="produccion" aria-selected="false">Production</div>
  </div>
</div>`;

const SUBIDA = `
<div data-ts-file-upload data-ts-max-size="100">
  <input type="file" data-ts-file-input accept="text/plain" multiple hidden>
  <ul data-ts-file-list></ul>
</div>`;

const soltar = (raiz: HTMLElement) => {
    const e = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    const archivos = [new File([new Uint8Array(200)], 'grande.txt', { type: 'text/plain' }), new File(['x'], 'logo.png', { type: 'image/png' })];
    Object.defineProperty(e, 'dataTransfer', { value: { files: archivos } });
    raiz.dispatchEvent(e);
    return [...document.querySelectorAll('[data-ts-file-item]')].map((f) => f.textContent);
};

const elegirDos = () => {
    montar(MULTIPLE);
    q('[data-ts-value="staging"]').click();
    q('[data-ts-value="produccion"]').click();
    return q('[data-ts-listbox-label]').textContent;
};

beforeEach(() => {
    document.documentElement.removeAttribute('lang');
    document.body.innerHTML = '';
    clearToasts();
});

afterEach(() => {
    document.documentElement.removeAttribute('lang');
    delete (globalThis as Record<symbol, unknown>)[Symbol.for('taisho.core.textos')];
});

describe('textos del Core: el idioma sale de la página', () => {
    it('lang="en": los textos salen en inglés', () => {
        document.documentElement.lang = 'en';
        toast('Saved');
        expect(cierre()).toBe('Close notification');
        montar(PAGINACION);
        q('[data-ts-page-next]').click();
        expect(q('[data-ts-page-label]').textContent).toBe('11–20 of 200');
        expect(elegirDos()).toBe('2 selected');
        expect(soltar(montar(SUBIDA))).toEqual(['grande.txt — File too large (max 100 B)', "logo.png — This file type isn't allowed."]);
    });

    it('lang="es": los textos salen en español', () => {
        document.documentElement.lang = 'es';
        toast('Guardado');
        expect(cierre()).toBe('Cerrar notificación');
        montar(PAGINACION);
        q('[data-ts-page-next]').click();
        expect(q('[data-ts-page-label]').textContent).toBe('11–20 de 200');
        expect(elegirDos()).toBe('2 seleccionados');
        expect(soltar(montar(SUBIDA))).toEqual(['grande.txt — Demasiado grande (máx. 100 B)', 'logo.png — Tipo de archivo no permitido']);
    });

    it('una región como es-AR usa el español; mayúsculas y minúsculas dan igual', () => {
        document.documentElement.lang = 'ES-ar';
        toast('Guardado');
        expect(cierre()).toBe('Cerrar notificación');
    });

    it('el lang más cercano al componente gana sobre el del documento', () => {
        document.documentElement.lang = 'en';
        const raiz = montar(`<section lang="es">${SUBIDA}</section>`).firstElementChild as HTMLElement;
        expect(soltar(raiz)[0]).toBe('grande.txt — Demasiado grande (máx. 100 B)');
    });

    it('un idioma que el Core no trae cae al inglés', () => {
        document.documentElement.lang = 'fr';
        toast('Enregistré');
        expect(cierre()).toBe('Close notification');
    });

    it('sin lang en la página, inglés', () => {
        toast('Saved');
        expect(cierre()).toBe('Close notification');
    });

    it('lo que escribe el HTML gana sobre los textos del Core', () => {
        document.documentElement.lang = 'en';
        const raiz = montar(SUBIDA.replace('data-ts-max-size="100"', 'data-ts-max-size="100" data-ts-file-error-size="Muy pesado"'));
        expect(soltar(raiz)[0]).toBe('grande.txt — Muy pesado');
        toast('Saved', { dismissLabel: 'Dismiss' });
        expect(cierre()).toBe('Dismiss');
    });
});

describe('setTexts', () => {
    it('suma un idioma, antes o después de init()', () => {
        document.documentElement.lang = 'fr';
        setTexts('fr', { closeNotification: 'Fermer la notification', selectedCount: 'sélectionnés' });
        toast('Enregistré');
        expect(cierre()).toBe('Fermer la notification');
        expect(elegirDos()).toBe('2 sélectionnés');
    });

    it('lo que no se redefine sigue siendo el del Core, o el inglés si el idioma es nuevo', () => {
        document.documentElement.lang = 'fr';
        setTexts('fr', { closeNotification: 'Fermer' });
        montar(PAGINACION);
        q('[data-ts-page-next]').click();
        expect(q('[data-ts-page-label]').textContent).toBe('11–20 of 200');
    });

    it('sobrescribe un idioma que ya viene, y las llamadas se acumulan', () => {
        document.documentElement.lang = 'es';
        setTexts('es', { closeNotification: 'Cerrar aviso' });
        setTexts('es', { fileTypeNotAllowed: 'Ese formato no se puede subir' });
        toast('Guardado');
        expect(cierre()).toBe('Cerrar aviso');
        expect(soltar(montar(SUBIDA))).toEqual(['grande.txt — Demasiado grande (máx. 100 B)', 'logo.png — Ese formato no se puede subir']);
    });

    it('un texto con función recibe el valor ya formateado', () => {
        document.documentElement.lang = 'en';
        setTexts('en', { fileTooLarge: (max) => `Over ${max}` });
        expect(soltar(montar(SUBIDA))[0]).toBe('grande.txt — Over 100 B');
    });

    it('una etiqueta con región prefiere la propia y, si no la tiene, la del idioma base', () => {
        document.documentElement.lang = 'pt-BR';
        setTexts('pt', { closeNotification: 'Fechar notificação' });
        toast('Salvo');
        expect(cierre()).toBe('Fechar notificação');
        setTexts('PT-br', { closeNotification: 'Fechar aviso' });
        clearToasts();
        toast('Salvo');
        expect(cierre()).toBe('Fechar aviso');
    });
});

describe('idioma de fechas y números', () => {
    it('sale del lang cuando el HTML no trae data-ts-locale; sin lang o con uno inválido, inglés', () => {
        const el = montar('<div></div>');
        expect(localeDe(el)).toBe('en');
        document.documentElement.lang = 'es-ar';
        expect(localeDe(el)).toBe('es-AR');
        expect(idiomaDe(el)).toBe('es-ar');
        document.documentElement.lang = 'no es un idioma';
        expect(localeDe(el)).toBe('en');
    });

    it('el calendario nombra los días en el idioma de la página', () => {
        const nombreDelDia = () => {
            montar('<div data-ts-date-picker data-ts-value="2026-07-07" data-ts-month="2026-07-01"><div data-ts-date-grid></div></div>');
            return q('[data-ts-date-day][data-ts-value="2026-07-07"]').getAttribute('aria-label');
        };
        document.documentElement.lang = 'en';
        expect(nombreDelDia()).toContain('July');
        document.documentElement.lang = 'es';
        expect(nombreDelDia()).toContain('julio');
    });
});
