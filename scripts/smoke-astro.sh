#!/usr/bin/env bash
# TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
# Humo del Core en Astro: instala el tarball en un proyecto mínimo y abre un Modal y un Select en
# chromium, firefox y webkit. Baja Astro de npm y necesita los navegadores de Playwright del repo.
# Variables: SMOKE_DIR (carpeta de trabajo), ASTRO_VERSION (default latest), PUERTO_DEV y PUERTO_PREVIEW.
# Astro pide una versión de Node propia (hoy >=22.23.4): si `node -v` no alcanza, arranca con otra en el PATH.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLANTILLAS="$RAIZ/scripts/smoke-frameworks"
DIR="${SMOKE_DIR:-${TMPDIR:-/tmp}/taisho-smoke-astro}"
ASTRO_VERSION="${ASTRO_VERSION:-latest}"
DEV="${PUERTO_DEV:-4401}"
PREVIEW="${PUERTO_PREVIEW:-4402}"

paso() { printf '\n\033[1m$ %s\033[0m\n' "$*"; }
corre() { paso "$*"; "$@"; }
falla() { echo "FALLA: $*" >&2; exit 1; }

# Astro 7 deja `astro dev` en segundo plano si no hay terminal: se apaga por el puerto, no por el pid.
PUERTO=""
apaga() {
  [ -z "$PUERTO" ] || { lsof -ti "tcp:$PUERTO" -sTCP:LISTEN | xargs kill 2>/dev/null || true; PUERTO=""; sleep 1; }
}
trap apaga EXIT
espera() { for _ in $(seq 1 60); do curl -sf -o /dev/null "$1" && return 0; sleep 0.5; done; falla "el servidor no respondió en $1"; }
# arranca <puerto> <comando...>: servidor en segundo plano, a la espera de que responda
arranca() { local puerto="$1"; shift; ! curl -sf -o /dev/null "http://127.0.0.1:$puerto/" || falla "el puerto $puerto ya está ocupado"; paso "$* (en segundo plano)"; "$@" > "$DIR/servidor.log" 2>&1 & PUERTO="$puerto"; espera "http://127.0.0.1:$puerto/"; }
# prueba <puerto> <ruta> <etiqueta>
prueba() { corre node "$PLANTILLAS/verificar.mjs" "http://127.0.0.1:$1$2" "$3"; }
pruebas() { prueba "$1" / "$2 (archivos de taisho generate)"; prueba "$1" /paquete/ "$2 (CSS y JS del paquete)"; prueba "$1" /router/ "$2 (ClientRouter)"; }

# Astro 6 en dev, con la caché de Vite vacía, reoptimiza dependencias al descubrir `astro:transitions` y deja
# errores 504 «Outdated Optimize Dep» en la consola (se reproduce en un proyecto sin Taisho). Se calienta antes de medir.
calienta() { paso "calentar la caché de Vite (no se mide)"; for r in / /paquete/ /router/; do node "$PLANTILLAS/verificar.mjs" "http://127.0.0.1:$1$r" calentar chromium > /dev/null 2>&1 || true; done; }

corre rm -rf "$DIR"
corre mkdir -p "$DIR/paquete" "$DIR/proyecto"

cd "$RAIZ"
corre npm run build:core
corre npm pack ./dist-core --pack-destination "$DIR/paquete" --silent
TARBALL="$(ls "$DIR"/paquete/*.tgz)"

cd "$DIR/proyecto"
paso "node $(node -v), npm $(npm -v)"
corre npm init -y --silent
corre npm pkg set type=module
corre npm install --silent "$TARBALL" "astro@$ASTRO_VERSION" lucide-static
echo "astro $(node -p "require('./node_modules/astro/package.json').version")"

corre npx --no-install taisho init --yes
corre cp -R "$PLANTILLAS/astro/src" src
corre cp "$PLANTILLAS/modal.html" "$PLANTILLAS/select.html" src/
corre cp "$PLANTILLAS/astro/astro.config.mjs" astro.config.mjs
corre npx --no-install taisho generate

paso "camino 1: el CLI (taisho generate) y los archivos de taisho/"
arranca "$DEV" ./node_modules/.bin/astro dev --host 127.0.0.1 --port "$DEV"
calienta "$DEV"
pruebas "$DEV" "astro dev"
apaga
corre ./node_modules/.bin/astro build
arranca "$PREVIEW" ./node_modules/.bin/astro preview --host 127.0.0.1 --port "$PREVIEW"
pruebas "$PREVIEW" "astro build + preview"
apaga

paso "camino 2: el plugin taisho() en la config de Astro (vite.plugins)"
corre rm -rf taisho
cat > astro.config.mjs <<'JS'
import { defineConfig } from 'astro/config';
import { taisho } from '@taishods/core/vite';
export default defineConfig({ devToolbar: { enabled: false }, vite: { plugins: [taisho()] } });
JS
arranca "$DEV" ./node_modules/.bin/astro dev --host 127.0.0.1 --port "$DEV"
calienta "$DEV"
prueba "$DEV" / "astro dev con taisho()"
apaga
corre rm -rf taisho dist
corre ./node_modules/.bin/astro build
[ -f taisho/taisho.css ] || falla "el plugin no escribió taisho/taisho.css"
arranca "$PREVIEW" ./node_modules/.bin/astro preview --host 127.0.0.1 --port "$PREVIEW"
prueba "$PREVIEW" / "astro build + preview con taisho()"
apaga

printf '\nProyecto en: %s/proyecto\n' "$DIR"
