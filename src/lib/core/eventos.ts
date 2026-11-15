// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { SliderRange } from './logica/slider';

/** `detail` de `ts:change`. */
export interface TsChangeDetail {
    component: string;
    value?: string | number | SliderRange;
    selection?: string[];
    files?: File[];
    text?: string;
    query?: string;
    key?: string;
    direction?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
    openItems?: string[];
    dismissed?: boolean;
    index?: number;
    failed?: boolean;
    name?: string;
    collapsed?: boolean;
    open?: boolean;
    start?: string;
    end?: string;
}

/** `detail` de `ts:commit` (el Slider al soltar). */
export interface TsCommitDetail {
    component: string;
    value: number | SliderRange;
}

/** `detail` de `ts:debouncedinput`. */
export interface TsDebouncedInputDetail {
    value: string;
}

export interface TsEventMap {
    'ts:change': CustomEvent<TsChangeDetail>;
    'ts:commit': CustomEvent<TsCommitDetail>;
    'ts:debouncedinput': CustomEvent<TsDebouncedInputDetail>;
}

declare global {
    interface HTMLElementEventMap {
        'ts:change': CustomEvent<TsChangeDetail>;
        'ts:commit': CustomEvent<TsCommitDetail>;
        'ts:debouncedinput': CustomEvent<TsDebouncedInputDetail>;
    }
    interface DocumentEventMap {
        'ts:change': CustomEvent<TsChangeDetail>;
        'ts:commit': CustomEvent<TsCommitDetail>;
        'ts:debouncedinput': CustomEvent<TsDebouncedInputDetail>;
    }
}

export function emitir<K extends keyof TsEventMap>(el: EventTarget, tipo: K, detalle: TsEventMap[K]['detail'], cancelable = false): boolean {
    return el.dispatchEvent(new CustomEvent(tipo, { detail: detalle, bubbles: true, cancelable }));
}
