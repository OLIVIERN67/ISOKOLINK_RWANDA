# ISOKOLINK RWANDA API

Base URL (development): `http://localhost:5000/api`

All responses are JSON. Successful responses:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 1 } }
```

Errors:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [{ "field": "email", "message": "…" }] } }
```

Common status codes: `400` validation/bad request, `401` unauthenticated,
`403` forbidden, `404` not found, `409` conflict, `429` rate limited,
`500` server error.

## Authentication

Sessions are cookie based. After login/register the API sets an httpOnly
`isokolink_sid` cookie (SameSite=Lax, `Secure` in production). Send cookies with
every request (`withCredentials: true` in the included Axios client). There are
no bearer tokens.

| Method | Path                    | Auth | Body / notes |
| ------ | ----------------------- | ---- | ------------ |
| POST   | `/auth/register`        | –    | `fullName`, `email`, `password`, `phone?`, `preferredLanguage?` (`en`/`rw`/`fr`), `acceptTerms: true` |
| POST   | `/auth/login`           | –    | `email`, `password` |
| POST   | `/auth/logout`          | yes  | – |
| GET    | `/auth/me`              | yes  | Returns `{ user }` |
| POST   | `/auth/verify-email`    | –    | `token` |
| POST   | `/auth/resend-verification` | yes | Returns `{ message, devVerificationToken? }` |
| POST   | `/auth/forgot-password` | –    | `email`; returns `{ message, devResetToken? }` |
| POST   | `/auth/reset-password`  | –    | `token`, `password` |
| POST   | `/auth/change-password` | yes  | `currentPassword`, `newPassword` |

Passwords need 8–128 characters with lowercase, uppercase and a number.
Development tokens are returned only when `EXPOSE_DEV_TOKENS=true` and
`NODE_ENV !== "production"`.

## Current user and sellers

| Method | Path | Auth | Body / notes |
| ------ | ---- | ---- | ------------ |
| GET    | `/users/me` | yes | Profile with roles, verification and seller profile |
| PATCH  | `/users/me` | yes | `fullName?`, `phone?`, `preferredLanguage?`, `notificationEmailEnabled?` |
| GET    | `/users/me/stats` | yes | Buyer stats: saved products, reports, conversations, unread notifications |
| GET    | `/users/me/saved-products` | yes | `page`, `pageSize` (max 60) |
| POST   | `/users/me/saved-products/:productId` | yes | Save product |
| DELETE | `/users/me/saved-products/:productId` | yes | Unsave product |
| POST   | `/users/me/become-seller` | yes | `businessName`, `description` (20+ chars), `locationId`, `marketId?`, `contactPhone`, `preferredContact` (`message`/`phone`/`email`), `publicContactVisibility`, `profileImageUrl?`. Requires verified email. |
| GET    | `/users/me/seller-profile` | seller | Own seller profile |
| PATCH  | `/users/me/seller-profile` | seller | Any subset of seller profile fields |
| POST   | `/users/me/deactivate` | yes | Deactivates account and clears session; admins cannot self-deactivate |
| GET    | `/sellers/:id` | – | Public seller storefront (`id` is the seller's user id) |

## Reference data

| Method | Path | Auth | Query |
| ------ | ---- | ---- | ----- |
| GET | `/categories` | – | – |
| GET | `/units` | – | – |
| GET | `/locations` | – | Returns `{ provinces, districts }` |
| GET | `/markets` | – | `locationId?` |
| GET | `/announcements` | – | `audience?` = `all` / `buyers` / `sellers` |

## Products

### Public

`GET /products` query:

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Name/description search, max 120 |
| `categoryId` / `category` | number / slug | Category filter |
| `locationId`, `marketId`, `unitId`, `sellerId` | number | Exact filters |
| `minPrice`, `maxPrice` | number | Price range |
| `availability` | `available` / `unavailable` / `sold` | – |
| `sort` | `newest` / `price_asc` / `price_desc` / `featured` | Default `featured` |
| `page`, `pageSize` | number | Defaults 1 and 12, max 60 |

`GET /products/:id` returns an approved public product. `GET
/products/:id/approval-history` requires auth and returns the owner's moderation
history.

### Seller (`/seller`, requires auth + seller role)

| Method | Path | Body |
| ------ | ---- | ---- |
| GET | `/seller/products` | Query: public filters plus `status` (`pending`/`approved`/`rejected`/`requires_correction`/`suspended`/`all`, default `all`) and `includeArchived` (boolean) |
| POST | `/seller/products` | `name`, `description` (20+ chars), `categoryId`, `unitId`, `price`, `currency?` (3 letters, default RWF), `quantity`, `locationId`, `marketId?`, `availability?`, `images?` (max 5) |
| GET | `/seller/products/:id` | – |
| PATCH | `/seller/products/:id` | Any create field |
| PATCH | `/seller/products/:id/availability` | `availability`, `quantity?` |
| DELETE | `/seller/products/:id` | Archives the listing |
| GET | `/seller/stats` | – |

Image entries must be `/uploads/<file>` paths or absolute HTTP(S) URLs. Editing
an approved listing returns it to moderation.

## Market prices

| Method | Path | Auth | Params |
| ------ | ---- | ---- | ------ |
| GET | `/market-prices` | – | `q?`, `categoryId?`, `marketId?`, `locationId?`, `unitId?`, `verificationStatus?` (`verified`/`unverified`), `from?`, `to?` (YYYY-MM-DD), `sort` (`newest`/`price_asc`/`price_desc`), `page`, `pageSize` |
| GET | `/market-prices/compare` | – | `q` (required, 2+ chars), optional category/location/unit/market filters |
| GET | `/market-prices/:id` | – | – |

Comparison groups by product name and only compares compatible dimensions.
Weight and volume units are normalized to kg and litres; count units to pieces.
Incompatible units (e.g. bag vs kg) are never compared.

### Admin

| Method | Path | Body |
| ------ | ---- | ---- |
| POST | `/admin/market-prices` | `productName`, `categoryId`, `marketId?`, `locationId`, `unitId`, `price`, `currency?`, `observedOn` (not future), `source`, `verificationStatus?`, `observedBy?`, `notes?` |
| PATCH | `/admin/market-prices/:id` | Any create field |
| DELETE | `/admin/market-prices/:id` | – |

## Messaging

All endpoints require authentication. Users can only read and write
conversations they participate in.

| Method | Path | Body / query |
| ------ | ---- | ------------ |
| GET | `/conversations` | `q?`, `page`, `pageSize` |
| GET | `/conversations/unread-count` | – |
| POST | `/conversations` | `recipientId`, `productId?`, `subject?`, `message`. Cannot message yourself; starting an existing direct thread reuses it. |
| GET | `/conversations/:id` | `before?` (message id), `limit?` |
| POST | `/conversations/:id/messages` | `body` (1–5000 chars) |
| POST | `/conversations/:id/read` | – |
| POST | `/notifications/:id/read` | – |

Buyers and sellers may start conversations with one another or contact an
administrator; administrators may start a conversation with any active user.
Product-linked threads require an approved, available listing and its seller.
New messages create a notification that points to the recipient's workspace
inbox. Conversation history remains restricted to its participants.

## Notifications

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/notifications` | `page`, `pageSize` (max 60), `unreadOnly` |
| GET | `/notifications/unread-count` | Returns `{ count }` |
| POST | `/notifications/:id/read` | Marks one notification read |
| POST | `/notifications/read-all` | Marks all read |

Notification objects include `id`, `type`, `title`, `body`, `link`, `isRead`,
`createdAt`, `readAt`.

## Reports

| Method | Path | Auth | Body |
| ------ | ---- | ---- | ---- |
| POST | `/reports` | yes | `productId?` and/or `reportedUserId?`, `reason`, `details` (10–2000 chars). At least one target is required. |
| GET | `/reports/mine` | yes | – |
| GET | `/admin/reports` | admin | `status` (`open`/`under_review`/`resolved`/`dismissed`/`all`, default `all`), `q?`, `page`, `pageSize` |
| PATCH | `/admin/reports/:id` | admin | `status` (`under_review`/`resolved`/`dismissed`), `resolutionNote?`. A note of at least 5 chars is required to resolve/dismiss. |

Reason values: `Misleading price`, `Suspicious listing`, `Potential scam`,
`Inappropriate content`, `Incorrect product information`, `Other`. Duplicate
open reports for the same product by the same reporter return `409`.

## Announcements (admin)

| Method | Path | Body |
| ------ | ---- | ---- |
| GET | `/admin/announcements` | Lists drafts and published items |
| POST | `/admin/announcements` | `title` (3–200), `body` (10–10000), `audience` (`all`/`buyers`/`sellers`, default `all`), `isPublished` (default false) |
| PATCH | `/admin/announcements/:id` | Any of the above |
| DELETE | `/admin/announcements/:id` | Returns `204` |

## Admin moderation

All `/admin/*` endpoints require the `admin` role.

### Products

| Method | Path | Body |
| ------ | ---- | ---- |
| GET | `/admin/products` | Query: `status` (`pending`/`approved`/`rejected`/`requires_correction`/`suspended`/`all`, default `pending`), `q?`, `sellerId?`, `categoryId?`, `includeArchived?`, `page`, `pageSize` |
| GET | `/admin/products/:id` | Includes approval history |
| POST | `/admin/products/:id/approve` | `reason?` |
| POST | `/admin/products/:id/reject` | `reason` (5+ chars) |
| POST | `/admin/products/:id/request-correction` | `reason` (5+ chars) |
| POST | `/admin/products/:id/suspend` | `reason` (5+ chars) |
| POST | `/admin/products/:id/reinstate` | `reason?` |
| PATCH | `/admin/products/:id/feature` | `isFeatured` |

Moderation actions notify the seller and are written to the audit log.

### Users

| Method | Path | Body / query |
| ------ | ---- | ------------ |
| GET | `/admin/users` | `q?`, `status` (`active`/`suspended`/`deactivated`/`all`), `role` (`buyer`/`seller`/`admin`/`all`), `page`, `pageSize` |
| GET | `/admin/users/:id` | – |
| POST | `/admin/users/:id/suspend` | `reason` (5+ chars) |
| POST | `/admin/users/:id/reactivate` | – |
| POST | `/admin/users/:id/roles` | `role` (`admin`/`seller`), `action` (`grant`/`revoke`) |

Admins cannot suspend or demote their own account through these endpoints.

### Audit logs and reference data

| Method | Path | Body / query |
| ------ | ---- | ------------ |
| GET | `/admin/audit-logs` | `q?`, `action?`, `entityType?`, `actorId?`, `from?`, `to?` (YYYY-MM-DD), `page`, `pageSize` (max 100) |
| GET | `/admin/categories` | – |
| POST | `/admin/categories` | `name`, `slug?`, `description?`, `icon?`, `isActive?` |
| PATCH | `/admin/categories/:id` | Any category field |
| DELETE | `/admin/categories/:id` | Deactivates when referenced, otherwise deletes |
| GET | `/admin/markets` | – |
| POST | `/admin/markets` | `name`, `locationId`, `description?`, `isActive?` |
| PATCH | `/admin/markets/:id` | Any market field |
| DELETE | `/admin/markets/:id` | Deactivates when referenced, otherwise deletes |
| GET | `/admin/locations` | `{ provinces, districts }` |
| POST | `/admin/locations` | `name`, `type` (`province`/`district`), `parentId?` |
| DELETE | `/admin/locations/:id` | Fails if referenced |
| GET | `/admin/units` | – |
| POST | `/admin/units` | `code`, `label`, `dimension`, `factorToBase` |
| PATCH | `/admin/units/:id` | `label?`, `factorToBase?` (code is immutable) |

### Dashboard stats

`GET /admin/stats` returns marketplace totals, pending moderation counts,
recent users, recent activity series and category breakdowns used by the admin
dashboard charts.

## Uploads

Both endpoints require authentication and accept `multipart/form-data` with the
file field named `image`. The default maximum size is 5 MB (configurable with
`MAX_UPLOAD_BYTES`); allowed types are JPEG, PNG, and WebP. The API validates
both the declared MIME type and the file signature. Responses contain a
relative URL such as `{ "url": "/uploads/1720000000000-abc123.jpg" }`.

| Method | Path | Notes |
| ------ | ---- | ----- |
| POST | `/uploads/product-image` | Product gallery image |
| POST | `/uploads/profile-image` | Buyer/seller/admin avatar or business logo |

## Rate limits

Limits are route-specific; there is no global API limiter. The current
`express-rate-limit` configuration uses the client IP as the key by default.

| Scope | Limit |
| ----- | ----- |
| Login, email verification, password change | 30 requests / 15 minutes / IP |
| Registration | 10 requests / hour / IP |
| Resend verification, forgot password, reset password | 10 requests / hour / IP |
| Seller application, product creation and edit, report creation | 120 requests / minute / IP |
| Start conversation and send message | 30 requests / minute / IP |

Limits return `429` with `Retry-After` where applicable.
