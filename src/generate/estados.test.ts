// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { sinNot, tieneMarcaDeEstado, tipoDeEstado } from './estados';

describe('estados: marcas de la lista cerrada', () => {
    it.each([
        '&:hover', '&:active', '&:focus', '&:focus-visible', '&:focus-within', '&:disabled', '&:checked', '&:indeterminate', '&:invalid', '&:user-invalid',
        '&:read-only', '&:popover-open', '&:modal', '&:open', ':root:has(&:modal)', '&[open]', '&[aria-disabled="true"]', '&[aria-invalid]', '&[aria-checked]', '&[aria-selected]',
        '&[aria-pressed]', '&[aria-expanded]', '&[aria-current]', '&[aria-busy="true"]',
        '&.is-disabled', '&.is-checked', '&.is-indeterminate', '&.is-open', '&.is-active', '&.is-selected', '&.is-current', '&.is-focused', '&.is-readonly',
        '&.is-invalid', '&.is-error', '&.is-loading', '&.is-today', '&.is-in-range', '&.is-range-start', '&.is-range-preview', '&.is-dragging', '&.is-over',
        '&.is-moving', '&.is-editing', '&.is-committing', '&.is-unsaved-pending', '&.is-unsaved-error', '&.is-collapsed',
        '&.variant-primary:hover:not(:disabled)', '& .x:has(:focus-visible)',
    ])('%s es un estado', (selector) => {
        expect(tieneMarcaDeEstado(selector)).toBe(true);
    });

    it.each([
        '&', '&.variant-primary', '&.size-md', '&.is-card', '&.is-compact', '&.is-sticky', '&.is-pinned-start', '&.is-opening', '&.is-visible', '&[aria-label]', '&[data-open]',
        '&:focus-ring', '&:hover-x', '&:not(:hover)', '&:not(.is-disabled)', '&:not(:disabled):not(.is-checked)', '&.is-icon-only',
    ])('%s es reposo', (selector) => {
        expect(tieneMarcaDeEstado(selector)).toBe(false);
    });

    it('las marcas dentro de :not() no cuentan, las de afuera sí', () => {
        expect(sinNot('&:hover:not(:disabled, :is(.a, .b)):focus')).toBe('&:hover:focus');
        expect(tieneMarcaDeEstado('&:not(:is(:hover, :focus)).x')).toBe(false);
        expect(tieneMarcaDeEstado('&:not(.a):hover')).toBe(true);
    });

    it('hover y active se distinguen del resto (son los que leen canales)', () => {
        expect(tipoDeEstado('&.variant-x:hover:not(:disabled)')).toBe('hover');
        expect(tipoDeEstado('&:active:not(:disabled)')).toBe('active');
        expect(tipoDeEstado('&:focus-visible')).toBe('otro');
        expect(tipoDeEstado('&:not(:hover)')).toBe('otro');
    });
});
