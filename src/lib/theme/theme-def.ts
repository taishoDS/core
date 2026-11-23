// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/** Forma de un tema (`ThemeDef`). */

/** Los talles de una familia de densidad, en px: `{ sm: 28, md: 32 }` (`xs` sólo en `control-h` y `button-px`). */
export type DensitySizes = Partial<Record<'xs' | 'sm' | 'md' | 'lg', number>>;

/** Los gaps y spaces del modo compact que un tema cambia (sólo los nombres de fábrica: los que suma `extend` no se compactan). */
export interface CompactSpacing { gaps?: Record<string, string>; spaces?: Record<string, string> }

/**
 * Definición de un tema. Solo cambia VALORES (hex), nunca el vocabulario de
 * slots. Mismo vocabulario en todos los temas = `base.css` no se infla.
 */
export interface ThemeDef {
    /**
     * Colores de marca: hex semilla por slot (brand, brand-secondary, accent, …).
     * `brand` es obligatorio: de él salen la paleta de marca, los enlaces y los acentos del DS. Sólo es el color de los
     * botones primarios (y casillas, radios e interruptores) si el tema no define `primary`.
     */
    colors: { brand: string; [slot: string]: string };
    /**
     * Colores que caen entre dos pasos de la escala. 'shift' los adapta al borde más cercano que
     * llega a AA; 'keep' los deja exactos. Clave: 'brand', otro slot de `colors`, un estado o 'primary'.
     * Sin entrada: si el color no llega a AA (4,5:1) con texto encima o contra el fondo, se adapta
     * y se avisa; si llega con los dos, queda exacto y se informa.
     */
    seedFit?: Record<string, 'shift' | 'keep'>;
    /**
     * Color del relleno de los botones primarios, casillas, radios e interruptores: un ROL, no una familia de paleta (como
     * `focusRing`). Hex u oklch. No genera `primary-100…1000` ni clases `ts-bg-primary-N`: sólo las variables
     * `--color-primary-solid[-hover|-active][-contrast]`. Si se omite, el primario es la marca (`colors.brand`).
     * Va aquí, no dentro de `colors`.
     */
    primary?: string;
    /** Override opcional de estados. Si se omite, hereda `defaultStates`. */
    states?: Record<string, string>;

    /**
     * Familias tipográficas (la pila CSS que va a `--font-*`). Para que los
     * archivos se descarguen, la familia tiene que estar declarada en
     * `fontFaces` de tu `taisho.config.ts`.
     * - `sans`: cuerpo. `mono`: código. `display`: títulos (ts-text-heading-*).
     *   Si no se define `display`, los títulos usan `sans`.
     */
    fonts?: Partial<Record<'sans' | 'mono' | 'display', string>>;
    /** Radios de esquina (none/sm/md/lg/xl/2xl/…). */
    radius?: Record<string, string>;
    /**
     * Forma de las esquinas (`--ts-corner-shape`): `'round'` (por defecto) o `'squircle'`. Con `'squircle'`, en los navegadores que
     * soportan `corner-shape` (Chromium), cada radio de la escala (`xs` a `2xl`) toma el valor del escalón siguiente, porque la curva
     * del squircle se ve más cerrada con el mismo radio; `3xl` queda igual, y `none` y `full` no se mueven. Los nombres que suma
     * `extend.radius` toman la forma pero no suben. Sin soporte, todo queda redondo con los radios de siempre.
     */
    cornerShape?: 'round' | 'squircle';
    /** Ancho de borde/anillo/contorno (`--ts-border-width-N`): 1/2/3/4. */
    borderWidths?: Record<string, string>;
    /** Desenfoque (`--ts-blur-*`): none/sm/md/lg/xl. */
    blurs?: Record<string, string>;
    /** Capas z-index semánticas (`--ts-z-*`): base/raised/pinned/…/dialog. */
    zIndex?: Record<string, string>;
    /** Opacidad (`--ts-opacity-*`): escalones 0..100 y el rol `muted`. */
    opacities?: Record<string, string>;
    /**
     * Tamaños de texto (`--ts-fontsize-N`, y las clases `text-N`, `type-heading-N` y `type-copy-N`): cambia el valor de los que ya
     * existen (10 a 72). Sumar niveles es `extend.fontSizes`. Sin `lineHeights`, el interlineado queda con su valor de fábrica.
     */
    fontSizes?: Record<string, string>;
    /** Interlineados (`--ts-lh-N`, clase `leading-N`), con el nombre del tamaño de texto al que acompañan. También el de los idiomas RTL (árabe, persa, urdu, hebreo). */
    lineHeights?: Record<string, string>;
    /** Espaciado entre letras (`--ts-ls-*`): tighter/tight/normal/wide/wider/widest. Con `normal` cambiado, los idiomas RTL lo siguen. */
    letterSpacing?: Record<string, string>;
    /** Pesos de fuente (`--ts-fw-*`): thin a black, cada uno de 1 a 1000. */
    fontWeights?: Record<string, string>;
    /** Anchos de viewport (`--ts-screen-*`): sm/md/lg/xl. Sólo mueve `ts-max-w-screen-*`; los cortes de componentes quedan en el valor por defecto. */
    screens?: Record<string, string>;
    /**
     * Tokens de los componentes que aporta una extensión: `components['<slug>']` cambia sus tokens
     * (`--ts-<primera raíz>-<clave>`). Sólo valen las claves que la extensión declara; sin la extensión instalada, es un error.
     */
    components?: Record<string, Record<string, string>>;
    /**
     * Color del aro de foco (`--ts-focus-ring-color`): lo usan `ts-focus-ring`, el foco de los thumbs y el
     * `:focus-visible` general. CSS válido (ej. 'var(--color-brand-300)'). De ese color salen la línea y el halo del foco. Si se omite, la marca del tema.
     */
    focusRing?: string;
    /** Luminosidad OKLCH bajo la que el texto de un Badge custom pasa a blanco (`--ts-contrast-threshold`). */
    contrastThreshold?: string;
    /**
     * Color del brillo del Card con spotlight (`--ts-spotlight-color`). Por defecto sale
     * de la escala de grises con alfa (`grayAlpha-100` en claro, `grayAlpha-200` en oscuro).
     */
    spotlight?: { light?: string; dark?: string };
    /** Spacing semántico: gaps y/o spaces (none/quarter/half/base/section/double). */
    spacing?: { gaps?: Record<string, string>; spaces?: Record<string, string> };
    /**
     * Densidad de los controles, en px por familia y talle (`control-h`, `button-px`, `field-px`, `select-pr`, `textarea-px`,
     * `textarea-py`, `badge-h`, `badge-px`, `tag-h`, `tag-px`, `control-box`, `radio-dot`). `comfortable` es el modo normal;
     * `compact` es el de `<section class="ts compact">`, y su `spacing` cambia los gaps y spaces compactados.
     * La clase `density-compact` de un componente sigue estos valores en el build; `createTheme` no llega a ella.
     */
    density?: {
        comfortable?: Record<string, DensitySizes>;
        compact?: { spacing?: CompactSpacing; [family: string]: DensitySizes | CompactSpacing | undefined };
    };
    /** Sombras (sm/md/lg/xl). */
    shadows?: Record<string, string>;
    /**
     * Motion: duraciones (`--ts-duration-*`) y curvas (`--ts-ease-*`). `durations` son
     * transiciones (instant/fast/base/slow/slower: con reduced-motion bajan a 1ms
     * pase lo que pase); `loops` son animaciones infinitas (spin/loop-fast/loop-base/loop-slow);
     * `iterations` son las repeticiones de los bucles ambientales (`loop`: skeleton y barra
     * indeterminada; con reduced-motion pasa a `0` y quedan quietos).
     */
    motion?: { durations?: Record<string, string>; loops?: Record<string, string>; iterations?: Record<string, string>; easings?: Record<string, string> };
    /** Colores de texto semántico. Valores = CSS válido (ej. 'var(--color-gray-1000)'). */
    semantic?: Partial<Record<'heading' | 'copy' | 'subtle' | 'label' | 'btn', string>>;
    /**
     * Neutros (gray/background/grayAlpha/overlay). Combinables:
     * - `tint`: tiñe la rampa de grises (chroma+hue), conserva luminosidad, light/dark auto.
     * - `light`/`dark`: override crudo por shade (pisa al tinte).
     */
    neutral?: {
        tint?: { c: number; h: number };
        light?: Partial<Record<'gray' | 'background' | 'grayAlpha' | 'overlay', Record<string, string>>>;
        dark?: Partial<Record<'gray' | 'background' | 'grayAlpha' | 'overlay', Record<string, string>>>;
        /** Blanco y negro fijos (`--color-white`, `--color-black`): el mismo valor en claro y en oscuro, sin tinte ni P3. */
        fixed?: Partial<Record<'white' | 'black', string>>;
    };
    /**
     * Superficies `ts-material-*` (cards/menus/modals): fondo, borde y color de
     * sombra de cualquier color, por light/dark. Lo que no se define cae al default
     * (taisho no emite nada → idéntico).
     * - `bg`: color de fondo (ej. 'oklch(...)' o 'var(--color-...)').
     * - `border`: color del borde/ring (ej. 'var(--color-brand-200)').
     * - `shadowRgb`: terna RGB del color de sombra (ej. '116 23 67'); conserva la geometría.
     */
    material?: {
        light?: { bg?: string; border?: string; shadowRgb?: string };
        dark?: { bg?: string; border?: string; shadowRgb?: string };
    };

    /** Tema no-editable: ignora todos los overrides y usa solo defaults (ej. taisho), también en `createTheme`. Conserva sus colores, el primario y el foco. */
    locked?: boolean;
}
