#!/usr/bin/env bash
#
# One-shot server setup for the OKA Room Reservation Platform.
#
# Designed to be piped in from your own machine, so nothing has to be typed
# on the server:
#
#     ssh USER@HOST "bash -s" < scripts/server-bootstrap.sh
#
# It expects the .env file to have been copied up first:
#
#     scp .env USER@HOST:~/oka.env
#
# Safe to run repeatedly. Each step checks the current state before acting.

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

REPO_URL="${REPO_URL:-https://github.com/E4GLz/Room-Reservation-for-OKA.git}"
APP_DIR="${APP_DIR:-/opt/oka-reservation}"
ENV_UPLOAD="${ENV_UPLOAD:-$HOME/oka.env}"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
ok()   { printf '    \033[1;32mok\033[0m  %s\n' "$1"; }
die()  { printf '\n\033[1;31mERROR:\033[0m %s\n\n' "$1" >&2; exit 1; }

# Use sudo only when not already root.
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else
  command -v sudo >/dev/null 2>&1 || die "Not root and sudo is unavailable."
  SUDO="sudo"
fi

log "Server"
. /etc/os-release 2>/dev/null || die "Cannot read /etc/os-release — is this Ubuntu/Debian?"
ok "${PRETTY_NAME:-unknown} ($(uname -m))"

# ─── 1. Docker ────────────────────────────────────────────────────────
log "Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  ok "already installed: $(docker --version)"
else
  ok "installing from Docker's official apt repository"
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq ca-certificates curl gnupg git >/dev/null
  $SUDO install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL "https://download.docker.com/linux/${ID}/gpg" \
      | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin >/dev/null
  ok "installed: $(docker --version)"
fi

$SUDO systemctl enable --now docker >/dev/null 2>&1 || true
$SUDO docker info >/dev/null 2>&1 || die "The Docker daemon is not responding."
ok "daemon is running"

command -v git >/dev/null 2>&1 || $SUDO apt-get install -y -qq git >/dev/null
ok "git present"

# ─── 2. Source code ───────────────────────────────────────────────────
log "Project at $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  $SUDO git -C "$APP_DIR" fetch --quiet origin main
  $SUDO git -C "$APP_DIR" reset --hard --quiet origin/main
  ok "updated to $(sudo git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || git -C "$APP_DIR" rev-parse --short HEAD)"
else
  $SUDO mkdir -p "$(dirname "$APP_DIR")"
  if ! $SUDO git clone --quiet "$REPO_URL" "$APP_DIR" 2>/dev/null; then
    die "Could not clone $REPO_URL

       If the repository is PRIVATE, git cannot authenticate here. Either:
         - make it public temporarily, or
         - re-run with a token:
             REPO_URL=https://USERNAME:TOKEN@github.com/E4GLz/Room-Reservation-for-OKA.git

       Create a token at github.com/settings/tokens with 'repo' scope."
  fi
  ok "cloned"
fi

# ─── 3. Configuration ─────────────────────────────────────────────────
log "Configuration"
if [ -f "$ENV_UPLOAD" ]; then
  $SUDO cp "$ENV_UPLOAD" "$APP_DIR/.env"
  $SUDO chmod 600 "$APP_DIR/.env"
  rm -f "$ENV_UPLOAD"
  ok ".env installed from $ENV_UPLOAD (upload copy removed)"
elif [ -f "$APP_DIR/.env" ]; then
  ok ".env already present, keeping it"
else
  die "No .env found.

       Copy it up from your own machine first, then re-run:
         scp .env $(whoami)@$(hostname -I 2>/dev/null | awk '{print $1}'):~/oka.env"
fi

# ─── 4. Deploy ────────────────────────────────────────────────────────
log "Deploying"
$SUDO chmod +x "$APP_DIR/scripts/deploy-server.sh"
cd "$APP_DIR"
$SUDO ./scripts/deploy-server.sh
