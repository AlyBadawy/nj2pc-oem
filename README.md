# NJ2PC-OEM

Incident management web application for ham radio operators (ARES/RACES-style), used to run
events like the Passaic County Fair: operator roster, ICS-213-style incident logging, and
radio/equipment resource tracking.

- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Java 21 + Spring Boot 3 (Web, Data JPA, Security, Validation, Actuator) + JWT auth
- **Database**: PostgreSQL (external server you provide), schema managed by Flyway
- **Deployment target**: K3s, exposed on port 80 via Ingress

## Repository Layout

```
backend/    Spring Boot REST API
frontend/   React SPA
docker-compose.yml   local dev: backend + frontend containers
k8s/        Kubernetes manifests for K3s deployment
```

## Prerequisites

- Java 21+ and Maven (for running the backend outside Docker)
- Node.js 20+ (for running the frontend outside Docker)
- Docker + Docker Compose (for the containerized workflow)
- Access to a PostgreSQL server, with a **database already created** named `nj2pc_oem`
  (or any name — just configure `DB_NAME` to match). Flyway creates the tables inside that
  database on first startup; it does not create the database itself.

## Database Setup

Create the database once on your existing PostgreSQL server, e.g.:

```sql
CREATE DATABASE nj2pc_oem;
CREATE USER nj2pc_oem WITH PASSWORD 'changeme';
GRANT ALL PRIVILEGES ON DATABASE nj2pc_oem TO nj2pc_oem;
```

On first backend startup, Flyway runs `backend/src/main/resources/db/migration/V1__init_schema.sql`
(creates all tables) and `V2__seed_data.sql` (seeds the default operator roles and a bootstrap
admin operator).

**Authentication**: operators sign in with **callsign + password** — no email verification, no
self-service sign-up, no password-reset flow. Only an ADMIN can create operators or grant login
access (by setting a password and access level when creating/editing an operator); everyone can
change their own password from **Account Settings** once logged in.

**Bootstrap login**: callsign `ADMIN` (case-insensitive), password `ChangeMe!23`. Log in, then
change that password from Account Settings and create real operator accounts from the Operators
page (Register Operator → set access level + password).

Access levels: `RESTRICTED`, `STANDARD`, `ADMIN`.
- `ADMIN` — full access: manage operators/roles, create incidents, manage communications plans.
- `STANDARD` — full read access to operators/incidents/resources and normal incident workflows
  (logs, check-ins), but can't see access levels or creation metadata, and can't reach admin-only
  pages (create incident, register operator, comms plans, roles).
- `RESTRICTED` — operator roster is reduced to callsign + name only; per-operator detail view is
  blocked outright (`403`) at the API level, not just hidden in the UI.

## Local Development

### Option A — Docker Compose

```bash
cp .env.example .env   # fill in DB_HOST/DB_USER/DB_PASSWORD/JWT_SECRET
docker compose up --build
```

- Frontend: http://localhost:8081
- Backend API: http://localhost:8080

### Option B — Run natively

Backend:

```bash
cd backend
DB_HOST=localhost DB_PORT=5432 DB_NAME=nj2pc_oem DB_USER=nj2pc_oem DB_PASSWORD=changeme \
JWT_SECRET=dev-only-secret \
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:8080
npm install
npm run dev
```

## API Overview

All endpoints under `/api/**` except `/api/auth/**` require a `Bearer` JWT.

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `GET/POST/PUT/DELETE /api/operators[/:id]` (write/delete: ADMIN only; `password`/`accessLevel`
  set login access; list/detail responses vary by caller's own access level — see Access levels
  above)
- `GET/POST/DELETE /api/operator-roles[/:id]` (write/delete: ADMIN only) — admin-managed lookup
  table for check-in roles (Com-T, Net Control, ...), not a fixed enum
- `GET /api/operator-checkins/active` — every currently open operator check-in, across all incidents
- `GET/POST/PUT /api/incidents[/:id]` (create: ADMIN only; incidents cannot be deleted; `PUT` is
  rejected once `CLOSED`)
- `POST /api/incidents/:id/start`, `POST /api/incidents/:id/end` (lifecycle transitions;
  `end` auto-checks-out every open operator/resource check-in on that incident)
- `GET/POST /api/incidents/:id/logs` (ICS-213-style message log; rejected once incident is `CLOSED`)
- `GET/POST/PUT/DELETE /api/incidents/:id/operator-checkins[/:checkInId]`,
  `.../resource-checkins[/:checkInId]`, plus `POST .../checkout` on each — time-boxed check-in
  sessions, not a static assignment
- `GET/POST/PUT/DELETE /api/resources[/:id]`
- `GET/POST/PUT/DELETE /api/comms-plans[/:id]` (ADMIN only, whole controller) — ICS-205
  communications plans; `GET /api/comms-plans/:id/pdf` renders one to a PDF matching the real
  ICS-205 layout
- `GET/POST/PUT/DELETE /api/comms-plans/:id/channels[/:channelId]` (ADMIN only) — the radio
  channel rows on a plan
- `POST/DELETE /api/comms-plans/:id/incidents/:incidentId` (ADMIN only) — link/unlink a plan to an
  incident (many-to-many)
- `GET /api/incidents/:id/comms-plans` (ADMIN only) — reverse lookup of plans linked to an incident

## Kubernetes / K3s Deployment

Manifests live in `k8s/`. Build and push (or import) images tagged to match the Deployments
(`nj2pc-oem/backend:latest`, `nj2pc-oem/frontend:latest`), fill in real values in
`k8s/db-credentials-secret.yaml` pointing at the PostgreSQL server already running in your
cluster (this repo never deploys a database itself — only connects to one you provide), then:

```bash
kubectl apply -f k8s/
```

The Ingress routes `/api` to the backend Service and everything else to the frontend Service,
listening on port 80. The frontend's nginx also proxies `/api` to the backend directly (used in
the Docker Compose setup, where there's no Ingress); this is redundant but harmless in-cluster
since the Ingress intercepts `/api` requests first.

Validate manifests without a live cluster: `kubectl apply --dry-run=client -f k8s/`.
