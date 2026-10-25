# ISOKOLINK RWANDA

A full-stack food marketplace for Rwanda. ISOKOLINK connects buyers with verified
sellers, publishes admin-reviewed listings, tracks market price observations, and
lets buyers and sellers talk directly without sharing phone numbers.

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios,
  React Hook Form, Zod, Recharts
- **Backend:** Node.js, Express, TypeScript, MySQL (`mysql2/promise`)
- **Auth:** server-side sessions with an httpOnly cookie, bcrypt password hashing,
  email verification and password reset tokens
- **Database:** MySQL 8 with 23 normalized tables, foreign keys and indexes

## Repository layout

```
ISOKOLINK_RWANDA/
├── backend/
│   ├── migrations/001_initial_schema.sql   # full schema
│   ├── src/
│   │   ├── config/        # environment validation
│   │   ├── db/            # pool, migration runner, seed script
│   │   ├── middleware/    # auth, validation, uploads, rate limits, errors
│   │   ├── modules/       # auth, users, products, prices, messaging, admin, …
│   │   ├── services/      # sessions, notification helpers
│   │   ├── utils/         # pagination, freshness, units, crypto, mailer
│   │   ├── app.ts         # Express application
│   │   └── server.ts      # HTTP entry point
│   └── tests/             # Vitest unit tests (no database required)
├── frontend/
│   └── src/
│       ├── components/    # layout, UI kit, shared views
│       ├── context/       # auth, i18n, toasts
│       ├── pages/         # public, auth, buyer, seller, admin pages
│       ├── services/      # typed Axios API client
│       ├── types/         # shared DTOs
│       └── utils/         # formatting, helpers
└── documentation/         # API reference and deployment guide
```

## Prerequisites

- Node.js 20+ (developed on Node 25)
- npm 10+
- MySQL 8 server running locally or reachable over the network
- A MySQL user that can create databases, or an existing database created manually

There is no SQLite/PostgreSQL fallback: **MySQL is required** for migrations,
seeding and integration testing.

The application database is named **`isokolink_rwanda`** by default.

## Local setup

### 1. Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Set these values in backend/.env:
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=isokolink_rwanda
# DB_USER=your_mysql_user
# DB_PASSWORD=your_mysql_password
# Also set a strong SESSION_SECRET.
npm run db:setup      # creates the database, runs migrations, seeds demo data
npm run dev           # http://localhost:5000
```

`npm run db:migrate` only applies migrations; `npm run db:seed` only seeds.
The migration runner creates `DB_NAME` automatically if the configured user has
permission. Make sure the MySQL server is running before executing
`npm run db:setup`.

### 2. Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev           # http://localhost:5173
```

During development the Vite dev server proxies `/api` and `/uploads` to
`http://localhost:5000`, so `VITE_API_URL` can stay empty. For a separately
hosted frontend, set `VITE_API_URL` to the backend origin, e.g.
`https://api.example.com/api`.

### 3. Demo accounts

Seeding creates these development accounts (password `Password123!`):

| Role   | Email                 |
| ------ | --------------------- |
| Admin  | `admin@isokolink.rw`  |
| Buyer  | `buyer@example.com`   |
| Buyer  | `buyer2@example.com`  |
| Seller | `seller@example.com`  |
| Seller | `seller2@example.com` |

With `EXPOSE_DEV_TOKENS=true` (the default outside production), verification and
reset tokens are returned in API responses so you can finish flows without SMTP.
The UI surfaces these links on the register, forgot-password and profile screens.

## Scripts

### Backend

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start the API with hot reload                |
| `npm run build`      | Compile TypeScript to `dist/`                |
| `npm start`          | Run the compiled API                         |
| `npm run typecheck`  | Type-check without emitting                  |
| `npm test`           | Run Vitest unit tests                        |
| `npm run db:migrate` | Apply SQL migrations                         |
| `npm run db:seed`    | Insert reference data and demo accounts      |
| `npm run db:setup`   | Migrate and seed in one step                 |

### Frontend

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start Vite on port 5173                  |
| `npm run build`     | Type-check and build production assets   |
| `npm run preview`   | Preview the production build             |
| `npm run typecheck` | Type-check without emitting              |

## Features

### Public

- Landing page with featured listings, categories and market highlights
- Product search with category, location, market, price and sort filters
- Product detail pages with image gallery, seller card and save/report actions
- Price explorer and comparison (same-dimension units are normalized to
  kg / litre / piece; incompatible units are not compared)
- Seller storefronts, FAQ, about, contact and legal pages

### Buyer

- Dashboard with stats, announcements and market snapshots
- Browse, save and compare products
- Message sellers from a product or the inbox (`/dashboard/conversations`)
- Notifications, personal reports, profile, security, workspace switching
- Apply to become a seller (verified email required)

### Seller

- Dashboard with listing stats and moderation alerts
- Create/edit listings with multiple images and market/location cascades
- Availability updates, archiving and resubmission after corrections
- Storefront profile management
- Shared messaging and notifications

### Admin

- Dashboard with Recharts activity charts and recent activity
- Product moderation: approve, reject, request correction, suspend, reinstate,
  feature, inspect approval history, and message sellers
- User management: search, filter, suspend/reactivate, grant/revoke roles with
  self-protection rules
- Reports queue with resolution notes and reporter notifications
- Market price observations CRUD
- Categories, markets, locations and units management
- Announcements (draft/publish, audience targeting)
- Audit log browser with action/entity/date filters and JSON metadata
- Shared messaging and notifications

## API overview

All endpoints are under `/api`. Successful responses use
`{ "success": true, "data": …, "meta"?: … }`; errors use
`{ "success": false, "error": { "code", "message", "details"? } }`.

| Area            | Routes                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| Auth            | `/auth/register`, `/login`, `/logout`, `/me`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`, `/change-password` |
| Users           | `/users/me`, `/users/me/stats`, `/users/me/saved-products`, `/users/me/become-seller`, `/users/me/seller-profile`, `/users/me/deactivate` |
| Public catalog  | `/products`, `/products/:id`, `/categories`, `/markets`, `/locations`, `/units`, `/sellers/:id`, `/market-prices`, `/market-prices/compare` |
| Seller          | `/seller/products`, `/seller/stats`                                       |
| Messaging       | `/conversations`, `/conversations/:id`, `/conversations/:id/messages`, `/conversations/:id/read`, `/conversations/unread-count` |
| Notifications   | `/notifications`, `/notifications/unread-count`, `/notifications/:id/read`, `/notifications/read-all` |
| Reports         | `/reports`, `/reports/mine`                                               |
| Announcements   | `/announcements`                                                          |
| Uploads         | `/uploads/product-image`, `/uploads/profile-image`                        |
| Admin           | `/admin/*` (products, users, reports, audit logs, reference data, market prices, announcements) |

See [documentation/API.md](documentation/API.md) for request bodies, query
parameters and role requirements.

## Security notes

- Passwords are hashed with bcrypt (12 rounds).
- Session tokens are random 32-byte values; only their SHA-256 hash is stored.
- The session cookie is httpOnly, SameSite=Lax, and `Secure` in production.
- Verification and reset tokens are single-use, expiring, and stored hashed.
- Login, registration and password-reset endpoints are rate limited.
- Requests with an untrusted `Origin` are rejected server-side.
- Uploads accept only JPEG/PNG/WebP up to 5 MB and are served from
  `/uploads` with cache headers.
- Admin actions write audit-log entries with actor, IP and metadata.
- `EXPOSE_DEV_TOKENS` is forced off in production.

## Testing

```powershell
cd backend
npm test
```

The current suite covers freshness thresholds, unit normalization and safe
comparisons, price-comparison summaries, pagination, slug/crypto helpers, API
validation envelopes, origin rejection, protected-route access, and Zod
validation for auth, products and report moderation. Tests do not need MySQL.

Integration tests against the database are intentionally not included in the
default run because they require a live MySQL instance. When MySQL is available,
run `npm run db:setup` first and add database-backed tests under `backend/tests`.

## Known limitations

- MySQL must be installed before migrations, seeds or end-to-end checks can run.
- Email delivery requires SMTP configuration; otherwise tokens are logged/returned
  in development only.
- Frontend translations cover navigation, common actions and footer strings; most
  page content remains English.
- Uploaded files are stored on local disk. Production deployments should use a
  persistent volume or object storage.

## Further documentation

- [API reference](documentation/API.md)
- [Deployment guide](documentation/DEPLOYMENT.md)
