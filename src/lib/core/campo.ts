// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { createDebouncer, type Debouncer } from './logica/input';
import { P } from './dom';
import { emitir } from './eventos';

const debouncers = new WeakMap<Element, Debouncer>();

const debouncerDe = (campo: Element): Debouncer => {
    let d = debouncers.get(campo);
    if (!d) debouncers.set(campo, (d = createDebouncer()));
    return d;
};

/** `data-ts-debounce` sin plazo (o con uno que no es un número ≥ 0) espera 300 ms. */
const PLAZO_DEFECTO = 300;

const plazo = (campo: Element): number | null => {
    const ms = campo.getAttribute(`${P}debounce`);
    if (ms === null) return null;
    const n = ms.trim() === '' ? NaN : Number(ms);
    return Number.isFinite(n) && n >= 0 ? n : PLAZO_DEFECTO;
};

const avisarValor = (campo: Element) => (valor: string): void => {
    emitir(campo, 'ts:debouncedinput', { value: valor });
};

export function alEscribir(destino: Element): void {
    const campo = destino.closest<HTMLInputElement | HTMLTextAreaElement>(`input[${P}debounce], textarea[${P}debounce]`);
    const ms = campo && plazo(campo);
    if (!campo || ms === null) return;
    debouncerDe(campo).schedule(campo.value, ms, avisarValor(campo));
}

export function alLimpiar(campo: Element): void {
    if (plazo(campo) === null) return;
    debouncerDe(campo).flush('', avisarValor(campo));
}

/** Modo async: marca el campo como cargando (`is-loading`, `aria-busy`, Spinner). No bloquea la edición. */
export function cargando(root: HTMLElement, loading: boolean): void {
    if (!root.hasAttribute(`${P}textarea`) && !root.hasAttribute(`${P}input`)) return;
    const campo = root.querySelector('input, textarea');
    if (loading) campo?.setAttribute('aria-busy', 'true');
    else campo?.removeAttribute('aria-busy');
    root.classList.toggle('is-loading', loading);
    const spinner = root.querySelector<HTMLElement>(`[${P}field-spinner]`);
    if (spinner) spinner.hidden = !loading;
}

export const ficha = {
    alEscribir,
};
