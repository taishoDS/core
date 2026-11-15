// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export type SidebarBreakpoint = 'sm' | 'md' | 'lg' | 'none';

export const SIDEBAR_BREAKPOINT_PX: Record<SidebarBreakpoint, number> = { none: 0, sm: 640, md: 768, lg: 1024 };

export function sidebarDesktopQuery(px: number): string {
    return `(min-width: ${px}px)`;
}

export function drawerSobra(hayLugarParaLaBarra: boolean, drawerAbierto: boolean): boolean {
    return hayLugarParaLaBarra && drawerAbierto;
}

export function revealScrollTop(scrollTop: number, boxTop: number, boxBottom: number, itemTop: number, itemBottom: number): number {
    if (itemTop < boxTop) return scrollTop - (boxTop - itemTop);
    if (itemBottom > boxBottom) return scrollTop + (itemBottom - boxBottom);
    return scrollTop;
}

export function readPersisted(key?: string): boolean | null {
    if (!key || typeof localStorage === 'undefined') return null;
    const v = localStorage.getItem(key);
    return v === null ? null : v === '1';
}

export function writePersisted(key: string | undefined, collapsed: boolean): void {
    if (!key || typeof localStorage === 'undefined') return;
    localStorage.setItem(key, collapsed ? '1' : '0');
}
