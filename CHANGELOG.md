# Changelog

Todos los cambios relevantes de `@taishods/core` se documentan acá. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## 0.15.0 — 2026-11-14

Primera versión pública de TaishoDS Core: el CSS del sistema, los tokens y el JavaScript de comportamiento, para usar en cualquier página HTML, con licencia MIT. Es una versión beta: mientras la versión mayor sea 0, un cambio de versión menor puede traer cambios incompatibles y se anuncian acá.

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

- No se probó con lectores de pantalla (VoiceOver o NVDA) ni en un iPhone o un iPad reales. Se prueba con axe, con nombres y descripciones accesibles calculados y con teclado y foco en Chromium, Firefox y WebKit de escritorio; el inicio rápido por CDN también en WebKit con un iPhone emulado, que no es un iPhone real. No existe un ACR/VPAT formal.
- Frameworks probados con el paquete real (Modal y Select, en desarrollo y en producción, en Chromium, Firefox y WebKit): Astro 7.4.12 y 6.4.8 (salida estática), Next 16.4.6 (App Router, Turbopack, páginas estáticas) y SvelteKit 3.2.0 (con `adapter-node`). Vite, sin framework y con el plugin, se prueba en la integración continua del repositorio. Cualquier otro framework, versión o modo de despliegue no se probó y no se afirma que funcione; el detalle está en la página de Compatibilidad de la documentación.
- Un componente que el framework controle con su propio estado (por ejemplo, un `hidden` o un `aria-expanded` que el componente actualice) no se probó: el Core escribe esos atributos en el DOM.
- El JavaScript de comportamiento toca `document` al cargarse: en un framework con renderizado en servidor se carga sólo en el navegador.
- Un tema propio exige compilar con `taisho generate`; el CDN sirve el tema de TaishoDS.
- La API es de la versión 0.x y puede cambiar entre versiones menores.

### Cómo notificar un problema

Los errores y las propuestas van a los Issues del repositorio; las vulnerabilidades, por el procedimiento de `SECURITY.md`.

### In English

First public release of TaishoDS Core: the system CSS, the tokens and the behavior JavaScript, for any HTML page, under the MIT license. It is a beta: while the major version is 0, a minor version can bring breaking changes, and they are announced here.

- **What it includes:** 56 components (38 with behavior JavaScript, 2 native to the browser, 16 plain HTML and CSS); tokens, utilities and a light and dark theme derived from a seed color; `createTheme()`; the `taisho` command (`init`, `generate`, `watch`, `check`, `migrate`); a Vite plugin at `@taishods/core/vite`; TypeScript types for `node16`, `nodenext` and `bundler` module resolution; JavaScript texts in Spanish and English according to the `lang` attribute.
- **Ways to use it:** from the CDN (`https://taisho.design/core/0.15.0/`, with `integrity` and `crossorigin`), or compiled with your brand (`npm i -D @taishods/core`, `npx taisho init`, `npx taisho generate`).
- **Requirements:** Node 22.18 or newer for the `taisho` command and the Vite plugin; the CDN needs no Node. Browser floor: Baseline widely available as of 2026-11-10 (Chrome and Edge 124, Firefox 125, Safari 17.4, also on iOS).
- **Known limits:** not tested with screen readers or on a real iPhone or iPad (the quick start is tested on WebKit with an emulated iPhone); no formal ACR/VPAT. Frameworks tested with the real package: Astro 7.4.12 and 6.4.8 (static output), Next 16.4.6 (App Router, Turbopack, static pages) and SvelteKit 3.2.0 (`adapter-node`); Vite with the plugin. Anything else was not tested and is not claimed; see the Compatibility page. The API is 0.x and can change between minor versions.
