#!/usr/bin/env bash
# TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
# Humo del Core en SvelteKit (sin ninguna otra librería de componentes): instala el tarball en un proyecto mínimo y abre un
# Modal y un Select en chromium, firefox y webkit, con navegación de cliente entre dos páginas, en `vite dev` y en
# `vite build` + `vite preview`. Baja SvelteKit de npm y necesita los navegadores de Playwright del repo.
# Variables: SMOKE_DIR (carpeta de trabajo), SVELTEKIT_VERSION (default latest), PUERTO_DEV y PUERTO_PREVIEW.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLANTILLAS="$RAIZ/scripts/smoke-frameworks"
DIR="${SMOKE_DIR:-${TMPDIR:-/tmp}/taisho-smoke-sveltekit}"
SVELTEKIT_VERSION="${SVELTEKIT_VERSION:-latest}"
DEV="${PUERTO_DEV:-4421}"
PREVIEW="${PUERTO_PREVIEW:-4422}"

paso() { printf '\n\033[1m$ %s\033[0m\n' "$*"; }
corre() { paso "$*"; "$@"; }
falla() { echo "FALLA: $*" >&2; exit 1; }

# El servidor se apaga por el puerto, no por el pid: `vite` deja procesos hijos.
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
# El JS del Core se carga de tres formas distintas (ver scripts/smoke-frameworks/sveltekit/src/routes)
pruebas() { prueba "$1" / "$2 (JS en onMount)"; prueba "$1" /paquete "$2 (CSS y JS del paquete)"; prueba "$1" /directo "$2 (import estático)"; }

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
corre npm install --silent "$TARBALL" "@sveltejs/kit@$SVELTEKIT_VERSION" svelte vite @sveltejs/adapter-node lucide-static
echo "sveltekit $(node -p "require('./node_modules/@sveltejs/kit/package.json').version"), svelte $(node -p "require('./node_modules/svelte/package.json').version"), vite $(node -p "require('./node_modules/vite/package.json').version")"

corre npx --no-install taisho init --yes
corre cp -R "$PLANTILLAS/sveltekit/src" src
corre cp "$PLANTILLAS/sveltekit/vite.config.js" .
corre cp "$PLANTILLAS/modal.html" "$PLANTILLAS/select.html" src/
corre npx --no-install svelte-kit sync
corre npx --no-install taisho generate

paso "camino 1: el CLI (taisho generate) y los archivos de taisho/"
arranca "$DEV" ./node_modules/.bin/vite dev --host 127.0.0.1 --port "$DEV" --strictPort
pruebas "$DEV" "vite dev"
apaga
corre ./node_modules/.bin/vite build
arranca "$PREVIEW" ./node_modules/.bin/vite preview --host 127.0.0.1 --port "$PREVIEW" --strictPort
pruebas "$PREVIEW" "vite build + preview"
apaga

paso "camino 2: el plugin taisho() en la config de Vite"
corre rm -rf taisho .svelte-kit
cat > vite.config.js <<'JS'
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { taisho } from '@taishods/core/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [taisho(), sveltekit({ adapter: adapter() })] });
JS
corre npx --no-install svelte-kit sync
arranca "$DEV" ./node_modules/.bin/vite dev --host 127.0.0.1 --port "$DEV" --strictPort
prueba "$DEV" / "vite dev con taisho()"
apaga
corre rm -rf taisho .svelte-kit build
corre npx --no-install svelte-kit sync
corre ./node_modules/.bin/vite build
[ -f taisho/taisho.css ] || falla "el plugin no escribió taisho/taisho.css"
arranca "$PREVIEW" ./node_modules/.bin/vite preview --host 127.0.0.1 --port "$PREVIEW" --strictPort
prueba "$PREVIEW" / "vite build + preview con taisho()"
apaga

printf '\nProyecto en: %s/proyecto\n' "$DIR"
