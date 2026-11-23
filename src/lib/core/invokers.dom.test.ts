// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { init } from './index';
import { soportado, cierrePorFondoSoportado, alPresionarDisparador, alCerrarDialogo } from './invokers';

const HTML = `
<button type="button" id="abrir" commandfor="d" command="show-modal">Abrir</button>
<dialog id="d">
    <button type="button" id="cerrar" commandfor="d" command="close">Cerrar</button>
    <button type="button" id="pedir" commandfor="d" command="request-close">Pedir cierre</button>
</dialog>`;

const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

beforeEach(() => {
    document.body.innerHTML = HTML;
    init(document);
});

afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLButtonElement.prototype as { command?: string }).command;
});

describe('Respaldo de invoker commands (navegador sin soporte)', () => {
    it('jsdom no trae invokers: se detecta por capacidad', () => {
        expect(soportado()).toBe(false);
    });

    it('show-modal abre el diálogo y close lo cierra', () => {
        const d = q<HTMLDialogElement>('#d');
        q('#abrir').click();
        expect(d.open).toBe(true);
        q('#cerrar').click();
        expect(d.open).toBe(false);
    });

    it('devuelve el foco al disparador al cerrar', () => {
        q('#abrir').click();
        q('#cerrar').focus();
        q('#cerrar').click();
        expect(document.activeElement).toBe(q('#abrir'));
    });

    it('request-close lanza cancel y cierra; si se cancela, queda abierto', () => {
        const d = q<HTMLDialogElement>('#d');
        q('#abrir').click();
        q('#pedir').click();
        expect(d.open).toBe(false);
        q('#abrir').click();
        d.addEventListener('cancel', (e) => e.preventDefault());
        q('#pedir').click();
        expect(d.open).toBe(true);
    });

    it('emite el evento command en el destino con command y source, y respeta preventDefault', () => {
        const d = q<HTMLDialogElement>('#d');
        const visto: { command?: string; source?: unknown }[] = [];
        d.addEventListener('command', (e) => {
            visto.push({ command: (e as Event & { command: string }).command, source: (e as Event & { source: unknown }).source });
            e.preventDefault();
        });
        q('#abrir').click();
        expect(visto).toEqual([{ command: 'show-modal', source: q('#abrir') }]);
        expect(d.open).toBe(false);
    });

    it('un comando propio (--) sólo emite el evento', () => {
        document.body.insertAdjacentHTML('beforeend', '<button type="button" id="x" commandfor="d" command="--girar">x</button>');
        const alComando = vi.fn();
        q('#d').addEventListener('command', alComando);
        q('#x').click();
        expect(alComando).toHaveBeenCalledTimes(1);
        expect(q<HTMLDialogElement>('#d').open).toBe(false);
    });

    it('un clic cancelado o un botón deshabilitado no ejecutan nada', () => {
        const d = q<HTMLDialogElement>('#d');
        q('#abrir').addEventListener('click', (e) => e.preventDefault());
        q('#abrir').click();
        expect(d.open).toBe(false);
        document.body.insertAdjacentHTML('beforeend', '<button type="button" id="off" commandfor="d" command="show-modal" disabled>x</button>');
        q('#off').click();
        expect(d.open).toBe(false);
    });

    it('un destino que no existe no rompe', () => {
        document.body.insertAdjacentHTML('beforeend', '<button type="button" id="roto" commandfor="nada" command="show-modal">x</button>');
        expect(() => q('#roto').click()).not.toThrow();
    });

    it('con soporte nativo no hace nada', () => {
        Object.defineProperty(HTMLButtonElement.prototype, 'command', { value: '', configurable: true, writable: true });
        expect(soportado()).toBe(true);
        q('#abrir').click();
        expect(q<HTMLDialogElement>('#d').open).toBe(false);
    });
});

describe('Respaldo de closedby="any" (navegador sin soporte)', () => {
    const FONDO = `
<button type="button" id="abrir" commandfor="d" command="show-modal">Abrir</button>
<dialog id="d" closedby="any"><button type="button" id="dentro">Dentro</button></dialog>
<main id="fuera">Página</main>`;

    const clic = (el: Element, abajo = true) => {
        if (abajo) el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 500 }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 500, clientY: 500 }));
    };

    beforeEach(() => {
        const matches = Element.prototype.matches;
        vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
            return selector === ':modal' ? this.hasAttribute('open') : matches.call(this, selector);
        });
        document.body.innerHTML = FONDO;
        init(document);
        q('#abrir').click();
    });

    it('jsdom no trae closedBy: se detecta por capacidad', () => {
        expect(cierrePorFondoSoportado()).toBe(false);
    });

    it('un clic en el fondo lanza cancel y cierra; foco de vuelta al disparador', () => {
        const d = q<HTMLDialogElement>('#d');
        const orden: string[] = [];
        d.addEventListener('cancel', () => orden.push('cancel'));
        d.addEventListener('close', () => orden.push('close'));
        clic(q('#fuera'));
        expect(d.open).toBe(false);
        expect(orden).toEqual(['cancel', 'close']);
        expect(document.activeElement).toBe(q('#abrir'));
    });

    it('un clic dentro no cierra', () => {
        clic(q('#dentro'));
        expect(q<HTMLDialogElement>('#d').open).toBe(true);
    });

    it('si cancel se cancela, queda abierto', () => {
        const d = q<HTMLDialogElement>('#d');
        d.addEventListener('cancel', (e) => e.preventDefault());
        clic(q('#fuera'));
        expect(d.open).toBe(true);
    });

    it('closedby="closerequest" y "none" no cierran con el fondo', () => {
        const d = q<HTMLDialogElement>('#d');
        for (const valor of ['closerequest', 'none']) {
            d.setAttribute('closedby', valor);
            clic(q('#fuera'));
            expect(d.open).toBe(true);
        }
    });

    it('sin pointerdown previo en el fondo no cierra (arrastre desde dentro)', () => {
        clic(q('#fuera'), false);
        expect(q<HTMLDialogElement>('#d').open).toBe(true);
    });

    it('con soporte nativo no hace nada', () => {
        Object.defineProperty(HTMLDialogElement.prototype, 'closedBy', { value: 'any', configurable: true, writable: true });
        try {
            clic(q('#fuera'));
            expect(q<HTMLDialogElement>('#d').open).toBe(true);
        } finally {
            delete (HTMLDialogElement.prototype as { closedBy?: string }).closedBy;
        }
    });
});

describe('Diálogo no descartable (closedby="none")', () => {
    const NO_DESCARTABLE = `
<button type="button" id="abrir" commandfor="d" command="show-modal">Abrir</button>
<dialog id="d" class="ts modal-dialog" closedby="none" aria-label="Despliegue en curso"><button type="button" id="dentro">Dentro</button></dialog>
<button type="button" id="abrir2" commandfor="e" command="show-modal">Abrir otro</button>
<dialog id="e" class="ts modal-dialog" closedby="any" aria-label="Invitar"><button type="button" id="dentro2">Dentro</button></dialog>`;

    beforeEach(() => {
        const matches = Element.prototype.matches;
        vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
            return selector === ':modal' ? this.hasAttribute('open') : matches.call(this, selector);
        });
        document.body.innerHTML = NO_DESCARTABLE;
        init(document);
    });

    it('cancel se previene: el diálogo sigue abierto', () => {
        q('#abrir').click();
        const evento = new Event('cancel', { cancelable: true });
        q<HTMLDialogElement>('#d').dispatchEvent(evento);
        expect(evento.defaultPrevented).toBe(true);
    });

    it('request-close tampoco lo cierra; close sí', () => {
        q('#abrir').click();
        const d = q<HTMLDialogElement>('#d');
        d.requestClose?.();
        if (!d.requestClose) d.dispatchEvent(new Event('cancel', { cancelable: true }));
        expect(d.open).toBe(true);
        d.close();
        expect(d.open).toBe(false);
    });

    it('Escape se previene en el keydown, también el segundo seguido', () => {
        q('#abrir').click();
        for (let i = 0; i < 2; i++) {
            const tecla = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
            q('#dentro').dispatchEvent(tecla);
            expect(tecla.defaultPrevented).toBe(true);
        }
    });

    it('un diálogo descartable no se toca: ni cancel ni Escape se previenen', () => {
        q('#abrir2').click();
        const cancel = new Event('cancel', { cancelable: true });
        q<HTMLDialogElement>('#e').dispatchEvent(cancel);
        expect(cancel.defaultPrevented).toBe(false);
        const tecla = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        q('#dentro2').dispatchEvent(tecla);
        expect(tecla.defaultPrevented).toBe(false);
    });
});

describe('Aviso de diálogo sin nombre accesible (localhost)', () => {
    it('avisa una sola vez por diálogo, en el idioma de la página, y calla los que tienen nombre', async () => {
        const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
        document.documentElement.lang = 'es';
        document.body.innerHTML = `<dialog class="ts modal-dialog" id="a"></dialog><dialog class="ts modal-dialog" aria-label="Con nombre"></dialog><dialog class="ts modal-dialog" aria-labelledby="t"></dialog>`;
        init(document);
        init(document);
        await vi.waitFor(() => expect(aviso).toHaveBeenCalled());
        await new Promise((r) => setTimeout(r, 50));
        expect(aviso).toHaveBeenCalledTimes(1);
        expect(aviso.mock.calls[0][0]).toContain('nombre accesible');
        expect(aviso.mock.calls[0][1]).toBe(document.getElementById('a'));
    });
});

describe('el foco vuelve al disparador aunque el navegador no lo enfoque al hacer clic', () => {
    it('al cerrar con el foco en body o en un hijo del diálogo, vuelve al botón del clic', async () => {
        vi.useFakeTimers();
        const abrir = q<HTMLButtonElement>('#abrir');
        const d = q<HTMLDialogElement>('#d');
        alPresionarDisparador(abrir);
        d.setAttribute('open', '');
        vi.runAllTimers();
        vi.useRealTimers();
        expect(document.activeElement).toBe(document.body);
        alCerrarDialogo(d);
        expect(document.activeElement).toBe(abrir);

        // Segundo cierre sin apertura nueva: no hay a quién devolverle el foco.
        q('#cerrar').focus();
        alCerrarDialogo(d);
        expect(document.activeElement).toBe(q('#cerrar'));
    });

    it('si el foco ya está en otro elemento fuera del diálogo, no lo roba', () => {
        vi.useFakeTimers();
        const abrir = q<HTMLButtonElement>('#abrir');
        const d = q<HTMLDialogElement>('#d');
        const otro = document.createElement('button');
        document.body.append(otro);
        alPresionarDisparador(abrir);
        d.setAttribute('open', '');
        vi.runAllTimers();
        vi.useRealTimers();
        otro.focus();
        alCerrarDialogo(d);
        expect(document.activeElement).toBe(otro);
    });

    it('un botón dentro de un diálogo es el disparador de OTRO diálogo, no del que lo contiene', () => {
        vi.useFakeTimers();
        document.body.insertAdjacentHTML('beforeend', '<dialog id="a" open><button id="abrir-b">Abrir B</button><dialog id="b"></dialog></dialog>');
        const abrirB = q<HTMLButtonElement>('#abrir-b');
        const a = q<HTMLDialogElement>('#a');
        const b = q<HTMLDialogElement>('#b');
        alPresionarDisparador(abrirB);
        b.setAttribute('open', '');
        vi.runAllTimers();
        vi.useRealTimers();
        // Con el foco quedado en el diálogo exterior, cerrar B lo devuelve al botón que lo abrió.
        a.setAttribute('tabindex', '-1');
        a.focus();
        alCerrarDialogo(b);
        expect(document.activeElement).toBe(abrirB);
    });

    it('un diálogo abierto antes del clic no recibe como disparador un botón ajeno', () => {
        vi.useFakeTimers();
        document.body.insertAdjacentHTML('beforeend', '<dialog id="previo" open></dialog><button id="ajeno">Ajeno</button>');
        const previo = q<HTMLDialogElement>('#previo');
        alPresionarDisparador(q('#ajeno'));
        vi.runAllTimers();
        vi.useRealTimers();
        expect(document.activeElement).toBe(document.body);
        alCerrarDialogo(previo);
        expect(document.activeElement).toBe(document.body);
    });

    it('dos aperturas en el mismo turno: cada diálogo queda con el disparador de su clic', () => {
        vi.useFakeTimers();
        document.body.insertAdjacentHTML('beforeend', '<button id="b1">1</button><button id="b2">2</button><dialog id="d1"></dialog><dialog id="d2"></dialog>');
        const d1 = q<HTMLDialogElement>('#d1');
        const d2 = q<HTMLDialogElement>('#d2');
        alPresionarDisparador(q('#b1'));
        d1.setAttribute('open', '');
        alPresionarDisparador(q('#b2'));
        d2.setAttribute('open', '');
        vi.runAllTimers();
        vi.useRealTimers();
        alCerrarDialogo(d2);
        expect(document.activeElement).toBe(q('#b2'));
        q<HTMLElement>('#b2').blur();
        alCerrarDialogo(d1);
        expect(document.activeElement).toBe(q('#b1'));
    });
});
