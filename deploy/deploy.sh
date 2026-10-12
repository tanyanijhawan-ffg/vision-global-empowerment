#!/usr/bin/env bash
#
# Redeploy Visions LEP on the Hostinger VPS.
# Usage (on the VPS, as the deploy user):
#   bash /srv/visions/deploy/deploy.sh
#
# Idempotent: safe to run after every merge to main. Backs up the database
# before any schema-changing migration and preserves uploaded media.

set -euo pipefail

APP_DIR="/srv/visions"
BACKEND_DIR="$APP_DIR/backend/django-backend"
FRONTEND_DIR="$APP_DIR/frontend/visions-platform"
# Override with: DEPLOY_BRANCH=main bash deploy/deploy.sh
# Initial deployment uses this feature branch; after merging to main, run with DEPLOY_BRANCH=main.
BRANCH="${DEPLOY_BRANCH:-feature/hostinger-deployment}"
BACKUP_DIR="/srv/visions/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"

fail() { echo "ERROR: $*" >&2; exit 1; }

echo "==> [1/8] Preflight"
[ -d "$APP_DIR/.git" ] || fail "$APP_DIR is not a git checkout"
command -v pnpm >/dev/null || fail "pnpm not found (run: corepack enable && corepack prepare pnpm@10.15.0 --activate)"
[ -f "$BACKEND_DIR/.env" ] || fail "Missing $BACKEND_DIR/.env"

cd "$APP_DIR"
echo "==> [2/8] Fetch latest origin/$BRANCH"
git fetch origin "$BRANCH"
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> [3/8] Backend dependencies"
cd "$BACKEND_DIR"
.venv/bin/pip install --no-cache-dir -r requirements.txt

echo "==> [4/8] Check for pending migrations"
PENDING="$((.venv/bin/python manage.py showmigrations --plan 2>/dev/null || true) | grep -c '\[ \]' || true)"
if [ "$PENDING" -gt 0 ]; then
  echo "    $PENDING pending migration(s) -> backing up database first"
  mkdir -p "$BACKUP_DIR"
  DB_URL="$(grep -E '^DATABASE_URL=' "$BACKEND_DIR/.env" | cut -d= -f2-)"
  DB_NAME="$(printf '%s' "$DB_URL" | sed -E 's#^.*/([^/?]+).*#\1#')"
  pg_dump "$DB_URL" --format=custom --file="$BACKUP_DIR/$DB_NAME-$STAMP.dump" \
    && echo "    Backup: $BACKUP_DIR/$DB_NAME-$STAMP.dump"
else
  echo "    No pending migrations; skipping database backup"
fi

echo "==> [5/8] Migrate + collect static"
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput

echo "==> [6/8] Frontend build"
cd "$FRONTEND_DIR"
pnpm install --frozen-lockfile
pnpm build
[ -f "$FRONTEND_DIR/dist/public/index.html" ] || fail "Build missing dist/public/index.html"

echo "==> [7/8] Media/static ownership (uploads persist in repo dir)"
mkdir -p "$BACKEND_DIR/media"
chown -R deploy:www-data "$BACKEND_DIR/media" "$BACKEND_DIR/staticfiles" 2>/dev/null || true

echo "==> [8/8] Restart services"
sudo systemctl restart gunicorn-visions
sudo systemctl is-active --quiet gunicorn-visions || fail "gunicorn failed to start (journalctl -u gunicorn-visions -e)"
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "Deploy complete: https://visionseducation.in (commit: $(git -C "$APP_DIR" rev-parse --short HEAD))"
