// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Utilidades puras de iconografía (sin Node/DOM) — compartidas por el plugin
 * de Vite y testeables de forma aislada.
 */

export interface IconEntry {
  /** viewBox del SVG (lucide = '0 0 24 24'). */
  viewBox: string;
  /** true = hereda color vía `stroke: currentColor` (estilo lucide). false = usa sus propios fills. */
  stroke: boolean;
  /** Markup interno del SVG (sin el `<svg>` externo). */
  body: string;
}

/** Serializa un nodo lucide `[tag, attrs]` a markup: `<tag a="b" />`. */
export function lucideNodeToMarkup(node: [string, Record<string, string | number>]): string {
  const [tag, attrs] = node;
  const a = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `<${tag}${a ? ' ' + a : ''} />`;
}

/** Convierte una lista de nodos lucide a un `IconEntry` (stroke, viewBox 24). */
export function lucideToEntry(nodes: Array<[string, Record<string, string | number>]>): IconEntry {
  return { viewBox: '0 0 24 24', stroke: true, body: nodes.map(lucideNodeToMarkup).join('') };
}

/**
 * Parsea el contenido crudo de un archivo `.svg` custom a `IconEntry`.
 * - `viewBox`: del `<svg>`, o `0 0 24 24` por defecto.
 * - `stroke`: heurística — true si el SVG es estilo lucide (`fill="none"` y/o
 *   `stroke="currentColor"`), false si trae rellenos propios (logos, color).
 * - `body`: el contenido interno del `<svg>` (se descarta el wrapper).
 */
export function parseSvgIcon(raw: string): IconEntry {
  const viewBox = raw.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1] ?? '0 0 24 24';
  const inner = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)?.[1] ?? '';
  const body = inner.trim();
  const strokeStyle =
    /fill\s*=\s*["']none["']/i.test(raw) || /stroke\s*=\s*["']currentColor["']/i.test(raw);
  return { viewBox, stroke: strokeStyle, body };
}

/** Distancia de Levenshtein (para sugerir el nombre más parecido). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Sugiere el candidato más parecido a `name` (o null si nada razonable). */
export function suggestClosest(name: string, candidates: Iterable<string>): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(name, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best !== null && bestDist <= Math.max(2, Math.ceil(name.length * 0.4)) ? best : null;
}

/**
 * Extrae los nombres declarados en anotaciones `@taisho-icons: a, b, c`.
 *
 * Es la escotilla para íconos que el escáner no puede ver: nombres dinámicos
 * (`name={variable}`) y nombres pasados como DATO (`items: [{ icon: 'x' }]`).
 *
 * La anotación termina donde termina la línea: lo que sigue en las líneas siguientes no se captura.
 */
export function parseIconAnnotations(code: string): string[] {
    const names: string[] = [];
    const re = /@taisho-icons:([^\n]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
        const linea = m[1].split('-->')[0];
        for (const raw of linea.split(',')) {
            const name = raw.trim();
            if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) names.push(name);
        }
    }
    return names;
}

/**
 * Extrae los nombres de ícono usados en "slots de ícono", en sus dos formas:
 *
 * - **atributo**: `icon="x"`, `hintIcon="x"`, `iconName="x"` — props de componente.
 * - **propiedad**: `icon: 'x'` — datos como `items: [{ label, icon: 'square-stack' }]`.
 *
 * Devuelve candidatos sin validar: filtrar contra los íconos conocidos es del
 * llamador, que es el único que sabe qué existe.
 */
export function parseIconSlots(code: string): string[] {
    const names: string[] = [];
    const re = /\b(?:hintIcon|iconName|icon)\s*[=:]\s*["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) names.push(m[1]);
    return names;
}
