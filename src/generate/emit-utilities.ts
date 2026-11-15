// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { defaultScales, matDrop, type Scales } from '../config/scales';

export function buildUtilitiesCSS(scales: Scales = defaultScales): string {
    let utilitiesCSS = '/* Archivo auto-generado: SEMANTIC UTILITIES (base, token-agnóstico) */\n@import "./atomic.css";\n@import "./components.css";\n\n';

    utilitiesCSS += `@utility ts-color-heading { color: var(--ts-color-heading, var(--color-gray-1000)); }\n`;
    utilitiesCSS += `@utility ts-color-copy    { color: var(--ts-color-copy,    var(--color-gray-1000)); }\n`;
    utilitiesCSS += `@utility ts-color-subtle  { color: var(--ts-color-subtle,  var(--color-gray-700));  }\n`;
    utilitiesCSS += `@utility ts-color-label   { color: var(--ts-color-label,   var(--color-gray-1000)); }\n`;
    utilitiesCSS += `@utility ts-color-btn     { color: var(--ts-color-btn,     var(--color-gray-1000)); }\n`;
    utilitiesCSS += `@utility ts-color-success { color: var(--ts-color-success, var(--color-success-500)); }\n`;
    utilitiesCSS += `@utility ts-color-warning { color: var(--ts-color-warning, var(--color-warning-500)); }\n`;
    utilitiesCSS += `@utility ts-color-info    { color: var(--ts-color-info,    var(--color-info-500));    }\n`;
    utilitiesCSS += `@utility ts-color-danger  { color: var(--ts-color-danger,  var(--color-danger-500));  }\n`;
    utilitiesCSS += '\n';

    const allSizes = Object.keys(scales.fontSizes).sort((a, b) => parseInt(a) - parseInt(b));
    allSizes.filter(s => parseInt(s) >= 14).forEach(s => utilitiesCSS += `@utility ts-text-heading-${s} { @apply ts-text-${s} ts-leading-${s} ts-tracking-tighter ts-weight-semibold ts-color-heading ts-font-display; text-wrap: balance; }\n`);
    allSizes.filter(s => parseInt(s) >= 12 && parseInt(s) <= 24).forEach(s => utilitiesCSS += `@utility ts-text-copy-${s} { @apply ts-text-${s} ts-leading-${s} ts-tracking-normal ts-weight-normal ts-color-copy; text-wrap: pretty; }\n`);
    utilitiesCSS += '\n';

    [12, 14, 16].forEach(s => {
        utilitiesCSS += `@utility ts-text-button-${s} { @apply ts-text-${s} ts-leading-${s} ts-tracking-normal ts-weight-medium;\n  color: var(--ts-color-btn,     var(--color-gray-1000)); }\n`;
    });
    utilitiesCSS += '\n';

    [12, 14, 16, 18, 20].forEach(s => {
        utilitiesCSS += `@utility ts-text-label-${s} { @apply ts-text-${s} ts-leading-${s} ts-tracking-normal ts-weight-normal ts-color-label; }\n`;
    });
    [12, 14].forEach(s => {
        utilitiesCSS += `@utility ts-text-label-${s}-mono { @apply ts-type-label-${s} ts-font-mono; }\n`;
    });
    utilitiesCSS += `@utility ts-text-label-16-strong { @apply ts-type-label-16 ts-weight-semibold; }\n`;
    utilitiesCSS += `@utility ts-text-label-14-strong { @apply ts-type-label-14 ts-weight-semibold; }\n`;
    utilitiesCSS += `@utility ts-text-label-12-strong { @apply ts-type-label-12 ts-weight-semibold ts-uppercase; }\n`;
    utilitiesCSS += '\n';

    const allShadowKeys = Object.keys(scales.shadows);
    for (const key of allShadowKeys) {
        utilitiesCSS += `@utility ts-surface-${key} { @apply ts-bg-background-100 ts-radius-lg ts-shadow-${key}; }\n`;
        utilitiesCSS += `@utility ts-floating-${key} { @apply ts-bg-background-100 ts-radius-xl ts-shadow-${key}; }\n`;
    }

    const matBg = 'var(--ts-material-bg, var(--color-background-100))';
    const matRing = '0 0 0 var(--ts-border-width-1) var(--ts-material-border, var(--color-grayAlpha-200))';
    const mat = (radiusKey: string, shadowKey: string) =>
        `{ background-color: ${matBg}; box-shadow: ${matRing}, ${matDrop[shadowKey]}; @apply ts-radius-${radiusKey}; }`;
    utilitiesCSS += `@utility ts-material-base       ${mat('md', 'sm')}\n`;
    utilitiesCSS += `@utility ts-material-small      ${mat('md', 'sm')}\n`;
    utilitiesCSS += `@utility ts-material-medium     ${mat('xl', 'md')}\n`;
    utilitiesCSS += `@utility ts-material-large      ${mat('xl', 'lg')}\n`;
    utilitiesCSS += `@utility ts-material-tooltip    ${mat('md', 'sm')}\n`;
    utilitiesCSS += `@utility ts-material-menu       ${mat('xl', 'md')}\n`;
    utilitiesCSS += `@utility ts-material-modal      ${mat('xl', 'lg')}\n`;
    utilitiesCSS += `@utility ts-material-fullscreen ${mat('2xl', 'xl')}\n`;

    return utilitiesCSS;
}
