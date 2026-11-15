// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { drawerSobra, readPersisted, revealScrollTop, SIDEBAR_BREAKPOINT_PX, sidebarDesktopQuery, writePersisted, type SidebarBreakpoint } from './logica/sidebar';
import { P, avisar, mostrar } from './dom';

function aplicar(raiz: HTMLElement, colapsada: boolean): void {
    raiz.classList.toggle('is-collapsed', colapsada);
    raiz.querySelector<HTMLElement>(`[${P}sidebar-toggle]`)?.setAttribute('aria-expanded', String(!colapsada));
    // Sólo la barra que se pliega del todo queda inerte: el rail de íconos sigue a la vista y se usa. Ahí el nombre
    // del ítem va como `title` mientras la etiqueta se ve sólo para el lector de pantalla.
    const plegada = colapsada && raiz.classList.contains('collapsible-offcanvas');
    for (const el of raiz.querySelectorAll<HTMLElement>(`[${P}sidebar-collapsible]`)) {
        el.inert = plegada;
    }
    const rail = colapsada && raiz.classList.contains('collapsible-icon');
    for (const item of raiz.querySelectorAll<HTMLElement>(`[${P}sidebar-item]`)) {
        const nombre = item.querySelector('[data-sidebar-label]')?.textContent?.trim();
        if (!nombre) continue;
        if (rail) item.title = nombre;
        else if (item.title === nombre) item.removeAttribute('title');
    }
}

// El ítem activo queda a la vista dentro de la caja que se desplaza, sin mover la página (no usa `scrollIntoView`).
function traer(caja: Element | null | undefined, activo: HTMLElement | null): void {
    if (!caja || !activo?.getClientRects().length) return;
    const c = caja.getBoundingClientRect();
    const i = activo.getBoundingClientRect();
    caja.scrollTop = revealScrollTop(caja.scrollTop, c.top, c.bottom, i.top, i.bottom);
}

export function restaurar(raiz: HTMLElement): void {
    const guardado = readPersisted(raiz.getAttribute(`${P}persist-key`) ?? undefined);
    aplicar(raiz, guardado ?? raiz.classList.contains('is-collapsed'));
    traer(raiz.querySelector(`[${P}sidebar-collapsible]`), raiz.querySelector<HTMLElement>(`[${P}sidebar-item].is-active`));
}

function alternarColapso(raiz: HTMLElement): void {
    const colapsada = !raiz.classList.contains('is-collapsed');
    if (!avisar(raiz, { component: 'sidebar', collapsed: colapsada })) return;
    aplicar(raiz, colapsada);
    writePersisted(raiz.getAttribute(`${P}persist-key`) ?? undefined, colapsada);
}

function drawerDe(raiz: HTMLElement): HTMLDialogElement | null {
    const el = document.getElementById(raiz.getAttribute(`${P}sidebar-drawer`) ?? '');
    return el instanceof HTMLDialogElement ? el : null;
}

// Al abrir el Drawer, el ítem activo queda a la vista. La caja que se desplaza es el cuerpo del Drawer (el padre del `nav`).
function revelarActivo(drawer: HTMLDialogElement): void {
    const activo = drawer.querySelector<HTMLElement>(`[${P}sidebar-item].is-active`);
    traer(activo?.closest('nav')?.parentElement, activo ?? null);
}

function alDisparar(disparador: HTMLElement): boolean {
    const id = disparador.getAttribute(`${P}sidebar-trigger`) || 'default';
    const raiz = [...document.querySelectorAll<HTMLElement>(`[${P}sidebar]`)].find(
        (r) => (r.getAttribute(`${P}sidebar-id`) ?? 'default') === id,
    );
    if (!raiz) return false;
    const px = SIDEBAR_BREAKPOINT_PX[(raiz.getAttribute(`${P}breakpoint`) ?? 'none') as SidebarBreakpoint] ?? 0;
    const angosto = px > 0 && !window.matchMedia(sidebarDesktopQuery(px)).matches;
    const drawer = angosto ? drawerDe(raiz) : null;
    if (drawer) {
        if (!drawer.open) {
            drawer.showModal();
            revelarActivo(drawer);
        }
    } else if (!raiz.classList.contains('collapsible-none')) {
        alternarColapso(raiz);
    }
    return true;
}

function cerrarDrawerAlActivar(destino: Element): void {
    const dialogo = destino.closest('dialog');
    if (!dialogo?.open || !destino.closest(`[${P}sidebar-item]`)) return;
    if (document.querySelector(`[${P}sidebar-drawer="${CSS.escape(dialogo.id)}"]`)) dialogo.close();
}

export function alHacerClick(destino: Element): boolean {
    cerrarDrawerAlActivar(destino);

    const disparador = destino.closest<HTMLElement>(`[${P}sidebar-trigger]`);
    if (disparador) return alDisparar(disparador);

    const grupo = destino.closest<HTMLElement>(`[${P}sidebar-group-toggle]`);
    if (grupo) {
        const contenedor = grupo.closest<HTMLElement>(`[${P}sidebar-group]`);
        const items = contenedor?.querySelector<HTMLElement>(`[${P}sidebar-group-items]`);
        if (!items) return false;
        const abierto = grupo.getAttribute('aria-expanded') !== 'true';
        grupo.setAttribute('aria-expanded', String(abierto));
        mostrar(items, abierto);
        return true;
    }

    const toggle = destino.closest<HTMLElement>(`[${P}sidebar-toggle]`);
    if (!toggle) return false;
    const raiz = toggle.closest<HTMLElement>(`[${P}sidebar]`);
    if (!raiz) return false;

    alternarColapso(raiz);
    return true;
}

export function alRedimensionar(root: Document | HTMLElement): void {
    for (const raiz of root.querySelectorAll<HTMLElement>(`[${P}sidebar][${P}sidebar-drawer]`)) {
        const drawer = drawerDe(raiz);
        if (!drawer) continue;
        const px = SIDEBAR_BREAKPOINT_PX[(raiz.getAttribute(`${P}breakpoint`) ?? 'none') as SidebarBreakpoint] ?? 0;
        if (px > 0 && drawerSobra(window.matchMedia(sidebarDesktopQuery(px)).matches, drawer.open)) drawer.close();
    }
}

export const ficha = {
    alHacerClick,
    alRedimensionar,
    restaurar,
};
