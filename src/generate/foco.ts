// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { MEDIA_OSCURO, RAIZ_POR_SISTEMA, type DarkMode } from '../lib/theme/modo-oscuro';

export const COLOR_FOCO = 'var(--_focus, var(--ts-focus-ring-color, var(--color-brand-solid)))';
const haloAl = (pct: number) => `color-mix(in oklab, ${COLOR_FOCO} ${pct}%, transparent)`;
const HALO = `var(--ts-focus-halo, light-dark(${haloAl(40)}, ${haloAl(50)}))`;
export const haloSinLightDark = (darkMode: DarkMode) => {
    const regla = (selector: string, pct: number, m = '  ') => `${m}${selector} {\n${m}  --ts-focus-halo: ${haloAl(pct)};\n${m}}\n`;
    return (
        regla('*', 40) +
        (darkMode === 'media' ? `  @media ${MEDIA_OSCURO} {\n${regla(`:where(${RAIZ_POR_SISTEMA}) *`, 50, '    ')}  }\n` : '') +
        regla('.dark *, .scheme-dark *', 50) +
        regla('.scheme-light *', 40) +
        regla('.scheme-light .scheme-dark *', 50)
    );
};
export const SOMBRA_FOCO = `0 0 0 var(--ts-border-width-1) ${COLOR_FOCO}, 0 0 0 var(--ts-border-width-4) ${HALO}, var(--ts-sh, 0 0 transparent)`;
export const DECLARACIONES_FOCO = `outline: none; box-shadow: ${SOMBRA_FOCO}; @media (forced-colors: active) { outline: var(--ts-border-width-2) solid Highlight; }`;
export const DECLARACIONES_FOCO_INSET = `outline: none; box-shadow: inset 0 0 0 var(--ts-sizing-2) ${COLOR_FOCO}; @media (forced-colors: active) { outline: var(--ts-border-width-2) solid Highlight; }`;
export const tonoDeCampo = (name: string): string =>
    `--_f-ring: var(--color-${name}-500); --_f-ring-hover: var(--color-${name}-600); @apply ts-focus-ring-${name};`;
export const RESET_FOCO = `:focus-visible:where(:not(.ts)) { ${DECLARACIONES_FOCO} }\n:where(.ts):focus-visible { outline: var(--ts-border-width-2) solid ${COLOR_FOCO}; outline-offset: var(--ts-sizing-2); }\n`;
