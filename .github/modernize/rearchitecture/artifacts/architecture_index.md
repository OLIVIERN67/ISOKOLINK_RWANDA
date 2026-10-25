# Architecture Index

This index is not the full contract. Do not implement from this file alone; follow the artifact paths below.

## Global artifacts

- `unit_graph.yaml` — all workers; defines entrypoints, source anchors, exported signatures, dependencies, dynamic entrypoints, and shared-reference subsets. Filter by the assigned `name`.
- `migration_boundary.yaml` — all workers; this analysis-only run has no rewrite scope. If implementation is requested later, consume `must_rewrite`, not `source_anchors`.
- `wire_contracts.yaml` — API workers; filter rows by `unit` for route, payload, response, auth, and error contracts.
- `shared_modules.yaml` — all workers touching shared code; filter `used_by_units` and use only the listed `fields` from each module.
- `cross_unit_state.yaml` — workers handling auth, browser state, or shared flows; filter rows where the unit is the writer or reader. Any `must_confirm: runtime` row requires runtime verification.
- `project-structure.md`, `tech-stack.md`, and `data-model.md` — design and implementation context for repository structure, existing technologies, and persisted entities.
- `seams.yaml` — not emitted because no declared or evidenced partial-migration seam was identified in this analysis.

## Implementation Guide

### Unit: health-api

- external trigger: `GET /api/health`
- must read: `units/health-api/behavior.yaml` for success/503 behavior; `units/health-api/bindings.yaml` for route wiring; `units/health-api/unit_decomposition.yaml` for advisory split candidates.
- relevant global rows: `wire_contracts.yaml` where `unit: health-api`; `shared_modules.yaml` where `used_by_units` includes `health-api`.
- before DONE report: artifacts read, implemented `must_preserve` items, unresolved/deferred contracts, and build/test/runtime evidence.

### Unit: auth-api

- external trigger: `/api/auth/*`
- must read: `units/auth-api/behavior.yaml`, `units/auth-api/bindings.yaml`, `units/auth-api/unit_decomposition.yaml`.
- relevant global rows: `wire_contracts.yaml` where `unit: auth-api`; `shared_modules.yaml` where `used_by_units` includes `auth-api`; `cross_unit_state.yaml` flows touching `auth-api`.
- before DONE report: artifacts read, session/cookie and rate-limit preservation, unresolved/deferred contracts, and verification evidence.

### Unit: user-seller-api

- external trigger: authenticated `/api/users/*` and public `/api/sellers/:id`
- must read: `units/user-seller-api/behavior.yaml`, `units/user-seller-api/bindings.yaml`, `units/user-seller-api/unit_decomposition.yaml`.
- relevant global rows: `wire_contracts.yaml` marketplace rows; `shared_modules.yaml` rows used by the unit; `cross_unit_state.yaml` cookie session flow.
- before DONE report: artifacts read, profile/saved-product/seller lifecycle preservation, unresolved/deferred contracts, and verification evidence.

### Unit: marketplace-api

- external trigger: product, reference, and market-price routes
- must read: `units/marketplace-api/behavior.yaml`, `units/marketplace-api/bindings.yaml`, `units/marketplace-api/unit_decomposition.yaml`.
- relevant global rows: `wire_contracts.yaml` where `unit: marketplace-api`; `shared_modules.yaml` rows used by the unit; `cross_unit_state.yaml` auth flow.
- before DONE report: artifacts read, route/pagination/ownership/approval preservation, unresolved/deferred contracts, and verification evidence.

### Unit: messaging-notifications-api

- external trigger: authenticated conversations and notifications
- must read: `units/messaging-notifications-api/behavior.yaml`, `units/messaging-notifications-api/bindings.yaml`, `units/messaging-notifications-api/unit_decomposition.yaml`.
- relevant global rows: `wire_contracts.yaml` where `unit: messaging-notifications-api`; `shared_modules.yaml` rows used by the unit; `cross_unit_state.yaml` flows touching the unit.
- before DONE report: artifacts read, unread/read/message side effects preserved, unresolved/deferred contracts, and verification evidence.

### Unit: reports-announcements-api

- external trigger: reports and public/admin announcements
- must read: `units/reports-announcements-api/behavior.yaml`, `units/reports-announcements-api/bindings.yaml`, `units/reports-announcements-api/unit_decomposition.yaml`.
- relevant global rows: `shared_modules.yaml` rows used by the unit; `cross_unit_state.yaml` flows touching the unit; wire rows currently covering shared administrative contracts.
- before DONE report: artifacts read, audience filtering and mutation/audit preservation, unresolved/deferred contracts, and verification evidence.

### Unit: admin-api

- external trigger: `/api/admin/*`
- must read: `units/admin-api/behavior.yaml`, `units/admin-api/bindings.yaml`, `units/admin-api/unit_decomposition.yaml`.
- relevant global rows: `wire_contracts.yaml` where `unit: admin-api`; `shared_modules.yaml` rows used by the unit; `cross_unit_state.yaml` authentication flow.
- before DONE report: artifacts read, admin guard/moderation/audit preservation, unresolved/deferred contracts, and verification evidence.

### Unit: uploads-api

- external trigger: product/profile multipart upload routes
- must read: `units/uploads-api/behavior.yaml`, `units/uploads-api/bindings.yaml`, `units/uploads-api/unit_decomposition.yaml`.
- relevant global rows: `shared_modules.yaml` where `used_by_units` includes `uploads-api`; `cross_unit_state.yaml` auth flow.
- before DONE report: artifacts read, file validation/storage/config preservation, unresolved/deferred contracts, and verification evidence.

### Unit: public-web

- external trigger: public browser routes
- must read: `units/public-web/behavior.yaml`, `units/public-web/bindings.yaml`, `units/public-web/unit_decomposition.yaml`.
- relevant global rows: `shared_modules.yaml` where `used_by_units` includes `public-web`; `cross_unit_state.yaml` language/auth flows; `wire_contracts.yaml` for marketplace calls.
- before DONE report: artifacts read, route/fallback/localization behavior preserved, unresolved/deferred contracts, and browser/build evidence.

### Unit: auth-web

- external trigger: login, registration, verification, and recovery pages
- must read: `units/auth-web/behavior.yaml`, `units/auth-web/bindings.yaml`, `units/auth-web/unit_decomposition.yaml`.
- relevant global rows: `wire_contracts.yaml` where `unit: auth-api`; `shared_modules.yaml` API/auth rows; `cross_unit_state.yaml` auth context and cookie flows.
- before DONE report: artifacts read, auth lifecycle/session state preservation, unresolved/deferred contracts, and browser/build evidence.

### Unit: buyer-dashboard-web

- external trigger: protected `/dashboard/*` routes
- must read: `units/buyer-dashboard-web/behavior.yaml`, `units/buyer-dashboard-web/bindings.yaml`, `units/buyer-dashboard-web/unit_decomposition.yaml`.
- relevant global rows: `wire_contracts.yaml` marketplace/messaging contracts; `shared_modules.yaml` API/auth rows; `cross_unit_state.yaml` flows touching this unit.
- before DONE report: artifacts read, guard/navigation/dashboard side effects preserved, unresolved/deferred contracts, and browser/build evidence.

### Unit: seller-admin-web

- external trigger: protected `/seller/*` and `/admin/*` routes
- must read: `units/seller-admin-web/behavior.yaml`, `units/seller-admin-web/bindings.yaml`, `units/seller-admin-web/unit_decomposition.yaml`.
- relevant global rows: `wire_contracts.yaml` marketplace and administrative contracts; `shared_modules.yaml` API/auth rows; `cross_unit_state.yaml` flows touching this unit.
- before DONE report: artifacts read, role guards, seller inventory, admin moderation, and upload behavior preserved, plus unresolved/deferred contracts and browser/build evidence.
