# Deploying UxCam-Clone to the Contabo VPS

Production stack in Docker, behind the existing nginx on two subdomains:

```
uxcam.shehzaib.com     -> dashboard (Next.js,  127.0.0.1:3009)
uxcamapi.shehzaib.com  -> API + /sdk.js (Express, 127.0.0.1:3001)
                            API -> Postgres + Redis + MinIO  (all internal, not exposed)
```

Uses `docker-compose.prod.yml` (the default `docker-compose.yml` is dev-only — do not use it here).
Reuses your existing **Cloudinary** creds. Postgres/Redis/MinIO run as internal containers.

---

## 1. DNS (Namecheap → shehzaib.com → Advanced DNS)

| Type | Host | Value |
|------|--------|-----------------|
| A | `uxcam` | `109.123.244.167` |
| A | `uxcamapi` | `109.123.244.167` |

Verify: `dig +short uxcam.shehzaib.com` and `dig +short uxcamapi.shehzaib.com`.

## 2. Check ports are free
```bash
ss -tlnp | grep -E ':(3001|3009) ' || echo "3001 and 3009 are FREE"
```

## 3. Clone
```bash
mkdir -p /opt/uxcam && cd /opt/uxcam
git clone https://github.com/muhammadshehzaib/UxCam-Clone.git .
```

## 4. Create `.env`
`.env` is gitignored, so create it on the server. Paste this (it generates the two
dashboard secrets; fill your Cloudinary values):
```bash
cd /opt/uxcam
cat > .env <<EOF
# API
API_PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://uxclone:uxclone@postgres:5432/uxclone
REDIS_URL=redis://redis:6379
DASHBOARD_JWT_SECRET=$(openssl rand -hex 32)
DASHBOARD_TOKEN=$(openssl rand -hex 24)

# Public URLs / host ports
NEXT_PUBLIC_API_URL=https://uxcamapi.shehzaib.com
DASHBOARD_API_URL=http://api:3001
API_HOST_PORT=3001
DASHBOARD_HOST_PORT=3009

# Cloudinary (mobile screenshots) — your existing creds
CLOUDINARY_CLOUD_NAME=Root
CLOUDINARY_API_KEY=964168266674938
CLOUDINARY_API_SECRET=Vxn70cSTqGjw9FdgtzhaAPKolao

# MinIO (internal object storage for web DOM replays)
MINIO_ROOT_USER=uxclone
MINIO_ROOT_PASSWORD=uxclone-minio-secret
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=uxclone
MINIO_SECRET_KEY=uxclone-minio-secret
MINIO_BUCKET=uxclone-replays
EOF
grep -E 'NEXT_PUBLIC_API_URL|DASHBOARD_TOKEN|CLOUDINARY_CLOUD_NAME' .env
```

> `NEXT_PUBLIC_API_URL` and `DASHBOARD_TOKEN` are baked into the dashboard at build
> time. If you change them later, rebuild: `docker compose -f docker-compose.prod.yml up -d --build dashboard`.
> Note: `DASHBOARD_TOKEN` ends up in the dashboard's browser bundle (the project's
> read API is gated by this shared token) — treat the dashboard URL as semi-public.

## 5. Build & start (heaviest build — pulls Postgres/Redis/MinIO + builds SDK, API, dashboard)
```bash
cd /opt/uxcam
nohup docker compose -f docker-compose.prod.yml up -d --build > build.log 2>&1 &
tail -f build.log
```
Then verify:
```bash
docker compose -f docker-compose.prod.yml ps
curl -sI http://127.0.0.1:3001/sdk.js | head -1     # 200 — API serves the SDK bundle
curl -sI http://127.0.0.1:3009 | head -1            # 200 — dashboard
```

## 6. nginx — two server blocks
**API (`uxcamapi`) — large bodies for DOM recordings:**
```bash
cat > /etc/nginx/sites-available/uxcamapi.shehzaib.com <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name uxcamapi.shehzaib.com;
    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```
**Dashboard (`uxcam`):**
```bash
cat > /etc/nginx/sites-available/uxcam.shehzaib.com <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name uxcam.shehzaib.com;

    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}
EOF

ln -s /etc/nginx/sites-available/uxcamapi.shehzaib.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/uxcam.shehzaib.com    /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 7. HTTPS
```bash
certbot --nginx -d uxcam.shehzaib.com -d uxcamapi.shehzaib.com
```

## 8. Verify
- `https://uxcam.shehzaib.com` → dashboard
- `https://uxcamapi.shehzaib.com/sdk.js` → serves the SDK JavaScript
- To record a site, embed the SDK pointing at the API:
  ```html
  <script src="https://uxcamapi.shehzaib.com/sdk.js"></script>
  <script>
    UXCloneSDK.init({ endpoint: 'https://uxcamapi.shehzaib.com', projectKey: '<your-project-key>' });
  </script>
  ```
  (Check the repo README for the exact `init` options / how to create a project key.)

## Update later
```bash
cd /opt/uxcam && git pull
docker compose -f docker-compose.prod.yml up -d --build
```
