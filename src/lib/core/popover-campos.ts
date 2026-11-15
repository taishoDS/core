// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export const MARCA_APAGADO = 'data-ts-popover-off';
const CAMPOS = 'input, select, textarea';

export function esPanelPopover(panel: Element | null): panel is HTMLElement {
    return !!panel && panel.hasAttribute('popover') && panel.classList.contains('ts') && panel.classList.contains('popover');
}

function camposPropios(panel: HTMLElement): HTMLInputElement[] {
    return [...panel.querySelectorAll<HTMLInputElement>(CAMPOS)].filter((c) => c.closest('[popover]') === panel);
}

export function apagarCampos(panel: HTMLElement): void {
    for (const c of camposPropios(panel)) {
        if (c.disabled) continue;
        c.disabled = true;
        c.setAttribute(MARCA_APAGADO, '');
    }
}

export function encenderCampos(panel: HTMLElement): void {
    for (const c of camposPropios(panel)) {
        if (!c.hasAttribute(MARCA_APAGADO)) continue;
        c.removeAttribute(MARCA_APAGADO);
        c.disabled = false;
    }
}
