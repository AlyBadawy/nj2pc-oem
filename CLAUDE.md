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

K8s manifests: `kubectl apply --dry-run=client -f k8s/` to validate without a live cluster.

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
(`UPPER(callsign)`), since login must work regardless of case.

Three access levels stored on the operator (`AccessLevel`: `RESTRICTED`, `STANDARD`, `ADMIN`) map
directly to Spring authorities as `ROLE_<level>` (see `OperatorPrincipal.getAuthorities()`), so
`@PreAuthorize("hasRole('ADMIN')")` works normally. An operator with no `password_hash` set simply
can't log in (`OperatorPrincipal.isEnabled()` returns false) — only an ADMIN creating/editing an
operator can grant login access by setting a password + access level.

Visibility below ADMIN is enforced **server-side**, not just hidden in the UI — e.g.
`OperatorController.findAll` returns a different, reduced DTO (`OperatorSummaryResponse`:
callsign + name only) when the caller's JWT authority is `ROLE_RESTRICTED`, and
`GET /api/operators/{id}` is a hard 403 for that tier. Keep this pattern (check the caller's own
authorities in the controller, branch response type/content) when adding new tiered visibility
rather than filtering only in React.

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
Flyway migrations in `backend/src/main/resources/db/migration/`, currently `V1` (full schema),
`V2` (seed: default operator roles + bootstrap `ADMIN`/`ChangeMe!23` operator), `V3` (adds
`created_by_id` to operators/incidents). Since this app isn't deployed anywhere yet, past
migrations have been **squashed into V1 rather than accumulating patch-on-patch** — if asked to
make a significant schema change, prefer editing V1 directly and dropping/recreating the local dev
database over bolting on `V4__...sql`, unless the user asks to preserve existing data.

### Frontend structure
- `src/pages/` — one component per route, wired up in `src/App.tsx`
- `src/components/` — shared components (`AppLayout` is the shell: sidebar nav + top-right user
  menu; `OperatorFormFields` is the shared create/edit form used by both `OperatorCreate` and
  `OperatorEdit` to avoid duplicating the large operator form)
- `src/lib/auth-context.tsx` — `useAuth()` exposes `{ callsign, name, accessLevel }`; gate
  admin-only UI with `user?.accessLevel === 'ADMIN'`, and pair it with an actual backend check —
  this app's convention is to enforce sensitive operations server-side and only use the frontend
  check to avoid flashing UI the user can't actually use (see any `useEffect` that redirects away
  when `!isAdmin` in `OperatorCreate`/`IncidentCreate`/`CommsPlans`)
- `src/lib/api.ts` — the shared axios instance; attaches the JWT and redirects to `/login` on 401
- `src/lib/callook.ts` — client-side lookup against `callook.info` (public FCC callsign database,
  permissive CORS) used to auto-fill name/license/address on operator registration; not called
  from the backend

Admin-only pages (`OperatorCreate`, `OperatorEdit`, `IncidentCreate`, `CommsPlans`,
`CommsPlanDetail`, `Roles`) are full-width — no `Card`/max-width wrapper — by deliberate choice, to
read as dedicated pages rather than a modal-in-disguise. Don't reintroduce a dialog for
create/edit flows on these; that pattern was explicitly replaced with standalone routed pages.

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
- **created_by**: `Operator` and `Incident` both have a self-referencing (to `Operator`)
  `created_by_id`, populated from the authenticated caller's callsign at creation time
  (`*Controller.create(Authentication authentication, ...)` → `*Service.create(request,
  authentication.getName())`). Only surfaced to ADMIN viewers on the frontend.
