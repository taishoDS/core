// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import {
    COMPONENTES, escalasDe, prefijoMasLargo, raizComponente, validarAtomico, validarComponente, duplicados, esColor, modificadoresSueltos, cortosIgualesAModificadores,
} from './naming-table';

const esc = escalasDe({ gridMins: ['xs', 'sm', 'md', 'lg', 'xl', '2xs'] });
const fam = ['gray', 'grayAlpha', 'background', 'overlay', 'brand', 'success'];
const reglas = (n: string) => validarAtomico(n, esc, fam).map((v) => v.regla);

describe('prefijo más largo', () => {
    it('no corta por guiones', () => {
        expect(prefijoMasLargo('gap-x-half')).toBe('gap-x');
        expect(prefijoMasLargo('ring-shadow-sm-gray-100')).toBe('ring-shadow');
        expect(prefijoMasLargo('backdrop-blur-md')).toBe('backdrop-blur');
        expect(prefijoMasLargo('outline-offset-2')).toBe('outline-offset');
        expect(prefijoMasLargo('border-b-2-gray-100')).toBe('border-b');
        expect(prefijoMasLargo('inventado-1')).toBeUndefined();
    });
    it('componentes: select y file-upload son raíces', () => {
        expect(raizComponente('select-dropdown')).toBe('select');
        expect(raizComponente('file-upload-zone')).toBe('file-upload');
        expect(raizComponente('inline-code')).toBe('inline-code');
        expect(raizComponente('inventado')).toBeUndefined();
        expect(raizComponente('cursor-cell-select')).toBeUndefined();
        expect(prefijoMasLargo('overflow-x-auto')).toBe('overflow-x');
        expect(prefijoMasLargo('translate-y-1')).toBe('translate-y');
    });
});

describe('validarAtomico', () => {
    it('acepta nombres de la gramática nueva', () => {
        for (const n of [
            'ts-ms-neg-quarter', 'ts-mb-neg-1', 'ts-m-none', 'ts-align-start', 'ts-wrap-balance', 'ts-type-heading-14',
            'ts-border-e-gray-100', 'ts-border-b-2-gray-100', 'ts-outline-4-transparent', 'ts-radius-ss-inherit',
            'ts-ring-shadow-sm-gray-100', 'ts-text-14', 'ts-flex', 'ts-hidden', 'ts-w-1/4', 'ts-bg-grayAlpha-100',
            'ts-color-grayAlpha-100-contrast', 'ts-grid-min-md', 'ts-z-10', 'ts-border-separator',
        ]) expect(reglas(n), n).toEqual([]);
    });
    it('marca lado físico, -negative, -important y texto viejo', () => {
        expect(reglas('ts-ml-half')).toContain('fisico');
        expect(reglas('ts-left-0')).toContain('fisico');
        expect(reglas('ts-border-r-gray-100')).toContain('fisico');
        expect(reglas('ts-radius-tl-inherit')).toContain('fisico');
        expect(reglas('ts-mt-1-negative')).toContain('negative');
        expect(reglas('ts-px-0-important')).toContain('important');
        expect(reglas('ts-text-left')).toEqual(['texto']);
        expect(reglas('ts-text-heading-14')).toEqual(['texto']);
    });
    it('los enteros de espaciado y px tienen que ser una entrada de sizing; conteo acepta cualquiera', () => {
        expect(reglas('ts-p-12')).toEqual([]);
        expect(reglas('ts-p-13')).toEqual(['valor']);
        expect(reglas('ts-w-50')).toEqual(['valor']);
        expect(reglas('ts-z-10')).toEqual([]);
        expect(reglas('ts-grid-cols-7')).toEqual([]);
    });
    it('ts-cursor-cell es el valor CSS; ts-cursor-cell-select queda como viejo; el eje de overflow y translate va en el prefijo', () => {
        expect(reglas('ts-cursor-cell')).toEqual([]);
        expect(reglas('ts-cursor-cell-select')).toEqual(['valor']);
        expect(reglas('ts-overflow-x-auto')).toEqual([]);
        expect(reglas('ts-overflow-x-scroll')).toEqual(['valor']);
        expect(reglas('ts-translate-x-8')).toEqual([]);
        expect(reglas('ts-outline-focus-gray-100')).toEqual(['alias']);
    });
    it('marca prefijo inventado y valor que no corresponde al tipo', () => {
        expect(reglas('ts-inventado-1')).toEqual(['prefijo']);
        expect(reglas('ts-radius-14')).toEqual(['valor']);
        expect(reglas('ts-weight-12')).toEqual(['valor']);
        expect(reglas('ts-ms-neg-nada')).toEqual(['valor']);
        expect(reglas('ts-p-neg-1')).toEqual(['valor']);
        for (const v of ['auto', 'none', '0']) expect(reglas(`ts-m-neg-${v}`), v).toEqual(['valor']);
        expect(reglas('ts-bg-mauve-100')).toEqual(['valor']);
    });
});

describe('validarComponente / unicidad / color', () => {
    it('raíz de componente', () => {
        expect(validarComponente('ts-datepicker-field')).toEqual([]);
        expect(validarComponente('ts-fantasma-x').map((v) => v.regla)).toEqual(['prefijo']);
    });
    it('una extensión suma sus raíces; sin ellas, la raíz es desconocida', () => {
        expect(validarComponente('ts-acme-card-title').map((v) => v.regla)).toEqual(['prefijo']);
        expect(validarComponente('ts-acme-card-title', [...COMPONENTES, 'acme-card'])).toEqual([]);
        expect(raizComponente('acme-card-title', ['acme-card'])).toBe('acme-card');
    });
    it('detecta duplicados', () => {
        expect(duplicados(['ts-a', 'ts-b', 'ts-a'])).toEqual([{ nombre: 'ts-a', veces: 2 }]);
    });
    it('esColor', () => {
        expect(esColor('gray-100', fam)).toBe(true);
        expect(esColor('gray-100-contrast', fam)).toBe(true);
        expect(esColor('mauve-100', fam)).toBe(false);
    });
});

describe('modificadoresSueltos', () => {
    const ut = (sel: string) => `@utility ts-x {\n  ${sel} { color: red; }\n}\n`;
    const motivos = (sel: string) => modificadoresSueltos(ut(sel)).map((m) => m.motivo);
    it('un modificador compuesto con la base está bien', () => {
        expect(motivos('&.size-sm')).toEqual([]);
        expect(motivos('&.is-steps [data-progress-step].is-filled')).toEqual([]);
        expect(motivos('& :where([data-progress-step]).is-filled')).toEqual([]);
        expect(motivos(':where(.ts-datepicker-field).size-sm > &')).toEqual([]);
        expect(motivos(':where(.ts-datepicker-trigger, .ts-datepicker-field).size-lg > &')).toEqual([]);
        expect(motivos('.ts-button.variant-primary')).toEqual([]);
        expect(motivos('& [data-avatar-media].is-loaded')).toEqual([]);
    });
    it('un modificador en un ancestro o un descendiente sin su base es suelto', () => {
        expect(motivos('.size-sm > &')).toEqual(['suelto']);
        expect(motivos('& .is-filled')).toEqual(['suelto']);
        expect(motivos('& .variant-success')).toEqual(['suelto']);
    });
    it('lo que está dentro de :not() nunca cuenta como base', () => {
        expect(motivos(':not(.ts-foo).size-sm')).toEqual(['suelto']);
        expect(motivos('&:not(.is-disabled)')).toEqual([]);
    });
    it('una clase sin ts- fuera de la lista cerrada es desconocida; .dark como ancestro no es modificador', () => {
        expect(motivos('&.foo-x')).toEqual(['desconocido']);
        expect(motivos('.dark &')).toEqual([]);
        expect(motivos('.dark & .foo')).toEqual(['desconocido']);
        expect(motivos('&.vertical')).toEqual([]);
        expect(motivos('&.placement-top')).toEqual([]);
    });
    it('informa utility y línea', () => {
        const r = modificadoresSueltos('@utility ts-a {\n  color: red;\n}\n@utility ts-b {\n  .size-sm > & { color: red; }\n}\n');
        expect(r).toMatchObject([{ utility: 'ts-b', linea: 5 }]);
    });
});

describe('cortosIgualesAModificadores', () => {
    const css = '@utility ts-table-th {\n  &.align-center { text-align: center; }\n  &.variant-primary {}\n  /* .is-x */\n}';
    it('un nombre corto vigente igual a un modificador usado es un choque', () => {
        expect(cortosIgualesAModificadores(['ts-align-center', 'ts-align-start', 'ts-button'], css)).toEqual(['align-center']);
    });
    it('un modificador que no se usa, o un corto que no es modificador, no cuentan', () => {
        expect(cortosIgualesAModificadores(['ts-is-x', 'ts-variant-secondary', 'ts-p-double'], css)).toEqual([]);
    });
});
