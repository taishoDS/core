**Español** · [English](README.en.md)

# @taishods/core

*Coherencia que escala.*

El Core de TaishoDS: el CSS del sistema, los tokens y el JavaScript de comportamiento, para
usar en cualquier página HTML. Gratis, licencia MIT. Sin Svelte, sin React.

Hay dos formas de tenerlo en tu proyecto. Son el mismo Core y se puede pasar de una a otra en cualquier momento.

## 1. Por CDN: tres líneas

Es la más corta, no instala nada. La versión va fija en la URL:

```html
<link rel="stylesheet" href="https://taisho.design/core/0.17.0/taisho.tokens.css" integrity="sha384-VMPrJK8fhP6aNSgEn2CP9vxB+K8egd/t1xBN+/OruDS1k+zXuJFa4o5YuvyJzoQg" crossorigin="anonymous">
<link rel="stylesheet" href="https://taisho.design/core/0.17.0/taisho.full.css" integrity="sha384-gCXB8cDetWCI66AXYnjx4cjDpOTRjzgp56YIFFgo5WsvMKR/v+y0saavwBIMIE/i" crossorigin="anonymous">
<script type="module" src="https://taisho.design/core/0.17.0/taisho.core.js" integrity="sha384-4utaT8s1WXAiyPZ/iwMgTKRxxPgvYW3QZHXVDQ9U0hm2hCPDOlZ3MzX/KrTGgxkW" crossorigin="anonymous"></script>
```

El orden importa: primero el tema, que define las variables; después el CSS del sistema, que las
consulta; al final el JS, que se inicializa solo. Las clases se escriben con la llave `ts` en el
mismo elemento: `class="ts button size-md variant-primary"`.

## 2. Con este paquete: tu marca en el CSS

Para que el CSS lleve tus colores y fuentes, y sólo las clases que se usan, se instala el paquete y
se corre el comando `taisho` desde la raíz de tu proyecto (Node 26 o más nuevo):

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

- **CSS completo** — `css/taisho.full.css`, con todos los componentes del Core y las utilidades.
- **Tema del sistema** — `css/tokens/taisho.css`.
- **Comportamiento** — `core.js`: acordeones, pestañas, select, combobox, calendario, tabla
  ordenable y paleta de comandos, que se enganchan por atributos `data-ts-*`.
- **Theming en el navegador** — `createTheme()`: se le pasa un color en hexadecimal y se repinta
  todo, con modo oscuro y contrastes accesibles derivados solos.
- **El comando `taisho`** — `init`, `generate`, `watch`, `check`, `migrate` y `mcp`: compilan el CSS con tu marca, lo recompilan al guardar, revisan las clases, migran desde otros sistemas y le dan datos del sistema a un asistente de IA.

## Qué no trae

Componentes de ningún framework: el Core es HTML, CSS y JavaScript, y se usa igual en cualquier página. Con un framework de por medio, se probó en Astro, Next (App Router) y SvelteKit: las versiones, los pasos y lo que no se probó están en https://taisho.design/docs/compatibility#frameworks.

## Con asistentes de IA

El sitio publica el Core en Markdown para modelos de lenguaje: https://taisho.design/es/llms.txt (el índice, con las reglas para escribir marcado) y una ficha por componente en `https://taisho.design/docs/<componente>.md`. Además, `npx taisho mcp` arranca un servidor MCP local y de sólo lectura (sin red ni telemetría) con seis herramientas para consultar componentes, utilidades y el tema del proyecto y para validar marcado. En la configuración del cliente (los que leen `mcpServers`):

```json
{ "mcpServers": { "taisho": { "command": "npx", "args": ["taisho", "mcp"] } } }
```

La configuración de cada cliente y las respuestas de cada herramienta están en https://taisho.design/docs/ai-assistants

## Documentación

Instalación, cada componente, los tokens y las utilidades: https://taisho.design/docs/installation

## Licencia

MIT. La marca "Taisho" no está incluida: ver TRADEMARK.md.
