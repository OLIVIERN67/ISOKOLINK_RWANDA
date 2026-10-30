# ISOKOLINK RWANDA - Testing Guide

This guide explains how to test the frontend and backend locally and on
production (Render backend + Vercel frontend).

The frontend reads its API URL from the `VITE_API_URL` environment variable:

- Local development: leave it empty to use the Vite proxy, or set
  `http://localhost:5000`.
- Production: set it as a Vercel Environment Variable to
  `https://isokolink-rwanda.onrender.com`.

When `VITE_API_URL` is missing in a production build, the frontend falls back to
`https://isokolink-rwanda.onrender.com`. It also ignores values that point to the
frontend's own origin, so requests cannot accidentally go to `/api` on Vercel.

> Important: `VITE_*` values are compiled into the public browser bundle. Use
> them for URLs and public settings only, never for database passwords or
> private server secrets.

---

## 1. Local testing

### 1.1 Prerequisites

- Node.js 20+ and npm 10+
- MySQL 8 running locally
- Two terminals (one for the backend, one for the frontend)

### 1.2 Backend setup

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env`:

```dotenv
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:5000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=isokolink_rwanda
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password

SESSION_SECRET=local-dev-secret-at-least-32-characters-long
COOKIE_SECURE=false
```

Create the database, run migrations and seed demo data:

```powershell
npm run db:setup
```

Start the API:

```powershell
npm run dev
```

The API should be available at `http://localhost:5000`.

### 1.3 Backend smoke tests

Run these in another PowerShell window while the backend is running.

```powershell
# Health check
Invoke-RestMethod http://localhost:5000/api/health

# Locations (the endpoint that was returning 404 on Vercel)
Invoke-RestMethod http://localhost:5000/api/locations

# Categories and products
Invoke-RestMethod http://localhost:5000/api/categories
Invoke-RestMethod "http://localhost:5000/api/products?page=1&pageSize=4"
```

Expected: every call returns HTTP 200 with a `{ "success": true, "data": ... }`
body and no 404.

Optional `curl` equivalents:

```bash
curl -i http://localhost:5000/api/health
curl -i http://localhost:5000/api/locations
```

### 1.4 Frontend setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

For local development, keep the proxy (recommended):

```dotenv
VITE_API_URL=
```

Start the frontend:

```powershell
npm run dev
```

Open `http://localhost:5173`.

To call the backend directly instead of using the proxy, set:

```dotenv
VITE_API_URL=http://localhost:5000
```

Restart the dev server after changing `.env`.

### 1.5 Verify in the browser

1. Open `http://localhost:5173`.
2. Open DevTools -> Network.
3. Reload the page.
4. Check the `locations`, `categories`, `products` requests:
   - With the proxy: URL is `http://localhost:5173/api/locations`.
   - With direct mode: URL is `http://localhost:5000/api/locations`.
   - Status must be `200`, not `404`.
5. Open DevTools -> Console and confirm there are no CORS or network errors.

### 1.6 Test authentication locally

1. Open `http://localhost:5173/register` and create an account.
2. Verify the email using the dev link/OTP shown by the UI.
3. Log in and confirm you stay logged in after a page refresh.
4. Open `http://localhost:5173/dashboard`.

The seeded demo accounts use password `Password123!`:

| Role   | Email                |
| ------ | -------------------- |
| Admin  | `admin@isokolink.rw` |
| Buyer  | `buyer@example.com`  |
| Seller | `seller@example.com` |

### 1.7 Test uploads locally

1. Log in as a seller.
2. Create or edit a product and upload an image.
3. Confirm the image preview appears.
4. Confirm the image URL is served by the backend, e.g.
   `http://localhost:5000/uploads/<file>.jpg`.

### 1.8 Local quality checks

```powershell
# Backend
cd backend
npm run typecheck
npm test

# Frontend
cd frontend
npm run typecheck
npm run build
npm run preview
```

`npm run preview` serves the production build locally at
`http://localhost:4173`. Because it is a production build, it uses the
production API fallback unless `VITE_API_URL` was set before building.

---

## 2. Production testing (Render + Vercel)

### 2.1 Backend environment variables on Render

Set these in the Render dashboard for the backend service:

| Variable          | Value                                        |
| ----------------- | -------------------------------------------- |
| `NODE_ENV`        | `production`                                 |
| `FRONTEND_URL`    | `https://isokolink-rwanda.vercel.app`        |
| `API_PUBLIC_URL`  | `https://isokolink-rwanda.onrender.com`      |
| `SESSION_SECRET`  | a strong random value of 32+ characters      |
| `COOKIE_SECURE`   | `true`                                       |
| `COOKIE_DOMAIN`   | leave empty for `onrender.com`               |
| Database variables| your production MySQL credentials            |

In production the session cookie is sent with `SameSite=None; Secure` so it can
be used across `vercel.app` -> `onrender.com`. Redeploy the backend after
changing these values.

### 2.2 Frontend environment variables on Vercel

In the Vercel project -> Settings -> Environment Variables, add:

| Variable        | Value                                     | Environments                      |
| --------------- | ----------------------------------------- | --------------------------------- |
| `VITE_API_URL`  | `https://isokolink-rwanda.onrender.com`   | Production (and Preview if used)  |

Vercel embeds `VITE_*` variables at build time. After adding or changing this
value you **must redeploy** (and clear the build cache if the old value persists).

Also confirm the Vercel project settings:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Do **not** set `VITE_API_URL` to `https://isokolink-rwanda.vercel.app` or `/api`.
If it points at the frontend, the app ignores it and falls back to the Render
backend in production, but it is better to configure it correctly.

### 2.3 Verify the backend directly

```powershell
Invoke-RestMethod https://isokolink-rwanda.onrender.com/api/health
Invoke-RestMethod https://isokolink-rwanda.onrender.com/api/locations
```

Both must return `200` and real data. If `/api/health` reports
`database: unavailable`, fix the Render database variables first.

### 2.4 Verify CORS for the Vercel origin

```powershell
$response = Invoke-WebRequest `
  -Uri "https://isokolink-rwanda.onrender.com/api/locations" `
  -Headers @{ Origin = "https://isokolink-rwanda.vercel.app" } `
  -UseBasicParsing

$response.StatusCode
$response.Headers["Access-Control-Allow-Origin"]
$response.Headers["Access-Control-Allow-Credentials"]
```

Expected:

- Status `200`
- `Access-Control-Allow-Origin: https://isokolink-rwanda.vercel.app`
- `Access-Control-Allow-Credentials: true`

Test the preflight used by login/register:

```powershell
$response = Invoke-WebRequest `
  -Uri "https://isokolink-rwanda.onrender.com/api/auth/login" `
  -Method Options `
  -Headers @{
    Origin = "https://isokolink-rwanda.vercel.app"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "content-type"
  } `
  -UseBasicParsing

$response.StatusCode
$response.Headers["Access-Control-Allow-Origin"]
```

Expected: `204` and the Vercel origin in `Access-Control-Allow-Origin`.

### 2.5 Verify the deployed frontend bundle points to Render

The API URL is compiled into the JavaScript bundle, so check the deployed bundle
itself:

```powershell
$html = (Invoke-WebRequest "https://isokolink-rwanda.vercel.app" -UseBasicParsing).Content
$bundle = [regex]::Match($html, 'src="(/assets/[^"]+\.js)"').Groups[1].Value
Write-Output "Bundle: $bundle"

$js = (Invoke-WebRequest "https://isokolink-rwanda.vercel.app$bundle" -UseBasicParsing).Content
if ($js -match "isokolink-rwanda\.onrender\.com") {
  "OK: bundle contains the Render backend URL"
} else {
  "OLD BUILD: redeploy Vercel (the bundle still uses /api)"
}
```

If it prints `OLD BUILD`, the deployed site is still the previous build. Trigger a
new Vercel deployment (Redeploy -> clear build cache), then run the check again.

### 2.6 Verify in the production browser

1. Open `https://isokolink-rwanda.vercel.app`.
2. Open DevTools -> Network and reload.
3. Find the `locations`, `categories`, `products`, `market-prices` calls.
4. The request URL must be
   `https://isokolink-rwanda.onrender.com/api/...`, **not**
   `https://isokolink-rwanda.vercel.app/api/...`.
5. Status must be `200`, not `404`.
6. Confirm there are no CORS errors in the Console.

### 2.7 Verify production authentication

1. Register or log in at `https://isokolink-rwanda.vercel.app/login`.
2. Refresh the page and confirm you remain logged in.
3. Open DevTools -> Application -> Cookies -> `isokolink-rwanda.onrender.com`
   and confirm the `isokolink_sid` cookie exists with `Secure` and
   `SameSite=None`.
4. If login succeeds but `/api/auth/me` returns `401` afterwards, the backend
   still has the old `SameSite=Lax` cookie settings: redeploy the backend.

### 2.8 Verify production uploads

1. Log in as a seller on the Vercel site.
2. Upload a product image.
3. In DevTools -> Network, the image request must go to
   `https://isokolink-rwanda.onrender.com/uploads/...`, not to the Vercel domain.

---

## 3. Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `GET https://isokolink-rwanda.vercel.app/api/...` returns `404` | `VITE_API_URL` missing or the Vercel deployment is an old build | Set `VITE_API_URL=https://isokolink-rwanda.onrender.com` in Vercel and redeploy with cache cleared |
| Requests go to `https://isokolink-rwanda.onrender.com/api/api/...` | `VITE_API_URL` already ends with `/api` and was appended twice | This should not happen with the current resolver; use the origin without `/api` |
| CORS error mentioning `Access-Control-Allow-Origin` | `FRONTEND_URL` on Render is wrong | Set it to `https://isokolink-rwanda.vercel.app` and redeploy the backend |
| Login works, refresh logs you out | Cross-site cookie blocked | Redeploy the backend so it uses `SameSite=None; Secure` in production |
| `OPTIONS` returns `403` | Origin check rejected the Vercel origin | Confirm `FRONTEND_URL`/`API_PUBLIC_URL` on Render and redeploy |
| Images are broken (404) | Uploaded file URLs are relative | The frontend prefixes `/uploads` with the API origin; make sure the new frontend build is deployed |
| `database: unavailable` from `/api/health` | Render cannot reach MySQL | Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, SSL/network access |
| Changes do not appear after deploy | Vercel/Render cache or old build | Redeploy with cache cleared and hard-refresh the browser |

---

## 4. Final checklist

Local:

- [ ] `npm run db:setup` completed
- [ ] `http://localhost:5000/api/health` returns `200`
- [ ] `http://localhost:5000/api/locations` returns `200`
- [ ] Frontend loads without network errors
- [ ] Login, refresh and logout work
- [ ] Image upload and display work
- [ ] `npm run typecheck` passes in both `backend` and `frontend`

Production:

- [ ] Render has `NODE_ENV=production`, `FRONTEND_URL`, `API_PUBLIC_URL`, `SESSION_SECRET`
- [ ] Vercel has `VITE_API_URL=https://isokolink-rwanda.onrender.com`
- [ ] Backend redeployed after backend changes
- [ ] Frontend redeployed after `VITE_API_URL` changes
- [ ] Production bundle check prints `OK`
- [ ] Browser Network tab shows requests to `isokolink-rwanda.onrender.com`
- [ ] Login persists across refresh on the Vercel site
- [ ] Uploaded images load from the Render domain
