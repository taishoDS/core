// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { migrarTexto, regionesExcluidas, fragmentosViejos, mapaDeTabla, tablaRenombres, renombrar, TOKEN_CLASE } from './naming-renames';
import { leerEmitidos } from './naming-emitidos';

const E = leerEmitidos();
const tabla = tablaRenombres(E.todos);
const mapa = mapaDeTabla(tabla);
const migrar = (t: string) => migrarTexto(t, mapa);
const tokens = (t: string) => t.match(TOKEN_CLASE) ?? [];

describe('TOKEN_CLASE', () => {
    it('no ve --ts-*, data-ts-*, ni ids con interpolación', () => {
        expect(tokens('var(--ts-text-left) data-ts-ml-half ts-modal-${uid}')).toEqual([]);
        expect(tokens('class="ts-gap-base md:ts-ml-half"')).toEqual(['ts-gap-base', 'ts-ml-half']);
        expect(tokens('.md\\:ts-ml-half { }')).toEqual(['ts-ml-half']);
    });
});

describe('migrarTexto', () => {
    it('reescribe class=, class:, variantes y @apply con la misma tabla', () => {
        const r = migrar('<p class="ts-text-left md:ts-ml-half @md:ts-text-heading-60" class:ts-text-center={x}></p>\n  @apply ts-text-label-14;');
        expect(r.texto).toBe('<p class="ts-align-start md:ts-ms-half @md:ts-type-heading-60" class:ts-align-center={x}></p>\n  @apply ts-type-label-14;');
        expect(r.cambios.map((c) => c.linea)).toEqual([1, 1, 1, 1, 2]);
    });

    it('no toca lo que no está en la tabla ni el productor', () => {
        const t = '--ts-text-left data-ts-ml-half ts-modal-${uid} ts-text-14 ts-text-heading-56\n@utility ts-ml-auto { margin: 0 }';
        const r = migrar(t);
        expect(r.texto).toBe(t);
        expect(r.posibles.map((p) => p.token)).toEqual(['ts-text-heading-56']);
    });

    it('respeta la región taisho:nombres-viejos', () => {
        const t = '<!-- taisho:nombres-viejos --> ts-text-left <!-- /taisho:nombres-viejos --> ts-text-left';
        const r = migrar(t);
        expect(r.texto).toBe('<!-- taisho:nombres-viejos --> ts-text-left <!-- /taisho:nombres-viejos --> ts-align-start');
        expect(r.saltados).toBe(1);
        expect(regionesExcluidas(t)).toHaveLength(1);
    });

    it('lista sin reescribir lo que no tiene sucesor', () => {
        const r = migrarTexto('a ts-color-btn b', mapaDeTabla([{ viejo: 'ts-color-btn', nuevo: null, regla: 'color-btn' }]));
        expect(r.texto).toBe('a ts-color-btn b');
        expect(r.sinSucesor).toEqual([{ linea: 1, viejo: 'ts-color-btn', regla: 'color-btn' }]);
    });

    it('idempotente: la segunda corrida es un no-op y ningún nuevo de la tabla es viejo', () => {
        const t = tabla.filter((r) => r.nuevo !== null).map((r) => `class="${r.viejo}"`).join('\n');
        const uno = migrar(t);
        expect(uno.cambios.length).toBe(tabla.filter((r) => r.nuevo !== null).length);
        expect(migrar(uno.texto).cambios).toEqual([]);
        expect(tabla.filter((r) => r.nuevo !== null && mapa.has(r.nuevo))).toEqual([]);
        expect(tabla.every((r) => r.nuevo === null || renombrar(r.nuevo) === null)).toBe(true);
    });
});

describe('fragmentosViejos', () => {
    const viejos = tabla.map((r) => r.viejo);
    it('reporta plantillas con prefijo viejo y deja las vigentes', () => {
        const t = 'a `ts-ml-${n}` b `ts-text-heading-${n}` c `${x}-negative` d `ts-text-${y}` e `ts-modal-${uid}` f `ts-gap-${g}`';
        expect(fragmentosViejos(t, viejos, [...E.todos, ...E.aliases]).map((f) => f.fragmento)).toEqual(['ts-ml-${', 'ts-text-heading-${', '}-negative']);
    });
});
