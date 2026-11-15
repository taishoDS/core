// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { P, claseDS } from './dom';

const CONTROL = `input:not([type="hidden"]):not([${P}required-proxy]), select, textarea, button[aria-haspopup], .datepicker-trigger, [role="combobox"]`;
const ENVOLTURA = '.input-wrapper, .select-wrapper, .checkbox-wrapper, .combobox';
const CAJA = '.input, .textarea, .select, .combobox-control, .number-input, .datepicker, .checkbox, .radio, .toggle';

const ICONO_ERROR =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ts icon icon-14" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';

interface Anatomia {
    marcados: Element[];
    descritos: Element[];
    envoltura: Element | null;
    ancla: Element;
}

function anatomia(el: Element): Anatomia {
    if (el.matches('[role="group"]')) {
        return { marcados: [...el.querySelectorAll('input[type="checkbox"]')], descritos: [el], envoltura: el, ancla: el };
    }
    const control = el.matches(CONTROL) ? el : (el.querySelector(CONTROL) ?? el);
    const radios = control.closest('[role="radiogroup"]');
    const rango = control.closest('.datepicker-range');
    const marcados = radios ? [radios] : rango ? [...rango.querySelectorAll('input')] : [control];
    return { marcados, descritos: marcados, envoltura: marcados[0].closest(ENVOLTURA), ancla: radios ?? control.closest(CAJA) ?? control };
}

const descripciones = (el: Element): string[] => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);

function describir(el: Element, ids: string[]): void {
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
}

function hintExistente({ descritos, envoltura }: Anatomia): HTMLElement | null {
    for (const id of descripciones(descritos[0])) {
        const candidato = document.getElementById(id);
        if (candidato?.classList.contains('input-hint')) return candidato;
    }
    return envoltura?.querySelector<HTMLElement>(':scope > .input-footer > .input-hint, :scope > .input-hint') ?? null;
}

function crearHint({ envoltura, ancla }: Anatomia): HTMLElement {
    const hint = document.createElement('div');
    hint.className = claseDS('input-hint');
    let footer = envoltura?.querySelector<HTMLElement>(':scope > .input-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.className = claseDS('input-footer');
        if (envoltura) envoltura.append(footer);
        else ancla.after(footer);
    }
    footer.prepend(hint);
    return hint;
}

function borrarHint(hint: HTMLElement): void {
    const footer = hint.parentElement;
    hint.remove();
    if (footer?.classList.contains('input-footer') && footer.childElementCount === 0) footer.remove();
}

interface Previo {
    hint: HTMLElement;
    ayuda: { clases: string; contenido: Node[]; live: string | null } | null;
    enlazado: boolean;
}

const previos = new WeakMap<Element, Previo>();
let contador = 0;

function escribir(hint: HTMLElement, mensaje: string): void {
    const molde = document.createElement('template');
    molde.innerHTML = ICONO_ERROR;
    const texto = document.createElement('span');
    texto.textContent = mensaje;
    hint.replaceChildren(molde.content, texto);
}

/**
 * Marca un campo como inválido y muestra el mensaje debajo. Se puede volver a llamar para cambiar el mensaje.
 * @param el El control o su raíz.
 * @param message El texto del error.
 */
export function markInvalid(el: Element, message: string): void {
    const partes = anatomia(el);
    const clave = partes.descritos[0];
    for (const m of partes.marcados) m.setAttribute('aria-invalid', 'true');

    let previo = previos.get(clave);
    if (!previo) {
        const existente = hintExistente(partes);
        const hint = existente ?? crearHint(partes);
        hint.id ||= `ts-invalid-${++contador}`;
        previo = {
            hint,
            ayuda: existente && { clases: existente.className, contenido: [...existente.childNodes], live: existente.getAttribute('aria-live') },
            enlazado: descripciones(clave).includes(hint.id),
        };
        previos.set(clave, previo);
        hint.className = [...hint.classList].filter((c) => !c.startsWith('variant-')).concat('variant-danger').join(' ');
        hint.setAttribute('aria-live', 'polite');
        for (const d of partes.descritos) {
            if (!descripciones(d).includes(hint.id)) describir(d, [...descripciones(d), hint.id]);
        }
    }
    escribir(previo.hint, message);
}

/**
 * Saca el error de un campo: quita `aria-invalid`, borra el mensaje y devuelve la ayuda que tenía antes.
 * También limpia un error que llegó escrito en el HTML.
 * @param el El control o su raíz, el mismo que en `markInvalid`.
 */
export function clearInvalid(el: Element): void {
    const partes = anatomia(el);
    const clave = partes.descritos[0];
    for (const m of partes.marcados) m.removeAttribute('aria-invalid');

    const previo = previos.get(clave);
    previos.delete(clave);
    const hint = previo?.hint ?? hintExistente(partes);
    if (!hint || (!previo && !hint.classList.contains('variant-danger'))) return;

    if (previo?.ayuda) {
        hint.className = previo.ayuda.clases;
        hint.replaceChildren(...previo.ayuda.contenido);
        if (previo.ayuda.live === null) hint.removeAttribute('aria-live');
        else hint.setAttribute('aria-live', previo.ayuda.live);
    } else {
        borrarHint(hint);
    }
    if (previo?.ayuda && previo.enlazado) return;
    for (const d of partes.descritos) describir(d, descripciones(d).filter((id) => id !== hint.id));
}

