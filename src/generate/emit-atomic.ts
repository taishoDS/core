// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { SOMBRA_FOCO, DECLARACIONES_FOCO, DECLARACIONES_FOCO_INSET, tonoDeCampo } from './foco';
import {
    tr, defaultScales, type Scales,
} from '../config/scales';

export function buildAtomicCSS(
    vocabularyColors: Record<string, Record<string, string>>,
    userGridMins: Record<string, string>,
    scales: Scales = defaultScales,
): string {
    const { radius, gaps, spaces, screens } = scales;
    let atomicCSS = '/* Archivo auto-generado: ATOMIC UTILITIES */\n\n';
    for (const v of ['--ts-bw', '--ts-ring-w', '--ts-ring-c']) atomicCSS += `@property ${v} { syntax: '*'; inherits: false; }\n`;
    atomicCSS += `@supports ((-moz-orient: inline) and (not (color: oklch(from red l c h)))) { *, ::before, ::after { --ts-bw: initial; --ts-ring-w: initial; --ts-ring-c: initial; } }\n`;
    atomicCSS += '\n';
    for (const k of Object.keys(scales.fontSizes)) atomicCSS += `@utility ts-text-${k} { font-size: var(--ts-fontsize-${k}); }\n`;
    for (const k of Object.keys(scales.lineHeights)) atomicCSS += `@utility ts-leading-${k} { line-height: var(--ts-lh-${k}); }\n`;
    for (const k of Object.keys(scales.letterSpacing)) atomicCSS += `@utility ts-tracking-${k} { letter-spacing: var(--ts-ls-${k}); }\n`;
    for (const k of Object.keys(scales.fontWeights)) atomicCSS += `@utility ts-weight-${k} { font-weight: var(--ts-fw-${k}); }\n`;
    atomicCSS += `@utility ts-font-sans { font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif); }\n`;
    atomicCSS += `@utility ts-font-mono { font-family: var(--font-mono, ui-monospace, monospace); }\n`;
    atomicCSS += `@utility ts-font-display { font-family: var(--font-display, var(--font-sans, ui-sans-serif, system-ui, sans-serif)); }\n`;

    atomicCSS += `@utility ts-block        { display: block; }\n`;
    atomicCSS += `@utility ts-inline-block { display: inline-block; }\n`;
    atomicCSS += `@utility ts-flex         { display: flex; }\n`;
    atomicCSS += `@utility ts-inline-flex  { display: inline-flex; }\n`;
    atomicCSS += `@utility ts-grid         { display: grid; }\n`;
    atomicCSS += `@utility ts-inline-grid  { display: inline-grid; }\n`;
    atomicCSS += `@utility ts-hidden       { display: none; }\n`;
    atomicCSS += `@utility ts-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }\n`;
    atomicCSS += `@utility ts-not-sr-only { position: static; width: auto; height: auto; padding: 0; margin: 0; overflow: visible; clip: auto; white-space: normal; }\n`;

    for (let i = 1; i <= 12; i++) {
        atomicCSS += `@utility ts-grid-cols-${i} { grid-template-columns: repeat(${i}, minmax(0, 1fr)); }\n`;
    }
    for (let i = 1; i <= 12; i++) {
        atomicCSS += `@utility ts-grid-rows-${i} { grid-template-rows: repeat(${i}, minmax(0, 1fr)); }\n`;
    }
    for (let i = 1; i <= 12; i++) {
        atomicCSS += `@utility ts-col-span-${i} { grid-column: span ${i} / span ${i}; }\n`;
    }
    atomicCSS += `@utility ts-col-span-full { grid-column: 1 / -1; }\n`;
    atomicCSS += `@utility ts-col-span-auto { grid-column: auto; }\n`;
    atomicCSS += `@utility ts-col-start-auto { grid-column-start: auto; }\n`;
    for (let i = 1; i <= 12; i++) {
        atomicCSS += `@utility ts-row-span-${i} { grid-row: span ${i} / span ${i}; }\n`;
    }
    atomicCSS += `@utility ts-row-span-full { grid-row: 1 / -1; }\n`;

    atomicCSS += `@utility ts-grid-flow-row   { grid-auto-flow: row; }\n`;
    atomicCSS += `@utility ts-grid-flow-col   { grid-auto-flow: column; }\n`;
    atomicCSS += `@utility ts-grid-flow-dense { grid-auto-flow: dense; }\n`;

    const gridMinDefault = userGridMins['md'] ?? Object.values(userGridMins)[0];
    atomicCSS += `@utility ts-grid-auto {\n`;
    atomicCSS += `  display: grid;\n`;
    atomicCSS += `  gap: var(--ts-gap-base);\n`;
    atomicCSS += `  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--ts-grid-min, ${gridMinDefault})), 1fr));\n`;
    atomicCSS += `}\n`;
    atomicCSS += `@utility ts-grid-auto-fill {\n`;
    atomicCSS += `  display: grid;\n`;
    atomicCSS += `  gap: var(--ts-gap-base);\n`;
    atomicCSS += `  grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--ts-grid-min, ${gridMinDefault})), 1fr));\n`;
    atomicCSS += `}\n`;
    const gridMins: Record<string, string> = userGridMins;
    for (const [k, v] of Object.entries(gridMins)) {
        atomicCSS += `@utility ts-grid-min-${k} { --ts-grid-min: ${v}; }\n`;
    }

    atomicCSS += `@utility ts-cq        { container-type: inline-size; }\n`;
    atomicCSS += `@utility ts-cq-normal { container-type: normal; }\n`;

    atomicCSS += `@utility ts-flex-col     { flex-direction: column; }\n`;
    atomicCSS += `@utility ts-flex-row     { flex-direction: row; }\n`;
    atomicCSS += `@utility ts-flex-wrap    { flex-wrap: wrap; }\n`;

    atomicCSS += `@utility ts-flex-1        { flex: 1; }\n`;
    atomicCSS += `@utility ts-flex-none     { flex: none; }\n`;
    atomicCSS += `@utility ts-flex-grow     { flex-grow: 1; }\n`;
    atomicCSS += `@utility ts-flex-grow-0   { flex-grow: 0; }\n`;
    atomicCSS += `@utility ts-flex-shrink   { flex-shrink: 1; }\n`;
    atomicCSS += `@utility ts-flex-shrink-0 { flex-shrink: 0; }\n`;

    atomicCSS += `@utility ts-items-center  { align-items: center; }\n`;
    atomicCSS += `@utility ts-items-start   { align-items: flex-start; }\n`;
    atomicCSS += `@utility ts-items-end     { align-items: flex-end; }\n`;
    atomicCSS += `@utility ts-items-stretch { align-items: stretch; }\n`;
    atomicCSS += `@utility ts-items-baseline { align-items: baseline; }\n`;

    atomicCSS += `@utility ts-justify-center  { justify-content: center; }\n`;
    atomicCSS += `@utility ts-justify-start   { justify-content: flex-start; }\n`;
    atomicCSS += `@utility ts-justify-end     { justify-content: flex-end; }\n`;
    atomicCSS += `@utility ts-justify-between { justify-content: space-between; }\n`;
    atomicCSS += `@utility ts-justify-around  { justify-content: space-around; }\n`;
    atomicCSS += `@utility ts-justify-evenly  { justify-content: space-evenly; }\n`;
    atomicCSS += `@utility ts-justify-stretch { justify-content: stretch; }\n`;

    atomicCSS += `@utility ts-self-auto     { align-self: auto; }\n`;
    atomicCSS += `@utility ts-self-start    { align-self: flex-start; }\n`;
    atomicCSS += `@utility ts-self-end      { align-self: flex-end; }\n`;
    atomicCSS += `@utility ts-self-center   { align-self: center; }\n`;
    atomicCSS += `@utility ts-self-stretch  { align-self: stretch; }\n`;
    atomicCSS += `@utility ts-self-baseline { align-self: baseline; }\n`;

    atomicCSS += `@utility ts-justify-self-auto    { justify-self: auto; }\n`;
    atomicCSS += `@utility ts-justify-self-start   { justify-self: start; }\n`;
    atomicCSS += `@utility ts-justify-self-end     { justify-self: end; }\n`;
    atomicCSS += `@utility ts-justify-self-center  { justify-self: center; }\n`;
    atomicCSS += `@utility ts-justify-self-stretch { justify-self: stretch; }\n`;

    atomicCSS += `@utility ts-place-items-center  { place-items: center; }\n`;
    atomicCSS += `@utility ts-place-items-start   { place-items: start; }\n`;
    atomicCSS += `@utility ts-place-items-end     { place-items: end; }\n`;
    atomicCSS += `@utility ts-place-items-stretch { place-items: stretch; }\n`;
    
    atomicCSS += `@utility ts-place-content-center  { place-content: center; }\n`;
    atomicCSS += `@utility ts-place-content-between { place-content: space-between; }\n`;
    atomicCSS += `@utility ts-place-content-around  { place-content: space-around; }\n`;
    atomicCSS += `@utility ts-place-content-evenly  { place-content: space-evenly; }\n`;

    atomicCSS += `@utility ts-place-self-auto    { place-self: auto; }\n`;
    atomicCSS += `@utility ts-place-self-start   { place-self: start; }\n`;
    atomicCSS += `@utility ts-place-self-end     { place-self: end; }\n`;
    atomicCSS += `@utility ts-place-self-center  { place-self: center; }\n`;
    atomicCSS += `@utility ts-place-self-stretch { place-self: stretch; }\n`;

    atomicCSS += `@utility ts-w-full { width: 100%; }\n`;
    atomicCSS += `@utility ts-h-full { height: 100%; }\n`;
    atomicCSS += `@utility ts-w-1\\/4 { width: 25%; }\n`;
    atomicCSS += `@utility ts-w-1\\/3 { width: 33.333%; }\n`;
    atomicCSS += `@utility ts-w-2\\/5 { width: 40%; }\n`;
    atomicCSS += `@utility ts-w-1\\/2 { width: 50%; }\n`;
    atomicCSS += `@utility ts-w-3\\/5 { width: 60%; }\n`;
    atomicCSS += `@utility ts-w-2\\/3 { width: 66.667%; }\n`;
    atomicCSS += `@utility ts-w-3\\/4 { width: 75%; }\n`;
    atomicCSS += `@utility ts-w-4\\/5 { width: 80%; }\n`;

    atomicCSS += `@utility ts-overflow-hidden  { overflow: hidden; }\n`;
    atomicCSS += `@utility ts-overflow-visible { overflow: visible; }\n`;

    atomicCSS += `@utility ts-object-cover    { object-fit: cover; }\n`;
    atomicCSS += `@utility ts-object-contain  { object-fit: contain; }\n`;

    atomicCSS += `@utility ts-cursor-pointer     { cursor: pointer; }\n`;
    atomicCSS += `@utility ts-cursor-not-allowed { cursor: not-allowed; }\n`;
    atomicCSS += `@utility ts-select-none        { -webkit-user-select: none; user-select: none; }\n`;
    atomicCSS += `@utility ts-select-text        { -webkit-user-select: text; user-select: text; }\n`;
    atomicCSS += `@utility ts-select-all         { -webkit-user-select: all; user-select: all; }\n`;
    atomicCSS += `@utility ts-select-auto        { -webkit-user-select: auto; user-select: auto; }\n`;
    atomicCSS += `@utility ts-pointer-events-none { pointer-events: none; }\n`;

    for (const k of Object.keys(scales.opacities).filter((k) => /^\d+$/.test(k))) {
        atomicCSS += `@utility ts-opacity-${k} { opacity: var(--ts-opacity-${k}); }\n`;
    }

    atomicCSS += `@utility ts-isolate        { isolation: isolate; }\n`;
    atomicCSS += `@utility ts-isolation-auto { isolation: auto; }\n`;

    atomicCSS += `@utility ts-order-first { order: -9999; }\n`;
    atomicCSS += `@utility ts-order-last  { order: 9999; }\n`;
    atomicCSS += `@utility ts-order-none  { order: 0; }\n`;
    for (let i = 1; i <= 12; i++) atomicCSS += `@utility ts-order-${i} { order: ${i}; }\n`;

    atomicCSS += `@utility ts-divide-y { & > * + * { border-top: var(--ts-border-width-1) solid var(--color-gray-200); } }\n`;
    atomicCSS += `@utility ts-divide-x { & > * + * { border-inline-start: var(--ts-border-width-1) solid var(--color-gray-200); } }\n`;

    const blurSteps = Object.keys(scales.blurs).filter((k) => k !== 'none');
    for (const k of blurSteps) {
        atomicCSS += `@utility ts-backdrop-blur-${k} { -webkit-backdrop-filter: blur(var(--ts-blur-${k})); backdrop-filter: blur(var(--ts-blur-${k})); }\n`;
    }
    atomicCSS += `@utility ts-backdrop-blur-none { -webkit-backdrop-filter: none; backdrop-filter: none; }\n`;

    for (const k of blurSteps) {
        atomicCSS += `@utility ts-blur-${k} { filter: blur(var(--ts-blur-${k})); }\n`;
    }
    atomicCSS += `@utility ts-blur-none { filter: none; }\n`;

    atomicCSS += `@utility ts-bg-glow-brand  { background-image: radial-gradient(circle, var(--color-brand-600) 0%, transparent 70%); }\n`;
    atomicCSS += `@utility ts-bg-glow-accent { background-image: radial-gradient(circle, var(--color-accent-600) 0%, transparent 70%); }\n`;

    atomicCSS += `@utility ts-snap-x    { scroll-snap-type: x mandatory; }\n`;
    atomicCSS += `@utility ts-snap-y    { scroll-snap-type: y mandatory; }\n`;
    atomicCSS += `@utility ts-snap-both { scroll-snap-type: both mandatory; }\n`;
    atomicCSS += `@utility ts-snap-none { scroll-snap-type: none; }\n`;
    atomicCSS += `@utility ts-snap-start      { scroll-snap-align: start; }\n`;
    atomicCSS += `@utility ts-snap-center     { scroll-snap-align: center; }\n`;
    atomicCSS += `@utility ts-snap-end        { scroll-snap-align: end; }\n`;
    atomicCSS += `@utility ts-snap-align-none { scroll-snap-align: none; }\n`;

    atomicCSS += `@utility ts-accent-brand  { accent-color: var(--color-brand-solid); }\n`;
    atomicCSS += `@utility ts-accent-accent { accent-color: var(--color-accent-solid); }\n`;
    atomicCSS += `@utility ts-accent-auto   { accent-color: auto; }\n`;

    for (const i of [2, 3, 4]) atomicCSS += `@utility ts-columns-${i} { columns: ${i}; }\n`;

    atomicCSS += `@utility ts-will-change-auto      { will-change: auto; }\n`;
    atomicCSS += `@utility ts-will-change-transform { will-change: transform; }\n`;
    atomicCSS += `@utility ts-will-change-scroll    { will-change: scroll-position; }\n`;

    atomicCSS += `@utility ts-relative { position: relative; }\n`;
    atomicCSS += `@utility ts-absolute { position: absolute; }\n`;
    for (const k of Object.keys(spaces)) {
        const val = `var(--ts-space-${k})`;
        atomicCSS += `@utility ts-top-${k} { top: ${val}; }\n`;
        atomicCSS += `@utility ts-right-${k} { inset-inline-end: ${val}; }\n`;
        atomicCSS += `@utility ts-bottom-${k} { bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-left-${k} { inset-inline-start: ${val}; }\n`;
    }
    for (const k of Object.keys(scales.sizing)) {
        const val = `var(--ts-sizing-${k})`;
        atomicCSS += `@utility ts-top-${k} { top: ${val}; }\n`;
        atomicCSS += `@utility ts-right-${k} { inset-inline-end: ${val}; }\n`;
        atomicCSS += `@utility ts-bottom-${k} { bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-left-${k} { inset-inline-start: ${val}; }\n`;
    }

    atomicCSS += `@utility ts-border-none     { border: none; }\n`;
    atomicCSS += `@utility ts-outline-none    { outline: none; }\n`;
    atomicCSS += `@utility ts-bg-transparent  { background: transparent; }\n`;
    atomicCSS += `@utility ts-bg-white { background-color: var(--color-white); }\n`;
    atomicCSS += `@utility ts-bg-black { background-color: var(--color-black); }\n`;
    atomicCSS += `@utility ts-color-white { color: var(--color-white); }\n`;
    atomicCSS += `@utility ts-color-black { color: var(--color-black); }\n`;
    atomicCSS += `@utility ts-appearance-none { appearance: none; -webkit-appearance: none; }\n`;

    for (const k of Object.keys(radius)) {
        const forma = k === 'none' || k === 'full' ? 'round' : 'var(--ts-corner-shape)';
        atomicCSS += `@utility ts-radius-${k} { border-radius: var(--ts-radius-${k}); corner-shape: ${forma}; }\n`;
    }

    for (const k of Object.keys(scales.shadows)) atomicCSS += `@utility ts-shadow-${k} { box-shadow: var(--ts-shadow-${k}); }\n`;

    for (const k of Object.keys(gaps)) {
        atomicCSS += `@utility ts-gap-${k}   { gap: var(--ts-gap-${k}); }\n`;
        atomicCSS += `@utility ts-gap-x-${k} { column-gap: var(--ts-gap-${k}); }\n`;
        atomicCSS += `@utility ts-gap-y-${k} { row-gap: var(--ts-gap-${k}); }\n`;
    }

    for (const k of Object.keys(spaces)) {
        const val = `var(--ts-space-${k})`;
        atomicCSS += `@utility ts-p-${k} { padding: ${val}; }\n`;
        atomicCSS += `@utility ts-px-${k} { padding-inline: ${val}; }\n`;
        atomicCSS += `@utility ts-py-${k} { padding-top: ${val}; padding-bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-pt-${k} { padding-top: ${val}; }\n`;
        atomicCSS += `@utility ts-pr-${k} { padding-inline-end: ${val}; }\n`;
        atomicCSS += `@utility ts-pb-${k} { padding-bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-pl-${k} { padding-inline-start: ${val}; }\n`;
        atomicCSS += `@utility ts-m-${k} { margin: ${val}; }\n`;
        atomicCSS += `@utility ts-mx-${k} { margin-inline: ${val}; }\n`;
        atomicCSS += `@utility ts-my-${k} { margin-top: ${val}; margin-bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-mt-${k} { margin-top: ${val}; }\n`;
        atomicCSS += `@utility ts-mr-${k} { margin-inline-end: ${val}; }\n`;
        atomicCSS += `@utility ts-mb-${k} { margin-bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-ml-${k} { margin-inline-start: ${val}; }\n`;

        const negVal = `calc(var(--ts-space-${k}) * -1)`;
        atomicCSS += `@utility ts-m-${k}-negative { margin: ${negVal}; }\n`;
        atomicCSS += `@utility ts-mx-${k}-negative { margin-inline: ${negVal}; }\n`;
        atomicCSS += `@utility ts-my-${k}-negative { margin-top: ${negVal}; margin-bottom: ${negVal}; }\n`;
        atomicCSS += `@utility ts-mt-${k}-negative { margin-top: ${negVal}; }\n`;
        atomicCSS += `@utility ts-mr-${k}-negative { margin-inline-end: ${negVal}; }\n`;
        atomicCSS += `@utility ts-mb-${k}-negative { margin-bottom: ${negVal}; }\n`;
        atomicCSS += `@utility ts-ml-${k}-negative { margin-inline-start: ${negVal}; }\n`;
    }

    for (const k of Object.keys(scales.sizing)) {
        const val = `var(--ts-sizing-${k})`;
        atomicCSS += `@utility ts-p-${k} { padding: ${val}; }\n`;
        atomicCSS += `@utility ts-px-${k} { padding-inline: ${val}; }\n`;
        atomicCSS += `@utility ts-py-${k} { padding-top: ${val}; padding-bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-pt-${k} { padding-top: ${val}; }\n`;
        atomicCSS += `@utility ts-pr-${k} { padding-inline-end: ${val}; }\n`;
        atomicCSS += `@utility ts-pb-${k} { padding-bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-pl-${k} { padding-inline-start: ${val}; }\n`;
        atomicCSS += `@utility ts-m-${k} { margin: ${val}; }\n`;
        atomicCSS += `@utility ts-mx-${k} { margin-inline: ${val}; }\n`;
        atomicCSS += `@utility ts-my-${k} { margin-top: ${val}; margin-bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-mt-${k} { margin-top: ${val}; }\n`;
        atomicCSS += `@utility ts-mr-${k} { margin-inline-end: ${val}; }\n`;
        atomicCSS += `@utility ts-mb-${k} { margin-bottom: ${val}; }\n`;
        atomicCSS += `@utility ts-ml-${k} { margin-inline-start: ${val}; }\n`;
        atomicCSS += `@utility ts-gap-${k} { gap: ${val}; }\n`;
        atomicCSS += `@utility ts-gap-x-${k} { column-gap: ${val}; }\n`;
        atomicCSS += `@utility ts-gap-y-${k} { row-gap: ${val}; }\n`;
        atomicCSS += `@utility ts-h-${k} { height: ${val}; }\n`;
        atomicCSS += `@utility ts-w-${k} { width: ${val}; }\n`;
        atomicCSS += `@utility ts-size-${k} { width: ${val}; height: ${val}; }\n`;
        atomicCSS += `@utility ts-min-h-${k} { min-height: ${val}; }\n`;
        atomicCSS += `@utility ts-min-w-${k} { min-width: ${val}; }\n`;
        atomicCSS += `@utility ts-max-h-${k} { max-height: ${val}; }\n`;
        atomicCSS += `@utility ts-max-w-${k} { max-width: ${val}; }\n`;

        if (k !== '0') {
            const negVal = `calc(var(--ts-sizing-${k}) * -1)`;
            atomicCSS += `@utility ts-m-${k}-negative { margin: ${negVal}; }\n`;
            atomicCSS += `@utility ts-mx-${k}-negative { margin-inline: ${negVal}; }\n`;
            atomicCSS += `@utility ts-my-${k}-negative { margin-top: ${negVal}; margin-bottom: ${negVal}; }\n`;
            atomicCSS += `@utility ts-mt-${k}-negative { margin-top: ${negVal}; }\n`;
            atomicCSS += `@utility ts-mr-${k}-negative { margin-inline-end: ${negVal}; }\n`;
            atomicCSS += `@utility ts-mb-${k}-negative { margin-bottom: ${negVal}; }\n`;
            atomicCSS += `@utility ts-ml-${k}-negative { margin-inline-start: ${negVal}; }\n`;
        }
    }

    for (const [pName, p] of Object.entries(vocabularyColors)) {
        for (const shade of Object.keys(p as Record<string, string>)) {
            if (shade.includes('-')) continue;
            atomicCSS += `@utility ts-bg-${pName}-${shade} { background-color: var(--color-${pName}-${shade}); }\n`;
            atomicCSS += `@utility ts-color-${pName}-${shade} { color: var(--color-${pName}-${shade}); }\n`;
            if (`${shade}-contrast` in p) atomicCSS += `@utility ts-color-${pName}-${shade}-contrast { color: var(--color-${pName}-${shade}-contrast); }\n`;
            atomicCSS += `@utility ts-border-${pName}-${shade} { border: var(--ts-bw, var(--ts-border-width-1)) solid var(--color-${pName}-${shade}); }\n`;
            atomicCSS += `@utility ts-border-b-${pName}-${shade} { border-bottom: var(--ts-bw, var(--ts-border-width-1)) solid var(--color-${pName}-${shade}); }\n`;
            atomicCSS += `@utility ts-border-t-${pName}-${shade} { border-top: var(--ts-bw, var(--ts-border-width-1)) solid var(--color-${pName}-${shade}); }\n`;
            atomicCSS += `@utility ts-border-s-${pName}-${shade} { border-inline-start: var(--ts-bw, var(--ts-border-width-1)) solid var(--color-${pName}-${shade}); }\n`;
            atomicCSS += `@utility ts-border-e-${pName}-${shade} { border-inline-end: var(--ts-bw, var(--ts-border-width-1)) solid var(--color-${pName}-${shade}); }\n`;
            atomicCSS += `@utility ts-outline-${pName}-${shade} { outline: var(--ts-border-width-2) solid var(--color-${pName}-${shade}); }\n`;
            atomicCSS += `@utility ts-outline-focus-${pName}-${shade} { outline: var(--ts-border-width-2) solid var(--color-${pName}-${shade}); }\n`;
            atomicCSS += `@utility ts-ring-${pName}-${shade} { --ts-ring-c: var(--color-${pName}-${shade}); box-shadow: 0 0 0 var(--ts-ring-w, var(--ts-border-width-1)) var(--ts-ring-c); }\n`;
            atomicCSS += `@utility ts-ring-shadow-sm-${pName}-${shade} { box-shadow: 0 0 0 var(--ts-border-width-1) var(--color-${pName}-${shade}), var(--ts-shadow-sm); }\n`;
        }
    }
    for (const [pName, p] of Object.entries(vocabularyColors)) {
        if (!('500-contrast' in p)) continue;
        for (const v of ['solid', 'solid-hover', 'solid-active']) {
            atomicCSS += `@utility ts-bg-${pName}-${v} { background-color: var(--color-${pName}-${v}); }\n`;
            atomicCSS += `@utility ts-color-${pName}-${v}-contrast { color: var(--color-${pName}-${v}-contrast); }\n`;
        }
        atomicCSS += `@utility ts-outline-${pName}-solid { outline: var(--ts-border-width-2) solid var(--color-${pName}-solid); }\n`;
        atomicCSS += `@utility ts-focus-ring-${pName} { --_focus: var(--color-${pName}-500); }\n`;
    }
    for (const v of ['solid', 'solid-hover', 'solid-active']) {
        atomicCSS += `@utility ts-bg-primary-${v} { background-color: var(--color-primary-${v}); }\n`;
        atomicCSS += `@utility ts-color-primary-${v}-contrast { color: var(--color-primary-${v}-contrast); }\n`;
    }
    atomicCSS += `@utility ts-outline-primary-solid { outline: var(--ts-border-width-2) solid var(--color-primary-solid); }\n`;
    atomicCSS += `@utility ts-focus-ring-primary { --_focus: var(--color-primary-solid); }\n`;
    for (const k of Object.keys(scales.borderWidths)) {
        const w = `var(--ts-border-width-${k})`;
        atomicCSS += `@utility ts-border-${k} { --ts-bw: ${w}; border-style: solid; border-width: ${w}; }\n`;
        for (const [l, prop] of [['t', 'top'], ['b', 'bottom'], ['s', 'inline-start'], ['e', 'inline-end']])
            atomicCSS += `@utility ts-border-${l}-${k} { border-${prop}-width: ${w}; }\n`;
        atomicCSS += `@utility ts-ring-${k} { --ts-ring-w: ${w}; box-shadow: 0 0 0 var(--ts-ring-w) var(--ts-ring-c, currentColor); }\n`;
    }
    atomicCSS += `@utility ts-outline-transparent { outline: var(--ts-border-width-2) solid transparent; }\n`;
    atomicCSS += `@utility ts-outline-4-transparent { outline: var(--ts-border-width-4) solid transparent; }\n`;

    atomicCSS += `@utility ts-mx-auto { margin-inline: auto; }\n`;
    atomicCSS += `@utility ts-my-auto { margin-top: auto; margin-bottom: auto; }\n`;
    atomicCSS += `@utility ts-pt-safe { padding-top: env(safe-area-inset-top, 0px); }\n`;
    atomicCSS += `@utility ts-pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }\n`;
    atomicCSS += `@utility ts-pl-safe { padding-inline-start: env(safe-area-inset-left, 0px); &:where(:dir(rtl)) { padding-inline-start: env(safe-area-inset-right, 0px); } }\n`;
    atomicCSS += `@utility ts-pr-safe { padding-inline-end: env(safe-area-inset-right, 0px); &:where(:dir(rtl)) { padding-inline-end: env(safe-area-inset-left, 0px); } }\n`;
    atomicCSS += `@utility ts-mt-auto { margin-top: auto; }\n`;
    atomicCSS += `@utility ts-mb-auto { margin-bottom: auto; }\n`;
    atomicCSS += `@utility ts-ml-auto { margin-inline-start: auto; }\n`;
    atomicCSS += `@utility ts-mr-auto { margin-inline-end: auto; }\n`;
    atomicCSS += `@utility ts-m-auto  { margin: auto; }\n`;

    atomicCSS += `@utility ts-fixed  { position: fixed; }\n`;
    atomicCSS += `@utility ts-sticky { position: sticky; }\n`;
    atomicCSS += `@utility ts-inset-0   { inset: 0px; }\n`;
    atomicCSS += `@utility ts-inset-x-0 { inset-inline: 0px; }\n`;
    atomicCSS += `@utility ts-inset-y-0 { top: 0px; bottom: 0px; }\n`;

    for (let z = 0; z <= 50; z += 10) {
        atomicCSS += `@utility ts-z-${z} { z-index: ${z}; }\n`;
    }
    atomicCSS += `@utility ts-z-auto { z-index: auto; }\n`;

    atomicCSS += `@utility ts-text-left   { text-align: start; }\n`;
    atomicCSS += `@utility ts-text-center { text-align: center; }\n`;
    atomicCSS += `@utility ts-text-right  { text-align: end; }\n`;

    atomicCSS += `@utility ts-uppercase   { text-transform: uppercase; }\n`;
    atomicCSS += `@utility ts-lowercase   { text-transform: lowercase; }\n`;
    atomicCSS += `@utility ts-capitalize  { text-transform: capitalize; }\n`;
    atomicCSS += `@utility ts-normal-case { text-transform: none; }\n`;

    atomicCSS += `@utility ts-whitespace-nowrap   { white-space: nowrap; }\n`;
    atomicCSS += `@utility ts-whitespace-normal   { white-space: normal; }\n`;
    atomicCSS += `@utility ts-whitespace-pre      { white-space: pre; }\n`;
    atomicCSS += `@utility ts-whitespace-pre-wrap { white-space: pre-wrap; }\n`;
    atomicCSS += `@utility ts-whitespace-pre-line { white-space: pre-line; }\n`;

    atomicCSS += `@utility ts-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n`;

    for (const n of [1, 2, 3, 4]) {
        atomicCSS += `@utility ts-line-clamp-${n} { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${n}; }\n`;
    }
    atomicCSS += `@utility ts-line-clamp-none { overflow: visible; display: block; -webkit-box-orient: horizontal; -webkit-line-clamp: unset; }\n`;

    atomicCSS += `@utility ts-break-words  { overflow-wrap: break-word; }\n`;
    atomicCSS += `@utility ts-break-all    { word-break: break-all; }\n`;
    atomicCSS += `@utility ts-break-normal { overflow-wrap: normal; word-break: normal; }\n`;

    atomicCSS += `@utility ts-text-balance { text-wrap: balance; }\n`;
    atomicCSS += `@utility ts-text-pretty  { text-wrap: pretty; }\n`;
    atomicCSS += `@utility ts-text-nowrap  { text-wrap: nowrap; }\n`;

    atomicCSS += `@utility ts-italic     { font-style: italic; }\n`;
    atomicCSS += `@utility ts-not-italic { font-style: normal; }\n`;

    atomicCSS += `@utility ts-underline    { text-decoration: underline; }\n`;
    atomicCSS += `@utility ts-line-through { text-decoration: line-through; }\n`;
    atomicCSS += `@utility ts-no-underline { text-decoration: none; }\n`;

    atomicCSS += `@utility ts-tabular-nums { font-variant-numeric: tabular-nums; }\n`;

    atomicCSS += `@utility ts-leading-none  { line-height: 1; }\n`;
    atomicCSS += `@utility ts-leading-tight { line-height: 1.25; }\n`;

    atomicCSS += `@utility ts-transition-colors    { transition: ${tr('background-color')}, ${tr('color')}; }\n`;
    atomicCSS += `@utility ts-transition-all       { transition: ${tr('background-color')}, ${tr('color')}, ${tr('box-shadow')}, ${tr('transform', 'instant')}; }\n`;
    atomicCSS += `@utility ts-transition-opacity   { transition: ${tr('opacity')}; }\n`;
    atomicCSS += `@utility ts-transition-shadow    { transition: ${tr('box-shadow')}; }\n`;
    atomicCSS += `@utility ts-transition-transform { transition: ${tr('transform', 'instant')}; }\n`;
    atomicCSS += `@utility ts-transition-width     { transition: ${tr('inline-size', 'slow')}; }\n`;
    atomicCSS += `@utility ts-transition-none      { transition: none; }\n`;
    atomicCSS += `@utility ts-transition-input     { transition: ${tr('box-shadow')}, ${tr('outline')}, ${tr('outline-offset')}; }\n`;
    atomicCSS += `@utility ts-transition-option    { transition: ${tr('background-color', 'instant')}, ${tr('color', 'instant')}; }\n`;

    for (const k of Object.keys(scales.durations)) atomicCSS += `@utility ts-duration-${k} { transition-duration: var(--ts-duration-${k}); }\n`;
    for (const k of Object.keys(scales.easings)) atomicCSS += `@utility ts-ease-${k} { transition-timing-function: var(--ts-ease-${k}); }\n`;

    atomicCSS += `@utility ts-overflow-auto      { overflow: auto; }\n`;
    atomicCSS += `@utility ts-overflow-scroll    { overflow: scroll; }\n`;
    atomicCSS += `@utility ts-overflow-x-hidden  { overflow-x: hidden; }\n`;
    atomicCSS += `@utility ts-overflow-x-auto    { overflow-x: auto; }\n`;
    atomicCSS += `@utility ts-overflow-y-hidden  { overflow-y: hidden; }\n`;
    atomicCSS += `@utility ts-overflow-y-auto    { overflow-y: auto; }\n`;

    atomicCSS += `@utility ts-w-auto { width: auto; }\n`;
    atomicCSS += `@utility ts-h-auto { height: auto; }\n`;
    atomicCSS += `@utility ts-w-screen { width: 100vw; }\n`;
    atomicCSS += `@utility ts-h-screen { height: 100vh; }\n`;
    atomicCSS += `@utility ts-w-fit { width: fit-content; }\n`;
    atomicCSS += `@utility ts-h-fit { height: fit-content; }\n`;
    atomicCSS += `@utility ts-min-w-full { min-width: 100%; }\n`;
    atomicCSS += `@utility ts-min-h-full { min-height: 100%; }\n`;
    atomicCSS += `@utility ts-max-w-full { max-width: 100%; }\n`;
    atomicCSS += `@utility ts-max-h-full { max-height: 100%; }\n`;
    atomicCSS += `@utility ts-min-h-screen { min-height: 100vh; }\n`;
    atomicCSS += `@utility ts-max-w-modal-sm { max-width: calc(var(--ts-sizing-192) * 2); }\n`;
    atomicCSS += `@utility ts-max-w-modal-md { max-width: calc(var(--ts-sizing-128) * 4); }\n`;
    atomicCSS += `@utility ts-max-w-modal-lg { max-width: calc(var(--ts-sizing-160) * 4); }\n`;

    for (const k of Object.keys(screens)) atomicCSS += `@utility ts-max-w-screen-${k} { max-width: var(--ts-screen-${k}); }\n`;

    atomicCSS += `@utility ts-valign-middle   { vertical-align: middle; }\n`;
    atomicCSS += `@utility ts-valign-top      { vertical-align: top; }\n`;
    atomicCSS += `@utility ts-valign-bottom   { vertical-align: bottom; }\n`;
    atomicCSS += `@utility ts-valign-baseline { vertical-align: baseline; }\n`;

    atomicCSS += `@utility ts-aspect-square { aspect-ratio: 1 / 1; }\n`;
    atomicCSS += `@utility ts-aspect-video  { aspect-ratio: 16 / 9; }\n`;
    atomicCSS += `@utility ts-aspect-auto   { aspect-ratio: auto; }\n`;

    atomicCSS += `@utility ts-border-transparent { border: var(--ts-bw, var(--ts-border-width-1)) solid transparent; }\n`;
    atomicCSS += `@utility ts-border-separator { border-bottom: var(--ts-border-width-1) solid var(--color-gray-200); }\n`;
    atomicCSS += `@utility ts-border-b-2-transparent { border-bottom: var(--ts-border-width-2) solid transparent; }\n`;
    atomicCSS += `@utility ts-border-b-2-gray-1000 { border-bottom: var(--ts-border-width-2) solid var(--color-gray-1000); }\n`;
    atomicCSS += `@utility ts-border-b-0 { border-bottom: 0; }\n`;
    atomicCSS += `@utility ts-border-r-2-transparent { border-inline-end: var(--ts-border-width-2) solid transparent; }\n`;
    atomicCSS += `@utility ts-border-r-2-gray-1000 { border-inline-end: var(--ts-border-width-2) solid var(--color-gray-1000); }\n`;
    atomicCSS += `@utility ts-shadow-none { box-shadow: none; }\n`;
    atomicCSS += `@utility ts-px-0-important { padding-inline: 0 !important; }\n`;

    atomicCSS += `@utility ts-radius-tl-inherit { border-start-start-radius: inherit; corner-shape: inherit; }\n`;
    atomicCSS += `@utility ts-radius-bl-inherit { border-end-start-radius: inherit; corner-shape: inherit; }\n`;
    atomicCSS += `@utility ts-radius-tr-inherit { border-start-end-radius: inherit; corner-shape: inherit; }\n`;
    atomicCSS += `@utility ts-radius-br-inherit { border-end-end-radius: inherit; corner-shape: inherit; }\n`;
    atomicCSS += `@utility ts-radius-l-inherit  { border-start-start-radius: inherit; border-end-start-radius: inherit; corner-shape: inherit; }\n`;
    atomicCSS += `@utility ts-radius-r-inherit  { border-start-end-radius: inherit; border-end-end-radius: inherit; corner-shape: inherit; }\n`;

    atomicCSS += `@utility ts-inline   { display: inline; }\n`;
    atomicCSS += `@utility ts-contents { display: contents; }\n`;
    atomicCSS += `@utility ts-flex-col-reverse { flex-direction: column-reverse; }\n`;
    atomicCSS += `@utility ts-flex-row-reverse { flex-direction: row-reverse; }\n`;
    atomicCSS += `@utility ts-flex-nowrap      { flex-wrap: nowrap; }\n`;
    atomicCSS += `@utility ts-place-content-start    { place-content: start; }\n`;
    atomicCSS += `@utility ts-place-content-end      { place-content: end; }\n`;
    atomicCSS += `@utility ts-place-content-stretch  { place-content: stretch; }\n`;
    atomicCSS += `@utility ts-antialiased { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }\n`;
    atomicCSS += `@utility ts-tap-highlight-none { -webkit-tap-highlight-color: transparent; }\n`;
    atomicCSS += `@utility ts-font-inherit { font: inherit; }\n`;
    atomicCSS += `@utility ts-list-none { list-style: none; }\n`;
    atomicCSS += `@utility ts-required-indicator { color: var(--color-danger-600); margin-inline-start: var(--ts-sizing-2); }\n`;
    atomicCSS += `@utility ts-box-border { box-sizing: border-box; }\n`;
    atomicCSS += `@utility ts-outline-offset-0 { outline-offset: 0px; }\n`;
    atomicCSS += `@utility ts-outline-offset-1 { outline-offset: var(--ts-sizing-1); }\n`;
    atomicCSS += `@utility ts-outline-offset-2 { outline-offset: var(--ts-sizing-2); }\n`;
    atomicCSS += `@utility ts-focus-ring { ${DECLARACIONES_FOCO} }\n`;
    atomicCSS += `@utility ts-focus-ring-inset { ${DECLARACIONES_FOCO_INSET} }\n`;
    const cajaDeCampo = (hover: string, foco: string) =>
        `--_f-ring: var(--color-grayAlpha-200); --_f-ring-hover: var(--color-grayAlpha-300); outline: none; box-shadow: 0 0 0 var(--ts-border-width-1) var(--_f-ring); &[class]:is([aria-invalid="true"], :has([aria-invalid="true"])) { ${tonoDeCampo('danger')} } &:hover${hover} { --_f-ring: var(--_f-ring-hover); } ${foco} { @apply ts-focus-ring; } @media (forced-colors: active) { outline: var(--ts-border-width-1) solid CanvasText; }`;
    atomicCSS += `@utility ts-field-box { ${cajaDeCampo(':not(:focus-within):not(.is-open):not(.is-disabled):not(.is-readonly)', '&:focus-within, &.is-open')} }\n`;
    atomicCSS += `@utility ts-field-box-trigger { ${cajaDeCampo(':not(:disabled):not(.is-open)', '&.is-open, &:focus-visible')} }\n`;
    atomicCSS += `@utility ts-option-row { @apply ts-w-full ts-px-half ts-py-quarter ts-border-none ts-bg-transparent ts-cursor-pointer ts-radius-md; }\n`;
    atomicCSS += `@utility ts-focus-ring-thumb { box-shadow: ${SOMBRA_FOCO}; }\n`;
    atomicCSS += `@utility ts-disabled { @apply ts-opacity-50 ts-cursor-not-allowed; }\n`;
    atomicCSS += `@utility ts-disabled-flat { @apply ts-cursor-not-allowed; }\n`;
    atomicCSS += `@utility ts-popover-reset { border: 0; margin: 0; }\n`;
    atomicCSS += `@utility ts-pointer-events-auto { pointer-events: auto; }\n`;
    atomicCSS += `@utility ts-cursor-default { cursor: default; }\n`;
    atomicCSS += `@utility ts-cursor-wait    { cursor: wait; }\n`;
    atomicCSS += `@utility ts-cursor-col-resize { cursor: col-resize; }\n`;
    atomicCSS += `@utility ts-cursor-row-resize { cursor: row-resize; }\n`;
    atomicCSS += `@utility ts-cursor-ew-resize { cursor: ew-resize; }\n`;
    atomicCSS += `@utility ts-cursor-ns-resize { cursor: ns-resize; }\n`;
    atomicCSS += `@utility ts-cursor-nwse-resize { cursor: nwse-resize; }\n`;
    atomicCSS += `@utility ts-cursor-nesw-resize { cursor: nesw-resize; }\n`;
    atomicCSS += `@utility ts-cursor-grab       { cursor: grab; }\n`;
    atomicCSS += `@utility ts-cursor-grabbing   { cursor: grabbing; }\n`;
    atomicCSS += `@utility ts-cursor-cell-select { cursor: cell; }\n`;
    atomicCSS += `@utility ts-invisible { visibility: hidden; }\n`;
    atomicCSS += `@utility ts-visible   { visibility: visible; }\n`;
    atomicCSS += `@utility ts-scale-60  { transform: scale(0.6); }\n`;
    atomicCSS += `@utility ts-scale-95  { transform: scale(0.95); }\n`;
    atomicCSS += `@utility ts-scale-100 { transform: scale(1); }\n`;
    atomicCSS += `@utility ts-scale-var { transform: scale(var(--ts-scale, 1)); }\n`;
    atomicCSS += `@utility ts-origin-top-left { transform-origin: top left; }\n`;
    atomicCSS += `@utility ts-translate-y-1 { transform: translateY(1px); }\n`;
    atomicCSS += `@utility ts-rotate-180 { transform: rotate(180deg); }\n`;
    atomicCSS += `@utility ts-animate-spin { animation: ts-spin var(--ts-duration-spin) var(--ts-ease-linear) infinite; }\n`;
    for (const k of Object.keys(scales.sizing)) {
        const val = `var(--ts-sizing-${k})`;
        atomicCSS += `@utility ts-translate-x-${k} { transform: translateX(${val}); }\n`;
    }

    atomicCSS += `@utility ts-bg-highlight { background-color: var(--ts-color-highlight); }\n`;
    atomicCSS += `@utility ts-bg-highlight-strong { background-color: var(--ts-color-highlight-strong); }\n`;
    atomicCSS += `@utility ts-scheme-light { color-scheme: light; color: var(--color-gray-1000); }\n`;
    atomicCSS += `@utility ts-scheme-dark { color-scheme: dark; color: var(--color-gray-1000); }\n`;
    atomicCSS += `@utility ts-list-disc { list-style: disc; }\n`;


    return atomicCSS;
}
