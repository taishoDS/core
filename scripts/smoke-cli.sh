#!/usr/bin/env bash
# TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${SMOKE_DIR:-${TMPDIR:-/tmp}/taisho-smoke-cli}"

paso() { printf '\n\033[1m$ %s\033[0m\n' "$*"; }
corre() { paso "$*"; "$@"; }

corre rm -rf "$DIR"
corre mkdir -p "$DIR/paquete" "$DIR/proyecto"

cd "$RAIZ"
corre npm run build:core
corre npm pack ./dist-core --pack-destination "$DIR/paquete" --silent
TARBALL="$(ls "$DIR"/paquete/*.tgz)"

cd "$DIR/proyecto"
corre npm init -y --silent
corre npm install --silent "$TARBALL" lucide-static

cat > index.html <<'HTML'
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Smoke taisho</title>
  <link rel="stylesheet" href="taisho/fonts.css">
  <link rel="stylesheet" href="taisho/theme.css">
  <link rel="stylesheet" href="taisho/taisho.css">
  <script type="module" src="taisho/taisho.core.js"></script>
</head>
<body>
  <main class="ts flex flex-col gap-base">
    <h1 class="ts type-heading-24">Smoke del CLI</h1>
    <p class="ts type-copy-14 color-subtle">Solo se compiló lo que esta página usa.</p>

    <div class="ts flex gap-half items-center">
      <button type="button" class="ts button size-md variant-primary">
        <span data-ts-content="">
          <svg width="16" height="16"><use href="taisho/taisho.icons.svg#ts-check"></use></svg> Guardar
        </span>
      </button>
      <button type="button" class="ts button size-md variant-secondary"><span data-ts-content="">Cancelar</span></button>
    </div>

    <div class="ts accordion" data-ts-accordion="">
      <details class="ts collapsible accordion-item" data-ts-accordion-item="" data-ts-value="envio">
        <summary class="ts collapsible-trigger" data-ts-accordion-trigger="" aria-controls="acc-1">
          <span>¿Cuánto tarda el envío?</span>
        </summary>
        <div id="acc-1" class="ts collapsible-content" role="region" data-ts-accordion-content="">
          Entre 3 y 5 días hábiles en todo el país.
        </div>
      </details>
      <details class="ts collapsible accordion-item" data-ts-accordion-item="" data-ts-value="cambios">
        <summary class="ts collapsible-trigger" data-ts-accordion-trigger="" aria-controls="acc-2">
          <span>¿Puedo cambiar un producto?</span>
        </summary>
        <div id="acc-2" class="ts collapsible-content" role="region" data-ts-accordion-content="">
          Sí, dentro de los 30 días.
        </div>
      </details>
    </div>
  </main>
</body>
</html>
HTML

corre npx --no-install taisho init --yes
corre cat taisho.config.ts
corre npx --no-install taisho generate

paso "verificaciones"
CSS=taisho/taisho.css
falla() { echo "FALLA: $*" >&2; exit 1; }
[ -f "$CSS" ] || falla "no existe $CSS"
[ ! -f taisho/taisho.full.css ] || falla "no debería existir taisho.full.css"
[ "$(wc -l < "$CSS")" -le 3 ] || falla "taisho.css no está minificado"
for c in flex gap-base button collapsible-trigger type-heading-24; do
  grep -qF ":where(.ts).$c" "$CSS" || falla "falta :where(.ts).$c en taisho.css"
done
grep -qF ':where(.ts).grid{' "$CSS" && falla "entró :where(.ts).grid, que la página no usa"
echo "ok: taisho.css existe, minificado, con las clases usadas y sin las que no"
[ -f taisho/taisho.core.js ] || falla "no existe taisho/taisho.core.js"
echo "ok: el JS de la página está en la carpeta de salida (con content, sólo lo que usa)"

paso "sin content: el JS completo sale junto al CSS, con las rutas del sitio (public/)"
mkdir -p "$DIR/sin-content/public"
cd "$DIR/sin-content"
cp -R "$DIR/proyecto/node_modules" "$DIR/proyecto/package.json" .
corre npx --no-install taisho init --yes
grep -qF "out: 'public/taisho'" taisho.config.ts || falla "init no escribió out: 'public/taisho'"
grep -v '^[[:space:]]*content:' taisho.config.ts > sin.config.ts && mv sin.config.ts taisho.config.ts
SALIDA="$(npx --no-install taisho generate)"
echo "$SALIDA"
echo "$SALIDA" | grep -qF 'src="/taisho/taisho.core.js"' || falla "generate no imprimió la ruta del sitio del JS"
echo "$SALIDA" | grep -qF 'href="/taisho/taisho.full.css"' || falla "generate no imprimió la ruta del sitio del CSS"
echo "$SALIDA" | grep -qF 'node_modules' && falla "generate nombró node_modules"
for f in taisho.core.js taisho.core.table.js taisho.core.date-picker.js taisho.core.key-warning.js taisho.full.css theme.css; do
  [ -f "public/taisho/$f" ] || falla "falta public/taisho/$f"
done
echo "ok: public/taisho/ trae el JS completo y el CSS completo"
echo "JS copiado: $(cat public/taisho/taisho.core*.js | wc -c | tr -d ' ') B ($(cat public/taisho/taisho.core*.js | gzip -9 | wc -c | tr -d ' ') B gzip, entero); sólo el que carga siempre: $(gzip -9 -c public/taisho/taisho.core.js | wc -c | tr -d ' ') B gzip"

paso "con un empaquetador en el package.json, init propone ./taisho aunque exista public/"
mkdir -p "$DIR/con-vite/public"
cd "$DIR/con-vite"
ln -s "$DIR/proyecto/node_modules" node_modules
echo '{ "name": "con-vite", "devDependencies": { "vite": "^8.0.0" } }' > package.json
corre npx --no-install taisho init --yes
grep -qF "out: './taisho'" taisho.config.ts || falla "con vite, init no propuso ./taisho"
echo "ok: con vite, out: './taisho'"
cd "$DIR/proyecto"

paso "peso de taisho.css"
echo "sin comprimir: $(wc -c < "$CSS" | tr -d ' ') B"
echo "gzip -9:       $(gzip -9 -c "$CSS" | wc -c | tr -d ' ') B"
echo "gzip -9 + theme.css: $(cat "$CSS" taisho/theme.css | gzip -9 | wc -c | tr -d ' ') B"

printf '\nProyecto listo en: %s/proyecto\nPara verlo: cd "%s/proyecto" && python3 -m http.server 8123  ->  http://localhost:8123/\n' "$DIR" "$DIR"
