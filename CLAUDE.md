# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NJ2PC-OEM: an incident management app for ham radio operators (ARES/RACES-style), used to staff
events like a county fair. Tracks the operator roster, incidents (with an ICS-213-style message
log and ICS-205-style communications plans exportable as PDF), radio/equipment resources, and
check-in/check-out of operators and resources at incidents. Not yet deployed to production —
schema changes are still made by editing migrations directly rather than layering patches.

## Commands

Backend (from `backend/`):
```bash
mvn compile                    # compile only
mvn package -DskipTests        # build the jar
DB_HOST=localhost DB_PORT=5432 DB_NAME=nj2pc_oem DB_USER=nj2pc_oem DB_PASSWORD=changeme \
JWT_SECRET=dev-only-secret \
mvn spring-boot:run             # run against a local Postgres (env vars are required, no defaults in prod)
```
There are no backend tests yet (`src/test` is empty).

Frontend (from `frontend/`):
```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build — always run this after any frontend change, it's the fastest way to catch type errors
npm run lint      # oxlint
```
No frontend test suite exists either — `npm run build` is the correctness check in this repo.

Full stack via Docker Compose: `cp .env.example .env` (fill in DB_HOST/DB_USER/DB_PASSWORD/JWT_SECRET), then `docker compose up --build`.

K8s manifests: `k8s/` is a Kustomize root (matches the [hl-beta](https://github.com/alybadawy/hl-beta) GitOps
cluster's per-app component layout) — validate with `kubectl apply --dry-run=client -k k8s/`, not
`-f k8s/` (that treats `kustomization.yaml` as a raw resource and fails). Deploys to the shared
Postgres server already running in the cluster (`postgres.db.svc.cluster.local`, database
`nj2pc_oem`) rather than provisioning its own; DB credentials and `JWT_SECRET` come from Vault via
an `ExternalSecret` (`external-secret.yaml`), not a checked-in `Secret`. The app is exposed at
`emcomms.in.alybadawy.com`. Onboarding this app into the cluster (the ArgoCD `Application`
pointing at this repo, the Postgres role/database creation, and the Vault entries it reads from)
lives in the hl-beta repo, not here — see that repo's `k8s/apps/` for the pattern external repos
use (e.g. `twoofus.yaml`).

## Architecture

### Monorepo layout
`backend/` (Spring Boot 3, Java 21) and `frontend/` (React 19 + Vite + TypeScript + TailwindCSS +
shadcn/ui) are independent projects with no shared code or types — DTO shapes are kept in sync by
hand between `backend/.../*Response.java` records and `frontend/src/lib/types.ts`.

### Backend: package-by-feature
Each package under `org.nj2pc.oem.*` is a vertical slice (entity + repository + service +
controller + request/response DTOs), not a horizontal layer:
- `operator` — the Operator entity, which **is also the login identity** (see Auth below)
- `incident` — Incident, IncidentLog (ICS-213 message log)
- `resource` — radios/equipment, assignable to an operator and/or incident
- `checkin` — `OperatorCheckIn`/`ResourceCheckIn` (time-boxed check-in/out sessions against an
  incident, not a single static assignment — an incident can span multiple days, so an
  operator/resource can have several check-in rows across different shifts) and `OperatorRole`
  (an admin-managed lookup table for check-in roles like Com-T/Net Control, not a Java enum)
- `commsplan` — CommunicationPlan/CommunicationChannel (ICS-205), many-to-many with Incident via
  `incident_communication_plans`, plus `Ics205PdfService` which renders a plan to a PDF (OpenPDF)
  matching the real ICS-205 layout
- `vehicle` — Vehicle, many-to-one to Operator (zero-to-many vehicles per operator, `ON DELETE
  CASCADE`). Nested under `/api/operators/{operatorId}/vehicles`; every endpoint is self-or-ADMIN
  (an operator manages their own vehicles, ADMIN manages anyone's) via `VehicleService`, not
  `@PreAuthorize`, following the same `Authentication`-param pattern as
  `OperatorCheckInService.checkOut`. This is a placeholder authorization model — website-wide
  per-operator permissions (distinct from deployment/check-in roles) haven't been designed yet.
- `auth` — login, `/me`, self-service password change (no registration endpoint — operators are
  created via `operator`'s admin-only create/update)
- `config` — JWT issuing/parsing (`JwtService`, `JwtAuthFilter`) and `SecurityConfig`
- `common` — `ApiException` (factory methods per HTTP status) + `GlobalExceptionHandler`, which is
  the single place mapping exceptions to JSON error responses

### Auth model: Operator IS the User
There is no separate `User` table. Operators sign in with **callsign + password**
(`OperatorPrincipal`/`OperatorDetailsService` implement Spring Security's `UserDetails`/
`UserDetailsService` directly against `Operator`). Callsign lookups are case-insensitive both in
the repository (`findByCallsignIgnoreCase`) and via a functional unique index in the schema
(`UPPER(callsign)`), since login must work regardless of case. An operator with no `password_hash`
set simply can't log in (`OperatorPrincipal.isEnabled()` returns false).

There is no tiered `AccessLevel` enum anymore (it was removed in favor of the model below) — just
two orthogonal things on `Operator`:
- **`admin` (boolean)** — a superuser flag, not a permission grant. `OperatorPrincipal.getAuthorities()`
  grants `ROLE_ADMIN` only when this is true, so `@PreAuthorize("hasRole('ADMIN')")` still works
  everywhere it's used. The bootstrap operator (callsign `ADMIN`, seeded in `V2`) is the initial
  one with `admin = TRUE`; further operators can only be promoted by an existing admin (there's no
  API path to self-promote). Every permission check in `OperatorService.requirePermission` treats
  `admin = TRUE` as an unconditional bypass — "has all permissions all the time."
- **`permissions` (`Set<Permission>`, table `operator_permissions`)** — fine-grained, per-operator
  capability grants, checked explicitly per action rather than via Spring authorities (see
  `OperatorService.requirePermission`, which loads the caller's `Operator` row by callsign and
  checks `admin` or `permissions.contains(...)`). `Permission` (`org.nj2pc.oem.operator.Permission`)
  is a fixed, developer-defined enum — currently `OPERATOR_LIST` and `OPERATOR_MANAGE_PERMISSIONS`
  — not an admin-editable catalog. Only an admin can create operators or edit their full profile
  (`POST`/`PUT /api/operators/{id}`, still `hasRole('ADMIN')`); `PUT /api/operators/{id}/permissions`
  is the narrower endpoint an operator holding `OPERATOR_MANAGE_PERMISSIONS` (without being a full
  admin) can also use, since it only ever touches the permission set, not the rest of the profile.

Other feature areas (`incident`, `resource`, `resource-type`, `commsplan`, `checkin`,
`operator-role`) still gate their admin-only endpoints with `@PreAuthorize("hasRole('ADMIN')")` —
that continues to work unchanged since `ROLE_ADMIN` is still granted the same way. Their frontend
pages were removed when the UI was rebuilt around the new permission model (see Frontend structure
below) and haven't been rebuilt on `Permission` yet; the backend endpoints for them still exist and
still work, they're just unreachable from the current nav.

### The recurring lazy-loading bug — watch for this
Several past incidents in this codebase were the same root cause: a service method touches a
`FetchType.LAZY` association (or an `@ElementCollection`) while building a response DTO, but the
method itself isn't `@Transactional`, so Hibernate throws `LazyInitializationException` — or,
because `spring.jpa.open-in-view` is `false`, it can also surface a `500` if
`GlobalExceptionHandler` catches it too generically. Any service method that maps an entity with a
lazy association to a `*Response` record must be `@Transactional(readOnly = true)` for reads (see
`IncidentService.findAll/findById`, `OperatorCheckInService`, `CommunicationPlanService` for the
pattern). When adding a new lazy relation to an entity, grep for where its owning entity's
`*Response.from()` is called and check every call site is transactional.

### Migrations
Flyway migrations in `backend/src/main/resources/db/migration/`, currently `V1` (full schema,
including `created_by_id` and `vehicles`) and `V2` (seed: default operator roles + bootstrap
`ADMIN`/`ChangeMe!23` operator). Past migrations have been **squashed into V1 rather than
accumulating patch-on-patch** — if asked to make a significant schema change, prefer editing V1
directly over bolting on `V3__...sql`, unless the user asks to preserve existing data. Any
squash invalidates Flyway's checksum for everyone who already applied the old V1 (including a
deployed environment's `flyway_schema_history`), so it must be paired with dropping/recreating
that database's tables (kept the DB role/credentials, just the tables) before the next deploy —
this is a deliberate, user-directed reset, not something to automate into the deploy pipeline.

### Frontend structure
The UI was intentionally stripped down to just the operator/permission model while it's being
rebuilt — `src/pages/` currently has only `Login`, `AccountSettings`, `Operators`, `OperatorView`,
`OperatorCreate`, `OperatorEdit`, wired up in `src/App.tsx`. The old Incidents/Resources/CommsPlans/
Roles/ResourceTypes pages were deleted (their backend endpoints still exist, see Auth model above)
and will come back rebuilt against `Permission` rather than `AccessLevel` once that's designed.
- `src/components/` — shared components (`AppLayout` is the shell: sidebar nav + top-right user
  menu, both built from `hasPermission(user, ...)` / `user?.admin`; `OperatorFormFields` is the
  shared create/edit form used by both `OperatorCreate` and `OperatorEdit`, including the
  permission checkboxes)
- `src/lib/auth-context.tsx` — `useAuth()` exposes `{ callsign, name, admin, permissions }`; use the
  exported `hasPermission(user, permission)` helper rather than checking `user.permissions`
  directly, since it also accounts for `admin` bypassing every check. Gate admin-only UI with
  `user?.admin`, and pair it with an actual backend check — this app's convention is to enforce
  sensitive operations server-side and only use the frontend check to avoid flashing UI the user
  can't actually use (see the `useEffect` redirects in `OperatorCreate`/`OperatorEdit`/`Operators`)
- `src/lib/api.ts` — the shared axios instance; attaches the JWT and redirects to `/login` on 401
- `src/lib/callook.ts` — client-side lookup against `callook.info` (public FCC callsign database,
  permissive CORS) used to auto-fill name/license/address on operator registration; not called
  from the backend

Admin-only pages (`OperatorCreate`, `OperatorEdit`) are full-width — no `Card`/max-width wrapper —
by deliberate choice, to read as dedicated pages rather than a modal-in-disguise. Don't reintroduce
a dialog for create/edit flows on these; that pattern was explicitly replaced with standalone
routed pages. (The permission-management dialog on `Operators` is an exception — it's a narrow,
single-field action, not a create/edit flow.)

### Domain model notes
- **Incident lifecycle**: `PLANNED → ACTIVE → CLOSED` via dedicated `POST /start` and `POST /end`
  endpoints, not a generic status field edit. Once `CLOSED`, `IncidentService.requireNotClosed()`
  rejects further edits and new log entries. `end()` also auto-checks-out every open operator/
  resource check-in on that incident. **Incidents cannot be deleted at all** — there is no delete
  endpoint; this was a deliberate requirement, not an oversight.
- **Check-ins vs. resource assignment**: `Resource` still has a simple current
  `assignedOperator`/`assignedIncident`/`status` (for "who has this radio right now"), but presence
  *at an incident over time* is tracked separately via `OperatorCheckIn`/`ResourceCheckIn` rows
  (partial unique index enforces at most one open check-in per operator/resource per incident, but
  multiple closed ones accumulate across shifts/days). Checking a resource in/out also updates its
  `status`/`assignedIncident` for consistency.
- **Vehicles**: purely owned by one `Operator` (`vehicles.operator_id NOT NULL`, no incident/resource
  tie-in) — year/make/model/color/plate number/plate state/notes. Not yet surfaced in the frontend.
- **created_by**: `Operator` and `Incident` both have a self-referencing (to `Operator`)
  `created_by_id`, populated from the authenticated caller's callsign at creation time
  (`*Controller.create(Authentication authentication, ...)` → `*Service.create(request,
  authentication.getName())`). Only surfaced to ADMIN viewers on the frontend.
