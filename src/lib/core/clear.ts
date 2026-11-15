// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { showClearButton } from './logica/input';
import { P, avisar } from './dom';
import { m } from './registro';
import * as campoAsync from './campo';

const CAMPOS = 'input:not([type="hidden"]), textarea';

function campoDe(boton: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
    for (let el = boton.parentElement; el; el = el.parentElement) {
        const campos = el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(CAMPOS);
        if (campos.length) return campos.length === 1 ? campos[0] : null;
    }
    return null;
}

function botonDe(campo: Element): HTMLElement | null {
    for (let el = campo.parentElement; el; el = el.parentElement) {
        if (el.querySelectorAll(CAMPOS).length > 1) return null;
        const boton = el.querySelector<HTMLElement>(`[${P}clear]`);
        if (boton) return boton;
    }
    return null;
}

const selectDe = (boton: HTMLElement) => boton.closest<HTMLElement>(`[${P}listbox]`);

const fechaDe = (boton: HTMLElement) =>
    boton.closest('.ts.datepicker')?.querySelector<HTMLElement>(`[${P}date-picker]`) ?? null;

function sincronizarBoton(boton: HTMLElement): void {
    const sel = selectDe(boton);
    if (sel) return m.select?.sincronizarLimpiar(sel);
    const fecha = fechaDe(boton);
    if (fecha) return m.datePicker?.sincronizarLimpiar(fecha);
    const campo = campoDe(boton);
    if (!campo) return;
    boton.hidden = !showClearButton(campo.value !== '', campo.disabled, campo.readOnly);
}

export function sincronizar(raiz: Document | HTMLElement): void {
    for (const boton of raiz.querySelectorAll<HTMLElement>(`[${P}clear]`)) sincronizarBoton(boton);
}

export function alEscribir(destino: Element): void {
    const boton = botonDe(destino);
    if (boton) sincronizarBoton(boton);
}

export function alHacerClick(destino: Element): boolean {
    const boton = destino.closest<HTMLElement>(`[${P}clear]`);
    if (!boton) return false;
    const sel = selectDe(boton);
    if (sel) {
        m.select?.limpiar(sel);
        return true;
    }
    const fecha = fechaDe(boton);
    if (fecha) {
        m.datePicker?.limpiar(fecha);
        return true;
    }
    const campo = campoDe(boton);
    if (!campo || campo.disabled || campo.readOnly) return true;

    campo.value = '';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
    avisar(boton, { component: 'clear', value: '' });
    campoAsync.alLimpiar(campo);
    sincronizarBoton(boton);
    campo.focus();
    return true;
}

export const ficha = {
    alEscribir,
    alHacerClick,
    sincronizar,
};
