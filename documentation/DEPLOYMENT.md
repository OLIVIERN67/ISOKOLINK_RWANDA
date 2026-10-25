# Deployment Guide

This guide describes a production deployment for the existing ISOKOLINK RWANDA
frontend, Express API, and MySQL database. It does not replace the hosting
provider's TLS, firewall, or managed-database documentation.

## 1. Build prerequisites

- Node.js 20 or newer and npm 10 or newer.
- MySQL 8 or a compatible MySQL service.
- A persistent volume or object storage location for uploaded images.
- HTTPS termination at the hosting provider or reverse proxy.

Install dependencies and validate both applications before deployment:

```powershell
cd backend
npm ci
npm run typecheck
npm test
npm run build

cd ..\frontend
npm ci
npm run typecheck
npm run build
```

## 2. MySQL setup

Create a least-privilege application user and database through the hosting
provider or a secured MySQL administration connection. Do not use the root
account for the running API.

Configure the backend environment, then apply the migration and development
seed commands as appropriate:

```powershell
cd backend
Copy-Item .env.example .env
# Edit .env with production values.
npm run db:migrate
# Run db:seed only for a non-production/demo environment.
```

`db:migrate` creates the configured database when the database user has
permission to do so. Production migrations should be run as a controlled
release step and should not be mixed with application startup.

## 3. Backend environment

Set these values in the backend service environment. Use a secret manager
where the hosting platform provides one:

- `NODE_ENV=production`
- `PORT`
- `FRONTEND_URL` set to the exact HTTPS frontend origin
- `API_PUBLIC_URL` set to the public HTTPS API origin
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `SESSION_SECRET` with at least 32 unpredictable characters
- `SESSION_TTL_HOURS`
- `COOKIE_DOMAIN` only when a shared cookie domain is required
- `COOKIE_SECURE=true` (production configuration forces secure cookies)
- `UPLOAD_DIR` pointing to persistent storage
- `MAX_UPLOAD_BYTES`
- SMTP values if email verification, password reset, or email notifications
  are to be delivered by email
- `EXPOSE_DEV_TOKENS=false`

Never commit `.env`, database passwords, SMTP passwords, session secrets, or
real user data.

## 4. Run the API

Build and run the compiled backend:

```powershell
cd backend
npm run build
npm start
```

Expose the API only through HTTPS. Configure the reverse proxy or platform
service to forward requests to the API port and preserve the original
connection protocol so secure cookies and trusted proxy behavior work as
expected.

Verify:

```text
GET https://api.example.com/api/health
```

The response must report `success: true` and `database: "connected"`.

## 5. Build and serve the frontend

Set `VITE_API_URL` to the public API origin including `/api` when the frontend
is hosted separately:

```powershell
cd frontend
Copy-Item .env.example .env
# Set VITE_API_URL=https://api.example.com/api
npm run build
```

Serve `frontend/dist` from the static hosting provider. Configure SPA fallback
rewrites so browser routes such as `/products`, `/dashboard`, and `/admin`
serve `index.html`.

## 6. CORS, cookies, and uploads

- `FRONTEND_URL` must exactly match the browser origin, including scheme and
  port where applicable.
- The frontend API client uses credentialed requests; the API must allow
  credentials and the configured origin.
- Production cookies are HTTP-only, secure, and SameSite=Lax.
- Keep `UPLOAD_DIR` outside source-controlled files and back it up separately
  from the database.
- Uploads are byte-checked for JPEG, PNG, and WebP signatures, receive random
  server-generated filenames, and are limited by `MAX_UPLOAD_BYTES`.

## 7. Backups and restoration

Back up the MySQL database and upload storage independently. At minimum:

```powershell
mysqldump --single-transaction --routines --triggers -h $env:DB_HOST `
  -P $env:DB_PORT -u $env:DB_USER -p $env:DB_NAME > isokolink-backup.sql
```

Restore into a new or verified target database, apply any migrations that were
introduced after the backup, restore the upload volume, and run the health
check plus a protected login smoke test before switching traffic.

Test restoration periodically. A backup that has not been restored
successfully is not a verified recovery plan.

## 8. Release checklist

- [ ] Production environment variables are configured in a secret manager.
- [ ] `SESSION_SECRET` is strong and `EXPOSE_DEV_TOKENS=false`.
- [ ] MySQL migrations completed successfully.
- [ ] Demo seed data was not loaded into production.
- [ ] Backend typecheck, tests, and build passed.
- [ ] Frontend typecheck and build passed.
- [ ] HTTPS and SPA fallback are configured.
- [ ] CORS origin and cookie behavior were tested from the real frontend.
- [ ] Upload storage is persistent and backed up.
- [ ] `/api/health` reports database connectivity.
- [ ] Database and upload restoration procedures were tested.

## Known limitations

- SMTP delivery is optional and must be configured and tested separately.
- Upload storage is local-disk based by default; a persistent volume or object
  storage adapter is required for resilient multi-instance deployment.
