// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { dividir, escribirPartes, leerPartes, type Parte } from './capa-estados.ts';
import { esEstadoPersistente, tieneMarcaDeEstado, tipoDeEstado } from './estados.ts';

/**
 * Canales: propiedades personalizadas internas (`@property`, `inherits: false`) con las que una utilidad suelta le dice
 * al estado del componente qué fondo y qué sombra lleva. Así la utilidad gana al reposo (capa `utilities` sobre `components`)
 * y el hover, el active y el foco siguen funcionando (capa `states`) sin que la utilidad los pise.
 * `--ts-fg` es el color de texto que el autor pidió con `color-*`: hover y active lo conservan en vez de volver al contraste del fondo.
 * Son contrato interno, no API: no se documentan ni se prometen.
 */
export const CANALES = ['--ts-bg-h', '--ts-bg-a', '--ts-on-bg', '--ts-on-bg-h', '--ts-on-bg-a', '--ts-fg', '--ts-sh'] as const;

const PASOS = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];

const GRIS_OSCURO = 'var(--color-gray-1000)';
const GRIS_CLARO = 'var(--color-gray-100)';

/**
 * Texto que va sobre un neutro de la escala (los neutros no traen `-contrast`). `gray-1000` y `gray-100` se invierten solos en
 * modo oscuro, así que un mismo par sirve en claro y en oscuro; `contrast.test.ts` mide el AA de cada uno.
 * `undefined`: ningún par llega a AA en los dos modos, y el componente conserva su color.
 */
export function textoSobreNeutro(familia: string, paso: string): string | undefined {
    const n = Number(paso);
    if (familia === 'background') return n === 100 || n === 200 ? GRIS_OSCURO : undefined;
    if (familia === 'gray') return n <= 600 ? GRIS_OSCURO : GRIS_CLARO;
    if (familia === 'grayAlpha') return n <= 600 ? GRIS_OSCURO : n >= 800 ? GRIS_CLARO : undefined;
    return undefined;
}

const NEUTROS = new Set(['gray', 'grayAlpha', 'background']);

const FONDO = /background-color:\s*var\(--color-([A-Za-z]+)-(\d+|solid)\)/;
const COLOR = /^\s*color:\s*([^;]+);\s*$/;
const SOMBRA = /box-shadow:\s*var\((--ts-shadow-[A-Za-z0-9-]+)\)/;

/** El texto que va sobre el fondo `<familia>-<paso>`: el `-contrast` de la paleta o el par del neutro; `undefined` si no hay. */
const textoSobre = (familia: string, paso: string, existe: (utilidad: string) => boolean): string | undefined =>
    NEUTROS.has(familia) ? textoSobreNeutro(familia, paso) : existe(`ts-color-${familia}-${paso}-contrast`) ? `var(--color-${familia}-${paso}-contrast)` : undefined;

/**
 * Declaraciones de canal que se suman a la regla de una utilidad suelta (`bg-*`, `surface-*`, `floating-*`, `shadow-*`).
 * Sólo en la regla suelta: nunca en el `@utility`, que otros bloques aplican con `@apply`.
 * `cuerpo` es el cuerpo ya expandido de la utilidad; `existe` dice si una utilidad está en el vocabulario.
 */
export function canalesDeUtilidad(nombre: string, cuerpo: string, existe: (utilidad: string) => boolean): string {
    let out = '';
    const fondo = /^ts-(bg|surface|floating)-/.test(nombre) ? FONDO.exec(cuerpo) : null;
    if (fondo) {
        const [, familia, paso] = fondo;
        const i = PASOS.indexOf(paso);
        const [hover, activo] = paso === 'solid' ? ['solid-hover', 'solid-active'] : [PASOS[Math.min(i + 1, 9)], PASOS[Math.min(i + 2, 9)]];
        const vista = (p: string, canal: string, sobre: string) => {
            if (!existe(`ts-bg-${familia}-${p}`)) return;
            out += `\n  ${canal}: var(--color-${familia}-${p});`;
            const texto = textoSobre(familia, p, existe);
            if (texto) out += `\n  ${sobre}: ${texto};`;
        };
        const texto = textoSobre(familia, paso, existe);
        if (texto) out += `\n  --ts-on-bg: ${texto};`;
        vista(hover, '--ts-bg-h', '--ts-on-bg-h');
        vista(activo, '--ts-bg-a', '--ts-on-bg-a');
    }
    const color = /^ts-color-/.test(nombre) ? COLOR.exec(cuerpo) : null;
    if (color) out += `\n  --ts-fg: ${color[1].trim()};`;
    const sombra = /^ts-(surface|floating|shadow)-/.test(nombre) ? SOMBRA.exec(cuerpo) : null;
    if (sombra) out += `\n  --ts-sh: var(${sombra[1]});`;
    return out;
}

/**
 * Lo que suma la regla de `hover:bg-*` (y `focus-visible:`, `group-hover:`…, las variantes de estado): el texto con el contraste del fondo nuevo,
 * salvo que el autor haya pedido un color con `color-*` (`--ts-fg`). Una `hover:color-*` va después en la misma capa y gana.
 * No declara canales: la regla de la variante de estado sigue siendo una sola regla con las declaraciones de la utilidad.
 */
export function textoDeFondoEnEstado(nombre: string, cuerpo: string, existe: (utilidad: string) => boolean): string {
    const fondo = /^ts-bg-/.test(nombre) ? FONDO.exec(cuerpo) : null;
    const texto = fondo && textoSobre(fondo[1], fondo[2], existe);
    return texto ? `\n  color: var(--ts-fg, ${texto});` : '';
}

/** El `@property` de cada canal que alguna regla emitida declara, más el respaldo de Firefox 125–127 (como el de `--ts-bw`). */
export function propiedadesDeCanales(css: string): string {
    const usados = CANALES.filter((c) => css.includes(`\n  ${c}:`));
    if (!usados.length) return '';
    return (
        usados.map((c) => `@property ${c} { syntax: '*'; inherits: false; }\n`).join('') +
        `@supports ((-moz-orient: inline) and (not (color: oklch(from red l c h)))) { *, ::before, ::after { ${usados.map((c) => `${c}: initial;`).join(' ')} } }\n`
    );
}

const DECLARACION = /^((?:\s|\/\*[\s\S]*?\*\/)*)([A-Za-z-]+)(\s*:\s*)([\s\S]*?)(\s*;?\s*)$/;
const PALABRAS_GLOBALES = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

const unSoloValor = (valor: string): boolean => {
    let prof = 0;
    for (const c of valor) {
        if (c === '(') prof++;
        else if (c === ')') prof--;
        else if (prof === 0 && /\s/.test(c)) return false;
    }
    return !PALABRAS_GLOBALES.has(valor);
};

const esFondo = (prop: string) => prop === 'background' || prop === 'background-color';

type Bloque = Extract<Parte, { cuerpo: Parte[] }>;
const esBloque = (p: Parte): p is Bloque => 'cuerpo' in p;
const esRegla = (p: Bloque) => !p.prelude.replace(/\/\*[\s\S]*?\*\//g, '').trim().startsWith('@');

function declaraciones(b: Bloque) {
    return b.cuerpo.flatMap((p) => {
        if (esBloque(p)) return [];
        const m = DECLARACION.exec(p.texto);
        return m ? [{ parte: p, antes: m[1], prop: m[2], sep: m[3], valor: m[4], fin: m[5] }] : [];
    });
}

function reescribir(b: Bloque, ...pares: Array<[prop: (p: string) => boolean, canales: string[]]>) {
    for (const d of declaraciones(b)) {
        for (const [esProp, canales] of pares) {
            if (!esProp(d.prop) || !unSoloValor(d.valor)) continue;
            const leido = canales.reduceRight((resto, canal) => `var(${canal}, ${resto})`, d.valor);
            d.parte.texto = `${d.antes}${d.prop}${d.sep}${leido}${d.fin}`;
        }
    }
}

/** Reposo: el texto de una regla que pone fondo y color toma el color que la utilidad de fondo declaró (`--ts-on-bg`). */
function colorQueSigueAlFondo(partes: readonly Parte[]) {
    for (const p of partes) {
        if (!esBloque(p)) continue;
        if (esRegla(p) && declaraciones(p).some((d) => esFondo(d.prop))) reescribir(p, [(prop) => prop === 'color', ['--ts-on-bg']]);
        colorQueSigueAlFondo(p.cuerpo);
    }
}

/** Estados: el fondo de hover y active lee el canal; el color, el que pidió el autor (`--ts-fg`) o el contraste del tono siguiente. Los estados persistentes no se tocan. */
function fondoDeHoverYActive(partes: readonly Parte[], cadena = '') {
    for (const p of partes) {
        if (!esBloque(p)) continue;
        const selector = p.prelude.replace(/\/\*[\s\S]*?\*\//g, '').trim();
        const conjunto = esRegla(p) ? `${cadena} ${selector}` : cadena;
        if (esRegla(p) && tieneMarcaDeEstado(selector)) {
            const tipo = tipoDeEstado(conjunto);
            if (tipo === 'otro') continue;
            const sufijo = tipo === 'hover' ? 'h' : 'a';
            const conFondo = declaraciones(p).some((d) => esFondo(d.prop));
            const textoPedido = esEstadoPersistente(conjunto) ? [] : ['--ts-fg'];
            reescribir(p, [esFondo, [`--ts-bg-${sufijo}`]], ...(conFondo ? ([[(prop: string) => prop === 'color', [...textoPedido, `--ts-on-bg-${sufijo}`]]] as Array<[(p: string) => boolean, string[]]>) : []));
            continue;
        }
        fondoDeHoverYActive(p.cuerpo, conjunto);
    }
}

/** `partirEstados` más la lectura de canales: es lo que emite el generador para cada componente. */
export function partirConCanales(regla: string): { reposo: string; estados: string } {
    const d = dividir(leerPartes(regla));
    colorQueSigueAlFondo(d.reposo);
    fondoDeHoverYActive(d.estados);
    return { reposo: escribirPartes(d.reposo), estados: escribirPartes(d.estados) };
}
