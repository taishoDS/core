// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { migrarClasesTailwind, crearTraductorTailwind, type Convertida, type NoConvertida } from './migrar-tailwind';
import { construirMapa, vigentesDe } from './tailwind-map';
import { leerEmitidos } from './naming-emitidos';
import { escalasDe } from './naming-table';
import { buildVocabularyColors } from '../config/scales';
import { userColors, userStates, userGridMins } from '../config/taisho.user';
import { textoMotivo, textoNotas } from '../generate-cli/mensajes-avisos';

const emitidos = leerEmitidos();
const mapa = construirMapa({
    vigentes: vigentesDe(emitidos.todos, emitidos.aliases),
    esc: escalasDe({ gridMins: Object.keys(userGridMins) }),
    familias: Object.keys(buildVocabularyColors(userColors, userStates)),
});
const traducir = crearTraductorTailwind({ mapa, esComponente: (b) => b === 'button' });
const ok = (c: string) => traducir(c) as Convertida;
const no = (c: string) => traducir(c) as NoConvertida;
const nota = (c: string) => textoNotas(ok(c).notas ?? [], 'es');

describe('migrador Tailwind: variantes 1:1', () => {
    it.each([
        ['hover:underline', 'hover:underline'],
        ['focus:underline', 'focus:underline'],
        ['focus-visible:underline', 'focus-visible:underline'],
        ['active:underline', 'active:underline'],
        ['disabled:opacity-50', 'disabled:opacity-50'],
        ['checked:underline', 'checked:underline'],
        ['invalid:underline', 'invalid:underline'],
        ['aria-expanded:underline', 'aria-expanded:underline'],
        ['aria-invalid:underline', 'aria-invalid:underline'],
        ['data-open:underline', 'data-open:underline'],
        ['print:hidden', 'print:hidden'],
        ['md:flex', 'md:flex'],
        ['@2xl:flex', '@2xl:flex'],
        ['@7xl:flex', '@7xl:flex'],
        ['group-hover:underline', 'group-hover:underline'],
        ['group-hover/menu:underline', 'group-hover/menu:underline'],
        ['peer-checked:underline', 'peer-checked:underline'],
        ['md:hover:p-4', 'md:hover:p-16'],
        ['max-md:hidden', 'max-md:hidden'],
        ['max-md:hover:p-4', 'max-md:hover:p-16'],
        ['hover:bg-gray-500', 'hover:bg-gray-500'],
        ['hover:text-gray-500', 'hover:color-gray-500'],
        ['pl-4', 'ps-16'],
    ])('%s → %s', (origen, scope) => {
        const r = ok(origen);
        expect(r.scope).toBe(scope);
        expect(r.taisho).toBe(scope.replace(/(^|:)([^:]+)$/, '$1ts-$2'));
    });

    it('los marcadores pasan tal cual y @container es cq', () => {
        expect(ok('group').scope).toBe('group');
        expect(ok('group/menu')).toMatchObject({ scope: 'group/menu', taisho: 'group/menu' });
        expect(ok('peer').scope).toBe('peer');
        expect(ok('@container')).toMatchObject({ scope: 'cq', taisho: 'ts-cq' });
    });

    it('las cadenas se reordenan a la forma canónica', () => {
        expect(ok('hover:md:p-4').scope).toBe('md:hover:p-16');
        expect(ok('hover:print:hidden').scope).toBe('print:hover:hidden');
        expect(ok('hover:group-hover:md:p-4').scope).toBe('md:group-hover:hover:p-16');
        expect(ok('hover:md:p-4').origen).toBe('hover:md:p-4');
    });

    it('disabled lleva la nota de que es más amplio', () => {
        expect(nota('disabled:opacity-50')).toMatch(/aria-disabled/);
    });

    it('un color dice que la paleta es otra', () => {
        expect(ok('hover:bg-gray-500')).toMatchObject({ exacta: false });
        expect(nota('hover:bg-gray-500')).toMatch(/color no/);
    });
});

describe('migrador Tailwind: lo que no se convierte, con motivo', () => {
    it.each([
        ['dark:bg-gray-500', 'variant', /oscuro sale del tema/],
        ['data-[state=open]:underline', 'variant', /arbitrario/],
        ['aria-[sort=ascending]:underline', 'variant', /arbitrario/],
        ['has-[:checked]:underline', 'variant', /arbitrario/],
        ['has-checked:underline', 'variant', /has-/],
        ['not-hover:underline', 'variant', /not-/],
        ['first:underline', 'variant', /estructurales/],
        ['odd:underline', 'variant', /estructurales/],
        ['focus-within:underline', 'variant', /focus-within/],
        ['group-focus-within:underline', 'variant', /focus-within/],
        ['motion-reduce:flex', 'variant', /motion/],
        ['supports-[display:grid]:flex', 'variant', /arbitrario/],
        ['2xl:flex', 'variant', /extend\.screens/],
        ['max-2xl:flex', 'variant', /extend\.screens/],
        ['md:max-xl:flex', 'chain', /forma canónica/],
        ['data-ts-open:underline', 'variant', /gancho/],
        ['placeholder:underline', 'variant', /vocabulario/],
        ['group-open:underline', 'variant', /vocabulario/],
        ['hover:focus:underline', 'chain', /forma canónica/],
        ['md:lg:flex', 'chain', /forma canónica/],
        ['group-hover:peer-checked:underline', 'chain', /forma canónica/],
        ['p-4!', 'important', /important/],
        ['hover:!p-4', 'important', /important/],
        ['hover:p-[13px]', 'base', /valor arbitrario/],
        ['hover:bg-gray-500/50', 'base', /modificador de opacidad/],
        ['hover:bg-red-950', 'base', /se suma una semilla `red`/],
        ['bg-blue-500', 'base', /se suma una semilla `blue`/],
        ['text-blue-600', 'base', /se suma una semilla `blue`/],
        ['bg-gray-950', 'base', /escalón 950/],
        ['border-0', 'base', /border-none/],
        ['border-8', 'base', /1 a 4/],
        ['border-t', 'base', /un solo lado/],
        ['border-x', 'base', /un solo lado|eje/],
        ['bg-white', 'base', /background-100/],
        ['text-white', 'base', /color-gray-1000/],
        ['transition', 'base', /transition-colors/],
        ['ring', 'base', /ring-1/],
        ['ring-8', 'base', /1 a 4/],
        ['ring-blue-500', 'base', /se suma una semilla `blue`/],
        ['ring-inset', 'base', /ring-inset/],
        ['space-y-4', 'base', /gap-\*/],
        ['outline-hidden', 'base', /outline-none/],
        ['mt-auto', 'base', /ms-auto/],
        ['hover:foo-bar', 'base', /no tiene equivalente/],
        ['hover:button', 'component', /sólo a utilidades/],
        ['hover:group', 'base', /marcador/],
    ])('%s → %s', (origen, tipo, motivo) => {
        const r = no(origen);
        expect(r.tipo).toBe(tipo);
        expect(textoMotivo(r.motivo, 'es')).toMatch(motivo);
        expect(r.origen).toBe(origen);
    });

    it('gap-4 (16px) va exacto a gap-16, también con variantes y los ejes', () => {
        expect(ok('gap-4')).toMatchObject({ scope: 'gap-16', exacta: true });
        expect(ok('md:gap-x-8')).toMatchObject({ scope: 'md:gap-x-32', exacta: true });
        expect(ok('hover:gap-y-2')).toMatchObject({ scope: 'hover:gap-y-8', exacta: true });
    });

    it('mx-auto, m-auto y rounded convierten', () => {
        expect(ok('mx-auto')).toMatchObject({ scope: 'mx-auto', exacta: true });
        expect(ok('hover:m-auto')).toMatchObject({ scope: 'hover:m-auto', exacta: true });
        expect(ok('rounded')).toMatchObject({ scope: 'radius-sm', exacta: true });
    });

    it('border-<familia>-<n> avisa que dibuja el borde', () => {
        expect(ok('border-gray-300')).toMatchObject({ scope: 'border-gray-300', exacta: false });
        expect(nota('border-gray-300')).toMatch(/1px sólido/);
    });

    it('una familia de color con guion convierte si el mapa la trae', () => {
        const conGuion = { ...mapa, colores: { ...mapa.colores, familiasCompartidas: [...mapa.colores.familiasCompartidas, 'brand-secondary'] } };
        expect(crearTraductorTailwind({ mapa: conGuion })('bg-brand-secondary-500')).toMatchObject({ scope: 'bg-brand-secondary-500', exacta: false });
    });

    it('una pantalla del config del consumidor sí pasa', () => {
        const t = crearTraductorTailwind({ mapa, screens: { sm: '640px', '2xl': '1536px' } });
        expect(t('2xl:flex')).toMatchObject({ scope: '2xl:flex' });
    });

    it('ninguna clase desaparece: convertidas + noConvertidas = la entrada', () => {
        const entrada = [
            'flex', 'hover:underline', 'dark:flex', 'md:hover:p-4', 'p-[1px]', 'hover:md:p-4', 'group', 'peer-checked:underline', 'has-[a]:flex',
            'focus:hover:underline', 'foo-bar', 'hover:foo-bar', 'p-4!', '@container', '@md:flex', 'data-[x]:flex', '2xl:flex',
        ];
        const r = migrarClasesTailwind(entrada, { mapa });
        expect(r.convertidas.length + r.noConvertidas.length).toBe(entrada.length);
        expect([...r.convertidas, ...r.noConvertidas].map((x) => x.origen).sort()).toEqual([...entrada].sort());
    });
});

describe('migrador Tailwind: lo que el CSS sí emite se convierte (border-N, ring-N, transition-*, ms/me-auto)', () => {
    it.each([
        ['border', 'border-1', true],
        ['border-2', 'border-2', true],
        ['border-4', 'border-4', true],
        ['ring-2', 'ring-2', false],
        ['ring-4', 'ring-4', false],
        ['transition-colors', 'transition-colors', false],
        ['transition-all', 'transition-all', false],
        ['transition-opacity', 'transition-opacity', false],
        ['transition-none', 'transition-none', false],
        ['ms-auto', 'ms-auto', true],
        ['me-auto', 'me-auto', true],
        ['ml-auto', 'ms-auto', true],
        ['mr-auto', 'me-auto', true],
        ['outline-none', 'outline-none', true],
        ['hover:ring-2', 'hover:ring-2', false],
        ['ring-gray-500', 'ring-gray-500', false],
    ])('%s → %s', (origen, scope, exacta) => {
        const r = ok(origen);
        expect(r.scope).toBe(scope);
        expect(r.exacta).toBe(exacta);
    });

    it('lo que dejan distinto lo dicen las notas', () => {
        expect(nota('transition-colors')).toMatch(/150ms/);
        expect(nota('ring-2')).toMatch(/box-shadow/);
        expect(nota('outline-none')).toMatch(/foco/);
        expect(nota('ml-auto')).toMatch(/lado lógico/);
    });
});
