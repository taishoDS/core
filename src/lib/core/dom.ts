// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { emitir, type TsChangeDetail } from './eventos';

export const P = 'data-ts-';

export const claseDS = (nombre: string): string => `ts ${nombre}`;

export function contenedor(el: Element, nombre: string): HTMLElement | null {
    return el.closest<HTMLElement>(`[${P}${nombre}]`);
}

export function partes(raiz: HTMLElement, nombre: string, parte: string): HTMLElement[] {
    return [...raiz.querySelectorAll<HTMLElement>(`[${P}${nombre}-${parte}]`)].filter(
        (el) => el.closest(`[${P}${nombre}]`) === raiz,
    );
}

export function mostrar(el: HTMLElement, visible: boolean): void {
    el.hidden = !visible;
}

export function avisar(el: HTMLElement, detalle: TsChangeDetail): boolean {
    return emitir(el, 'ts:change', detalle, true);
}

const conCursorAlFinal = new WeakSet<Element>();

export function cursorAlFinal(root: Document | HTMLElement): void {
    for (const campo of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
        if (conCursorAlFinal.has(campo) || campo === document.activeElement) continue;
        conCursorAlFinal.add(campo);
        const largo = campo.value.length;
        if (largo === 0 || campo.selectionStart !== 0 || campo.selectionEnd !== 0) continue;
        campo.setSelectionRange(largo, largo);
    }
}

export function alEnfocarRequerido(destino: Element): void {
    if (destino.hasAttribute(`${P}required-proxy`)) (destino.previousElementSibling as HTMLElement | null)?.focus();
}
