// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { iniciar, alClick } from './nucleo';
import { m, cargador, type Modulos } from './registro';
import { pedirAvisoLlave, pedirAvisoVersiones } from './desarrollo-local';
import { PESADOS, archivoDe, type NombreModulo } from './modulos';
import { ficha as accordion } from './accordion';
import { ficha as alertDialog } from './alert-dialog';
import { ficha as avatar } from './avatar';
import { ficha as button } from './button';
import { ficha as campo } from './campo';
import { ficha as clear } from './clear';
import { ficha as clipboard } from './clipboard';
import { ficha as dismiss } from './dismiss';
import { ficha as invokers } from './invokers';
import { ficha as medidas } from './medidas';
import { ficha as menu } from './menu';
import { ficha as opcion } from './opcion';
import { ficha as overlays } from './overlays';
import { ficha as progress } from './progress';
import { ficha as scrollspy } from './scrollspy';
import { ficha as segmented } from './segmented';
import { ficha as sidebar } from './sidebar';
import { ficha as spotlight } from './spotlight';
import { ficha as tabs } from './tabs';
import { ficha as fichaToast } from './toast';
import { ficha as toggle } from './toggle';
import type { cargando as cargandoNumero } from './number-input';
import type { cargando as cargandoSelect } from './select';
import type { cargando as cargandoFecha, deshabilitar as deshabilitarFecha } from './date-picker';
import type { markInvalid as markInvalidTipo, clearInvalid as clearInvalidTipo } from './invalid';
import { cargando as cargandoCampo } from './campo';
import { cargando as cargandoBoton } from './button';

export { nextIndex } from './roving';
export { setTexts } from './textos';
export type { CoreTexts } from './textos';
export type { RovingKey, RovingOpciones } from './roving';
export type { TsChangeDetail, TsCommitDetail, TsDebouncedInputDetail, TsEventMap } from './eventos';
export { toast, updateToast, clearToasts } from './toast';
export type { ToastOptions, ToastVariant, ToastAction, ToastChanges, ToastPromiseMessages } from './toast';

interface Pesado {
    modulos: Partial<Modulos>;
    api: Record<string, (...args: never[]) => void>;
}

const IMPORTAR: Record<string, () => Promise<Pesado>> = {
    'command-palette': () => import('./pesados/command-palette'),
    'date-picker': () => import('./pesados/date-picker'),
    'file-upload': () => import('./pesados/file-upload'),
    invalid: () => import('./pesados/invalid'),
    'number-input': () => import('./pesados/number-input'),
    pagination: () => import('./pesados/pagination'),
    select: () => import('./pesados/select'),
    slider: () => import('./pesados/slider'),
    table: () => import('./pesados/table'),
};

const LIVIANOS: Partial<Modulos> = { accordion, alertDialog, avatar, button, campo, clear, clipboard, dismiss, invokers, medidas, menu, opcion, overlays, progress, scrollspy, segmented, sidebar, spotlight, tabs, toast: fichaToast, toggle };

const POR_GANCHO = PESADOS.map(({ modulo, raices }: { modulo: NombreModulo; raices: readonly string[] }) => ({ archivo: archivoDe(modulo), selector: raices.map((r) => `[${r}]`).join(',') }));

const apis: Record<string, (...args: never[]) => void> = {};
const cargas = new Map<string, Promise<void>>();
const cargados = new Set<string>();
const fallidos = new Set<string>();
let entregando = false;
const colas = new Map<string, [string, unknown[]][]>();
let ultimoClick: { destino: Element; archivos: string[]; root: Document | HTMLElement } | null = null;
let raizDelClick: Document | HTMLElement | null = null;
const vigiladas = new WeakSet<EventTarget>();

cargador.diferirClick = (destino) => {
    if (entregando) return false;
    const esperan = POR_GANCHO.filter(({ archivo, selector }) => !cargados.has(archivo) && cargas.has(archivo) && destino.closest(selector)).map(({ archivo }) => archivo);
    if (!esperan.length || !raizDelClick) return false;
    ultimoClick = { destino, archivos: esperan, root: raizDelClick };
    return true;
};

function cargar(archivo: string): Promise<void> {
    let carga = cargas.get(archivo);
    if (!carga) {
        carga = IMPORTAR[archivo]().then(
            (modulo) => {
                Object.assign(m, modulo.modulos);
                Object.assign(apis, modulo.api);
                cargados.add(archivo);
                fallidos.delete(archivo);
                for (const [nombre, args] of colas.get(archivo) ?? []) (apis[nombre] as (...a: unknown[]) => void)(...args);
                colas.delete(archivo);
                entregarClick();
            },
            (error) => {
                cargas.delete(archivo);
                fallidos.add(archivo);
                console.error(`[taisho] no se pudo cargar el módulo "${archivo}" del Core:`, error);
                if (ultimoClick?.archivos.includes(archivo)) entregarClick(true);
            },
        );
        cargas.set(archivo, carga);
    }
    return carga;
}

function pedidos(nodo: Element | Document): string[] {
    return POR_GANCHO.filter(({ archivo, selector }) => !cargados.has(archivo) && ((nodo as Element).matches?.(selector) || nodo.querySelector(selector))).map(({ archivo }) => archivo);
}

function entregarClick(aunqueFalten = false): void {
    if (!ultimoClick || (!aunqueFalten && !ultimoClick.archivos.every((a) => cargados.has(a)))) return;
    const { destino, root } = ultimoClick;
    ultimoClick = null;
    iniciar(root);
    entregando = true;
    try {
        alClick({ target: destino } as unknown as Event);
    } finally {
        entregando = false;
    }
}

function cargarDe(nodo: Element | Document, root: Document | HTMLElement): Promise<void> {
    const archivos = pedidos(nodo);
    if (!archivos.length) return Promise.resolve();
    return Promise.all(archivos.map(cargar)).then(() => {
        iniciar(root);
    });
}

function vigilar(root: Document | HTMLElement): void {
    if (vigiladas.has(root)) return;
    vigiladas.add(root);
    root.addEventListener(
        'click',
        (e) => {
            const destino = e.target as Element | null;
            if (!destino?.closest) return;
            raizDelClick = root;
            for (const archivo of fallidos) void cargar(archivo).then(() => iniciar(root));
        },
        true,
    );
    if (typeof MutationObserver === 'undefined') return;
    const observador = new MutationObserver((cambios) => {
        const tardios: Promise<void>[] = [];
        for (const cambio of cambios) {
            for (const nodo of cambio.addedNodes) if (nodo.nodeType === 1) tardios.push(cargarDe(nodo as Element, root));
        }
        if (POR_GANCHO.every(({ archivo }) => cargados.has(archivo))) observador.disconnect();
        void Promise.all(tardios);
    });
    observador.observe(root, { childList: true, subtree: true });
}

/**
 * Cablea el comportamiento del Core. Idempotente: llamarla de nuevo sobre la misma raíz no hace nada. `root` sirve para acotarla
 * a un shadow root o a un contenedor. La promesa se cumple cuando los módulos que la página necesita ya cargaron y pintaron.
 */
export function init(root: Document | HTMLElement = document): Promise<void> {
    Object.assign(m, LIVIANOS);
    pedirAvisoVersiones(() => import('./pesados/key-warning'));
    if (root.getRootNode() === document) pedirAvisoLlave(() => import('./pesados/key-warning'));
    iniciar(root);
    vigilar(root);
    return cargarDe(root, root);
}

function aPedido<F extends (...args: never[]) => void>(archivo: string, nombre: string): F {
    return ((...args: unknown[]) => {
        const real = apis[nombre] as ((...a: unknown[]) => void) | undefined;
        if (real) return real(...args);
        const cola = colas.get(archivo) ?? [];
        cola.push([nombre, args]);
        colas.set(archivo, cola);
        void cargar(archivo);
    }) as unknown as F;
}

/** Marca el Button como cargando o no (`is-loading`, `aria-busy`, `aria-disabled` y «Cargando» para el lector de pantalla). Sigue enfocable, pero no se activa. */
export const setButtonLoading = cargandoBoton;

/** Marca el Input como cargando o no (`is-loading`, `aria-busy`, Spinner). No bloquea la edición. */
export const setInputLoading = cargandoCampo;

/** Marca el Textarea como cargando o no (`is-loading`, `aria-busy`, Spinner). No bloquea la edición. */
export const setTextareaLoading = cargandoCampo;

/** Marca el Combobox como cargando o no: Spinner en el campo, `aria-busy` y «Cargando…» en el panel. No bloquea la edición. */
export const setComboboxLoading = aPedido<typeof cargandoSelect>('select', 'setComboboxLoading');

/** Marca el Select como cargando o no: Spinner en el campo, `aria-busy` y «Cargando…» en el panel. No bloquea la edición. */
export const setSelectLoading = aPedido<typeof cargandoSelect>('select', 'setSelectLoading');

/** Marca el NumberInput como cargando o no (`is-loading`, `aria-busy`, Spinner). No bloquea la edición. */
export const setNumberInputLoading = aPedido<typeof cargandoNumero>('number-input', 'setNumberInputLoading');

/** Marca el DatePicker como cargando o no: Spinner en el campo y `aria-busy` en el disparador y la grilla. No bloquea. */
export const setDatePickerLoading = aPedido<typeof cargandoFecha>('date-picker', 'setDatePickerLoading');

/** Registra (o con `null`, quita) una función que dice qué días no están disponibles (`true` = no disponible) en un DatePicker. */
export const setDatePickerDisabledDate = aPedido<typeof deshabilitarFecha>('date-picker', 'setDatePickerDisabledDate');

/** Marca un campo como inválido y muestra el mensaje debajo. */
export const markInvalid = aPedido<typeof markInvalidTipo>('invalid', 'markInvalid');

/** Saca el error de un campo y devuelve la ayuda que tenía antes. */
export const clearInvalid = aPedido<typeof clearInvalidTipo>('invalid', 'clearInvalid');

