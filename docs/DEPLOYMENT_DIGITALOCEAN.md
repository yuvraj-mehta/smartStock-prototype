# DigitalOcean Deployment

This guide assumes one Ubuntu Droplet running Nginx, the built Vite client, and one Node.js API process behind the Nginx reverse proxy.

## Environment

Set the server environment before starting the API:

```bash
NODE_ENV=production
HOST=127.0.0.1
PORT=3500
TRUST_PROXY=loopback
MONGO_URI=mongodb+srv://...
DB_NAME=smartstock
JWT_SECRET=replace-with-a-long-random-secret
ALLOWED_ORIGINS=https://your-domain.example
GEMINI_API_KEY=optional
EMAIL_HOST=optional
EMAIL_PORT=optional
EMAIL_USER=optional
EMAIL_PASS=optional
```

For same-origin Nginx deployments, the client production build can omit `VITE_API_BASE_URL`; it defaults to `/api/v1`. Set `VITE_API_BASE_URL` only when the browser must call a different API origin.

## Build

```bash
npm run install:all
npm --prefix client run build
```

Serve `client/dist` with Nginx and start `server/server.js` with Node.js 20 or newer.

## Nginx

Use `try_files` for the React router and proxy `/api` to the local API port:

```nginx
server {
    listen 80;
    server_name your-domain.example;

    root /var/www/smartstock/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3500;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

After enabling TLS with Certbot, use `https://your-domain.example` in `ALLOWED_ORIGINS`.

## Process Manager

Run one scheduler-enabled API process. The daily scheduled sale-confirmation job is in-process, so PM2 cluster mode or multiple systemd replicas can duplicate scheduled work.

PM2 example:

```bash
cd /var/www/smartstock
HOST=127.0.0.1 PORT=3500 NODE_ENV=production pm2 start server/server.js --name smartstock-api --time
pm2 save
pm2 startup systemd
```

Systemd example direction:

```ini
[Service]
WorkingDirectory=/var/www/smartstock/server
EnvironmentFile=/var/www/smartstock/server/.env
ExecStart=/usr/bin/node server.js
Restart=always
User=smartstock
```

## Firewall

Keep the API private to localhost and expose only SSH plus Nginx:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Do not open port `3500` publicly when `HOST=127.0.0.1` and Nginx is proxying `/api`.

## Health Checks

Local API checks:

```bash
curl -s http://127.0.0.1:3500/api/v1/health
curl -i http://127.0.0.1:3500/api/v1/health/ready
```

Public readiness check through Nginx:

```bash
curl -i https://your-domain.example/api/v1/health/ready
```

Use `/api/v1/health` for liveness monitoring and `/api/v1/health/ready` for deployment readiness gates. Readiness returns `503` until required config is present and MongoDB is connected.
