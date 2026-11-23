# NAMING — cómo se llaman las clases de TaishoDS

Esta es la fuente de verdad **para personas** de la gramática de nombres públicos.
La fuente de verdad **para máquinas** es `src/generate/naming-table.ts`; la tabla
viejo→nuevo está en `src/generate/naming-renames.ts`. Las secciones marcadas como
*generadas* salen de esas tablas con `npm run generate:naming` y las cubre `check:drift`:
no se editan a mano. Los ejemplos `ts-…` de este documento los valida un test, así que el
documento no puede mentir.

> Estado: la gramática está decidida y el gate la mide y bloquea (`npm run check:nombres`). Hay **un solo modo,
> scope**: las clases se escriben sin `ts-` y el elemento lleva la llave `ts` (`class="ts ms-half"`). En este
> documento los nombres se escriben en su **forma canónica con `ts-`** (`ts-ms-half`) porque así los valida el
> gate; en el markup propio se quita el `ts-` y se pone la llave.

## La gramática

```
[<variantes>:]ts-<prop>[-<eje>]-<valor>     md:ts-mb-neg-1    ts-ms-half    ts-border-b-2-gray-1000
[<variantes>:]ts-<palabra>                  @md:ts-flex       ts-hidden     md:hover:ts-underline
```

- `<prop>` sale de una **lista cerrada** (la tabla de abajo) y corresponde a una sola propiedad
  CSS, o a un shorthand con sus longhands.
- La palabra sola sólo vale si es un valor de `display`, `position`, `visibility` o decoración
  de texto (más los casos listados en "Palabras solas y utilidades propias").
- Se resuelve por **prefijo más largo**, nunca cortando por guiones: `select`, `file-upload`,
  `gap-x` y `ring-shadow` son prefijos enteros.
- **Variantes:** una variante va antes de los dos puntos y no cambia el nombre; se pueden encadenar hasta tres
  (`md:hover:ts-underline`). Son de screen, de container, de estado, de `group`/`peer` y de impresión: lista cerrada,
  en la sección "Variantes de estado y de contexto". El nombre que sigue respeta la misma gramática.
- **Modo scope** (los mismos nombres sin `ts-`, detrás de la llave `ts`): ver "Modo scope" más abajo.
- Los componentes siguen `ts-<raíz>[-<parte>]` con la raíz en `COMPONENTES`
  (`ts-datepicker-field`, `ts-file-upload-zone`).

## Las reglas, con ejemplo viejo → nuevo

**1. Negativos: `neg-` como prefijo del valor.**
`ts-ml-quarter-negative` → `ts-ms-neg-quarter`; `ts-mb-1-negative` → `ts-mb-neg-1`;
`ts-m-none-negative` → `ts-m-none` (mismo CSS: un negativo de cero es cero, así que `neg-` con
`none`, `0` o `auto` no existe).
*Por qué:* un sufijo hace que el nombre se lea al revés y se confunda con un modificador.

**2. Texto: cada palabra, una propiedad.**
`text` = font-size; `align` = text-align; `wrap` = text-wrap; `type` = compuesto.
`ts-text-left` → `ts-align-start`; `ts-text-center` → `ts-align-center`;
`ts-text-balance` → `ts-wrap-balance`; `ts-text-heading-14` → `ts-type-heading-14`.
*Por qué:* `ts-text-*` mezclaba cuatro cosas distintas y no se podía predecir qué hacía cada una.

**3. Espaciado: se quedan los DOS conjuntos.**
Las palabras (`none`, `quarter`, `half`, `base`, `section`, `double`) son **ritmo** y cambian con la
densidad; los enteros (`ts-p-4`, `ts-p-12`, `ts-p-24`) son **medidas fijas en px**. Sin alias ni conversión.
*Por qué:* son dos intenciones distintas; unificarlas le sacaría la densidad al ritmo.

**4. Escalas no espaciales: una regla por tipo de magnitud.**

| Tipo de magnitud | Prefijos | Ejemplo |
|---|---|---|
| Talles (`xs…3xl`, `none`, `full`) | radius, shadow, blur, backdrop-blur, grid-min | `ts-radius-lg` |
| Entero de letra | text, leading, type | `ts-text-14` |
| px | w, h, size, min-*, max-*, translate, outline-offset, espaciado numérico | `ts-w-48` |
| Palabras CSS | tracking, weight, duration, ease | `ts-weight-bold` |
| Escala de opacidades | opacity (el valor es una entrada de la escala, no un conteo libre) | `ts-opacity-50` |
| Conteos | z, scale, grid-cols, order | `ts-grid-cols-3` |
| Roles con nombre propio | material-*, surface-*, floating-*, color-{heading,copy,label,subtle}, border-separator | `ts-material-modal` |

*Por qué:* quien sabe qué tipo de magnitud es, sabe qué valores puede escribir.

**5. Lado lógico en el eje inline.**
`ts-ml-*` → `ts-ms-*`, `ts-mr-*` → `ts-me-*`, `ts-pl-*` → `ts-ps-*`, `ts-pr-*` → `ts-pe-*`,
`ts-left-*` → `ts-start-*`, `ts-right-*` → `ts-end-*`, `ts-border-r-*` → `ts-border-e-*`
(`ts-border-l-*` → `ts-border-s-*`), `ts-radius-tl-inherit` → `ts-radius-ss-inherit`
(`tr`→`se`, `bl`→`es`, `br`→`ee`, `l`→`s`, `r`→`e`).
El eje **block** conserva `t`/`b`/`top`/`bottom`. No cambian `mx`, `py`, `inset-x/y` ni `gap-x/y`.
*Por qué:* el motor ya emite propiedades lógicas; el nombre tiene que decir lo mismo que el CSS (RTL).

**6. `ts-color-btn` deja de ser pública.**
Queda como alias deprecado **sin sucesor**. `ts-type-button-*` escribe
`color: var(--ts-color-btn, var(--color-gray-1000))` en línea.
*Por qué:* era una variable de implementación con forma de utilidad.

**7. Alias deprecados y valores compuestos.**
`ts-outline-focus-*` queda como alias deprecado de `ts-outline-*`. `ts-px-0-important` pasa a ser una
declaración interna en `components.css`, con la clase deprecada. Se aceptan valores compuestos
`<ancho>-<color>` (`ts-border-b-2-gray-1000`, `ts-outline-4-transparent`) y el ancho solo (`ts-border-2`, `ts-border-t-3`, `ts-ring-4`; componen con `border-<color>` y `ring-<color>` en cualquier orden). `ring-shadow` es la única
familia compuesta de dos magnitudes (`ts-ring-shadow-sm-gray-100`), listada a mano.
*Por qué:* `!important` y "focus" en el nombre son implementación, no vocabulario.

**8. Inglés, ASCII.**
Los nombres públicos van en inglés y sólo con `[A-Za-z0-9-]` (más `/` en las fracciones, como
`ts-w-1/4`). Sin tildes ni palabras en español: `ts-py-section`, no una versión en español. Las mayúsculas
sólo existen en los nombres de familia de color heredados (`ts-bg-grayAlpha-100`). Lo local de una
página (una clase `seccion` dentro de un `<style>`) no es API y el gate no la mira.
*Por qué:* un nombre con tilde o en otro idioma rompe el autocompletado y el grep de quien no lo escribió.

**9. Sin alias.**
Cada clase tiene un solo nombre: el nombre anterior de una clase renombrada no existe en el CSS. La tabla
viejo→nuevo (`naming-renames.ts`) queda como dato del migrador.
*Por qué:* con un solo modo, mantener dos nombres por clase sólo cuesta peso.

**Migración.** `taisho migrate --from classic` reescribe el código con la misma tabla: pasa `ts-ml-half` a
`ms-half`, pone la llave `ts`, y lista lo que no puede convertir. Sin `--write` es un dry-run. Un texto que
documenta un nombre viejo a propósito se rodea con un comentario `taisho:nombres-viejos` …
`/taisho:nombres-viejos`, que respetan el codemod interno del repo, el gate y el lint.

## Modo scope

`scope: 'ts'` en `taisho.config.ts` compila `taisho.full.css` con los **mismos nombres vigentes, sin `ts-`**, y cada
regla sale detrás de `:where(.ts)`:

```html
<button class="ts button variant-primary">       <!-- la llave `ts` va en el MISMO elemento que la clase del DS -->
                                                 <!-- => :where(.ts).button.variant-primary -->
<p class="ts md:hidden">                         <!-- @media (width >= 48rem) { :where(.ts).md\:hidden } -->
<section class="ts compact">                     <!-- el contexto también lleva `ts` en su propio elemento; afecta a los descendientes con su propia llave -->
```

- **Es el único modo.** La clave `scope: 'ts'` ya no hace falta: si está, avisa «`scope: 'ts'`
  ya es el único modo: se quita la clave.». Otro valor que `'ts'` es un error de config.
- **Los nombres viejos no existen.** El nombre corto es siempre el vigente sin `ts-`: `ms-half`, no `ml-half`.
  Un nombre del DS sin la llave `ts` no recibe estilos y no falla (`check:clases` lo detecta sobre el markup del
  repo del DS; en un proyecto tuyo, lo avisa el reporte de `taisho migrate`).
- **Especificidad de una clase.** `:where()` no suma: `:where(.ts).button` pesa (0,1,0) igual que una clase tuya,
  así que una regla de tu app con una clase le gana si va después en la misma capa (el CSS del DS vive en
  `@layer utilities`; el tuyo, sin capa, le gana siempre). Los modificadores y los selectores anidados
  (`:where(.ts).compact &:not(.is-comfortable) :where(.ts).table-th`) conservan la especificidad de una clase.
- **Utilidades propias** (`config.utilities`): salen sin `:where(.ts)` (`.card-hero`, `.md\:card-hero`) y se componen con
  nombres cortos (`['p-double', 'radius-lg']`); cada entrada puede llevar variantes (`'hover:bg-brand-800'`, `'md:p-base'`),
  con la cadena de la sección de variantes y sólo sobre utilidades. Un nombre propio no puede ser igual a un nombre corto del DS ni `ts`.
- **Modificadores de utilidades propias:** una clave con punto (`'mi-button.destructive'`, `'mi-button.destructive.outlined'`)
  se emite como `.mi-button:where(.destructive)` / `.mi-button:where(.destructive.outlined)` y se usa
  `class="ts mi-button destructive outlined"`. La parte anterior al primer punto es una propia declarada sin punto; el orden de los
  modificadores no importa y `a.b` y `b.a` son la misma combinación. `:where()` deja cada regla en (0,1,0): la cascada
  es base, simples, compuestos, y una atómica del markup (`bg-danger-900`) afina. Un modificador **nunca se emite suelto**, así que
  `md:destructive` no existe: el prefijo va en la propia (`md:mi-button destructive`; `taisho generate` y `check` avisan el otro).
  Un modificador sin su propia en el mismo elemento no hace nada (aviso). El nombre no puede ser un nombre corto del DS (componente o
  utilidad: `link`, `color-danger`), ni `ts`, `ts-*`, una clase de tema ni otra propia; sí puede ser un modificador del Core
  (`variant-link`, `size-icon`), que fuera de su componente es inerte: es el respaldo cuando el nombre suelto choca. Un modificador no se compone dentro de otra utilidad.
- **Choques de nombre con los modificadores:** un nombre corto igual a un modificador de componente sólo se admite
  si es coherente: `align-center` (modificador de la tabla y utilidad `text-align: center`, idénticos en table-th/td).
  `check:nombres` bloquea cualquier otro. El contexto se llama `compact` (no `density-compact`) justamente para no chocar con
  el modificador `density-compact` de los componentes.
- **El reset del DS es global.** `@layer base` (`*`, `html`, `body`, `button`, `a`…) NO está detrás de `:where(.ts)`:
  aplica a toda la página. Y un selector de elemento de tu app, sin capa, también le gana al DS (las capas
  pierden contra cualquier regla sin capa, sea cual sea su especificidad).
- **Alcance:** vale para todo lo que sale del generador: `taisho.css` / `taisho.full.css`, el CDN y la clase de
  contexto de los tokens. `TaishoClass` (ver CONSUMING.md) lista los nombres cortos, sin `ts-`.
- **Convivencia con Tailwind:** se puede, en un orden. Se carga el CSS de TaishoDS **después** del de Tailwind: un elemento
  con la llave (`class="ts p-16"`) toma el estilo de TaishoDS y uno sin ella sigue con el de Tailwind. Al revés se rompe,
  porque las dos hojas definen `.p-16` con medidas distintas. Se migra elemento por elemento y se saca Tailwind cuando
  `taisho migrate --from tailwind` ya no reporte nada.

**El JS del Core** crea sus clases en scope (siempre `ts <nombre>`) y el catálogo HTML (el CDN y `/docs`) se
emite en scope.

## Variantes de estado y de contexto

Una variante es un prefijo con dos puntos delante de una **utilidad** (atómica o propia). El vocabulario es una
**lista cerrada**: no hay valores arbitrarios (`hover:bg-[…]`, `data-[open=true]:`, `aria-[sort=up]:`) y no hay `dark:`, porque
el modo oscuro lo resuelve el tema con tokens, no una variante por clase.

| Prefijo | Se aplica cuando | Ejemplo |
|---|---|---|
| `hover:` | `:hover`, dentro de `@media (hover: hover)` | `hover:ts-bg-gray-200` |
| `focus:` · `focus-visible:` · `active:` | `:focus` · `:focus-visible` · `:active` | `focus-visible:ts-underline` |
| `checked:` · `invalid:` | `:checked` · `:invalid` | `checked:ts-opacity-100` |
| `disabled:` | `:disabled` o `[aria-disabled="true"]` (más amplio que `:disabled`, a propósito) | `disabled:ts-opacity-50` |
| `aria-<a>:` | `[aria-<a>="true"]`, con `<a>` en `busy`, `checked`, `disabled`, `expanded`, `hidden`, `invalid`, `pressed`, `readonly`, `required`, `selected` | `aria-expanded:ts-bg-gray-200` |
| `data-<n>:` | `[data-<n>]`, sólo presencia; `<n>` es `[a-z][a-z0-9-]*` y **no puede empezar con `ts-`** (`data-ts-*` es el gancho de los componentes) | `data-active:ts-bg-gray-200` |
| `group-<estado>:` · `peer-<estado>:` | un ancestro `group` o un hermano anterior `peer` está en ese estado; vale cualquiera de los estados de arriba | `group-hover:ts-underline` |
| `print:` | `@media print` | `print:ts-hidden` |
| `sm:` `md:` `lg:` `xl:` (y los de `extend.screens`) | `@media (width >= …)` | `md:ts-flex` |
| `@sm:` … `@7xl:` | `@container (width >= …)`: 24, 28, 32, 36, 42, 48, 56, 64, 72 y 80rem | `@2xl:ts-flex` |

- **Orden canónico:** pantalla o contenedor, después `print:`, después `group-*` o `peer-*`, después el estado propio y al
  final la clase (`md:print:hover:ts-underline`). A lo sumo uno de cada tipo y tres segmentos en total. Cada regla tiene un solo nombre: `md:hover:ts-flex` existe y la misma cadena al revés
  no. Una cadena fuera de orden, con un tipo repetido o de más de tres, **avisa y no se emite**; el aviso propone la
  forma canónica.
- **Marcas `group` y `peer`:** son clases sin `ts-` que no estilan nada; van junto a la llave (`class="ts group"`). Con
  nombre se escriben `group/menu` y `group-hover/menu:` (el nombre es `[a-z][a-z0-9-]*`). No son modificadores ni
  contextos de componente: son las únicas clases sueltas, además de `dark` y `compact`, que el gate admite.
- **Sólo sobre utilidades.** Una variante sobre un componente o un modificador (`variant-*`, `size-*`, `is-*`…) avisa y
  no se emite: los estados de un componente son sus modificadores, sus atributos aria y sus partes internas.
- **Un prefijo que no está en la lista** (`dark:`, `first:`, `has-…:`) avisa y no se emite. `data-ts-<algo>:` se
  rechaza con un aviso propio.
- **Especificidad:** un estado vale (0,2,0), la clase común y `print:` (0,1,0). El orden de salida en `@layer utilities` es
  base, screens, containers, estados solos (`group`, `peer`, `hover`, `focus`, `focus-visible`, `active`, `aria`, `data`,
  `checked`, `invalid`, `disabled`), screen × estado, container × estado y `print:`.
- **Orden dentro de cada nivel:** no depende de en qué archivo ni en qué orden aparecen las clases en el código. Van primero
  las utilidades propias, por su orden de composición y declaración, así una clase del markup las afina. Después, las atómicas:
  las compuestas antes que las de una sola propiedad (`ts-material-medium` antes que `ts-radius-none`, y el radio afina al
  material); luego por familia de propiedad, con cada abreviada antes que sus partes (`ts-p-double` antes que `ts-px-base`,
  sean cuales sean sus valores); y dentro de una misma propiedad, por nombre. Dos clases de la misma propiedad en el mismo nivel
  (`md:ts-flex md:ts-hidden`) las resuelve ese orden: no es una forma de elegir, conviene escribir una sola.
- **Escape en el CSS:** cada `:`, `/` y `@` del nombre se escapa (`.group-hover\/menu\:ts-underline`).
- **Estático y a demanda:** `taisho.full.css` y `taisho.base.css` traen sólo `hover:` sobre colores, `underline`,
  `no-underline` y `opacity-*`, más `print:hidden` y `print:block`. Con `content`, cualquier utilidad con cualquier
  variante escrita completa en el código sale; lo que no se usa pesa 0 bytes.

## Modificadores y estados: cortos, sin prefijo, siempre compuestos

`variant-*`, `size-*`, `is-*`, `has-*`, `side-*`, `shape-*`, `orientation-*`, `resize-*`… **se quedan
como están**: cortos y sin `ts-`. Es a propósito. Un modificador **sólo es válido compuesto con la
clase base de un componente**:

```html
<button class="ts-button variant-primary size-sm">   <!-- forma canónica (la que usa este documento) -->
<button class="ts button variant-primary size-sm">   <!-- lo que se escribe: :where(.ts).button.variant-primary -->
```

Un `variant-primary` o un `is-active` de la app **no toma estilos del DS** porque le falta la base.
La regla para el CSS del DS: un modificador va siempre **en el mismo elemento que la base**: `&.size-sm`
dentro del `@utility` del componente (donde `&` es la base) o `.ts-button.size-sm`. Un modificador en un
ancestro o en un descendiente sin su base (`.size-sm > &`, `& .variant-success`) no cumple, porque un
`size-sm` o un `variant-success` de la app podría alcanzarlo. `check:nombres` lo mide y bloquea.

La "base" es `&`, una clase `ts-*` o un atributo `[data-<componente>-<parte>]` (`[data-progress-step]`) en
el mismo compuesto, también dentro de `:where()` o `:is()` (que no suben la especificidad). Lo que está
dentro de `:not()` nunca cuenta como base. Cuando el modificador está en un ancestro, la base va dentro de
`:where()`: `:where(.ts-datepicker-field).size-sm > &`.

<!-- modificadores:inicio -->
**Lista cerrada de modificadores** (cualquier otra clase sin `ts-` en `components.css` es una violación del gate):

- Familias, `<familia>-<valor>`: `is-*`, `has-*`, `variant-*`, `size-*`, `side-*`, `shape-*`, `orientation-*`, `resize-*`, `placement-*`, `density-*`, `collapsible-*`, `padding-*`, `align-*`, `position-*`, `status-*`, `fill-*`, `contrast-*`, `tone-*`, `hide-*`, `direction-*`, `level-*`, `aspect-*`, `icon-*`.
- Palabras enteras: `auto-resize`, `responsive-sheet`, `vertical`.

**Clases de tema** (van en `<html>`, son la única clase sin `ts-` que puede ir como ancestro, `.dark &`; no son modificadores): `dark`.
<!-- modificadores:fin -->


## Prefijos (generada)

Cada fila es un prefijo de la lista cerrada. Los marcados "legado" ya no se emiten desde la
0.11 (tenían sucesor y el codemod los renombra).

<!-- prefijos:inicio -->
| Prefijo | Propiedad CSS | Valor | Ejemplo | Nota |
|---|---|---|---|---|
| `m` | margin | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-m-none` |  |
| `mx` | margin-inline | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-mx-none` |  |
| `my` | margin-top + margin-bottom | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-my-none` |  |
| `mt` | margin-top | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-mt-none` |  |
| `mb` | margin-bottom | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-mb-none` |  |
| `ms` | margin-inline-start | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-ms-none` |  |
| `me` | margin-inline-end | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-me-none` |  |
| `ml` | margin-left | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-ml-none` | legado: usar `ms` |
| `mr` | margin-right | ritmo (`none`…`double`) o px, `auto`, `neg-` opcional | `ts-mr-none` | legado: usar `me` |
| `p` | padding | ritmo (`none`…`double`) o px | `ts-p-none` |  |
| `px` | padding-inline | ritmo (`none`…`double`) o px | `ts-px-none` |  |
| `py` | padding-top + padding-bottom | ritmo (`none`…`double`) o px | `ts-py-none` |  |
| `pt` | padding-top | ritmo (`none`…`double`) o px, `safe` | `ts-pt-none` |  |
| `pb` | padding-bottom | ritmo (`none`…`double`) o px, `safe` | `ts-pb-none` |  |
| `ps` | padding-inline-start | ritmo (`none`…`double`) o px, `safe` | `ts-ps-none` |  |
| `pe` | padding-inline-end | ritmo (`none`…`double`) o px, `safe` | `ts-pe-none` |  |
| `pl` | padding-left | ritmo (`none`…`double`) o px, `safe` | `ts-pl-none` | legado: usar `ps` |
| `pr` | padding-right | ritmo (`none`…`double`) o px, `safe` | `ts-pr-none` | legado: usar `pe` |
| `gap` | gap | ritmo (`none`…`double`) o px | `ts-gap-none` |  |
| `gap-x` | column-gap | ritmo (`none`…`double`) o px | `ts-gap-x-none` |  |
| `gap-y` | row-gap | ritmo (`none`…`double`) o px | `ts-gap-y-none` |  |
| `inset` | inset | entero en px | `ts-inset-0` |  |
| `inset-x` | inset-inline | ritmo (`none`…`double`) o px | `ts-inset-x-0` |  |
| `inset-y` | top + bottom | ritmo (`none`…`double`) o px | `ts-inset-y-0` |  |
| `top` | top | ritmo (`none`…`double`) o px | `ts-top-none` |  |
| `bottom` | bottom | ritmo (`none`…`double`) o px | `ts-bottom-none` |  |
| `start` | inset-inline-start | ritmo (`none`…`double`) o px | `ts-start-none` |  |
| `end` | inset-inline-end | ritmo (`none`…`double`) o px | `ts-end-none` |  |
| `left` | left | ritmo (`none`…`double`) o px | `ts-left-none` | legado: usar `start` |
| `right` | right | ritmo (`none`…`double`) o px | `ts-right-none` | legado: usar `end` |
| `w` | width | entero en px, `full`, `auto`, `screen`, `fit`, patrón `^\d+\/\d+$` | `ts-w-full` |  |
| `h` | height | entero en px, `full`, `auto`, `screen`, `fit` | `ts-h-full` |  |
| `size` | width + height | entero en px | `ts-size-0` |  |
| `min-w` | min-width | entero en px, `full` | `ts-min-w-0` |  |
| `min-h` | min-height | entero en px, `full`, `screen` | `ts-min-h-0` |  |
| `max-w` | max-width | entero en px, `full`, patrón `^(modal\|screen)-(sm\|md\|lg\|xl\|2xl)$` | `ts-max-w-0` |  |
| `max-h` | max-height | entero en px, `full` | `ts-max-h-0` |  |
| `translate-x` | transform: translateX | entero en px | `ts-translate-x-0` |  |
| `translate-y` | transform: translateY | entero en px | `ts-translate-y-1` |  |
| `text` | font-size | escala `fontSizes` | `ts-text-10` |  |
| `align` | text-align | `start`, `center`, `end` | `ts-align-start` |  |
| `wrap` | text-wrap | `balance`, `pretty`, `nowrap` | `ts-wrap-balance` |  |
| `type` | font + line-height + letter-spacing (compuesto) | patrón `^(heading\|copy\|label\|button)-\d+(-(mono\|strong))?$` | `ts-type-heading-14` |  |
| `leading` | line-height | escala `lineHeights` + `none`, `tight` | `ts-leading-10` |  |
| `tracking` | letter-spacing | escala `letterSpacing` | `ts-tracking-tighter` |  |
| `weight` | font-weight | escala `fontWeights` | `ts-weight-thin` |  |
| `font` | font-family | `sans`, `mono`, `display`, `inherit` | `ts-font-sans` |  |
| `whitespace` | white-space | `normal`, `nowrap`, `pre`, `pre-line`, `pre-wrap` | `ts-whitespace-nowrap` |  |
| `break` | overflow-wrap / word-break | `words`, `all`, `normal` | `ts-break-words` |  |
| `line-clamp` | line-clamp | entero, `none` | `ts-line-clamp-1` |  |
| `valign` | vertical-align | `baseline`, `top`, `middle`, `bottom` | `ts-valign-middle` |  |
| `color` | color | color del vocabulario, `white`, `black` | `ts-color-white` |  |
| `bg` | background-color | color del vocabulario, `white`, `black`, `transparent`, `glow-brand`, `glow-accent`, `highlight`, `highlight-strong` | `ts-bg-glow-brand` |  |
| `accent` | accent-color | `brand`, `accent`, `auto` | `ts-accent-brand` |  |
| `border` | border | color del vocabulario o `<ancho>-<color>`, `none`, `transparent`, `separator` | `ts-border-none` |  |
| `border-t` | border-top | color del vocabulario o `<ancho>-<color>`, `none`, `transparent`, `0` | `ts-border-t-background-100` |  |
| `border-b` | border-bottom | color del vocabulario o `<ancho>-<color>`, `none`, `transparent`, `0` | `ts-border-b-background-100` |  |
| `border-s` | border-inline-start | color del vocabulario o `<ancho>-<color>`, `none`, `transparent`, `0` | `ts-border-s-background-100` |  |
| `border-e` | border-inline-end | color del vocabulario o `<ancho>-<color>`, `none`, `transparent`, `0` | `ts-border-e-background-100` |  |
| `border-r` | border-right | color del vocabulario o `<ancho>-<color>`, `none`, `transparent`, `0` | `ts-border-r-2-transparent` | legado: usar `border-e` |
| `border-l` | border-left | color del vocabulario o `<ancho>-<color>`, `none`, `transparent`, `0` |  | legado: usar `border-s` |
| `outline` | outline | color del vocabulario o `<ancho>-<color>`, `none`, `transparent` | `ts-outline-none` |  |
| `outline-offset` | outline-offset | entero en px | `ts-outline-offset-0` |  |
| `outline-focus` | outline | color del vocabulario o `<ancho>-<color>`, `none`, `transparent`, `0` | `ts-outline-focus-background-100` | legado: usar `outline` |
| `ring` | box-shadow | color del vocabulario | `ts-ring-background-100` |  |
| `ring-shadow` | box-shadow | `<talle de shadow>-<color>` | `ts-ring-shadow-sm-background-100` |  |
| `focus-ring` | color del foco | familia de color (sin paso), `primary` | `ts-focus-ring-brand` |  |
| `divide` | border-width (hijos) | `x`, `y` | `ts-divide-y` |  |
| `radius` | border-radius | escala `radius` | `ts-radius-none` |  |
| `radius-ss` | border-radius (esquina lógica) | `inherit` | `ts-radius-ss-inherit` |  |
| `radius-se` | border-radius (esquina lógica) | `inherit` | `ts-radius-se-inherit` |  |
| `radius-es` | border-radius (esquina lógica) | `inherit` | `ts-radius-es-inherit` |  |
| `radius-ee` | border-radius (esquina lógica) | `inherit` | `ts-radius-ee-inherit` |  |
| `radius-s` | border-radius (esquina lógica) | `inherit` | `ts-radius-s-inherit` |  |
| `radius-e` | border-radius (esquina lógica) | `inherit` | `ts-radius-e-inherit` |  |
| `radius-tl` | border-radius (esquina física) | `inherit` | `ts-radius-tl-inherit` | legado: usar `radius-ss` |
| `radius-tr` | border-radius (esquina física) | `inherit` | `ts-radius-tr-inherit` | legado: usar `radius-se` |
| `radius-bl` | border-radius (esquina física) | `inherit` | `ts-radius-bl-inherit` | legado: usar `radius-es` |
| `radius-br` | border-radius (esquina física) | `inherit` | `ts-radius-br-inherit` | legado: usar `radius-ee` |
| `radius-l` | border-radius (esquina física) | `inherit` | `ts-radius-l-inherit` | legado: usar `radius-s` |
| `radius-r` | border-radius (esquina física) | `inherit` | `ts-radius-r-inherit` | legado: usar `radius-e` |
| `shadow` | box-shadow | escala `shadows` + `none` | `ts-shadow-sm` |  |
| `blur` | filter: blur | escala `blurs` | `ts-blur-sm` |  |
| `backdrop-blur` | backdrop-filter: blur | escala `blurs` | `ts-backdrop-blur-sm` |  |
| `opacity` | opacity | escala `opacities` | `ts-opacity-0` |  |
| `z` | z-index | entero, `auto` | `ts-z-0` |  |
| `material` | material (compuesto) | `base`, `small`, `medium`, `large`, `tooltip`, `menu`, `modal`, `fullscreen` | `ts-material-base` |  |
| `surface` | material de superficie | escala `radius` | `ts-surface-sm` |  |
| `floating` | material flotante | escala `radius` | `ts-floating-sm` |  |
| `flex` | flex | `row`, `col`, `row-reverse`, `col-reverse`, `wrap`, `nowrap`, `grow`, `shrink`, `none`, patrón `^((grow\|shrink)-)?\d+$` | `ts-flex` |  |
| `items` | align-items | `start`, `center`, `end`, `baseline`, `stretch` | `ts-items-center` |  |
| `justify` | justify-content | `start`, `center`, `end`, `between`, `around`, `evenly`, `stretch` | `ts-justify-center` |  |
| `justify-self` | justify-self | `auto`, `start`, `center`, `end`, `stretch` | `ts-justify-self-auto` |  |
| `self` | align-self | `auto`, `start`, `center`, `end`, `baseline`, `stretch` | `ts-self-auto` |  |
| `place-content` | place-content | `start`, `center`, `end`, `between`, `around`, `evenly`, `stretch` | `ts-place-content-center` |  |
| `place-items` | place-items | `start`, `center`, `end`, `stretch` | `ts-place-items-center` |  |
| `place-self` | place-self | `auto`, `start`, `center`, `end`, `stretch` | `ts-place-self-auto` |  |
| `order` | order | entero, `first`, `last`, `none` | `ts-order-first` |  |
| `grid-cols` | grid-template-columns | entero | `ts-grid-cols-1` |  |
| `grid-rows` | grid-template-rows | entero | `ts-grid-rows-1` |  |
| `grid-flow` | grid-auto-flow | `row`, `col`, `dense` | `ts-grid-flow-row` |  |
| `grid-min` | --ts-grid-min | escala `gridMins` | `ts-grid-min-2xs` |  |
| `col-span` | grid-column | entero, `full`, `auto` | `ts-col-span-1` |  |
| `col-start` | grid-column-start | `auto` | `ts-col-start-auto` |  |
| `row-span` | grid-row | entero, `full` | `ts-row-span-1` |  |
| `columns` | columns | entero | `ts-columns-2` |  |
| `aspect` | aspect-ratio | `square`, `video`, `auto` | `ts-aspect-square` |  |
| `overflow` | overflow | `auto`, `hidden`, `scroll`, `visible` | `ts-overflow-hidden` |  |
| `overflow-x` | overflow-x | `auto`, `hidden` | `ts-overflow-x-hidden` |  |
| `overflow-y` | overflow-y | `auto`, `hidden` | `ts-overflow-y-hidden` |  |
| `object` | object-fit | `cover`, `contain` | `ts-object-cover` |  |
| `cursor` | cursor | `pointer`, `not-allowed`, `default`, `wait`, `grab`, `grabbing`, `col-resize`, `row-resize`, `ew-resize`, `ns-resize`, `nwse-resize`, `nesw-resize`, `cell` | `ts-cursor-pointer` |  |
| `select` | user-select | `none`, `text`, `all`, `auto` | `ts-select-none` |  |
| `pointer-events` | pointer-events | `none`, `auto` | `ts-pointer-events-none` |  |
| `snap` | scroll-snap-* | `x`, `y`, `both`, `none`, `start`, `center`, `end`, `align-none` | `ts-snap-x` |  |
| `appearance` | appearance | `none` | `ts-appearance-none` |  |
| `scheme` | color-scheme + color | `dark`, `light` | `ts-scheme-light` |  |
| `isolation` | isolation | `auto` | `ts-isolation-auto` |  |
| `list` | list-style | `none`, `disc` | `ts-list-none` |  |
| `box` | box-sizing | `border` | `ts-box-border` |  |
| `will-change` | will-change | `auto`, `transform`, `scroll` | `ts-will-change-auto` |  |
| `duration` | transition-duration | escala `durations` | `ts-duration-instant` |  |
| `ease` | transition-timing-function | escala `easings` | `ts-ease-standard` |  |
| `transition` | transition | `all`, `colors`, `input`, `none`, `opacity`, `option`, `shadow`, `transform`, `width` | `ts-transition-colors` |  |
| `animate` | animation | `spin` | `ts-animate-spin` |  |
| `scale` | transform: scale | entero, `var` | `ts-scale-60` |  |
| `origin` | transform-origin | `top-left` | `ts-origin-top-left` |  |
| `rotate` | transform: rotate | entero | `ts-rotate-180` |  |
<!-- prefijos:fin -->

## Palabras solas y utilidades propias (generada)

El criterio real: **una palabra sola, o una utilidad propia, es una composición con nombre propio que
no es una sola propiedad** (`focus-ring`, `disabled`), o un valor tan conocido que repetir la propiedad
sobra (`flex`, `hidden`, `absolute`). Todo lo demás lleva prefijo. Una clase de **contexto** no estila
un elemento: cambia los tokens de su subárbol.

<!-- solas:inicio -->
**Palabras solas** (un valor de display, position, visibility o decoración, o un caso de un solo uso):

| Palabra | Propiedad |
|---|---|
| `block` | display |
| `flex` | display |
| `grid` | display |
| `hidden` | display |
| `contents` | display |
| `inline` | display |
| `inline-block` | display |
| `inline-flex` | display |
| `inline-grid` | display |
| `absolute` | position |
| `fixed` | position |
| `relative` | position |
| `sticky` | position |
| `visible` | visibility |
| `invisible` | visibility |
| `underline` | text-decoration |
| `no-underline` | text-decoration |
| `line-through` | text-decoration |
| `uppercase` | text-transform |
| `lowercase` | text-transform |
| `capitalize` | text-transform |
| `normal-case` | text-transform |
| `italic` | font-style |
| `not-italic` | font-style |
| `truncate` | overflow + text-overflow |
| `antialiased` | font-smoothing |
| `isolate` | isolation |
| `tabular-nums` | font-variant-numeric |
| `sr-only` | visualmente oculto |
| `not-sr-only` | deshace sr-only |
| `grid-auto` | grid-template-columns (auto-fit) |
| `grid-auto-fill` | grid-template-columns (auto-fill) |
| `tap-highlight-none` | -webkit-tap-highlight-color |

**Utilidades propias** (una composición con nombre propio): `disabled`, `disabled-flat`, `focus-ring`, `focus-ring-thumb`, `focus-ring-inset`, `field-box`, `field-box-trigger`, `option-row`, `popover-reset`, `required-indicator`, `cq`, `cq-normal`, `color-heading`, `color-copy`, `color-subtle`, `color-label`, `color-success`, `color-warning`, `color-info`, `color-danger`, `color-btn`.

**Clases de contexto** (cambian los tokens de un subárbol, no estilan un elemento): `compact`.
<!-- solas:fin -->

## No confundir

- `ts-align-*` es **text-align** (`start`, `center`, `end`). El vertical es `ts-valign-*`; `align-items`
  y `align-self` son `ts-items-*` y `ts-self-*`.
- Hay tres `nowrap` y son tres cosas: `ts-wrap-nowrap` es `text-wrap`, `ts-whitespace-nowrap` es
  `white-space` ("que no corte la línea") y `ts-flex-nowrap` es `flex-wrap`.
- `ts-leading-14` **no** es 14 px: es el interlineado que acompaña a `ts-text-14`. Por eso `leading-96`
  existe y `text-96` no.
- `ts-select-none` es `user-select`; los `ts-select-*` de componente (`ts-select-dropdown`) son partes
  del Select. Se distinguen porque el gate sabe de qué archivo sale cada nombre.
- `ts-aspect-square` es una proporción; `ts-aspect-ratio` es un componente.
- **Criterio de valores:** el valor es el de Tailwind si existe; si no, el valor CSS. Por eso
  `ts-cursor-cell` (era `ts-cursor-cell-select`, que no era un valor de `cursor`) y `ts-will-change-scroll`
  (Tailwind lo llama así, aunque el valor CSS sea `scroll-position`).
- **El eje va en el prefijo** cuando es una propiedad distinta: `ts-overflow-x-auto`, `ts-translate-y-1`,
  `ts-gap-x-half`, `ts-inset-x-0`. **Excepciones** con nombre de Tailwind y sin renombre: `ts-snap-x`/`ts-snap-y`
  (`scroll-snap-type`, el eje es el valor; `ts-snap-align-none` desambigua de `ts-snap-none`) y
  `ts-divide-x`/`ts-divide-y` (el eje es el valor; ancho y color son fijos).
- **Propiedad física que se emite:** `ts-my-*`, `ts-mt-*`, `ts-mb-*`, `ts-py-*`, `ts-pt-*`, `ts-pb-*`, `ts-top-*`, `ts-bottom-*`,
  `ts-border-t-*`, `ts-border-b-*` y `ts-inset-y-*` escriben las propiedades FÍSICAS del eje block (`margin-top`,
  `top`…); la tabla dice lo que el CSS hace. Pasarlas a `margin-block` cambiaría la cascada.

## ¿Dónde va un nombre nuevo?

1. **¿Es una sola propiedad (o un shorthand con sus longhands)?** Es un prefijo: se agrega a la lista
   cerrada con su propiedad y su tipo de valor.
2. **¿Es una composición con nombre propio?** Es una utilidad propia (o un componente, si tiene partes).
3. **¿Es un estado o una variante de algo que ya existe?** Si es de un componente, es un modificador, compuesto
   con la base del componente (`&.variant-x`), nunca una clase suelta. Si es una condición del DOM sobre una
   utilidad (puntero, foco, atributo, impresión), es una variante de la lista cerrada de arriba.

## Qué queda fuera / pendiente

- Los modificadores no se renombran ni llevan prefijo.

## Cómo se valida

```bash
npm run check:nombres      # bloquea (exit 1) si hay accionables, unicidad, modificadores sueltos o cualquier deprecada en uso en el DS
npm run generate:naming    # regenera las secciones generadas de este documento
npx vitest run src/generate/naming
```

El informe valida: (a) cada nombre emitido contra el prefijo más largo de la lista cerrada (atómicas,
utilities, `@utility` de componentes y clases anidadas de `components.css`; más las clases de contexto
de `tokens/*.css`); (b) unicidad; (c) que no haya `-negative`, `-important` ni lado físico; (d) que cada
violación tenga su entrada en la tabla viejo→nuevo, y separa las **accionables** (sin alias) de las
**deprecadas con alias**; (e) que todo modificador esté compuesto con una clase base. También imprime la
cuenta de lo emitido.
