#!/usr/bin/env bash
# TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${SMOKE_DIR:-${TMPDIR:-/tmp}/taisho-smoke-vite}"

paso() { printf '\n\033[1m$ %s\033[0m\n' "$*"; }
corre() { paso "$*"; "$@"; }
falla() { echo "FALLA: $*" >&2; exit 1; }

corre rm -rf "$DIR"
corre mkdir -p "$DIR/paquete" "$DIR/proyecto"

cd "$RAIZ"
corre npm run build:core
corre npm pack ./dist-core --pack-destination "$DIR/paquete" --silent
TARBALL="$(ls "$DIR"/paquete/*.tgz)"
VITE_VERSION="$(node -p "require('./package.json').devDependencies.vite")"

cd "$DIR/proyecto"
corre npm init -y --silent
corre npm pkg set type=module
corre npm install --silent "$TARBALL" "vite@$VITE_VERSION" lucide-static

cat > taisho.config.ts <<'TS'
export default {
  themes: { principal: { colors: { brand: '#4F46E5' } } },
  fontFaces: [],
  defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' },
  content: ['index.html', 'main.js'],
};
TS

cat > index.html <<'HTML'
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Smoke vite</title></head>
<body>
  <main class="ts flex flex-col gap-base">
    <button type="button" class="ts button size-md variant-primary">
      <span data-ts-content=""><svg width="16" height="16"><use href="taisho/taisho.icons.svg#ts-check"></use></svg> Guardar</span>
    </button>
  </main>
  <script type="module" src="main.js"></script>
</body>
</html>
HTML

cat > main.js <<'JS'
import './taisho/fonts.css';
import './taisho/theme.css';
import './taisho/taisho.css';
JS

cat > vite.config.js <<'JS'
import { taisho } from '@taishods/core/vite';
export default { plugins: [taisho()] };
JS

corre npx --no-install taisho generate --out taisho-cli
corre npx --no-install vite build

paso "paridad: taisho-cli/ (CLI) vs taisho/ (plugin de Vite)"
diff -r taisho-cli taisho || falla "el plugin escribió algo distinto que el CLI"
echo "ok: $(ls taisho | wc -l | tr -d ' ') archivos idénticos byte a byte ($(ls taisho | tr '\n' ' '))"

printf '\nProyecto en: %s/proyecto\n' "$DIR"
