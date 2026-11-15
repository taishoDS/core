// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { defaultScales, sizing, tr, type Scales } from '../config/scales';
import { interlineadoRtl, reglaRtl, trackingRtl } from '../lib/theme/typography-scale';
import { RESET_FOCO } from './foco';
import { VERSION_CSS } from './version';
import { MEDIA_OSCURO, RAIZ_POR_SISTEMA, type DarkMode } from '../lib/theme/modo-oscuro';

export const enPx = (v: string, tabla: Record<string, number> = sizing): string =>
    v.replace(/var\(--ts-sizing-(\d+)\)/g, (_, n: string) => `${tabla[n]}px`);

export function buildResetCSS(darkMode: DarkMode = 'class', scales: Scales = defaultScales, version: string | undefined = VERSION_CSS): string {
    let resetCSS = '/* Archivo auto-generado: RESET / BASE */\n\n';
    resetCSS += `*, *::before, *::after { box-sizing: border-box; }\n`;
    resetCSS += `* { margin: 0; }\n\n`;
    resetCSS += `html {\n`;
    resetCSS += `  -webkit-text-size-adjust: 100%;\n`;
    resetCSS += `  -moz-text-size-adjust: 100%;\n`;
    resetCSS += `  text-size-adjust: 100%;\n`;
    resetCSS += `  -webkit-font-smoothing: antialiased;\n`;
    resetCSS += `  -moz-osx-font-smoothing: grayscale;\n`;
    resetCSS += `  font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);\n`;
    resetCSS += `  line-height: 1.5;\n`;
    resetCSS += `  tab-size: 4;\n`;
    resetCSS += `  -webkit-tap-highlight-color: transparent;\n`;
    resetCSS += `}\n\n`;
    resetCSS += `@media (prefers-reduced-motion: no-preference) {\n`;
    resetCSS += `  html { scroll-behavior: smooth; }\n`;
    resetCSS += `}\n\n`;
    resetCSS += `body {\n`;
    resetCSS += `  min-height: 100vh;\n`;
    resetCSS += `  min-height: 100dvh;\n`;
    resetCSS += `  /* Página = tono más profundo (background-200); las superficies (cards/overlays\n`;
    resetCSS += `     = background-100) se despegan por encima. Dark: background-200 < 100. */\n`;
    resetCSS += `  background-color: var(--color-background-200);\n`;
    resetCSS += `  color: var(--color-gray-1000);\n`;
    resetCSS += `  line-height: inherit;\n`;
    resetCSS += `  transition: ${tr('background-color', 'base')}, ${tr('color', 'base')};\n`;
    resetCSS += `}\n\n`;
    resetCSS += `img, picture, video, canvas, svg { display: block; max-width: 100%; height: auto; }\n`;
    resetCSS += `img, video { height: auto; }\n\n`;
    resetCSS += `input, button, textarea, select { font: inherit; color: inherit; letter-spacing: inherit; }\n`;
    resetCSS += `textarea { resize: vertical; }\n`;
    resetCSS += `button { background: none; border: none; padding: 0; cursor: pointer; }\n`;
    resetCSS += `button, [role="button"] { cursor: pointer; }\n`;
    resetCSS += `:disabled { cursor: default; }\n`;
    resetCSS += `::placeholder { color: var(--color-gray-600); opacity: 1; }\n\n`;
    resetCSS += `a { color: inherit; text-decoration: inherit; }\n\n`;
    resetCSS += `p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }\n`;
    resetCSS += `h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; }\n\n`;
    resetCSS += `ul, ol { list-style: none; padding: 0; }\n`;
    resetCSS += `ul[role="list"], ol[role="list"] { list-style: none; }\n\n`;
    resetCSS += `fieldset { border: 0; padding: 0; min-width: 0; }\n`;
    resetCSS += `legend { padding: 0; }\n\n`;
    resetCSS += `table { border-collapse: collapse; border-spacing: 0; }\n`;
    resetCSS += `hr { height: 0; color: inherit; border: 0; border-top: var(--ts-border-width-1) solid var(--color-grayAlpha-200); }\n\n`;
    resetCSS += `:root { color-scheme: light; }\n`;
    if (version) resetCSS += `:root { --ts-version: "${version}"; }\n`;
    resetCSS += `.dark { color-scheme: dark; }\n\n`;
    if (darkMode === 'media') resetCSS += `@media ${MEDIA_OSCURO} {\n  ${RAIZ_POR_SISTEMA} { color-scheme: dark; }\n}\n\n`;
    resetCSS += `::selection { background-color: var(--color-brand-500); color: var(--color-brand-500-contrast); }\n\n`;
    resetCSS += `:focus { outline: none; }\n`;
    resetCSS += `${RESET_FOCO}\n`;
    resetCSS += `/* Scrollbar */\n`;
    resetCSS += `* { scrollbar-width: thin; scrollbar-color: var(--color-grayAlpha-300) transparent; }\n`;
    resetCSS += `::-webkit-scrollbar { width: 10px; height: 10px; }\n`;
    resetCSS += `::-webkit-scrollbar-track { background: transparent; }\n`;
    resetCSS += `::-webkit-scrollbar-thumb { background-color: var(--color-grayAlpha-300); border-radius: var(--ts-radius-full); border: var(--ts-border-width-2) solid transparent; background-clip: content-box; }\n`;
    resetCSS += `::-webkit-scrollbar-thumb:hover { background-color: var(--color-grayAlpha-400); }\n\n`;
    resetCSS += `[hidden] { display: none !important; }\n`;

    resetCSS += `${reglaRtl([...trackingRtl(scales.letterSpacing), ...interlineadoRtl(scales.lineHeights, (v) => enPx(v, scales.sizing))])}\n`;

    return resetCSS;
}
