// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ThemeDef } from './theme-def';

export const SPOTLIGHT_POR_DEFECTO = { light: 'var(--color-grayAlpha-100)', dark: 'var(--color-grayAlpha-200)' };

export function spotlightDeTema(spotlight: ThemeDef['spotlight']): { light: string; dark: string } {
    return { light: spotlight?.light ?? SPOTLIGHT_POR_DEFECTO.light, dark: spotlight?.dark ?? SPOTLIGHT_POR_DEFECTO.dark };
}

export function luzOscuro(light: string, dark: string): string {
    return light === dark ? light : `light-dark(${light}, ${dark})`;
}

export function opcionesDeTema(def: Pick<ThemeDef, 'focusRing' | 'spotlight' | 'contrastThreshold'>): [string, string][] {
    const out: [string, string][] = [];
    if (def.contrastThreshold) out.push(['--ts-contrast-threshold', def.contrastThreshold]);
    out.push(['--ts-focus-ring-color', def.focusRing ?? 'var(--color-brand-solid)']);
    if (def.spotlight) {
        const s = spotlightDeTema(def.spotlight);
        out.push(['--ts-spotlight-color', luzOscuro(s.light, s.dark)]);
    }
    return out;
}
