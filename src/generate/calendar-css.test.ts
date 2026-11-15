// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { DECLARACIONES_FOCO, DECLARACIONES_FOCO_INSET } from './foco';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(__dirname, '../lib/css/components.css'), 'utf8');

const utility = (name: string): string => {
    const m = css.match(new RegExp(`@utility ${name} \\{\\n([\\s\\S]*?)\\n\\}\\n`));
    if (!m) throw new Error(`No se emitió @utility ${name}`);
    return m[1];
};

describe('Calendar — CSS emitido', () => {
    it('los chevrones de navegación se espejan en RTL, como en Pager', () => {
        expect(utility('ts-calendar-nav')).toMatch(/\[dir="rtl"\] & svg \{ transform: scaleX\(-1\); \}/);
        expect(utility('ts-pager')).toContain('scaleX(-1)');
    });

    it('en forced-colors el día seleccionado, hoy y el foco usan colores de sistema', () => {
        const fc = utility('ts-calendar-day').match(/@media \(forced-colors: active\) \{([\s\S]*)\}/)?.[1];
        expect(fc).toBeTruthy();
        expect(fc).toMatch(/is-selected[^{]*\{[^}]*forced-color-adjust: none;[^}]*background-color: Highlight;[^}]*color: HighlightText/);
        expect(fc).toMatch(/is-today[^{]*\{[^}]*text-decoration: underline/);
        expect(fc).toMatch(/:focus-visible \{[^}]*outline: var\(--ts-border-width-2\) solid Highlight/);
        expect(fc).not.toMatch(/var\(--color-|oklch|#[0-9a-f]{3}/i);
    });

    it('el foco es el del DS (atómico): hacia adentro en los días (celdas pegadas), sin bordes; las flechas son el Button', () => {
        expect(utility('ts-calendar-day')).toMatch(/:focus-visible \{ @apply ts-focus-ring-inset; \}/);
        for (const nombre of ['ts-calendar-day']) expect(utility(nombre)).not.toMatch(/:focus-visible \{[^}]*border(?!-width)/);
        expect(utility('ts-calendar-day')).toMatch(/\.is-selected \{ --_focus: var\(--color-background-100\); \}/);
    });

    it('hoy lleva un punto bajo el número con currentColor (se invierte solo en oscuro y sobre la selección)', () => {
        const dia = utility('ts-calendar-day');
        expect(dia).toMatch(/\.is-today::after \{[^}]*content: '';[^}]*background-color: currentColor;/);
        expect(dia).toMatch(/\.is-today::after \{[^}]*@apply ts-absolute ts-size-4 ts-radius-full/);
        expect(dia).toMatch(/\.is-today::after \{[^}]*bottom: var\(--ts-sizing-4\)/);
        expect(dia.match(/\.is-today::after \{[^}]*\}/)?.[0]).not.toMatch(/oklch|#[0-9a-f]{3}|rgba?\(|\d+px/i);
        expect(dia).toMatch(/@apply [^;]*\bts-relative\b/);
    });

    it('en forced-colors hoy sigue subrayado (el punto es un fondo y se perdería) y el punto queda sobre la selección', () => {
        const fc = utility('ts-calendar-day').match(/@media \(forced-colors: active\) \{([\s\S]*)\}/)?.[1];
        expect(fc).toMatch(/is-today:not\(\.is-selected\)\)?[^{]*\{[^}]*text-decoration: underline/);
        expect(fc).toMatch(/is-today:not\(\.is-selected\)::after \{ display: none; \}/);
    });

    it('en forced-colors el foco (la utilidad del DS) es un outline de sistema', () => {
        expect(DECLARACIONES_FOCO).toContain('@media (forced-colors: active) { outline: var(--ts-border-width-2) solid Highlight; }');
        expect(DECLARACIONES_FOCO_INSET).toContain('@media (forced-colors: active) { outline: var(--ts-border-width-2) solid Highlight; }');
    });

    it('el tramo del rango es una franja de la escala (gris 200; vista previa gris 100), sin literales ni bordes', () => {
        const dia = utility('ts-calendar-day');
        expect(dia).toMatch(/\.is-in-range \{ @apply ts-bg-gray-200; \}/);
        expect(dia).toMatch(/\.is-range-preview \{ @apply ts-bg-gray-100; \}/);
        expect(dia).toMatch(/\.is-in-range, &\.is-range-preview \{ border-radius: 0; \}/);
        expect(dia).toMatch(/:is\(\.is-in-range, \.is-range-preview\):is\(:first-child, \.ts-calendar-week-number \+ \*\) \{ border-start-start-radius: var\(--ts-radius-md\)/);
        expect(dia).toMatch(/:is\(\.is-in-range, \.is-range-preview\):last-child \{ border-start-end-radius: var\(--ts-radius-md\)/);
        expect(dia).toMatch(/\.is-range-start:not\(\.is-range-end\):not\(:last-child\) \{ border-start-end-radius: 0;/);
        const bloque = dia.slice(dia.indexOf('.is-in-range, &.is-range-preview { border-radius'), dia.indexOf("&[aria-disabled='true']"));
        expect(bloque).not.toMatch(/oklch|#[0-9a-f]{3}|rgba?\(|\d+px|border:/i);
    });

    it('en forced-colors el tramo se marca con colores de sistema (franja arriba y abajo)', () => {
        const fc = utility('ts-calendar-day').match(/@media \(forced-colors: active\) \{([\s\S]*)\}/)?.[1];
        expect(fc).toMatch(/is-in-range, &\.is-range-preview \{[^}]*forced-color-adjust: none;[^}]*color: Highlight;[^}]*Highlight/);
    });
});
