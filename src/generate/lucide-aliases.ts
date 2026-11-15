// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'fs';
import path from 'path';

/**
 * Mapa alias → ícono canónico de lucide-static.
 *
 * Desde lucide-static 1.52 `icon-nodes.json` trae sólo los íconos canónicos; los
 * nombres viejos (`trash-2`, `alert-circle`, `arrow-left-circle`…) sobreviven
 * únicamente como `icons/<alias>.svg`. Los nombres de ícono son superficie pública
 * (`<Icon name="trash-2">`), así que siguen siendo válidos y resuelven al canónico.
 *
 * Lucide no publica el mapa en un archivo de datos: se DERIVA del propio paquete.
 * Un alias es un `.svg` sin entrada en `icon-nodes.json` cuyo contenido es idéntico
 * al de un canónico (difieren sólo en el `class="lucide-<nombre>"` del wrapper).
 * Verificado contra los exports oficiales de `lucide-static` (264/264 coinciden).
 */
export function loadLucideAliases(lucideDir: string, nodes: Record<string, unknown>): Record<string, string> {
  const iconsDir = path.join(lucideDir, 'icons');
  if (!fs.existsSync(iconsDir)) return {};
  const body = (name: string) =>
    (fs.readFileSync(path.join(iconsDir, `${name}.svg`), 'utf-8').match(/<svg[^>]*>([\s\S]*?)<\/svg>/)?.[1] ?? '')
      .replace(/\s+/g, ' ')
      .trim();

  const aliasNames = fs
    .readdirSync(iconsDir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4))
    .filter((n) => !nodes[n])
    .sort();
  if (aliasNames.length === 0) return {};

  const canonicalByBody = new Map<string, string>();
  for (const name of Object.keys(nodes).sort()) {
    const b = body(name);
    if (!canonicalByBody.has(b)) canonicalByBody.set(b, name);
  }

  const aliases: Record<string, string> = {};
  for (const alias of aliasNames) {
    const canonical = canonicalByBody.get(body(alias));
    if (canonical) aliases[alias] = canonical;
  }
  return aliases;
}
