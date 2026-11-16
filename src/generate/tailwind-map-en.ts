// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
type Regla = [RegExp, string | ((...m: string[]) => string)];

const REGLAS: Regla[] = [
    [
        /^En Tailwind el número de una medida es un paso de (\d+px) \(w-64 = 16rem = (\d+px) con 1rem = (\d+px)\); en TaishoDS es el valor en px \(ts-w-64 = 64px\)\. Por eso la tabla se arma por el valor en px y no por el número, y la columna `nota` de cada medida dice los dos\.$/,
        'In Tailwind, the number in a size class is a $1 step (w-64 = 16rem = $2 at 1rem = $3). In TaishoDS it’s the value in px (ts-w-64 = 64px). That’s why the table is built from the px value, not the number, and the note on each size row shows both.',
    ],
    [
        /^El nombre coincide, el color no: la paleta de TaishoDS sale de las semillas de tu tema \(OKLCH\), no de la de Tailwind\. Conviene revisar el resultado a ojo\.$/,
        'The name matches, the color doesn’t. The TaishoDS palette comes from your theme’s seeds (OKLCH), not from Tailwind’s. Check the result by eye.',
    ],
    [/^(.+)\. (palabra de ritmo: .+)$/, (_, a, b) => `${ingles(a)}. ${ingles(b)}`],
    [/^palabra de ritmo: baja con `compact` \(para este prefijo no hay clase en px\)$/, 'rhythm word—shrinks with `compact` (this prefix has no px class)'],
    [/^lado lógico: sigue el sentido de lectura \(RTL\); el de Tailwind es físico$/, 'logical side—follows the reading direction (RTL); Tailwind’s is physical'],
    [/^(\S+) sin unidad$/, '$1, unitless'],
    [
        /^Tailwind fija también el interlineado; en TaishoDS es `ts-leading-\*` o el compuesto `ts-type-copy-N`$/,
        'Tailwind also sets the line height; in TaishoDS that’s `ts-leading-*` or the composite `ts-type-copy-N`',
    ],
    [/^fluido: crece con el viewport hasta (\d+px)\. (.+)$/, (_, px, resto) => `fluid—grows with the viewport up to ${px}. ${ingles(resto)}`],
    [
        /^a (start|end): sigue el sentido de lectura \(RTL\); `([\w-]+)` es físico y el valor calculado es otro \(`(\w+)` \/ `(\w+)`\)$/,
        'to $1—follows the reading direction (RTL); `$2` is physical and the computed value differs (`$3` / `$4`)',
    ],
    [
        /^el mismo resultado visual \(una píldora o un círculo\), otro valor: Tailwind usa `calc\(infinity \* 1px\)` y TaishoDS 9999px$/,
        'same visual result (a pill or a circle), different value—Tailwind uses `calc(infinity * 1px)` and TaishoDS 9999px',
    ],
    [/^el nombre cambia: (\S+) es (\d+px) y en TaishoDS es (\S+)$/, 'renamed—$1 is $2, and in TaishoDS it’s $3'],
    [/^el nombre cambia: (\d+ms) es (\S+)$/, 'renamed—$1 is $2'],
    [
        /^el porcentaje de TaishoDS está redondeado a tres decimales \(([\d.]+%)\); el de Tailwind es exacto \((`[^`]+`)\): menos de ([\d.]+px) de diferencia$/,
        'TaishoDS rounds the percentage to three decimals ($1); Tailwind’s is exact ($2)—less than $3 apart',
    ],
    [
        /^en TaishoDS el número es el tamaño de texto al que acompaña \((\d+)\), no los px: el interlineado es (\d+px)$/,
        'in TaishoDS the number is the text size it goes with ($1), not px—the line height is $2',
    ],
    [
        /^la misma intención, otra pila: la de Tailwind es la del sistema; la de TaishoDS empieza por la fuente de tu tema$/,
        'same intent, different stack—Tailwind’s is the system stack; TaishoDS’s starts with your theme’s font',
    ],
    [
        /^la misma intención, otra pila: la de Tailwind es la del sistema; la de TaishoDS empieza por la fuente mono de tu tema$/,
        'same intent, different stack—Tailwind’s is the system stack; TaishoDS’s starts with your theme’s mono font',
    ],
    [/^misma intención, otra sombra: la de TaishoDS incluye el anillo de 1px del material$/, 'same intent, different shadow—the TaishoDS one includes the material’s 1px ring'],
    [
        /^mismo efecto \(fuera de la vista, legible por un lector de pantalla\), otra implementación: Tailwind recorta con `clip-path`, TaishoDS con `clip` y sin borde$/,
        'same effect (off-screen, readable by a screen reader), different implementation—Tailwind clips with `clip-path`, TaishoDS with `clip` and no border',
    ],
    [
        /^mismo efecto \(deshace `sr-only`, p\. ej\. con `focus:`\), otra implementación: Tailwind restablece con `clip-path: none`, TaishoDS con `clip: auto`$/,
        'same effect (undoes `sr-only`, e.g. with `focus:`), different implementation—Tailwind resets with `clip-path: none`, TaishoDS with `clip: auto`',
    ],
    [
        /^además del color dibuja el borde: 1px sólido \(`border-gray-200` de Tailwind sólo pinta el color y necesita `border` para verse\)$/,
        'besides the color, it draws the border—1px solid (Tailwind’s `border-gray-200` only sets the color and needs `border` to show)',
    ],
    [/^([\w-]+): no hay clase en px ni paso de ritmo para este prefijo$/, '$1: no px class or rhythm step for this prefix'],
    [
        /^([\w-]+): no hay clase en px; sólo los pasos de ritmo \((.+)\), y ninguno vale lo mismo que ese paso de Tailwind$/,
        '$1: no px class, only the rhythm steps ($2), and none matches that Tailwind step',
    ],
    [/^(\d+px) no está en la escala de medidas \(sizing\)$/, '$1 isn’t on the sizing scale'],
    [/^(\d+px) no está en la escala de radios$/, '$1 isn’t on the radius scale'],
    [/^(\d+px) no está en la escala de texto \((.+)\)$/, '$1 isn’t on the text scale ($2)'],
    [/^interlineado de (\d+px) no está en la escala$/, 'a $1 line height isn’t on the scale'],
    [/^interlineado sin unidad: sólo existen `none` y `tight`$/, 'unitless line height—only `none` and `tight` exist'],
    [/^opacidad (\d+) no está en la escala \((.+)\)$/, 'opacity $1 isn’t on the scale ($2)'],
    [/^peso (\d+) no está en la escala$/, 'weight $1 isn’t on the scale'],
    [/^(\S+) no está en la escala de tracking$/, '$1 isn’t on the tracking scale'],
    [/^(\d+ms) no está en la escala de duraciones$/, '$1 isn’t on the duration scale'],
    [/^esa curva de easing no está en la escala$/, 'that easing curve isn’t on the scale'],
    [/^blur de (\d+px) no está en la escala$/, 'a $1 blur isn’t on the scale'],
    [/^esa sombra no existe en la escala de TaishoDS \((.+)\)$/, 'that shadow isn’t on the TaishoDS scale ($1)'],
    [/^la clase de TaishoDS no está emitida \(su vocabulario es más corto que el de Tailwind\)$/, 'the TaishoDS class isn’t emitted (its vocabulary is smaller than Tailwind’s)'],
    [/^la clase de TaishoDS no está emitida$/, 'the TaishoDS class isn’t emitted'],
    [
        /^white, black, current e inherit no son colores del tema \(el color sale de las semillas\): para una superficie, `bg-background-100` o un gris de la escala \(`bg-gray-100`…`bg-gray-1000`\); para el texto, `color-gray-1000` o el color del tema$/,
        'white, black, current, and inherit aren’t theme colors (color comes from the seeds). For a surface, use `bg-background-100` or a gray from the scale (`bg-gray-100`…`bg-gray-1000`); for text, `color-gray-1000` or the theme color',
    ],
    [/^el corte (\w+) no está en las pantallas del Core; se agrega con extend\.screens$/, 'the $1 breakpoint isn’t one of Core’s screens; add it with extend.screens'],
    [
        /^valores arbitrarios: el vocabulario es cerrado\. La escotilla es un token del config \(taisho\.user\.ts\) o una utilidad propia en `utilities`$/,
        'arbitrary values—the vocabulary is closed. The way out is a token in your config (taisho.config.ts) or your own utility in `utilities`',
    ],
    [
        /^variantes fuera de la lista cerrada: las de estado que existen son hover, focus, focus-visible, active, disabled, checked, invalid, group-\*, peer-\*, aria-<estado>, data-<nombre> \(sólo presencia\) y print; para lo demás, una clase propia en tu CSS$/,
        'variants outside the closed list. The state variants that exist are hover, focus, focus-visible, active, disabled, checked, invalid, group-*, peer-*, aria-<state>, data-<name> (presence only), and print; for anything else, your own class in your CSS',
    ],
    [
        /^no hay variante `dark:`: el oscuro sale del tema \(`light-dark\(\)`, `createTheme`\), no de una clase por elemento$/,
        'there’s no `dark:` variant. Dark mode comes from the theme (`light-dark()`, `createTheme`), not from a class on each element',
    ],
    [/^no existen; se reemplazan por `gap-\*` en el contenedor flex\/grid$/, 'they don’t exist; use `gap-*` on the flex/grid container instead'],
    [
        /^el ancho `border-N` \(1 a 4\) dibuja los cuatro lados y `border-none` lo quita: no hay `border-0` ni `border-8`, ni un lado o un eje sin número; el de un solo lado \(`border-t-N`\) sólo fija el ancho y el trazo lo dibuja `border-t-<familia>-<n>`$/,
        'the `border-N` width (1 to 4) draws all four sides and `border-none` removes it: there’s no `border-0` or `border-8`, and no side or axis without a number; the single-side one (`border-t-N`) only sets the width, and `border-t-<family>-<n>` draws the line',
    ],
    [
        /^no hay una `transition` sola: se elige la propiedad \(`transition-colors`, `transition-opacity`, `transition-shadow`, `transition-transform`, `transition-all`\); `duration-\*` y `ease-\*` fijan la duración y la curva, y los componentes ya traen su transición; para otra propiedad, una utilidad propia en `utilities`$/,
        'there’s no bare `transition`—pick the property (`transition-colors`, `transition-opacity`, `transition-shadow`, `transition-transform`, `transition-all`). `duration-*` and `ease-*` set the duration and the curve, and components already ship their own transition; for another property, your own utility in `utilities`',
    ],
    [
        /^el anillo va de 1 a 4 \(`ring-1`…`ring-4`\): no hay `ring` sin número, `ring-0`, `ring-8` ni `ring-inset`; el anillo de foco lo pone el reset \(`:focus-visible`\) y cada componente$/,
        'the ring goes from 1 to 4 (`ring-1`…`ring-4`): there’s no `ring` without a number, `ring-0`, `ring-8`, or `ring-inset`. The focus ring comes from the reset (`:focus-visible`) and each component',
    ],
    [/^no hay `outline-hidden`: para quitar el contorno, `outline-none`$/, 'there’s no `outline-hidden`: to remove the outline, use `outline-none`'],
    [/^sólo existe `rotate-180`: no hay otros giros; para otro ángulo, una utilidad propia en `utilities`$/, 'only `rotate-180` exists, there are no other rotations; for another angle, your own utility in `utilities`'],
    [
        /^el estilo del borde no es una clase aparte: los bordes de TaishoDS son sólidos; para guiones o puntos, una utilidad propia en `utilities`$/,
        'border style isn’t a separate class—TaishoDS borders are solid; for dashes or dots, your own utility in `utilities`',
    ],
    [
        /^no hay filtros de color: sólo `blur-\*` y `backdrop-blur-\*`; para otro filtro, una utilidad propia en `utilities`$/,
        'there are no color filters, only `blur-*` and `backdrop-blur-*`; for another filter, your own utility in `utilities`',
    ],
    [/^no hay gradientes: el fondo es un color de la escala; para un gradiente, una utilidad propia en `utilities`$/, 'there are no gradients—the background is a color from the scale; for a gradient, your own utility in `utilities`'],
    [/^sólo existen `m-auto`, `mx-auto`, `my-auto`, `ms-auto` y `me-auto`$/, 'only `m-auto`, `mx-auto`, `my-auto`, `ms-auto`, and `me-auto` exist'],
    [/^el ancho tiene nombre: `border-1` es 1px \(Tailwind dice `border`\)$/, 'the width has a name—`border-1` is 1px (Tailwind just says `border`)'],
    [
        /^misma intención, otra implementación: es un `box-shadow` que pisa a `shadow-\*` \(Tailwind los suma\)$/,
        'same intent, different implementation—it’s a `box-shadow` that overrides `shadow-*` (Tailwind adds them together)',
    ],
    [
        /^misma intención, otra implementación: anima el fondo y el color del texto con la duración `fast` del tema; Tailwind anima también el borde, el relleno y el trazo, en 150ms$/,
        'same intent, different implementation—it animates the background and the text color with the theme’s `fast` duration; Tailwind also animates the border, fill, and stroke, at 150ms',
    ],
    [/^misma intención, otra duración: la `fast` del tema; la de Tailwind es de 150ms$/, 'same intent, different duration—the theme’s `fast`; Tailwind’s is 150ms'],
    [
        /^misma intención, otra implementación: anima el fondo, el color, la sombra y el transform con la duración `fast` del tema, no todas las propiedades$/,
        'same intent, different implementation—it animates the background, color, shadow, and transform with the theme’s `fast` duration, not every property',
    ],
    [
        /^misma intención, otra implementación: además de no animar nada pone la duración en 0s; Tailwind sólo quita la propiedad animada$/,
        'same intent, different implementation—besides animating nothing it sets the duration to 0s; Tailwind only removes the animated property',
    ],
    [
        /^quita también el contorno del foco \(`:focus-visible`\): sin otro indicador de foco, el teclado queda sin referencia$/,
        'it also removes the focus outline (`:focus-visible`): without another focus indicator, keyboard users lose their place',
    ],
    [
        /^además del color dibuja el aro: 1px \(`ring-blue-500` de Tailwind sólo pinta el color y necesita `ring-N` para verse\)$/,
        'besides the color, it draws the ring—1px (Tailwind’s `ring-blue-500` only sets the color and needs `ring-N` to show)',
    ],
    [
        /^no hay rangos: cada pantalla tiene su variante «desde» \(`md:`\) y su variante «hasta» \(`max-md:`\), pero no las dos a la vez en una clase$/,
        'no ranges. Each screen has its “from” variant (`md:`) and its “up to” variant (`max-md:`), but not both in one class',
    ],
];

const FAMILIAS: Record<string, string> = {
    medidas: 'sizes',
    'tamaño de texto': 'font size',
    peso: 'font weight',
    interlineado: 'line height',
    tracking: 'tracking',
    radio: 'radius',
    sombra: 'shadow',
    color: 'color',
    opacidad: 'opacity',
    'z-index': 'z-index',
    movimiento: 'motion',
    borde: 'border',
    blur: 'blur',
    display: 'display',
    posición: 'position',
    visibilidad: 'visibility',
    flex: 'flex',
    grid: 'grid',
    alineación: 'alignment',
    texto: 'text',
    'texto y utilidades': 'text and utilities',
    overflow: 'overflow',
    interacción: 'interaction',
    layout: 'layout',
};

export function ingles(es: string): string {
    for (const [re, en] of REGLAS) {
        const m = re.exec(es);
        if (m) return typeof en === 'string' ? es.replace(re, en) : en(...m);
    }
    throw new Error(`tailwind-map-en: falta el inglés de «${es}» (se suma una regla en src/generate/tailwind-map-en.ts)`);
}

export interface InglesDelMapa {
    unidades: string;
    coloresNota: string;
    notas: Record<string, string>;
    motivos: Record<string, string>;
    familias: Record<string, string>;
}

export function inglesDelMapa(m: {
    unidades: string;
    colores: { nota: string };
    filas: { familia: string; nota?: string }[];
    sinEquivalente: { motivo: string }[];
}): InglesDelMapa {
    const dic = (lista: string[]) => Object.fromEntries([...new Set(lista)].sort().map((es) => [es, ingles(es)]));
    const familias = [...new Set(m.filas.map((f) => f.familia))].sort();
    for (const f of familias) if (!FAMILIAS[f]) throw new Error(`tailwind-map-en: falta el inglés de la familia «${f}»`);
    return {
        unidades: ingles(m.unidades),
        coloresNota: ingles(m.colores.nota),
        notas: dic(m.filas.flatMap((f) => (f.nota ? [f.nota] : []))),
        motivos: dic(m.sinEquivalente.map((g) => g.motivo)),
        familias: Object.fromEntries(familias.map((f) => [f, FAMILIAS[f]])),
    };
}
