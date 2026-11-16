// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { defaultStates } from '../../config/taisho.user';
import taisho from '../../config/themes/taisho';
import { defaultScales } from '../../config/scales';
import { SHADES } from '../../lib/theme/palette';
import { escalasDe } from '../naming-table';
import { tablaPrefijos, type Envoltura } from '../variantes';

export type IdiomaLlms = 'es' | 'en';

const lista = (items: readonly string[]) => items.map((i) => `\`${i}\``).join(', ');

/** Lo que el vocabulario cerrado acepta, leído del código: las palabras del ritmo, los colores de fábrica y los prefijos de variante. */
const palabrasDeRitmo = escalasDe().ritmo.filter((p) => !/^\d/.test(p));
const colores = ['gray', ...Object.keys(taisho.colors), ...Object.keys(defaultStates)];
const tabla = tablaPrefijos(defaultScales.screens);
const prefijosDe = (...tipos: Envoltura['tipo'][]) => [...tabla].filter(([, e]) => tipos.includes(e.tipo)).map(([k]) => k);
const pantallas = prefijosDe('media');
const maximos = prefijosDe('max');
const contenedores = prefijosDe('container');
const estados = prefijosDe('selector');

const hastaMil = `${SHADES[0]}…${SHADES[SHADES.length - 1]}`;

const es = `1. Todo elemento que usa clases del sistema lleva la clase \`ts\`: \`class="ts button size-md variant-primary"\`. Sin ella, el elemento no recibe estilo.

\`\`\`html
<button type="button" class="ts button size-md variant-primary">Guardar</button>
\`\`\`

2. En el marcado no se escribe \`ts-\`: el sistema usa \`ts\` como llave y las clases van sin prefijo (\`button\`, \`variant-primary\`, \`gap-base\`).

3. El vocabulario es cerrado: no hay valores arbitrarios (nada como \`p-[13px]\` ni \`w-[37%]\`). Una clase que no está en el vocabulario no hace nada, y \`npx taisho check\` la señala.

4. El espaciado se escribe con palabras (${lista(palabrasDeRitmo)}), que siguen la densidad del tema, o con números, que son píxeles (\`p-4\` es 4 px). Los márgenes negativos llevan \`neg-\` delante del valor (\`mx-neg-base\`, \`mt-neg-16\`).

\`\`\`html
<div class="ts flex gap-half p-base">
  <span class="ts badge">Nuevo</span>
</div>
\`\`\`

5. Los colores salen sólo de las escalas del tema: \`bg-{color}-{tono}\`, \`color-{color}-{tono}\`, \`border-{color}-{tono}\`. Con el tema de fábrica los colores son ${lista(colores)} y los tonos van de ${hastaMil}. Un tema propio puede sumar más (se ven con \`npx taisho check\`). No hay \`dark:\`: los tonos ya cambian solos en modo oscuro.

\`\`\`html
<div class="ts p-base bg-brand-100 color-brand-800">Aviso</div>
\`\`\`

6. Las variantes (el prefijo antes de los dos puntos) son una lista cerrada y se encadenan hasta tres, en este orden: pantalla o contenedor, grupo, estado.
- Pantallas: ${lista(pantallas)}; hasta una pantalla: ${lista(maximos)}; contenedores: ${lista(contenedores)}; impresión: \`print:\`.
- Estados: ${lista(estados)}, \`data-{nombre}:\`.
- Grupos: \`group-{estado}:\` y \`peer-{estado}:\`, con un nombre opcional (\`group-hover/fila:\`) para elegir cuál. El elemento de referencia lleva \`group\` o \`peer\`.

\`\`\`html
<div class="ts group p-half md:p-base">
  <span class="ts p-quarter group-hover:bg-gray-100">Título</span>
</div>
\`\`\`

7. Los componentes se copian de su ficha y no se inventan: el marcado de la ficha ya trae las clases, los roles ARIA y los atributos \`data-ts-*\`. El comportamiento sale de esos atributos y de \`taisho.core.js\`; si la ficha dice que no necesita JavaScript, no hay nada que cargar.

8. Después de escribir, se corre \`npx taisho check\` hasta que dé 0 avisos: cada aviso es una clase o una variable que el sistema no conoce.

9. Los íconos salen de Lucide: \`npm i -D lucide-static\` hace falta sólo si se usan íconos (\`npx taisho init\` ofrece instalarlo y \`npx taisho init --install-icons\` lo instala sin preguntar). Si el código usa íconos que no se resuelven por faltar el paquete, \`npx taisho generate\` lo avisa con el comando y termina con error; si el proyecto no usa íconos, no dice nada.`;

const en = `1. Every element that uses system classes carries the \`ts\` class: \`class="ts button size-md variant-primary"\`. Without it, the element gets no styles.

\`\`\`html
<button type="button" class="ts button size-md variant-primary">Save</button>
\`\`\`

2. Never write \`ts-\` in markup: \`ts\` is the key class, and the other classes carry no prefix (\`button\`, \`variant-primary\`, \`gap-base\`).

3. The vocabulary is closed: there are no arbitrary values (nothing like \`p-[13px]\` or \`w-[37%]\`). A class that isn't in the vocabulary does nothing, and \`npx taisho check\` flags it.

4. Spacing is written with words (${lista(palabrasDeRitmo)}), which follow the theme's density, or with numbers, which are pixels (\`p-4\` is 4 px). Negative margins take \`neg-\` before the value (\`mx-neg-base\`, \`mt-neg-16\`).

\`\`\`html
<div class="ts flex gap-half p-base">
  <span class="ts badge">New</span>
</div>
\`\`\`

5. Colors come only from the theme's scales: \`bg-{color}-{shade}\`, \`color-{color}-{shade}\`, \`border-{color}-{shade}\`. With the default theme the colors are ${lista(colores)} and the shades run from ${hastaMil}. A custom theme can add more (\`npx taisho check\` shows them). There is no \`dark:\`: shades already switch by themselves in dark mode.

\`\`\`html
<div class="ts p-base bg-brand-100 color-brand-800">Notice</div>
\`\`\`

6. Variants (the prefix before the colon) are a closed list, and up to three can be chained, in this order: screen or container, group, state.
- Screens: ${lista(pantallas)}; up to a screen: ${lista(maximos)}; containers: ${lista(contenedores)}; print: \`print:\`.
- States: ${lista(estados)}, \`data-{name}:\`.
- Groups: \`group-{state}:\` and \`peer-{state}:\`, with an optional name (\`group-hover/row:\`) to pick which one. The reference element carries \`group\` or \`peer\`.

\`\`\`html
<div class="ts group p-half md:p-base">
  <span class="ts p-quarter group-hover:bg-gray-100">Title</span>
</div>
\`\`\`

7. Components are copied from their page, not invented: the markup on the page already carries the classes, the ARIA roles, and the \`data-ts-*\` attributes. Behavior comes from those attributes and from \`taisho.core.js\`; if the page says it needs no JavaScript, there is nothing to load.

8. After writing, run \`npx taisho check\` until it reports 0 warnings: each warning is a class or a variable the system doesn't know.

9. Icons come from Lucide: \`npm i -D lucide-static\` is needed only if the project uses icons (\`npx taisho init\` offers to install it, and \`npx taisho init --install-icons\` installs it without asking). If the code uses icons that don't resolve because the package is missing, \`npx taisho generate\` warns with the command and exits with an error; if the project uses no icons, it says nothing.`;

/** Las reglas para escribir marcado con TaishoDS: el cuerpo sin título, en cada idioma. Lo leen el `llms.txt` y las instrucciones del servidor MCP. */
export const REGLAS_DE_ESCRITURA: Record<IdiomaLlms, string> = { es, en };
