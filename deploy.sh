#!/usr/bin/env bash
#
# Meridian TCE — one-shot deploy for an Ubuntu/Debian Contabo VPS (run as root).
# Expects the project to already be unpacked at /opt/meridian.
#
#   mkdir -p /opt/meridian
#   tar -xzf meridian-deploy.tar.gz -C /opt/meridian
#   cd /opt/meridian && bash deploy.sh
#
set -euo pipefail

APP_DIR=/opt/meridian
cd "$APP_DIR"

echo "==> 1/8  System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg build-essential python3 nginx ufw

echo "==> 2/8  Node.js 20 (if needed)"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

echo "==> 3/8  Build frontend"
npm install
npm run build

echo "==> 4/8  Backend dependencies"
cd "$APP_DIR/server"
npm install

if [ ! -f .env ]; then
  echo "!! server/.env is missing. Create it before deploying." >&2
  exit 1
fi

echo "==> 5/8  Seed admin account"
node seed-admin.js || true

echo "==> 6/8  Start with PM2"
cd "$APP_DIR"
pm2 delete meridian >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save
eval "$(pm2 startup systemd -u root --hp /root | tail -n 1)" || true

echo "==> 7/8  Nginx reverse proxy"
if ! grep -q "ssl_certificate" /etc/nginx/sites-available/meridian 2>/dev/null; then
  cp nginx-meridian.conf /etc/nginx/sites-available/meridian
fi
ln -sf /etc/nginx/sites-available/meridian /etc/nginx/sites-enabled/meridian
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> 8/8  Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

IP=$(hostname -I | awk '{print $1}')
echo
echo "============================================================"
echo " Meridian is live:  http://${IP}/"
echo " Admin login:       ${ADMIN_EMAIL:-(see server/.env)}"
echo " Logs:              pm2 logs meridian"
echo "============================================================"
