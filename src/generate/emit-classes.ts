// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { defaultScales } from '../config/scales';
import type { Renombre } from './naming-renames';
import { tablaPrefijos, type Envoltura } from './variantes';

const registro = (nombres: readonly string[]) => nombres.map((n) => `  "${n}": true;`).join('\n');
const union = (nombres: readonly string[]) => nombres.map((n) => `  | "${n}"`).join('\n');

export function buildClassTypes(
    nombres: readonly string[],
    tabla: readonly Renombre[],
    prefijos: ReadonlyMap<string, Envoltura> = tablaPrefijos(defaultScales.screens),
): string {
    const emitidos = new Set(nombres.map((n) => n.replaceAll('\\', '')));
    const viejos = new Set(tabla.map((t) => t.viejo));
    const vigentes = new Set([...emitidos].filter((n) => !viejos.has(n)).map((n) => n.slice(3)));
    for (const t of tabla) if (t.nuevo !== null) vigentes.add(t.nuevo.slice(3));
    const orden = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

    return (
        `// Archivo auto-generado: TIPOS DE CLASES para TaishoDS\n\n` +
        `/** Registro de los nombres de clase del DS vigentes. Es una \`interface\` para que otro paquete sume los suyos (\`declare module '@taishods/core/classes'\`). */\n` +
        `export interface TaishoClassRegistry {\n${registro([...vigentes].sort(orden))}\n}\n\n` +
        `/** Los nombres de clase del DS vigentes, como se escriben en \`class="ts …"\` (sin variantes como \`md:\` ni modificadores como \`variant-primary\`). */\n` +
        `export type TaishoClass = keyof TaishoClassRegistry;\n\n` +
        `/** Estados: el prefijo de variante que aplica a un elemento. \`data-<nombre>:\` es sólo presencia; \`data-ts-*\` está prohibido. */\n` +
        `export type TaishoStateVariant =\n${union([...prefijos].filter(([, e]) => e.tipo === 'selector').map(([k]) => k))}\n  | \`data-\${string}:\`;\n\n` +
        `/** Los prefijos de variante, de a uno (\`md:\`, \`hover:\`, \`group-hover/menu:\`). Se encadenan en este orden: \`[screen|@container]:[print:]:[group-*|peer-*]:[estado]:\`, hasta 3. */\n` +
        `type StateName = TaishoStateVariant extends infer V ? (V extends \`\${infer N}:\` ? N : never) : never;\n` +
        `export type TaishoVariant =\n${union([...prefijos].filter(([, e]) => e.tipo !== 'selector').map(([k]) => k))}\n` +
        `  | TaishoStateVariant\n  | \`group-\${StateName}\${"" | \`/\${string}\`}:\`\n  | \`peer-\${StateName}\${"" | \`/\${string}\`}:\`;\n`
    );
}

export function buildClassTypesExtension(nombres: readonly string[]): string {
    const vigentes = new Set(nombres.map((n) => n.replaceAll('\\', '').slice(3)));
    const orden = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
    return (
        `// Archivo auto-generado: TIPOS DE CLASES de una extensión de TaishoDS\n\n` +
        `declare module '@taishods/core/classes' {\n` +
        `  interface TaishoClassRegistry {\n${[...vigentes].sort(orden).map((n) => `    "${n}": true;`).join('\n')}\n  }\n` +
        `}\n\n` +
        `export {};\n`
    );
}
