# Deploying Meridian TCE to the Contabo VPS

Target: `161.97.185.105` (root). The Express backend serves the API **and** the
built frontend, behind Nginx, kept alive by PM2.

## 0. Before you start (do this first)

1. **Rotate the Anthropic API key.** The old one was shared in plaintext — create a
   new key at <https://console.anthropic.com/> and put it in `server/.env`
   (`ANTHROPIC_API_KEY=`). If you change it *after* packaging, edit it on the VPS.
2. Confirm `server/.env` is correct (admin login is `antoine.jansen@consultantengine.com` / `meridian@2026`;
   `JWT_SECRET` is already a strong random value).

> ⚠️ No domain = no HTTPS. Over `http://IP`, the login password travels in cleartext.
> OK for a short demo; for anything real, point a domain at the IP and run the
> Let's Encrypt step at the bottom.

## 1. Upload the project (run on your Windows machine)

A ready-made archive is at `..\meridian-deploy.tar.gz` (one level above the project
folder). From PowerShell:

```powershell
scp "C:\Users\Yash\Downloads\meridian-tce-2-main(2)\meridian-deploy.tar.gz" root@161.97.185.105:/root/
ssh root@161.97.185.105        # password: your Contabo root password
```

(If `scp`/`ssh` aren't found, install "OpenSSH Client" in Windows Optional Features,
or use WinSCP + PuTTY.)

## 2. Deploy (run on the VPS)

```bash
mkdir -p /opt/meridian
tar -xzf /root/meridian-deploy.tar.gz -C /opt/meridian
cd /opt/meridian
bash deploy.sh
```

`deploy.sh` installs Node 20, PM2, Nginx and the firewall; builds the frontend;
installs backend deps; seeds the admin account; and starts everything. Takes a few
minutes (it compiles `better-sqlite3`).

When it finishes it prints:

```
Meridian is live:  http://161.97.185.105/
```

Open that, log in with `antoine.jansen@consultantengine.com` / `meridian@2026`.

## 3. Everyday operations

```bash
pm2 logs meridian        # tail logs
pm2 restart meridian     # after changing server/ code
pm2 status               # process health
```

To ship new code later: re-upload the tarball, re-extract into `/opt/meridian`,
then:

```bash
cd /opt/meridian && npm install && npm run build && pm2 restart meridian
```

## 4. Data & backups

Everything lives under `/opt/meridian/server/`:
- `data/meridian.db` — all accounts, twins, consultations
- `uploads/` — uploaded documents

Back both up. The **Reset Demo** button wipes only the logged-in account's data.

## 5. (Optional) HTTPS with a domain

Point an A record at `161.97.185.105`, then on the VPS:

```bash
# edit server_name to your domain:
nano /etc/nginx/sites-available/meridian
systemctl reload nginx
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## Notes / known limitations

- Open registration + the entity API are not per-user access-controlled (the IDOR
  noted in the shortcomings report). Fine for a single-account demo; lock down before
  giving out multiple logins.
- `meridian@2026` is weak for a public host — change it after the demo
  (re-seed via `ADMIN_PASSWORD` + `node server/seed-admin.js` on a fresh DB, or wire a
  change-password flow).
