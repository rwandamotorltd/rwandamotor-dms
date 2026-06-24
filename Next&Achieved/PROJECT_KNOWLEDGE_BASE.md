# PROJECT KNOWLEDGE BASE — Rwandamotor CSSR (DMS)
**Version:** 1.0.0 | **Last Updated:** 2026-06-15 | **Owner:** admin@rwandamotor.com

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context](#2-business-context)
3. [Technical Architecture](#3-technical-architecture)
4. [Project Structure](#4-project-structure)
5. [Database Documentation](#5-database-documentation)
6. [Configuration Inventory](#6-configuration-inventory)
7. [Infrastructure Documentation](#7-infrastructure-documentation)
8. [Credentials Inventory](#8-credentials-inventory)
9. [Installation Guide](#9-installation-guide)
10. [Development History](#10-development-history)
11. [API Documentation](#11-api-documentation)
12. [Security Documentation](#12-security-documentation)
13. [Open Tasks & Backlog](#13-open-tasks--backlog)
14. [Feature Inventory](#14-feature-inventory)
15. [Testing Documentation](#15-testing-documentation)
16. [Operational Runbook](#16-operational-runbook)
17. [AI Session Continuity](#17-ai-session-continuity)

---

## 1. Executive Summary

**Rwandamotor CSSR** (Customer Service & Sales Retention) is a proprietary Dealer Management System (DMS) built for a multi-brand automotive dealership in Rwanda. It replaces manual spreadsheet workflows with a fully integrated web application covering vehicle inventory, customer management, job cards, service records, and retention analytics.

**Current Status:** Production-deployed, actively in use.

**Key Metrics Tracked:**
- Vehicle retention rates (monthly, quarterly, 6-month, yearly)
- Open and closed job cards per day/month
- Service revenue per vehicle
- Customer cohort analysis by sale year and model

**Deployed At:**
- API: `https://api.rwandamotor.com` (self-hosted Linux server, .NET 9)
- Frontend: `https://app.rwandamotor.com` (Vercel)

---

## 2. Business Context

Rwandamotor is a multi-brand automotive dealership in Rwanda selling and servicing vehicles across several brands (e.g., Toyota, Suzuki, etc.). Prior to this system, service records and job cards were tracked manually in spreadsheets, making retention analysis impossible and customer communication ad-hoc.

**Core Business Problems Solved:**
- No visibility into which vehicles return for service (retention gap)
- No structured job card / workshop intake process
- No 360° view of customer or vehicle history
- No proactive follow-up system for overdue/lost customers

**User Roles:**
- **Admin** — full access to all features including user management
- **CRMOfficer** — full operational access (job cards, vehicles, customers, service records, import, retention) but no Settings page
- **TechnicalDirector** — read-only view of vehicles, customers, service records, job cards, and retention analytics; cannot create or edit
- **CRE** (Customer Relations Executive) — minimal access, dashboard only by default

**Permission Model:**
Roles have default permission sets. Admins can create named "Permission Groups" that override role defaults, enabling fine-grained per-user access control (e.g., a CRM officer who cannot delete vehicles).

---

## 3. Technical Architecture

### Backend

| Aspect | Choice |
|--------|--------|
| Framework | ASP.NET Core (.NET 9) |
| Architecture | Clean Architecture (Domain / Application / Infrastructure / API layers) |
| Pattern | CQRS with MediatR |
| ORM | Entity Framework Core 9 + Npgsql |
| Database | PostgreSQL 16 |
| Auth | ASP.NET Core Identity + JWT Bearer |
| Validation | FluentValidation via MediatR pipeline behaviour |
| Scheduling | Quartz.NET (nightly retention job at 02:00 UTC) |
| Logging | Serilog (console + rolling file) |
| Swagger | Swashbuckle v7 |

### Frontend

| Aspect | Choice |
|--------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| React | 19 |
| State / Fetching | TanStack Query v5 (useQuery / useMutation) |
| UI Library | shadcn/ui (Radix primitives + Tailwind) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |
| HTTP Client | Axios |

### Deployment

```
[Cloudflare Tunnel] ──TLS──▶ [Nginx:80] ──HTTP──▶ [.NET API :5000]
                                                         │
                                                    [PostgreSQL :5432]

[Vercel Edge Network] ──▶ [Next.js Frontend] ──HTTPS──▶ [API]
```

The .NET API runs as a Linux systemd service (`rwandamotor-api.service`). Nginx proxies all requests from port 80. Cloudflare Tunnel terminates TLS — Nginx does not hold certificates. The GitHub Actions `deploy.yml` workflow triggers a Vercel redeploy hook for the frontend and runs `dotnet publish` + `sudo /usr/local/bin/rwandamotor-deploy` on the self-hosted runner for the backend.

---

## 4. Project Structure

```
CSSR/
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR + push CI: build, tsc, lint, docker
│       └── deploy.yml          # Push-to-main deploy: API (self-hosted) + Vercel hook
├── MD/                         # Project documentation / context files
├── backend/
│   └── src/
│       ├── RwandaMotor.Domain/
│       │   ├── Common/BaseEntity.cs    # Soft-delete base, audit fields
│       │   ├── Entities/               # All domain entities
│       │   └── Enums/                  # All enums
│       ├── RwandaMotor.Application/
│       │   ├── Common/
│       │   │   ├── Behaviours/ValidationBehaviour.cs
│       │   │   ├── Interfaces/         # IApplicationDbContext, IJwtService, etc.
│       │   │   ├── Models/PaginatedResult.cs
│       │   │   └── Permissions/DefaultPermissions.cs
│       │   └── Features/               # CQRS commands and queries per aggregate
│       │       ├── Admin/              # User management
│       │       ├── Auth/               # Login
│       │       ├── Customers/          # CRUD + Customer360
│       │       ├── Dashboard/          # KPI query
│       │       ├── Import/             # CSV bulk import
│       │       ├── JobCards/           # CRUD + convert to delivery note
│       │       ├── PermissionGroups/   # CRUD
│       │       ├── Retention/          # Analytics queries
│       │       ├── ServicePolicies/    # CRUD
│       │       ├── ServiceRecords/     # CRUD
│       │       ├── Technicians/        # CRUD
│       │       └── Vehicles/           # CRUD + Vehicle360
│       ├── RwandaMotor.Infrastructure/
│       │   ├── BackgroundJobs/
│       │   │   ├── BackfillJobCardServiceRecordsService.cs  # Startup backfill
│       │   │   └── RetentionEvaluationJob.cs                # Nightly Quartz job
│       │   ├── Migrations/             # EF Core migrations
│       │   ├── Persistence/
│       │   │   ├── ApplicationDbContext.cs
│       │   │   ├── Configurations/     # EF fluent configs
│       │   │   └── Seed/ApplicationDbSeeder.cs
│       │   ├── Services/               # JwtService, RetentionEngine, ServiceIntervalEngine, ImportService
│       │   └── DependencyInjection.cs
│       └── RwandaMotor.API/
│           ├── Controllers/            # One controller per aggregate
│           ├── Extensions/CurrentUserService.cs
│           ├── Middleware/ExceptionHandlingMiddleware.cs
│           ├── Program.cs
│           └── appsettings.*.json
├── deploy/
│   ├── api.env.example             # Environment variable template
│   ├── nginx-api.conf              # Nginx reverse proxy config
│   ├── rwandamotor-api.service     # Systemd unit file
│   └── server-setup.sh             # One-shot server provisioning script
├── docker/
│   └── docker-compose.yml          # Optional local dev compose
└── frontend/
    └── src/
        ├── app/                    # Next.js App Router pages
        │   ├── (auth)/login/
        │   └── (dashboard)/        # All authenticated pages
        │       ├── layout.tsx      # Dashboard shell with sidebar
        │       ├── dashboard/
        │       ├── vehicles/       # List + [id]/page (Vehicle 360)
        │       ├── customers/      # List + [id]/page (Customer 360)
        │       ├── job-cards/      # List + [id]/page (detail + print)
        │       ├── service-records/
        │       ├── retention/
        │       ├── import/
        │       ├── admin/          # users + technicians sub-pages
        │       └── settings/       # Users tab + Permission Groups tab
        ├── components/
        │   ├── layout/             # sidebar.tsx, header.tsx
        │   ├── shared/             # kpi-card, retention-badge
        │   └── ui/                 # shadcn/ui component wrappers
        ├── contexts/auth-context.tsx   # AuthProvider + usePermission hook
        ├── lib/api.ts                  # All API client functions (Axios)
        └── types/index.ts              # All TypeScript types / interfaces
```

---

## 5. Database Documentation

### Technology
PostgreSQL 16, managed via EF Core migrations. Connection via `Npgsql 8.x` with `EnableDynamicJson()` required for `jsonb` columns.

### Global Patterns
- **Soft deletes:** Every entity inherits `BaseEntity` which includes `IsDeleted`, `DeletedAt`, `DeletedBy`. EF Core global query filters automatically exclude soft-deleted rows for all entities. Queries that intentionally need deleted rows must call `.IgnoreQueryFilters()`.
- **Audit fields:** `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy` are auto-set in `ApplicationDbContext.SaveChangesAsync()`.
- **All PKs:** `Guid` (UUID), generated on the entity side (`Guid.NewGuid()`), not by the database.

### Entity Overview

#### `ApplicationUser` (ASP.NET Identity)
Extends `IdentityUser`. Additional fields:
- `FullName string`
- `Role string?` (redundant with Identity roles, kept for convenience)
- `IsActive bool`
- `RefreshToken string?`, `RefreshTokenExpiry DateTime?`
- `PermissionGroupId Guid?` — FK to `PermissionGroups.Id`
- `LastLoginAt DateTime?`

#### `Customer`
| Column | Type | Notes |
|--------|------|-------|
| FullName | string | Required |
| Phone | string? | |
| Email | string? | |
| Address, City | string? | |
| Country | string? | Default "Rwanda" |
| PreferredContactMethod | enum | Phone/SMS/Email/WhatsApp/InPerson |
| Category | enum | Retail/Corporate/Government/NGO/Fleet/VIP/External |
| CompanyName, TaxId | string? | For corporate customers |
| IsActive | bool | |

Navigation: `Vehicles[]`, `FollowUps[]`

#### `Vehicle`
| Column | Type | Notes |
|--------|------|-------|
| VIN | string | Required, unique |
| PlateNumber | string? | |
| BrandId, ModelId | Guid | FK |
| Year | int | |
| CustomerId | Guid? | FK, nullable (external/unowned) |
| IsSoldByDealership | bool | Only true vehicles affect retention metrics |
| SaleDate, SalePrice | DateTime?, decimal? | |
| CurrentMileage, LastServiceMileage | int? | |
| LastServiceDate, NextServiceDate | DateTime? | |
| NextServiceMileage | int? | |
| WarrantyStartDate, WarrantyEndDate | DateTime? | |
| WarrantyKmLimit | int? | |
| ServicePolicyId | Guid? | FK, nullable (falls back to brand default) |
| RetentionStatus | enum | Active/DueSoon/Overdue/Lost/Recovered/External |
| RetentionStatusUpdatedAt | DateTime? | |

Navigation: `Brand`, `Model`, `Customer?`, `ServicePolicy?`, `ServiceRecords[]`, `FollowUps[]`

#### `JobCard`
| Column | Type | Notes |
|--------|------|-------|
| JobCardNumber | string | Format: OR{YY}{05d} e.g. OR2600001 |
| VehicleId | Guid | FK |
| CustomerId | Guid? | FK |
| TechnicianId | Guid? | FK |
| VIN, PlateNumber, Year, Color, Transmission, FuelType | string/int | Denormalised snapshot |
| FuelLevel | enum | Empty/Quarter/Half/ThreeQuarter/Full |
| Mileage | int | Mileage at intake |
| CustomerName, CustomerPhone | string? | Denormalised snapshot |
| ServiceType | enum | 15 types (see Section 14) |
| Notes, AdditionalInfo | string? | |
| AccessoriesPresent | `List<string>` | Stored as **jsonb** |
| Status | enum | Open/Closed |
| ReceivedByUserId, ReceivedByName | string | Auto-filled from JWT at creation |
| ClosedAt | DateTime? | Set when converted to delivery note |
| ClosedByUserId, ClosedByName | string? | |
| DeliveryNoteNumber | string? | Format: DN{YY}{05d} (same sequence as OR) |
| DeliveryNoteGeneratedAt | DateTime? | |

Navigation: `Vehicle`, `Customer?`, `Technician?`

#### `JobCardSequence`
One row per year. Controls the counter for auto-numbering.
| Column | Type | Notes |
|--------|------|-------|
| Year | int | Unique index |
| StartingSequence | int | Admin-configurable starting offset |
| CurrentSequence | int | Auto-incremented on each new card |

Generated number: `StartingSequence + CurrentSequence`, zero-padded to 5 digits, prefixed with `OR` + 2-digit year.

#### `ServiceRecord`
| Column | Type | Notes |
|--------|------|-------|
| VehicleId | Guid | FK |
| TechnicianId | Guid? | FK |
| ServiceDate | DateTime | |
| MileageAtService | int | |
| ServiceType | enum | |
| ServiceDescription | string? | |
| InvoiceNumber | string? | Set to DeliveryNoteNumber when auto-created from job card |
| LaborCost, PartsCost, TotalCost | decimal? | |
| NextServiceMileage, NextServiceDate | int?, DateTime? | Calculated by ServiceIntervalEngine |
| IsWarrantyJob, IsRecallJob | bool | |

Navigation: `Vehicle`, `Technician?`, `Bay?`, `Parts[]`

#### `ServicePart`
Child of `ServiceRecord`. `PartNumber`, `PartName`, `Quantity`, `UnitPrice`, `TotalPrice`.

#### `ServicePolicy`
Defines service intervals per brand/model.
| Column | Type | Notes |
|--------|------|-------|
| Name | string | |
| BrandId, ModelId | Guid? | Nullable — if null, applies to all models of brand |
| IntervalKm | int | KM between services |
| IntervalMonths | int | Months between services |
| DueSoonLeadDays | int | Days before due to set "DueSoon" |
| DueSoonLeadKm | int | KM before due to set "DueSoon" |
| LostThresholdMonths | int | Months after due to set "Lost" |
| IsDefault | bool | Fallback policy if no brand/model match |

#### `PermissionGroup`
| Column | Type | Notes |
|--------|------|-------|
| Name | string | |
| Description | string? | |
| Permissions | `List<string>` | Stored as **jsonb** |

#### `Technician`
`FullName`, `EmployeeCode`, `Phone?`, `Email?`, `Specialization?`, `CertificationLevel?`, `IsActive`.

#### `FollowUp`
Linked to `VehicleId`. Tracks CRM follow-up calls/contacts for overdue/lost vehicles.
Fields: `Status`, `Priority`, `ContactMethod`, `Reason`, `DueDate`, `ContactedAt?`, `Notes?`, `RecoveryAchieved`.

#### `ImportLog` / `ImportLogRow`
Tracks bulk CSV import sessions. `ImportLog` holds summary; `ImportLogRow` holds per-row validation results.

#### `SalesHistory`
Auto-created when a PDI job card is converted to a delivery note. Links `VehicleId`, `CustomerId`, `JobCardId`.

#### `Brand` / `VehicleModel`
Brand has `Name`, `Code`, `IsActive`. VehicleModel has `Name`, `BrandId` FK.

### Migrations (in order)

| Migration | Date | Contents |
|-----------|------|----------|
| `20260611091822_InitialCreate` | 2026-06-11 | Full initial schema: all entities except JobCards and PermissionGroups |
| `20260615000000_AddJobCards` | 2026-06-15 | **Stub only** — superseded; file intentionally empty |
| `20260615042839_AddJobCards` | 2026-06-15 | JobCards, JobCardSequences, SalesHistories tables |
| `20260615083120_AddPermissionGroups` | 2026-06-15 | PermissionGroups table + ApplicationUser.PermissionGroupId FK |

---

## 6. Configuration Inventory

### Backend (`appsettings.json` — defaults / local dev)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=rwandamotordms;Username=postgres;Password=<LOCAL>"
  },
  "Jwt": {
    "Key": "<dev key — change in prod>",
    "Issuer": "https://api.rwandamotor.com",
    "Audience": "https://app.rwandamotor.com",
    "ExpiryHours": "8"
  },
  "AllowedOrigins": ["http://localhost:3000", "https://app.rwandamotor.com"]
}
```

### Backend (`appsettings.Production.json`)
Uses environment variable substitution via systemd `EnvironmentFile`:
- `ConnectionStrings__DefaultConnection` → injected from `/etc/rwandamotor/api.env`
- `Jwt__Key` → injected from `/etc/rwandamotor/api.env`

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=https://api.rwandamotor.com/api
```
For local development: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

### Frontend (Vercel)
The environment variable `NEXT_PUBLIC_API_URL` must be set in the Vercel project settings to `https://api.rwandamotor.com/api`.

### GitHub Secrets Required
| Secret | Used In | Purpose |
|--------|---------|---------|
| `VERCEL_DEPLOY_HOOK` | `deploy.yml` | Triggers Vercel redeploy on push to main |

---

## 7. Infrastructure Documentation

### Server
- Linux (Ubuntu), hosted at a cloud provider (IP managed via Cloudflare Tunnel, no exposed IP)
- Runs GitHub Actions self-hosted runner for backend deploys
- PostgreSQL 16 running locally on the same server

### Process Management
Systemd unit: `/etc/systemd/system/rwandamotor-api.service`
- Service user: `rwandamotor` (non-root)
- Working directory: `/opt/rwandamotor-api`
- Binary: `/opt/rwandamotor-api/RwandaMotor.API.dll`
- Env file: `/etc/rwandamotor/api.env` (chmod 600, owned by `rwandamotor`)
- Auto-restarts on crash with 5-second delay
- Starts after `postgresql.service`

Useful commands:
```bash
sudo systemctl status rwandamotor-api
sudo systemctl restart rwandamotor-api
sudo journalctl -u rwandamotor-api -f          # live logs
tail -f /var/log/rwandamotor/api.log           # Serilog file output
```

### Nginx
Config at `/etc/nginx/sites-enabled/rwandamotor-api` (symlink from `sites-available`).
- Listens on port 80, proxies to `http://127.0.0.1:5000`
- Cloudflare Tunnel handles HTTPS termination (no SSL cert needed on server)
- Upload timeout set to 120s for large import operations

### Cloudflare Tunnel
Routes `api.rwandamotor.com` → server localhost:80 via `cloudflared` daemon. Configuration in `deploy/cloudflare-tunnel-addition.yml`.

### Vercel (Frontend)
- Framework preset: Next.js
- Build command: `npm run build`
- Root directory: `frontend`
- GitHub integration: auto-deploy on push to main (also triggered by `deploy.yml` webhook)
- Preview deployments: all `*.vercel.app` origins are allowed by CORS in the backend

### GitHub Actions
- **CI (`ci.yml`):** runs on push to `main`/`develop` and PRs to `main`. Jobs: backend build+test, frontend tsc+lint+build, docker image build (main only).
- **Deploy (`deploy.yml`):** runs on push to `main`. Deploys API via self-hosted runner, triggers Vercel webhook for frontend.

### Application Startup Sequence
On every server start or restart, `Program.cs` runs:
1. EF Core `db.Database.MigrateAsync()` — applies pending migrations
2. `ApplicationDbSeeder.SeedAsync()` — seeds default admin user if missing
3. `BackfillJobCardServiceRecordsService.StartAsync()` — creates service records for closed job cards that predate auto-create (idempotent)
4. `RetentionEvaluationJob` — scheduled via Quartz to run at 02:00 UTC nightly

---

## 8. Credentials Inventory

> **IMPORTANT: This section contains placeholder names only. No real secrets are stored here. All real values must be obtained from the server's `/etc/rwandamotor/api.env` file or from the team's password manager.**

| Credential | Where Stored | Notes |
|------------|-------------|-------|
| PostgreSQL `rwandamotor_api` password | `/etc/rwandamotor/api.env` on server | DB user for API only (not superuser) |
| JWT signing key (`Jwt__Key`) | `/etc/rwandamotor/api.env` on server | Min 32 chars, random. Changing this invalidates all sessions |
| Admin user default password | Set during first seed (ask team) | Change on first login |
| Vercel deploy hook URL | GitHub Secrets (`VERCEL_DEPLOY_HOOK`) | Found in Vercel project → Settings → Git → Deploy Hooks |
| GitHub self-hosted runner token | Configured on the server | Re-generates if runner is re-registered |

---

## 9. Installation Guide

### Prerequisites
- .NET 9 SDK
- Node.js 22+
- PostgreSQL 16
- Git

### Local Development (Backend)

```bash
# 1. Clone the repo
git clone <repo-url>
cd CSSR

# 2. Set local DB password in appsettings.json (or user secrets)
#    File: backend/src/RwandaMotor.API/appsettings.json
#    Update ConnectionStrings.DefaultConnection

# 3. Create the database
psql -U postgres -c "CREATE DATABASE rwandamotordms;"

# 4. Run the API (migrations + seed run automatically on startup)
cd backend
dotnet run --project src/RwandaMotor.API

# Swagger UI available at: http://localhost:5000/swagger
```

### Local Development (Frontend)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

### Production Server Initial Setup

```bash
# Run the one-shot setup script (installs .NET, PostgreSQL, Nginx, etc.)
sudo bash deploy/server-setup.sh

# Create the env file
sudo mkdir -p /etc/rwandamotor
sudo cp deploy/api.env.example /etc/rwandamotor/api.env
sudo chmod 600 /etc/rwandamotor/api.env
# Edit and fill in real DB password and JWT key:
sudo nano /etc/rwandamotor/api.env

# Install systemd service
sudo cp deploy/rwandamotor-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable rwandamotor-api

# Install Nginx config
sudo cp deploy/nginx-api.conf /etc/nginx/sites-available/rwandamotor-api
sudo ln -s /etc/nginx/sites-available/rwandamotor-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Adding a New Migration

```bash
cd backend
dotnet ef migrations add <MigrationName> \
  --project src/RwandaMotor.Infrastructure \
  --startup-project src/RwandaMotor.API

# The migration runs automatically on next startup
# To apply manually:
dotnet ef database update --startup-project src/RwandaMotor.API
```

---

## 10. Development History

The project was built in a series of Claude AI-assisted sessions. Each session built on the last, tracked via a task list. Below is a summary of major milestones:

| Phase | Tasks | Description |
|-------|-------|-------------|
| Foundation | #1–#8 | Stack migration (SQL Server → PostgreSQL), CI/CD pipeline, systemd/Nginx deploy setup, initial context docs |
| UI Polish | #9–#15 | Technicians CRUD, mobile sidebar, user management, password reset, rebranding |
| Job Cards Module | #18–#27 | Full job card lifecycle: list, detail, print, create dialog with vehicle autocomplete, sequence numbering, delivery note conversion with auto-service-record creation, PDI → SalesHistory |
| RBAC | #28–#33 | PermissionGroup entity + CRUD, JWT permissions payload, AuthContext + usePermission hook, per-page and per-widget permission gates |
| 360 Views + Fixes | #34–#36 | Vehicle 360 and Customer 360 updated to show job card history; fix for service records not showing after job card close |
| Infrastructure Fixes | CI commits | Fixed 14 truncated .cs files, null-byte corrupted migration stub, restored all truncated frontend files |
| Documentation | #37 | This document |

### Key Architectural Decisions

**Why clean architecture?** Enforces separation so that domain logic (entities, enums) is independent of EF Core and ASP.NET. Application layer depends only on interfaces, not implementations. Makes it easy to swap infrastructure components without touching business logic.

**Why CQRS with MediatR?** Keeps read models separate from write models. Complex queries (Vehicle360, Customer360, RetentionAnalytics) can be independently optimized without affecting command handlers.

**Why denormalise VIN/PlateNumber onto JobCard?** Job cards are legal documents that must be printable accurately even if vehicle or customer data changes later. The snapshot at intake time is preserved.

**Why `IHostedService` for backfill?** The `BackfillJobCardServiceRecordsService` runs on every startup and is idempotent (checks existing invoice numbers before inserting). This means the fix applies automatically on first deploy without a manual migration script.

**Why global query filters for soft deletes?** Prevents accidentally returning deleted rows. The filter is defined once in `OnModelCreating`, not scattered across queries. Queries that genuinely need deleted rows (e.g., import dedup checks) use `.IgnoreQueryFilters()`.

**Why `Npgsql.EnableLegacyTimestampBehavior`?** Npgsql 6+ requires explicit UTC timestamps and throws on ambiguous local time. The switch is set at the very top of `Program.cs` before any EF code runs, preventing `NotSupportedException` at runtime.

**Why `EnableDynamicJson()`?** Npgsql 8 requires this flag to serialize/deserialize `List<string>` stored as `jsonb` (`AccessoriesPresent` on `JobCard`, `Permissions` on `PermissionGroup`).

---

## 11. API Documentation

All endpoints require `Authorization: Bearer <token>` except `POST /api/auth/login`.

All responses follow the wrapper: `{ success: bool, data: T | null, message: string | null, errors?: string[] }`.

### Base URL
- Production: `https://api.rwandamotor.com/api`
- Local: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | None | Login. Returns JWT + refresh token + permissions list |

**Login request:** `{ "email": "...", "password": "..." }`

**Login response data:**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "userId": "...",
  "fullName": "...",
  "email": "...",
  "role": "Admin|CRMOfficer|TechnicalDirector|CRE",
  "expiresAt": "2026-06-15T16:00:00Z",
  "permissions": ["nav.dashboard", "jobCards.create", ...]
}
```

Token lifetime: 8 hours. Refresh token: 7 days.

### Vehicles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vehicles` | Paginated list with search + filters |
| GET | `/vehicles/{id}/360` | Full vehicle 360 view with service timeline, follow-up history, job cards, KPIs |
| GET | `/vehicles/brands` | All brands with their model lists |
| POST | `/vehicles` | Create vehicle |
| PUT | `/vehicles/{id}` | Update vehicle fields |
| PUT | `/vehicles/bulk` | Bulk update retention status / service policy |
| DELETE | `/vehicles` | Soft-delete specific IDs (body: `string[]`) |
| DELETE | `/vehicles/all` | Soft-delete all matching a filter |

**Vehicle list query params:** `search`, `brandId`, `modelId`, `retentionStatus`, `isSoldByDealership`, `warrantyActive`, `pageNumber`, `pageSize`

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | Paginated list with search + category filter |
| GET | `/customers/{id}/360` | Full customer 360 view with vehicles, service history across all vehicles, job cards |
| POST | `/customers` | Create customer |
| PUT | `/customers/{id}` | Update customer |
| DELETE | `/customers` | Soft-delete specific IDs |
| DELETE | `/customers/all` | Soft-delete all matching filter |

### Job Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jobcards` | Paginated list with search + status/type/date filters |
| GET | `/jobcards/{id}` | Full job card detail |
| POST | `/jobcards` | Create new open job card |
| POST | `/jobcards/{id}/convert` | Close job card → delivery note (auto-creates ServiceRecord + SalesHistory if PDI) |
| PUT | `/jobcards/sequence` | Admin: set starting sequence for a given year |

**Create job card body:** `{ vehicleId, customerId?, technicianId?, serviceType, fuelLevel, mileage, notes?, additionalInfo?, accessoriesPresent? }`

**JobCard number format:** `OR{YY}{StartingSeq + CurrentSeq:D5}` — e.g., `OR2600001`
**Delivery note format:** `DN{YY}{seq}` — same sequence, prefix replaced

### Service Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/servicerecords` | Paginated list with vehicle/technician/date/type filters |
| POST | `/servicerecords` | Create service record manually |
| PUT | `/servicerecords/{id}` | Update service record |
| DELETE | `/servicerecords` | Soft-delete specific IDs |
| DELETE | `/servicerecords/all` | Soft-delete all matching filter |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/kpis` | Full KPI snapshot including retention rates, trend, brand breakdown, job card counts |

### Retention

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/retention/analytics` | Monthly/quarterly/yearly summaries + trend + brand breakdown + cohort analysis |
| GET | `/retention/visit-cohorts` | Year-wise and model-wise visit frequency cohorts |
| GET | `/retention/cohort-vehicles` | Drill-down: list vehicles in a specific cohort bucket |

### Admin — Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | All users with role and permission group |
| POST | `/admin/users` | Create user |
| PUT | `/admin/users/{id}` | Update user (name, role, isActive, permissionGroupId) |
| POST | `/admin/users/{id}/reset-password` | Force password reset |

### Admin — Permission Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/permission-groups` | All groups |
| POST | `/admin/permission-groups` | Create group |
| PUT | `/admin/permission-groups/{id}` | Update group |
| DELETE | `/admin/permission-groups/{id}` | Soft-delete group |

### Technicians

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/technicians` | List (activeOnly param) |
| POST | `/technicians` | Create |
| PUT | `/technicians/{id}` | Update |
| DELETE | `/technicians/{id}` | Soft-delete |

### Service Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/servicepolicies` | List (optional brandId filter) |
| POST | `/servicepolicies` | Create |
| PUT | `/servicepolicies/{id}` | Update |
| DELETE | `/servicepolicies/{id}` | Soft-delete |

### Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/import/validate` | Validate CSV (base64 encoded). Returns preview + error list |
| POST | `/import/process/{logId}` | Commit a validated import |

Import types: `Vehicles`, `Customers`, `ServiceRecords`

---

## 12. Security Documentation

### Authentication
- JWT Bearer tokens, HS256 signing, 8-hour lifetime
- `ClockSkew = TimeSpan.Zero` — tokens expire exactly at declared expiry
- Refresh tokens: 7-day lifetime, stored in `ApplicationUser` in the database
- On 401 response, frontend clears localStorage and redirects to `/login`

### Authorization
**Policy-based** (`Admin`, `TechnicalDirector`, `CRMOfficer`, `CRE`) enforced per controller via `[Authorize(Policy = "...")]`.

**Permission-based** (frontend): `usePermission(key)` hook checks `user.permissions[]` loaded at login. Admin role bypasses all permission checks client-side. Backend does not re-check fine-grained permissions on every request (trusts JWT role claims for endpoint-level access).

**Permission resolution at login:**
1. If user has a `PermissionGroupId`, load the group's `Permissions` list from DB
2. Otherwise, use `DefaultPermissions.ForRole(role)` — hardcoded defaults per role
3. Embed in the JWT response

### CORS
- Allowlist: `["http://localhost:3000", "https://app.rwandamotor.com"]` plus all `*.vercel.app` origins (for Vercel preview deploys)
- AllowCredentials enabled (needed for cookie-based flows if added later)

### Data Security
- Soft deletes: data is never physically destroyed (compliance-friendly)
- All DB user for API has no superuser privileges
- Environment file permissions: `chmod 600`, owned by service user
- No secrets in `appsettings.Production.json` (uses `${VAR}` placeholders resolved from env file)

### Password Policy (ASP.NET Identity)
- Minimum 8 characters
- Must contain digit, uppercase letter, non-alphanumeric character
- Unique email required

### Known Gaps
- No refresh token rotation or revocation endpoint currently implemented
- Backend does not validate fine-grained permissions on every API call (only role-level). A user with a restrictive permission group could still call endpoints directly via API if they know the URL.
- No rate limiting on the login endpoint

---

## 13. Open Tasks & Backlog

### Immediate (Known Issues)

| # | Priority | Issue | Notes |
|---|----------|-------|-------|
| A | High | Refresh token endpoint not built | `/auth/refresh` handler missing. Tokens expire after 8h and user must re-login. |
| B | Medium | Backend permission check at API level | Frontend `usePermission` can be bypassed by direct API calls. Backend only enforces role-level policies. |
| C | Medium | No rate limiting on `/auth/login` | Brute-force possible. Recommended: add ASP.NET Core rate limiting middleware. |
| D | Low | `WorkshopBay` entity exists in DB but no UI | Bay assignment on service records not exposed in frontend. |

### Feature Backlog

| Feature | Complexity | Notes |
|---------|-----------|-------|
| SMS/WhatsApp follow-up notifications | High | Integrate Twilio or Africa's Talking |
| Email job card share | Medium | `/jobcards/{id}/share` endpoint exists, email delivery not implemented |
| Service Parts UI on service records | Medium | `ServicePart` entity and DB structure exist; no UI for adding parts |
| Vehicle import from CSV with photos | High | Photos not supported by current import |
| Report export (PDF/Excel) | Medium | Retention analytics, service history exports |
| Vehicle warranty alerts | Low | Vehicles with expiring warranty within 30 days |
| Multi-workshop / branch support | High | Current schema is single-location |

---

## 14. Feature Inventory

### Dashboard (`/dashboard`)
KPI cards: Total Vehicles, Dealership Vehicles, Open Job Cards (today + month), Active Follow-Ups, Monthly Services, Monthly/Quarterly/6M/Yearly Retention Rate.

Charts: Retention trend (12-month line chart), Brand retention table.

Permission gates: `dashboard.kpi`, `dashboard.retention`, `dashboard.jobCardsWidget`.

### Vehicles (`/vehicles`)
- Paginated table with search (VIN, plate, customer, brand/model), filters (brand, model, retention status, dealership, warranty active)
- Retention badge colour coding
- Bulk select + bulk retention status update or service policy assign
- Inline edit vehicle (plate, mileage, warranty dates, notes, service policy)
- Create vehicle dialog
- Navigate to Vehicle 360 by clicking a row

### Vehicle 360 (`/vehicles/[id]`)
Full vehicle profile page. Left column: vehicle metadata, customer link, KPIs (total services, revenue, avg interval, last service days ago), service policy, mileage tracking, warranty. Right column: Tabs:
- **Job Cards (default):** all job cards for this vehicle, with amber (Open) / emerald (Closed) status chips, links to job card detail
- **Service History:** all service records with mileage, invoice number, cost
- **Follow-Ups:** follow-up history
- **Technicians:** technician visit frequency

### Customers (`/customers`)
Paginated list with search, category filter. Create customer dialog.

### Customer 360 (`/customers/[id]`)
Left column: customer metadata + KPIs (total vehicles, total job cards, total spend, member since). Right column: Tabs:
- **Job Cards (default):** all job cards across all of this customer's vehicles (shows VIN/plate for identification), links to job card detail
- **Service Records:** flattened service history across all vehicles
- **Vehicles:** owned vehicle summary cards

### Job Cards (`/job-cards`)
- Paginated list with search (job card number, VIN, plate, customer), status filter, service type filter, date range
- Status chips: amber (Open), emerald (Closed)
- Create Job Card dialog: vehicle autocomplete (search by VIN/plate), customer auto-populated from vehicle, technician selector, service type, fuel level, mileage, accessories checklist, notes
- Navigate to Job Card detail by clicking a row

### Job Card Detail + Print (`/job-cards/[id]`)
- Full job card view with all fields
- "Convert to Delivery Note" button (creates DN number, auto-creates ServiceRecord, updates vehicle mileage/next service dates, triggers retention re-evaluation)
- Print button (opens printable view in new window)
- Permission gate: `jobCards.convert` for Convert button, `jobCards.create` for Create button on list page

**Job Card → Delivery Note Flow:**
1. User clicks "Convert to Delivery Note"
2. `POST /jobcards/{id}/convert`
3. Backend: sets `Status = Closed`, generates `DeliveryNoteNumber` (`DN` prefix + same sequence)
4. Creates `ServiceRecord` with `InvoiceNumber = DeliveryNoteNumber`
5. Updates `Vehicle.LastServiceDate`, `LastServiceMileage`, `NextServiceDate`, `NextServiceMileage`
6. If `ServiceType == PDI`: also creates `SalesHistory` entry
7. Calls `RetentionEngine.EvaluateVehicleStatusAsync()` to update vehicle retention status immediately

### Service Records (`/service-records`)
Paginated list with vehicle/technician/date/type filters. Edit service record inline. Manual create. Bulk/individual soft-delete.

### Retention (`/retention`)
Full analytics page: monthly/quarterly/yearly summary cards, 12-month trend chart, brand breakdown table, year-wise and model-wise visit frequency cohort tables, drill-down to vehicle list per cohort.

### Import (`/import`)
Two-step CSV import: validate (preview with row-level errors) → process. Supports `Vehicles`, `Customers`, `ServiceRecords` import types. 5-minute timeout on API calls for large files.

### Settings (`/settings`)
Two tabs:
- **Users:** create/edit/deactivate users, assign permission groups, force password reset
- **Permission Groups:** create/edit/delete named permission groups with a full permission checkbox matrix

### Admin Sub-pages
- `/admin/users` — user management (redirects to Settings)
- `/admin/technicians` — technician CRUD (specialization, certification level, active/inactive)

### Service Policies (Backend Only)
No dedicated frontend page. Policies are assigned to vehicles via the vehicle edit dialog. CRUD available via API.

### Retention Engine (Background)
- **Nightly Quartz job** (`RetentionEvaluationJob`) runs at 02:00 UTC, calls `RetentionEngine.EvaluateAllVehiclesAsync()`
- **On-demand evaluation** triggered after each job card is converted to delivery note
- **Logic:** compares `LastServiceDate` + `NextServiceDate` against the vehicle's service policy intervals; classifies as Active / DueSoon / Overdue / Lost / Recovered / External

### Service Types (Enum)
`RoutineMaintenance`, `OilChange`, `MajorService`, `TyreRotation`, `BrakeService`, `TransmissionService`, `AirConditioningService`, `ElectricalDiagnostics`, `BodyRepair`, `WarrantyRepair`, `RecallRepair`, `PDI`, `EmergencyRepair`, `Inspection`, `Other`

---

## 15. Testing Documentation

### Current State
No automated tests exist. The `backend/tests/` directory is present but empty.

### CI Pipeline (What Runs)
- `dotnet build` — compilation only
- `dotnet test` — passes (no test projects = no failures)
- `npx tsc --noEmit` — TypeScript type checking
- `npm run lint` — ESLint
- `npm run build` — Next.js production build with `NEXT_PUBLIC_API_URL` set

### Recommended Tests to Add

**Unit Tests (xUnit + Moq):**
- `ServiceIntervalEngine` — test due status logic for various mileage/date combinations against policy
- `RetentionEngine.EvaluateVehicleStatusAsync` — status transitions (Active → DueSoon → Overdue → Lost → Recovered)
- `ConvertToDeliveryNoteCommandHandler` — delivery note number format, service record creation
- `BackfillJobCardServiceRecordsService` — idempotency (running twice creates no duplicates)
- `DefaultPermissions.ForRole` — each role returns expected set

**Integration Tests:**
- Full login → create job card → convert to delivery note → verify ServiceRecord created
- Retention rate calculation against seeded vehicle + service record data

**Frontend Tests (Vitest + React Testing Library):**
- `usePermission` hook with mocked AuthContext
- Dashboard KPI cards render correctly with mocked data
- Job card create dialog submits correct payload

---

## 16. Operational Runbook

### Health Check
```bash
# API health
curl https://api.rwandamotor.com/api/dashboard/kpis -H "Authorization: Bearer <token>"

# Process status
ssh <server> "sudo systemctl status rwandamotor-api"

# Database connectivity
ssh <server> "psql -U rwandamotor_api -d rwandamotordms -c 'SELECT COUNT(*) FROM \"Vehicles\";'"
```

### Deploying a Backend Change
```bash
# Automatic: push to main branch on GitHub
git push origin main
# GitHub Actions self-hosted runner will:
# 1. dotnet publish
# 2. run sudo /usr/local/bin/rwandamotor-deploy (copies files, restarts service)
```

Manual deploy (if runner is down):
```bash
ssh <server>
cd /path/to/repo && git pull
dotnet publish backend/src/RwandaMotor.API -c Release -o /tmp/rwandamotor-publish
sudo cp -r /tmp/rwandamotor-publish/* /opt/rwandamotor-api/
sudo systemctl restart rwandamotor-api
```

### Deploying a Frontend Change
Vercel auto-deploys on push to main. If webhook fails:
```bash
# Manually trigger via Vercel dashboard or CLI
vercel --prod
```

### Rolling Back
```bash
# Backend: checkout previous commit and deploy
git checkout <previous-commit>
git push -f origin main   # only if needed

# Or on server directly:
sudo systemctl stop rwandamotor-api
sudo cp -r /opt/rwandamotor-api-backup/* /opt/rwandamotor-api/
sudo systemctl start rwandamotor-api
```

### Database Backup
```bash
# Create backup
pg_dump -U rwandamotor_api rwandamotordms > backup_$(date +%Y%m%d).sql

# Restore
psql -U rwandamotor_api rwandamotordms < backup_20260615.sql
```

### Common Issues and Fixes

**Issue:** API starts but cannot connect to database.
- Check: `sudo systemctl status postgresql`
- Check: `/etc/rwandamotor/api.env` has correct password
- Check: PostgreSQL `pg_hba.conf` allows `rwandamotor_api` from localhost

**Issue:** Login works but all API calls return 401 after ~8 hours.
- Cause: JWT expired. Token lifetime is 8 hours. User must re-login.
- Fix: Implement refresh token endpoint (see Open Tasks).

**Issue:** Service Records page shows 0 records despite closed job cards.
- Cause: Pre-existing closed job cards (closed before auto-create code was deployed on 2026-06-15).
- Fix: `BackfillJobCardServiceRecordsService` runs on startup — restart the API. If still empty, check logs for backfill errors.

**Issue:** CI build fails with `} expected` or truncation errors in `.cs` files.
- Cause: File write truncation bug in development tooling. Affects any file whose content was edited via Claude's Edit tool without a follow-up Python write.
- Fix: Read the truncated file; write the correct content via `python3 -c "open('file.cs','w').write(...)"`.
- Detect: `for f in $(find backend/src -name '*.cs'); do tail -c 5 "$f" | tr -d ' \n\r\t' | grep -qvE '[};)]' && echo "SUSPECT: $f"; done`

**Issue:** `Unexpected character '\0'` in a migration file.
- Cause: Null-byte corruption (file written with padding zeros after the actual content).
- Fix: `printf '// stub\n' > path/to/migration.cs` (completely overwrites the file).
- Detect: `xxd path/to/file | head` — look for `00 00 00` sequences.

**Issue:** CORS error in browser (`blocked by CORS policy`).
- Check that `AllowedOrigins` in `appsettings.json` includes the frontend origin.
- Vercel preview URLs are automatically allowed (`*.vercel.app`).
- Localhost: `http://localhost:3000` is in the allowed list by default.

**Issue:** Job card sequence jumps unexpectedly.
- The admin can reset the starting sequence via Settings → Job Card Sequence Override.
- This resets `CurrentSequence = 0`; next card will be `StartingSequence + 1`.

**Issue:** Retention status not updating after a service.
- Retention is re-evaluated immediately when a delivery note is created.
- Nightly batch re-evaluates all vehicles at 02:00 UTC.
- Manual trigger: restart the API (which runs the nightly job on next scheduled fire) or call the retention batch via a debug endpoint if added.

---

## 17. AI Session Continuity

This section exists to give the next Claude session instant project context.

### Project Identity
- **Name:** Rwandamotor CSSR (Customer Service & Sales Retention)
- **Type:** Automotive Dealer Management System
- **Stack:** .NET 9 (Clean Architecture, CQRS/MediatR) + Next.js 15 + PostgreSQL 16
- **Repo root:** `C:\Users\APC\Claude\Projects\CSSR`
- **Linux sandbox mount:** `/sessions/sweet-zen-franklin/mnt/CSSR/`

### Critical Operational Notes for AI Sessions

1. **File write truncation:** The Edit/Write tools update harness state but the Linux sandbox mount (`/sessions/sweet-zen-franklin/mnt/CSSR/`) may show stale/truncated content. **Always write files using Python:** `python3 -c "open('/sessions/sweet-zen-franklin/mnt/CSSR/path/to/file', 'w').write('''...''')"`

2. **Shared DTO:** `JobCard360Dto` is defined in `GetVehicle360Query.cs` (Vehicles namespace) and imported via `using RwandaMotor.Application.Features.Vehicles.Queries;` in `GetCustomer360Query.cs`. Do not redefine it.

3. **Global query filters:** All queries on soft-delete entities already exclude deleted rows via EF Core global filters. Do not add `.Where(x => !x.IsDeleted)` manually in new queries (it's redundant but harmless). The backfill service uses raw `ApplicationDbContext` (not via `IApplicationDbContext` interface) so it can bypass filters when needed.

4. **Enum serialization:** The backend uses `JsonStringEnumConverter` — enums are sent/received as strings (e.g., `"Open"` not `0`). Frontend types reflect this.

5. **CORS for Vercel previews:** All `*.vercel.app` origins are allowed by the backend CORS policy. No config change needed when Vercel generates new preview URLs.

6. **Quartz cron expression:** `"0 0 2 * * ?"` = 02:00:00 UTC daily (Quartz format uses seconds as first field).

7. **Job card numbering:** `OR` + 2-digit year + 5-digit padded sequence (e.g., `OR2600001`). Delivery notes use `DN` prefix with same sequence. Sequence stored in `JobCardSequences` table, one row per year.

8. **Permission keys:** All defined in `DefaultPermissions.cs` as `const string` fields. Frontend mirrors these as string literals. When adding new permissions, update `DefaultPermissions.All`, `ForRole()` for each role, and the Settings page checkbox matrix.

9. **Frontend auth storage:** `localStorage.getItem("access_token")` and `localStorage.getItem("auth_user")`. Cleared on logout or 401.

10. **API wrapper pattern:** All API calls return `ApiResponse<T>` wrapper. Frontend checks `res.success && res.data` before using data.

### Last Known State (2026-06-15)

All commits up to `bd2fd19` are pushed to `origin/main`. The GitHub Actions CI (`ci.yml`) and deploy (`deploy.yml`) workflows are both triggered on push to `main`. The backend self-hosted runner is expected to pick up the deploy automatically.

After the next server restart (or API service restart), `BackfillJobCardServiceRecordsService` will run and populate the Service Records page with historical closed job cards.

### Files Most Likely to Need Attention in Future Sessions

| File | Reason |
|------|--------|
| `frontend/src/types/index.ts` | Add interfaces whenever a new backend DTO is added |
| `frontend/src/lib/api.ts` | Add API functions for new endpoints |
| `backend/src/RwandaMotor.Application/Common/Permissions/DefaultPermissions.cs` | Add permission keys for new features |
| `backend/src/RwandaMotor.Infrastructure/DependencyInjection.cs` | Register new services |
| `backend/src/RwandaMotor.Infrastructure/Persistence/ApplicationDbContext.cs` | Add new `DbSet<>` + global query filter |
| `backend/src/RwandaMotor.API/Program.cs` | Add new policies if new roles are introduced |
| Any new migration `.cs` file | Verify it is not truncated or null-byte corrupted before pushing |

---

*Generated by AI-assisted session on 2026-06-15. Verify all credentials externally. This document contains no live secrets.*
