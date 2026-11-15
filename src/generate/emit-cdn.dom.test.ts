// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { partirFull, separarItems } from './emit-cdn';
import type { ComponentManifest } from './emit-manifest';
import { compile } from './compile';
import { SLUGS_DEL_CORE } from './slugs-core';
import { buildRepoConfig } from '../config/pipeline';

const raiz = path.resolve(__dirname, '../..');
const full = compile(buildRepoConfig(), []).css;
const manifiesto: ComponentManifest = JSON.parse(fs.readFileSync(path.join(raiz, 'src/lib/css/manifiesto-componentes.json'), 'utf8'));
const partes = partirFull(full, manifiesto, [...SLUGS_DEL_CORE]);

const reglasDe = (css: string) =>
    separarItems(css)
        .filter((capa) => /^@layer (?!base )[\w-]+ \{\n/.test(capa))
        .flatMap((capa) => separarItems(capa.slice(capa.indexOf('{\n') + 2, capa.lastIndexOf('\n}'))))
        .filter((i) => i.startsWith(':where(.ts)'));
function aplicadas(css: string | string[], html: string): string[] {
    document.body.innerHTML = html;
    const els = [...document.body.querySelectorAll('*')];
    return [css].flat().flatMap(reglasDe).filter((r) => {
        const sel = r.slice(0, r.indexOf('{')).trim();
        return els.some((e) => e.matches(sel));
    });
}

describe('CDN sin componentes — base + button equivale a full', () => {
    const html = `<div class="ts flex gap-half items-center flex-wrap">
        <button type="button" class="ts button size-md variant-primary"><span data-ts-content="">Guardar</span></button>
        <button type="button" class="ts button size-sm variant-secondary shape-pill w-full" disabled>Cancelar</button>
        <div class="ts button-group"><button class="ts button size-lg variant-ghost">Uno</button></div>
    </div>`;

    it('las reglas que le aplican son las mismas', () => {
        const delFull = aplicadas(full, html);
        const partido = aplicadas([partes.base, partes.porComponente['button']], html);
        expect(delFull.some((r) => r.startsWith(':where(.ts).button'))).toBe(true);
        expect(delFull.some((r) => r.startsWith(':where(.ts).flex'))).toBe(true);
        expect([...partido].sort()).toEqual([...delFull].sort());
    });

    it('sin el archivo del componente, el botón queda sin estilo propio', () => {
        expect(aplicadas(partes.base, html).some((r) => r.startsWith(':where(.ts).button'))).toBe(false);
    });
});
