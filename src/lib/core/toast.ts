// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { iniciar, restante, pausar, reanudar, estaPausado, type Reloj } from './logica/toast';
import { P, claseDS } from './dom';
import { textoDe } from './textos';

const TEXTOS = {
    es: { closeNotification: 'Cerrar notificación' },
    en: { closeNotification: 'Close notification' },
};

export type ToastVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface ToastOptions {
    variant?: ToastVariant;
    /** Milisegundos hasta que se va solo. `0` = queda hasta que lo cierren. */
    duration?: number;
    /**
     * Texto del botón de cerrar, para el lector de pantalla. Sin él, el `data-ts-toast-dismiss-label`
     * del contenedor o el texto `closeNotification` del idioma de la página (ver `setTexts`).
     */
    dismissLabel?: string;
    /** Botón con label y callback (p. ej. «Deshacer»). Al usarlo se ejecuta `onclick` y el aviso se cierra. */
    action?: ToastAction;
    /** Detalle bajo el título. */
    description?: string;
    /** Muestra el spinner en lugar del ícono de la variante y marca el aviso `aria-busy` (lo usa `toast.promise`). */
    loading?: boolean;
}

export interface ToastAction {
    label: string;
    onclick: () => void;
}

/** Lo que se puede cambiar en un aviso ya mostrado. `action: undefined` lo quita. */
export interface ToastChanges {
    message?: string;
    variant?: ToastVariant;
    duration?: number;
    action?: ToastAction;
    /** Detalle bajo el título. `''` lo quita. */
    description?: string;
    loading?: boolean;
}

/** Mensajes de `toast.promise`: carga, y éxito o error (texto, o función de lo que resolvió/rechazó la promesa). */
export interface ToastPromiseMessages<T> {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
}

const DURACION_MS = 4000;

const avisos = new Map<HTMLElement, { reloj: Reloj; handle?: ReturnType<typeof setTimeout> }>();
const duraciones = new WeakMap<HTMLElement, number>();
const pausa = { puntero: false, foco: false };
let contador = 0;

const pausado = () => estaPausado(pausa.puntero, pausa.foco);

function armar(el: HTMLElement): void {
    const a = avisos.get(el);
    if (!a) return;
    clearTimeout(a.handle);
    a.handle = setTimeout(() => quitar(el), restante(a.reloj, Date.now()));
}

function programar(el: HTMLElement, duration: number): void {
    clearTimeout(avisos.get(el)?.handle);
    avisos.delete(el);
    duraciones.set(el, duration);
    if (duration <= 0) return;
    const ahora = Date.now();
    const reloj = iniciar(duration, ahora);
    avisos.set(el, { reloj: pausado() ? pausar(reloj, ahora) : reloj });
    if (!pausado()) armar(el);
}

function ponerPausa(fuente: 'puntero' | 'foco', activa: boolean): void {
    const antes = pausado();
    pausa[fuente] = activa;
    if (pausado() === antes) return;
    for (const [el, a] of avisos) {
        clearTimeout(a.handle);
        a.reloj = pausado() ? pausar(a.reloj, Date.now()) : reanudar(a.reloj, Date.now());
        if (!pausado()) armar(el);
    }
}

function quitar(el: HTMLElement): void {
    clearTimeout(avisos.get(el)?.handle);
    avisos.delete(el);
    el.remove();
    if (!document.querySelector(`[${P}toast]:not([hidden])`)) {
        ponerPausa('puntero', false);
        ponerPausa('foco', false);
    }
}

const cableados = new WeakSet<HTMLElement>();

function alFrente(caja: HTMLElement): void {
    if (typeof caja.showPopover !== 'function') return;
    const modal = [...document.querySelectorAll<HTMLElement>('dialog[open]')].filter((d) => {
        try { return d.matches(':modal'); } catch { return false; }
    }).pop();
    const destino = modal ?? document.body;
    if (caja.parentElement === destino && caja.contains(document.activeElement)) return;
    try {
        if (caja.parentElement !== destino) destino.appendChild(caja);
        caja.hidePopover();
        caja.showPopover();
    } catch { }
}

function cablear(el: HTMLElement): HTMLElement {
    if (cableados.has(el)) return el;
    cableados.add(el);
    if (!el.hasAttribute('popover')) el.setAttribute('popover', 'manual');
    document.addEventListener('close', (e) => {
        if (e.target instanceof HTMLDialogElement && e.target.contains(el)) alFrente(el);
    }, true);
    el.addEventListener('pointerenter', () => ponerPausa('puntero', true));
    el.addEventListener('pointerleave', () => ponerPausa('puntero', false));
    el.addEventListener('focusin', () => ponerPausa('foco', true));
    el.addEventListener('focusout', (e) => {
        if (!el.contains(e.relatedTarget as Node | null)) ponerPausa('foco', false);
    });
    return el;
}

/** Selector de los contenedores de avisos escritos en el marcado. */
export const CONTENEDOR = `[${P}toast-container]`;

/**
 * Las regiones vivas son dos hermanas dentro del contenedor, que no es una región él mismo: una cortés
 * (`status`) y una asertiva (`alert`, para `danger`). Los avisos no llevan rol propio, así que no hay
 * regiones anidadas, y las dos existen antes del primer aviso (una región creada junto con su mensaje
 * no se anuncia de forma fiable).
 */
function region(caja: HTMLElement, asertiva: boolean): HTMLElement {
    const tipo = asertiva ? 'assertive' : 'polite';
    const hecha = caja.querySelector<HTMLElement>(`:scope > [${P}toast-region="${tipo}"]`);
    if (hecha) return hecha;
    const el = document.createElement('div');
    el.setAttribute(`${P}toast-region`, tipo);
    el.setAttribute('role', asertiva ? 'alert' : 'status');
    el.setAttribute('aria-live', tipo);
    el.setAttribute('aria-atomic', 'false');
    caja.appendChild(el);
    return el;
}

/** Deja el contenedor listo: con sus dos regiones y sin `aria-live` propio (el de un marcado anterior anidaría). */
export function preparar(caja: HTMLElement): void {
    for (const a of ['aria-live', 'aria-atomic', 'role']) caja.removeAttribute(a);
    region(caja, false);
    region(caja, true);
}

function contenedor(): HTMLElement {
    const existente = document.querySelector<HTMLElement>(CONTENEDOR);
    if (existente) {
        preparar(existente);
        return cablear(existente);
    }

    const el = document.createElement('div');
    el.setAttribute(`${P}toast-container`, '');
    el.className = `${claseDS('toaster')} position-bottom-right`;
    preparar(el);
    document.body.appendChild(el);
    return cablear(el);
}

function ponerIcono(el: HTMLElement, variante: ToastVariant, cargando: boolean): void {
    el.querySelector('[data-toast-icon]')?.remove();
    const clave = cargando ? 'loading' : variante;
    const molde = document.querySelector<HTMLTemplateElement>(`template[${P}toast-icon="${clave}"]`);
    const icono = molde?.content.firstElementChild;
    if (icono) el.insertBefore(icono.cloneNode(true), el.firstChild);
}

function ponerDescripcion(el: HTMLElement, descripcion?: string): void {
    el.querySelector('[data-toast-desc]')?.remove();
    if (!descripcion) return;
    const desc = document.createElement('span');
    desc.setAttribute('data-toast-desc', '');
    desc.textContent = descripcion;
    el.querySelector('[data-toast-body]')?.appendChild(desc);
}

const etiquetasCierre = new WeakMap<HTMLElement, string>();
const ICONO_CERRAR = '<span data-ts-content><svg class="ts icon icon-14" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>';

function ponerCierre(el: HTMLElement, visible: boolean): void {
    el.querySelector(`[${P}dismiss]`)?.remove();
    if (!visible) return;
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'ts button size-xs variant-tertiary shape-square is-icon-only';
    cerrar.setAttribute(`${P}dismiss`, '');
    cerrar.setAttribute('data-toast-close', '');
    cerrar.setAttribute('aria-label', etiquetasCierre.get(el) ?? textoDe(el, TEXTOS, 'closeNotification'));
    cerrar.innerHTML = ICONO_CERRAR;
    el.appendChild(cerrar);
}

function ponerCarga(el: HTMLElement, cargando: boolean, variante: ToastVariant): void {
    if (cargando) el.setAttribute('aria-busy', 'true');
    else el.removeAttribute('aria-busy');
    ponerIcono(el, variante, cargando);
    ponerCierre(el, !cargando);
}

const variantes = new WeakMap<HTMLElement, ToastVariant>();

function ponerAccion(el: HTMLElement, accion?: ToastAction): void {
    el.querySelector(`[${P}toast-action]`)?.remove();
    if (!accion) return;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'ts button size-sm variant-secondary';
    boton.setAttribute(`${P}toast-action`, '');
    boton.setAttribute('data-toast-action', '');
    boton.textContent = accion.label;
    boton.addEventListener('click', () => {
        accion.onclick();
        quitar(el);
    });
    el.insertBefore(boton, el.querySelector(`[${P}dismiss]`));
}

/**
 * Muestra un toast y devuelve el elemento, por si hay que cerrarlo a mano.
 * Su id (para `updateToast`) queda en `data-ts-toast-id`.
 */
export function toast(message: string, options: ToastOptions = {}): HTMLElement {
    const { variant = 'default', duration = DURACION_MS, dismissLabel, action, description, loading = false } = options;
    const caja = contenedor();

    const el = document.createElement('div');
    el.setAttribute(`${P}toast`, '');
    el.setAttribute(`${P}toast-id`, String(++contador));
    el.setAttribute(`${P}dismissible`, '');
    el.className = `${claseDS('toast')} variant-${variant}`;

    const cuerpo = document.createElement('div');
    cuerpo.setAttribute('data-toast-body', '');
    const texto = document.createElement('span');
    texto.setAttribute('data-toast-title', '');
    texto.textContent = message;
    cuerpo.appendChild(texto);
    el.appendChild(cuerpo);
    ponerDescripcion(el, description);

    etiquetasCierre.set(el, dismissLabel ?? caja.getAttribute(`${P}toast-dismiss-label`) ?? textoDe(caja, TEXTOS, 'closeNotification'));
    variantes.set(el, variant);
    ponerCarga(el, loading, variant);

    ponerAccion(el, action);
    region(caja, variant === 'danger').appendChild(el);
    alFrente(caja);
    programar(el, duration);
    return el;
}

/**
 * Cambia el mensaje, la variante o la acción de un toast ya mostrado y le reinicia el
 * temporizador (con `duration` nueva si viene). Acepta el elemento que devolvió `toast()` o
 * su id (`data-ts-toast-id`). Devuelve el elemento, o `null` si ya no existe.
 */
export function updateToast(ref: HTMLElement | string, changes: ToastChanges): HTMLElement | null {
    const el = typeof ref === 'string'
        ? document.querySelector<HTMLElement>(`[${P}toast-id="${CSS.escape(ref)}"]`)
        : ref;
    if (!el?.isConnected) return null;
    if (changes.message !== undefined) el.querySelector('[data-toast-title]')!.textContent = changes.message;
    if ('description' in changes) ponerDescripcion(el, changes.description);
    if (changes.variant) {
        el.className = `${claseDS('toast')} variant-${changes.variant}`;
        variantes.set(el, changes.variant);
        // Pasar a `danger` (o dejarlo) lo muda a la región que corresponde: ahí se anuncia con la urgencia nueva.
        const caja = el.closest<HTMLElement>(`[${P}toast-container]`);
        if (caja) {
            const destino = region(caja, changes.variant === 'danger');
            if (el.parentElement !== destino) destino.appendChild(el);
        }
    }
    if (changes.variant || changes.loading !== undefined) {
        const cargando = changes.loading ?? el.hasAttribute('aria-busy');
        ponerCarga(el, cargando, variantes.get(el) ?? 'default');
    }
    if ('action' in changes) ponerAccion(el, changes.action);
    programar(el, changes.duration ?? duraciones.get(el) ?? DURACION_MS);
    return el;
}

toast.promise = <T>(promise: Promise<T>, messages: ToastPromiseMessages<T>): HTMLElement => {
    const el = toast(messages.loading, { loading: true, duration: 0 });
    const listo = (variant: ToastVariant, message: string) =>
        updateToast(el, { message, variant, loading: false, duration: DURACION_MS });
    promise.then(
        (datos) => listo('success', typeof messages.success === 'function' ? messages.success(datos) : messages.success),
        (error) => listo('danger', typeof messages.error === 'function' ? messages.error(error) : messages.error),
    );
    return el;
};

export function alHacerClick(destino: Element): boolean {
    const boton = destino.closest<HTMLElement>(`[${P}toast-trigger]`);
    const mensaje = boton?.getAttribute(`${P}toast-trigger`);
    if (!boton || !mensaje) return false;
    toast(mensaje, { variant: (boton.getAttribute(`${P}toast-variant`) ?? 'default') as ToastVariant });
    return true;
}

/** Cierra todos los toasts visibles. */
export function clearToasts(): void {
    for (const a of avisos.values()) clearTimeout(a.handle);
    avisos.clear();
    pausa.puntero = false;
    pausa.foco = false;
    document.querySelectorAll(`[${P}toast-container] [${P}toast]`).forEach((a) => a.remove());
}

export const ficha = {
    alHacerClick,
    preparar,
    CONTENEDOR,
};
