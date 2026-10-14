#!/usr/bin/env bash
#
# Deploy the OKA Room Reservation Platform on a Linux server.
#
# Run this ON THE SERVER, from the project directory, as a user in the docker
# group (or via sudo). It is safe to re-run: each step checks current state
# before changing anything.
#
#   ./scripts/deploy-server.sh
#
# Prerequisites on the server:
#   - Docker Engine + the Compose v2 plugin
#   - A .env file in this directory (see .env.example)
#   - Ports 80 and 443 free and reachable from the internet
#   - DNS for APP_DOMAIN already pointing at this server

set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_DIR="$(pwd)"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
ok()   { printf '    \033[1;32mok\033[0m  %s\n' "$1"; }
die()  { printf '\n\033[1;31mERROR:\033[0m %s\n\n' "$1" >&2; exit 1; }

# ─── 1. Tooling ───────────────────────────────────────────────────────
log "Checking Docker"
command -v docker >/dev/null 2>&1 \
  || die "Docker is not installed. See https://docs.docker.com/engine/install/"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  die "The Docker Compose plugin is not installed (need 'docker compose' or 'docker-compose')."
fi

docker info >/dev/null 2>&1 \
  || die "Cannot talk to the Docker daemon. Is it running, and is your user in the 'docker' group?"
ok "$(docker --version)"
ok "using: $COMPOSE"

# ─── 2. Configuration ─────────────────────────────────────────────────
log "Validating .env"
[ -f .env ] || die ".env not found in $PROJECT_DIR. Copy .env.example and fill it in."

# Read a key from .env without sourcing the file (values may contain spaces,
# and sourcing would execute arbitrary content).
envval() { sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" .env | head -1 | sed 's/^"//; s/"$//'; }

for key in DATABASE_URL SESSION_SECRET TUNNEL_TOKEN; do
  [ -n "$(envval "$key")" ] || die "$key is missing or empty in .env"
done
ok "DATABASE_URL, SESSION_SECRET, TUNNEL_TOKEN all present"

APP_DOMAIN_VALUE="$(envval APP_DOMAIN)"
ok "APP_DOMAIN = ${APP_DOMAIN_VALUE:-(unset)}"

# DATABASE_URL must not point at localhost: inside the container that resolves
# to the container itself, not this host.
case "$(envval DATABASE_URL)" in
  *@localhost:*|*@127.0.0.1:*)
    die "DATABASE_URL points at localhost, which inside the app container means the
       container itself. Use the host's LAN/public address, or host.docker.internal."
    ;;
esac
ok "DATABASE_URL does not use localhost"

ok "routing via Cloudflare Tunnel (no inbound ports required)"

# ─── 3. Build ─────────────────────────────────────────────────────────
APP_IMAGE_VALUE="$(envval APP_IMAGE)"
APP_IMAGE_VALUE="${APP_IMAGE_VALUE:-oka-reservation:latest}"

log "Building image: $APP_IMAGE_VALUE"
# A dummy DATABASE_URL is passed so `prisma generate` can run at build time.
# The real one is injected at runtime from .env.
docker build -t "$APP_IMAGE_VALUE" .
ok "image built"

# ─── 4. Start ─────────────────────────────────────────────────────────
log "Starting the stack"
$COMPOSE up -d
ok "containers started"

# ─── 5. Verify ────────────────────────────────────────────────────────
log "Waiting for the application to become ready"
# The container applies migrations and seeds before listening, so allow time.
READY=0
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://127.0.0.1:3000/api/auth/session" 2>/dev/null; then
    READY=1
    break
  fi
  sleep 2
done

$COMPOSE ps

if [ "$READY" = "1" ]; then
  ok "application is responding on 127.0.0.1:3000"
  printf '\n\033[1;32mDeployed.\033[0m Site: https://%s\n\n' "$APP_DOMAIN_VALUE"
  printf 'If the hostname does not serve yet, check that the tunnel is healthy and\n'
  printf 'that its public hostname routes to http://app:3000 (not localhost:3000):\n'
  printf '  %s logs -f cloudflared\n\n' "$COMPOSE"
  printf 'Logs:    %s logs -f app\n'   "$COMPOSE"
  printf 'Restart: %s restart app\n\n' "$COMPOSE"
else
  printf '\n\033[1;31mThe app did not become ready within 120s.\033[0m\n\n'
  printf 'Most recent application logs:\n\n'
  $COMPOSE logs --tail 40 app || true
  printf '\nCommon causes:\n'
  printf '  - Database unreachable, or migrations failed (check the log above)\n'
  printf '  - SESSION_SECRET missing: the app refuses to start in production without it\n\n'
  exit 1
fi
