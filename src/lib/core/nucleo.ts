// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { m, cargador } from './registro';
import { alEnfocarRequerido, cursorAlFinal } from './dom';
import { esDesarrolloLocal } from './desarrollo-local';

const inicializadas = new WeakSet<EventTarget>();
let escapeGlobal = false;

function alEscapeGlobal(e: KeyboardEvent): void {
    if (e.key === 'Escape' && m.overlays?.alPresionarTecla(document.body, e.key)) {
        e.preventDefault();
        e.stopPropagation();
    }
}

function sincronizarEnvios(root: Document | HTMLElement): void {
    for (const l of root.querySelectorAll<HTMLElement>('[data-ts-listbox]')) m.listbox?.sincronizarEnvio(l);
    for (const d of root.querySelectorAll<HTMLElement>('[data-ts-date-picker]')) m.datePicker?.sincronizarEnvio(d);
    for (const n of root.querySelectorAll<HTMLElement>('[data-ts-number]')) m.numberInput?.sincronizarEnvio(n);
}

function prepararDeRespaldo(root: Document | HTMLElement): void {
    for (const el of root.querySelectorAll<HTMLElement>('[data-ts-tabs]')) m.tabs?.preparar(el);
    for (const el of root.querySelectorAll<HTMLElement>('[data-ts-accordion]')) m.accordion?.preparar(el);
    for (const el of root.querySelectorAll<HTMLElement>('[data-ts-menu]')) m.menu?.preparar(el);
    for (const el of root.querySelectorAll<HTMLElement>('[data-ts-listbox]')) m.select?.preparar(el);
    for (const el of root.querySelectorAll<HTMLElement>('[data-ts-tooltip-root]')) m.overlays?.preparar(el);
    if (m.toast) for (const el of root.querySelectorAll<HTMLElement>(m.toast.CONTENEDOR)) m.toast.preparar(el);
}

/** Las raíces que `refrescar` dibuja. Las de los módulos que todavía no cargaron no están: su carga vuelve a llamar a `iniciar`. */
function raicesADibujar(): string {
    const fijas = '[data-ts-pagination], [data-ts-number], [data-ts-date-picker], [data-ts-slider], [data-ts-sidebar], [data-ts-table], [data-ts-checkbox-group], [data-ts-tabs], [data-ts-accordion], [data-ts-menu], [data-ts-listbox], [data-ts-tooltip-root], [data-ts-scrollspy], [data-ts-clear], [data-ts-avatar]';
    return [fijas, m.progress?.RELLENO, m.medidas?.MEDIDAS, m.toast?.CONTENEDOR].filter(Boolean).join(', ');
}

/** Las raíces ya dibujadas: un nodo nuevo que no trae ninguna otra es del propio Core (un día del calendario, una página). */
const dibujadas = new WeakSet<Element>();

function raicesEn(nodo: Document | Element, selector: string): Element[] {
    return [...(nodo instanceof Element && nodo.matches(selector) ? [nodo] : []), ...nodo.querySelectorAll(selector)];
}

function refrescar(root: Document | HTMLElement): void {
    for (const r of raicesEn(root, raicesADibujar())) dibujadas.add(r);
    prepararDeRespaldo(root);
    sincronizarEnvios(root);
    for (const nav of root.querySelectorAll<HTMLElement>('[data-ts-pagination]')) {
        m.pagination?.pintar(nav);
    }
    m.datePicker?.fijarAnchos(root);
    for (const d of root.querySelectorAll<HTMLElement>('[data-ts-date-picker]')) {
        m.datePicker?.recordar(d);
        if (m.datePicker?.visible(d)) m.datePicker?.pintar(d);
        m.datePicker?.sincronizarLimpiar(d);
    }
    // Después del DatePicker: su hora deshabilita los campos numéricos que trae adentro, y los botones lo siguen.
    for (const n of root.querySelectorAll<HTMLElement>('[data-ts-number]')) {
        m.numberInput?.sincronizarBotones(n);
    }
    for (const sl of root.querySelectorAll<HTMLElement>('[data-ts-slider]')) {
        m.slider?.pintar(sl);
    }
    if (m.progress) for (const f of root.querySelectorAll<HTMLElement>(m.progress.RELLENO)) m.progress.pintar(f);
    if (m.medidas) for (const el of root.querySelectorAll<HTMLElement>(m.medidas.MEDIDAS)) m.medidas.pintar(el);
    for (const s of root.querySelectorAll<HTMLElement>('[data-ts-sidebar]')) {
        m.sidebar?.restaurar(s);
    }
    for (const t of root.querySelectorAll<HTMLElement>('[data-ts-table]')) {
        m.table?.virtualizar(t);
    }
    m.opcion?.sincronizarMixtas(root);
    for (const g of root.querySelectorAll<HTMLElement>('[data-ts-checkbox-group]')) m.opcion?.sincronizarGrupo(g);
    m.clear?.sincronizar(root);
    m.alertDialog?.sincronizarTodos(root);
    if (typeof location !== 'undefined' && esDesarrolloLocal(location)) import('./pesados/key-warning').then((k) => k.revisarNombres(root), () => {});
    m.avatar?.revisarRotas(root);
    cursorAlFinal(root);
    m.overlays?.apagarPopoversCerrados(root);
    m.scrollspy?.alDesplazar(root);
}

const CLICKS: ((destino: Element, evento: Event) => boolean)[] = [
    (d) => m.select?.alQuitarEtiqueta(d) ?? false,
    (d) => m.dismiss?.alHacerClick(d) ?? false,
    (d, e) => m.accordion?.alHacerClick(d, e) ?? false,
    (d) => m.tabs?.alHacerClick(d) ?? false,
    (d) => m.segmented?.alHacerClick(d) ?? false,
    (d) => m.pagination?.alHacerClick(d) ?? false,
    (d) => m.numberInput?.alHacerClick(d) ?? false,
    (d) => m.clear?.alHacerClick(d) ?? false,
    (d) => m.fileUpload?.alHacerClick(d) ?? false,
    (d) => m.clipboard?.alHacerClick(d) ?? false,
    (d) => m.toast?.alHacerClick(d) ?? false,
    (d) => m.commandPalette?.alHacerClick(d) ?? false,
    (d) => m.select?.alHacerClick(d) ?? false,
    (d) => m.menu?.alHacerClick(d) ?? false,
    (d) => m.datePicker?.alHacerClick(d) ?? false,
    (d) => m.table?.alHacerClick(d) ?? false,
    (d) => m.sidebar?.alHacerClick(d) ?? false,
    (d) => m.toggle?.alHacerClick(d) ?? false,
    (d, e) => m.invokers?.alHacerClick(d, e) ?? false,
];

const TECLAS: ((destino: Element, tecla: string, mayus?: boolean) => boolean)[] = [
    (d, t) => m.overlays?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.slider?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.commandPalette?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.select?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.menu?.alPresionarTecla(d, t) ?? false,
    (d, t, s) => m.datePicker?.alPresionarTecla(d, t, s) ?? false,
    (d, t) => m.numberInput?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.tabs?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.segmented?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.table?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.dismiss?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.toggle?.alPresionarTecla(d, t) ?? false,
    (d, t) => m.invokers?.alPresionarTecla(d, t) ?? false,
];

export function alClick(e: Event): void {
    const destino = e.target as Element | null;
    if (!destino?.closest) return;
    if (cargador.diferirClick?.(destino)) return;
    m.select?.alHacerClickAfuera(destino);
    m.menu?.alHacerClickAfuera(destino);
    m.invokers?.alHacerClickFondo(destino, e as MouseEvent);
    for (const manejar of CLICKS) {
        if (manejar(destino, e)) return;
    }
}

function alTeclado(e: KeyboardEvent): void {
    const destino = e.target as Element | null;
    if (!destino?.closest) return;
    if (m.commandPalette?.alPresionarTeclaGlobal(e.key, e.metaKey, e.ctrlKey)) {
        e.preventDefault();
        return;
    }
    if (m.menu?.alAbrirContextualConTeclado(destino, e.key, e.shiftKey)) {
        e.preventDefault();
        return;
    }
    for (const manejar of TECLAS) {
        if (manejar(destino, e.key, e.shiftKey)) {
            e.preventDefault();
            if (e.key === 'Escape') e.stopPropagation();
            return;
        }
    }
}

function alMenuContextual(e: MouseEvent): void {
    const destino = e.target as Element | null;
    if (destino?.closest && m.menu?.alMenuContextual(destino, e.clientX, e.clientY)) {
        e.preventDefault();
    }
}

function alPuntero(e: PointerEvent): void {
    const destino = e.target as Element | null;
    if (destino?.closest) m.spotlight?.alMoverPuntero(destino, e.clientX, e.clientY);
}

function alPasarPuntero(e: PointerEvent): void {
    const destino = e.target as Element | null;
    if (destino?.closest) m.datePicker?.alApuntar(destino);
}

function alSalirPuntero(e: PointerEvent): void {
    const destino = e.target as Element | null;
    if (destino?.closest) m.spotlight?.alSalirPuntero(destino);
}

function alEnfocarNumero(e: Event): void {
    const destino = e.target as Element | null;
    if (!destino?.closest) return;
    if (e.type === 'focusin') {
        m.numberInput?.alEnfocar(destino);
        m.select?.alEnfocar(destino);
        alEnfocarRequerido(destino);
    } else {
        m.numberInput?.alDesenfocar(destino);
        m.select?.alDesenfocar(destino);
        m.datePicker?.alDesenfocar(destino, (e as FocusEvent).relatedTarget);
        m.slider?.alSoltarTecla(destino);
    }
}

function alPresionar(e: PointerEvent): void {
    const destino = e.target as Element | null;
    if (destino?.closest) m.toggle?.alPresionarAfuera(destino);
    if (destino?.closest) m.invokers?.alPresionarFondo(destino, e);
    if (destino?.closest && m.select?.alPresionarOpcion(destino, e.pointerType)) e.preventDefault();
}

function alMoverMouse(e: MouseEvent): void {
    const destino = e.target as Element | null;
    if (destino?.closest) m.listbox?.alApuntarOpcion(destino);
}

function alApuntar(entrar: boolean, porTeclado: boolean) {
    return (e: Event): void => {
        const destino = e.target as Element | null;
        if (destino?.closest) m.overlays?.alApuntar(destino, entrar, porTeclado);
    };
}

function alCambiar(e: Event): void {
    const destino = e.target as Element | null;
    if (!destino?.closest) return;
    m.fileUpload?.alCambiar(destino);
    m.opcion?.alCambiar(destino);
    m.slider?.alCambiar(destino);
}

function alEscribir(e: Event): void {
    const destino = e.target as Element | null;
    if (!destino?.closest) return;
    if (m.slider?.alEscribir(destino)) return;
    m.alertDialog?.alEscribir(destino);
    m.clear?.alEscribir(destino);
    m.campo?.alEscribir(destino);
    if (m.commandPalette?.alEscribir(destino)) return;
    if (m.numberInput?.alEscribir(destino)) return;
    m.select?.alEscribir(destino);
}

function alDesplazarElemento(e: Event): void {
    const destino = e.target as Element | null;
    if (destino?.closest) m.table?.alDesplazar(destino);
}

function alArrastrar(e: DragEvent): void {
    const destino = e.target as Element | null;
    if (!destino?.closest) return;
    const archivos = e.type === 'drop' ? [...(e.dataTransfer?.files ?? [])] : null;
    if (m.fileUpload?.alArrastrar(destino, e.type, archivos)) e.preventDefault();
}

function alFallarRecurso(e: Event): void {
    const destino = e.target as Element | null;
    if (destino?.closest) m.avatar?.alFallarImagen(destino);
}

export function iniciar(root: Document | HTMLElement = document): void {
    refrescar(root);
    if (inicializadas.has(root)) return;
    inicializadas.add(root);
    if (root !== document && !escapeGlobal && typeof document !== 'undefined') {
        escapeGlobal = true;
        document.addEventListener('keydown', alEscapeGlobal);
    }

    root.addEventListener('click', (e) => m.button?.alClickInactivo(e), true);
    root.addEventListener('click', (e) => { if ((e.target as Element | null)?.closest) m.invokers?.alPresionarDisparador(e.target as Element); }, true);
    root.addEventListener('click', alClick);
    root.addEventListener('keydown', alTeclado as EventListener);
    root.addEventListener('pointermove', alPuntero as EventListener);
    root.addEventListener('pointerover', alPasarPuntero as EventListener);
    root.addEventListener('pointerdown', alPresionar as EventListener);
    root.addEventListener('pointerdown', (e) => m.slider?.alPresionarRiel(e as PointerEvent));
    root.addEventListener('pointermove', (e) => m.slider?.alMoverRiel(e as PointerEvent));
    root.addEventListener('pointerup', (e) => m.slider?.alSoltarPuntero(e as PointerEvent));
    root.addEventListener('pointercancel', (e) => m.slider?.alSoltarPuntero(e as PointerEvent));
    root.addEventListener('keyup', (e) => m.slider?.alSoltarTecla(e.target as Element | null));
    root.addEventListener('mousemove', alMoverMouse as EventListener);
    root.addEventListener('pointerleave', alSalirPuntero as EventListener, true);
    root.addEventListener('change', alCambiar);
    root.addEventListener('ts:change', (e) => m.pagination?.alCambiarTamano(e));
    root.addEventListener('ts:change', (e) => m.datePicker?.alCambiarSelector(e));
    root.addEventListener('reset', (e) => m.select?.alRestablecer(e));
    root.addEventListener('reset', (e) => m.datePicker?.alRestablecer(e));
    root.addEventListener('reset', (e) => m.slider?.alRestablecer(e));
    root.addEventListener('input', alEscribir);
    root.addEventListener('beforeinput', (e) => m.numberInput?.alAntesDeEscribir(e as InputEvent));
    root.addEventListener('contextmenu', alMenuContextual as EventListener);
    root.addEventListener('scroll', alDesplazarElemento, true);
    for (const t of ['dragover', 'dragleave', 'drop']) {
        root.addEventListener(t, alArrastrar as EventListener);
    }
    root.addEventListener('mouseover', alApuntar(true, false));
    root.addEventListener('mouseout', alApuntar(false, false));
    root.addEventListener('focusin', alApuntar(true, true));
    root.addEventListener('focusout', alApuntar(false, true));
    root.addEventListener('toggle', (e) => m.overlays?.alAlternarPopover(e), true);
    root.addEventListener('cancel', (e) => m.invokers?.alCancelar(e), true);
    root.addEventListener('close', (e) => m.alertDialog?.alCerrar(e.target as Element), true);
    root.addEventListener('close', (e) => m.invokers?.alCerrarDialogo(e.target as Element), true);
    root.addEventListener('beforetoggle', (e) => m.overlays?.alAntesDeAlternarPopover(e), true);
    root.addEventListener('focusin', alEnfocarNumero);
    root.addEventListener('focusout', alEnfocarNumero);
    root.addEventListener('error', alFallarRecurso, true);
    if (typeof MutationObserver !== 'undefined') {
        new MutationObserver((cambios) => {
            sincronizarEnvios(root);
            for (const c of cambios) m.datePicker?.redibujar(c.target as Element);
            // Un campo numérico deshabilitado por código (la hora del DatePicker sin día, o el código de la página) arrastra sus botones.
            const numeros = new Set<HTMLElement>();
            for (const c of cambios) {
                const t = c.target as Element;
                if (!t.matches?.('[data-ts-number-field]')) continue; // los botones cambian su propio disabled al sincronizar
                const raiz = t.closest<HTMLElement>('[data-ts-number]');
                if (raiz) numeros.add(raiz);
            }
            for (const n of numeros) m.numberInput?.sincronizarBotones(n);
        }).observe(root, {
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled', 'data-ts-disabled-dates', 'data-ts-disabled-weekdays', 'data-ts-day-marks'],
        });
    }

    if (typeof MutationObserver !== 'undefined') {
        new MutationObserver((cambios) => {
            for (const c of cambios) {
                const t = c.target as HTMLElement;
                if (c.attributeName === 'data-ts-value') {
                    if (m.progress && t.matches?.(m.progress.RELLENO)) m.progress.pintar(t);
                } else {
                    m.medidas?.pintar(t);
                }
            }
        }).observe(root, {
            subtree: true,
            attributes: true,
            attributeFilter: ['data-ts-value', 'data-ts-ratio', 'data-ts-max-height', 'data-ts-max-width'],
        });
    }

    if (typeof MutationObserver !== 'undefined') {
        new MutationObserver((cambios) => {
            const navs = new Set<HTMLElement>();
            for (const c of cambios) if ((c.target as HTMLElement).matches?.('[data-ts-pagination]')) navs.add(c.target as HTMLElement);
            for (const nav of navs) m.pagination?.pintar(nav);
        }).observe(root, {
            subtree: true,
            attributes: true,
            attributeFilter: ['data-ts-total', 'data-ts-page', 'data-ts-siblings', 'data-ts-boundaries', 'data-ts-items', 'data-ts-page-size', 'data-ts-label-template', 'data-ts-label-empty'],
        });
    }

    if (typeof MutationObserver !== 'undefined') {
        // Lo que llega después de cargar (un framework que monta, un fetch) se dibuja como lo que estaba al cargar. Sólo se
        // redibuja el padre de un nodo que trae una raíz nueva: los nodos que agrega el propio Core al dibujar no traen ninguna.
        new MutationObserver((cambios) => {
            const selector = raicesADibujar();
            const padres = new Set<HTMLElement>();
            const conNuevas = new Set<HTMLElement>();
            for (const c of cambios) {
                for (const n of c.addedNodes) {
                    if (n.nodeType !== 1 || !n.parentElement) continue;
                    padres.add(n.parentElement);
                    if (raicesEn(n as Element, selector).some((r) => !dibujadas.has(r))) conNuevas.add(n.parentElement);
                }
            }
            for (const p of padres) (conNuevas.has(p) ? refrescar : prepararDeRespaldo)(p);
        }).observe(root, { childList: true, subtree: true });
    }

    if (typeof MutationObserver !== 'undefined') {
        new MutationObserver((cambios) => {
            m.accordion?.alCambiarExpandido(cambios.map((c) => c.target as Element));
        }).observe(root, { subtree: true, attributes: true, attributeFilter: ['open'] });
    }

    if (typeof window !== 'undefined') {
        const alScroll = () => m.scrollspy?.alDesplazar(root);
        window.addEventListener('scroll', alScroll, { passive: true });
        window.addEventListener('resize', alScroll, { passive: true });
        window.addEventListener('resize', () => m.sidebar?.alRedimensionar(root), { passive: true });
    }
}

