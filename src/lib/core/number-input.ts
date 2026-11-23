// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { clampSafe, stepValue, parseTyped, parseFormatted, restoreText, stepAvailability, wheelAction, keyAction, isNumberKey, blocksInput, stepBase, resolveNumberFormat, formatValue, editText, sanitizeTyped, type NumberFormat } from './logica/number-input';
import { forwardWheel } from './logica/number-input-wheel';
import { P, avisar, contenedor } from './dom';
import { localeDe } from './textos';

function campo(raiz: HTMLElement): HTMLInputElement | null {
    return raiz.querySelector<HTMLInputElement>(`[${P}number-field]`);
}

const ultimoValido = new WeakMap<HTMLInputElement, number>();

function limites(input: HTMLInputElement): { min: number; max: number } {
    return {
        min: input.min === '' ? -Infinity : Number(input.min),
        max: input.max === '' ? Infinity : Number(input.max),
    };
}

function formato(raiz: HTMLElement): NumberFormat | null {
    const crudo = raiz.getAttribute(`${P}number-format`);
    if (!crudo) return null;
    return resolveNumberFormat(JSON.parse(crudo), raiz.getAttribute(`${P}locale`) ?? localeDe(raiz));
}

function crudo(raiz: HTMLElement): HTMLInputElement | null {
    return raiz.parentElement?.querySelector<HTMLInputElement>(`:scope > [${P}number-raw]`) ?? null;
}

export function sincronizarEnvio(raiz: HTMLElement): void {
    const input = campo(raiz);
    const oculto = crudo(raiz);
    if (input && oculto && oculto.disabled !== input.disabled) oculto.disabled = input.disabled;
}

function actualDe(raiz: HTMLElement, input: HTMLInputElement): number | null {
    const { min, max } = limites(input);
    return parseTyped(input.value, min, max, formato(raiz));
}

function sincronizarValor(raiz: HTMLElement, input: HTMLInputElement, valor: number | null): void {
    const fmt = formato(raiz);
    if (!fmt) return;
    const oculto = crudo(raiz);
    if (oculto) oculto.value = valor === null ? '' : String(valor);
    if (valor === null) {
        input.removeAttribute('aria-valuenow');
        input.removeAttribute('aria-valuetext');
        return;
    }
    input.setAttribute('aria-valuenow', String(valor));
    input.setAttribute('aria-valuetext', formatValue(valor, fmt));
}

const esLimpiable = (raiz: HTMLElement): boolean => raiz.querySelector(`[${P}clear]`) !== null;

export function fijar(raiz: HTMLElement, valor: number): void {
    const input = campo(raiz);
    if (!input) return;
    const fmt = formato(raiz);
    input.value = fmt ? (input.matches(':focus') ? editText(valor, fmt) : formatValue(valor, fmt)) : String(valor);
    ultimoValido.set(input, valor);
    sincronizarValor(raiz, input, valor);
    sincronizarBotones(raiz);
}

function pasar(raiz: HTMLElement, direccion: 1 | -1): void {
    const input = campo(raiz);
    if (!input || input.disabled || input.readOnly) return;

    const { min, max } = limites(input);
    const step = input.step === '' || input.step === 'any' ? 1 : Number(input.step);
    const actual = stepBase(actualDe(raiz, input), ultimoValido.get(input) ?? null, min);

    aplicar(raiz, input, clampSafe(stepValue(actual, step, direccion), min, max), actual);
}

function aplicar(raiz: HTMLElement, input: HTMLInputElement, valor: number, actual: number | null): void {
    if (valor === actual) return;
    if (!avisar(raiz, { component: 'number', value: valor })) return;

    const fmt = formato(raiz);
    input.value = !fmt ? String(valor) : input.matches(':focus') ? editText(valor, fmt) : formatValue(valor, fmt);
    sincronizarValor(raiz, input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    sincronizarBotones(raiz);
}

export function sincronizarBotones(raiz: HTMLElement): void {
    const input = campo(raiz);
    if (!input) return;
    const lim = limites(input);
    const valor = parseTyped(input.value, lim.min, lim.max, formato(raiz)) ?? NaN;
    for (const boton of raiz.querySelectorAll<HTMLButtonElement>(`[${P}number-step]`)) {
        const dir = Number(boton.getAttribute(`${P}number-step`));
        if (input.readOnly || input.disabled) { boton.disabled = true; continue; }
        if (Number.isNaN(valor) && input.value === '' && esLimpiable(raiz)) { boton.disabled = false; continue; }
        if (Number.isNaN(valor)) continue;
        const disp = stepAvailability(valor, lim.min, lim.max);
        boton.disabled = !(dir > 0 ? disp.increment : disp.decrement);
    }
}

export function alHacerClick(destino: Element): boolean {
    const boton = destino.closest<HTMLElement>(`[${P}number-step]`);
    if (!boton || boton.hasAttribute('disabled')) return false;
    const raiz = contenedor(boton, 'number');
    if (!raiz) return false;
    pasar(raiz, Number(boton.getAttribute(`${P}number-step`)) >= 0 ? 1 : -1);
    return true;
}

export function alEscribir(destino: Element): boolean {
    const input = destino.closest<HTMLInputElement>(`[${P}number-field]`);
    if (!input) return false;
    const { min, max } = limites(input);
    const raiz = contenedor(input, 'number');
    const fmt = raiz && formato(raiz);
    if (fmt && input.matches(':focus')) {
        const limpio = sanitizeTyped(input.value, min);
        if (limpio !== input.value) input.value = limpio;
    }
    const valido = parseTyped(input.value, min, max, fmt);
    if (raiz && input.value.trim() === '' && esLimpiable(raiz)) {
        ultimoValido.delete(input);
        sincronizarValor(raiz, input, null);
    } else if (valido !== null) {
        ultimoValido.set(input, valido);
        if (raiz) sincronizarValor(raiz, input, valido);
    }
    if (raiz) sincronizarBotones(raiz);
    return true;
}

function alRueda(e: WheelEvent): void {
    const input = e.currentTarget as HTMLInputElement;
    const raiz = contenedor(input, 'number');
    if (!raiz || document.activeElement !== input) return;
    const accion = wheelAction(raiz.hasAttribute(`${P}allow-wheel`) && !input.readOnly, e.deltaY);
    e.preventDefault();
    if (accion === 'scroll') forwardWheel(input, e);
    else if (accion !== 0) pasar(raiz, accion);
}

export function alEnfocar(destino: Element): void {
    const input = destino.closest<HTMLInputElement>(`[${P}number-field]`);
    const raiz = input && contenedor(input, 'number');
    if (!input || !raiz) return;
    const fmt = formato(raiz);
    if (fmt) {
        const oculto = crudo(raiz);
        const base = oculto && oculto.value !== '' ? Number(oculto.value) : parseFormatted(input.value, fmt);
        if (base !== null && !Number.isNaN(base)) {
            ultimoValido.set(input, base);
            input.value = editText(base, fmt);
        }
    } else {
        const inicial = parseFloat(input.value);
        if (!Number.isNaN(inicial)) ultimoValido.set(input, inicial);
    }
    input.addEventListener('wheel', alRueda, { passive: false });
}

export function alDesenfocar(destino: Element): void {
    const input = destino.closest<HTMLInputElement>(`[${P}number-field]`);
    const raiz = input && contenedor(input, 'number');
    if (!input || !raiz) return;
    input.removeEventListener('wheel', alRueda);
    const fmt = formato(raiz);
    const ultimo = ultimoValido.get(input) ?? null;
    const restaurado = restoreText(input.value, ultimo, fmt);
    if (restaurado === null || ultimo === null) return;
    const corrige = !fmt || parseFormatted(input.value, fmt) !== ultimo;
    // Frenado, el texto queda como se escribió y la corrección queda a cargo del código.
    if (corrige && !avisar(raiz, { component: 'number', value: ultimo })) return;
    input.value = restaurado;
    sincronizarValor(raiz, input, ultimo);
    if (!corrige) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    sincronizarBotones(raiz);
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    if (tecla === 'ArrowUp' || tecla === 'ArrowDown') {
        const campoPaso = destino.closest<HTMLInputElement>(`[${P}number-field]`);
        const raizPaso = campoPaso && contenedor(campoPaso, 'number');
        if (!campoPaso || !raizPaso || campoPaso.disabled || campoPaso.readOnly) return false;
        pasar(raizPaso, tecla === 'ArrowUp' ? 1 : -1);
        return true;
    }
    if (!isNumberKey(tecla)) return false;
    const input = destino.closest<HTMLInputElement>(`[${P}number-field]`);
    const raiz = input && contenedor(input, 'number');
    if (!input || !raiz || input.disabled || input.readOnly) return false;
    const { min, max } = limites(input);
    const step = input.step === '' || input.step === 'any' ? 1 : Number(input.step);
    const grande = raiz.getAttribute(`${P}large-step`);
    const actual = actualDe(raiz, input);
    const valor = keyAction(tecla, actual ?? ultimoValido.get(input) ?? null, min, max, step, grande === null ? undefined : Number(grande));
    if (valor === null) return false;
    aplicar(raiz, input, valor, actual);
    return true;
}

/** Modo async: marca el campo como cargando (`is-loading`, `aria-busy`, Spinner). No bloquea la edición. */
export function cargando(root: HTMLElement, loading: boolean): void {
    const input = campo(root);
    if (!input || !root.hasAttribute(`${P}number`)) return;
    if (loading) input.setAttribute('aria-busy', 'true');
    else input.removeAttribute('aria-busy');
    root.classList.toggle('is-loading', loading);
    const spinner = root.querySelector<HTMLElement>(`[${P}number-spinner]`);
    if (spinner) spinner.hidden = !loading;
}

export function alAntesDeEscribir(e: InputEvent): void {
    const input = (e.target as Element | null)?.closest?.<HTMLInputElement>(`[${P}number-field]`);
    if (input && blocksInput(e.data, limites(input).min)) e.preventDefault();
}

export const ficha = {
    alAntesDeEscribir,
    alDesenfocar,
    alEnfocar,
    alEscribir,
    alHacerClick,
    alPresionarTecla,
    sincronizarBotones,
    sincronizarEnvio,
};
