**Español** · [English](README.en.md)

# @taishods/core

*Coherencia que escala.*

El Core de TaishoDS: el CSS del sistema, los tokens y el JavaScript de comportamiento, para
usar en cualquier página HTML. Gratis, licencia MIT. Sin Svelte, sin React.

Hay dos formas de tenerlo en tu proyecto. Son el mismo Core y se puede pasar de una a otra en cualquier momento.

## 1. Por CDN: tres líneas

Es la más corta, no instala nada. La versión va fija en la URL:

```html
<link rel="stylesheet" href="https://taisho.design/core/0.15.0/taisho.tokens.css" integrity="sha384-+2WHAtu42BCWEq7KajKLeexi0n+E4UXhDgH4f5iQLZWhC0WJf3DNRH2uBr4FrdIV" crossorigin="anonymous">
<link rel="stylesheet" href="https://taisho.design/core/0.15.0/taisho.full.css" integrity="sha384-Q4p8fayuCmybnPl6l9HXyJZz4RweEW3ls0TT6mYaODd89tmBm/RhF5aMRrFXMJSb" crossorigin="anonymous">
<script type="module" src="https://taisho.design/core/0.15.0/taisho.core.js" integrity="sha384-aDnCXLrAb0LOoe1+BB7FZmWSc9VilhinDNU4cu4E4m+NaiWTM539k3rhWDg23Ib5" crossorigin="anonymous"></script>
```

El orden importa: primero el tema, que define las variables; después el CSS del sistema, que las
consulta; al final el JS, que se inicializa solo. Las clases se escriben con la llave `ts` en el
mismo elemento: `class="ts button size-md variant-primary"`.

## 2. Con este paquete: tu marca en el CSS

Para que el CSS lleve tus colores y fuentes, y sólo las clases que se usan, se instala el paquete y
se corre el comando `taisho` desde la raíz de tu proyecto (Node 22.18 o más nuevo):

```bash
npm i -D @taishods/core
npx taisho init       # pregunta idioma, marca, nombre del tema, fuentes e íconos propios, y escribe taisho.config.ts
npx taisho generate   # compila tu CSS a ./taisho/
```

Al terminar, `generate` imprime los `<link>` exactos para pegar en tu HTML. El JS de
comportamiento queda en `node_modules/@taishods/core/core.js` y se carga con
`<script type="module">`.

Para no generar nada, el tema del sistema y el CSS completo también se pueden enlazar directo
desde `node_modules`, en este orden:

```html
<link rel="stylesheet" href="node_modules/@taishods/core/css/tokens/taisho.css">
<link rel="stylesheet" href="node_modules/@taishods/core/css/taisho.full.css">
<script type="module" src="node_modules/@taishods/core/core.js"></script>
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
