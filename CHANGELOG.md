# Changelog

Todos los cambios relevantes de `@taishods/core` se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## 0.17.5 — 2026-11-24

### Agrega

- **`@taishods/core/mcp`: el servidor de `taisho mcp` como API.** `createMcpServer` (sólo Node) arma el servidor con herramientas propias, reemplazo de las del Core e instrucciones adicionales. Los nombres de las herramientas del Core pasan a ser públicos.
- **`@taishods/core/color`: los colores finales del tema.** `resolveThemeColors` da el valor en sRGB de cada color, en claro y en oscuro; `contrastRatio`, la proporción de contraste WCAG 2; `compositeOver`, la composición de un color con alfa sobre un fondo opaco. Sirve también en el navegador.
### In English

#### Added

- **`@taishods/core/mcp`: the `taisho mcp` server as an API.** `createMcpServer` (Node only) builds the server with your own tools, replacements for Core's tools and extra instructions. The names of Core's tools are now public.
- **`@taishods/core/color`: the final colors of the theme.** `resolveThemeColors` gives the sRGB value of each color, in light and dark; `contrastRatio`, the WCAG 2 contrast ratio; `compositeOver`, a color with alpha composited over an opaque background. It also works in the browser.

## 0.17.0 — 2026-11-23

### Rompe

- **El comando `taisho` y el plugin de Vite piden Node 26 o superior** (antes, 22.18). Node 26 es la versión LTS activa de Node. Con Node 22 o 24, `npm i` avisa por `engines` y `taisho` termina con código 1 y el mensaje «hace falta Node 26 o superior». El CDN no requiere Node y no cambia. Para actualizar: instalar Node 26 (por ejemplo, `nvm install 26`) y volver a correr el comando.
- **`taisho check` y la herramienta `validate_markup` del servidor MCP revisan la estructura de los componentes del Core, y `check` puede salir con 1 donde antes salía con 0.** Antes daban «0 avisos» aunque el componente quedara muerto. Hay dos reglas nuevas, de severidad `error`. `missing-part` avisa una raíz (`data-ts-number`) sin una pieza que el JavaScript del Core necesita adentro: el NumberInput sin `data-ts-number-field` en su `<input>`, el Select sin su disparador `data-ts-listbox-trigger`, el DatePicker sin su grilla, el Slider de rango sin su riel; también Accordion, Tabs, Pagination, Combobox, Command Palette, FileUpload y otros. `missing-root-attribute` avisa, en `.html`, un elemento con `ts` y la clase de un componente (`number-input`) sin su gancho raíz. En `.svelte`, `.vue`, `.jsx`, `.tsx` y `.astro` sólo se aplica `missing-part`, y se calla cuando no se puede saber qué hay adentro (un componente, `<slot>`, hijos o una expansión de atributos). `validate_markup` devuelve `valid: false` en esos casos. Para arreglarlo, se agrega el atributo que nombra el aviso.
- **Los avisos del tema cambian: `seed-shifted` desaparece.** Lo reemplazan `seed-low-contrast` y `seed-exact`, con otros parámetros (`text`, `bg`, `textShifted`, `bgShifted`). Quien tipa o lee esos avisos tiene que actualizarse. Ver `seedFit` en «Agrega».
- **El botón de limpiar cambia el orden de sus eventos:** ahora emite primero `ts:change` y después `input` y `change` (antes, `input` y `change` primero). Quien escuchaba `input` o `change` y dependía de que llegaran antes de `ts:change` tiene que revisarlo.

### Agrega

- **`seedFit` en el tema** (`taisho generate` y `createTheme`) para elegir, por color, qué pasa con uno que cae entre dos pasos de la escala: `'shift'` lo adapta al borde más cercano que llega a AA y `'keep'` lo deja exacto. La clave es `brand`, otro color de `colors`, un estado o `primary`; un valor que no sea `'shift'` ni `'keep'`, o una clave que no sea un color del tema, corta la generación con la ruta exacta. Sin elegir, el motor mide el color con el texto encima y contra el fondo (4,5:1 cada uno): si no llega con alguno se adapta y se avisa con los números (`seed-low-contrast`, cuenta para `--strict`), y si llega con los dos queda exacto y se informa (`seed-exact`, línea `ℹ` que no cuenta para `--strict`). Un estado con el valor de fábrica no avisa.
- **La clase `number-input-step` en los dos botones de paso del NumberInput** (decrementar e incrementar). No lleva estilo propio: sirve para que `taisho check` y `validate_markup` avisen un botón de paso sin su `data-ts-number-step`, con el que el JavaScript del Core no hace nada. Se escribe junto al atributo: `<button class="ts button number-input-step" data-ts-number-step="1">`.
- **Radio acepta contenido propio y `aria-describedby`.** El contenido va dentro de la tarjeta y no entra al nombre (sin botones ni enlaces, porque queda dentro del `<label>`). El `aria-describedby` va al `<input>`.

### Cambia

- **El CSS a demanda trae menos.** `taisho generate` con `content` ya no trae todo lo que un componente puede tener: sólo los tamaños de ícono que el proyecto nombra (`icon-16`, o el número suelto: `width="16"`, `size={16}`), en lugar de los 36 de la escala; los extras de Card sólo si se nombran (`has-glow`, `data-card-spotlight`, `has-ambilight`, `has-grayscale` y cada relación de aspecto, `aspect-16/9`…); y, de un componente usado, el bloque principal (`card`, `select`…) más los secundarios (`card-media`, `select-dropdown`…) sólo si el proyecto los nombra, si los crea el JavaScript del Core o si el componente está en el `safelist`, que lo sigue trayendo entero. Una clase armada en tiempo de ejecución (`icon-${n}`, `card-${x}`) trae todo lo que puede generar. Ninguno de los 56 catálogos del Core crece y 38 bajan (mediana −147 B gzip; CommandPalette −1.065 B, Select −987 B). Si algo se arma de una forma que el escáner no ve, se agrega el componente al `safelist`. El archivo completo y el CDN no cambian.
- **La adaptación de un color entre dos pasos ya no va siempre al borde más cercano.** Va al borde más cercano que llega a AA con el texto y contra el fondo (hoy, el del paso 600), y las dos medidas se hacen sobre el color tal como lo pinta el navegador (sRGB de 8 bits; el color tiene que llegar a 4,5:1 también sobre el valor sin redondear). Un color que ya llega a AA queda exacto en lugar de adaptarse; en esos colores el cambio de aspecto es de hasta 0,012 de luminosidad (en una grilla de 52³ colores, 4.745 escalas pasan de adaptarse a quedar exactas y 298 de ellas se adaptaban 0,01 o más). Los colores que sí se adaptan pueden ir más lejos que antes: hasta 0,06 de luminosidad, contra 0,03.
- **Frenar `ts:change` con `event.preventDefault()` evita el cambio** también en Combobox al escribir (el filtrado queda a cargo del código), en Pagination al cambiar el tamaño de página, en el botón de limpiar y en NumberInput al corregir el texto al salir del campo. Sólo el aviso de la búsqueda de un Combobox que se vacía al elegir una opción no se puede frenar.
- **El aviso de que el CSS y el JavaScript del Core son de versiones distintas sale sólo en desarrollo local** (`localhost`, `127.0.0.1`, `[::1]`, `*.localhost` o un archivo abierto), igual que el aviso de la llave `ts` y el de los diálogos sin nombre accesible. En producción ya no sale, y su código y su texto dejan de viajar en la base de `taisho.core.js` (−207 B gzip en el Modo directo): el navegador los pide en un archivo aparte, sólo en desarrollo local.
- **Radio con `description` (o con contenido propio) usa sólo la etiqueta como nombre accesible** y lee la descripción aparte. Para quien lo usaba: el nombre accesible del radio deja de incluir la descripción, y un `aria-describedby` pasado a Radio va al `<input>` y ya no al `<label>`.

### Arregla

- **Un componente que un framework (o un `fetch`) agrega después de la carga se dibuja igual que el que estaba al cargar.** Antes respondía a la interacción pero quedaban sin dibujar el valor de Progress, el relleno de Slider, las páginas de Pagination, el calendario de DatePicker, las medidas de AspectRatio y ScrollArea, Combobox y TOC. No hace falta llamar a `init()`. También: los botones de NumberInput se deshabilitan cuando el código deshabilita su campo. El JavaScript del Core crece 262 B gzip.
- **El botón de copiar de Code anuncia «Copiado» a los lectores de pantalla,** en una región viva (antes sólo cambiaba el ícono).
- **El servidor MCP (`list_components` y `get_component`) y las fichas del `llms.txt` decían «no necesita JavaScript» de Checkbox, Radio, Toggle, Popover, Modal y Drawer,** que usan el JavaScript del Core. Ahora `needsJs` es `true` en esos seis, y la ficha dice que el componente necesita `taisho.core.js` aunque no lleve atributos `data-ts-*` (el Core lo encuentra por sus clases). En Modal y Drawer dice que el navegador los resuelve y que el JavaScript del Core los completa donde el navegador no llega. Quedan 40 componentes con `needsJs: true`: los 38 que usan el JavaScript del Core y los 2 nativos.
- **Un `taisho.config.ts` sin `fontFaces` ya no corta `taisho generate` con un error de JavaScript:** sin la clave no se carga ninguna fuente, y la clave pasa a ser opcional en el tipo. El `safelist` acepta los modificadores de los componentes que `taisho check` reconoce (`icon-48`), y una relación de aspecto de `card-media` armada en tiempo de ejecución (`aspect-${r}`) trae todas las del CSS a demanda.

### In English

#### Breaking

- **The `taisho` command and the Vite plugin require Node 26 or newer** (it was 22.18). Node 26 is Node's active LTS. On Node 22 or 24, `npm i` warns through `engines` and `taisho` exits with code 1 and the message "Node 26 or newer is required". The CDN needs no Node and does not change. To upgrade: install Node 26 (for example, `nvm install 26`) and run the command again.
- **`taisho check` and the MCP server's `validate_markup` tool check the structure of Core components, and `check` can exit with 1 where it used to exit with 0.** They used to report "0 warnings" even when the component was dead. There are two new rules, with `error` severity. `missing-part` flags a root (`data-ts-number`) that lacks a part Core's JavaScript needs inside it: the NumberInput without `data-ts-number-field` on its `<input>`, the Select without its `data-ts-listbox-trigger` trigger, the DatePicker without its grid, the range Slider without its rail; also Accordion, Tabs, Pagination, Combobox, Command Palette, FileUpload and others. `missing-root-attribute` flags, in `.html`, an element with `ts` and a component's class (`number-input`) but without its root hook. In `.svelte`, `.vue`, `.jsx`, `.tsx` and `.astro` only `missing-part` applies, and it stays silent when what is inside cannot be known (a component, `<slot>`, children or an attribute spread). `validate_markup` returns `valid: false` in those cases. To fix it, add the attribute the warning names.
- **The theme warnings change: `seed-shifted` is gone.** `seed-low-contrast` and `seed-exact` replace it, with other parameters (`text`, `bg`, `textShifted`, `bgShifted`). Anyone who types or reads those warnings has to update. See `seedFit` under "Added".
- **The clear button changes the order of its events:** it now emits `ts:change` first and then `input` and `change` (before, `input` and `change` came first). Code that listened to `input` or `change` and relied on them arriving before `ts:change` has to be reviewed.

#### Added

- **`seedFit` in the theme** (`taisho generate` and `createTheme`) to choose, per color, what happens to one that falls between two steps of the scale: `'shift'` moves it to the nearest edge that reaches AA and `'keep'` leaves it exact. The key is `brand`, another color in `colors`, a status, or `primary`; a value that is not `'shift'` or `'keep'`, or a key that is not a color of the theme, stops the generation with the exact path. If nothing is chosen, the engine measures the color with text on top of it and against the background (4.5:1 each): if it falls short on either, it is shifted and the numbers are reported (`seed-low-contrast`, counts toward `--strict`), and if it reaches both it stays exact and that is reported (`seed-exact`, an `ℹ` line that does not count toward `--strict`). A status with its default value does not warn.
- **The `number-input-step` class on the two step buttons of the NumberInput** (decrement and increment). It has no style of its own: it lets `taisho check` and `validate_markup` flag a step button without its `data-ts-number-step`, without which Core's JavaScript does nothing. It is written next to the attribute: `<button class="ts button number-input-step" data-ts-number-step="1">`.
- **Radio accepts custom content and `aria-describedby`.** The content goes inside the card and does not enter the name (no buttons or links, because it sits inside the `<label>`). `aria-describedby` goes on the `<input>`.

#### Changed

- **On-demand CSS brings less.** `taisho generate` with `content` no longer brings everything a component can have: only the icon sizes the project names (`icon-16`, or the bare number: `width="16"`, `size={16}`), instead of the 36 on the scale; Card's extras only if named (`has-glow`, `data-card-spotlight`, `has-ambilight`, `has-grayscale` and each aspect ratio, `aspect-16/9`…); and, for a component in use, its main block (`card`, `select`…) plus the secondary ones (`card-media`, `select-dropdown`…) only if the project names them, if Core's JavaScript creates them, or if the component is in the `safelist`, which still brings it whole. A class built at runtime (`icon-${n}`, `card-${x}`) brings everything it can generate. None of the 56 Core catalogs grows and 38 shrink (median −147 B gzip; CommandPalette −1,065 B, Select −987 B). If something is built in a way the scanner cannot see, add the component to the `safelist`. The full file and the CDN do not change.
- **Shifting a color that falls between two steps no longer always goes to the nearest edge.** It goes to the nearest edge that reaches AA with text and against the background (today, the one at step 600), and both measurements are made on the color as the browser paints it (8-bit sRGB; the color has to reach 4.5:1 on the unrounded value too). A color that already reaches AA stays exact instead of being shifted; for those colors the visual change is up to 0.012 of lightness (on a 52³ color grid, 4,745 scales go from shifted to exact and 298 of them were shifted by 0.01 or more). The colors that are shifted can go farther than before: up to 0.06 of lightness, versus 0.03.
- **Stopping `ts:change` with `event.preventDefault()` prevents the change** in Combobox when typing too (filtering is left to your code), in Pagination when the page size changes, in the clear button, and in NumberInput when the text is corrected on leaving the field. Only the notice for a Combobox search that empties when an option is chosen cannot be stopped.
- **The notice that Core's CSS and JavaScript are from different versions appears only in local development** (`localhost`, `127.0.0.1`, `[::1]`, `*.localhost` or an open file), like the notice for the `ts` key and the one for dialogs without an accessible name. In production it no longer appears, and its code and text no longer ship in the base of `taisho.core.js` (−207 B gzip in Direct mode): the browser requests them from a separate file, only in local development.
- **Radio with `description` (or with custom content) uses only the label as its accessible name** and reads the description separately. For those who used it: the radio's accessible name no longer includes the description, and an `aria-describedby` passed to Radio goes on the `<input>` and no longer on the `<label>`.

#### Fixed

- **A component that a framework (or a `fetch`) adds after load is drawn the same as one that was there at load.** Before, it responded to interaction but the value of Progress, the fill of Slider, the pages of Pagination, the calendar of DatePicker, the measurements of AspectRatio and ScrollArea, Combobox and TOC stayed undrawn. You do not need to call `init()`. Also: the NumberInput buttons are disabled when code disables its field. Core's JavaScript grows by 262 B gzip.
- **The copy button of Code announces "Copied" to screen readers,** in a live region (before, only the icon changed).
- **The MCP server (`list_components` and `get_component`) and the `llms.txt` sheets said "needs no JavaScript" for Checkbox, Radio, Toggle, Popover, Modal and Drawer,** which use Core's JavaScript. Now `needsJs` is `true` for those six, and the sheet says the component needs `taisho.core.js` even without `data-ts-*` attributes (Core finds it by its classes). For Modal and Drawer it says the browser resolves them and Core's JavaScript completes them where the browser does not reach. 40 components remain with `needsJs: true`: the 38 that use Core's JavaScript and the 2 native ones.
- **A `taisho.config.ts` without `fontFaces` no longer stops `taisho generate` with a JavaScript error:** without the key no font is loaded, and the key becomes optional in the type. The `safelist` accepts the modifiers of the components that `taisho check` recognizes (`icon-48`), and a `card-media` aspect ratio built at runtime (`aspect-${r}`) brings all of those in the on-demand CSS.

## 0.16.0 — 2026-11-16

### Agrega

- **`taisho mcp`: un servidor MCP local para asistentes de código.** Corre en la máquina de quien lo usa, por stdio, sólo lee y no usa red ni envía telemetría. Trae seis herramientas: `list_components` (la lista de componentes, con su total), `get_component` (la referencia de uno: qué es, cuándo usarlo, ejemplos y teclado), `search_utilities` (busca utilidades por nombre y dice cuántas coincidieron), `validate_markup` (revisa el marcado con las reglas del sistema), `translate_tailwind` (convierte marcado con clases de Tailwind, con la misma tabla que `taisho migrate --from tailwind`) y `get_theme` (el tema del proyecto). Acepta `--config` y `--lang`. El paquete suma la carpeta `mcp/`, con los ejemplos HTML y la prosa de cada componente, por idioma.
- **`taisho init` ofrece instalar `lucide-static`.** Pregunta y lo instala con el gestor del proyecto (npm, pnpm, yarn o bun). La bandera `--install-icons` responde que sí sin preguntar. Sin terminal interactiva no instala: imprime el comando.
- **Guía para asistentes de IA.** El sitio publica `/llms.txt` y `/llms-full.txt` (en español, bajo `/es/`) y una ficha en Markdown por componente (`/docs/<componente>.md`), con las reglas para escribir el marcado.
- **Documentación nueva:** la guía «Asistentes de IA» (`llms.txt`, las fichas y el servidor MCP, con la configuración de cada cliente), la referencia de la línea de comandos (`init`, `generate`, `watch`, `check`, `migrate` y `mcp`, con todas sus banderas), la regla de los márgenes negativos en la guía de nombres de clases y el ejemplo «Enlace de pie o de menú» en la página del Link.

### Cambia

- **`taisho migrate --from tailwind` y la herramienta `translate_tailwind` convierten todos los márgenes negativos.** Antes sólo conocían `-m-1`, `-m-2`, `-m-4` y `-m-8`; ahora `-mx-2` pasa a `mx-neg-8`, `-mt-4` a `mt-neg-16` y `-ml-4` a `ms-neg-16` (lado lógico), y así con los demás lados y pasos. Lo que no está en la escala (`-mx-96`) queda como sin equivalente, con su motivo. Las utilidades ya existían: no cambia el CSS.
- **El foco del teclado en los enlaces y en la navegación sube al mismo color que con el cursor.** El enlace sutil (`variant="subtle"`) y los enlaces o ítems de las migas de pan, el índice de una página, la barra lateral, la barra de navegación y el paginador tomaban su color pleno sólo con el cursor; ahora lo toman también al recibir foco con el teclado, además del aro de foco. El marcado no cambia.
- **`taisho generate` avisa de `lucide-static` sólo si hay íconos usados que no se resuelven por faltar el paquete,** y dice la consecuencia.
- **En Windows, las rutas que `taisho generate` da para pegar en el HTML salen con `/`,** como las ve el navegador.
- **El archivo `NOTICE` del paquete nombra los íconos de Lucide que el Core incluye** (los trazos que usan `core.js` y los ejemplos de `mcp/`) y trae el texto de su licencia.
- **Los azules casi puros quedan exactos en su paso.** Con colores como `#0000ff` o `#0000cc`, el motor de paletas recortaba la saturación del color de partida aunque la pantalla sRGB pudiera mostrarlo, y el paso salía con otro azul (`#0031e5` en lugar de `#0000ff`) sin avisar. Ahora un color que ya está dentro de la gama no se recorta. Sólo cambia el resultado para esos azules; el resto de las paletas sale igual.
- **Un color pegado al borde entre dos pasos ya no se adapta.** El motor de paletas podía mandarlo al paso vecino y moverlo un poco, aunque el suyo lo contenía; pasaba en 10 de 8.192 escalas de prueba. Y un color de partida cuyo valor cambiaba en 1 sobre 255 al escribirse con cuatro decimales ahora se escribe con los que hagan falta para quedar exacto.

### In English

#### Added

- **`taisho mcp`: a local MCP server for coding assistants.** It runs on the user's machine over stdio, is read-only, and uses no network and sends no telemetry. It has six tools: `list_components` (the list of components, with its total), `get_component` (one component's reference: what it is, when to use it, examples and keyboard), `search_utilities` (searches utilities by name and says how many matched), `validate_markup` (checks markup against the system's rules), `translate_tailwind` (converts markup with Tailwind classes, using the same table as `taisho migrate --from tailwind`) and `get_theme` (the project's theme). It accepts `--config` and `--lang`. The package adds the `mcp/` folder, with the HTML examples and the prose of each component, per language.
- **`taisho init` offers to install `lucide-static`.** It asks, and installs it with the project's package manager (npm, pnpm, yarn or bun). The `--install-icons` flag answers yes without asking. Without an interactive terminal it does not install: it prints the command.
- **A guide for AI assistants.** The site publishes `/llms.txt` and `/llms-full.txt` (the Spanish ones under `/es/`) and one Markdown sheet per component (`/docs/<component>.md`), with the rules for writing the markup.
- **New documentation:** the "AI assistants" guide (`llms.txt`, the sheets and the MCP server, with the setup for each client), the command-line reference (`init`, `generate`, `watch`, `check`, `migrate` and `mcp`, with all their flags), the negative margins rule in the class naming guide and the "Footer or menu link" example on the Link page.

#### Changed

- **`taisho migrate --from tailwind` and the `translate_tailwind` tool convert every negative margin.** They used to know only `-m-1`, `-m-2`, `-m-4` and `-m-8`; now `-mx-2` becomes `mx-neg-8`, `-mt-4` becomes `mt-neg-16` and `-ml-4` becomes `ms-neg-16` (logical side), and so on for the other sides and steps. What is not on the scale (`-mx-96`) is reported as having no equivalent, with the reason. The utilities already existed: the CSS does not change.
- **Keyboard focus on links and navigation rises to the same color as with the pointer.** The subtle link (`variant="subtle"`) and the links or items of the breadcrumbs, the page index, the sidebar, the navigation bar and the pager took their full color only with the pointer; now they take it on keyboard focus too, in addition to the focus ring. The markup does not change.
- **`taisho generate` warns about `lucide-static` only when icons in use cannot be resolved because the package is missing,** and says what follows from it.
- **On Windows, the paths `taisho generate` prints to paste into the HTML use `/`,** as the browser sees them.
- **The package's `NOTICE` file names the Lucide icons Core includes** (the paths used by `core.js` and the examples in `mcp/`) and carries the text of their license.
- **Near-pure blues stay exact on their step.** With colors like `#0000ff` or `#0000cc`, the palette engine clipped the starting color's chroma even though an sRGB screen could show it, and the step came out as a different blue (`#0031e5` instead of `#0000ff`) with no notice. A color that is already inside the gamut is no longer clipped. Only those blues change; every other palette comes out the same.
- **A color right at the edge between two steps is no longer shifted.** The palette engine could send it to the neighboring step and move it slightly, even though its own step contained it; that happened in 10 of 8,192 test scales. And a starting color whose value changed by 1 in 255 when written with four decimals is now written with as many as it takes to stay exact.

## 0.15.1 — 2026-11-15

### Agrega

- **Campo `out` en `taisho.config.ts`: la carpeta de salida.** Precedencia: `--out`, luego `out` de la config y, si no hay ninguno, `./taisho` junto al archivo de config. Lo leen `taisho generate`, `watch`, `check` y `migrate` y el plugin de Vite.
- **`taisho init` pregunta la carpeta de salida.** Propone `./taisho` si el `package.json` declara un empaquetador (Vite no permite importar JS ni CSS desde `public/`) y, si no, `public/taisho` o `static/taisho` cuando esas carpetas existen.
- **`taisho generate` copia siempre el JavaScript de comportamiento a la carpeta de salida.** Antes, sin `content`, la línea impresa apuntaba a `node_modules`. Las líneas para pegar salen con la ruta que ve el navegador.

### Cambia

- **Cambio incompatible: el valor por defecto de la salida es relativo al archivo de config, no al directorio desde el que se corre.** Sólo difiere al usar `--config otra/ruta` sin `--out`: antes la salida iba a `./taisho` del directorio actual; ahora va a `./taisho` junto a esa config. Para conservar la ubicación anterior, se indica `--out` o `out` en la config.
- El README, la guía de consumo (`CONSUMING.md`) y la documentación ya no enlazan nada desde `node_modules`, y suman una sección de importaciones para empaquetador.

### In English

#### Added

- **New `out` field in `taisho.config.ts`: the output folder.** Precedence: `--out`, then the config's `out`, then `./taisho` next to the config file. It is read by `taisho generate`, `watch`, `check` and `migrate`, and by the Vite plugin.
- **`taisho init` asks for the output folder.** It suggests `./taisho` when `package.json` declares a bundler (Vite cannot import JS or CSS from `public/`), otherwise `public/taisho` or `static/taisho` when those folders exist.
- **`taisho generate` always copies the behavior JavaScript to the output folder.** Before, without `content`, the printed line pointed into `node_modules`. The lines to paste use the path the browser sees.

#### Changed

- **Breaking: the default output is now relative to the config file, not to the directory where the command runs.** It only differs when using `--config other/path` without `--out`: the output used to go to `./taisho` in the current directory and now goes to `./taisho` next to that config. Pass `--out` or set `out` in the config to keep the previous location.
- The README, the consuming guide (`CONSUMING.md`) and the docs no longer link anything from `node_modules`, and add a section on imports for bundlers.

## 0.15.0 — 2026-11-14

Primera versión pública de TaishoDS Core: el CSS del sistema, los tokens y el JavaScript de comportamiento, para usar en cualquier página HTML, con licencia MIT. Es una versión beta: mientras la versión mayor sea 0, un cambio de versión menor puede traer cambios incompatibles y se anuncian aquí.

### Qué es

TaishoDS Core es HTML, CSS y JavaScript, sin framework. Los componentes se escriben como marcado con clases (`class="ts button variant-primary"`) y atributos `data-ts-*`; el JavaScript opcional los vuelve interactivos.

### Qué trae

- 56 componentes: 38 con JavaScript de comportamiento, 2 nativos del navegador y 16 sólo HTML y CSS.
- Tokens, utilidades y un tema claro y oscuro derivado de una semilla de color, con contrastes accesibles calculados.
- `createTheme()` para cambiar el tema en el navegador.
- El comando `taisho`, con `init`, `generate`, `watch`, `check` y `migrate`: compila sólo el CSS que usa cada proyecto, con su marca y sus fuentes, y revisa las clases escritas.
- Un plugin de Vite en `@taishods/core/vite`.
- Tipos de TypeScript compatibles con `moduleResolution` `node16`, `nodenext` y `bundler`.
- Textos del JavaScript en español e inglés, según el atributo `lang`.

### Formas de uso

- **Por CDN**, sin instalar nada: dos `<link>` y un `<script type="module">` desde `https://taisho.design/core/0.15.0/`, con `integrity` y `crossorigin`. La versión va fija en la URL.
- **Compilado**, con tu marca en el CSS: `npm i -D @taishods/core`, `npx taisho init` y `npx taisho generate`.

### Requisitos

- Node 22.18 o superior para el comando `taisho` y el plugin de Vite. Con una versión anterior, el comando termina con un mensaje que lo explica. El CDN no requiere Node.
- Navegadores: el piso es Baseline «ampliamente disponible» al 10 de noviembre de 2026, es decir Chrome y Edge 124, Firefox 125 y Safari 17.4 (también en iOS). Lo que supera ese piso tiene un respaldo o degrada sin perder la funcionalidad; en navegadores de esas versiones no se probó.

### Límites conocidos

- No se probó con lectores de pantalla (VoiceOver o NVDA) ni en un iPhone o un iPad reales. Se prueba con axe, con nombres y descripciones accesibles calculados y con teclado y foco en Chromium, Firefox y WebKit de escritorio; el inicio rápido por CDN también en WebKit con un iPhone emulado, que no es un iPhone real. No existe un ACR/VPAT formal (informe de conformidad de accesibilidad).
- Frameworks probados con el paquete real (Modal y Select, en desarrollo y en producción, en Chromium, Firefox y WebKit): Astro 7.4.12 y 6.4.8 (salida estática), Next 16.4.6 (App Router, Turbopack, páginas estáticas) y SvelteKit 3.2.0 (con `adapter-node`). Vite, sin framework y con el plugin, se prueba en la integración continua del repositorio. Cualquier otro framework, versión o modo de despliegue no se probó y no se afirma que funcione; el detalle está en la página de Compatibilidad de la documentación.
- Un componente que el framework controle con su propio estado (por ejemplo, un `hidden` o un `aria-expanded` que el componente actualice) no se probó: el Core escribe esos atributos en el DOM.
- El JavaScript de comportamiento toca `document` al cargarse: en un framework con renderizado en servidor se carga sólo en el navegador.
- Un tema propio exige compilar con `taisho generate`; el CDN sirve el tema de TaishoDS.
- La API es de la versión 0.x y puede cambiar entre versiones menores.

### Cómo notificar un problema

Los errores y las propuestas van a los Issues del repositorio; las vulnerabilidades, por el procedimiento de `SECURITY.md`.

### In English

First public release of TaishoDS Core: the system CSS, the tokens and the behavior JavaScript, for any HTML page, under the MIT license. It is a beta: while the major version is 0, a minor version can bring breaking changes, and they are announced here.

#### What it is

TaishoDS Core is HTML, CSS and JavaScript, with no framework. Components are written as markup with classes (`class="ts button variant-primary"`) and `data-ts-*` attributes; the optional JavaScript makes them interactive.

#### What it includes

- 56 components: 38 with behavior JavaScript, 2 native to the browser and 16 plain HTML and CSS.
- Tokens, utilities and a light and dark theme derived from a seed color, with accessible contrasts calculated.
- `createTheme()` to change the theme in the browser.
- The `taisho` command, with `init`, `generate`, `watch`, `check` and `migrate`: it builds only the CSS each project uses, with its brand and its fonts, and checks the classes you write.
- A Vite plugin at `@taishods/core/vite`.
- TypeScript types compatible with `node16`, `nodenext` and `bundler` module resolution.
- JavaScript texts in Spanish and English, according to the `lang` attribute.

#### Ways to use it

- **From a CDN**, with nothing to install: two `<link>` tags and a `<script type="module">` from `https://taisho.design/core/0.15.0/`, with `integrity` and `crossorigin`. The version is fixed in the URL.
- **Compiled**, with your brand in the CSS: `npm i -D @taishods/core`, `npx taisho init` and `npx taisho generate`.

#### Requirements

- Node 22.18 or newer for the `taisho` command and the Vite plugin. With an older version, the command exits with a message that explains it. The CDN needs no Node.
- Browsers: the floor is Baseline "widely available" as of November 10, 2026, that is Chrome and Edge 124, Firefox 125 and Safari 17.4 (also on iOS). What goes beyond that floor has a fallback or degrades without losing functionality; it was not tested in browsers at those versions.

#### Known limits

- Not tested with screen readers (VoiceOver or NVDA) or on a real iPhone or iPad. It is tested with axe, with computed accessible names and descriptions, and with keyboard and focus in desktop Chromium, Firefox and WebKit; the CDN quick start is also tested on WebKit with an emulated iPhone, which is not a real iPhone. There is no formal ACR/VPAT (accessibility conformance report).
- Frameworks tested with the real package (Modal and Select, in development and in production, on Chromium, Firefox and WebKit): Astro 7.4.12 and 6.4.8 (static output), Next 16.4.6 (App Router, Turbopack, static pages) and SvelteKit 3.2.0 (with `adapter-node`). Vite, with no framework and with the plugin, is tested in the repository's continuous integration. Any other framework, version or deployment mode was not tested and is not claimed to work; the details are on the Compatibility page of the documentation.
- A component that the framework controls with its own state (for example, a `hidden` or an `aria-expanded` that the component updates) was not tested: Core writes those attributes in the DOM.
- The behavior JavaScript touches `document` when it loads: in a framework with server-side rendering it is loaded only in the browser.
- A custom theme requires compiling with `taisho generate`; the CDN serves the TaishoDS theme.
- The API is 0.x and can change between minor versions.

#### Reporting a problem

Bugs and proposals go to the Issues of the repository; vulnerabilities, through the procedure in `SECURITY.md`.
