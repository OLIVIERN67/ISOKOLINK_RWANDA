# Project Structure

## Classification

Fullstack web application: a React/Vite browser client in `frontend/` and an Express/TypeScript REST API in `backend/`, backed by MySQL.

## Top-level modules

- `backend/` — Node.js API, database access, authentication, business modules, upload handling, and SQL migration/seed scripts.
- `frontend/` — React 18 single-page application, route layouts, pages, shared UI components, contexts, hooks, and Axios API client.
- `documentation/` — API reference documentation.

## Backend layers

- Entry/configuration: `backend/src/server.ts`, `backend/src/app.ts`, `backend/src/config/env.ts`.
- Middleware: authentication, origin checking, rate limiting, validation, upload handling, and error handling.
- Modules: route declarations, Zod schemas, services, and the products repository.
- Persistence: MySQL pool helpers, migration, and seed scripts.
- Shared services/utilities: sessions, notifications, mailer, audit logging, crypto, pagination, HTTP responses, and domain formatting.

## Frontend layers

- Entry/routing: `frontend/src/main.tsx`, `frontend/src/App.tsx`, Vite configuration, and `index.html`.
- Layouts and guards: public, authenticated dashboard, role-protected routes, and auth layout.
- Pages: public information/marketplace pages, authentication pages, buyer dashboard, seller workspace, and admin workspace.
- Shared UI: navigation, cards, modals, uploaders, state displays, and primitive controls.
- State/integration: React contexts, hooks, Axios service layer, types, and utility functions.

## Entry points

- API process: `backend/src/server.ts`.
- Express application and `/api/*` route registration: `backend/src/app.ts`.
- Frontend process: `frontend/src/main.tsx`.
- Browser route tree: `frontend/src/App.tsx`.
- Static upload serving: `/uploads` in `backend/src/app.ts`.
- Database setup: `backend/src/db/migrate.ts` and `backend/src/db/seed.ts`.

## Functional areas

Authentication and sessions; user profiles and seller onboarding; product marketplace and seller inventory; reference data; market price observations; buyer/seller messaging; notifications; product reports; announcements; administrative moderation and audit; media uploads; public informational pages.

## File counts

Counts are source files under `backend/src` and `frontend/src`, excluding `node_modules` and build output:

- Backend: 56 TypeScript source files.
- Frontend: 86 TypeScript/TSX/CSS source files.
- Frontend pages: 43 page files.
- Frontend shared components: 27 component files.
- Backend module files: 29 files under `backend/src/modules`.
