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
(creates all tables) and `V2__seed_admin.sql` (seeds a bootstrap admin account).

**Bootstrap login**: username `admin`, password `ChangeMe123!`. Log in as this account first, then
use it (JWT with `ADMIN` role) to call `POST /api/auth/register` and create real operator/admin
accounts. There is no self-service password change endpoint yet — rotate the seeded admin's
password directly in the database once you've created your own admin account.

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

- `POST /api/auth/login`, `POST /api/auth/register` (ADMIN only)
- `GET/POST/PUT/DELETE /api/operators[/:id]` (write/delete: ADMIN only)
- `GET/POST/PUT /api/incidents[/:id]` (incidents cannot be deleted; `PUT` is rejected once CLOSED)
- `POST /api/incidents/:id/start`, `POST /api/incidents/:id/end`
- `GET/POST /api/incidents/:id/logs` (ICS-213-style message log)
- `GET/POST/PUT/DELETE /api/resources[/:id]`

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
