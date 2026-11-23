// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { init, toast, updateToast, clearToasts, setNumberInputLoading, setTextareaLoading, setInputLoading, setDatePickerLoading, setDatePickerDisabledDate } from './index';

function montar(html: string): HTMLElement {
    document.body.innerHTML = html;
    init(document);
    return document.body.firstElementChild as HTMLElement;
}
const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const qq = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];

beforeEach(() => {
    document.documentElement.lang = 'es';
    document.body.innerHTML = '';
});

describe('Dismiss (Banner y Tag)', () => {
    const HTML = `<div data-ts-dismissible tabindex="0">Aviso<button data-ts-dismiss>×</button></div>`;

    it('oculta el elemento al cerrar', () => {
        const raiz = montar(HTML);
        q('[data-ts-dismiss]').click();
        expect(raiz.hidden).toBe(true);
    });

    it('NO lo borra del DOM: borrar es irreversible y no lo decide el Core', () => {
        montar(HTML);
        q('[data-ts-dismiss]').click();
        expect(document.querySelector('[data-ts-dismissible]')).not.toBeNull();
    });

    it('se puede cancelar', () => {
        const raiz = montar(HTML);
        raiz.addEventListener('ts:change', (e) => e.preventDefault());
        q('[data-ts-dismiss]').click();
        expect(raiz.hidden).toBe(false);
    });

    it('Backspace sobre el elemento lo descarta', () => {
        const raiz = montar(HTML);
        raiz.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
        expect(raiz.hidden).toBe(true);
    });

    it('Backspace dentro de un input anidado NO lo descarta', () => {
        const raiz = montar(
            `<div data-ts-dismissible tabindex="0"><input type="text"><button data-ts-dismiss>×</button></div>`,
        );
        q('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
        expect(raiz.hidden).toBe(false);
    });
});

describe('Tag clicable: Enter y Espacio lo activan', () => {
    const HTML = `<span class="tag is-clickable" role="button" tabindex="0">Editor</span>`;
    const tecla = (el: Element, key: string) => {
        const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        el.dispatchEvent(e);
        return e;
    };

    it('Enter y Espacio disparan el click y no dejan que Espacio desplace la página', () => {
        const raiz = montar(HTML);
        const alClick = vi.fn();
        raiz.addEventListener('click', alClick);
        expect(tecla(raiz, 'Enter').defaultPrevented).toBe(true);
        expect(tecla(raiz, ' ').defaultPrevented).toBe(true);
        expect(alClick).toHaveBeenCalledTimes(2);
    });

    it('con aria-disabled no hace nada', () => {
        const raiz = montar(`<span class="tag is-clickable" role="button" aria-disabled="true">Lector</span>`);
        const alClick = vi.fn();
        raiz.addEventListener('click', alClick);
        expect(tecla(raiz, 'Enter').defaultPrevented).toBe(false);
        expect(alClick).not.toHaveBeenCalled();
    });

    it('un Enter del botón de quitar es del botón: no activa la etiqueta', () => {
        const raiz = montar(`<span class="tag is-clickable" role="button" tabindex="0" data-ts-dismissible>Editor<button type="button" data-ts-dismiss aria-label="Quitar">x</button></span>`);
        const alClick = vi.fn();
        raiz.addEventListener('click', (e) => e.target === raiz && alClick());
        expect(tecla(q('[data-ts-dismiss]'), 'Enter').defaultPrevented).toBe(false);
        expect(alClick).not.toHaveBeenCalled();
    });

    it('una etiqueta que no es clicable no responde a Enter', () => {
        const raiz = montar(`<span class="tag" tabindex="0">Fija</span>`);
        expect(tecla(raiz, 'Enter').defaultPrevented).toBe(false);
    });
});

describe('Dismiss: foco al quitar una etiqueta', () => {
    const tag = (t: string) => `<span data-ts-dismissible>${t}<button data-ts-dismiss aria-label="Quitar ${t}">×</button></span>`;

    it('el foco pasa al «Quitar» siguiente, o al anterior si era la última', () => {
        montar(`<div>${tag('a')}${tag('b')}${tag('c')}</div>`);
        const botones = qq('[data-ts-dismiss]');
        botones[0].focus();
        botones[0].click();
        expect(document.activeElement).toBe(botones[1]);

        botones[2].focus();
        botones[2].click();
        expect(document.activeElement).toBe(botones[1]);
    });

    it('si no tenía el foco, no se lo roba', () => {
        montar(`<div>${tag('a')}${tag('b')}<button id="otro">x</button></div>`);
        q('#otro').focus();
        qq('[data-ts-dismiss]')[0].click();
        expect(document.activeElement).toBe(q('#otro'));
    });
});

describe('Toggle (Breadcrumbs y NavBar)', () => {
    const HTML = `
    <div>
      <button data-ts-toggle="menu" aria-expanded="false">Menú</button>
      <div data-ts-toggle-target="menu" hidden>Contenido</div>
    </div>`;

    it('abre y cierra el destino', () => {
        montar(HTML);
        const boton = q('[data-ts-toggle]');
        const panel = q('[data-ts-toggle-target]');

        boton.click();
        expect(panel.hidden).toBe(false);
        expect(boton.getAttribute('aria-expanded')).toBe('true');

        boton.click();
        expect(panel.hidden).toBe(true);
        expect(boton.getAttribute('aria-expanded')).toBe('false');
    });

    it('el destino no necesita estar adentro del botón', () => {
        montar(`
      <div>
        <header><button data-ts-toggle="m" aria-expanded="false">≡</button></header>
        <aside data-ts-toggle-target="m" hidden>Lejos</aside>
      </div>`);
        q('[data-ts-toggle]').click();
        expect(q('[data-ts-toggle-target]').hidden).toBe(false);
    });

    it('presionar fuera de la barra cierra sólo los toggles que declaran data-ts-toggle-outside', () => {
        montar(`
      <div>
        <div data-ts-toggle-root>
          <button id="dentro" data-ts-toggle="a" data-ts-toggle-outside aria-expanded="true">A</button>
          <div data-ts-toggle-target="a"><a href="/x">x</a></div>
        </div>
        <button data-ts-toggle="b" aria-expanded="true">B</button>
        <div data-ts-toggle-target="b">y</div>
        <p id="afuera">resto de la página</p>
      </div>`);
        const presionar = (el: Element) => el.dispatchEvent(new Event('pointerdown', { bubbles: true }));

        presionar(q('a'));
        presionar(q('#dentro'));
        expect(q('#dentro').getAttribute('aria-expanded')).toBe('true');

        presionar(q('#afuera'));
        expect(q('#dentro').getAttribute('aria-expanded')).toBe('false');
        expect(q('[data-ts-toggle-target="a"]').hidden).toBe(true);
        expect(q('[data-ts-toggle="b"]').getAttribute('aria-expanded')).toBe('true');
    });

    it('la app puede cancelar el cierre con ts:change', () => {
        const raiz = montar(`
      <div data-ts-toggle-root>
        <button data-ts-toggle="a" data-ts-toggle-outside aria-expanded="true">A</button>
        <div data-ts-toggle-target="a">x</div>
      </div>`);
        raiz.addEventListener('ts:change', (e) => e.preventDefault());
        document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));

        expect(q('[data-ts-toggle="a"]').getAttribute('aria-expanded')).toBe('true');
    });

    it('Escape cierra sólo los toggles que lo declaran (data-ts-toggle-escape)', () => {
        montar(`
      <div>
        <button data-ts-toggle="a" data-ts-toggle-escape aria-expanded="true">A</button>
        <div data-ts-toggle-target="a"><a href="/x">x</a></div>
        <button data-ts-toggle="b" aria-expanded="true">B</button>
        <div data-ts-toggle-target="b">y</div>
      </div>`);
        q('a').focus();
        q('a').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(q('[data-ts-toggle="a"]').getAttribute('aria-expanded')).toBe('false');
        expect(q('[data-ts-toggle-target="a"]').hidden).toBe(true);
        expect(document.activeElement).toBe(q('[data-ts-toggle="a"]'));
        expect(q('[data-ts-toggle="b"]').getAttribute('aria-expanded')).toBe('true');
    });

    it('el «…» (y su separador) desaparece al expandir y el foco pasa al primer enlace revelado', () => {
        montar(`
      <ol>
        <li><a href="/">Inicio</a></li>
        <li data-ts-toggle-hide="t"></li>
        <li data-ts-toggle-hide="t"><button data-ts-toggle="t" aria-expanded="false">…</button></li>
        <li data-ts-toggle-target="t" hidden></li>
        <li data-ts-toggle-target="t" hidden><a href="/panel">Panel de control</a></li>
      </ol>`);
        const mas = q('[data-ts-toggle]');
        mas.focus();
        mas.click();
        expect(qq('[data-ts-toggle-hide]').every((e) => e.hidden)).toBe(true);
        expect(document.activeElement).toBe(q('a[href="/panel"]'));
    });
});

describe('Clipboard (Code)', () => {
    it('copia el texto del bloque referenciado', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

        montar(`<div><button data-ts-copy="#s1">Copiar</button><pre id="s1">npm i taisho</pre></div>`);
        q('[data-ts-copy]').click();

        expect(writeText).toHaveBeenCalledWith('npm i taisho');
        await vi.waitFor(() => expect(q('[data-ts-copy]').classList.contains('is-copied')).toBe(true));
    });

    it('con pestañas en el encabezado, copia el panel visible y cambia de pestaña con clic y flechas', () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        montar(`<div data-ts-tabs id="bq"><div class="ts code-header has-tabs"><div role="tablist"><button role="tab" aria-selected="true" data-ts-tabs-tab data-ts-value="npm">npm</button><button role="tab" aria-selected="false" tabindex="-1" data-ts-tabs-tab data-ts-value="pnpm">pnpm</button></div><button data-ts-copy="#bq .code-content:not([hidden])">Copiar</button></div><div role="tabpanel" data-ts-tabs-panel data-ts-value="npm" class="code-content"><pre>npm i</pre></div><div role="tabpanel" data-ts-tabs-panel data-ts-value="pnpm" class="code-content"><pre>pnpm add</pre></div></div>`);
        q('[data-ts-copy]').click();
        expect(writeText).toHaveBeenLastCalledWith('npm i');
        q('[data-ts-value="pnpm"][role="tab"]').click();
        q('[data-ts-copy]').click();
        expect(writeText).toHaveBeenLastCalledWith('pnpm add');
        q('[data-ts-value="pnpm"][role="tab"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(q('[data-ts-value="npm"][role="tab"]').getAttribute('aria-selected')).toBe('true');
    });

    it('al copiar el botón pasa a «Copiado» con ✓ y vuelve a los 2 s', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        montar(`<div><button data-ts-copy="#s3" aria-label="Copiar código" data-ts-copied-label="Copiado"><svg id="copiar"></svg><template data-ts-copied-icon><svg id="tilde"></svg></template></button><span role="status" data-ts-copy-status></span><pre id="s3">x</pre></div>`);
        const boton = q('[data-ts-copy]');
        vi.useFakeTimers();
        try {
            boton.click();
            await vi.advanceTimersByTimeAsync(0);
            expect(boton.getAttribute('aria-label')).toBe('Copiado');
            expect(boton.querySelector('svg')?.id).toBe('tilde');
            expect(boton.hasAttribute('data-ts-copied')).toBe(true);
            expect(q('[data-ts-copy-status]').textContent).toBe('Copiado');

            await vi.advanceTimersByTimeAsync(1500);
            boton.click();
            await vi.advanceTimersByTimeAsync(1500);
            expect(boton.getAttribute('aria-label')).toBe('Copiado');

            await vi.advanceTimersByTimeAsync(600);
            expect(boton.getAttribute('aria-label')).toBe('Copiar código');
            expect(boton.querySelector('svg')?.id).toBe('copiar');
            expect(boton.classList.contains('is-copied')).toBe(false);
            expect(boton.hasAttribute('data-ts-copied')).toBe(false);
            expect(q('[data-ts-copy-status]').textContent).toBe('');
        } finally {
            vi.useRealTimers();
        }
    });

    it('sin portapapeles no finge que copió', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) },
            configurable: true,
        });

        montar(`<div><button data-ts-copy="#s2">Copiar</button><pre id="s2">hola</pre></div>`);
        q('[data-ts-copy]').click();
        await new Promise((r) => setTimeout(r, 0));

        expect(q('[data-ts-copy]').classList.contains('is-copied')).toBe(false);
    });
});

describe('Spotlight (Card)', () => {
    it('escribe las variables CSS que lee el degradado, con la posición relativa', () => {
        const card = montar(`<div data-ts-spotlight>Card</div>`);
        card.getBoundingClientRect = () => ({ left: 100, top: 50 }) as DOMRect;

        card.dispatchEvent(
            new PointerEvent('pointermove', { clientX: 150, clientY: 80, bubbles: true }),
        );

        expect(card.style.getPropertyValue('--ts-spotlight-x')).toBe('50px');
        expect(card.style.getPropertyValue('--ts-spotlight-y')).toBe('30px');
    });
});

describe('Cursor al final del valor inicial', () => {
    it('los campos con valor por atributo quedan con el cursor al final', () => {
        montar(`<input id="i" value="ada"><textarea id="t">hola</textarea><input id="v"><input id="e" type="email" value="a@b.c">`);

        expect(q<HTMLInputElement>('#i').selectionStart).toBe(3);
        expect(q<HTMLInputElement>('#i').selectionEnd).toBe(3);
        expect(q<HTMLTextAreaElement>('#t').selectionStart).toBe(4);
        expect(q<HTMLInputElement>('#v').selectionStart).toBe(0);
    });

    it('una segunda init() no pisa lo que hizo la persona con el cursor', () => {
        montar(`<input id="i" value="ada">`);
        q<HTMLInputElement>('#i').setSelectionRange(1, 1);
        init(document);

        expect(q<HTMLInputElement>('#i').selectionStart).toBe(1);
    });

    it('no mueve el cursor de un campo que ya tiene el foco', () => {
        document.body.innerHTML = `<input id="i" value="ada">`;
        q<HTMLInputElement>('#i').focus();
        q<HTMLInputElement>('#i').setSelectionRange(0, 0);
        init(document);

        expect(q<HTMLInputElement>('#i').selectionStart).toBe(0);
    });
});

describe('Avatar', () => {
    it('cae a las iniciales si la imagen falla', () => {
        const raiz = montar(
            `<span data-ts-avatar data-ts-name="Ada Lovelace"><img src="roto.png" alt="Ada Lovelace"></span>`,
        );
        const img = q<HTMLImageElement>('img');
        img.dispatchEvent(new Event('error'));

        expect(img.isConnected).toBe(false);
        expect(raiz.querySelector('img')).toBeNull();
        expect(raiz.querySelector('[data-ts-avatar-initials]')?.textContent).toBe('AL');
    });

    it('al caer a las iniciales el nombre queda en el contenedor de medios (role="img" + aria-label)', () => {
        montar(`<span data-ts-avatar data-ts-name="Ada Lovelace"><span data-avatar-media><img src="roto.png" alt="Ada Lovelace"></span></span>`);
        q('img').dispatchEvent(new Event('error'));
        const medios = q('[data-avatar-media]');
        expect(medios.getAttribute('role')).toBe('img');
        expect(medios.getAttribute('aria-label')).toBe('Ada Lovelace');
    });

    it('un alt vacío (imagen decorativa) no inventa un nombre', () => {
        montar(`<span data-ts-avatar><span data-avatar-media><img src="roto.png" alt=""></span></span>`);
        q('img').dispatchEvent(new Event('error'));
        expect(q('[data-avatar-media]').hasAttribute('role')).toBe(false);
    });

    it('una imagen que ya falló antes de init() cae a las iniciales sin esperar el evento', () => {
        document.body.innerHTML = `<span data-ts-avatar data-ts-name="Ada Lovelace"><span data-avatar-media><img src="roto.png" alt="Ada Lovelace"></span></span>`;
        const img = q<HTMLImageElement>('img');
        Object.defineProperty(img, 'complete', { value: true });
        Object.defineProperty(img, 'naturalWidth', { value: 0 });
        init(document);

        expect(document.querySelector('img')).toBeNull();
        expect(q('[data-avatar-media] [data-ts-avatar-initials]').textContent).toBe('AL');
    });

    it('una imagen que todavía carga, o que cargó bien, no se toca', () => {
        document.body.innerHTML = `<span data-ts-avatar data-ts-name="Ada Lovelace"><img src="a.png"></span><span data-ts-avatar data-ts-name="Beto Díaz"><img src="b.png"></span>`;
        const [cargando, buena] = qq('img') as HTMLImageElement[];
        Object.defineProperty(cargando, 'complete', { value: false });
        Object.defineProperty(buena, 'complete', { value: true });
        Object.defineProperty(buena, 'naturalWidth', { value: 64 });
        init(document);

        expect(qq('img')).toHaveLength(2);
        expect(qq('[data-ts-avatar-initials]')).toHaveLength(0);
    });

    it('no duplica las iniciales si el error se repite', () => {
        montar(`<span data-ts-avatar data-ts-name="Ada Lovelace"><img src="roto.png"></span>`);
        const img = q<HTMLImageElement>('img');
        img.dispatchEvent(new Event('error'));
        img.dispatchEvent(new Event('error'));

        expect(qq('[data-ts-avatar-initials]')).toHaveLength(1);
    });
});

describe('SegmentedControl', () => {
    const HTML = `
    <div role="radiogroup" data-ts-segmented>
      <button role="radio" data-ts-segmented-option data-ts-value="dia" aria-checked="true" tabindex="0">Día</button>
      <button role="radio" data-ts-segmented-option data-ts-value="mes" aria-checked="false" tabindex="-1">Mes</button>
    </div>`;

    it('selecciona con click y usa aria-checked, no aria-selected', () => {
        montar(HTML);
        qq('[data-ts-segmented-option]')[1].click();

        expect(qq('[data-ts-segmented-option]')[1].getAttribute('aria-checked')).toBe('true');
        expect(qq('[data-ts-segmented-option]')[0].getAttribute('aria-checked')).toBe('false');
    });

    it('mueve is-selected, la clase que pinta el CSS', () => {
        montar(HTML);
        qq('[data-ts-segmented-option]')[1].click();

        expect(qq('[data-ts-segmented-option]').map((o) => o.classList.contains('is-selected'))).toEqual([false, true]);
    });

    it('la flecha mueve el foco Y selecciona, como manda la APG para radiogroup', () => {
        montar(HTML);
        const [primero, segundo] = qq('[data-ts-segmented-option]');
        primero.focus();
        primero.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

        expect(document.activeElement).toBe(segundo);
        expect(segundo.getAttribute('aria-checked')).toBe('true');
    });

    const TRES = (dir: string) => `
    <div role="radiogroup" data-ts-segmented style="direction: ${dir}">
      <button role="radio" data-ts-segmented-option data-ts-value="dia" aria-checked="true" tabindex="0">Día</button>
      <button role="radio" data-ts-segmented-option data-ts-value="mes" aria-checked="false" tabindex="-1">Mes</button>
      <button role="radio" data-ts-segmented-option data-ts-value="anio" aria-checked="false" tabindex="-1">Año</button>
    </div>`;

    it('RTL: → retrocede y ← avanza; ↑ ↓ siguen igual', () => {
        montar(TRES('rtl'));
        const [dia, mes, anio] = qq('[data-ts-segmented-option]');
        dia.focus();
        dia.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(document.activeElement).toBe(anio);
        anio.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(document.activeElement).toBe(dia);
        dia.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).toBe(mes);
    });

    it('LTR: → avanza y ← retrocede', () => {
        montar(TRES('ltr'));
        const [dia, mes, anio] = qq('[data-ts-segmented-option]');
        dia.focus();
        dia.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(document.activeElement).toBe(mes);
        mes.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(document.activeElement).toBe(dia);
        dia.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(document.activeElement).toBe(anio);
    });
});

describe('NumberInput', () => {
    const HTML = `
    <div data-ts-number>
      <button data-ts-number-step="-1">−</button>
      <input type="number" data-ts-number-field min="0" max="3" step="1" value="1">
      <button data-ts-number-step="1">+</button>
    </div>`;

    it('suma y resta respetando el paso', () => {
        montar(HTML);
        qq('[data-ts-number-step]')[1].click();
        expect(q<HTMLInputElement>('input').value).toBe('2');

        qq('[data-ts-number-step]')[0].click();
        expect(q<HTMLInputElement>('input').value).toBe('1');
    });

    it('no pasa del máximo y deshabilita el botón al llegar', () => {
        montar(HTML);
        const mas = qq('[data-ts-number-step]')[1] as HTMLButtonElement;
        mas.click();
        mas.click();

        expect(q<HTMLInputElement>('input').value).toBe('3');
        expect(mas.disabled).toBe(true);
    });

    it('no arrastra el error de punto flotante', () => {
        montar(HTML.replace('step="1" value="1"', 'step="0.1" value="0.2"').replace('max="3"', 'max="9"'));
        qq('[data-ts-number-step]')[1].click();

        expect(q<HTMLInputElement>('input').value).toBe('0.3');
    });

    it('dispara input y change para que el formulario se entere', () => {
        montar(HTML);
        const espia = vi.fn();
        q('input').addEventListener('change', espia);
        qq('[data-ts-number-step]')[1].click();

        expect(espia).toHaveBeenCalled();
    });
});

describe('NumberInput: clearable y sin botones de paso', () => {
    const HTML = (valor = '25') => `
    <div data-ts-number>
      <button data-ts-number-step="-1">−</button>
      <input type="number" data-ts-number-field min="5" value="${valor}">
      <button type="button" data-ts-clear aria-label="Limpiar campo">x</button>
      <button data-ts-number-step="1">+</button>
    </div>`;
    const campo = () => q<HTMLInputElement>('input');
    const limpiar = () => q<HTMLButtonElement>('[data-ts-clear]');

    it('el botón vacío el campo, avisa y no se restaura al salir', () => {
        montar(HTML());
        expect(limpiar().hidden).toBe(false);
        const input = vi.fn();
        campo().addEventListener('input', input);
        limpiar().click();
        expect(campo().value).toBe('');
        expect(input).toHaveBeenCalled();
        expect(limpiar().hidden).toBe(true);
        campo().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        expect(campo().value).toBe('');
    });

    it('aparece sólo con valor; vacío desde el inicio está oculto', () => {
        montar(HTML(''));
        expect(limpiar().hidden).toBe(true);
    });

    it('desde el vacío los pasos parten del mínimo', () => {
        montar(HTML());
        limpiar().click();
        q<HTMLButtonElement>('[data-ts-number-step="1"]').click();
        expect(campo().value).toBe('6');
    });

    it('sin botones − y + las flechas siguen pasando', () => {
        montar('<div data-ts-number><input type="number" data-ts-number-field step="1" value="5"></div>');
        campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
        expect(campo().value).toBe('6');
    });
});

describe('NumberInput: Home/End/PageUp/PageDown, readonly, loading y 17+ dígitos', () => {
    const HTML = (campo = 'min="0" max="100" step="1" value="50"', raiz = '') => `
    <div data-ts-number ${raiz}>
      <button data-ts-number-step="-1">−</button>
      <input type="number" data-ts-number-field ${campo}>
      <button data-ts-number-step="1">+</button>
      <span data-ts-number-spinner hidden>…</span>
    </div>`;
    const campo = () => q<HTMLInputElement>('input');
    const tecla = (key: string) => {
        const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        campo().dispatchEvent(e);
        return e;
    };

    it('un valor fuera de rango deshabilita el botón en cada tecla, antes del blur', () => {
        montar(HTML());
        const mas = q<HTMLButtonElement>('[data-ts-number-step="1"]');
        campo().value = '999';
        campo().dispatchEvent(new Event('input', { bubbles: true }));
        expect(mas.disabled).toBe(true);
        campo().value = '50';
        campo().dispatchEvent(new Event('input', { bubbles: true }));
        expect(mas.disabled).toBe(false);
    });

    it('Home y End llevan a min y max y consumen la tecla', () => {
        montar(HTML());
        expect(tecla('Home').defaultPrevented).toBe(true);
        expect(campo().value).toBe('0');
        expect(tecla('End').defaultPrevented).toBe(true);
        expect(campo().value).toBe('100');
    });

    it('sin min/max Home y End no se consumen: conservan el cursor nativo', () => {
        montar(HTML('step="1" value="50"'));
        expect(tecla('Home').defaultPrevented).toBe(false);
        expect(tecla('End').defaultPrevented).toBe(false);
        expect(campo().value).toBe('50');
    });

    it('PageUp y PageDown saltan step × 10 y respetan los límites', () => {
        montar(HTML());
        tecla('PageUp');
        expect(campo().value).toBe('60');
        tecla('PageDown');
        tecla('PageDown');
        expect(campo().value).toBe('40');
        campo().value = '95';
        tecla('PageUp');
        expect(campo().value).toBe('100');
    });

    it('data-ts-large-step reemplaza step × 10', () => {
        montar(HTML('min="0" max="100" step="5" value="20"', 'data-ts-large-step="25"'));
        tecla('PageUp');
        expect(campo().value).toBe('45');
    });

    it('las teclas disparan input y change y deshabilitan el botón al llegar al tope', () => {
        montar(HTML());
        const espia = vi.fn();
        campo().addEventListener('change', espia);
        tecla('End');
        expect(espia).toHaveBeenCalledTimes(1);
        expect((qq('[data-ts-number-step]')[1] as HTMLButtonElement).disabled).toBe(true);
    });

    it('ts:change cancelable frena también el salto por teclado', () => {
        const raiz = montar(HTML());
        raiz.addEventListener('ts:change', (e) => e.preventDefault());
        tecla('PageUp');
        expect(campo().value).toBe('50');
    });

    it('readonly: los botones quedan deshabilitados y ni teclas, ni flechas, ni rueda cambian el valor', () => {
        montar(HTML('min="0" max="100" step="1" value="50" readonly', 'data-ts-allow-wheel'));
        expect((qq('[data-ts-number-step]') as HTMLButtonElement[]).every((b) => b.disabled)).toBe(true);
        qq('[data-ts-number-step]')[1].click();
        for (const k of ['Home', 'End', 'PageUp', 'PageDown']) expect(tecla(k).defaultPrevented).toBe(false);
        campo().focus();
        campo().dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
        expect(campo().value).toBe('50');
        expect(document.activeElement).toBe(campo());
    });

    it('setNumberInputLoading marca is-loading, aria-busy y muestra el Spinner sin bloquear el campo', () => {
        const raiz = montar(HTML());
        setNumberInputLoading(raiz, true);
        expect(raiz.classList.contains('is-loading')).toBe(true);
        expect(campo().getAttribute('aria-busy')).toBe('true');
        expect(q('[data-ts-number-spinner]').hidden).toBe(false);
        expect(campo().disabled).toBe(false);
        setNumberInputLoading(raiz, false);
        expect(raiz.classList.contains('is-loading')).toBe(false);
        expect(campo().hasAttribute('aria-busy')).toBe(false);
        expect(q('[data-ts-number-spinner]').hidden).toBe(true);
    });

    it('17+ dígitos: no toca el texto al tipear y lo clampea a MAX_SAFE_INTEGER al blur', () => {
        montar(HTML('step="1" value="1"'));
        campo().focus();
        campo().value = '12345678901234567';
        campo().dispatchEvent(new Event('input', { bubbles: true }));
        expect(campo().value).toBe('12345678901234567');
        campo().blur();
        expect(campo().value).toBe(String(Number.MAX_SAFE_INTEGER));
    });

    it('el botón + se deshabilita en MAX_SAFE_INTEGER aunque no haya max', () => {
        montar(HTML(`step="1" value="${Number.MAX_SAFE_INTEGER}"`));
        expect((qq('[data-ts-number-step]')[1] as HTMLButtonElement).disabled).toBe(true);
    });
});

describe('NumberInput: comportamiento esperado', () => {
    const HTML = (extra = '') => `
    <div data-ts-number ${extra}>
      <button data-ts-number-step="-1">−</button>
      <input type="number" data-ts-number-field min="0" max="10" step="1" value="3">
      <button data-ts-number-step="1">+</button>
    </div>`;
    const campo = () => q<HTMLInputElement>('input');
    const escribir = (v: string) => {
        campo().value = v;
        campo().dispatchEvent(new Event('input', { bubbles: true }));
    };
    const enfocar = () => campo().focus();
    const soltar = () => campo().blur();

    it('blur con el campo vacío restaura el último valor válido', () => {
        montar(HTML());
        enfocar();
        escribir('7');
        escribir('');
        soltar();
        expect(campo().value).toBe('7');
    });

    it('blur con texto inválido restaura el valor de partida', () => {
        montar(HTML());
        enfocar();
        escribir('abc');
        soltar();
        expect(campo().value).toBe('3');
    });

    it('blur con un valor fuera de rango deja el clampeado', () => {
        montar(HTML());
        enfocar();
        escribir('99');
        soltar();
        expect(campo().value).toBe('10');
    });

    it('restaurar avisa con input y change para que el formulario se entere', () => {
        montar(HTML());
        const espia = vi.fn();
        enfocar();
        escribir('');
        campo().addEventListener('change', espia);
        soltar();
        expect(espia).toHaveBeenCalled();
    });

    it('un valor válido no se toca al perder el foco', () => {
        montar(HTML());
        const espia = vi.fn();
        campo().addEventListener('change', espia);
        enfocar();
        escribir('5');
        soltar();
        expect(campo().value).toBe('5');
        expect(espia).not.toHaveBeenCalled();
    });

    it('un campo que arrancó vacío y nunca tuvo valor queda vacío', () => {
        montar(HTML().replace(' value="3"', ''));
        enfocar();
        soltar();
        expect(campo().value).toBe('');
    });

    const pagina = () => {
        const p = { scrollBy: vi.fn(), clientHeight: 800, clientWidth: 1000 };
        Object.defineProperty(document, 'scrollingElement', { value: p, configurable: true });
        return p;
    };
    const rueda = (init: WheelEventInit) => {
        const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
        campo().dispatchEvent(e);
        return e;
    };

    it('la rueda NO cambia el valor por defecto: el campo conserva el foco y la página scrollea', () => {
        const p = pagina();
        montar(HTML());
        enfocar();
        const e = rueda({ deltaY: 100, deltaX: 20 });
        expect(campo().value).toBe('3');
        expect(document.activeElement).toBe(campo());
        expect(e.defaultPrevented).toBe(true);
        expect(p.scrollBy).toHaveBeenCalledWith(20, 100);
    });

    it('un panel con scroll dentro de la página scrollea el panel y no la página', () => {
        const p = pagina();
        montar(`<div id="panel" style="overflow-y:auto">${HTML()}</div>`);
        const panel = q('#panel');
        Object.defineProperty(panel, 'scrollHeight', { value: 600 });
        Object.defineProperty(panel, 'clientHeight', { value: 200 });
        panel.scrollBy = vi.fn() as unknown as typeof panel.scrollBy;
        enfocar();
        rueda({ deltaY: 3, deltaMode: 1 });
        expect(panel.scrollBy).toHaveBeenCalledWith(0, 48);
        expect(p.scrollBy).not.toHaveBeenCalled();
    });

    it('con data-ts-allow-wheel la rueda sube y baja con el campo enfocado', () => {
        montar(HTML('data-ts-allow-wheel'));
        enfocar();
        const arriba = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
        campo().dispatchEvent(arriba);
        expect(campo().value).toBe('4');
        expect(arriba.defaultPrevented).toBe(true);

        campo().dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
        expect(campo().value).toBe('3');
    });

    it('con data-ts-allow-wheel la rueda no hace nada si el campo no tiene foco', () => {
        montar(HTML('data-ts-allow-wheel'));
        campo().dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
        expect(campo().value).toBe('3');
    });

    it('con data-ts-allow-wheel la rueda respeta el máximo', () => {
        montar(HTML('data-ts-allow-wheel').replace('value="3"', 'value="10"'));
        enfocar();
        campo().dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
        expect(campo().value).toBe('10');
    });
});

describe('Botón de limpiar (clearable de Input y Textarea)', () => {
    const INPUT = (valor = 'Panel de control', extra = '') => `
    <div class="ts input">
      <input class="ts input-field" value="${valor}" ${extra}>
      <div class="ts input-actions"><button type="button" data-ts-clear aria-label="Limpiar campo">x</button></div>
    </div>`;
    const TEXTAREA = `
    <div class="ts textarea">
      <textarea>Despliegue completado.</textarea>
      <button type="button" data-ts-clear aria-label="Limpiar campo">x</button>
    </div>`;
    const boton = () => q<HTMLButtonElement>('[data-ts-clear]');

    it('con contenido el botón se ve; sin contenido, oculto desde el arranque', () => {
        montar(INPUT());
        expect(boton().hidden).toBe(false);
        montar(INPUT(''));
        expect(boton().hidden).toBe(true);
    });

    it('en disabled y readonly el botón queda oculto', () => {
        montar(INPUT('API de pagos', 'disabled'));
        expect(boton().hidden).toBe(true);
        montar(INPUT('API de pagos', 'readonly'));
        expect(boton().hidden).toBe(true);
    });

    it('alterna al tipear: aparece con texto y se esconde al vaciar', () => {
        montar(INPUT(''));
        const campo = q<HTMLInputElement>('input');
        campo.value = 'a';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        expect(boton().hidden).toBe(false);
        campo.value = '';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        expect(boton().hidden).toBe(true);
    });

    it('click: avisa con ts:change, limpia, dispara input y change, esconde el botón y enfoca el campo', () => {
        montar(INPUT());
        const campo = q<HTMLInputElement>('input');
        const vistos: string[] = [];
        for (const t of ['input', 'change', 'ts:change']) document.addEventListener(t, () => vistos.push(t));
        boton().click();

        expect(campo.value).toBe('');
        expect(vistos).toEqual(['ts:change', 'input', 'change']);
        expect(boton().hidden).toBe(true);
        expect(document.activeElement).toBe(campo);
    });

    it('con el ts:change frenado no limpia', () => {
        montar(INPUT());
        const campo = q<HTMLInputElement>('input');
        const antes = campo.value;
        const frenar = (e: Event) => e.preventDefault();
        document.addEventListener('ts:change', frenar);
        boton().click();
        document.removeEventListener('ts:change', frenar);
        expect(antes).not.toBe('');
        expect(campo.value).toBe(antes);
    });

    it('funciona igual con un textarea', () => {
        montar(TEXTAREA);
        boton().click();
        expect(q<HTMLTextAreaElement>('textarea').value).toBe('');
        expect(document.activeElement).toBe(q('textarea'));
    });

    it('con dos campos, tipear en uno no toca el botón del otro', () => {
        montar(INPUT('a') + INPUT(''));
        const [uno, dos] = qq('input') as HTMLInputElement[];
        const botones = qq('[data-ts-clear]');
        dos.value = 'x';
        dos.dispatchEvent(new Event('input', { bubbles: true }));
        expect(botones[1].hidden).toBe(false);
        uno.value = '';
        uno.dispatchEvent(new Event('input', { bubbles: true }));
        expect(botones[0].hidden).toBe(true);
        expect(botones[1].hidden).toBe(false);
    });
});

describe('Textarea: loading y debounce', () => {
    const HTML = (extra = '') => `
    <div class="ts textarea" data-ts-textarea>
      <textarea id="t" ${extra}>Panel de control</textarea>
      <div class="ts textarea-actions">
        <span data-ts-field-spinner hidden><span role="status" aria-label="Cargando..."></span></span>
        <button type="button" data-ts-clear aria-label="Limpiar campo">x</button>
      </div>
    </div>`;
    const campo = () => q<HTMLTextAreaElement>('textarea');
    const escribir = (v: string) => {
        campo().value = v;
        campo().dispatchEvent(new Event('input', { bubbles: true }));
    };

    it('setTextareaLoading marca is-loading, aria-busy y muestra el Spinner sin bloquear el campo', () => {
        const raiz = montar(HTML());
        setTextareaLoading(raiz, true);
        expect(raiz.classList.contains('is-loading')).toBe(true);
        expect(campo().getAttribute('aria-busy')).toBe('true');
        expect(q('[data-ts-field-spinner]').hidden).toBe(false);
        expect(campo().disabled).toBe(false);
        setTextareaLoading(raiz, false);
        expect(raiz.classList.contains('is-loading')).toBe(false);
        expect(campo().hasAttribute('aria-busy')).toBe(false);
        expect(q('[data-ts-field-spinner]').hidden).toBe(true);
    });

    it('data-ts-debounce: una ráfaga de tipeo avisa una sola vez con ts:debouncedinput', () => {
        vi.useFakeTimers();
        try {
            montar(HTML('data-ts-debounce="300"'));
            const vistos: string[] = [];
            document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
            escribir('a');
            escribir('ab');
            vi.advanceTimersByTime(299);
            expect(vistos).toEqual([]);
            vi.advanceTimersByTime(1);
            expect(vistos).toEqual(['ab']);
        } finally {
            vi.useRealTimers();
        }
    });

    it('data-ts-debounce sin valor espera los 300 ms por defecto', () => {
        vi.useFakeTimers();
        try {
            montar(HTML('data-ts-debounce'));
            const vistos: string[] = [];
            document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
            escribir('a');
            expect(vistos).toEqual([]);
            vi.advanceTimersByTime(299);
            expect(vistos).toEqual([]);
            vi.advanceTimersByTime(1);
            expect(vistos).toEqual(['a']);
        } finally {
            vi.useRealTimers();
        }
    });

    it('data-ts-debounce con un valor que no es un plazo vuelve al defecto de 300 ms', () => {
        vi.useFakeTimers();
        try {
            for (const raro of ['data-ts-debounce="abc"', 'data-ts-debounce="-5"']) {
                montar(HTML(raro));
                const vistos: string[] = [];
                const oyente = (e: Event) => vistos.push((e as CustomEvent).detail.value);
                document.addEventListener('ts:debouncedinput', oyente);
                escribir('a');
                expect(vistos).toEqual([]);
                vi.advanceTimersByTime(300);
                expect(vistos).toEqual(['a']);
                document.removeEventListener('ts:debouncedinput', oyente);
            }
        } finally {
            vi.useRealTimers();
        }
    });

    it('data-ts-debounce="0" avisa sin esperar', () => {
        montar(HTML('data-ts-debounce="0"'));
        const vistos: string[] = [];
        document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
        escribir('x');
        expect(vistos).toEqual(['x']);
    });

    it('limpiar avisa el vacío ya mismo y no queda un aviso pendiente', () => {
        vi.useFakeTimers();
        try {
            montar(HTML('data-ts-debounce="300"'));
            const vistos: string[] = [];
            document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
            q('[data-ts-clear]').click();
            expect(vistos).toEqual(['']);
            vi.advanceTimersByTime(500);
            expect(vistos).toEqual(['']);
        } finally {
            vi.useRealTimers();
        }
    });

    it('sin data-ts-debounce no avisa nada', () => {
        vi.useFakeTimers();
        try {
            montar(HTML());
            const vistos: string[] = [];
            document.addEventListener('ts:debouncedinput', () => vistos.push('x'));
            escribir('a');
            vi.advanceTimersByTime(1000);
            expect(vistos).toEqual([]);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('Input: loading y debounce, el mismo mecanismo que Textarea', () => {
    const HTML = (extra = '') => `
    <div class="ts input" data-ts-input>
      <input id="i" class="ts input-field" value="bruno.diaz" ${extra}>
      <div class="ts input-actions">
        <span class="ts input-loading" data-ts-field-spinner hidden><span role="status" aria-label="Cargando..."></span></span>
        <button type="button" data-ts-clear aria-label="Limpiar campo">x</button>
      </div>
    </div>`;
    const campo = () => q<HTMLInputElement>('input');
    const escribir = (v: string) => {
        campo().value = v;
        campo().dispatchEvent(new Event('input', { bubbles: true }));
    };

    it('setInputLoading marca is-loading, aria-busy y muestra el Spinner sin bloquear el campo', () => {
        const raiz = montar(HTML());
        setInputLoading(raiz, true);
        expect(raiz.classList.contains('is-loading')).toBe(true);
        expect(campo().getAttribute('aria-busy')).toBe('true');
        expect(q('[data-ts-field-spinner]').hidden).toBe(false);
        expect(campo().disabled).toBe(false);
        setInputLoading(raiz, false);
        expect(raiz.classList.contains('is-loading')).toBe(false);
        expect(campo().hasAttribute('aria-busy')).toBe(false);
        expect(q('[data-ts-field-spinner]').hidden).toBe(true);
    });

    it('data-ts-debounce sin valor espera los 300 ms por defecto', () => {
        vi.useFakeTimers();
        try {
            montar(HTML('data-ts-debounce'));
            const vistos: string[] = [];
            document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
            escribir('a');
            vi.advanceTimersByTime(299);
            expect(vistos).toEqual([]);
            vi.advanceTimersByTime(1);
            expect(vistos).toEqual(['a']);
        } finally {
            vi.useRealTimers();
        }
    });

    it('data-ts-debounce: una ráfaga avisa una sola vez con ts:debouncedinput', () => {
        vi.useFakeTimers();
        try {
            montar(HTML('data-ts-debounce="300"'));
            const vistos: string[] = [];
            document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
            escribir('a');
            escribir('ab');
            vi.advanceTimersByTime(299);
            expect(vistos).toEqual([]);
            vi.advanceTimersByTime(1);
            expect(vistos).toEqual(['ab']);
        } finally {
            vi.useRealTimers();
        }
    });

    it('limpiar avisa el vacío ya mismo y no queda un aviso pendiente', () => {
        vi.useFakeTimers();
        try {
            montar(HTML('data-ts-debounce="300"'));
            const vistos: string[] = [];
            document.addEventListener('ts:debouncedinput', (e) => vistos.push((e as CustomEvent).detail.value));
            q('[data-ts-clear]').click();
            expect(vistos).toEqual(['']);
            vi.advanceTimersByTime(500);
            expect(vistos).toEqual(['']);
        } finally {
            vi.useRealTimers();
        }
    });

    it('sin data-ts-debounce no avisa nada', () => {
        vi.useFakeTimers();
        try {
            montar(HTML());
            const vistos: string[] = [];
            document.addEventListener('ts:debouncedinput', () => vistos.push('x'));
            escribir('a');
            vi.advanceTimersByTime(1000);
            expect(vistos).toEqual([]);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('Botón de limpiar del Select', () => {
    const SELECT = (valor = 'br', extra = '', multiple = false) => `
    <div class="ts select" data-ts-listbox="select" data-ts-select ${multiple ? 'data-ts-multiple' : ''}>
      <button type="button" data-ts-listbox-trigger role="combobox" aria-expanded="false" aria-controls="p" ${extra}>
        <span data-ts-listbox-label data-ts-placeholder="Elegí un país">Elegí un país</span>
      </button>
      <button type="button" data-ts-clear aria-label="Limpiar campo">x</button>
      <input type="hidden" name="pais" data-ts-listbox-value value="${valor}">
      <div id="p" data-ts-listbox-panel role="listbox" hidden>
        <div role="option" data-ts-value="ar" aria-selected="${valor.includes('ar')}">Argentina</div>
        <div role="option" data-ts-value="br" aria-selected="${valor.includes('br')}">Brasil</div>
      </div>
    </div>`;
    const boton = () => q<HTMLButtonElement>('[data-ts-clear]');
    const disparador = () => q<HTMLButtonElement>('[data-ts-listbox-trigger]');

    it('con selección el botón se ve; sin selección o con disabled, oculto desde el arranque', () => {
        montar(SELECT('br'));
        expect(boton().hidden).toBe(false);
        montar(SELECT(''));
        expect(boton().hidden).toBe(true);
        montar(SELECT('br', 'disabled'));
        expect(boton().hidden).toBe(true);
    });

    it('elegir una opción lo muestra', () => {
        montar(SELECT(''));
        disparador().click();
        q('[data-ts-value="ar"]').click();
        expect(boton().hidden).toBe(false);
    });

    it('click: deja el placeholder, vacía el hidden, avisa con ts:change, esconde el botón y enfoca el disparador', () => {
        montar(SELECT('br'));
        const avisos: unknown[] = [];
        const registrar = (e: Event) => avisos.push((e as CustomEvent).detail);
        document.addEventListener('ts:change', registrar);
        boton().click();
        document.removeEventListener('ts:change', registrar);

        expect(q('[data-ts-listbox-label]').textContent).toBe('Elegí un país');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('');
        expect(qq('[role="option"][aria-selected="true"]')).toHaveLength(0);
        expect(avisos).toEqual([{ component: 'select', value: '', selection: [] }]);
        expect(boton().hidden).toBe(true);
        expect(document.activeElement).toBe(disparador());
    });

    it('en múltiple quita toda la selección', () => {
        montar(SELECT('ar,br', '', true));
        expect(qq('[role="option"][aria-selected="true"]')).toHaveLength(2);
        boton().click();
        expect(qq('[role="option"][aria-selected="true"]')).toHaveLength(0);
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('');
    });

    it('preventDefault en ts:change cancela: la selección no cambia', () => {
        montar(SELECT('br'));
        const cancelar = (e: Event) => e.preventDefault();
        document.addEventListener('ts:change', cancelar);
        boton().click();
        document.removeEventListener('ts:change', cancelar);
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('br');
    });

    it('un Select con clearable dentro de un formulario con otro input no confunde los botones', () => {
        montar(`<div><input class="ts input-field" value="x">${SELECT('br')}</div>`);
        boton().click();
        expect(q<HTMLInputElement>('input.ts.input-field').value).toBe('x');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('');
    });
});

describe('Popover: el foco vuelve al disparador', () => {
    const HTML = `
    <button popovertarget="p1" id="disparador">Ver detalle</button>
    <div id="p1" popover="auto"><button id="dentro">Ok</button></div>
    <button id="otro">Otro</button>`;
    const alternar = (nuevo: 'open' | 'closed') => {
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: nuevo });
        q('#p1').classList.toggle('is-visible', nuevo === 'open');
        q('#p1').dispatchEvent(e);
    };
    const cerrar = () => alternar('closed');

    it('si el foco quedó huérfano en <body> al cerrar, vuelve al disparador', () => {
        montar(HTML);
        q('#dentro').focus();
        q('#dentro').blur();
        cerrar();
        expect(document.activeElement).toBe(q('#disparador'));
    });

    it('si el foco ya está en otro control, no se lo roba', () => {
        montar(HTML);
        q('#otro').focus();
        cerrar();
        expect(document.activeElement).toBe(q('#otro'));
    });

    it('si el foco quedó dentro del panel ya cerrado (WebKit no enfoca el botón al hacer clic), vuelve al disparador', () => {
        montar(HTML);
        alternar('open');
        expect(document.activeElement).toBe(q('#dentro'));
        cerrar();
        expect(document.activeElement).toBe(q('#disparador'));
    });

    it('al abrir, el foco entra al destino marcado con data-ts-autofocus', () => {
        montar(HTML.replace('<button id="dentro">', '<button id="antes">Antes</button><button id="dentro" data-ts-autofocus>'));
        alternar('open');
        expect(document.activeElement).toBe(q('#dentro'));
    });

    it('al abrir sin destino marcado, el foco va al primer focoable', () => {
        montar(HTML);
        alternar('open');
        expect(document.activeElement).toBe(q('#dentro'));
    });

    it('el calendario marca su día enfocable como destino del foco', () => {
        montar(`<div data-ts-date-picker data-ts-value="2026-07-07" data-ts-month="2026-07-01">
            <div data-ts-date-grid></div></div>`);
        const marcados = document.querySelectorAll('[data-ts-autofocus]');
        expect(marcados).toHaveLength(1);
        expect(marcados[0].getAttribute('data-ts-value')).toBe('2026-07-07');
    });
});

describe('Pagination', () => {
    const HTML = `
    <nav data-ts-pagination data-ts-total="20" data-ts-page="1">
      <button data-ts-page-prev>‹</button>
      <div data-ts-pagination-list>
        <button class="ts-page" data-ts-page-item data-ts-value="1" aria-label="Página 1">1</button>
        <span data-ts-page-ellipsis>…</span>
      </div>
      <button data-ts-page-next>›</button>
    </nav>`;

    it('cada botón de página lleva su propio nombre accesible', () => {
        const raiz = montar(HTML);
        const nombres = () => qq('[data-ts-page-item]').map((b) => b.getAttribute('aria-label'));
        expect(nombres()[0]).toBe('Página 1');
        expect(nombres().at(-1)).toBe('Página 20');
        raiz.setAttribute('data-ts-page', '10');
        q('[data-ts-page-next]').click();
        expect(qq('[data-ts-page-item]').every((b) => b.getAttribute('aria-label') === `Página ${b.textContent}`)).toBe(true);
    });

    it('el foco que estaba en un número queda en la página elegida y no se pierde al reconstruir', () => {
        montar(HTML);
        const dos = qq('[data-ts-page-item]').find((b) => b.getAttribute('data-ts-value') === '2')!;
        dos.focus();
        dos.click();
        expect(document.activeElement).not.toBe(document.body);
        expect(document.activeElement?.getAttribute('aria-current')).toBe('page');
        expect(document.activeElement?.getAttribute('data-ts-value')).toBe('2');
    });

    it('si el foco estaba fuera de los números, no se lo roba', () => {
        montar(HTML);
        q('[data-ts-page-next]').focus();
        q('[data-ts-page-next]').click();
        expect(document.activeElement).toBe(q('[data-ts-page-next]'));
    });

    it('dibuja la ventana de páginas al inicializar', () => {
        montar(HTML);
        const valores = qq('[data-ts-page-item]').map((b) => b.getAttribute('data-ts-value'));

        expect(valores[0]).toBe('1');
        expect(valores.at(-1)).toBe('20');
        expect(qq('[data-ts-page-ellipsis]').length).toBeGreaterThan(0);
    });

    it('re-dibuja al cambiar de página: los puntos suspensivos se mueven', () => {
        const raiz = montar(HTML);
        raiz.setAttribute('data-ts-page', '10');
        q('[data-ts-page-next]').click();

        expect(raiz.getAttribute('data-ts-page')).toBe('11');
        const valores = qq('[data-ts-page-item]').map((b) => b.getAttribute('data-ts-value'));
        expect(valores).toContain('11');
        expect(qq('[data-ts-page-item]').find((b) => b.classList.contains('is-active'))?.textContent).toBe('11');
    });

    it('redibuja al cambiar data-ts-total o data-ts-page desde afuera', async () => {
        const raiz = montar(HTML);
        raiz.setAttribute('data-ts-total', '3');
        await Promise.resolve();
        expect(qq('[data-ts-page-item]').map((b) => b.getAttribute('data-ts-value'))).toEqual(['1', '2', '3']);
        raiz.setAttribute('data-ts-page', '3');
        await Promise.resolve();
        expect(qq('[data-ts-page-item]').find((b) => b.classList.contains('is-active'))?.textContent).toBe('3');
        expect(q<HTMLButtonElement>('[data-ts-page-next]').disabled).toBe(true);
    });

    it('conserva las clases del HTML al clonar (no las clava el JS)', () => {
        montar(HTML);
        expect(qq('[data-ts-page-item]').every((b) => b.classList.contains('ts-page'))).toBe(true);
    });

    it('deshabilita los extremos', () => {
        const raiz = montar(HTML);
        expect(q<HTMLButtonElement>('[data-ts-page-prev]').disabled).toBe(true);

        raiz.setAttribute('data-ts-page', '20');
        q('[data-ts-page-item]').click();
        raiz.setAttribute('data-ts-page', '19');
        q('[data-ts-page-next]').click();
        expect(q<HTMLButtonElement>('[data-ts-page-next]').disabled).toBe(true);
    });

    it('marca la página actual para lectores de pantalla', () => {
        montar(HTML);
        const activa = qq('[data-ts-page-item]').find((b) => b.getAttribute('aria-current') === 'page');
        expect(activa?.textContent).toBe('1');
    });
});

describe('FileUpload', () => {
    const HTML = `
    <div data-ts-file-upload data-ts-max-size="100">
      <input type="file" data-ts-file-input hidden>
      <button data-ts-file-trigger>Elegir</button>
      <ul data-ts-file-list></ul>
    </div>`;

    const soltar = (raiz: HTMLElement, archivos: File[]) => {
        const e = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
        Object.defineProperty(e, 'dataTransfer', { value: { files: archivos } });
        raiz.dispatchEvent(e);
        return e;
    };

    it('lista lo que se suelta, con el peso legible', () => {
        const raiz = montar(HTML);
        soltar(raiz, [new File(['xy'], 'nota.txt', { type: 'text/plain' })]);

        expect(q('[data-ts-file-item]').textContent).toContain('nota.txt');
        expect(q('[data-ts-file-item]').textContent).toContain('2 B');
    });

    it('marca el que se pasa del tamaño en vez de aceptarlo callado', () => {
        const raiz = montar(HTML);
        soltar(raiz, [new File([new Uint8Array(200)], 'grande.bin')]);

        expect(q('[data-ts-file-item]').hasAttribute('data-ts-file-error')).toBe(true);
        expect(q('[data-ts-file-item]').textContent).toContain('Demasiado grande');
    });

    const HTML_MULTIPLE = `
    <div data-ts-file-upload data-ts-max-size="100">
      <input type="file" data-ts-file-input multiple hidden>
      <ul data-ts-file-list hidden></ul>
      <template data-ts-file-template><li class="ts file-upload-item"><svg id="archivo"></svg><div data-file-info><span data-file-name></span><span data-file-size></span></div><button type="button" data-file-remove aria-label="Quitar {nombre}"><svg></svg></button></li></template>
      <template data-ts-file-error-icon><svg id="alerta"></svg></template>
    </div>`;
    const nombres = () => qq('[data-file-name]').map((n) => n.textContent);

    it('con multiple cada selección se suma a la lista', () => {
        const raiz = montar(HTML_MULTIPLE);
        soltar(raiz, [new File(['xy'], 'a.txt', { type: 'text/plain' })]);
        soltar(raiz, [new File(['x'], 'b.txt'), new File([new Uint8Array(200)], 'enorme.bin')]);

        expect(nombres()).toEqual(['a.txt', 'b.txt', 'enorme.bin']);
        const filas = qq('[data-ts-file-item]');
        expect(filas[0].querySelector('[data-file-size]')?.textContent).toBe('2 B');
        expect(filas[0].querySelector('button')?.getAttribute('aria-label')).toBe('Quitar a.txt');
        expect(filas[2].hasAttribute('data-ts-file-error')).toBe(true);
        expect(filas[2].querySelector('[data-file-error]')?.textContent).toContain('Demasiado grande');
        expect(filas[2].querySelector('[data-file-size]')).toBeNull();
        expect(filas[2].querySelector('svg')?.id).toBe('alerta');
        expect(filas[0].querySelector('svg')?.id).toBe('archivo');
    });

    it('sin multiple la selección nueva reemplaza la lista', () => {
        const raiz = montar(HTML);
        soltar(raiz, [new File(['x'], 'a.txt')]);
        soltar(raiz, [new File(['x'], 'b.txt')]);

        expect(qq('[data-ts-file-item]').map((f) => f.textContent)).toHaveLength(1);
        expect(q('[data-ts-file-item]').textContent).toContain('b.txt');
    });

    it('«Quitar» saca ese archivo y avisa con la lista que queda', () => {
        const raiz = montar(HTML_MULTIPLE);
        const avisos: number[] = [];
        raiz.addEventListener('ts:change', (e) => avisos.push((e as CustomEvent).detail.files.length));
        soltar(raiz, [new File(['x'], 'a.txt'), new File(['x'], 'b.txt'), new File(['x'], 'c.txt')]);
        qq('[data-file-remove]')[1].click();

        expect(nombres()).toEqual(['a.txt', 'c.txt']);
        expect(avisos).toEqual([3, 2]);
    });

    it('la lista vacía va oculta y se muestra con el primer archivo (y se oculta al quitarlo)', () => {
        const raiz = montar(HTML_MULTIPLE);
        const lista = q('[data-ts-file-list]');
        expect(lista.hidden).toBe(true);
        soltar(raiz, [new File(['x'], 'a.txt')]);
        expect(lista.hidden).toBe(false);
        q('[data-file-remove]').click();
        expect(lista.hidden).toBe(true);
    });

    it('si la app cancela el cambio, la lista no se toca', () => {
        const raiz = montar(HTML_MULTIPLE);
        soltar(raiz, [new File(['x'], 'a.txt')]);
        raiz.addEventListener('ts:change', (e) => e.preventDefault());
        soltar(raiz, [new File(['x'], 'b.txt')]);

        expect(nombres()).toEqual(['a.txt']);
    });

    it('cancela el dragover: si no, el navegador abre el archivo y se pierde la página', () => {
        const raiz = montar(HTML);
        const e = new Event('dragover', { bubbles: true, cancelable: true });
        raiz.dispatchEvent(e);

        expect(e.defaultPrevented).toBe(true);
        expect(raiz.classList.contains('is-dragging')).toBe(true);
    });

    it('el botón abre el diálogo nativo', () => {
        montar(HTML);
        const espia = vi.spyOn(q<HTMLInputElement>('[data-ts-file-input]'), 'click');
        q('[data-ts-file-trigger]').click();

        expect(espia).toHaveBeenCalled();
    });

    it('los errores salen de los atributos de la raíz; sin ellos, en español', () => {
        const errores = () => qq('[data-ts-file-item]').map((f) => f.textContent);
        const archivos = () => [new File([new Uint8Array(200)], 'grande.txt', { type: 'text/plain' }), new File(['x'], 'logo.png', { type: 'image/png' })];
        const conAccept = (atributos: string) => `
        <div data-ts-file-upload data-ts-max-size="100" ${atributos}>
          <input type="file" data-ts-file-input accept="text/plain" multiple hidden>
          <ul data-ts-file-list></ul>
        </div>`;

        soltar(montar(conAccept('')), archivos());
        expect(errores()).toEqual(['grande.txt — Demasiado grande (máx. 100 B)', 'logo.png — Tipo de archivo no permitido']);

        soltar(montar(conAccept('data-ts-file-error-size="Too large (max. 100 B)" data-ts-file-error-type="File type not allowed"')), archivos());
        expect(errores()).toEqual(['grande.txt — Too large (max. 100 B)', 'logo.png — File type not allowed']);
    });
});

describe('Scrollspy (Toc)', () => {
    it('marca activo el encabezado que se está leyendo', () => {
        montar(`
      <div>
        <nav data-ts-scrollspy data-ts-offset="0">
          <a href="#a" data-ts-scrollspy-link>A</a>
          <a href="#b" data-ts-scrollspy-link>B</a>
        </nav>
        <h2 id="a">A</h2>
        <h2 id="b">B</h2>
      </div>`);

        q('#a').getBoundingClientRect = () => ({ top: -10 }) as DOMRect;
        q('#b').getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
        window.dispatchEvent(new Event('scroll'));

        expect(q('[href="#a"]').classList.contains('is-active')).toBe(true);
        expect(q('[href="#b"]').classList.contains('is-active')).toBe(false);
        expect(q('[href="#a"]').getAttribute('aria-current')).toBe('location');
        expect(q('[href="#b"]').hasAttribute('aria-current')).toBe(false);
    });

    it('si la página entra entera en la pantalla queda activo el primero, no el último', () => {
        montar(`
      <div>
        <nav data-ts-scrollspy data-ts-offset="0">
          <a href="#a" data-ts-scrollspy-link>A</a>
          <a href="#b" data-ts-scrollspy-link>B</a>
        </nav>
        <h2 id="a">A</h2>
        <h2 id="b">B</h2>
      </div>`);
        q('#a').getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
        q('#b').getBoundingClientRect = () => ({ top: 200 }) as DOMRect;
        window.dispatchEvent(new Event('scroll'));

        expect(q('[href="#a"]').classList.contains('is-active')).toBe(true);
        expect(q('[href="#b"]').classList.contains('is-active')).toBe(false);
    });
});

describe('Overlays (Tooltip)', () => {
    const HTML = `
    <span data-ts-tooltip-root>
      <button aria-describedby="t1">Ayuda</button>
      <span id="t1" role="tooltip" data-ts-tooltip data-ts-placement="top">Texto</span>
    </span>`;

    it('con el foco aparece SIN esperar el retardo del mouse', () => {
        montar(HTML);
        q('button').dispatchEvent(new Event('focusin', { bubbles: true }));

        expect(q('#t1').classList.contains('is-visible')).toBe(true);
    });

    it('Escape lo cierra', () => {
        montar(HTML);
        q('button').dispatchEvent(new Event('focusin', { bubbles: true }));
        q('button').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(q('#t1').classList.contains('is-visible')).toBe(false);
    });

    it('junto al borde del viewport deja el mismo margen que la separación (token quarter = 6)', () => {
        montar(HTML);
        const caja = (r: Partial<DOMRect>) => () => ({ ...r, right: (r.left ?? 0) + (r.width ?? 0), bottom: (r.top ?? 0) + (r.height ?? 0) }) as DOMRect;
        q('[data-ts-tooltip-root]').getBoundingClientRect = caja({ left: 0, top: 100, width: 30, height: 30 });
        q('#t1').getBoundingClientRect = caja({ left: 0, top: 0, width: 100, height: 20 });
        q('button').dispatchEvent(new Event('focusin', { bubbles: true }));

        expect(q('#t1').style.getPropertyValue('--ts-overlay-x')).toBe('6px');
        expect(q('#t1').style.getPropertyValue('--ts-overlay-y')).toBe('74px');
    });

    it('con el mouse espera el retardo, para no abrirse al cruzar la pantalla', async () => {
        vi.useFakeTimers();
        montar(HTML);
        q('button').dispatchEvent(new Event('mouseover', { bubbles: true }));
        expect(q('#t1').classList.contains('is-visible')).toBe(false);

        vi.advanceTimersByTime(200);
        expect(q('#t1').classList.contains('is-visible')).toBe(true);
        vi.useRealTimers();
    });

    const SIN_ENLACE = `
    <span data-ts-tooltip-root>
      <button>Ayuda</button>
      <span id="t1" role="tooltip" data-ts-tooltip data-ts-placement="top">Texto</span>
    </span>`;

    it('al preparar, aria-describedby queda en el botón y no en el envoltorio', () => {
        montar(SIN_ENLACE);
        expect(q('button').getAttribute('aria-describedby')).toBe('t1');
        expect(q('[data-ts-tooltip-root]').hasAttribute('aria-describedby')).toBe(false);
    });

    it('si el envoltorio traía la descripción, se mueve al botón sin duplicar ni pisar otras', () => {
        montar(`
    <span data-ts-tooltip-root aria-describedby="t1 otra">
      <button aria-describedby="ayuda">Ayuda</button>
      <span id="t1" role="tooltip" data-ts-tooltip>Texto</span>
    </span>`);
        expect(q('button').getAttribute('aria-describedby')).toBe('ayuda t1');
        expect(q('[data-ts-tooltip-root]').getAttribute('aria-describedby')).toBe('otra');
        init(document);
        expect(q('button').getAttribute('aria-describedby')).toBe('ayuda t1');
    });

    it('el disparador es el primer enfocable: un enlace, no un botón deshabilitado ni el tooltip', () => {
        montar(`
    <span data-ts-tooltip-root>
      <button disabled>No</button><a href="#x">Ir</a>
      <span id="t1" role="tooltip" data-ts-tooltip>Texto<a href="#y">dentro</a></span>
    </span>`);
        expect(q('a[href="#x"]').getAttribute('aria-describedby')).toBe('t1');
        expect(q('button').hasAttribute('aria-describedby')).toBe(false);
        expect(q('a[href="#y"]').hasAttribute('aria-describedby')).toBe(false);
    });

    it('sin disparador enfocable, la descripción queda en el envoltorio', () => {
        montar(`
    <span data-ts-tooltip-root><span>Ícono</span>
      <span id="t1" role="tooltip" data-ts-tooltip>Texto</span>
    </span>`);
        expect(q('[data-ts-tooltip-root]').getAttribute('aria-describedby')).toBe('t1');
    });

    it('un tooltip agregado después también se prepara', async () => {
        montar('<div id="host"></div>');
        q('#host').innerHTML = SIN_ENLACE;
        await Promise.resolve();
        expect(q('button').getAttribute('aria-describedby')).toBe('t1');
    });

    it('Escape cierra el tooltip visible aunque el foco esté en otro lado, y consume la tecla', () => {
        montar(`${HTML}<button id="otro">Otro</button>`);
        q('button').dispatchEvent(new Event('focusin', { bubbles: true }));
        expect(q('#t1').classList.contains('is-visible')).toBe(true);

        const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        q('#otro').dispatchEvent(e);
        expect(q('#t1').classList.contains('is-visible')).toBe(false);
        expect(e.defaultPrevented).toBe(true);
    });

    it('Escape sin tooltip visible no se consume: le llega al Modal o Menu de abajo', () => {
        montar(HTML);
        const visto = vi.fn();
        document.addEventListener('keydown', visto);
        const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        q('button').dispatchEvent(e);
        document.removeEventListener('keydown', visto);
        expect(e.defaultPrevented).toBe(false);
        expect(visto).toHaveBeenCalledTimes(1);
    });

    it('al dejar el puntero espera 100 ms, y volver (o entrar al globo) lo cancela', () => {
        vi.useFakeTimers();
        montar(HTML);
        q('button').dispatchEvent(new Event('focusin', { bubbles: true }));
        q('button').dispatchEvent(new Event('mouseout', { bubbles: true }));
        vi.advanceTimersByTime(99);
        expect(q('#t1').classList.contains('is-visible')).toBe(true);
        vi.advanceTimersByTime(2);
        expect(q('#t1').classList.contains('is-visible')).toBe(false);

        q('button').dispatchEvent(new Event('focusin', { bubbles: true }));
        q('button').dispatchEvent(new Event('mouseout', { bubbles: true }));
        vi.advanceTimersByTime(50);
        q('#t1').dispatchEvent(new Event('mouseover', { bubbles: true }));
        vi.advanceTimersByTime(500);
        expect(q('#t1').classList.contains('is-visible')).toBe(true);
        vi.useRealTimers();
    });

    it('al perder el foco se oculta sin demora', () => {
        vi.useFakeTimers();
        montar(HTML);
        q('button').dispatchEvent(new Event('focusin', { bubbles: true }));
        q('button').dispatchEvent(new Event('focusout', { bubbles: true }));
        expect(q('#t1').classList.contains('is-visible')).toBe(false);
        vi.useRealTimers();
    });
});

describe('NumberInput: flechas, signo y formato', () => {
    const HTML = (campo: string, raiz = '', extra = '') => `
    <div class="wrap"><div data-ts-number ${raiz}>
      <button data-ts-number-step="-1">−</button>
      <input data-ts-number-field ${campo}>
      <button data-ts-number-step="1">+</button>
    </div>${extra}</div>`;
    const campo = () => q<HTMLInputElement>('[data-ts-number-field]');
    const tecla = (key: string) => {
        const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        campo().dispatchEvent(e);
        return e;
    };
    const escribir = (v: string) => {
        campo().value = v;
        campo().dispatchEvent(new Event('input', { bubbles: true }));
    };
    const FORMATO = `data-ts-number-format='{"style":"currency","currency":"USD","useGrouping":"always"}' data-ts-locale="es-ES"`;
    const limpio = (t: string) => t.replace(/\s/g, ' ');

    it('↑/↓ suman el paso al valor (0,5 + 1 = 1,5) y consumen la tecla', () => {
        montar(HTML('type="number" min="0" max="10" step="1" value="0.5"'));
        expect(tecla('ArrowUp').defaultPrevented).toBe(true);
        expect(campo().value).toBe('1.5');
        tecla('ArrowDown');
        expect(campo().value).toBe('0.5');
    });

    it('con el campo vacío y foco, ↑ y RePág parten del último valor válido (no de min)', () => {
        montar(HTML('type="number" min="0" max="100" step="1" value="5"'));
        campo().focus();
        escribir('');
        tecla('ArrowUp');
        expect(campo().value).toBe('6');
        escribir('');
        tecla('PageUp');
        expect(campo().value).toBe('16');
    });

    it('↑ en el tope no cambia nada; con readonly no consume la tecla', () => {
        montar(HTML('type="number" min="0" max="10" step="1" value="10"'));
        tecla('ArrowUp');
        expect(campo().value).toBe('10');
        montar(HTML('type="number" step="1" value="3" readonly'));
        expect(tecla('ArrowUp').defaultPrevented).toBe(false);
        expect(campo().value).toBe('3');
    });

    it('con min=0 el signo menos se cancela en beforeinput; con min negativo pasa', () => {
        montar(HTML('type="number" min="0" value="1"'));
        const a = new InputEvent('beforeinput', { data: '-', cancelable: true, bubbles: true });
        campo().dispatchEvent(a);
        expect(a.defaultPrevented).toBe(true);
        montar(HTML('type="number" min="-10" value="1"'));
        const b = new InputEvent('beforeinput', { data: '-', cancelable: true, bubbles: true });
        campo().dispatchEvent(b);
        expect(b.defaultPrevented).toBe(false);
    });

    it('con foco muestra el crudo, al salir el formato, sin eventos de cambio si no se tocó', () => {
        montar(HTML(`type="text" role="spinbutton" min="0" step="0.5" value="12.500,50 US$"`, FORMATO, '<input type="hidden" data-ts-number-raw value="12500.5">'));
        const espia = vi.fn();
        document.addEventListener('ts:change', espia);
        campo().focus();
        expect(campo().value).toBe('12500,5');
        campo().blur();
        expect(limpio(campo().value)).toBe('12.500,50 US$');
        expect(espia).not.toHaveBeenCalled();
        document.removeEventListener('ts:change', espia);
    });

    it('tipear actualiza el hidden crudo y el aria-valuenow; un valor fuera de rango se acota al salir', () => {
        montar(HTML(`type="text" role="spinbutton" min="0" max="100" step="1" value="5,00 US$"`, FORMATO, '<input type="hidden" name="p" data-ts-number-raw value="5">'));
        campo().focus();
        escribir('42,5');
        expect(q<HTMLInputElement>('[data-ts-number-raw]').value).toBe('42.5');
        expect(campo().getAttribute('aria-valuenow')).toBe('42.5');
        escribir('9x99');
        expect(campo().value).toBe('999');
        expect(q<HTMLInputElement>('[data-ts-number-raw]').value).toBe('100');
        campo().blur();
        expect(limpio(campo().value)).toBe('100,00 US$');
    });

    it('botones y flechas escriben el formato y el crudo; en porcentaje el valor es la fracción', () => {
        montar(HTML(`type="text" role="spinbutton" min="0" max="1" step="0.05" value="15 %"`, `data-ts-number-format='{"style":"percent"}' data-ts-locale="es-ES"`, '<input type="hidden" data-ts-number-raw value="0.15">'));
        q<HTMLButtonElement>('[data-ts-number-step="1"]').click();
        expect(limpio(campo().value)).toBe('20 %');
        expect(q<HTMLInputElement>('[data-ts-number-raw]').value).toBe('0.2');
        campo().focus();
        tecla('ArrowUp');
        expect(campo().value).toBe('25');
        expect(q<HTMLInputElement>('[data-ts-number-raw]').value).toBe('0.25');
    });
});

describe('Formularios: el valor de un control deshabilitado no viaja', () => {
    const viaja = (nombre: string) => new FormData(q<HTMLFormElement>('form')).has(nombre);
    const SELECT = (extra = '') => `
    <form>
      <div class="ts select" data-ts-listbox="select" data-ts-select>
        <button type="button" data-ts-listbox-trigger role="combobox" aria-expanded="false" aria-controls="p" ${extra}>
          <span data-ts-listbox-label data-ts-placeholder="Elegí un entorno">Staging</span>
        </button>
        <input type="hidden" name="entorno" data-ts-listbox-value value="staging">
        <div id="p" data-ts-listbox-panel role="listbox" hidden>
          <div role="option" data-ts-value="staging" aria-selected="true">Staging</div>
          <div role="option" data-ts-value="produccion" aria-selected="false">Producción</div>
        </div>
      </div>
    </form>`;

    it('Select: con el disparador disabled el hidden queda disabled al iniciar', () => {
        montar(SELECT('disabled'));
        expect(viaja('entorno')).toBe(false);
    });

    it('Select: habilitado viaja', () => {
        montar(SELECT());
        expect(viaja('entorno')).toBe(true);
    });

    it('Select: si el disparador se (de)shabilita por JS, el envío lo sigue', async () => {
        montar(SELECT());
        q<HTMLButtonElement>('[data-ts-listbox-trigger]').disabled = true;
        await vi.waitFor(() => expect(viaja('entorno')).toBe(false));
        q<HTMLButtonElement>('[data-ts-listbox-trigger]').disabled = false;
        await vi.waitFor(() => expect(viaja('entorno')).toBe(true));
    });

    it('Select múltiple deshabilitado: los hidden clonados al elegir nacen disabled', () => {
        montar(
            SELECT('disabled')
                .replace('data-ts-select>', 'data-ts-select data-ts-multiple>')
                .replace('<input type="hidden" name="entorno" data-ts-listbox-value value="staging">', '<input type="hidden" disabled data-ts-listbox-template name="entorno">'),
        );
        expect(viaja('entorno')).toBe(false);
    });

    it('Combobox: con el input disabled el hidden no viaja', () => {
        montar(`
        <form>
          <div data-ts-listbox="combobox" data-ts-combobox>
            <input data-ts-listbox-input role="combobox" aria-expanded="false" aria-controls="c" value="Staging" disabled>
            <input type="hidden" name="entorno" data-ts-listbox-value value="staging">
            <div id="c" data-ts-listbox-panel role="listbox" hidden>
              <div role="option" data-ts-value="staging" aria-selected="true">Staging</div>
            </div>
          </div>
        </form>`);
        expect(viaja('entorno')).toBe(false);
    });

    const FECHA = (extra = '') => `
    <form>
      <div class="ts popover-root">
        <button type="button" class="ts datepicker-trigger" popovertarget="pop" aria-haspopup="dialog" aria-expanded="false" ${extra}>
          <span class="ts datepicker-value">14 jul 2026</span>
        </button>
        <div id="pop" popover="auto">
          <div data-ts-date-picker data-ts-locale="es-AR" data-ts-value="2026-07-14" data-ts-month="2026-07-01"></div>
        </div>
      </div>
      <input type="hidden" name="fecha" value="2026-07-14" data-ts-date-input>
    </form>`;

    it('DatePicker: con el disparador disabled el hidden no viaja', () => {
        montar(FECHA('disabled'));
        expect(viaja('fecha')).toBe(false);
    });

    it('DatePicker: habilitado viaja, y el envío sigue al disabled por JS', async () => {
        montar(FECHA());
        expect(viaja('fecha')).toBe(true);
        q<HTMLButtonElement>('.ts.datepicker-trigger').disabled = true;
        await vi.waitFor(() => expect(viaja('fecha')).toBe(false));
    });

    const NUMERO = (campo = '') => `
    <form>
      <div data-ts-number data-ts-number-format='{"style":"decimal"}' data-ts-locale="es-AR">
        <button data-ts-number-step="-1">−</button>
        <input type="text" role="spinbutton" data-ts-number-field min="0" step="1" value="1.234" ${campo}>
        <button data-ts-number-step="1">+</button>
      </div>
      <input type="hidden" name="presupuesto" value="1234" data-ts-number-raw>
    </form>`;

    it('NumberInput con formato: con el campo disabled el crudo no viaja', () => {
        montar(NUMERO('disabled'));
        expect(viaja('presupuesto')).toBe(false);
    });

    it('NumberInput con formato: habilitado viaja, y el envío sigue al disabled por JS', async () => {
        montar(NUMERO());
        expect(viaja('presupuesto')).toBe(true);
        q<HTMLInputElement>('[data-ts-number-field]').disabled = true;
        await vi.waitFor(() => expect(viaja('presupuesto')).toBe(false));
    });

    it('un NumberInput disabled mantiene apagados los botones del stepper', () => {
        montar(NUMERO('disabled'));
        expect(qq('[data-ts-number-step]').every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    });
});

describe('Formularios: required bloquea el envío vacío en Select', () => {
    const SELECT = (opts: { multiple?: boolean; elegido?: string; disabled?: boolean; readonly?: boolean; clearable?: boolean; proxy?: string } = {}) => `
    <form>
      <div class="ts select" data-ts-listbox="select" data-ts-select ${opts.multiple ? 'data-ts-multiple' : ''}>
        <button type="button" data-ts-listbox-trigger role="combobox" aria-expanded="false" aria-controls="p" ${opts.disabled ? 'disabled' : ''}>
          <span data-ts-listbox-label data-ts-placeholder="Elegí un entorno" data-ts-count-suffix="seleccionados">Elegí un entorno</span>
        </button>
        <input type="text" class="ts required-proxy" data-ts-required-proxy tabindex="-1" aria-hidden="true" autocomplete="off" required ${opts.disabled ? 'disabled' : ''} ${opts.readonly ? 'readonly' : ''} value="${opts.proxy ?? opts.elegido ?? ''}">
        ${opts.clearable ? '<button type="button" data-ts-clear>x</button>' : ''}
        ${opts.multiple ? '<input type="hidden" disabled data-ts-listbox-template name="entorno">' : `<input type="hidden" name="entorno" data-ts-listbox-value value="${opts.elegido ?? ''}">`}
        <div id="p" data-ts-listbox-panel role="listbox" hidden>
          <div role="option" data-ts-value="staging" aria-selected="${opts.elegido === 'staging'}">Staging</div>
          <div role="option" data-ts-value="produccion" aria-selected="false">Producción</div>
        </div>
      </div>
    </form>`;
    const form = () => q<HTMLFormElement>('form');
    const opcion = (v: string) => q<HTMLElement>(`[role="option"][data-ts-value="${v}"]`);

    it('vacío no valida; al elegir, sí', () => {
        montar(SELECT());
        expect(form().checkValidity()).toBe(false);
        opcion('staging').click();
        expect(form().checkValidity()).toBe(true);
        expect(q<HTMLInputElement>('[data-ts-required-proxy]').value).toBe('staging');
    });

    it('el input de validación no viaja en el formulario', () => {
        montar(SELECT({ elegido: 'staging' }));
        expect([...new FormData(form()).keys()]).toEqual(['entorno']);
    });

    it('al limpiar vuelve a bloquear', () => {
        montar(SELECT({ elegido: 'staging', clearable: true }));
        expect(form().checkValidity()).toBe(true);
        limpiar();
        expect(form().checkValidity()).toBe(false);
    });

    function limpiar() {
        q<HTMLElement>('[data-ts-clear]').click();
    }

    it('múltiple: con uno valida; al quitar el último vuelve a bloquear', () => {
        montar(SELECT({ multiple: true }));
        expect(form().checkValidity()).toBe(false);
        opcion('staging').click();
        expect(form().checkValidity()).toBe(true);
        opcion('staging').click();
        expect(form().checkValidity()).toBe(false);
    });

    it('disabled y readonly no validan', () => {
        montar(SELECT({ disabled: true }));
        expect(form().checkValidity()).toBe(true);
        montar(SELECT({ readonly: true }));
        expect(form().checkValidity()).toBe(true);
    });

    it('si el disparador se (de)shabilita por JS, la validación lo sigue', async () => {
        montar(SELECT());
        q<HTMLButtonElement>('[data-ts-listbox-trigger]').disabled = true;
        await vi.waitFor(() => expect(form().checkValidity()).toBe(true));
        q<HTMLButtonElement>('[data-ts-listbox-trigger]').disabled = false;
        await vi.waitFor(() => expect(form().checkValidity()).toBe(false));
    });

    it('el foco del input de validación pasa al disparador', () => {
        montar(SELECT());
        q<HTMLInputElement>('[data-ts-required-proxy]').focus();
        expect(document.activeElement).toBe(q('[data-ts-listbox-trigger]'));
    });

    it('init sincroniza el valor con la opción marcada aunque el HTML no lo traiga', () => {
        montar(SELECT({ elegido: 'staging', proxy: '' }));
        expect(q<HTMLInputElement>('[data-ts-required-proxy]').value).toBe('staging');
    });

    it('form.reset() no desincroniza el input de validación de la selección', async () => {
        montar(SELECT({ elegido: 'staging' }));
        opcion('produccion').click();
        form().reset();
        await new Promise((r) => setTimeout(r, 5));
        expect(q<HTMLInputElement>('[data-ts-required-proxy]').value).toBe('staging');
        expect(form().checkValidity()).toBe(true);
    });

    describe('form.reset() vuelve a la selección inicial', () => {
        const esperar = () => new Promise((r) => setTimeout(r, 5));
        const hidden = () => (qq('[data-ts-listbox-value]') as HTMLInputElement[]).map((h) => h.value);
        const marcadas = () => qq('[role="option"][aria-selected="true"]').map((o) => o.getAttribute('data-ts-value'));

        it('simple: restaura opción, hidden, texto y validez, sin avisar', async () => {
            montar(SELECT({ elegido: 'staging' }));
            opcion('produccion').click();
            expect(hidden()).toEqual(['produccion']);
            const alCambiar = vi.fn();
            q('.ts.select').addEventListener('ts:change', alCambiar);
            form().reset();
            await esperar();
            expect(marcadas()).toEqual(['staging']);
            expect(hidden()).toEqual(['staging']);
            expect(q('[data-ts-listbox-label]').textContent).toBe('Staging');
            expect(alCambiar).not.toHaveBeenCalled();
        });

        it('simple sin valor inicial: vuelve al placeholder y a bloquear', async () => {
            montar(SELECT());
            opcion('staging').click();
            form().reset();
            await esperar();
            expect(marcadas()).toEqual([]);
            expect(q('[data-ts-listbox-label]').textContent).toBe('Elegí un entorno');
            expect(form().checkValidity()).toBe(false);
        });

        it('múltiple: quita los hidden de lo elegido después', async () => {
            montar(SELECT({ multiple: true }));
            opcion('staging').click();
            opcion('produccion').click();
            expect(hidden()).toEqual(['staging', 'produccion']);
            form().reset();
            await esperar();
            expect(marcadas()).toEqual([]);
            expect(hidden()).toEqual([]);
        });

        it('un reset cancelado (preventDefault) no restaura', async () => {
            montar(SELECT({ elegido: 'staging' }));
            form().addEventListener('reset', (e) => e.preventDefault());
            opcion('produccion').click();
            form().reset();
            await esperar();
            expect(marcadas()).toEqual(['produccion']);
            expect(hidden()).toEqual(['produccion']);
        });
    });
});

describe('DatePicker: loading, días no disponibles y marcas', () => {
    const SUELTO = (extra = '') => `
    <div data-ts-date-picker data-ts-locale="es-AR" data-ts-value="2026-07-14" data-ts-month="2026-07-01" ${extra}>
      <button data-ts-date-prev>‹</button><span data-ts-date-title></span><button data-ts-date-next>›</button>
      <div class="ts calendar-grid" role="grid">
        <div class="ts calendar-dow-row" role="row" data-ts-date-weekdays></div>
        <div data-ts-date-grid></div>
      </div>
    </div>`;
    const dia = (iso: string) => qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === iso)!;
    const bloqueado = (iso: string) => dia(iso).getAttribute('aria-disabled') === 'true';
    const tecla = (el: Element, key: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

    it('data-ts-disabled-weekdays deshabilita los días de la semana (0 = domingo) y no se eligen', () => {
        const raiz = montar(SUELTO('data-ts-disabled-weekdays="0 6"'));
        expect(bloqueado('2026-07-04')).toBe(true);
        expect(bloqueado('2026-07-05')).toBe(true);
        expect(bloqueado('2026-07-06')).toBe(false);
        dia('2026-07-04').click();
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-14');
        dia('2026-07-06').click();
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-06');
    });

    it('data-ts-disabled-dates deshabilita fechas puntuales, en cualquier mes visible', () => {
        montar(SUELTO('data-ts-disabled-dates="2026-07-09 2026-08-01"'));
        expect(bloqueado('2026-07-09')).toBe(true);
        expect(bloqueado('2026-07-10')).toBe(false);
        q('[data-ts-date-next]').click();
        expect(bloqueado('2026-08-01')).toBe(true);
    });

    it('las fuentes se suman a min/max (OR)', () => {
        montar(SUELTO('data-ts-min="2026-07-08" data-ts-disabled-weekdays="1" data-ts-disabled-dates="2026-07-15"'));
        expect(bloqueado('2026-07-07')).toBe(true);
        expect(bloqueado('2026-07-13')).toBe(true);
        expect(bloqueado('2026-07-15')).toBe(true);
        expect(bloqueado('2026-07-16')).toBe(false);
    });

    it('un día no disponible se enfoca con las flechas pero Enter no lo elige (APG)', () => {
        const raiz = montar(SUELTO('data-ts-disabled-dates="2026-07-15"'));
        dia('2026-07-14').focus();
        tecla(dia('2026-07-14'), 'ArrowRight');
        expect(document.activeElement).toBe(dia('2026-07-15'));
        tecla(document.activeElement!, 'Enter');
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-14');
    });

    it('setDatePickerDisabledDate registra la función disabledDate, redibuja y se puede quitar con null', () => {
        const raiz = montar(SUELTO());
        expect(bloqueado('2026-07-20')).toBe(false);
        setDatePickerDisabledDate(raiz, (d) => d.getDate() === 20);
        expect(bloqueado('2026-07-20')).toBe(true);
        expect(bloqueado('2026-07-21')).toBe(false);
        dia('2026-07-20').click();
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-14');
        q('[data-ts-date-next]').click();
        q('[data-ts-date-prev]').click();
        expect(bloqueado('2026-07-20')).toBe(true);
        setDatePickerDisabledDate(raiz, null);
        expect(bloqueado('2026-07-20')).toBe(false);
    });

    it('el observer redibuja al cambiar data-ts-disabled-* por JS', async () => {
        const raiz = montar(SUELTO());
        raiz.setAttribute('data-ts-disabled-weekdays', '0');
        await vi.waitFor(() => expect(bloqueado('2026-07-05')).toBe(true));
        raiz.setAttribute('data-ts-disabled-dates', '2026-07-10');
        await vi.waitFor(() => expect(bloqueado('2026-07-10')).toBe(true));
        raiz.removeAttribute('data-ts-disabled-weekdays');
        await vi.waitFor(() => expect(bloqueado('2026-07-05')).toBe(false));
    });

    const MARCAS = `[{"date":"2026-07-14","label":"Despliegue a producción","variant":"success"},{"date":"2026-07-21","label":"Reunión de equipo"},{"date":"2026-07-21","label":"Revisión de plan","variant":"warning"}]`;

    it('data-ts-day-marks dibuja el punto con la variante, extiende el aria-label y pone el title', () => {
        montar(SUELTO(`data-ts-day-marks='${MARCAS}'`));
        const marcado = dia('2026-07-14');
        const punto = marcado.querySelector('.ts.calendar-day-mark')!;
        expect(punto.classList.contains('variant-success')).toBe(true);
        expect(punto.getAttribute('aria-hidden')).toBe('true');
        expect(marcado.classList.contains('has-mark')).toBe(true);
        expect(marcado.getAttribute('aria-label')).toBe('martes, 14 de julio de 2026, Despliegue a producción');
        expect(marcado.title).toBe('Despliegue a producción');
        expect(dia('2026-07-15').querySelector('.ts.calendar-day-mark')).toBeNull();
        expect(dia('2026-07-15').hasAttribute('title')).toBe(false);
    });

    it('varias marcas en un día: un punto, textos unidos con coma y variante de la primera (default si falta)', () => {
        montar(SUELTO(`data-ts-day-marks='${MARCAS}'`));
        const d = dia('2026-07-21');
        expect(d.querySelectorAll('.ts.calendar-day-mark')).toHaveLength(1);
        expect(d.querySelector('.ts.calendar-day-mark')!.classList.contains('variant-default')).toBe(true);
        expect(d.title).toBe('Reunión de equipo, Revisión de plan');
        expect(d.getAttribute('aria-label')).toBe('martes, 21 de julio de 2026, Reunión de equipo, Revisión de plan');
    });

    it('un JSON de marcas roto no rompe el calendario', () => {
        montar(SUELTO(`data-ts-day-marks='[{roto'`));
        expect(qq('[data-ts-date-day]').length).toBeGreaterThanOrEqual(28);
        expect(qq('.ts.calendar-day-mark')).toHaveLength(0);
    });

    it('el observer redibuja las marcas al cambiar data-ts-day-marks por JS', async () => {
        const raiz = montar(SUELTO());
        raiz.setAttribute('data-ts-day-marks', '[{"date":"2026-07-09","label":"Falló el build","variant":"danger"}]');
        await vi.waitFor(() => expect(dia('2026-07-09').querySelector('.variant-danger')).not.toBeNull());
        raiz.removeAttribute('data-ts-day-marks');
        await vi.waitFor(() => expect(qq('.ts.calendar-day-mark')).toHaveLength(0));
    });

    const CON_DISPARADOR = `
    <div class="ts popover-root">
      <button type="button" id="disp" class="ts datepicker-trigger size-md" popovertarget="pop" aria-haspopup="dialog" aria-expanded="false">
        <span class="ts datepicker-value">Elegir una fecha</span>
      </button>
      <span class="ts datepicker-spinner size-md" data-ts-date-spinner hidden><span class="ts spinner size-sm" role="status" aria-label="Cargando..."></span></span>
      <div id="pop" popover="auto" role="dialog">
        <div data-ts-date-picker data-ts-locale="es-AR" data-ts-value="2026-07-14" data-ts-month="2026-07-01">
          <button data-ts-date-prev>‹</button><span data-ts-date-title></span><button data-ts-date-next>›</button>
          <div class="ts calendar-grid" role="grid">
            <div class="ts calendar-dow-row" role="row" data-ts-date-weekdays></div>
            <div data-ts-date-grid></div>
          </div>
        </div>
      </div>
    </div>`;

    it('setDatePickerLoading marca is-loading, aria-busy en el disparador y la grilla, y muestra el Spinner sin bloquear', () => {
        const raiz = montar(CON_DISPARADOR);
        const calendario = q('[data-ts-date-picker]');
        setDatePickerLoading(calendario, true);
        expect(q('#disp').classList.contains('is-loading')).toBe(true);
        expect(q('#disp').getAttribute('aria-busy')).toBe('true');
        expect(q('[role="grid"]').getAttribute('aria-busy')).toBe('true');
        expect(q('[data-ts-date-spinner]').hidden).toBe(false);
        expect((q('#disp') as HTMLButtonElement).disabled).toBe(false);
        setDatePickerLoading(calendario, false);
        expect(q('#disp').classList.contains('is-loading')).toBe(false);
        expect(q('#disp').hasAttribute('aria-busy')).toBe(false);
        expect(q('[role="grid"]').hasAttribute('aria-busy')).toBe(false);
        expect(q('[data-ts-date-spinner]').hidden).toBe(true);
        expect(raiz).toBeTruthy();
    });

    it('cargando no impide elegir: el día se elige y el aria-busy de la grilla sobrevive al repintado', () => {
        montar(CON_DISPARADOR);
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        const calendario = q('[data-ts-date-picker]');
        setDatePickerLoading(calendario, true);
        q('#pop').classList.add('is-visible');
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: 'open' });
        q('#pop').dispatchEvent(e);
        dia('2026-07-15').click();
        expect(calendario.getAttribute('data-ts-value')).toBe('2026-07-15');
        expect(q('[role="grid"]').getAttribute('aria-busy')).toBe('true');
    });
});

describe('DatePicker: rango', () => {
    const GRILLA = `
      <button data-ts-date-prev>‹</button><span data-ts-date-title></span><button data-ts-date-next>›</button>
      <div class="ts calendar-grid" role="grid" aria-multiselectable="true">
        <div class="ts calendar-dow-row" role="row" data-ts-date-weekdays></div>
        <div data-ts-date-grid></div>
      </div>
      <span class="ts sr-only" role="status" data-ts-date-status data-ts-end-text="Inicio: {start}. Elegir la fecha de fin."></span>`;
    const SUELTO = (extra = '') =>
        `<div data-ts-date-picker data-ts-range data-ts-locale="es-AR" data-ts-month="2026-07-01" ${extra}>${GRILLA}</div>`;
    const CON_DISPARADOR = (valor = '') => `
    <form id="f">
      <div class="ts popover-root datepicker">
        <button type="button" id="disp" class="ts datepicker-trigger ${valor ? '' : 'is-placeholder'}" popovertarget="pop" aria-haspopup="dialog" aria-expanded="false">
          <span class="ts datepicker-value" data-ts-placeholder="Elegir un rango de fechas">${valor ? '7–14 jul 2026' : 'Elegir un rango de fechas'}</span>
        </button>
        <button type="button" class="ts datepicker-clear" data-ts-clear ${valor ? '' : 'hidden'}></button>
        <div id="pop" popover="auto" role="dialog">
          <div data-ts-date-picker data-ts-range data-ts-locale="es-AR" data-ts-month="2026-07-01" ${valor ? `data-ts-value="${valor}"` : ''}>${GRILLA}</div>
        </div>
      </div>
      <input type="hidden" name="inicio" value="${valor.split('/')[0] ?? ''}" data-ts-date-input="start">
      <input type="hidden" name="fin" value="${valor.split('/')[1] ?? ''}" data-ts-date-input="end">
    </form>`;
    const dia = (iso: string) => qq('[data-ts-date-day]').find((d) => d.getAttribute('data-ts-value') === iso)!;
    const clases = (iso: string) => [...dia(iso).classList].filter((c) => c.startsWith('is-') && c !== 'is-outside' && c !== 'is-today').sort().join(' ');
    const estado = () => q('[data-ts-date-status]').textContent;
    const tecla = (el: Element, key: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 6, 10) }));
    afterEach(() => vi.useRealTimers());
    const abrir = () => {
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: 'open' });
        q('#pop').dispatchEvent(e);
    };
    const hidden = (n: string) => (document.querySelector(`[name="${n}"]`) as HTMLInputElement).value;

    it('pinta el rango vigente: extremos is-selected / is-range-start / is-range-end, tramo is-in-range y aria-selected', () => {
        montar(SUELTO('data-ts-value="2026-07-07/2026-07-10"'));
        expect(clases('2026-07-07')).toBe('is-range-start is-selected');
        expect(clases('2026-07-08')).toBe('is-in-range');
        expect(clases('2026-07-10')).toBe('is-range-end is-selected');
        expect(clases('2026-07-11')).toBe('');
        expect(dia('2026-07-09').getAttribute('aria-selected')).toBe('true');
        expect(dia('2026-07-11').getAttribute('aria-selected')).toBe('false');
        expect(q('[role="grid"]').getAttribute('aria-multiselectable')).toBe('true');
    });

    it('el primer click fija el ancla y avisa en la región viva; todavía no cambia el valor ni dispara ts:change', () => {
        const raiz = montar(SUELTO('data-ts-value="2026-07-01/2026-07-02"'));
        const cambios = vi.fn();
        raiz.addEventListener('ts:change', cambios);
        dia('2026-07-14').click();
        expect(raiz.getAttribute('data-ts-anchor')).toBe('2026-07-14');
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-01/2026-07-02');
        expect(cambios).not.toHaveBeenCalled();
        expect(estado()).toBe('Inicio: martes, 14 de julio de 2026. Elegir la fecha de fin.');
        expect(clases('2026-07-14')).toBe('is-range-end is-range-start is-selected'.split(' ').sort().join(' '));
    });

    it('el segundo click completa el rango, avisa con inicio y fin y vacía la región viva', () => {
        const raiz = montar(SUELTO());
        const cambios = vi.fn();
        raiz.addEventListener('ts:change', (e) => cambios((e as CustomEvent).detail));
        dia('2026-07-07').click();
        dia('2026-07-10').click();
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-07/2026-07-10');
        expect(raiz.hasAttribute('data-ts-anchor')).toBe(false);
        expect(cambios).toHaveBeenCalledTimes(1);
        expect(cambios).toHaveBeenCalledWith({ component: 'date-picker', value: '2026-07-07/2026-07-10', start: '2026-07-07', end: '2026-07-10' });
        expect(estado()).toBe('');
        expect(clases('2026-07-08')).toBe('is-in-range');
    });

    it('si el segundo día es anterior, se intercambian; mismo día = inicio igual a fin', () => {
        const raiz = montar(SUELTO());
        dia('2026-07-20').click();
        dia('2026-07-15').click();
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-15/2026-07-20');
        dia('2026-07-09').click();
        dia('2026-07-09').click();
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-09/2026-07-09');
        expect(clases('2026-07-09')).toBe('is-range-end is-range-start is-selected'.split(' ').sort().join(' '));
    });

    it('la vista previa sigue al puntero (is-range-preview entre el ancla y el día apuntado) y vuelve al foco al salir de un día', () => {
        const raiz = montar(SUELTO());
        dia('2026-07-07').click();
        dia('2026-07-10').dispatchEvent(new Event('pointerover', { bubbles: true }));
        expect(clases('2026-07-07')).toBe('is-range-start is-selected');
        expect(clases('2026-07-08')).toBe('is-range-preview');
        expect(clases('2026-07-10')).toBe('is-range-end is-selected');
        expect(dia('2026-07-09').getAttribute('aria-selected')).toBe('true');
        dia('2026-07-05').dispatchEvent(new Event('pointerover', { bubbles: true }));
        expect(clases('2026-07-06')).toBe('is-range-preview');
        expect(clases('2026-07-07')).toBe('is-range-end is-selected');
        expect(clases('2026-07-10')).toBe('');
        q('[data-ts-date-next]').dispatchEvent(new Event('pointerover', { bubbles: true }));
        expect(clases('2026-07-06')).toBe('');
        expect(raiz.getAttribute('data-ts-anchor')).toBe('2026-07-07');
    });

    it('teclado: Enter fija el ancla, las flechas mueven la vista previa y Enter completa', () => {
        const raiz = montar(SUELTO('data-ts-focused="2026-07-14"'));
        dia('2026-07-14').focus();
        tecla(document.activeElement!, 'Enter');
        expect(raiz.getAttribute('data-ts-anchor')).toBe('2026-07-14');
        tecla(document.activeElement!, 'ArrowRight');
        tecla(document.activeElement!, 'ArrowRight');
        expect(clases('2026-07-15')).toBe('is-range-preview');
        expect(clases('2026-07-16')).toBe('is-range-end is-selected');
        tecla(document.activeElement!, 'Enter');
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-14/2026-07-16');
    });

    it('un día no disponible no fija el ancla ni cierra el rango, pero el tramo puede cruzar días no disponibles', () => {
        const raiz = montar(SUELTO('data-ts-disabled-weekdays="0 6" data-ts-disabled-dates="2026-07-08"'));
        dia('2026-07-04').click();
        expect(raiz.hasAttribute('data-ts-anchor')).toBe(false);
        dia('2026-07-07').click();
        dia('2026-07-08').click();
        expect(raiz.getAttribute('data-ts-anchor')).toBe('2026-07-07');
        dia('2026-07-13').click();
        expect(raiz.getAttribute('data-ts-value')).toBe('2026-07-07/2026-07-13');
        expect(clases('2026-07-08')).toBe('is-in-range');
    });

    it('con disparador: completar el rango escribe el texto con formatRange, los dos hidden y cierra', () => {
        montar(CON_DISPARADOR());
        const cerrar = vi.fn();
        abrir();
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = cerrar;
        dia('2026-07-20').click();
        expect(cerrar).not.toHaveBeenCalled();
        expect(hidden('inicio')).toBe('');
        dia('2026-07-14').click();
        expect(cerrar).toHaveBeenCalledTimes(1);
        expect(q('.ts.datepicker-value').textContent).toBe(
            new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).formatRange(new Date(2026, 6, 14), new Date(2026, 6, 20)),
        );
        expect(hidden('inicio')).toBe('2026-07-14');
        expect(hidden('fin')).toBe('2026-07-20');
        expect(q('#disp').classList.contains('is-placeholder')).toBe(false);
    });

    it('cerrar (o reabrir) con el ancla puesta la descarta', () => {
        const raiz = montar(CON_DISPARADOR());
        const calendario = q('[data-ts-date-picker]');
        abrir();
        dia('2026-07-14').click();
        expect(calendario.getAttribute('data-ts-anchor')).toBe('2026-07-14');
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: 'closed' });
        q('#pop').dispatchEvent(e);
        expect(calendario.hasAttribute('data-ts-anchor')).toBe(false);
        expect(estado()).toBe('');
        abrir();
        expect(clases('2026-07-14')).toBe('');
        expect(raiz).toBeTruthy();
    });

    it('limpiar vacía los dos hidden, vuelve el placeholder y avisa con valor, inicio y fin vacíos', () => {
        montar(CON_DISPARADOR('2026-07-07/2026-07-14'));
        const detalles: unknown[] = [];
        q('[data-ts-date-picker]').addEventListener('ts:change', (e) => detalles.push((e as CustomEvent).detail));
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        q('[data-ts-clear]').click();
        expect(hidden('inicio')).toBe('');
        expect(hidden('fin')).toBe('');
        expect(q('.ts.datepicker-value').textContent).toBe('Elegir un rango de fechas');
        expect(q('[data-ts-date-picker]').hasAttribute('data-ts-value')).toBe(false);
        expect(detalles).toEqual([{ component: 'date-picker', value: '', start: '', end: '' }]);
    });

    it('form.reset() vuelve al rango inicial (texto y los dos hidden), sin avisar', async () => {
        montar(CON_DISPARADOR('2026-07-07/2026-07-14'));
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        abrir();
        dia('2026-07-20').click();
        dia('2026-07-22').click();
        expect(hidden('fin')).toBe('2026-07-22');
        q<HTMLFormElement>('#f').reset();
        await vi.waitFor(() => expect(hidden('fin')).toBe('2026-07-14'));
        expect(hidden('inicio')).toBe('2026-07-07');
        expect(q('[data-ts-date-picker]').getAttribute('data-ts-value')).toBe('2026-07-07/2026-07-14');
        expect(q('.ts.datepicker-value').textContent).toBe('7–14 jul 2026');
    });

    it('el disparador disabled apaga los dos hidden', async () => {
        montar(CON_DISPARADOR('2026-07-07/2026-07-14'));
        q<HTMLButtonElement>('#disp').disabled = true;
        await vi.waitFor(() => expect(document.querySelector<HTMLInputElement>('[name="fin"]')!.disabled).toBe(true));
        expect(document.querySelector<HTMLInputElement>('[name="inicio"]')!.disabled).toBe(true);
    });
});

describe('DatePicker: atajos', () => {
    const GRILLA = `
      <button data-ts-date-prev>‹</button><span data-ts-date-title></span><button data-ts-date-next>›</button>
      <div class="ts calendar-grid" role="grid">
        <div class="ts calendar-dow-row" role="row" data-ts-date-weekdays></div>
        <div data-ts-date-grid></div>
      </div>`;
    const BOTONES = (atajos: [string, string][]) =>
        atajos.map(([clave, texto]) => `<button type="button" class="ts datepicker-preset" data-ts-date-preset="${clave}">${texto}</button>`).join('');
    const CON_ATAJOS = (atajos: [string, string][], range: boolean, extra = '') => `
    <form id="f">
      <div class="ts popover-root datepicker">
        <button type="button" id="disp" class="ts datepicker-trigger is-placeholder" popovertarget="pop" aria-haspopup="dialog" aria-expanded="false">
          <span class="ts datepicker-value" data-ts-placeholder="Elegir una fecha">Elegir una fecha</span>
        </button>
        <div id="pop" popover="auto" role="dialog">
          <div class="ts datepicker-panel">
            <div class="ts datepicker-presets" role="group" aria-label="Atajos de fecha">${BOTONES(atajos)}</div>
            <div data-ts-date-picker ${range ? 'data-ts-range' : ''} data-ts-locale="es-AR" data-ts-month="2026-07-01" ${extra}>${GRILLA}</div>
          </div>
        </div>
      </div>
      <input type="hidden" name="inicio" data-ts-date-input="${range ? 'start' : ''}">
      ${range ? '<input type="hidden" name="fin" data-ts-date-input="end">' : ''}
    </form>`;
    beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 6, 15, 10) }));
    afterEach(() => vi.useRealTimers());
    const abrir = () => {
        const cerrado = vi.fn();
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = cerrado;
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: 'open' });
        q('#pop').dispatchEvent(e);
        return cerrado;
    };
    const atajo = (clave: string) => q(`[data-ts-date-preset="${clave}"]`);
    const hidden = (n: string) => (document.querySelector(`[name="${n}"]`) as HTMLInputElement).value;

    it('simple: «today» elige el día de hoy, escribe el hidden y el disparador, cierra, devuelve el foco y avisa', () => {
        montar(CON_ATAJOS([['today', 'Hoy'], ['2026-07-21', 'Cierre del sprint']], false));
        const cerrado = abrir();
        const detalles: unknown[] = [];
        q('[data-ts-date-picker]').addEventListener('ts:change', (e) => detalles.push((e as CustomEvent).detail));
        atajo('today').click();
        expect(hidden('inicio')).toBe('2026-07-15');
        expect(q('[data-ts-date-picker]').getAttribute('data-ts-value')).toBe('2026-07-15');
        expect(q('.ts.datepicker-value').textContent).toBe(new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(2026, 6, 15)));
        expect(cerrado).toHaveBeenCalled();
        expect(document.activeElement).toBe(q('#disp'));
        expect(detalles).toEqual([{ component: 'date-picker', value: '2026-07-15' }]);
    });

    it('simple: un atajo con fecha fija elige ese día', () => {
        montar(CON_ATAJOS([['2026-07-21', 'Cierre del sprint']], false));
        abrir();
        atajo('2026-07-21').click();
        expect(hidden('inicio')).toBe('2026-07-21');
    });

    it('rango: «last-7-days» resuelve contra hoy, escribe los dos hidden y avisa con inicio y fin', () => {
        montar(CON_ATAJOS([['last-7-days', 'Últimos 7 días'], ['this-month', 'Este mes']], true));
        abrir();
        const detalles: unknown[] = [];
        q('[data-ts-date-picker]').addEventListener('ts:change', (e) => detalles.push((e as CustomEvent).detail));
        atajo('last-7-days').click();
        expect(hidden('inicio')).toBe('2026-07-09');
        expect(hidden('fin')).toBe('2026-07-15');
        expect(q('[data-ts-date-picker]').getAttribute('data-ts-value')).toBe('2026-07-09/2026-07-15');
        expect(detalles).toEqual([{ component: 'date-picker', value: '2026-07-09/2026-07-15', start: '2026-07-09', end: '2026-07-15' }]);
        expect(q('.ts.datepicker-value').textContent).toBe(
            new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).formatRange(new Date(2026, 6, 9), new Date(2026, 6, 15)),
        );
    });

    it('rango: un intervalo fijo y un día suelto (vale {d, d}) se eligen tal cual', () => {
        montar(CON_ATAJOS([['2026-07-01/2026-07-14', 'Sprint 14'], ['2026-07-21', 'Cierre']], true));
        abrir();
        atajo('2026-07-01/2026-07-14').click();
        expect([hidden('inicio'), hidden('fin')]).toEqual(['2026-07-01', '2026-07-14']);
        abrir();
        atajo('2026-07-21').click();
        expect([hidden('inicio'), hidden('fin')]).toEqual(['2026-07-21', '2026-07-21']);
    });

    it('rango: elegir un atajo con el ancla puesta la descarta', () => {
        montar(CON_ATAJOS([['this-month', 'Este mes']], true));
        abrir();
        q('[data-ts-date-day][data-ts-value="2026-07-08"]').click();
        expect(q('[data-ts-date-picker]').getAttribute('data-ts-anchor')).toBe('2026-07-08');
        atajo('this-month').click();
        expect(q('[data-ts-date-picker]').hasAttribute('data-ts-anchor')).toBe(false);
        expect([hidden('inicio'), hidden('fin')]).toEqual(['2026-07-01', '2026-07-31']);
    });

    it('al abrir recalcula aria-disabled: fuera de min/max o con un extremo no disponible no se elige', () => {
        montar(CON_ATAJOS([['last-7-days', 'Últimos 7 días'], ['this-week', 'Esta semana'], ['last-month', 'Mes pasado']], true, 'data-ts-max="2026-07-15" data-ts-min="2026-07-01"'));
        const cerrado = abrir();
        expect(atajo('last-7-days').getAttribute('aria-disabled')).toBe('false');
        expect(atajo('this-week').getAttribute('aria-disabled')).toBe('true');
        expect(atajo('last-month').getAttribute('aria-disabled')).toBe('true');
        atajo('this-week').click();
        expect(hidden('inicio')).toBe('');
        expect(cerrado).not.toHaveBeenCalled();
    });

    it('un extremo en día deshabilitado (data-ts-disabled-weekdays) deja el atajo aria-disabled; el tramo puede cruzarlos', () => {
        montar(CON_ATAJOS([['last-7-days', 'Últimos 7 días'], ['this-week', 'Esta semana']], true, 'data-ts-disabled-weekdays="0 6"'));
        abrir();
        expect(atajo('last-7-days').getAttribute('aria-disabled')).toBe('false');
        expect(atajo('this-week').getAttribute('aria-disabled')).toBe('true');
    });

    it('un atajo aria-disabled sigue enfocable (no es disabled) y los atajos van antes del calendario en el orden de tabulación', () => {
        montar(CON_ATAJOS([['today', 'Hoy']], false, 'data-ts-max="2026-07-10"'));
        abrir();
        expect(atajo('today').getAttribute('aria-disabled')).toBe('true');
        expect((atajo('today') as HTMLButtonElement).disabled).toBe(false);
        const dia = q('[data-ts-date-autofocus], [data-ts-autofocus]');
        expect(atajo('today').compareDocumentPosition(dia) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('el foco inicial al abrir sigue en el día y el grupo de atajos está nombrado', () => {
        montar(CON_ATAJOS([['today', 'Hoy']], false));
        abrir();
        expect(q('[data-ts-autofocus]').getAttribute('data-ts-value')).toBe('2026-07-15');
        expect(q('.ts.datepicker-presets').getAttribute('role')).toBe('group');
        expect(q('.ts.datepicker-presets').getAttribute('aria-label')).toBe('Atajos de fecha');
    });

    it('form.reset() vuelve al estado inicial tras elegir un atajo', async () => {
        montar(CON_ATAJOS([['today', 'Hoy']], false));
        abrir();
        atajo('today').click();
        expect(hidden('inicio')).toBe('2026-07-15');
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        q<HTMLFormElement>('#f').reset();
        await vi.waitFor(() => expect(hidden('inicio')).toBe(''));
        expect(q('.ts.datepicker-value').textContent).toBe('Elegir una fecha');
    });
});

describe('DatePicker: prefix', () => {
    const CON_PREFIJO = `
    <div class="ts popover-root datepicker">
      <button type="button" id="disp" class="ts datepicker-trigger has-prefix is-placeholder" popovertarget="pop" aria-haspopup="dialog" aria-expanded="false">
        <span class="ts datepicker-prefix-block">Vence</span>
        <span class="ts datepicker-value" data-ts-placeholder="Elegir una fecha">Elegir una fecha</span>
      </button>
      <div id="pop" popover="auto" role="dialog">
        <div data-ts-date-picker data-ts-locale="es-AR" data-ts-month="2026-07-01">
          <button data-ts-date-prev>‹</button><span data-ts-date-title></span><button data-ts-date-next>›</button>
          <div class="ts calendar-grid" role="grid"><div class="ts calendar-dow-row" role="row" data-ts-date-weekdays></div><div data-ts-date-grid></div></div>
        </div>
      </div>
    </div>
    <input type="hidden" name="vence" data-ts-date-input="">`;

    beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 6, 10) }));
    afterEach(() => vi.useRealTimers());

    it('elegir una fecha escribe el texto en `.ts.datepicker-value` y deja el prefijo como estaba', () => {
        montar(CON_PREFIJO);
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: 'open' });
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        q('#pop').dispatchEvent(e);
        q<HTMLElement>('[data-ts-date-day][data-ts-value="2026-07-14"]').click();
        expect(q('.ts.datepicker-value').textContent).toBe(new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(2026, 6, 14)));
        expect(q('.ts.datepicker-prefix-block').textContent).toBe('Vence');
        expect((document.querySelector('[name="vence"]') as HTMLInputElement).value).toBe('2026-07-14');
    });
});

describe('DatePicker: campo tipeable', () => {
    const GRILLA = `
      <button data-ts-date-prev>‹</button><span data-ts-date-title></span><button data-ts-date-next>›</button>
      <div class="ts calendar-grid" role="grid">
        <div class="ts calendar-dow-row" role="row" data-ts-date-weekdays></div>
        <div data-ts-date-grid></div>
      </div>`;
    const CAMPO = (range: boolean, valor = '', extra = '') => `
    <form id="f">
      <div class="ts popover-root datepicker">
        <div class="ts datepicker-field size-md">
          <input type="text" id="ini" class="ts datepicker-input" data-ts-date-text="${range ? 'start' : ''}">
          ${range ? '<input type="text" id="fin" class="ts datepicker-input" data-ts-date-text="end">' : ''}
          <span data-ts-date-spinner hidden></span>
          <button type="button" id="tog" class="ts datepicker-toggle" popovertarget="pop" aria-haspopup="dialog" aria-expanded="false"></button>
          <button type="button" class="ts datepicker-clear" data-ts-clear hidden></button>
        </div>
        <div id="pop" popover="auto" role="dialog">
          <div data-ts-date-picker ${range ? 'data-ts-range' : ''} data-ts-locale="es-AR" data-ts-month="2026-07-01" ${valor ? `data-ts-value="${valor}"` : ''} ${extra}>${GRILLA}</div>
        </div>
      </div>
      <input type="hidden" name="inicio" data-ts-date-input="${range ? 'start' : ''}">
      ${range ? '<input type="hidden" name="fin" data-ts-date-input="end">' : ''}
    </form>`;
    const ini = () => q<HTMLInputElement>('#ini');
    const fin = () => q<HTMLInputElement>('#fin');
    const hidden = (n: string) => (document.querySelector(`[name="${n}"]`) as HTMLInputElement).value;
    const raiz = () => q('[data-ts-date-picker]');
    const salir = (campo: HTMLElement, hacia: HTMLElement | null = null) => {
        campo.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: hacia }));
    };
    const escribir = (campo: HTMLInputElement, texto: string) => {
        campo.focus();
        campo.value = texto;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const enter = (campo: HTMLElement) => {
        const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        campo.dispatchEvent(e);
        return e.defaultPrevented;
    };
    const detalles = () => {
        const d: unknown[] = [];
        raiz().addEventListener('ts:change', (e) => d.push((e as CustomEvent).detail));
        return d;
    };

    it('simple: escribir y salir confirma, avisa con ts:change, escribe el hidden, reformatea y no mueve el foco', () => {
        montar(CAMPO(false));
        const d = detalles();
        escribir(ini(), '5/7/2026');
        expect(d).toEqual([]);
        salir(ini());
        expect(d).toEqual([{ component: 'date-picker', value: '2026-07-05' }]);
        expect(raiz().getAttribute('data-ts-value')).toBe('2026-07-05');
        expect(hidden('inicio')).toBe('2026-07-05');
        expect(ini().value).toBe('05/07/2026');
        expect(document.activeElement).toBe(ini());
    });

    it('simple: también acepta yyyy-mm-dd', () => {
        montar(CAMPO(false));
        escribir(ini(), '2026-07-21');
        salir(ini());
        expect(hidden('inicio')).toBe('2026-07-21');
        expect(ini().value).toBe('21/07/2026');
    });

    it('simple: Enter confirma y NO se consume (dentro de un form el envío sigue)', () => {
        montar(CAMPO(false));
        escribir(ini(), '21/07/2026');
        expect(enter(ini())).toBe(false);
        expect(hidden('inicio')).toBe('2026-07-21');
    });

    it('simple: ilegible, inexistente, fuera de min/max o deshabilitado vuelve al último valor válido, sin avisar', () => {
        montar(CAMPO(false, '2026-07-14', 'data-ts-min="2026-07-06" data-ts-max="2026-07-27" data-ts-disabled-weekdays="0 6" data-ts-disabled-dates="2026-07-09"'));
        const d = detalles();
        for (const malo of ['mañana', '31/02/2026', '01/07/2026', '30/07/2026', '18/07/2026', '09/07/2026']) {
            escribir(ini(), malo);
            salir(ini());
            expect(ini().value, malo).toBe('14/07/2026');
        }
        expect(d).toEqual([]);
        expect(hidden('inicio')).toBe('');
    });

    it('simple: vacío quita el valor y avisa con valor vacío', () => {
        montar(CAMPO(false, '2026-07-14'));
        const d = detalles();
        escribir(ini(), '');
        salir(ini());
        expect(d).toEqual([{ component: 'date-picker', value: '' }]);
        expect(raiz().hasAttribute('data-ts-value')).toBe(false);
        expect(hidden('inicio')).toBe('');
    });

    it('simple: un ts:change cancelado vuelve al valor anterior', () => {
        montar(CAMPO(false, '2026-07-14'));
        raiz().addEventListener('ts:change', (e) => e.preventDefault());
        escribir(ini(), '21/07/2026');
        salir(ini());
        expect(ini().value).toBe('14/07/2026');
        expect(raiz().getAttribute('data-ts-value')).toBe('2026-07-14');
    });

    it('simple: sin cambios no avisa', () => {
        montar(CAMPO(false, '2026-07-14'));
        const d = detalles();
        escribir(ini(), '14/7/2026');
        salir(ini());
        expect(d).toEqual([]);
        expect(ini().value).toBe('14/07/2026');
    });

    it('elegir en el calendario escribe el texto del campo y devuelve el foco al botón', () => {
        montar(CAMPO(false, '2026-07-14'));
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: 'open' });
        q('#pop').dispatchEvent(e);
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        q('[data-ts-date-day][data-ts-value="2026-07-16"]').click();
        expect(ini().value).toBe('16/07/2026');
        expect(hidden('inicio')).toBe('2026-07-16');
        expect(document.activeElement).toBe(q('#tog'));
    });

    it('abrir marca la caja con is-open (el anillo de foco sigue mientras el foco está en el panel)', () => {
        montar(CAMPO(false));
        const e = new Event('toggle');
        Object.defineProperty(e, 'newState', { value: 'open' });
        q('#pop').dispatchEvent(e);
        expect(q('.ts.datepicker-field').classList.contains('is-open')).toBe(true);
        expect(q('#tog').getAttribute('aria-expanded')).toBe('true');
    });

    it('limpiar con la «x» vacía el campo y deja el foco en el input', () => {
        montar(CAMPO(false, '2026-07-14'));
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        q('[data-ts-clear]').click();
        expect(ini().value).toBe('');
        expect(hidden('inicio')).toBe('');
        expect(document.activeElement).toBe(ini());
    });

    it('setDatePickerLoading marca la caja y los inputs con aria-busy', () => {
        montar(CAMPO(true));
        setDatePickerLoading(raiz(), true);
        expect(q('.ts.datepicker-field').classList.contains('is-loading')).toBe(true);
        expect(ini().getAttribute('aria-busy')).toBe('true');
        expect(fin().getAttribute('aria-busy')).toBe('true');
        expect(q('[data-ts-date-spinner]').hidden).toBe(false);
        setDatePickerLoading(raiz(), false);
        expect(ini().hasAttribute('aria-busy')).toBe(false);
    });

    it('form.reset() devuelve el texto inicial', async () => {
        montar(CAMPO(false, '2026-07-14'));
        ini().value = '14/07/2026';
        (q('#pop') as HTMLElement & { hidePopover: () => void }).hidePopover = () => {};
        escribir(ini(), '01/01/2026');
        salir(ini());
        expect(ini().value).toBe('01/01/2026');
        q<HTMLFormElement>('#f').reset();
        await vi.waitFor(() => expect(ini().value).toBe('14/07/2026'));
        expect(raiz().getAttribute('data-ts-value')).toBe('2026-07-14');
    });

    it('rango: pasar de un campo al otro no confirma; salir del grupo confirma el par ordenado con dos hidden y ts:change', () => {
        montar(CAMPO(true));
        const d = detalles();
        escribir(ini(), '14/07/2026');
        salir(ini(), fin());
        expect(d).toEqual([]);
        escribir(fin(), '07/07/2026');
        salir(fin());
        expect(d).toEqual([{ component: 'date-picker', value: '2026-07-07/2026-07-14', start: '2026-07-07', end: '2026-07-14' }]);
        expect([hidden('inicio'), hidden('fin')]).toEqual(['2026-07-07', '2026-07-14']);
        expect([ini().value, fin().value]).toEqual(['07/07/2026', '14/07/2026']);
    });

    it('rango: un par incompleto o inválido al salir del grupo vuelve los dos', () => {
        montar(CAMPO(true, '2026-07-07/2026-07-14'));
        const d = detalles();
        escribir(ini(), '01/07/2026');
        escribir(fin(), '');
        salir(fin());
        expect([ini().value, fin().value]).toEqual(['07/07/2026', '14/07/2026']);
        escribir(ini(), '01/07/2026');
        escribir(fin(), 'nada');
        salir(fin());
        expect([ini().value, fin().value]).toEqual(['07/07/2026', '14/07/2026']);
        expect(d).toEqual([]);
    });

    it('rango: los dos vacíos quitan el rango; el mismo día da un rango de un día', () => {
        montar(CAMPO(true, '2026-07-07/2026-07-14'));
        escribir(ini(), '');
        escribir(fin(), '');
        salir(fin());
        expect([hidden('inicio'), hidden('fin')]).toEqual(['', '']);
        escribir(ini(), '14/07/2026');
        escribir(fin(), '14/07/2026');
        enter(fin());
        expect(raiz().getAttribute('data-ts-value')).toBe('2026-07-14/2026-07-14');
    });

    it('rango: un extremo no disponible vuelve los dos', () => {
        montar(CAMPO(true, '2026-07-07/2026-07-14', 'data-ts-disabled-weekdays="0 6"'));
        escribir(ini(), '07/07/2026');
        escribir(fin(), '18/07/2026');
        salir(fin());
        expect([ini().value, fin().value]).toEqual(['07/07/2026', '14/07/2026']);
    });
});

describe('Toast: acción, pausa y actualización por id', () => {
    beforeEach(() => {
        clearToasts();
        vi.useFakeTimers();
    });
    afterEach(() => vi.useRealTimers());

    const toasts = () => qq('[data-ts-toast]').filter((t) => !t.hidden);

    describe('acción', () => {
        it('muestra un botón con el label, antes del de cerrar', () => {
            toast('Proyecto movido a la papelera.', { action: { label: 'Deshacer', onclick: () => {} } });
            const botones = qq('[data-ts-toast] button');

            expect(botones.map((b) => b.textContent)).toEqual(['Deshacer', '']);
            expect(botones[1].querySelector('svg')).not.toBeNull();
            expect(botones[1].classList.contains('button')).toBe(true);
            expect(botones[0].hasAttribute('data-ts-toast-action')).toBe(true);
        });

        it('al usarlo ejecuta el callback y cierra el aviso', () => {
            const onclick = vi.fn();
            toast('Proyecto movido a la papelera.', { duration: 0, action: { label: 'Deshacer', onclick } });
            q('[data-ts-toast-action]').click();

            expect(onclick).toHaveBeenCalledTimes(1);
            expect(toasts()).toHaveLength(0);
        });
    });

    describe('disparador declarativo', () => {
        it('un botón con data-ts-toast-trigger muestra el aviso, con su variante', () => {
            montar('<button data-ts-toast-trigger="Cambios guardados." data-ts-toast-variant="success">Guardar</button>');
            q('[data-ts-toast-trigger]').click();

            expect(toasts()).toHaveLength(1);
            expect(q('[data-toast-title]').textContent).toBe('Cambios guardados.');
            expect(q('[data-ts-toast]').className).toContain('variant-success');
        });
    });

    describe('pausa (WCAG 2.2.1)', () => {
        const contenedor = () => q('[data-ts-toast-container]');

        it('con el puntero encima no se va, y al salir retoma lo que faltaba', () => {
            toast('Cambios guardados.', { duration: 1000 });
            vi.advanceTimersByTime(600);
            contenedor().dispatchEvent(new Event('pointerenter'));
            vi.advanceTimersByTime(60_000);
            expect(toasts()).toHaveLength(1);

            contenedor().dispatchEvent(new Event('pointerleave'));
            vi.advanceTimersByTime(300);
            expect(toasts()).toHaveLength(1);
            vi.advanceTimersByTime(150);
            expect(toasts()).toHaveLength(0);
        });

        it('con el foco adentro tampoco se va; focusout hacia afuera lo reanuda', () => {
            toast('Cambios guardados.', { duration: 1000 });
            contenedor().dispatchEvent(new Event('focusin', { bubbles: true }));
            vi.advanceTimersByTime(5000);
            expect(toasts()).toHaveLength(1);

            contenedor().dispatchEvent(new FocusEvent('focusout', { relatedTarget: null }));
            vi.advanceTimersByTime(1000);
            expect(toasts()).toHaveLength(0);
        });

        it('si el puntero sale pero el foco sigue adentro, sigue pausado', () => {
            toast('Cambios guardados.', { duration: 1000 });
            contenedor().dispatchEvent(new Event('pointerenter'));
            contenedor().dispatchEvent(new Event('focusin', { bubbles: true }));
            contenedor().dispatchEvent(new Event('pointerleave'));
            vi.advanceTimersByTime(5000);

            expect(toasts()).toHaveLength(1);
        });

        it('un aviso nuevo nace pausado si el puntero ya está encima', () => {
            toast('Uno', { duration: 0 });
            contenedor().dispatchEvent(new Event('pointerenter'));
            toast('Dos', { duration: 1000 });
            vi.advanceTimersByTime(5000);

            expect(toasts()).toHaveLength(2);
        });
    });

    describe('actualizar por id', () => {
        it('reemplaza mensaje y variante del mismo aviso', () => {
            const el = toast('Construyendo…', { duration: 0 });
            const id = el.getAttribute('data-ts-toast-id')!;
            updateToast(id, { message: 'Despliegue completado.', variant: 'success' });

            expect(toasts()).toHaveLength(1);
            expect(el.textContent).toContain('Despliegue completado.');
            expect(el.className).toContain('variant-success');
        });

        it('acepta el elemento que devolvió toast()', () => {
            const el = toast('En cola', { duration: 0 });

            expect(updateToast(el, { message: 'Listo' })).toBe(el);
            expect(el.textContent).toContain('Listo');
        });

        it('reinicia el temporizador con la duración nueva', () => {
            const el = toast('Construyendo…', { duration: 0 });
            updateToast(el, { message: 'Listo', duration: 1000 });
            vi.advanceTimersByTime(1100);

            expect(toasts()).toHaveLength(0);
        });

        it('conserva la duración original si no llega otra (un aviso permanente sigue permanente)', () => {
            const el = toast('Falló', { duration: 0 });
            updateToast(el, { message: 'Falló otra vez' });
            vi.advanceTimersByTime(60_000);

            expect(toasts()).toHaveLength(1);
        });

        it('pone y saca la acción', () => {
            const el = toast('Cancelado', { duration: 0 });
            updateToast(el, { action: { label: 'Reintentar', onclick: () => {} } });
            expect(el.querySelector('[data-ts-toast-action]')?.textContent).toBe('Reintentar');

            updateToast(el, { action: undefined });
            expect(el.querySelector('[data-ts-toast-action]')).toBeNull();
        });

        it('devuelve null si el aviso ya no existe', () => {
            const el = toast('Chau', { duration: 1000 });
            const id = el.getAttribute('data-ts-toast-id')!;
            vi.advanceTimersByTime(1100);

            expect(updateToast(id, { message: 'x' })).toBeNull();
            expect(toasts()).toHaveLength(0);
        });

        it('cada aviso tiene un id distinto', () => {
            const ids = [toast('a', { duration: 0 }), toast('b', { duration: 0 })].map((t) => t.getAttribute('data-ts-toast-id'));

            expect(new Set(ids).size).toBe(2);
        });
    });
});

describe('Checkbox y Radio: el estado visual sigue al input nativo', () => {
    const CHECKBOX = `<label class="ts checkbox size-md variant-primary is-card"><input type="checkbox" class="ts checkbox-input" /><div class="ts checkbox-box"></div><span class="ts checkbox-label">API de pagos</span></label>`;
    const RADIOS = (nombre: string) => `
      <div role="radiogroup">
        <label class="ts radio is-checked"><input type="radio" name="${nombre}" value="a" checked class="ts radio-input" /></label>
        <label class="ts radio"><input type="radio" name="${nombre}" value="b" class="ts radio-input" /></label>
        <label class="ts radio"><input type="radio" name="otro" value="c" class="ts radio-input" /></label>
      </div>`;

    it('checkbox: marcar y desmarcar agrega y saca is-checked', () => {
        montar(CHECKBOX);
        const caja = q('.ts.checkbox');
        q('.ts.checkbox-input').click();
        expect(caja.classList.contains('is-checked')).toBe(true);
        q('.ts.checkbox-input').click();
        expect(caja.classList.contains('is-checked')).toBe(false);
    });

    it('radio: al elegir uno se apaga el anterior del mismo name y no se toca otro grupo', () => {
        montar(RADIOS('plan'));
        const [a, b, c] = qq('.ts.radio');
        qq('.ts.radio-input')[1].click();
        expect([a, b, c].map((l) => l.classList.contains('is-checked'))).toEqual([false, true, false]);
        qq('.ts.radio-input')[2].click();
        expect([a, b, c].map((l) => l.classList.contains('is-checked'))).toEqual([false, true, true]);
    });

    it('radio: dos grupos con el mismo name en formularios distintos son independientes', () => {
        montar(`<form>${RADIOS('plan')}</form><form>${RADIOS('plan')}</form>`);
        const inputs = qq('.ts.radio-input');
        const etiquetas = qq('.ts.radio');
        inputs[1].click();
        expect(etiquetas.slice(0, 3).map((l) => l.classList.contains('is-checked'))).toEqual([false, true, false]);
        expect(etiquetas.slice(3, 6).map((l) => l.classList.contains('is-checked'))).toEqual([true, false, false]);
    });

    it('toggle: el switch sigue al input en la clase y en aria-checked', () => {
        montar(`<label class="ts toggle is-checked"><input type="checkbox" role="switch" aria-checked="true" checked class="ts toggle-input" /></label>`);
        q('.ts.toggle-input').click();
        expect(q('.ts.toggle').classList.contains('is-checked')).toBe(false);
        expect(q('.ts.toggle-input').getAttribute('aria-checked')).toBe('false');
        q('.ts.toggle-input').click();
        expect(q('.ts.toggle').classList.contains('is-checked')).toBe(true);
        expect(q('.ts.toggle-input').getAttribute('aria-checked')).toBe('true');
    });

    it('no toca otros inputs', () => {
        montar(`<label class="ts input"><input type="checkbox" id="x" /></label>`);
        q('#x').click();
        expect(q('.ts.input').classList.contains('is-checked')).toBe(false);
    });
});

describe('Slider', () => {
    const UNO = (extra = '', fmt = '') => `
    <div class="ts slider size-md" data-ts-slider ${fmt}>
      <div class="ts slider-header"><label class="ts slider-label" for="v">Volumen</label><span class="ts slider-value" data-ts-slider-value>40</span></div>
      <input id="v" type="range" class="ts slider-track" min="0" max="100" step="1" value="40" style="--ts-slider-fill: 40%" aria-label="Volumen" aria-valuenow="40" ${extra}>
    </div>`;
    const RANGO = (extra = '', valores: [number, number] = [20, 80]) => `
    <div class="ts slider size-md is-range" data-ts-slider data-ts-slider-range data-ts-slider-format="{v} USD" role="group" aria-label="Precio" ${extra}>
      <div class="ts slider-header"><span class="ts slider-value" data-ts-slider-value>x</span></div>
      <div class="ts slider-range size-md" data-ts-slider-rail style="--ts-slider-from: 20%; --ts-slider-to: 80%;">
        <input id="a" type="range" class="ts slider-track is-start" min="0" max="100" step="5" value="${valores[0]}" data-ts-slider-thumb="0" aria-label="Mínimo" aria-valuenow="${valores[0]}">
        <input id="b" type="range" class="ts slider-track is-end" min="0" max="100" step="5" value="${valores[1]}" data-ts-slider-thumb="1" aria-label="Máximo" aria-valuenow="${valores[1]}">
      </div>
    </div>`;
    const a = () => q<HTMLInputElement>('#a');
    const b = () => q<HTMLInputElement>('#b');
    const mover = (el: HTMLInputElement, valor: number) => {
        el.value = String(valor);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const soltar = (el: HTMLInputElement) => el.dispatchEvent(new Event('change', { bubbles: true }));
    const tecla = (el: Element, type: 'keydown' | 'keyup', key: string) => {
        const e = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
        el.dispatchEvent(e);
        return e;
    };
    const escuchar = (raiz: HTMLElement, tipo: string) => {
        const lista: Record<string, unknown>[] = [];
        raiz.addEventListener(tipo, (e) => lista.push((e as CustomEvent).detail));
        return lista;
    };
    const medir = (riel: HTMLElement, ancho: number, alto: number) => {
        riel.getBoundingClientRect = () => ({ left: 0, right: ancho, top: 0, bottom: alto, width: ancho, height: alto, x: 0, y: 0, toJSON() {} });
    };

    it('suelto: al mover escribe el relleno, el aria-valuenow y el texto del valor', () => {
        const raiz = montar(UNO('', 'data-ts-slider-format="{v}%"'));
        const input = q<HTMLInputElement>('#v');
        mover(input, 70);
        expect(input.style.getPropertyValue('--ts-slider-fill')).toBe('70%');
        expect(input.getAttribute('aria-valuenow')).toBe('70');
        expect(input.getAttribute('aria-valuetext')).toBe('70%');
        expect(raiz.querySelector('[data-ts-slider-value]')!.textContent).toBe('70%');
    });

    it('ts:change en cada movimiento, con el valor; cancelarlo devuelve la manija', () => {
        const raiz = montar(UNO());
        const avisos = escuchar(raiz, 'ts:change');
        const input = q<HTMLInputElement>('#v');
        mover(input, 55);
        mover(input, 60);
        expect(avisos).toEqual([
            { component: 'slider', value: 55 },
            { component: 'slider', value: 60 },
        ]);
        raiz.addEventListener('ts:change', (e) => e.preventDefault());
        mover(input, 90);
        expect(input.value).toBe('60');
        expect(input.style.getPropertyValue('--ts-slider-fill')).toBe('60%');
    });

    it('ts:commit al soltar el puntero (change nativo), no en cada movimiento', () => {
        const raiz = montar(UNO());
        const commits = escuchar(raiz, 'ts:commit');
        const input = q<HTMLInputElement>('#v');
        mover(input, 55);
        mover(input, 60);
        expect(commits).toEqual([]);
        soltar(input);
        expect(commits).toEqual([{ component: 'slider', value: 60 }]);
    });

    it('ts:commit también sale en pointerup (hay motores sin change al soltar) y el change posterior no lo duplica; un click sin mover no confirma', () => {
        const raiz = montar(UNO());
        const commits = escuchar(raiz, 'ts:commit');
        const input = q<HTMLInputElement>('#v');
        input.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
        expect(commits).toEqual([]);
        mover(input, 55);
        input.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
        soltar(input);
        expect(commits).toEqual([{ component: 'slider', value: 55 }]);
    });

    it('ts:commit con el teclado espera a soltar la tecla; salir del foco también lo cierra', () => {
        const raiz = montar(UNO());
        const commits = escuchar(raiz, 'ts:commit');
        const input = q<HTMLInputElement>('#v');
        tecla(input, 'keydown', 'ArrowRight');
        mover(input, 41);
        soltar(input);
        tecla(input, 'keydown', 'ArrowRight');
        mover(input, 42);
        soltar(input);
        expect(commits).toEqual([]);
        tecla(input, 'keyup', 'ArrowRight');
        expect(commits).toEqual([{ component: 'slider', value: 42 }]);

        tecla(input, 'keydown', 'End');
        mover(input, 100);
        soltar(input);
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        expect(commits).toHaveLength(2);
    });

    it('init() dos veces no duplica los avisos', () => {
        const raiz = montar(UNO());
        init(document);
        const avisos = escuchar(raiz, 'ts:change');
        mover(q<HTMLInputElement>('#v'), 10);
        expect(avisos).toHaveLength(1);
    });

    it('sólo lectura: ni el valor ni las teclas se mueven, y no avisa', () => {
        const raiz = montar(UNO('aria-readonly="true"'));
        const avisos = escuchar(raiz, 'ts:change');
        const commits = escuchar(raiz, 'ts:commit');
        const input = q<HTMLInputElement>('#v');
        mover(input, 90);
        soltar(input);
        expect(input.value).toBe('40');
        expect(tecla(input, 'keydown', 'ArrowRight').defaultPrevented).toBe(true);
        expect(tecla(input, 'keydown', 'Tab').defaultPrevented).toBe(false);
        expect(avisos).toEqual([]);
        expect(commits).toEqual([]);
    });

    it('range: pinta el tramo, los límites ARIA de cada manija y el texto del valor', () => {
        const raiz = montar(RANGO());
        const riel = q('[data-ts-slider-rail]');
        mover(a(), 30);
        expect(riel.style.getPropertyValue('--ts-slider-from')).toBe('30%');
        expect(riel.style.getPropertyValue('--ts-slider-to')).toBe('80%');
        expect(b().getAttribute('aria-valuemin')).toBe('30');
        expect(a().getAttribute('aria-valuemax')).toBe('80');
        expect(a().getAttribute('aria-valuetext')).toBe('30 USD');
        expect(raiz.querySelector('[data-ts-slider-value]')!.textContent).toBe('\u206830 USD\u2069 – \u206880 USD\u2069');
    });

    it('range: las manijas no se cruzan', () => {
        const raiz = montar(RANGO());
        const avisos = escuchar(raiz, 'ts:change');
        mover(a(), 95);
        expect(a().value).toBe('80');
        mover(b(), 5);
        expect(b().value).toBe('80');
        expect(avisos).toEqual([{ component: 'slider', value: [80, 80], index: 0 }]);
    });

    it('range: juntas pasada la mitad queda arriba la de inicio', () => {
        montar(RANGO('', [90, 90]));
        mover(b(), 90);
        expect(q('[data-ts-slider-rail]').classList.contains('is-top-start')).toBe(true);
        mover(a(), 10);
        mover(b(), 10);
        expect(q('[data-ts-slider-rail]').classList.contains('is-top-start')).toBe(false);
    });

    it('range: ts:commit entrega el par', () => {
        const raiz = montar(RANGO());
        const commits = escuchar(raiz, 'ts:commit');
        mover(b(), 60);
        soltar(b());
        expect(commits).toEqual([{ component: 'slider', value: [20, 60] }]);
    });

    it('range: click en el riel mueve la manija más cercana, sigue el arrastre y confirma al soltar', () => {
        const raiz = montar(RANGO());
        const riel = q('[data-ts-slider-rail]');
        medir(riel, 216, 16);
        const commits = escuchar(raiz, 'ts:commit');
        riel.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 188, clientY: 8, button: 0 }));
        expect(b().value).toBe('90');
        expect(a().value).toBe('20');
        riel.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 108, clientY: 8 }));
        expect(b().value).toBe('50');
        expect(commits).toEqual([]);
        riel.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
        expect(commits).toEqual([{ component: 'slider', value: [20, 50] }]);
    });

    it('range: el click en el riel no hace nada con sólo lectura', () => {
        montar(RANGO());
        a().setAttribute('aria-readonly', 'true');
        b().setAttribute('aria-readonly', 'true');
        const riel = q('[data-ts-slider-rail]');
        medir(riel, 216, 16);
        riel.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 188, clientY: 8, button: 0 }));
        expect(b().value).toBe('80');
    });

    it('vertical: el click en el riel mide de abajo hacia arriba', () => {
        const raiz = montar(RANGO());
        raiz.classList.add('is-vertical');
        const riel = q('[data-ts-slider-rail]');
        medir(riel, 16, 216);
        riel.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 8, clientY: 28, button: 0 }));
        expect(b().value).toBe('90');
    });
});

describe('AlertDialog: confirmText', () => {
    const HTML = `<dialog role="alertdialog" data-ts-confirm-text="Panel de control">
        <input data-ts-confirm-input>
        <button type="button" data-ts-confirm disabled>Eliminar</button>
    </dialog>`;
    const escribir = (valor: string) => {
        const campo = q<HTMLInputElement>('[data-ts-confirm-input]');
        campo.value = valor;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
    };

    it('Confirmar queda deshabilitado hasta que lo tipeado coincide exacto', () => {
        montar(HTML);
        const boton = q<HTMLButtonElement>('[data-ts-confirm]');
        expect(boton.disabled).toBe(true);
        escribir('panel de control');
        expect(boton.disabled).toBe(true);
        escribir('Panel de control');
        expect(boton.disabled).toBe(false);
        escribir('Panel de control ');
        expect(boton.disabled).toBe(true);
    });

    it('init vuelve a deshabilitar un Confirmar que llegó habilitado en el HTML', () => {
        montar(HTML.replace(' disabled', ''));
        expect(q<HTMLButtonElement>('[data-ts-confirm]').disabled).toBe(true);
    });

    it('al cerrarse vacía el campo y vuelve a bloquear Confirmar', () => {
        montar(HTML);
        escribir('Panel de control');
        q('dialog').dispatchEvent(new Event('close'));
        expect(q<HTMLInputElement>('[data-ts-confirm-input]').value).toBe('');
        expect(q<HTMLButtonElement>('[data-ts-confirm]').disabled).toBe(true);
    });
});

describe('Combobox allowCustom', () => {
    const HTML = (extra: string) => `
    <form>
      <div data-ts-listbox="combobox" data-ts-combobox ${extra}>
        <input data-ts-listbox-input role="combobox" aria-expanded="false" aria-controls="c">
        <input type="hidden" name="pais" data-ts-listbox-value>
        <div id="c" data-ts-listbox-panel role="listbox" hidden>
          <div role="option" data-ts-value="cl" aria-selected="false">Chile</div>
        </div>
      </div>
    </form>`;
    const confirmar = (texto: string) => {
        const input = q<HTMLInputElement>('[data-ts-listbox-input]');
        input.focus();
        input.value = texto;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    };

    it('con data-ts-allow-custom el texto libre pasa a ser el valor', () => {
        montar(HTML('data-ts-allow-custom'));
        confirmar('Uruguay');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('Uruguay');
        expect(q<HTMLInputElement>('[data-ts-listbox-input]').value).toBe('Uruguay');
    });

    it('sin el atributo sigue siendo estricto: el texto libre se descarta', () => {
        montar(HTML(''));
        confirmar('Uruguay');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('');
        expect(q<HTMLInputElement>('[data-ts-listbox-input]').value).toBe('');
    });

    it('un texto que sí está en la lista resuelve a su opción aunque haya allowCustom', () => {
        montar(HTML('data-ts-allow-custom'));
        confirmar('chile');
        expect(q<HTMLInputElement>('[data-ts-listbox-value]').value).toBe('cl');
    });
});

describe('Pagination completa', () => {
    const HTML = `
    <nav data-ts-pagination data-ts-total="20" data-ts-page="1" data-ts-items="200" data-ts-page-size="10">
      <span data-ts-page-label>1–10 de 200</span>
      <div data-ts-page-size-control>
        <div data-ts-listbox="select" data-ts-select>
          <button type="button" data-ts-listbox-trigger role="combobox" aria-expanded="false" aria-controls="ps"><span data-ts-listbox-label>10 por página</span></button>
          <input type="hidden" data-ts-listbox-value value="10">
          <div id="ps" data-ts-listbox-panel role="listbox" hidden>
            <div role="option" data-ts-value="10" aria-selected="true">10 por página</div>
            <div role="option" data-ts-value="50" aria-selected="false">50 por página</div>
          </div>
        </div>
      </div>
      <button data-ts-page-first disabled>«</button>
      <button data-ts-page-prev disabled>‹</button>
      <div data-ts-pagination-list>
        <button data-ts-page-item data-ts-value="1" aria-label="Página 1">1</button>
      </div>
      <button data-ts-page-next>›</button>
      <button data-ts-page-last>»</button>
    </nav>`;

    it('«Última» y «Primera» llevan al extremo y deshabilitan lo que corresponde', () => {
        const nav = montar(HTML);
        q('[data-ts-page-last]').click();
        expect(nav.getAttribute('data-ts-page')).toBe('20');
        expect(q<HTMLButtonElement>('[data-ts-page-last]').disabled).toBe(true);
        expect(q<HTMLButtonElement>('[data-ts-page-first]').disabled).toBe(false);
        expect(q('[data-ts-page-label]').textContent).toBe('191–200 de 200');
        q('[data-ts-page-first]').click();
        expect(nav.getAttribute('data-ts-page')).toBe('1');
        expect(q('[data-ts-page-label]').textContent).toBe('1–10 de 200');
    });

    it('la etiqueta sigue a Siguiente y respeta la plantilla', () => {
        const nav = montar(HTML);
        nav.setAttribute('data-ts-label-template', '{from} a {to} ({total})');
        q('[data-ts-page-next]').click();
        expect(q('[data-ts-page-label]').textContent).toBe('11 a 20 (200)');
    });

    it('sin ítems usa `data-ts-label-empty`; sin el atributo, «0 resultados»', () => {
        const nav = montar(HTML);
        nav.setAttribute('data-ts-items', '0');
        q('[data-ts-page-next]').click();
        expect(q('[data-ts-page-label]').textContent).toBe('0 resultados');

        const otro = montar(HTML);
        otro.setAttribute('data-ts-items', '0');
        otro.setAttribute('data-ts-label-empty', 'No results');
        q('[data-ts-page-next]').click();
        expect(q('[data-ts-page-label]').textContent).toBe('No results');
    });

    it('elegir otro tamaño recalcula las páginas y vuelve a la primera', () => {
        const nav = montar(HTML);
        q('[data-ts-page-next]').click();
        q('[data-ts-listbox-trigger]').click();
        q('[data-ts-value="50"]').click();
        expect(nav.getAttribute('data-ts-page-size')).toBe('50');
        expect(nav.getAttribute('data-ts-total')).toBe('4');
        expect(nav.getAttribute('data-ts-page')).toBe('1');
        expect(q('[data-ts-page-label]').textContent).toBe('1–50 de 200');
    });

    it('con el ts:change de la paginación frenado, el tamaño no cambia', () => {
        const nav = montar(HTML);
        const frenar = (e: Event) => { if ((e as CustomEvent).detail?.component === 'pagination') e.preventDefault(); };
        document.addEventListener('ts:change', frenar);
        q('[data-ts-listbox-trigger]').click();
        q('[data-ts-value="50"]').click();
        document.removeEventListener('ts:change', frenar);
        expect(nav.getAttribute('data-ts-page-size')).toBe('10');
        expect(nav.getAttribute('data-ts-total')).toBe('20');
    });
});

describe('CheckboxGroup selectAll', () => {
    const CASILLA = (extra: string, value = '') =>
        `<label class="ts checkbox" ${extra}><input type="checkbox" class="ts checkbox-input" ${value}></label>`;
    const HTML = `
    <div role="group" data-ts-checkbox-group>
      ${CASILLA('data-ts-select-all')}
      ${CASILLA('', 'value="email" checked')}
      ${CASILLA('', 'value="slack"')}
    </div>`;
    const [maestra, email, slack] = [0, 1, 2].map((i) => () => qq('input')[i] as HTMLInputElement);

    it('arranca mixta con una marcada', () => {
        montar(HTML);
        expect(maestra().indeterminate).toBe(true);
        expect(maestra().checked).toBe(false);
        expect(maestra().closest('label')!.classList.contains('is-indeterminate')).toBe(true);
    });

    it('la maestra marca todos y después desmarca todos', () => {
        montar(HTML);
        maestra().click();
        expect([maestra().checked, email().checked, slack().checked]).toEqual([true, true, true]);
        expect(maestra().indeterminate).toBe(false);
        maestra().click();
        expect([maestra().checked, email().checked, slack().checked]).toEqual([false, false, false]);
    });

    it('los ítems llevan la maestra a marcada, mixta o vacía', () => {
        montar(HTML);
        slack().click();
        expect([maestra().checked, maestra().indeterminate]).toEqual([true, false]);
        email().click();
        slack().click();
        expect([maestra().checked, maestra().indeterminate]).toEqual([false, false]);
        email().click();
        expect(maestra().indeterminate).toBe(true);
    });
});

describe('Checkbox mixto suelto', () => {
    const HTML = `<label class="ts checkbox is-indeterminate"><input type="checkbox" class="ts checkbox-input" indeterminate=""></label>`;

    it('lleva el `indeterminate=""` del marcado a la propiedad al iniciar', () => {
        montar(HTML);
        expect(q<HTMLInputElement>('input').indeterminate).toBe(true);
    });

    it('al activarla deja de ser mixta: propiedad, atributo y clase', () => {
        montar(HTML);
        q('input').click();
        expect([q<HTMLInputElement>('input').indeterminate, q('input').hasAttribute('indeterminate'), q('label').classList.contains('is-indeterminate'), q('label').classList.contains('is-checked')]).toEqual([false, false, false, true]);
    });

    it('volver a iniciar no la hace mixta otra vez', () => {
        montar(HTML);
        q('input').click();
        init(document);
        expect(q<HTMLInputElement>('input').indeterminate).toBe(false);
    });
});

describe('Toast: description, íconos y toast.promise', () => {
    beforeEach(() => clearToasts());
    const CONTENEDOR = `
    <div data-ts-toast-container class="ts toaster">
      <template data-ts-toast-icon="success"><span data-toast-icon id="ok"></span></template>
      <template data-ts-toast-icon="loading"><span data-toast-icon id="cargando"></span></template>
    </div>`;

    it('el botón de cerrar toma el nombre del contenedor; sin él, «Cerrar notificación»', () => {
        const nombre = (el: HTMLElement) => el.querySelector('[data-ts-dismiss]')!.getAttribute('aria-label');
        expect(nombre(toast('Cambios guardados.', { duration: 0 }))).toBe('Cerrar notificación');

        clearToasts();
        montar('<div data-ts-toast-container class="ts toaster" data-ts-toast-dismiss-label="Dismiss notification"></div>');
        expect(nombre(toast('Cambios guardados.', { duration: 0 }))).toBe('Dismiss notification');
        expect(nombre(toast('Cambios guardados.', { duration: 0, dismissLabel: 'Descartar' }))).toBe('Descartar');
    });

    it('el aviso no lleva rol propio (la región es la viva) y muestra el detalle bajo el título', () => {
        montar(CONTENEDOR);
        const el = toast('Despliegue completado.', { description: 'Producción · 14:32', duration: 0 });
        expect(el.hasAttribute('role')).toBe(false);
        expect(el.closest('[role="status"]')).toBe(q('[data-ts-toast-region="polite"]'));
        expect(el.querySelector('[data-toast-title]')!.textContent).toBe('Despliegue completado.');
        expect(el.querySelector('[data-toast-body] [data-toast-desc]')!.textContent).toBe('Producción · 14:32');
    });

    it('el ícono de la variante se clona del template del contenedor; default y sin template van sin ícono', () => {
        montar(CONTENEDOR);
        expect(toast('Listo', { variant: 'success', duration: 0 }).querySelector('#ok')).not.toBeNull();
        expect(toast('Hola', { duration: 0 }).querySelector('[data-toast-icon]')).toBeNull();
        expect(toast('Falló', { variant: 'danger', duration: 0 }).querySelector('[data-toast-icon]')).toBeNull();
        expect(qq('template[data-ts-toast-icon]')).toHaveLength(2);
    });

    it('updateToast cambia ícono y detalle; clearToasts no borra los templates', () => {
        montar(CONTENEDOR);
        const el = toast('Construyendo…', { duration: 0 });
        updateToast(el, { variant: 'success', description: 'Staging' });
        expect(el.querySelector('#ok')).not.toBeNull();
        expect(el.querySelector('[data-toast-desc]')!.textContent).toBe('Staging');
        updateToast(el, { description: '' });
        expect(el.querySelector('[data-toast-desc]')).toBeNull();
        clearToasts();
        expect(qq('[data-ts-toast]')).toHaveLength(0);
        expect(qq('template[data-ts-toast-icon]')).toHaveLength(2);
    });

    it('toast.promise: un solo aviso aria-busy con spinner y sin cerrar, que pasa a éxito en el mismo lugar', async () => {
        montar(CONTENEDOR);
        let resolver!: (v: number) => void;
        const el = toast.promise(new Promise<number>((r) => (resolver = r)), {
            loading: 'Guardando…',
            success: (n) => `Guardado ${n}.`,
            error: 'No se pudo guardar.',
        });
        expect(qq('[data-ts-toast]')).toHaveLength(1);
        expect(el.getAttribute('aria-busy')).toBe('true');
        expect(el.querySelector('#cargando')).not.toBeNull();
        expect(el.querySelector('[data-ts-dismiss]')).toBeNull();
        resolver(3);
        await Promise.resolve();
        await Promise.resolve();
        expect(qq('[data-ts-toast]')).toHaveLength(1);
        expect(el.hasAttribute('aria-busy')).toBe(false);
        expect(el.querySelector('[data-toast-title]')!.textContent).toBe('Guardado 3.');
        expect(el.classList.contains('variant-success')).toBe(true);
        expect(el.querySelector('#ok')).not.toBeNull();
        expect(el.querySelector('[data-ts-dismiss]')).not.toBeNull();
    });

    it('toast.promise rechazada pasa a danger', async () => {
        montar(CONTENEDOR);
        const el = toast.promise(Promise.reject(new Error('x')), { loading: 'Guardando…', success: 'Ok', error: 'No se pudo guardar.' });
        await Promise.resolve();
        await Promise.resolve();
        expect(el.classList.contains('variant-danger')).toBe(true);
        expect(el.querySelector('[data-toast-title]')!.textContent).toBe('No se pudo guardar.');
    });
});

describe('Slider con paradas', () => {
    const PARADAS = '0,2,4,6,8,12,16,24';
    const UNO = (extra = '', texts = '') => `
    <form id="f">
    <div class="ts slider size-md" data-ts-slider data-ts-slider-values="${PARADAS}" data-ts-slider-format="{v} px" ${texts}>
      <div class="ts slider-header"><span class="ts slider-value" data-ts-slider-value>8 px</span></div>
      <div class="ts slider-ticks" aria-hidden="true"><span></span><span></span></div>
      <input id="v" type="range" class="ts slider-track" min="0" max="7" step="1" value="4" aria-label="Radio base" aria-valuemin="0" aria-valuemax="24" aria-valuenow="8" ${extra}>
      <input type="hidden" name="radio" value="8">
    </div></form>`;
    const RANGO = `
    <div class="ts slider size-md is-range" data-ts-slider data-ts-slider-range data-ts-slider-values="${PARADAS}" role="group" aria-label="Radios">
      <div class="ts slider-range size-md" data-ts-slider-rail>
        <input id="a" type="range" class="ts slider-track is-start" min="0" max="7" step="1" value="1" data-ts-slider-thumb="0" aria-label="Mínimo">
        <input type="hidden" name="desde" value="2">
        <input id="b" type="range" class="ts slider-track is-end" min="0" max="7" step="1" value="5" data-ts-slider-thumb="1" aria-label="Máximo">
        <input type="hidden" name="hasta" value="12">
      </div>
    </div>`;
    const mover = (el: HTMLInputElement, pos: number) => {
        el.value = String(pos);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const tecla = (el: Element, type: 'keydown' | 'keyup', key: string) => {
        const e = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
        el.dispatchEvent(e);
        return e;
    };
    const escuchar = (raiz: HTMLElement, tipo: string) => {
        const lista: Record<string, unknown>[] = [];
        raiz.addEventListener(tipo, (e) => lista.push((e as CustomEvent).detail));
        return lista;
    };

    it('al iniciar publica el valor real, su texto y el relleno por posición', () => {
        montar(UNO());
        const input = q<HTMLInputElement>('#v');
        expect(input.getAttribute('aria-valuenow')).toBe('8');
        expect(input.getAttribute('aria-valuetext')).toBe('8 px');
        expect(input.style.getPropertyValue('--ts-slider-fill')).toBe('57.1429%');
    });

    it('al mover: eventos con el valor real, texto visible y campo oculto', () => {
        const raiz = montar(UNO());
        const avisos = escuchar(raiz, 'ts:change');
        const input = q<HTMLInputElement>('#v');
        mover(input, 6);
        expect(avisos).toEqual([{ component: 'slider', value: 16 }]);
        expect(input.getAttribute('aria-valuenow')).toBe('16');
        expect(input.getAttribute('aria-valuetext')).toBe('16 px');
        expect(raiz.querySelector('[data-ts-slider-value]')!.textContent).toBe('16 px');
        expect(new FormData(q<HTMLFormElement>('#f')).get('radio')).toBe('16');
    });

    it('un texto por parada (data-ts-slider-texts) gana sobre la plantilla', () => {
        const raiz = montar(UNO('', 'data-ts-slider-texts="0 px|2 px|4 px|6 px, Suave|8 px|12 px|16 px|24 px"'));
        const input = q<HTMLInputElement>('#v');
        mover(input, 3);
        expect(input.getAttribute('aria-valuetext')).toBe('6 px, Suave');
        expect(raiz.querySelector('[data-ts-slider-value]')!.textContent).toBe('6 px, Suave');
    });

    it('el texto del lector se separa del visible: data-ts-slider-valuetexts y data-ts-slider-valuetext', () => {
        const raiz = montar(UNO('', 'data-ts-slider-valuetexts="0 px|2 px|4 px|6 px, Suave|8 px|12 px|16 px|24 px"'));
        const input = q<HTMLInputElement>('#v');
        mover(input, 3);
        expect(input.getAttribute('aria-valuetext')).toBe('6 px, Suave');
        expect(raiz.querySelector('[data-ts-slider-value]')!.textContent).toBe('6 px');
        raiz.querySelector('[data-ts-slider]')!.removeAttribute('data-ts-slider-valuetexts');
        const plantilla = q('[data-ts-slider]');
        plantilla.removeAttribute('data-ts-slider-valuetexts');
        plantilla.setAttribute('data-ts-slider-valuetext', '{v} píxeles');
        mover(input, 5);
        expect(input.getAttribute('aria-valuetext')).toBe('12 píxeles');
        expect(raiz.querySelector('[data-ts-slider-value]')!.textContent).toBe('12 px');
    });

    it('con más de 14 paradas, RePág y AvPág saltan una décima parte de la lista', () => {
        const treinta = Array.from({ length: 30 }, (_, k) => k * 5).join(',');
        montar(`<div class="ts slider size-md" data-ts-slider data-ts-slider-values="${treinta}"><input id="m" type="range" class="ts slider-track" min="0" max="29" step="1" value="10" aria-label="Muchas"></div>`);
        const input = q<HTMLInputElement>('#m');
        tecla(input, 'keydown', 'PageUp');
        expect(input.value).toBe('13');
        tecla(input, 'keydown', 'PageDown');
        tecla(input, 'keydown', 'PageDown');
        expect(input.value).toBe('7');
    });

    it('RePág y AvPág mueven una parada; ts:commit al soltar la tecla', () => {
        const raiz = montar(UNO());
        const commits = escuchar(raiz, 'ts:commit');
        const input = q<HTMLInputElement>('#v');
        expect(tecla(input, 'keydown', 'PageUp').defaultPrevented).toBe(true);
        expect(input.value).toBe('5');
        expect(input.getAttribute('aria-valuenow')).toBe('12');
        tecla(input, 'keydown', 'PageDown');
        tecla(input, 'keydown', 'PageDown');
        expect(input.value).toBe('3');
        expect(commits).toEqual([]);
        tecla(input, 'keyup', 'PageDown');
        expect(commits).toEqual([{ component: 'slider', value: 6 }]);
    });

    it('RePág en la punta no pasa de la última parada', () => {
        montar(UNO());
        const input = q<HTMLInputElement>('#v');
        mover(input, 7);
        tecla(input, 'keydown', 'PageUp');
        expect(input.value).toBe('7');
    });

    it('RePág con sólo lectura no se mueve', () => {
        montar(UNO('aria-readonly="true"'));
        const input = q<HTMLInputElement>('#v');
        tecla(input, 'keydown', 'PageUp');
        expect(input.value).toBe('4');
    });

    it('rango: valores reales, sin cruce, y cada campo oculto con el suyo', () => {
        const raiz = montar(RANGO);
        const avisos = escuchar(raiz, 'ts:change');
        const a = q<HTMLInputElement>('#a');
        const b = q<HTMLInputElement>('#b');
        mover(a, 3);
        expect(avisos.at(-1)).toEqual({ component: 'slider', value: [6, 12], index: 0 });
        expect(a.getAttribute('aria-valuenow')).toBe('6');
        expect(b.getAttribute('aria-valuemin')).toBe('6');
        mover(a, 7);
        expect(a.value).toBe('5');
        const campos = [...document.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].map((i) => i.value);
        expect(campos).toEqual(['12', '12']);
        // la de fin no baja de la de inicio; la de inicio sí retrocede una parada
        tecla(b, 'keydown', 'PageDown');
        expect([a.value, b.value]).toEqual(['5', '5']);
        tecla(a, 'keydown', 'PageDown');
        expect([a.value, b.value]).toEqual(['4', '5']);
    });

    it('form.reset() vuelve a la parada inicial y el campo oculto lo acompaña', async () => {
        montar(UNO());
        const input = q<HTMLInputElement>('#v');
        mover(input, 7);
        q<HTMLFormElement>('#f').reset();
        await new Promise((r) => setTimeout(r, 5));
        expect(input.value).toBe('4');
        expect(input.getAttribute('aria-valuenow')).toBe('8');
        expect(new FormData(q<HTMLFormElement>('#f')).get('radio')).toBe('8');
    });
});
