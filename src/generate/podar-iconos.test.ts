// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { compile, CLASES_DEL_JS } from './compile';
import { buildRepoConfig } from '../config/pipeline';
import type { TaishoConfig } from './vocabulary';

const config: TaishoConfig = buildRepoConfig();
const demanda = (html: string, extra: Partial<TaishoConfig> = {}) =>
    compile({ ...config, ...extra }, [{ file: 'a.html', content: html }], { onDemand: true }).css;
const tamanos = (css: string) => [...new Set([...css.matchAll(/\.icon-(\d+)\b/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
const TODOS = tamanos(compile(config, []).css);

describe('Icon: los tamaños a demanda', () => {
    it('sale sólo el tamaño que el proyecto nombra; el archivo completo los trae todos', () => {
        expect(TODOS.length).toBeGreaterThan(30);
        expect(tamanos(demanda('<svg class="ts icon icon-24"></svg>'))).toEqual([24]);
        expect(tamanos(demanda('<svg class="ts icon icon-24"></svg><svg class="ts icon icon-48"></svg>'))).toEqual([24, 48]);
    });

    it('una clase armada en runtime (`icon-${n}`) trae todos los tamaños', () => {
        expect(tamanos(demanda('<svg class={`ts icon icon-${size}`}></svg>'))).toEqual(TODOS);
    });

    it('el número suelto cuenta: el `size={20}` de un componente y el `width` del SVG', () => {
        expect(tamanos(demanda('<svg class="ts icon"></svg><Icon name="x" size={20} />'))).toEqual([20]);
        expect(tamanos(demanda('<svg class="ts icon" width="32" height="32"></svg>'))).toEqual([32]);
    });

    it('los íconos que escribe el JS del Core entran con su componente', () => {
        expect(tamanos(demanda('<div class="ts" data-ts-toast-region></div>'))).toContain(14);
        expect(tamanos(demanda('<input class="ts input" data-x="markInvalid">'))).toContain(14);
    });

    it('cada `icon-N` que escribe el JS del Core está declarado', () => {
        const dir = path.resolve(__dirname, '../lib/core');
        const archivos = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts') && !f.includes('.test.'));
        const declaradas = new Set([...Object.values(CLASES_DEL_JS).flat(), 'icon-14' /* markInvalid, en compile.ts */]);
        const sinDeclarar = archivos.flatMap((f) =>
            [...readFileSync(path.join(dir, f), 'utf8').matchAll(/\bicon-\d+\b/g)].map((m) => m[0]).filter((c) => !declaradas.has(c)).map((c) => `${f}: ${c}`));
        expect(sinDeclarar).toEqual([]);
        expect(readFileSync(path.join(dir, 'toast.ts'), 'utf8')).toContain('icon-14');
    });
});

describe('Icon: el safelist acepta un tamaño', () => {
    it('`icon-48` en el safelist entra aunque el código no lo nombre', () => {
        const css = compile({ ...config, safelist: ['icon-48'] }, [{ file: 'a.html', content: '<svg class="ts icon"></svg>' }], { onDemand: true }).css;
        expect(tamanos(css)).toEqual([48]);
    });
    it('un tamaño que no existe sigue siendo un error del safelist', () => {
        expect(() => compile({ ...config, safelist: ['icon-47'] }, [], { onDemand: true })).toThrow(/icon-47/);
    });
});
