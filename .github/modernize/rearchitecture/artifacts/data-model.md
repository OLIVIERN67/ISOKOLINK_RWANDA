# Data Model

This records the existing MySQL schema from `backend/migrations/001_initial_schema.sql`; it does not redesign or rename it.

## Entities

- `roles`: role catalog keyed by `id`, unique `name`.
- `users`: account identity, status, contact details, language, notification preference, and timestamps; unique email.
- `user_roles`: many-to-many users to roles, with optional granting user.
- `sessions`: hashed cookie sessions linked to users, expiry, IP, and user agent.
- `auth_tokens`: verification/reset token records linked to users.
- `locations`: hierarchical location records with optional parent.
- `markets`: markets belonging to locations.
- `categories`: product categories with unique name and slug.
- `units`: quantity/unit catalog with unique code.
- `seller_profiles`: one profile per seller user, optionally linked to location and market.
- `products`: seller-owned marketplace products linked to category, unit, location, optional market, and approving user.
- `product_images`: product image URLs ordered per product.
- `product_approval_history`: moderation history linked to products and optional admin.
- `market_price_observations`: category/market/location/unit price observations with optional creator.
- `saved_products`: composite user/product saved-product relation.
- `conversations`: conversation metadata optionally associated with a product and created by a user.
- `conversation_participants`: composite conversation/user relation.
- `messages`: messages linked to conversations and sender users.
- `notifications`: user notifications with read state and optional link.
- `product_reports`: reports linked optionally to product/reported user and to reporter/resolver users.
- `announcements`: authored announcements with audience and publication state.
- `audit_logs`: actor-linked audit records with action/entity metadata and JSON details.

## Relationships

- Users own sessions, auth tokens, seller profiles, products, messages, notifications, reports, announcements, and audit entries through foreign keys.
- Users and roles are many-to-many through `user_roles`.
- Locations are self-referential and own markets; products and seller profiles reference locations/markets.
- Products belong to sellers, categories, units, and locations; products have images, approval history, saved-product links, conversations, and reports.
- Conversations contain participants and messages.
- Categories, markets, locations, and units are reused by products and market-price observations.

## Key entities

- `users`: authenticated identities and role-bearing accounts.
- `seller_profiles`: seller-specific business and marketplace profile.
- `products`: primary marketplace inventory record.
- `market_price_observations`: reference pricing data used for comparison.
- `conversations` and `messages`: buyer/seller/admin communication.
- `product_reports`: moderation workflow input.
- `announcements`: audience-targeted platform communications.
- `audit_logs`: administrative accountability record.

## Transaction evidence

The shared MySQL helper exposes `withTransaction` in `backend/src/db/pool.ts`. Module services use parameterized queries and the schema enforces foreign keys and non-negative price/quantity checks.
