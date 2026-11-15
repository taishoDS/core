import { describe, expect, expectTypeOf, it } from 'vitest';
import { avisar } from './dom';
import { emitir, type TsChangeDetail, type TsCommitDetail, type TsDebouncedInputDetail } from './eventos';

const CLAVES: Array<[keyof TsChangeDetail, unknown]> = [
    ['component', 'x'],
    ['value', 'v'],
    ['selection', ['a']],
    ['files', []],
    ['text', 't'],
    ['query', 'q'],
    ['key', 'k'],
    ['direction', 'asc'],
    ['page', 2],
    ['pageSize', 20],
    ['openItems', ['uno']],
    ['dismissed', true],
    ['index', 1],
    ['failed', true],
    ['name', 'n'],
    ['collapsed', true],
    ['open', false],
    ['start', '2026-07-01'],
    ['end', '2026-07-02'],
];

describe('eventos públicos: el detail trae sólo las claves en inglés', () => {
    it.each(CLAVES)('ts:change %s', (clave, valor) => {
        const el = document.createElement('div');
        let detalle: TsChangeDetail | undefined;
        el.addEventListener('ts:change', (e) => (detalle = e.detail));
        avisar(el, { component: 'x', [clave]: valor } as unknown as TsChangeDetail);
        expect(detalle![clave]).toBe(valor);
        expect(Object.keys(detalle!)).toEqual(clave === 'component' ? ['component'] : ['component', clave]);
    });

    it('ts:commit y ts:debouncedinput llevan sólo las claves en inglés', () => {
        const el = document.createElement('div');
        const vistos: unknown[] = [];
        el.addEventListener('ts:commit', (e) => vistos.push(e.detail));
        el.addEventListener('ts:debouncedinput', (e) => vistos.push(e.detail));
        emitir(el, 'ts:commit', { component: 'slider', value: 5 });
        emitir(el, 'ts:debouncedinput', { value: 'hola' });
        expect(vistos).toEqual([{ component: 'slider', value: 5 }, { value: 'hola' }]);
    });

    it('las claves están tipadas', () => {
        expectTypeOf<TsChangeDetail['pageSize']>().toEqualTypeOf<number | undefined>();
        expectTypeOf<TsChangeDetail['direction']>().toEqualTypeOf<'asc' | 'desc' | undefined>();
        expectTypeOf<TsChangeDetail['files']>().toEqualTypeOf<File[] | undefined>();
        expectTypeOf<TsCommitDetail['value']>().toEqualTypeOf<number | [number, number]>();
        expectTypeOf<TsDebouncedInputDetail['value']>().toEqualTypeOf<string>();
    });
});
