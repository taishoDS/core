// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { filterOptions, getDisplayLabel, toggleValue } from './logica/select';
import { showClearButton } from './logica/input';
import { resolveCommit, groupsWithMatches, panelIndicators, comboboxKeyAction, initialActiveIndex, keepsInputFocus, BLUR_COMMIT_MS, resolveMultipleCommit, removesLastOnBackspace, TAG_LABEL_PLACEHOLDER } from './logica/combobox';
import { focusTargetAfterDismiss } from './logica/tag';
import { P, avisar } from './dom';
import { textoDe } from './textos';

const TEXTOS = {
    es: { selectedCount: 'seleccionados' },
    en: { selectedCount: 'selected' },
};
import * as lb from './listbox';

const raizDe = (el: Element) => el.closest<HTMLElement>(`[${P}listbox]`);
const esCombobox = (raiz: HTMLElement) => raiz.hasAttribute(`${P}combobox`);
const esPaleta = (raiz: HTMLElement) => raiz.getAttribute(`${P}listbox`) === 'command';

function pintarEtiqueta(raiz: HTMLElement): void {
    const etiqueta = raiz.querySelector<HTMLElement>(`[${P}listbox-label]`);
    const panel = lb.panelDe(raiz);
    if (!etiqueta || !panel) return;
    const opciones = [...panel.querySelectorAll<HTMLElement>('[role="option"]')].map((o) => ({
        value: o.getAttribute(`${P}value`) ?? '',
        label: lb.etiquetaDe(o),
        elegida: o.getAttribute('aria-selected') === 'true',
    }));
    const elegidas = opciones.filter((o) => o.elegida).map((o) => o.value);
    etiqueta.textContent = getDisplayLabel(
        opciones,
        elegidas,
        etiqueta.getAttribute(`${P}placeholder`) ?? '',
        raiz.hasAttribute(`${P}multiple`),
        etiqueta.getAttribute(`${P}count-suffix`) ?? textoDe(raiz, TEXTOS, 'selectedCount'),
    );
    lb.disparador(raiz)?.classList.toggle('is-placeholder', elegidas.length === 0);
}

function nombreDeGrupo(grupo: HTMLElement): string {
    const id = grupo.getAttribute('aria-labelledby');
    const titulo = id ? grupo.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null;
    return (titulo?.textContent ?? '').trim();
}

const cargandoAhora = (raiz: HTMLElement) => lb.disparador(raiz)?.getAttribute('aria-busy') === 'true';

const soloLectura = (disp: HTMLElement | null) =>
    !!disp && ((disp as HTMLInputElement).readOnly || disp.getAttribute('aria-readonly') === 'true');

function sincronizarIndicadores(raiz: HTMLElement): void {
    const panel = lb.panelDe(raiz);
    if (!panel) return;
    const ind = panelIndicators(lb.opciones(panel).length, cargandoAhora(raiz));
    const carga = raiz.querySelector<HTMLElement>(`[${P}listbox-loading]`);
    const vacio = raiz.querySelector<HTMLElement>(`[${P}listbox-empty]`);
    if (carga) carga.hidden = !ind.loading;
    if (vacio) vacio.hidden = !ind.empty;
}

/**
 * Marca el Select o el Combobox como cargando o no: Spinner en el campo, `aria-busy` en el disparador y en el panel,
 * "Cargando…" en el panel y sin "Sin resultados" mientras dura. No bloquea la edición. La app lo llama al oír un `ts:change` con
 * `query` (empieza la búsqueda) y otra vez al terminar de reemplazar las opciones.
 */
export function cargando(root: HTMLElement, loading: boolean): void {
    const panel = lb.panelDe(root);
    const disp = lb.disparador(root);
    if (!panel || !disp) return;
    if (loading) {
        disp.setAttribute('aria-busy', 'true');
        panel.setAttribute('aria-busy', 'true');
    } else {
        disp.removeAttribute('aria-busy');
        panel.removeAttribute('aria-busy');
    }
    disp.parentElement?.classList.toggle('is-loading', loading);
    const spinner = root.querySelector<HTMLElement>(`[${P}listbox-spinner]`);
    if (spinner) spinner.hidden = !loading;
    sincronizarIndicadores(root);
}

function filtrar(raiz: HTMLElement, termino: string): void {
    const panel = lb.panelDe(raiz);
    if (!panel) return;
    const todas = [...panel.querySelectorAll<HTMLElement>('[role="option"]')];
    const opciones = todas.map((o) => {
        const grupo = o.closest<HTMLElement>('[role="group"]');
        return {
            value: o.getAttribute(`${P}value`) ?? '',
            label: lb.etiquetaDe(o),
            group: grupo ? nombreDeGrupo(grupo) : undefined,
        };
    });
    const asincrono = raiz.hasAttribute(`${P}async`);
    const visibles = new Set((asincrono ? opciones : filterOptions(opciones, termino)).map((o) => o.value));
    for (const o of todas) o.hidden = !visibles.has(o.getAttribute(`${P}value`) ?? '');

    const conCoincidencias = groupsWithMatches(opciones, asincrono ? '' : termino);
    for (const g of panel.querySelectorAll<HTMLElement>('[role="group"]')) {
        g.hidden = !conCoincidencias.has(nombreDeGrupo(g));
    }

    sincronizarIndicadores(raiz);
    lb.activar(raiz, lb.opciones(panel)[0] ?? null);
}

function elegir(raiz: HTMLElement, opcion: HTMLElement, enfocar = true): void {
    if (esMultiple(raiz)) return elegirMultiple(raiz, opcion, enfocar);
    const multiple = raiz.hasAttribute(`${P}multiple`);
    lb.seleccionar(raiz, opcion, multiple);
    pintarEtiqueta(raiz);
    sincronizarLimpiar(raiz);
    if (esCombobox(raiz)) {
        const input = raiz.querySelector<HTMLInputElement>(`[${P}listbox-input]`);
        if (input) input.value = lb.etiquetaDe(opcion);
    }
    if (!multiple) {
        if (enfocar) lb.disparador(raiz)?.focus();
        lb.abrir(raiz, false);
    }
}

const esMultiple = (raiz: HTMLElement) => esCombobox(raiz) && raiz.hasAttribute(`${P}multiple`);
const zonaEtiquetas = (raiz: HTMLElement) => raiz.querySelector<HTMLElement>(`[${P}listbox-tags]`);
const etiquetas = (raiz: HTMLElement) => [...(zonaEtiquetas(raiz)?.querySelectorAll<HTMLElement>(`:scope > [${P}value]`) ?? [])];
const valorDe = (el: HTMLElement) => el.getAttribute(`${P}value`) ?? '';
const valoresElegidos = (raiz: HTMLElement) => etiquetas(raiz).map(valorDe);

const iniciales = new WeakMap<HTMLElement, HTMLElement[]>();
function recordarIniciales(raiz: HTMLElement): void {
    if (!iniciales.has(raiz)) iniciales.set(raiz, etiquetas(raiz).map((e) => e.cloneNode(true) as HTMLElement));
}

function crearEtiqueta(raiz: HTMLElement, valor: string, texto: string): HTMLElement | null {
    const molde = raiz.querySelector<HTMLTemplateElement>(`[${P}listbox-tag-template]`);
    const nodo = molde?.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
    if (!nodo) return null;
    nodo.setAttribute(`${P}value`, valor);
    const rotulo = nodo.querySelector('[data-tag-label]');
    if (rotulo) rotulo.textContent = texto;
    const quitar = nodo.querySelector('[data-tag-close]');
    quitar?.setAttribute('aria-label', (quitar.getAttribute('aria-label') ?? '').replace(TAG_LABEL_PLACEHOLDER, texto));
    return nodo;
}

function anunciar(raiz: HTMLElement, clave: 'added' | 'removed' | 'cleared', texto = ''): void {
    const vivo = raiz.querySelector<HTMLElement>(`[${P}listbox-live]`);
    if (vivo) vivo.textContent = (vivo.getAttribute(`${P}${clave}-text`) ?? '').replace(TAG_LABEL_PLACEHOLDER, texto);
}

function sincronizarMultiple(raiz: HTMLElement): void {
    sincronizarLimpiar(raiz);
    const input = inputDe(raiz);
    if (!input) return;
    const vacio = etiquetas(raiz).length === 0;
    input.required = input.getAttribute('aria-required') === 'true' && vacio;
    input.placeholder = vacio ? (input.getAttribute(`${P}placeholder`) ?? '') : '';
}

function alternar(raiz: HTMLElement, valor: string, texto: string): boolean {
    recordarIniciales(raiz);
    if (!lb.fijarSeleccion(raiz, valor, toggleValue(valoresElegidos(raiz), valor))) return false;
    const existente = etiquetas(raiz).find((e) => valorDe(e) === valor);
    if (existente) {
        anunciar(raiz, 'removed', existente.querySelector('[data-tag-label]')?.textContent?.trim() ?? texto);
        existente.remove();
    } else {
        const nueva = crearEtiqueta(raiz, valor, texto);
        if (nueva) inputDe(raiz)?.before(nueva);
        anunciar(raiz, 'added', texto);
    }
    sincronizarMultiple(raiz);
    return true;
}

function vaciarBusqueda(raiz: HTMLElement): void {
    const input = inputDe(raiz);
    if (!input) return;
    const habiaTexto = input.value !== '';
    input.value = '';
    filtrar(raiz, '');
    if (habiaTexto) avisar(raiz, { component: 'combobox', query: '' });
}

function elegirMultiple(raiz: HTMLElement, opcion: HTMLElement, enfocar: boolean): void {
    if (!alternar(raiz, valorDe(opcion), lb.etiquetaDe(opcion))) return;
    vaciarBusqueda(raiz);
    lb.activar(raiz, opcion);
    if (enfocar) inputDe(raiz)?.focus();
}

function confirmarMultiple(raiz: HTMLElement, mantenerAbierto: boolean): void {
    const panel = lb.panelDe(raiz);
    const input = inputDe(raiz);
    if (!panel || !input) return;
    const datos = datosDe(panel);
    const valor = resolveMultipleCommit(datos, input.value, textoLibre(raiz), valoresElegidos(raiz));
    if (valor !== null) alternar(raiz, valor, datos.find((o) => o.value === valor)?.label ?? valor);
    vaciarBusqueda(raiz);
    if (!mantenerAbierto) lb.abrir(raiz, false);
}

function quitarEtiqueta(raiz: HTMLElement, etiqueta: HTMLElement): void {
    const input = inputDe(raiz);
    if (!input || input.disabled || input.readOnly) return;
    const conFoco = etiqueta.contains(document.activeElement);
    const destino = conFoco ? (focusTargetAfterDismiss(etiqueta) ?? input) : null;
    if (alternar(raiz, valorDe(etiqueta), '')) destino?.focus();
}

export function alQuitarEtiqueta(destino: Element): boolean {
    const boton = destino.closest<HTMLElement>(`[${P}listbox-tags] [${P}dismiss]`);
    const raiz = boton && raizDe(boton);
    const etiqueta = boton?.closest<HTMLElement>(`[${P}value]`);
    if (!raiz || !etiqueta) return false;
    quitarEtiqueta(raiz, etiqueta);
    return true;
}

const textoLibre = (raiz: HTMLElement) => raiz.hasAttribute(`${P}allow-custom`);
const inputDe = (raiz: HTMLElement) => raiz.querySelector<HTMLInputElement>(`[${P}listbox-input]`);
const datosDe = (panel: HTMLElement) =>
    [...panel.querySelectorAll<HTMLElement>('[role="option"]')].map((o) => ({
        value: o.getAttribute(`${P}value`) ?? '',
        label: lb.etiquetaDe(o),
    }));

function revertir(raiz: HTMLElement, enfocar = true): void {
    const panel = lb.panelDe(raiz);
    const input = inputDe(raiz);
    if (!panel || !input) return;
    if (esMultiple(raiz)) {
        vaciarBusqueda(raiz);
        if (enfocar) input.focus();
        return lb.abrir(raiz, false);
    }
    const sel = panel.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    input.value = sel ? lb.etiquetaDe(sel) : '';
    if (enfocar) input.focus();
    lb.abrir(raiz, false);
}

function confirmarTexto(raiz: HTMLElement): void {
    if (esMultiple(raiz)) return confirmarMultiple(raiz, false);
    const panel = lb.panelDe(raiz);
    const input = inputDe(raiz);
    if (!panel || !input) return;
    const valor = resolveCommit(datosDe(panel), input.value, textoLibre(raiz));
    if (valor === null) return revertir(raiz, false);
    if (valor === '') {
        lb.limpiar(raiz);
        input.value = '';
        sincronizarLimpiar(raiz);
        return lb.abrir(raiz, false);
    }
    const opcion = [...panel.querySelectorAll<HTMLElement>('[role="option"]')].find(
        (o) => o.getAttribute(`${P}value`) === valor,
    );
    if (opcion) return elegir(raiz, opcion, false);
    lb.fijarValor(raiz, valor);
    input.value = valor;
    sincronizarLimpiar(raiz);
    lb.abrir(raiz, false);
}

function abrirTodo(raiz: HTMLElement): void {
    const panel = lb.panelDe(raiz);
    if (!panel || lb.estaAbierto(raiz) || inputDe(raiz)?.readOnly) return;
    lb.abrir(raiz, true);
    filtrar(raiz, '');
    const ops = lb.opciones(panel);
    const elegida = panel.querySelector('[role="option"][aria-selected="true"]')?.getAttribute(`${P}value`) ?? '';
    const valores = ops.map((o) => o.getAttribute(`${P}value`) ?? '');
    lb.activar(raiz, ops[initialActiveIndex(valores, elegida)] ?? null);
}

export function alEnfocar(destino: Element): void {
    const raiz = raizDe(destino);
    const input = raiz && esCombobox(raiz) ? inputDe(raiz) : null;
    if (!raiz || input !== destino) return;
    abrirTodo(raiz);
    input.select();
}

export function alDesenfocar(destino: Element): void {
    const raiz = raizDe(destino);
    if (!raiz || !esCombobox(raiz) || inputDe(raiz) !== destino) return;
    setTimeout(() => lb.estaAbierto(raiz) && !(esMultiple(raiz) && document.activeElement === destino) && confirmarTexto(raiz), BLUR_COMMIT_MS);
}

export function alPresionarOpcion(destino: Element, tipo: string): boolean {
    const raiz = raizDe(destino);
    return (
        !!raiz &&
        (esCombobox(raiz) || esPaleta(raiz)) &&
        keepsInputFocus(tipo) &&
        !!destino.closest(`[role="option"], [${P}clear], [${P}listbox-toggle], [${P}listbox-tags] [${P}dismissible]`)
    );
}

export function sincronizarLimpiar(raiz: HTMLElement): void {
    const boton = raiz.querySelector<HTMLElement>(`[${P}clear]`);
    const panel = lb.panelDe(raiz);
    if (!boton || !panel) return;
    const disp = lb.disparador(raiz) as HTMLInputElement | null;
    const hay = esMultiple(raiz) ? etiquetas(raiz).length > 0 : !!panel.querySelector('[role="option"][aria-selected="true"]');
    boton.hidden = !showClearButton(hay, !!disp?.disabled, soloLectura(disp));
}

export function preparar(raiz: HTMLElement): void {
    const nativo = raiz.querySelector(`[${P}listbox-native]`);
    if (!nativo) return;
    nativo.remove();
    const disp = lb.disparador(raiz);
    if (disp) disp.hidden = false;
    lb.sincronizarEnvio(raiz);
    sincronizarLimpiar(raiz);
}

export function limpiar(raiz: HTMLElement): void {
    const disp = lb.disparador(raiz) as HTMLInputElement | null;
    if (disp?.disabled || soloLectura(disp)) return;
    if (esMultiple(raiz)) {
        recordarIniciales(raiz);
        if (!lb.limpiar(raiz)) return;
        for (const e of etiquetas(raiz)) e.remove();
        anunciar(raiz, 'cleared');
        sincronizarMultiple(raiz);
        vaciarBusqueda(raiz);
        disp?.focus();
        return lb.abrir(raiz, false);
    }
    lb.limpiar(raiz);
    if (esCombobox(raiz) && disp) disp.value = '';
    pintarEtiqueta(raiz);
    sincronizarLimpiar(raiz);
    disp?.focus();
    lb.abrir(raiz, false);
}

function restablecer(raiz: HTMLElement): void {
    const panel = lb.panelDe(raiz);
    const input = inputDe(raiz);
    if (!panel || !input) return;
    if (esMultiple(raiz)) {
        const copia = iniciales.get(raiz);
        if (copia) {
            for (const e of etiquetas(raiz)) e.remove();
            for (const e of copia) input.before(e.cloneNode(true));
            lb.restaurar(raiz, copia.map(valorDe));
        }
        input.value = '';
        const vivo = raiz.querySelector(`[${P}listbox-live]`);
        if (vivo) vivo.textContent = '';
        sincronizarMultiple(raiz);
        if (raiz.hasAttribute(`${P}async`)) avisar(raiz, { component: 'combobox', query: '' });
        return lb.abrir(raiz, false);
    }
    const datos = datosDe(panel);
    const valor = resolveCommit(datos, input.value, textoLibre(raiz)) ?? '';
    lb.restaurar(raiz, valor);
    input.value = datos.find((o) => o.value === valor)?.label ?? (textoLibre(raiz) ? valor : '');
    sincronizarLimpiar(raiz);
    lb.abrir(raiz, false);
}

function restablecerSelect(raiz: HTMLElement): void {
    lb.restaurarInicial(raiz);
    pintarEtiqueta(raiz);
    sincronizarLimpiar(raiz);
    lb.abrir(raiz, false);
}

export function alRestablecer(e: Event): void {
    const form = e.target as Element;
    setTimeout(() => {
        if (e.defaultPrevented) return;
        for (const raiz of form.querySelectorAll<HTMLElement>(`[${P}listbox]`)) {
            if (esCombobox(raiz)) restablecer(raiz);
            else if (!esPaleta(raiz)) restablecerSelect(raiz);
        }
    }, 0);
}

export function alHacerClick(destino: Element): boolean {
    const raiz = raizDe(destino);
    if (!raiz) return false;

    const opcion = destino.closest<HTMLElement>('[role="option"]');
    if (opcion && opcion.getAttribute('aria-disabled') !== 'true') {
        elegir(raiz, opcion);
        return true;
    }
    if (destino.closest(`[${P}listbox-toggle]`)) {
        const input = inputDe(raiz);
        if (!input || input.readOnly) return true;
        if (lb.estaAbierto(raiz)) revertir(raiz);
        else {
            input.focus();
            abrirTodo(raiz);
        }
        return true;
    }
    if (destino.closest(`[${P}listbox-trigger]`)) {
        if (soloLectura(lb.disparador(raiz))) return true;
        const abrir = !lb.estaAbierto(raiz);
        lb.abrir(raiz, abrir);
        if (abrir) lb.disparador(raiz)?.focus();
        return true;
    }
    return false;
}

export function alHacerClickAfuera(destino: Element): void {
    const propio = raizDe(destino);
    for (const raiz of document.querySelectorAll<HTMLElement>(`[${P}listbox]`)) {
        if (raiz.getAttribute(`${P}listbox`) === 'command') continue;
        if (raiz === propio || !lb.estaAbierto(raiz)) continue;
        if (esCombobox(raiz)) confirmarTexto(raiz);
        else lb.abrir(raiz, false);
    }
}

function teclaCombobox(raiz: HTMLElement, tecla: string, abierto: boolean): boolean {
    const panel = lb.panelDe(raiz);
    const activa = panel ? lb.activa(raiz, panel) : null;
    const multiple = esMultiple(raiz);
    const texto = inputDe(raiz)?.value ?? '';
    if (multiple && removesLastOnBackspace(tecla, texto, etiquetas(raiz).length, inputDe(raiz)?.readOnly)) {
        quitarEtiqueta(raiz, etiquetas(raiz).at(-1)!);
        return true;
    }
    switch (comboboxKeyAction(tecla, abierto, !!activa, inputDe(raiz)?.readOnly)) {
        case 'open':
            abrirTodo(raiz);
            return true;
        case 'next':
        case 'prev':
            lb.navegar(raiz, tecla);
            return true;
        case 'choose':
            elegir(raiz, activa!);
            return true;
        case 'revert':
            revertir(raiz);
            return true;
        case 'commit':
            if (multiple && tecla === 'Enter' && texto.trim()) {
                confirmarMultiple(raiz, true);
                return true;
            }
            confirmarTexto(raiz);
    }
    return false;
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    const raiz = raizDe(destino);
    if (!raiz) return false;
    if (esPaleta(raiz)) return false;
    const abierto = lb.estaAbierto(raiz);
    if (esMultiple(raiz) && destino !== inputDe(raiz)) return false;
    if (esCombobox(raiz)) return teclaCombobox(raiz, tecla, abierto);

    if (soloLectura(lb.disparador(raiz))) return false;

    if (tecla === 'Tab') {
        if (abierto) lb.abrir(raiz, false);
        return false;
    }
    if (tecla === 'Escape') {
        if (!abierto) return false;
        lb.abrir(raiz, false);
        lb.disparador(raiz)?.focus();
        return true;
    }
    if (!abierto && (tecla === 'ArrowDown' || tecla === 'ArrowUp' || tecla === 'Enter')) {
        lb.abrir(raiz, true);
        return true;
    }
    if (!abierto) return false;

    if (tecla === 'Enter' || tecla === ' ') {
        const panel = lb.panelDe(raiz);
        const op = panel ? lb.activa(raiz, panel) : null;
        if (op) elegir(raiz, op);
        return true;
    }
    if (lb.navegar(raiz, tecla)) return true;
    return lb.tipear(raiz, tecla);
}

export function alEscribir(destino: Element): boolean {
    if (!(destino instanceof HTMLInputElement) || !destino.hasAttribute(`${P}listbox-input`)) {
        return false;
    }
    const raiz = raizDe(destino);
    if (!raiz) return false;
    if (!lb.estaAbierto(raiz)) lb.abrir(raiz, true);
    // Frenado, el filtrado queda a cargo del código (una búsqueda propia o en el servidor).
    if (avisar(raiz, { component: 'combobox', query: destino.value })) filtrar(raiz, destino.value);
    return true;
}

export const ficha = {
    alDesenfocar,
    alEnfocar,
    alEscribir,
    alHacerClick,
    alHacerClickAfuera,
    alPresionarOpcion,
    alPresionarTecla,
    alQuitarEtiqueta,
    alRestablecer,
    limpiar,
    preparar,
    sincronizarLimpiar,
};
