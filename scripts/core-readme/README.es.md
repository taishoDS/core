**Español** · [English](README.en.md)

# @taishods/core

*Coherencia que escala.*

El Core de TaishoDS: el CSS del sistema, los tokens y el JavaScript de comportamiento, para
usar en cualquier página HTML. Gratis, licencia MIT. Sin Svelte, sin React.

Hay dos formas de tenerlo en tu proyecto. Son el mismo Core y se puede pasar de una a otra en cualquier momento.

## 1. Por CDN: tres líneas

Es la más corta, no instala nada. La versión va fija en la URL:

```html
<link rel="stylesheet" href="https://taisho.design/core/{{version}}/taisho.tokens.css" integrity="{{integrity:taisho.tokens.css}}" crossorigin="anonymous">
<link rel="stylesheet" href="https://taisho.design/core/{{version}}/taisho.full.css" integrity="{{integrity:taisho.full.css}}" crossorigin="anonymous">
<script type="module" src="https://taisho.design/core/{{version}}/taisho.core.js" integrity="{{integrity:taisho.core.js}}" crossorigin="anonymous"></script>
```

El orden importa: primero el tema, que define las variables; después el CSS del sistema, que las
consulta; al final el JS, que se inicializa solo. Las clases se escriben con la llave `ts` en el
mismo elemento: `class="ts button size-md variant-primary"`.

## 2. Con este paquete: tu marca en el CSS

Para que el CSS lleve tus colores y fuentes, y sólo las clases que se usan, se instala el paquete y
se corre el comando `taisho` desde la raíz de tu proyecto (Node 22.18 o más nuevo):

```bash
npm i -D @taishods/core
npx taisho init       # pregunta idioma, marca, nombre del tema, fuentes e íconos propios y la carpeta de salida, y escribe taisho.config.ts
npx taisho generate   # compila tu CSS y copia el JS de comportamiento a esa carpeta
```

La carpeta de salida es la que se despliega con el sitio (por ejemplo `public/taisho`, `static/taisho` o
`./taisho`); `init` propone una según la estructura del proyecto y la guarda en `taisho.config.ts`. Al
terminar, `generate` imprime las líneas `<link>` y `<script>` exactas para pegar en el HTML. Tanto el CSS
como el JS de comportamiento quedan en esa carpeta, juntos:

```html
<link rel="stylesheet" href="taisho/theme.css">
<link rel="stylesheet" href="taisho/taisho.css">
<script type="module" src="taisho/taisho.core.js"></script>
```

### Con un empaquetador (Vite y similares)

Si el proyecto ya usa un empaquetador, el CSS y el JS se importan por nombre desde el paquete, sin copiar
ni enlazar archivos:

```js
import '@taishods/core/css/tokens/taisho.css'; // el tema del sistema
import '@taishods/core/css/taisho.full.css';   // el CSS completo
import '@taishods/core/core';                  // el comportamiento
```

## Qué trae

- **CSS completo** — `css/taisho.full.css`, con todos los componentes y utilidades.
- **Tema del sistema** — `css/tokens/taisho.css`.
- **Comportamiento** — `core.js`: acordeones, pestañas, select, combobox, calendario, tabla
  ordenable y paleta de comandos, que se enganchan por atributos `data-ts-*`.
- **Theming en el navegador** — `createTheme()`: se le pasa un color en hexadecimal y se repinta
  todo, con modo oscuro y contrastes accesibles derivados solos.
- **El comando `taisho`** — `init`, `generate`, `watch`, `check` y `migrate`: compilan el CSS con tu marca, lo recompilan al guardar, revisan las clases y migran desde otros sistemas.

## Qué no trae

Componentes de ningún framework: el Core es HTML, CSS y JavaScript, y se usa igual en cualquier página. Con un framework de por medio, se probó en Astro, Next (App Router) y SvelteKit: las versiones, los pasos y lo que no se probó están en https://taisho.design/docs/compatibility#frameworks.

## Documentación

Instalación, cada componente, los tokens y las utilidades: https://taisho.design/docs/installation

## Licencia

MIT. La marca "Taisho" no está incluida: ver TRADEMARK.md.
