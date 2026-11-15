#!/usr/bin/env bash
# TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
# Humo del Core en Next (App Router): instala el tarball en un proyecto mínimo y abre un Modal y un Select en
# chromium, firefox y webkit, con navegación de cliente entre dos páginas, en `next dev` y en `next build` + `next start`.
# Baja Next y React de npm y necesita los navegadores de Playwright del repo.
# Variables: SMOKE_DIR (carpeta de trabajo), NEXT_VERSION (default latest), PUERTO_DEV y PUERTO_START.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLANTILLAS="$RAIZ/scripts/smoke-frameworks"
DIR="${SMOKE_DIR:-${TMPDIR:-/tmp}/taisho-smoke-next}"
NEXT_VERSION="${NEXT_VERSION:-latest}"
DEV="${PUERTO_DEV:-4411}"
START="${PUERTO_START:-4412}"
export NEXT_TELEMETRY_DISABLED=1

paso() { printf '\n\033[1m$ %s\033[0m\n' "$*"; }
corre() { paso "$*"; "$@"; }
falla() { echo "FALLA: $*" >&2; exit 1; }

PUERTO=""
apaga() {
  [ -z "$PUERTO" ] || { lsof -ti "tcp:$PUERTO" -sTCP:LISTEN | xargs kill 2>/dev/null || true; PUERTO=""; sleep 1; }
}
trap apaga EXIT
espera() { for _ in $(seq 1 60); do curl -sf -o /dev/null "$1" && return 0; sleep 0.5; done; falla "el servidor no respondió en $1"; }
arranca() { local puerto="$1"; shift; ! curl -sf -o /dev/null "http://127.0.0.1:$puerto/" || falla "el puerto $puerto ya está ocupado"; paso "$* (en segundo plano)"; "$@" > "$DIR/servidor.log" 2>&1 & PUERTO="$puerto"; espera "http://127.0.0.1:$puerto/"; }
prueba() { corre node "$PLANTILLAS/verificar.mjs" "http://127.0.0.1:$1$2" "$3"; }
# El JS del Core se carga de tres formas distintas (ver scripts/smoke-frameworks/next/app/carga-*.jsx)
pruebas() { prueba "$1" / "$2 (JS en un efecto)"; prueba "$1" /paquete/ "$2 (JS del paquete)"; prueba "$1" /directo/ "$2 (import estático)"; }

corre rm -rf "$DIR"
corre mkdir -p "$DIR/paquete" "$DIR/proyecto"

cd "$RAIZ"
corre npm run build:core
corre npm pack ./dist-core --pack-destination "$DIR/paquete" --silent
TARBALL="$(ls "$DIR"/paquete/*.tgz)"

cd "$DIR/proyecto"
paso "node $(node -v), npm $(npm -v)"
corre npm init -y --silent
corre npm pkg delete type
corre npm install --silent "$TARBALL" "next@$NEXT_VERSION" react@latest react-dom@latest lucide-static
echo "next $(node -p "require('./node_modules/next/package.json').version"), react $(node -p "require('./node_modules/react/package.json').version")"

corre npx --no-install taisho init --yes
corre cp -R "$PLANTILLAS/next/app" app
corre npx --no-install taisho generate

paso "next dev"
arranca "$DEV" ./node_modules/.bin/next dev --hostname 127.0.0.1 --port "$DEV"
pruebas "$DEV" "next dev"
apaga

corre ./node_modules/.bin/next build
arranca "$START" ./node_modules/.bin/next start --hostname 127.0.0.1 --port "$START"
pruebas "$START" "next build + start"
apaga

printf '\nProyecto en: %s/proyecto\n' "$DIR"
