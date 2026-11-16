# Changelog

Todos los cambios relevantes de `@taishods/core` se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

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
- **Un color pegado al borde entre dos pasos ya no se corre.** El motor de paletas podía mandarlo al paso vecino y moverlo un poco, aunque el suyo lo contenía; pasaba en 10 de 8.192 escalas de prueba. Y un color de partida cuyo valor cambiaba en 1 sobre 255 al escribirse con cuatro decimales ahora se escribe con los que hagan falta para quedar exacto.

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
