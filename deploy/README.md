# Deploying Visions LEP to Hostinger KVM 2 (`visionseducation.in`)

**Stack:** React (Vite) + Django REST Framework + PostgreSQL.
**Architecture:** Nginx serves the built React app at `/`, proxies `/api/` and `/admin/` to
Gunicorn (Django), and serves `/media/` + `/static/` directly from disk.

Everything below was verified against the actual repository before writing it:

- Frontend builds to `frontend/visions-platform/dist/public` (see `vite.config.ts` `build.outDir`).
- API lives under `/api/` (`vision_global_empowerment/urls.py` -> `path('api/', include('school.urls'))`).
- Django admin is at `/admin/`.
- `manage.py seed_default_admin` exists and creates `superadmin` / `TestPass123!`
  (**change this password immediately after first login**).
- All secrets come from environment variables; nothing secret is committed.

---

## 0. DNS (Hostinger hPanel)

Hostinger -> Domains -> `visionseducation.in` -> DNS Zone:

| Type | Name | Value        |
|------|------|--------------|
| A    | @    | `<VPS_IP>`   |
| A    | www  | `<VPS_IP>`   |

Wait for propagation (minutes to a few hours). Check with: `dig +short visionseducation.in`.

## 1. Provision the VPS

From your Mac: `ssh root@<VPS_IP>`, then (Ubuntu/Debian):

```bash
apt update && apt upgrade -y
apt install -y nginx postgresql postgresql-contrib python3-venv python3-dev \
  build-essential libpq-dev git curl ufw

ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

# Non-root deploy user
adduser deploy
usermod -aG sudo deploy

# Node.js 22 + pnpm for building the frontend
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
corepack enable && corepack prepare pnpm@10.15.0 --activate
```

## 2. PostgreSQL database

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE vision_global_empowerment;
CREATE USER visions WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD';
ALTER DATABASE vision_global_empowerment OWNER TO visions;
GRANT ALL PRIVILEGES ON DATABASE vision_global_empowerment TO visions;
\q
```

Put that password in `.env` (step 4) as `CHANGE_ME_DB_PASSWORD`.

## 3. Clone the code

```bash
mkdir -p /srv/visions && chown -R deploy:deploy /srv/visions
su - deploy
cd /srv
git clone https://github.com/tanyanijhawan-ffg/vision-global-empowerment.git visions
cd visions && git switch main
```

## 4. Backend environment

```bash
cd /srv/visions/backend/django-backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.production.example .env
# Edit .env: DB password, DJANGO_SECRET_KEY (openssl rand -base64 50), email creds
nano .env
```

`.env` is gitignored and must never be committed.

## 5. First boot

```bash
.venv/bin/python manage.py migrate
.venv/bin/python manage.py collectstatic --noinput
.venv/bin/python manage.py seed_default_admin
# Log in and CHANGE the default superadmin password right away:
#   https://visionseducation.in  ->  then Settings / or manage.py changepassword superadmin
```

## 6. Gunicorn service

```bash
sudo cp /srv/visions/deploy/gunicorn-visions.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gunicorn-visions
systemctl status gunicorn-visions    # should show active (running)
```

## 7. Build the frontend

```bash
cd /srv/visions/frontend/visions-platform
pnpm install --frozen-lockfile
pnpm build    # outputs dist/public (verified against vite.config.ts)
```

## 8. Nginx + HTTPS

```bash
sudo cp /srv/visions/deploy/nginx/visionseducation.in.conf /etc/nginx/sites-available/visionseducation.in
sudo ln -sf /etc/nginx/sites-available/visionseducation.in /etc/nginx/sites-enabled/visionseducation.in
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d visionseducation.in -d www.visionseducation.in
```

Certbot will rewrite the config to listen on 443 and redirect HTTP -> HTTPS automatically.

**Security headers (ZAP remediation):** the site config already sends security
headers on the HTTP block. Certbot's rewrite creates a separate 443 block, so
copy the `add_header` lines — plus the `Strict-Transport-Security` line — from
the commented HTTPS reference block at the bottom of
`deploy/nginx/visionseducation.in.conf` into the certbot-generated 443 block,
then `sudo nginx -t && sudo systemctl reload nginx`.

Open `https://visionseducation.in` -> you should see the login page.
API: `https://visionseducation.in/api/`.

## 9. Redeploying

Deployments follow `main`. From the VPS:

```bash
cd /srv/visions
git switch main
bash deploy/deploy.sh
```

The script always fast-forward pulls `main` from origin before building, so it only deploys
what has been merged and pushed. To deploy a different branch for testing:

```bash
DEPLOY_BRANCH=feature/some-branch bash deploy/deploy.sh
```

What it does (all verified in this repo):

1. Preflight checks (git checkout present, pnpm available, `.env` exists).
2. `git fetch` + fast-forward pull of `main`.
3. `pip install -r requirements.txt`.
4. Detects pending migrations; if any, runs `pg_dump` to `/srv/visions/backups/` first.
5. `migrate --noinput` + `collectstatic --noinput`.
6. `pnpm install --frozen-lockfile` + `pnpm build`; fails if `dist/public/index.html` is missing.
7. Ensures `media/` and `staticfiles/` ownership so uploads are preserved.
8. Restarts Gunicorn and reloads Nginx; fails loudly if Gunicorn doesn't come up.

## Troubleshooting

| Symptom | Command |
|---|---|
| 502 from Nginx | `journalctl -u gunicorn-visions -e` |
| Static/admin unstyled | `.venv/bin/python manage.py collectstatic --noinput` then `sudo systemctl reload nginx` |
| Photos 404 | `ls -la /srv/visions/backend/django-backend/media` and check `chown -R deploy:www-data media` |
| Nginx error log | `sudo tail -f /var/log/nginx/error.log` |
| DB connection refused | `sudo systemctl status postgresql` |

## Secrets checklist (keep OUT of Git)

- `backend/django-backend/.env` (gitignored)
- Hostinger account + VPS root passwords (rotate after initial setup; prefer SSH keys)
- Database password, Django `SECRET_KEY`, mailbox password
